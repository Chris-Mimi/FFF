/**
 * Whiteboard score entry — 2026 Week 31.1 (photo "2026 Week 31.1"). WSR-only (no rm_test lift → no lift_records).
 *
 * BOARD A — 27.07 10:00  "KB Clean/Carry/BOR/Push-up" metcon
 *   sess 28bc53c9  sec section-1783856939970-4
 *   fields: rounds_result+reps_result (R+R) | weight_result = KB single-bell kg (Rx=12F/20M)
 *           scaling_level = Push-up tier | track = 1 Run / 2 AB
 *
 * BOARD B — "M-up/T2B/Pull-up/WW/FS/Burpee" metcon (4 sessions, same section id, wod re-read live)
 *   27.07 17:15 sess 629f42c5 | 27.07 18:30 sess 9c497180 | 28.07 18:30 sess 691d4efb | 29.07 09:30 sess 04fa6886
 *   sec section-1785067619268-4
 *   fields: scaling_level = T2R | scaling_level_2 = WW | scaling_level_3 = P.up/T2B
 *           weight_result = Barbell FS kg by tier+gender (Rx 34/52, Sc1 25/40, Sc2 20/35, Sc3 15/30 = W/M)
 *           rounds_result+reps_result = R+R
 *   ChristianM (28.07): FS "!" = heels raised on wedge → modified flag + note.
 *
 * WSR section_id = `${sectionId}-content-0` (S399). Both scored sections already in publish_sections
 * (verified), but the script re-unions defensively. Dedupe on user_id. Dry-run default.
 *   npx tsx scripts/enter-week31-1-whiteboard.ts [--apply]
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const cid = (s: string) => `${s}-content-0`;
const SEC_A = 'section-1783856939970-4';
const SEC_B = 'section-1785067619268-4';

// ---- BOARD A (27.07 10:00) : [name, rounds, reps, kb_kg, push, track] ----
type ARow = [string, number, number, number, string, number];
const BOARD_A: ARow[] = [
  ['Michael Städele', 7, 0, 20, 'Rx',  1],
  ['Wayne Lucas',     6, 1, 20, 'Rx',  2],
  ['Dinny Braatz',    6, 1, 12, 'Rx',  1],
  ['Daniela Simm',    5, 0, 10, 'Sc1', 1],
  ['Anna Krautwald',  5, 24, 8, 'Sc2', 2],
  ['Irene Koffler',   5, 0, 12, 'Sc1', 1],
  ['Sabrina Lucas',   5, 0, 10, 'Sc2', 2],
  ['Mimi Hiles',      5, 34, 12, 'Sc1', 2],
];

// ---- BOARD B : [name, T2R, WW, PupT2B, FS_kg, rounds, reps, note?] ----
type BRow = [string, string, string, string, number, number, number, string?];
const BOARD_B: Record<string, { date: string; time: string; sess: string; rows: BRow[] }> = {
  'B1715': { date: '2026-07-27', time: '17:15', sess: '629f42c5-fbe6-4917-8073-7128cfe52456', rows: [
    ['Lena Jähn',          'Rx',  'Rx',  'Sc1', 34, 3, 16],
    ['Valerie Mesenburg',  'Rx',  'Sc1', 'Sc2', 25, 3, 0],
    ['Leah Mesche',        'Sc2', 'Sc1', 'Sc2', 20, 3, 0],
    ['Claudia Herrmann',   'Rx',  'Rx',  'Rx',  25, 3, 13],
    ['Miriam Jacht',       'Sc1', 'Sc1', 'Sc2', 20, 3, 2],
    ['Nikolina Vlasalija', 'Rx',  'Sc1', 'Sc2', 20, 3, 3],
    ['Paul Bielenski',     'Rx',  'Rx',  'Rx',  52, 3, 0],
    ['Lukas Simnacher',    'Rx',  'Rx',  'Rx',  52, 3, 1],
    ['Michael Junkes',     'Sc2', 'Sc2', 'Sc2', 30, 3, 14],
  ]},
  'B1830': { date: '2026-07-27', time: '18:30', sess: '9c497180-ed70-493b-9b1c-c73803738f6e', rows: [
    ['Senol Özdilek',      'Sc2', 'Sc1', 'Sc2', 30, 2, 10],
    ['Anneke Spegele',     'Rx',  'Rx',  'Sc1', 34, 2, 9],
    ['Aline von Rüden',    'Sc2', 'Sc3', 'Sc2', 34, 3, 5],
    ['Bettina Krämer',     'Rx',  'Sc2', 'Sc2', 20, 3, 1],
    ['Susi Glocker',       'Sc1', 'Sc1', 'Sc2', 25, 3, 3],
    ['Julia Weihe',        'Sc1', 'Sc1', 'Sc2', 20, 3, 0],
    ['Carmine Carrozzo',   'Sc1', 'Rx',  'Sc2', 52, 2, 1],
    ['Markus Fischer',     'Rx',  'Rx',  'Rx',  52, 3, 5],
    ['Thomas Spegele',     'Rx',  'Rx',  'Rx',  40, 3, 4],
    ['Chris Hiles',        'Rx',  'Rx',  'Rx',  52, 3, 10],
  ]},
  'B2807': { date: '2026-07-28', time: '18:30', sess: '691d4efb-4ced-47a2-870f-400e01ceb857', rows: [
    ['Anfisa Bornemann',   'Sc2', 'Sc2', 'Sc2', 15, 4, 0],
    ['Daniela Simm',       'Sc1', 'Sc2', 'Sc2', 20, 4, 0],
    ['Dinny Braatz',       'Rx',  'Sc1', 'Sc1', 25, 4, 17],
    ['Kathrin Mühlen',     'Rx',  'Rx',  'Sc1', 34, 4, 8],
    ['Christian Müller',   'Rx',  'Rx',  'Rx',  52, 3, 16, 'Heels raised on wedge'],
    ['Daniel Braatz',      'Rx',  'Sc1', 'Sc1', 40, 4, 2],
    ['Stefan G',           'Rx',  'Sc1', 'Sc1', 40, 4, 0],
  ]},
  'B2907': { date: '2026-07-29', time: '09:30', sess: '04fa6886-ef66-4016-9e2d-0567df3e9e86', rows: [
    ['Anna Krautwald',     'Rx',  'Sc2', 'Sc2', 25, 3, 0],
    ['Emily Reichle',      'Rx',  'Rx',  'Sc2', 34, 3, 0],
    ['Irene Koffler',      'Rx',  'Sc1', 'Sc1', 34, 2, 16],
    ['Mimi Hiles',         'Rx',  'Rx',  'Rx',  34, 3, 9],
    ['Michael Städele',    'Rx',  'Rx',  'Rx',  52, 4, 9],
  ]},
};

(async () => {
  // Live wod ids (change on Chris's edits — re-read)
  const sessIds = ['28bc53c9-17a4-4dab-869d-66c83e0d920e', ...Object.values(BOARD_B).map(b => b.sess)];
  const { data: ws, error: wsErr } = await sb.from('weekly_sessions').select('id,workout_id').in('id', sessIds);
  if (wsErr || !ws) { console.error('sessions err:', wsErr?.message); return; }
  const wodBySess = new Map(ws.map(s => [s.id, s.workout_id]));

  const allNames = [...BOARD_A.map(r => r[0]), ...Object.values(BOARD_B).flatMap(b => b.rows.map(r => r[0]))];
  const { data: members, error: mErr } = await sb.from('members').select('id,name').in('name', [...new Set(allNames)]);
  if (mErr) { console.error('members err:', mErr.message); return; }
  const idByName = new Map((members || []).map(m => [m.name, m.id]));
  const missing = [...new Set(allNames)].filter(n => !idByName.has(n));
  if (missing.length) { console.error('❌ unresolved:', missing.join(', ')); return; }

  type WSR = Record<string, any> & { _label: string; _existingId?: string | null };
  const wsrs: WSR[] = [];
  const A_SESS = '28bc53c9-17a4-4dab-869d-66c83e0d920e';
  const wodA = wodBySess.get(A_SESS);
  if (!wodA) { console.error('❌ no live wod for board A'); return; }

  for (const [name, rounds, reps, kb, push, track] of BOARD_A) {
    const uid = idByName.get(name)!;
    wsrs.push({ wod_id: wodA, workout_date: '2026-07-27', member_id: uid, user_id: uid, whiteboard_name: null,
      section_id: cid(SEC_A), rounds_result: rounds, reps_result: reps, weight_result: kb, scaling_level: push, track, _label: 'A 10:00' });
  }
  for (const [label, b] of Object.entries(BOARD_B)) {
    const wod = wodBySess.get(b.sess);
    if (!wod) { console.error('❌ no live wod for', label); return; }
    for (const [name, t2r, ww, pt2b, fs, rounds, reps, note] of b.rows) {
      const uid = idByName.get(name)!;
      const row: any = { wod_id: wod, workout_date: b.date, member_id: uid, user_id: uid, whiteboard_name: null,
        section_id: cid(SEC_B), scaling_level: t2r, scaling_level_2: ww, scaling_level_3: pt2b,
        weight_result: fs, rounds_result: rounds, reps_result: reps, _label: `${label} ${b.time}` };
      if (note) { row.modified = true; row.modified_note = note; }
      wsrs.push(row);
    }
  }

  // dedupe on user_id (self-entered rows can have member_id NULL — S30.1)
  for (const r of wsrs) {
    const { data: ex } = await sb.from('wod_section_results').select('id')
      .eq('wod_id', r.wod_id).eq('section_id', r.section_id).eq('workout_date', r.workout_date).eq('user_id', r.user_id).limit(1).maybeSingle();
    r._existingId = ex?.id ?? null;
  }
  const ins = wsrs.filter(r => !r._existingId).length;
  console.log(`WSR: ${wsrs.length} rows (${ins} ins / ${wsrs.length - ins} upd)`);
  for (const r of wsrs) console.log(`  ${r._label.padEnd(12)} ${idByName2(idByName, r.user_id).padEnd(20)} FS/kb=${r.weight_result} R+R=${r.rounds_result}+${r.reps_result} ${r.modified ? '⚑' : ''}`);

  if (!APPLY) { console.log('\nDRY RUN — pass --apply to write.'); return; }

  let wc = 0;
  for (const r of wsrs) {
    const { _label, _existingId, ...row } = r;
    const res = _existingId ? await sb.from('wod_section_results').update(row).eq('id', _existingId) : await sb.from('wod_section_results').insert(row);
    if (res.error) { console.error('❌ WSR', _label, r.section_id, res.error.message); return; }
    wc++;
  }
  // ensure scored sections published (base id, no -content-0)
  for (const wod of new Set(wsrs.map(r => r.wod_id))) {
    const { data: w } = await sb.from('wods').select('publish_sections').eq('id', wod).maybeSingle();
    const pub = new Set<string>((w as any)?.publish_sections || []); const before = pub.size;
    [SEC_A, SEC_B].forEach(x => { /* only union the section that belongs to this wod */ });
    // union whichever scored section actually has rows on this wod
    for (const r of wsrs.filter(x => x.wod_id === wod)) pub.add(r.section_id.replace('-content-0', ''));
    if (pub.size !== before) { await sb.from('wods').update({ publish_sections: [...pub] }).eq('id', wod); console.log('  published on', wod); }
  }
  console.log(`✅ Wrote ${wc} WSR.`);
})();

function idByName2(map: Map<string, any>, uid: string): string {
  for (const [n, id] of map) if (id === uid) return n;
  return uid.slice(0, 8);
}
