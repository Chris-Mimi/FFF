/**
 * Whiteboard score entry — 2026 Week 29.3 (photo "2026 Week 29.3").
 * Three sessions, metcon-only (no lift PRs — the Pendlay Row is a WOD Pt.1 load,
 * not an rm_test). Board columns mapped to section scoring per Chris.
 *
 *  S1  17.07 09:00  "Weekend WOD #26.14"  wod ca97c360
 *      Pt.1  section-1779628374676-3  {load}         → weight = Pendlay Row total of last 3 sets
 *      WOD   section-1779997866623   {load,sc,sc2,sc3,rounds_reps}
 *            scaling=Ring Dips, sc2=GHD, sc3=HST; load=KB H2H; + rounds/reps
 *  S2  17.07 17:15  "200m Run, KB Clean…"  wod 82dcf434
 *      WOD   section-1783856939970-4 {load,track,scaling,rounds_reps}
 *            load=Double KB Clean; track=Run(1)/Airbike(2); scaling=Push-up; + rounds/reps
 *  S3  18.07 09:00  ENDURANCE "Hyrox AMRAP"  wod 54df5243
 *      WOD   section-1783856941036-4 {load,load2,rounds_reps}
 *            load=Wallball (F6/M9), load2=Sandbag Lunge (F20/M30); + rounds/reps
 *
 * Auto-publishes scored sections. INSERT/UPDATE, deduped. Dry-run default.
 *   npx tsx scripts/enter-week29-3-whiteboard.ts [--only=S1|S2|S3] [--apply]
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').split('=')[1] || null;
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
const now = new Date().toISOString();

type Sc = 'Rx' | 'Sc1' | 'Sc2' | 'Sc3';
type Sess = { label: string; date: string; time: string; secs: string[] };
const SESS: Record<string, Sess> = {
  S1: { label: 'S1', date: '2026-07-17', time: '09:00:00', secs: ['section-1779628374676-3', 'section-1779997866623'] },
  S2: { label: 'S2', date: '2026-07-17', time: '17:15:00', secs: ['section-1783856939970-4'] },
  S3: { label: 'S3', date: '2026-07-18', time: '09:00:00', secs: ['section-1783856941036-4'] },
};

// S1: [name, pendlaySum, dips, ghd, hst, kbLoad, rounds, reps]
const S1: [string, number, Sc, Sc, Sc, number, number, number][] = [
  ['Irene Koffler', 120, 'Sc2', 'Sc2', 'Sc1', 12, 4, 7],
  ['Julia Weihe',   60,  'Sc2', 'Sc2', 'Sc1', 10, 4, 0],
  ['Leah Mesche',   90,  'Sc2', 'Rx',  'Sc1', 10, 3, 18],
];
// S2: [name, trk, kbLoad, pushup, rounds, reps]
const S2: [string, number, number, Sc, number, number][] = [
  ['Daniela Simm',       1, 8,  'Sc1', 5, 10],
  ['Miriam Jacht',       1, 12, 'Sc1', 5, 0],
  ['Anfisa Bornemann',   1, 6,  'Sc1', 4, 42],
  ['Carla Courtois',     2, 8,  'Sc1', 5, 10],
  ['Kathrin Mühlen',     1, 12, 'Rx',  7, 49],
  ['Valerie Mesenburg',  1, 10, 'Sc1', 6, 32],
  ['Carmine Carrozzo',   1, 20, 'Rx',  4, 0],
  ['Dimitar Peresyov',   1, 20, 'Rx',  6, 0],
  ['Lukas Simnacher',    1, 20, 'Rx',  7, 32],
  ['Senol Özdilek',      1, 10, 'Sc1', 5, 0],
  ['Chris Hiles',        1, 20, 'Rx',  6, 10],
];
// S3: [name, wbLoad, lungeLoad, rounds, reps]
const S3: [string, number, number, number, number][] = [
  ['Sven Hujo',     9, 30, 2, 130],
  ['Sonja Hujo',    3, 20, 2, 120],
  ['Leah Mesche',   4, 10, 2, 70],
  ['Kathrin Mühlen', 6, 20, 3, 87],
];

async function main() {
  const names = [...new Set([...S1.map(r => r[0]), ...S2.map(r => r[0]), ...S3.map(r => r[0])])];
  const { data: members } = await sb.from('members').select('id,name').in('name', names);
  const idByName = new Map((members || []).map((m: { id: string; name: string }) => [m.name, m.id]));
  const missing = names.filter(n => !idByName.has(n));
  if (missing.length) { console.error('❌ UNMATCHED members:', missing); return; }

  const meta = new Map<string, { wodId: string; secIds: Set<string>; booked: Set<string> }>();
  for (const s of Object.values(SESS)) {
    const { data: ws } = await sb.from('weekly_sessions').select('id,workout_id').eq('date', s.date).eq('time', s.time).maybeSingle();
    const { data: w } = await sb.from('wods').select('sections').eq('id', ws!.workout_id).maybeSingle();
    const { data: bk } = await sb.from('bookings').select('member_id').eq('session_id', ws!.id).eq('status', 'confirmed');
    meta.set(s.label, { wodId: ws!.workout_id, secIds: new Set((w?.sections as { id: string }[] || []).map(x => x.id)), booked: new Set((bk || []).map((b: { member_id: string }) => b.member_id)) });
  }

  type WSR = Record<string, unknown> & { _label: string; _existingId?: string | null };
  const wsrs: WSR[] = [];
  const warn: string[] = [];
  const push = (label: string, secId: string, memberId: string, fields: Record<string, unknown>) => {
    const m = meta.get(label)!;
    if (!m.secIds.has(secId)) warn.push(`❌ ${label}: missing ${secId}`);
    wsrs.push({ _label: label, wod_id: m.wodId, workout_date: SESS[label].date, member_id: memberId, user_id: memberId, whiteboard_name: null, section_id: `${secId}-content-0`, dnf: false, updated_at: now, ...fields });
  };
  const chkBook = (label: string, name: string, id: string) => { if (!meta.get(label)!.booked.has(id)) warn.push(`⚠️ ${name} not booked in ${label}`); };

  if (!ONLY || ONLY === 'S1') for (const [name, pen, dips, ghd, hst, kb, r, reps] of S1) {
    const id = idByName.get(name)!; chkBook('S1', name, id);
    push('S1', 'section-1779628374676-3', id, { weight_result: pen });
    push('S1', 'section-1779997866623', id, { scaling_level: dips, scaling_level_2: ghd, scaling_level_3: hst, weight_result: kb, rounds_result: r, reps_result: reps });
  }
  if (!ONLY || ONLY === 'S2') for (const [name, trk, kb, push_up, r, reps] of S2) {
    const id = idByName.get(name)!; chkBook('S2', name, id);
    push('S2', 'section-1783856939970-4', id, { weight_result: kb, track: trk, scaling_level: push_up, rounds_result: r, reps_result: reps });
  }
  if (!ONLY || ONLY === 'S3') for (const [name, wb, lunge, r, reps] of S3) {
    const id = idByName.get(name)!; chkBook('S3', name, id);
    push('S3', 'section-1783856941036-4', id, { weight_result: wb, weight_result_2: lunge, rounds_result: r, reps_result: reps });
  }

  for (const r of wsrs) {
    const { data: ex } = await sb.from('wod_section_results').select('id').eq('wod_id', r.wod_id as string).eq('section_id', r.section_id as string).eq('workout_date', r.workout_date as string).eq('member_id', r.member_id as string).limit(1).maybeSingle();
    r._existingId = ex?.id ?? null;
  }
  const ins = wsrs.filter(r => !r._existingId).length;
  console.log(`\nScope: ${ONLY || 'ALL'} | WSR: ${wsrs.length} candidate (${ins} insert / ${wsrs.length - ins} update)`);
  const byLabel = new Map<string, number>(); for (const r of wsrs) byLabel.set(r._label, (byLabel.get(r._label) || 0) + 1);
  console.log('  by session: ' + [...byLabel.entries()].map(([k, v]) => `${k}=${v}`).join(', '));
  if (warn.length) console.log('\n' + [...new Set(warn)].join('\n'));

  if (!APPLY) { console.log('\nDRY RUN — pass --apply to write.'); return; }
  let c = 0;
  for (const r of wsrs) {
    const { _label, _existingId, ...row } = r;
    const res = _existingId ? await sb.from('wod_section_results').update(row).eq('id', _existingId) : await sb.from('wod_section_results').insert(row);
    if (res.error) { console.error('❌', _label, res.error.message); return; }
    c++;
  }
  // auto-publish scored sections (direct writes bypass the save route's auto-publish)
  for (const label of new Set(wsrs.map(r => r._label))) {
    const m = meta.get(label)!;
    const { data: wod } = await sb.from('wods').select('publish_sections').eq('id', m.wodId).maybeSingle();
    const pub = new Set<string>(wod?.publish_sections || []); const before = pub.size;
    SESS[label].secs.forEach(s => pub.add(s));
    if (pub.size !== before) { await sb.from('wods').update({ publish_sections: [...pub] }).eq('id', m.wodId); console.log(`  published sections on ${label}`); }
  }
  console.log(`✅ Wrote ${c} WSR rows + ensured sections published.`);
}
main();
