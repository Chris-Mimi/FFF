/**
 * Whiteboard score entry — 2026 Week 29 (photo "2026 Week 29.1").
 * Mirrors the coach results-modal save: one board value fans out to
 * wod_section_results (coach modal + leaderboard) and, for RM lifts, lift_records.
 *
 * Blocks:
 *  1. 13.7 (10:00/17:15/18:30) — Clean & Jerk 3RM  + metcon (Burpee=Sc1, V-Up=Sc2,
 *     C&J load, AMRAP reps).  → WSR ×2 (3RM + metcon) + lift_record (C&J 3RM).
 *  2. 14.7 (17:15/18:30)      — 16-min AMRAP metcon only (HPS load, Push-up=Sc1,
 *     Roll-out=Sc2, rounds+reps).  → WSR ×1.  No lift PR.
 *  3. 15.7 (09:30)            — 15-min AMRAP metcon only (Push-up=Sc1, T2B=Sc2,
 *     rounds+reps; OHS column not stored — no section slot).  → WSR ×1.  No lift PR.
 *
 * Trial/drop-in athletes (Melissa/Freddy/Stephie) → whiteboard_name rows (no lift_record).
 * INSERT/UPDATE, deduped, scoped. Dry-run by default.
 *   npx tsx scripts/enter-week29-whiteboard.ts                 # dry run, all
 *   npx tsx scripts/enter-week29-whiteboard.ts --only="13 10:00"   # one session
 *   npx tsx scripts/enter-week29-whiteboard.ts --apply         # write
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').split('=')[1] || null;
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const CJ = 'Clean & Jerk';
const NOTE = 'Whiteboard entry (2026 Week 29.1, 13-15 Jul)';
const epley = (w: number, reps: number) => reps <= 1 ? null : Math.round(w * (1 + reps / 30) * 10) / 10;
const S3RM = 'section-1783898396564';           // block1 C&J 3RM
const S1_METCON = 'section-1783856933561-4';    // block1 metcon
const S2_METCON = 'section-1782044000428-4';    // block2 metcon
const S3_METCON = 'section-1780904441343';      // block3 metcon
const now = new Date().toISOString();

type Scale = 'Rx' | 'Sc1' | 'Sc2' | 'Sc3';
// Block 1: [name, time, cj3rm, burpee, vup, cjLoad, amrapReps, track]
const B1: [string, string, number, Scale, Scale, number, number, number][] = [
  ['Irene Koffler',       '10:00', 22.5, 'Rx',  'Sc1', 20,   19, 1],
  ['Aline von Rüden',     '10:00', 35,   'Rx',  'Sc2', 20,   22, 2],
  ['Anna Krautwald',      '10:00', 20,   'Sc1', 'Sc2', 10,   23, 2],
  ['Daniela Simm',        '10:00', 27.5, 'Sc1', 'Sc1', 15,   35, 1],
  ['Leah Mesche',         '10:00', 20,   'Sc1', 'Sc1', 10,   18, 1],
  ['Michael Städele',     '10:00', 60,   'Rx',  'Rx',  33,   28, 1],
  ['Miriam Jacht',        '17:15', 37.5, 'Rx',  'Sc2', 20,   28, 2],
  ['Nikolina Vlasalija',  '17:15', 20,   'Rx',  'Sc2', 10,   23, 2],
  ['Valerie Mesenburg',   '17:15', 30,   'Rx',  'Sc1', 17.5, 35, 1],
  ['Lukas Simnacher',     '17:15', 70,   'Rx',  'Sc1', 40,   33, 1],
  ['Dimitar Peresyov',    '17:15', 70,   'Rx',  'Sc2', 40,   31, 1],
  ['Chris Hiles',         '17:15', 60,   'Rx',  'Rx',  33,   37, 1],
  ['Carla Courtois',      '18:30', 37.5, 'Rx',  'Sc2', 20,   31, 2],
  ['Julia Weihe',         '18:30', 22.5, 'Rx',  'Sc2', 10,   22, 1],
  ['Anja Götte',          '18:30', 35,   'Rx',  'Rx',  20,   30, 1],
  ['Tobias Götte',        '18:30', 73,   'Rx',  'Rx',  40,   15, 1],
  ['Christian Tanner',    '18:30', 42.5, 'Rx',  'Sc2', 25,   23, 1],
  ['Carmine Carrozzo',    '18:30', 73,   'Rx',  'Sc1', 40,   11, 2],
  ['Teemu Lian Geisler',  '18:30', 30,   'Rx',  'Rx',  20,   23, 1],
  ['Markus Fischer',      '18:30', 60,   'Rx',  'Sc2', 33,   23, 1],
];
// Block 2: [name, time, barbell, pushup, rollout, rounds, reps, whiteboardName|null]
const B2: [string, string, number, Scale, Scale, number, number, string | null][] = [
  ['Kathrin Mühlen',      '17:15', 20,   'Rx',  'Sc1', 7, 19, null],
  ['Annerose Streit',     '17:15', 17.5, 'Sc1', 'Sc2', 7, 28, null],
  ['Leah Mesche',         '17:15', 17.5, 'Sc1', 'Sc2', 7, 0,  null],
  ['Melissa',             '17:15', 17.5, 'Sc1', 'Sc2', 6, 0,  'Melissa (Leah\'s friend)'],
  ['Daniela Simm',        '17:15', 20,   'Rx',  'Sc2', 7, 0,  null],
  ['Freddy',              '17:15', 30,   'Rx',  'Sc2', 7, 6,  'Freddy'],
  ['Franziska Herndorf',  '18:30', 17.5, 'Sc1', 'Sc2', 8, 0,  null],
  ['Susi Glocker',        '18:30', 17.5, 'Sc1', 'Sc2', 7, 21, null],
  ['Anfisa Bornemann',    '18:30', 10,   'Sc1', 'Sc2', 8, 0,  null],
  ['Stephie',             '18:30', 10,   'Sc1', 'Sc1', 7, 24, 'Stephie Hansefit'],
  ['Christian Müller',    '18:30', 30,   'Rx',  'Sc1', 7, 26, null],
  ['Stefan G',            '18:30', 25,   'Rx',  'Sc1', 7, 20, null],
  ['Teemu Lian Geisler',  '18:30', 20,   'Rx',  'Sc1', 8, 10, null],
];
// Block 3: [name, pushup, t2b, rounds, reps]
const B3: [string, Scale, Scale, number, number][] = [
  ['Anna Krautwald',   'Sc3', 'Sc2', 5, 12],
  ['Irene Koffler',    'Sc2', 'Sc1', 5, 5],
  ['Michael Städele',  'Rx',  'Rx',  9, 9],
  ['David Montgomery', 'Sc2', 'Sc2', 6, 6],
];

type WSR = Record<string, unknown> & { _key: string; _label: string; _existingId?: string | null };
type LR = { user_id: string; lift_name: string; weight_kg: number; reps: number; rep_max_type: string; calculated_1rm: number | null; lift_date: string; notes: string; _label: string };

async function main() {
  // members
  const allNames = [...new Set([...B1.map(r => r[0]), ...B2.filter(r => !r[7]).map(r => r[0]), ...B3.map(r => r[0])])];
  const { data: members } = await sb.from('members').select('id,name').in('name', allNames);
  const idByName = new Map((members || []).map((m: { id: string; name: string }) => [m.name, m.id]));
  const missing = allNames.filter(n => !idByName.has(n));
  if (missing.length) { console.error('❌ UNMATCHED members:', missing); return; }

  // sessions: (date,time) -> {id, wodId, sectionIds:Set, booked:Set}
  const dates = ['2026-07-13', '2026-07-14', '2026-07-15'];
  const { data: ws } = await sb.from('weekly_sessions').select('id,date,time,workout_id').in('date', dates);
  const sess = new Map<string, { id: string; wodId: string; secIds: Set<string>; booked: Set<string> }>();
  for (const s of ws || []) {
    const { data: w } = await sb.from('wods').select('sections').eq('id', s.workout_id).maybeSingle();
    if (!w) continue;
    const secIds = new Set<string>((w.sections as { id: string }[] || []).map(x => x.id));
    const { data: bk } = await sb.from('bookings').select('member_id').eq('session_id', s.id).eq('status', 'confirmed');
    sess.set(`${s.date} ${(s.time as string).slice(0, 5)}`, { id: s.id, wodId: s.workout_id, secIds, booked: new Set((bk || []).map((b: { member_id: string }) => b.member_id)) });
  }

  const wsrs: WSR[] = [];
  const lrs: LR[] = [];
  const warn: string[] = [];
  const mkKey = (wodId: string, secId: string, date: string, who: string) => `${wodId}|${secId}-content-0|${date}|${who}`;

  const pushWSR = (label: string, wodId: string, secId: string, date: string, memberId: string | null, wbName: string | null, fields: Record<string, unknown>) => {
    const who = memberId ?? `wb:${wbName}`;
    wsrs.push({ _key: mkKey(wodId, secId, date, who), _label: label, wod_id: wodId, workout_date: date, member_id: memberId, user_id: memberId, whiteboard_name: memberId ? null : wbName, section_id: `${secId}-content-0`, dnf: false, updated_at: now, ...fields });
  };

  // ---- Block 1 ----
  for (const [name, time, cj3, burpee, vup, load, reps, track] of B1) {
    const label = `13 ${time}`;
    if (ONLY && label !== ONLY) continue;
    const meta = sess.get(`2026-07-13 ${time}`); if (!meta) { warn.push(`❌ no session 13 ${time}`); continue; }
    const id = idByName.get(name)!;
    if (!meta.booked.has(id)) warn.push(`⚠️ ${name} not booked in 13 ${time}`);
    if (!meta.secIds.has(S3RM) || !meta.secIds.has(S1_METCON)) warn.push(`❌ 13 ${time}: missing section on wod`);
    pushWSR(label, meta.wodId, S3RM, '2026-07-13', id, null, { weight_result: cj3 });
    pushWSR(label, meta.wodId, S1_METCON, '2026-07-13', id, null, { weight_result: load, reps_result: reps, scaling_level: burpee, scaling_level_2: vup, track });
    lrs.push({ user_id: id, lift_name: CJ, weight_kg: cj3, reps: 3, rep_max_type: '3RM', calculated_1rm: epley(cj3, 3), lift_date: '2026-07-13', notes: NOTE, _label: label });
  }
  // ---- Block 2 ----
  for (const [name, time, barbell, push, roll, rounds, reps, wb] of B2) {
    const label = `14 ${time}`;
    if (ONLY && label !== ONLY) continue;
    const meta = sess.get(`2026-07-14 ${time}`); if (!meta) { warn.push(`❌ no session 14 ${time}`); continue; }
    const id = wb ? null : idByName.get(name)!;
    if (id && !meta.booked.has(id)) warn.push(`⚠️ ${name} not booked in 14 ${time}`);
    if (!meta.secIds.has(S2_METCON)) warn.push(`❌ 14 ${time}: missing metcon section`);
    pushWSR(label, meta.wodId, S2_METCON, '2026-07-14', id, wb, { weight_result: barbell, scaling_level: push, scaling_level_2: roll, rounds_result: rounds, reps_result: reps });
  }
  // ---- Block 3 ----
  for (const [name, push, t2b, rounds, reps] of B3) {
    const label = '15 09:30';
    if (ONLY && label !== ONLY) continue;
    const meta = sess.get('2026-07-15 09:30'); if (!meta) { warn.push('❌ no session 15 09:30'); continue; }
    const id = idByName.get(name)!;
    if (!meta.booked.has(id)) warn.push(`⚠️ ${name} not booked in 15 09:30`);
    if (!meta.secIds.has(S3_METCON)) warn.push(`❌ 15 09:30: missing metcon section`);
    pushWSR(label, meta.wodId, S3_METCON, '2026-07-15', id, null, { scaling_level: push, scaling_level_2: t2b, rounds_result: rounds, reps_result: reps });
  }

  // dedupe WSR vs existing
  for (const r of wsrs) {
    let q = sb.from('wod_section_results').select('id').eq('wod_id', r.wod_id as string).eq('section_id', r.section_id as string).eq('workout_date', r.workout_date as string);
    q = r.member_id ? q.eq('member_id', r.member_id as string) : q.is('member_id', null).eq('whiteboard_name', r.whiteboard_name as string);
    const { data: ex } = await q.limit(1).maybeSingle();
    r._existingId = ex?.id ?? null;
  }
  // dedupe lift_records vs existing
  const uids = [...idByName.values()];
  const { data: exLr } = await sb.from('lift_records').select('user_id,lift_name,lift_date,rep_max_type').in('user_id', uids).eq('lift_date', '2026-07-13');
  const exLrKey = new Set((exLr || []).map((r: { user_id: string; lift_name: string; lift_date: string; rep_max_type: string }) => `${r.user_id}|${r.lift_name}|${r.lift_date}|${r.rep_max_type}`));
  const lrInsert = lrs.filter(r => !exLrKey.has(`${r.user_id}|${r.lift_name}|${r.lift_date}|${r.rep_max_type}`));

  // report
  const wIns = wsrs.filter(r => !r._existingId).length, wUpd = wsrs.length - wIns;
  console.log(`\nScope: ${ONLY || 'ALL'}`);
  console.log(`WSR: ${wsrs.length} candidate (${wIns} insert / ${wUpd} update)`);
  console.log(`lift_records: ${lrs.length} candidate (${lrInsert.length} insert / ${lrs.length - lrInsert.length} skip-exists)`);
  const byLabel = new Map<string, number>();
  for (const r of wsrs) byLabel.set(r._label, (byLabel.get(r._label) || 0) + 1);
  console.log('  WSR by session: ' + [...byLabel.entries()].map(([k, v]) => `${k}=${v}`).join(', '));
  if (warn.length) console.log('\n' + [...new Set(warn)].join('\n'));

  if (!APPLY) { console.log('\nDRY RUN — pass --apply to write.'); return; }
  let wc = 0;
  for (const r of wsrs) {
    const { _key, _label, _existingId, ...row } = r;
    const res = _existingId ? await sb.from('wod_section_results').update(row).eq('id', _existingId) : await sb.from('wod_section_results').insert(row);
    if (res.error) { console.error('❌ WSR', _label, res.error.message); return; }
    wc++;
  }
  if (lrInsert.length) {
    const rows = lrInsert.map(({ _label, ...r }) => r);
    const { error } = await sb.from('lift_records').insert(rows);
    if (error) { console.error('❌ lift_records', error.message); return; }
  }
  console.log(`✅ Wrote ${wc} WSR + ${lrInsert.length} lift_records.`);
}
main();
