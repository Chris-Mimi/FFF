/**
 * Whiteboard score entry — 2026 Week 29.4 (photo "2026 Week 29.4").
 * MetCon "3x 5 min work + 1 min REST" — two Sunday sessions 19.07, identical wod.
 * Board = 3 scored parts (Barbell Clean Basics + warmup are unscored skill work):
 *   SEC_METRES section-1768641785957  {metres}          → AB + KBFC  = Farmers Carry max metres
 *   SEC_SITUP  section-1768641873536  {reps}            → Ski + Sit-up = AbMat sit-up reps
 *   SEC_RC     section-1768641988278  {reps, scaling}   → Row + RC = Rope Climb reps + scaling
 * Board "Sc" = Sc2 (Chris). Section-1 load removed by Chris (all Rx weight) → metres only.
 *
 *   S10  19.07 10:00  wod 2ee9f0a2  (Foundations/Advanced; Freddy = drop-in, whiteboard-only)
 *   S11  19.07 11:00  wod 8530b257  (Foundations/Beginners)
 *
 * Auto-publishes scored sections. INSERT/UPDATE, deduped. Dry-run default.
 *   npx tsx scripts/enter-week29-4-whiteboard.ts [--apply]
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const DATE = '2026-07-19';
const SEC_METRES = 'section-1768641785957';
const SEC_SITUP = 'section-1768641873536';
const SEC_RC = 'section-1768641988278';

type Sc = 'Rx' | 'Sc2';
// [name, metres, situps(null=no row), rcReps, scaling]
type Row = [string, number, number | null, number, Sc];

const SESS = {
  S10: { time: '10:00:00', sid: 'ed48ffc1-13c9-4780-bc1e-79820a9fcbde', wod: '2ee9f0a2-1540-4bc3-b3d1-c1f5c7ae20ca',
    rows: [
      ['Anne Schaber',        120, 57,  7, 'Rx'],
      ['Miriam Jacht',        220, 96,  7, 'Rx'],
      ['Nikolina Vlasalija',  130, 71,  8, 'Sc2'],
      ['Helen Schüler',       190, 56, 14, 'Sc2'],
      ['Soledad',             150, 36,  4, 'Rx'],
      ['Julia Weihe',         140, 47,  6, 'Sc2'],
      ['Carmine Carrozzo',    140, 40,  6, 'Sc2'],
      ['Stefan G',            200, 55,  8, 'Rx'],
      ['Teemu Lian Geisler',  120, 57,  9, 'Rx'],
      ['Christian Tanner',    120, 78, 17, 'Sc2'],
    ] as Row[],
    whiteboard: [ ['Freddy', 180, 60, 8, 'Sc2'] ] as Row[],   // drop-in, no member
  },
  S11: { time: '11:00:00', sid: 'b08d2afa-d4d4-43f1-93df-b5e05bf8cab6', wod: '8530b257-0896-4923-93d7-d23c9c9cb834',
    rows: [
      ['Anna Krautwald', 160, 35,  9, 'Sc2'],
      ['Anna Hohenadl',  120, null, 11, 'Sc2'],   // sit-up = "—" no score
      ['Daniela Simm',   200, 50, 12, 'Sc2'],
      ['Jolanda Greif',  100, 40,  9, 'Sc2'],
      ['Tobias Schiegg', 140, 70,  6, 'Sc2'],
    ] as Row[],
    whiteboard: [] as Row[],
  },
} as const;

(async () => {
  // resolve member ids
  const allNames = Object.values(SESS).flatMap(s => s.rows.map(r => r[0]));
  const { data: members, error: mErr } = await sb.from('members').select('id,name').in('name', allNames);
  if (mErr) { console.error('members err:', mErr.message); return; }
  const idByName = new Map((members || []).map(m => [m.name, m.id]));
  const missing = allNames.filter(n => !idByName.has(n));
  if (missing.length) { console.error('❌ unresolved member names:', missing.join(', ')); return; }

  type WSR = Record<string, any> & { _label: string; _existingId?: string | null };
  const wsrs: WSR[] = [];
  const mkRows = (label: string, wod: string, r: Row, memberId: string | null, wbName: string | null) => {
    const base = { wod_id: wod, workout_date: DATE, member_id: memberId, user_id: memberId, whiteboard_name: wbName };
    // WSR section_id MUST be `${sectionId}-content-0` (app/leaderboard format — save/route.ts:215).
    const cid = (s: string) => `${s}-content-0`;
    const out: WSR[] = [];
    out.push({ ...base, section_id: cid(SEC_METRES), metres_result: r[1], _label: label });
    if (r[2] != null) out.push({ ...base, section_id: cid(SEC_SITUP), reps_result: r[2], _label: label });
    out.push({ ...base, section_id: cid(SEC_RC), reps_result: r[3], scaling_level: r[4], _label: label });
    return out;
  };

  for (const [label, s] of Object.entries(SESS)) {
    for (const r of s.rows) wsrs.push(...mkRows(label, s.wod, r, idByName.get(r[0])!, null));
    for (const r of s.whiteboard) wsrs.push(...mkRows(label, s.wod, r, null, r[0]));
  }

  // dedupe against existing (by member_id OR whiteboard_name)
  for (const r of wsrs) {
    let q = sb.from('wod_section_results').select('id')
      .eq('wod_id', r.wod_id).eq('section_id', r.section_id).eq('workout_date', r.workout_date);
    q = r.member_id ? q.eq('member_id', r.member_id) : q.is('member_id', null).eq('whiteboard_name', r.whiteboard_name);
    const { data: ex } = await q.limit(1).maybeSingle();
    r._existingId = ex?.id ?? null;
  }

  const ins = wsrs.filter(r => !r._existingId).length;
  console.log(`WSR: ${wsrs.length} candidate (${ins} insert / ${wsrs.length - ins} update)`);
  const byLabel = new Map<string, number>(); for (const r of wsrs) byLabel.set(r._label, (byLabel.get(r._label) || 0) + 1);
  console.log('  by session: ' + [...byLabel.entries()].map(([k, v]) => `${k}=${v}`).join(', '));

  if (!APPLY) { console.log('\nDRY RUN — pass --apply to write.'); return; }
  let c = 0;
  for (const r of wsrs) {
    const { _label, _existingId, ...row } = r;
    const res = _existingId ? await sb.from('wod_section_results').update(row).eq('id', _existingId) : await sb.from('wod_section_results').insert(row);
    if (res.error) { console.error('❌', _label, r.section_id, res.error.message); return; }
    c++;
  }
  // auto-publish scored sections (direct writes bypass the save route's auto-publish — S398)
  for (const s of Object.values(SESS)) {
    const { data: wod } = await sb.from('wods').select('publish_sections').eq('id', s.wod).maybeSingle();
    const pub = new Set<string>((wod as any)?.publish_sections || []); const before = pub.size;
    [SEC_METRES, SEC_SITUP, SEC_RC].forEach(x => pub.add(x));
    if (pub.size !== before) { await sb.from('wods').update({ publish_sections: [...pub] }).eq('id', s.wod); console.log(`  published sections on ${s.wod}`); }
  }
  console.log(`✅ Wrote ${c} WSR rows + ensured sections published.`);
})();
