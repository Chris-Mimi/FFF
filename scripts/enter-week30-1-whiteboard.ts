/**
 * Whiteboard score entry — 2026 Week 30.1 (photo "2026 Week 30.1"), 20.07.26.
 * Barbell Bench Press 5RM + a metcon (OHP/PP/PJ barbell + Strict Pull-ups).
 * Two evening sessions, identical wods.
 *
 *   S1715  17:15  wod 590ebcdf  sid ac44f06f
 *   S1830  18:30  wod 3c9dfc9c  sid e5e88734   (workout_id changed after Chris's edit — re-read live)
 *
 * Sections (same ids both wods):
 *   BP     section-1784540834305   {load}                     → Bench Press 5RM (weight) + lift_record
 *   METCON section-1775423686864-4 {reps, scaling, scaling_2} → reps = barbell reps + pull-up reps (SUM);
 *          scaling = pull-up tier (rightmost board column); scaling_2 = barbell tier from %bw
 *          (Chris map: Rx>=50, Sc1>=44, Sc2>=40, Sc3>=30). load is OFF → no barbell kg stored.
 *
 * WSR section_id = `${sectionId}-content-0` (S399 lesson). Auto-publishes. Dry-run default.
 *   npx tsx scripts/enter-week30-1-whiteboard.ts [--apply]
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const DATE = '2026-07-20';
const SEC_BP = 'section-1784540834305';
const SEC_MC = 'section-1775423686864-4';
const cid = (s: string) => `${s}-content-0`;
const epley = (w: number, reps: number) => Math.round(w * (1 + reps / 30) * 10) / 10;

type Sc = 'Rx' | 'Sc1' | 'Sc2' | 'Sc3';
// [name, bp5rm, barbellReps, pullReps, pullScaling, barbellTier]
type Row = [string, number, number, number, Sc, Sc];

const SESS = {
  S1715: { time: '17:15', rows: [
    ['Lena Jähn',          37.5, 56, 25, 'Rx',  'Sc2'],
    ['Miriam Jacht',       40,   50, 36, 'Sc1', 'Sc3'],
    ['Valerie Mesenburg',  32.5, 53, 49, 'Sc2', 'Sc3'],
    ['Dimitar Peresyov',   90,   64, 43, 'Rx',  'Sc1'],
    ['Lukas Simnacher',    80,   61, 50, 'Rx',  'Sc1'],
    ['Paul Bielenski',     90,   60, 30, 'Rx',  'Rx'],
    ['Carmine Carrozzo',   90,   47, 56, 'Sc3', 'Sc1'],
  ] as Row[] },
  S1830: { time: '18:30', rows: [
    ['Anneke Spegele',     40,   56, 26, 'Sc1', 'Sc2'],
    ['Carla Courtois',     45,   68, 43, 'Sc3', 'Sc3'],
    ['Christian Tanner',   60,   56, 35, 'Sc2', 'Sc2'],
    ['Markus Fischer',     110,  57, 50, 'Rx',  'Rx'],
    ['Thomas Spegele',     80,   62, 48, 'Rx',  'Rx'],
    ['Tobias Götte',       80,   75, 36, 'Rx',  'Rx'],
    ['Chris Hiles',        81,   78, 57, 'Rx',  'Rx'],
  ] as Row[] },
} as const;

(async () => {
  // resolve live workout_id per session (ids change when Chris edits — S399/S30.1 lesson)
  const { data: ws, error: wsErr } = await sb.from('weekly_sessions')
    .select('id,time,workout_id').eq('date', DATE).in('time', ['17:15:00', '18:30:00']);
  if (wsErr || !ws) { console.error('sessions err:', wsErr?.message); return; }
  const wodByTime = new Map(ws.map(s => [s.time.slice(0, 5), s.workout_id]));

  const allNames = Object.values(SESS).flatMap(s => s.rows.map(r => r[0]));
  const { data: members, error: mErr } = await sb.from('members').select('id,name').in('name', allNames);
  if (mErr) { console.error('members err:', mErr.message); return; }
  const idByName = new Map((members || []).map(m => [m.name, m.id]));
  const missing = allNames.filter(n => !idByName.has(n));
  if (missing.length) { console.error('❌ unresolved:', missing.join(', ')); return; }

  type WSR = Record<string, any> & { _label: string; _existingId?: string | null };
  const wsrs: WSR[] = [];
  const lifts: Record<string, any>[] = [];

  for (const [label, s] of Object.entries(SESS)) {
    const wod = wodByTime.get(s.time);
    if (!wod) { console.error('❌ no live wod for', s.time); return; }
    for (const [name, bp, bbReps, pullReps, pullSc, bbTier] of s.rows) {
      const uid = idByName.get(name)!;
      const base = { wod_id: wod, workout_date: DATE, member_id: uid, user_id: uid, whiteboard_name: null };
      // BP 5RM WSR (load) + lift_record
      wsrs.push({ ...base, section_id: cid(SEC_BP), weight_result: bp, _label: label });
      lifts.push({ user_id: uid, lift_name: 'Bench Press', weight_kg: bp, reps: 5, rep_max_type: '5RM', calculated_1rm: epley(bp, 5), lift_date: DATE });
      // Metcon WSR: reps = sum, scaling = pull-up, scaling_2 = barbell tier (no load — off)
      wsrs.push({ ...base, section_id: cid(SEC_MC), reps_result: bbReps + pullReps, scaling_level: pullSc, scaling_level_2: bbTier, _label: label });
    }
  }

  // dedupe WSR on user_id — the unique constraint is (user_id, wod_id, section_id, workout_date),
  // and self-entered rows can have member_id NULL, so member_id dedupe misses them (S30.1 crash).
  for (const r of wsrs) {
    const { data: ex } = await sb.from('wod_section_results').select('id')
      .eq('wod_id', r.wod_id).eq('section_id', r.section_id).eq('workout_date', r.workout_date).eq('user_id', r.user_id).limit(1).maybeSingle();
    r._existingId = ex?.id ?? null;
  }
  // dedupe lift_records (same user + lift + date)
  for (const l of lifts) {
    const { data: ex } = await sb.from('lift_records').select('id')
      .eq('user_id', l.user_id).eq('lift_name', l.lift_name).eq('lift_date', l.lift_date).eq('rep_max_type', l.rep_max_type).limit(1).maybeSingle();
    (l as any)._existingId = ex?.id ?? null;
  }

  const wIns = wsrs.filter(r => !r._existingId).length;
  const lIns = lifts.filter(l => !(l as any)._existingId).length;
  console.log(`WSR: ${wsrs.length} (${wIns} ins / ${wsrs.length - wIns} upd) | lift_records: ${lifts.length} (${lIns} ins / ${lifts.length - lIns} upd)`);

  if (!APPLY) { console.log('\nDRY RUN — pass --apply to write.'); return; }

  let wc = 0;
  for (const r of wsrs) {
    const { _label, _existingId, ...row } = r;
    const res = _existingId ? await sb.from('wod_section_results').update(row).eq('id', _existingId) : await sb.from('wod_section_results').insert(row);
    if (res.error) { console.error('❌ WSR', _label, r.section_id, res.error.message); return; }
    wc++;
  }
  let lc = 0;
  for (const l of lifts) {
    const { _existingId, ...row } = l as any;
    const res = _existingId ? await sb.from('lift_records').update(row).eq('id', _existingId) : await sb.from('lift_records').insert(row);
    if (res.error) { console.error('❌ lift', l.lift_name, res.error.message); return; }
    lc++;
  }
  // ensure scored sections published (base ids, no -content-0 suffix)
  for (const wod of new Set(wsrs.map(r => r.wod_id))) {
    const { data: w } = await sb.from('wods').select('publish_sections').eq('id', wod).maybeSingle();
    const pub = new Set<string>((w as any)?.publish_sections || []); const before = pub.size;
    [SEC_BP, SEC_MC].forEach(x => pub.add(x));
    if (pub.size !== before) { await sb.from('wods').update({ publish_sections: [...pub] }).eq('id', wod); console.log('  published on', wod); }
  }
  console.log(`✅ Wrote ${wc} WSR + ${lc} lift_records.`);
})();
