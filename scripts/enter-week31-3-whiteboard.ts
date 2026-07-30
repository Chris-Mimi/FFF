/**
 * Whiteboard score entry — 2026 Week 31.3 (photo "2026 Week 31.3"), 29.07.26 17:15 + 18:30.
 * "OHS Testing 10RM" + 30-20-10 metcon (Push-up / HPC / GHDHE / DUs).
 *
 *   17:15 sess 98015d08  |  18:30 sess 98b97abd   (wod re-read live)
 * Sections (same ids both wods):
 *   OHS   section-1780904306111  {load}  → Overhead Squat 10RM weight + lift_record
 *   MCON  section-1780904441343  {load,time,scaling(,scaling_2)}
 *         scaling = Push-up tier | load = HPC kg by tier+gender (Rx 34/43, Sc1 25/35, Sc2 20/30, Sc3=10 per Chris)
 *         scaling_2 = Double-Unders tier (ENABLED by this script — Chris ok) | time = metcon time (mm:ss)
 *   OHS "!" (ChristianM/Thomas G/Senol) = heels raised on wedge → modified flag + note on the OHS row.
 *   Martina: no OHS (metcon only, no lift_record).
 *
 * WSR section_id = `${sec}-content-0` (S399). Dedupe on user_id. Dry-run default.
 *   npx tsx scripts/enter-week31-3-whiteboard.ts [--apply]
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const DATE = '2026-07-29';
const SEC_OHS = 'section-1780904306111';
const SEC_MC = 'section-1780904441343';
const cid = (s: string) => `${s}-content-0`;
const epley = (w: number, reps: number) => Math.round(w * (1 + reps / 30) * 10) / 10;

// [name, ohs|null, push, hpc_kg, dus, time, note?]
type Row = [string, number | null, string, number, string, string, string?];
const SESS: Record<string, { sess: string; rows: Row[] }> = {
  '17:15': { sess: '98015d08-713c-4bef-b5a3-041549d3d27f', rows: [
    ['Carla Courtois',     27.5, 'Sc2', 25, 'Sc2', '16:00'],
    ['Claudia Herrmann',   37.5, 'Rx',  25, 'Sc2', '14:27'],
    ['Nikolina Vlasalija', 15,   'Sc2', 20, 'Sc2', '17:20'],
    ['Sabrina Lucas',      22.5, 'Sc2', 20, 'Sc2', '13:33'],
    ['Daniela Simm',       20,   'Rx',  20, 'Sc2', '15:45'],
    ['Lukas Simnacher',    55,   'Rx',  43, 'Rx',  '11:40'],
    ['Paul Bielenski',     40,   'Rx',  43, 'Rx',  '13:04'],
    ['Wayne Lucas',        35,   'Rx',  43, 'Rx',  '10:33'],
  ]},
  '18:30': { sess: '98b97abd-b2f0-473a-9cfd-833b32807800', rows: [
    ['Anne Schaber',       27.5, 'Sc2', 20, 'Sc2', '14:07'],
    ['Martina Fenster',    null, 'Sc2', 10, 'Sc3', '10:00'],
    ['Christian Müller',   20,   'Rx',  43, 'Sc2', '12:43', 'Heels raised on wedge'],
    ['Christian Tanner',   30,   'Rx',  35, 'Sc2', '15:00'],
    ['Thomas Graf',        35,   'Sc2', 35, 'Sc2', '18:30', 'Heels raised on wedge'],
    ['Senol Özdilek',      30,   'Sc2', 30, 'Sc2', '10:45', 'Heels raised on wedge'],
    ['Chris Hiles',        45,   'Rx',  35, 'Rx',  '16:03'],
  ]},
};

(async () => {
  const { data: ws, error: wsErr } = await sb.from('weekly_sessions')
    .select('id,workout_id').in('id', Object.values(SESS).map(s => s.sess));
  if (wsErr || !ws) { console.error('sessions err:', wsErr?.message); return; }
  const wodBySess = new Map(ws.map(s => [s.id, s.workout_id]));

  const allNames = Object.values(SESS).flatMap(s => s.rows.map(r => r[0]));
  const { data: members, error: mErr } = await sb.from('members').select('id,name').in('name', [...new Set(allNames)]);
  if (mErr) { console.error('members err:', mErr.message); return; }
  const idByName = new Map((members || []).map(m => [m.name, m.id]));
  const missing = [...new Set(allNames)].filter(n => !idByName.has(n));
  if (missing.length) { console.error('❌ unresolved:', missing.join(', ')); return; }

  type WSR = Record<string, any> & { _label: string; _name: string; _existingId?: string | null };
  const wsrs: WSR[] = [];
  const lifts: Record<string, any>[] = [];

  for (const [time, s] of Object.entries(SESS)) {
    const wod = wodBySess.get(s.sess);
    if (!wod) { console.error('❌ no live wod for', time); return; }
    for (const [name, ohs, push, hpc, dus, t, note] of s.rows) {
      const uid = idByName.get(name)!;
      const base = { wod_id: wod, workout_date: DATE, member_id: uid, user_id: uid, whiteboard_name: null };
      // OHS 10RM (skip if none)
      if (ohs != null) {
        const row: any = { ...base, section_id: cid(SEC_OHS), weight_result: ohs, _label: time, _name: name };
        if (note) { row.modified = true; row.modified_note = note; }
        wsrs.push(row);
        lifts.push({ user_id: uid, lift_name: 'Overhead Squat', weight_kg: ohs, reps: 10, rep_max_type: '10RM', calculated_1rm: epley(ohs, 10), lift_date: DATE });
      }
      // Metcon
      wsrs.push({ ...base, section_id: cid(SEC_MC), scaling_level: push, weight_result: hpc, scaling_level_2: dus, time_result: t, _label: time, _name: name });
    }
  }

  // dedupe WSR on user_id
  for (const r of wsrs) {
    const { data: ex } = await sb.from('wod_section_results').select('id')
      .eq('wod_id', r.wod_id).eq('section_id', r.section_id).eq('workout_date', r.workout_date).eq('user_id', r.user_id).limit(1).maybeSingle();
    r._existingId = ex?.id ?? null;
  }
  for (const l of lifts) {
    const { data: ex } = await sb.from('lift_records').select('id')
      .eq('user_id', l.user_id).eq('lift_name', l.lift_name).eq('lift_date', l.lift_date).eq('rep_max_type', l.rep_max_type).limit(1).maybeSingle();
    (l as any)._existingId = ex?.id ?? null;
  }

  const wIns = wsrs.filter(r => !r._existingId).length;
  const lIns = lifts.filter(l => !(l as any)._existingId).length;
  console.log(`WSR: ${wsrs.length} (${wIns} ins / ${wsrs.length - wIns} upd) | lift_records: ${lifts.length} (${lIns} ins / ${lifts.length - lIns} upd)`);
  for (const r of wsrs) console.log(`  ${r._label} ${r._name.padEnd(20)} ${r.section_id === cid(SEC_OHS) ? `OHS=${r.weight_result}${r.modified ? ' ⚑' : ''}` : `MC hpc=${r.weight_result} push=${r.scaling_level} dus=${r.scaling_level_2} t=${r.time_result}`}`);

  if (!APPLY) { console.log('\nDRY RUN — pass --apply to write.'); return; }

  // Enable scaling_2 on the metcon section of both wods (Double-Unders tier)
  for (const wod of new Set(wsrs.map(r => r.wod_id))) {
    const { data: w } = await sb.from('wods').select('sections,publish_sections').eq('id', wod).single();
    const secs = (w!.sections as any[]).map(sec => sec.id === SEC_MC
      ? { ...sec, scoring_fields: { ...sec.scoring_fields, scaling_2: true } } : sec);
    const pub = new Set<string>((w as any).publish_sections || []);
    [SEC_OHS, SEC_MC].forEach(x => pub.add(x));
    await sb.from('wods').update({ sections: secs, publish_sections: [...pub] }).eq('id', wod);
    console.log('  enabled scaling_2 + published on', wod);
  }

  let wc = 0;
  for (const r of wsrs) {
    const { _label, _name, _existingId, ...row } = r;
    const res = _existingId ? await sb.from('wod_section_results').update(row).eq('id', _existingId) : await sb.from('wod_section_results').insert(row);
    if (res.error) { console.error('❌ WSR', _name, r.section_id, res.error.message); return; }
    wc++;
  }
  let lc = 0;
  for (const l of lifts) {
    const { _existingId, ...row } = l as any;
    const res = _existingId ? await sb.from('lift_records').update(row).eq('id', _existingId) : await sb.from('lift_records').insert(row);
    if (res.error) { console.error('❌ lift', row.lift_name, res.error.message); return; }
    lc++;
  }
  console.log(`✅ Wrote ${wc} WSR + ${lc} lift_records.`);
})();
