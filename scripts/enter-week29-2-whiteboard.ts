/**
 * Whiteboard score entry — 2026 Week 29.2 (photo "2026 Week 29.2").
 * "Hold, Metcon, Box Over, DB Thruster, DUs" — 15.7 17:15 + 18:30.
 * Three scored AMRAP parts per session (board columns are in a different order
 * than the parts — mapped back per Chris):
 *   Pt.1 (Rings)  section-1783856937312-4  {load, scaling, rounds_reps}
 *        scaling = Rings Hang; load = Box Over 6(F)/9(M)kg (all Rx); + rounds/reps
 *   Pt.2 (HS)     section-1784124148715    {scaling, scaling_2, rounds_reps}
 *        scaling = Handstand Hold; scaling_2 = DUs ("Sc"=Sc1); + rounds/reps
 *   Pt.3 (Plate)  section-1784124188874    {load, load2, rounds_reps}
 *        load = Plate Hold; load2 = DB Thruster; + rounds/reps
 * Metcon only — no lift_records. INSERT/UPDATE, deduped, scoped. Dry-run default.
 *   npx tsx scripts/enter-week29-2-whiteboard.ts                # dry run
 *   npx tsx scripts/enter-week29-2-whiteboard.ts --only=17:15   # one session
 *   npx tsx scripts/enter-week29-2-whiteboard.ts --apply        # write
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').split('=')[1] || null;
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
const now = new Date().toISOString();
const DATE = '2026-07-15';
const S_P1 = 'section-1783856937312-4';
const S_P2 = 'section-1784124148715';
const S_P3 = 'section-1784124188874';

type Sc = 'Rx' | 'Sc1' | 'Sc2' | 'Sc3';
// [name, time, p3Plate, p3Thruster, p3R, p3reps, p1Rings, p1R, p1reps, p2HS, p2DUs, p2R, p2reps]
const DATA: [string, string, number, number, number, number, Sc, number, number, Sc, Sc, number, number][] = [
  // ── 17:15 ──
  ['Aline von Rüden',    '17:15', 5,  7.5, 1, 50, 'Sc1', 2, 0,  'Sc2', 'Sc1', 2, 50],
  ['Miriam Jacht',       '17:15', 5,  7.5, 1, 50, 'Rx',  2, 53, 'Sc1', 'Sc1', 3, 30],
  ['Nikolina Vlasalija', '17:15', 5,  7.5, 1, 34, 'Rx',  2, 17, 'Sc1', 'Sc1', 2, 30],
  ['Leah Mesche',        '17:15', 5,  7.5, 1, 42, 'Rx',  1, 52, 'Sc2', 'Sc1', 2, 52],
  ['Valerie Mesenburg',  '17:15', 5,  10,  1, 51, 'Rx',  2, 50, 'Sc2', 'Rx',  2, 45],
  ['Lukas Simnacher',    '17:15', 10, 15,  1, 54, 'Rx',  2, 56, 'Rx',  'Rx',  3, 30],
  ['Thomas Graf',        '17:15', 10, 10,  1, 45, 'Rx',  2, 37, 'Sc2', 'Sc1', 3, 0],
  ['Chris Hiles',        '17:15', 10, 15,  1, 45, 'Rx',  2, 46, 'Rx',  'Rx',  2, 55],
  // ── 18:30 ──
  ['Carla Courtois',     '18:30', 5,  7.5, 1, 56, 'Rx',  1, 45, 'Rx',  'Sc1', 3, 38],
  ['Anne Schaber',       '18:30', 5,  7.5, 1, 54, 'Rx',  2, 16, 'Rx',  'Sc1', 2, 51],
  ['Anja Götte',         '18:30', 5,  7.5, 1, 57, 'Rx',  2, 50, 'Rx',  'Rx',  2, 52],
  ['Christian Müller',   '18:30', 10, 15,  1, 45, 'Rx',  2, 40, 'Rx',  'Rx',  2, 30],
  ['Christian Tanner',   '18:30', 10, 10,  1, 50, 'Rx',  2, 50, 'Sc1', 'Rx',  2, 0],
  ['Carmine Carrozzo',   '18:30', 10, 15,  1, 40, 'Rx',  1, 50, 'Rx',  'Sc1', 2, 37],
  ['Tobias Götte',       '18:30', 10, 15,  1, 40, 'Rx',  2, 37, 'Rx',  'Rx',  2, 0],
  ['Bodo Lehmann',       '18:30', 5,  7.5, 2, 0,  'Rx',  2, 30, 'Sc1', 'Sc1', 2, 30],
  ['Senol Özdilek',      '18:30', 10, 12.5, 2, 0, 'Rx',  1, 53, 'Sc3', 'Sc1', 3, 50],
];

async function main() {
  const names = [...new Set(DATA.map(d => d[0]))];
  const { data: members } = await sb.from('members').select('id,name,gender').in('name', names);
  const byName = new Map((members || []).map((m: { id: string; name: string; gender: string | null }) => [m.name, m]));
  const missing = names.filter(n => !byName.has(n));
  if (missing.length) { console.error('❌ UNMATCHED members:', missing); return; }
  const noGender = names.filter(n => !byName.get(n)!.gender);
  if (noGender.length) { console.error('❌ BLANK gender (needed for Box Over load) — STOP:', noGender); return; }

  // sessions
  const sess = new Map<string, { id: string; wodId: string; secIds: Set<string>; booked: Set<string> }>();
  for (const time of ['17:15:00', '18:30:00']) {
    const { data: ws } = await sb.from('weekly_sessions').select('id,workout_id').eq('date', DATE).eq('time', time).maybeSingle();
    if (!ws) continue;
    const { data: w } = await sb.from('wods').select('sections').eq('id', ws.workout_id).maybeSingle();
    const secIds = new Set<string>((w?.sections as { id: string }[] || []).map(x => x.id));
    const { data: bk } = await sb.from('bookings').select('member_id').eq('session_id', ws.id).eq('status', 'confirmed');
    sess.set(time.slice(0, 5), { id: ws.id, wodId: ws.workout_id, secIds, booked: new Set((bk || []).map((b: { member_id: string }) => b.member_id)) });
  }

  type WSR = Record<string, unknown> & { _label: string; _existingId?: string | null };
  const wsrs: WSR[] = [];
  const warn: string[] = [];
  const push = (label: string, wodId: string, secId: string, memberId: string, fields: Record<string, unknown>) => {
    wsrs.push({ _label: label, wod_id: wodId, workout_date: DATE, member_id: memberId, user_id: memberId, whiteboard_name: null, section_id: `${secId}-content-0`, dnf: false, updated_at: now, ...fields });
  };

  for (const [name, time, p3p, p3t, p3r, p3reps, p1r, p1rd, p1reps, p2h, p2d, p2rd, p2reps] of DATA) {
    if (ONLY && time !== ONLY) continue;
    const meta = sess.get(time); if (!meta) { warn.push(`❌ no session ${time}`); continue; }
    const m = byName.get(name)!;
    if (!meta.booked.has(m.id)) warn.push(`⚠️ ${name} not booked in ${time}`);
    for (const s of [S_P1, S_P2, S_P3]) if (!meta.secIds.has(s)) warn.push(`❌ ${time}: missing ${s}`);
    const boxOver = m.gender === 'F' ? 6 : 9;
    push(time, meta.wodId, S_P1, m.id, { scaling_level: p1r, weight_result: boxOver, rounds_result: p1rd, reps_result: p1reps });
    push(time, meta.wodId, S_P2, m.id, { scaling_level: p2h, scaling_level_2: p2d, rounds_result: p2rd, reps_result: p2reps });
    push(time, meta.wodId, S_P3, m.id, { weight_result: p3p, weight_result_2: p3t, rounds_result: p3r, reps_result: p3reps });
  }

  // dedupe
  for (const r of wsrs) {
    const { data: ex } = await sb.from('wod_section_results').select('id').eq('wod_id', r.wod_id as string).eq('section_id', r.section_id as string).eq('workout_date', DATE).eq('member_id', r.member_id as string).limit(1).maybeSingle();
    r._existingId = ex?.id ?? null;
  }
  const ins = wsrs.filter(r => !r._existingId).length;
  console.log(`\nScope: ${ONLY || 'ALL'} | WSR: ${wsrs.length} candidate (${ins} insert / ${wsrs.length - ins} update)`);
  const byLabel = new Map<string, number>();
  for (const r of wsrs) byLabel.set(r._label, (byLabel.get(r._label) || 0) + 1);
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
  // Auto-publish scored sections (direct WSR writes bypass the save route's auto-publish,
  // which otherwise leaves the section hidden in the coach modal + athlete leaderboard).
  const wodIds = [...new Set(wsrs.map(r => r.wod_id as string))];
  for (const wodId of wodIds) {
    const { data: wod } = await sb.from('wods').select('publish_sections').eq('id', wodId).maybeSingle();
    const pub = new Set<string>(wod?.publish_sections || []);
    const before = pub.size;
    [S_P1, S_P2, S_P3].forEach(s => pub.add(s));
    if (pub.size !== before) {
      const { error } = await sb.from('wods').update({ publish_sections: [...pub] }).eq('id', wodId);
      if (error) { console.error('❌ publish', wodId, error.message); return; }
      console.log(`  published missing sections on wod ${wodId.slice(0, 8)}`);
    }
  }
  console.log(`✅ Wrote ${c} WSR rows + ensured sections published.`);
}
main();
