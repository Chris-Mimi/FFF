/**
 * Restore the OHP & Push Press testing lift_records for the 9-11 Feb 2026
 * "Week 7" RM testing block, transcribed from whiteboard photo "2026 Week 7.1".
 *
 * Background: these records were lost (WSR weights nulled pre-March + the April
 * historical-import reset wiped lift_records). No backup covers the loss window,
 * so the only source is the whiteboard photo. Numbers verified by Chris.
 *
 * INSERT-only, deduped (user|lift_name|lift_date|rep_max_type), scoped to these
 * athletes/dates. Dry-run by default; pass --apply to write.
 *
 *   npx tsx scripts/restore-week7-ohp-pp-liftrecords.ts          # dry run
 *   npx tsx scripts/restore-week7-ohp-pp-liftrecords.ts --apply  # write
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const OHP = 'Strict Overhead Shoulder Press';
const PP = 'Push Press';
const NOTE = 'Restored from whiteboard photo (2026 Week 7, 9-11 Feb OHP/PP testing)';

// [member name (exact), lift_date, OHP 3RM, OHP 1RM, PP 3RM|null, PP 1RM|null]
type Row = [string, string, number, number, number | null, number | null];
const DATA: Row[] = [
  // ── 09 Feb (17:15 + 18:30) ──
  ['Lena Jähn',          '2026-02-09', 25,   25,   30,   32.5],
  ['Claudia Herrmann',   '2026-02-09', 27.5, 30,   37.5, 45],
  ['Katharina Herbst',   '2026-02-09', 30,   35,   37.5, 45],
  ['Lukas Simnacher',    '2026-02-09', 55,   60,   60,   65],
  ['Senol Özdilek',      '2026-02-09', 50,   50,   50,   50],
  ['Dimitar Peresyov',   '2026-02-09', 50,   50,   65,   70],
  ['Daniel Braatz',      '2026-02-09', 37.5, 40,   50,   50],
  ['Michael Junkes',     '2026-02-09', 37.5, 40,   40,   45],
  ['Anneke Spegele',     '2026-02-09', 30,   32.5, 40,   45],
  ['Miriam Jacht',       '2026-02-09', 27.5, 32.5, 32.5, 35],
  ['Paul Bielenski',     '2026-02-09', 70,   70,   70,   75],
  ['Christian Tanner',   '2026-02-09', 40,   45,   45,   50],
  ['Patrik Gruber',      '2026-02-09', 55,   60,   65,   65],
  ['Denis Koffler',      '2026-02-09', 45,   50,   50,   60],
  ['Thomas Spegele',     '2026-02-09', 60,   65,   60,   65],
  ['Chris Hiles',        '2026-02-09', 60,   65,   70,   72.5],
  // ── 10 Feb (17:15 + 18:30) ──
  ['Leah Mesche',        '2026-02-10', 20,   20,   20,   22.5],
  ['Franziska Kary',     '2026-02-10', 22.5, 25,   null, null],
  ['Steven Zaft',        '2026-02-10', 50,   55,   null, null],
  ['Teemu Lian Geisler', '2026-02-10', 30,   35,   null, null],
  ['Thomas Herbst',      '2026-02-10', 45,   50,   null, null],
  ['Kathrin Mühlen',     '2026-02-10', 32.5, 35,   35,   37.5],
  ['Valerie Mesenburg',  '2026-02-10', 25,   25,   30,   30],
  ['Pascal Evghenia',    '2026-02-10', 25,   25,   27.5, 27.5],
  ['Nikolina Vlasalija', '2026-02-10', 17.5, 17.5, 17.5, 17.5],
  ['Daniel Steller',     '2026-02-10', 35,   35,   40,   45],
  ['Stefan G',           '2026-02-10', 35,   37.5, 40,   40],
  ['Jürgen Bizjak',      '2026-02-10', 35,   35,   40,   40],
  ['Markus Fischer',     '2026-02-10', 55,   62.5, 60,   60],
  ['Thomas Graf',        '2026-02-10', 30,   35,   null, null], // OHP only
  ['Carmine Carrozzo',   '2026-02-10', 67.5, 67.5, null, null], // OHP only
  // ── 11 Feb (09:30) ──
  ['Michael Städele',    '2026-02-11', 50,   55,   60,   70],
  ['Irene Koffler',      '2026-02-11', 22.5, 25,   32.5, 37.5],
  ['Lisa Vrbanic',       '2026-02-11', 20,   20,   22.5, 25],
  ['Regina Peresyova',   '2026-02-11', 25,   27.5, 27.5, 32.5],
  ['Mimi Hiles',         '2026-02-11', 35,   37.5, 42.5, 50],
];

const epley = (w: number, reps: number) => reps <= 1 ? null : Math.round(w * (1 + reps / 30) * 10) / 10;

async function main() {
  // resolve names → member id
  const names = DATA.map(d => d[0]);
  const { data: members } = await sb.from('members').select('id,name').in('name', names);
  const idByName = new Map((members || []).map((m: any) => [m.name, m.id]));
  const missing = names.filter(n => !idByName.has(n));
  if (missing.length) { console.error('❌ UNMATCHED member names:', missing); return; }

  // build candidate records
  type Rec = { user_id: string; lift_name: string; weight_kg: number; reps: number; rep_max_type: string; calculated_1rm: number | null; lift_date: string; notes: string };
  const recs: Rec[] = [];
  for (const [name, date, o3, o1, p3, p1] of DATA) {
    const uid = idByName.get(name)!;
    const add = (lift: string, w: number | null, reps: number) => {
      if (w == null) return;
      recs.push({ user_id: uid, lift_name: lift, weight_kg: w, reps, rep_max_type: reps === 3 ? '3RM' : '1RM', calculated_1rm: epley(w, reps), lift_date: date, notes: NOTE });
    };
    add(OHP, o3, 3); add(OHP, o1, 1); add(PP, p3, 3); add(PP, p1, 1);
  }

  // dedupe vs existing
  const uids = [...idByName.values()];
  const { data: existing } = await sb.from('lift_records')
    .select('user_id,lift_name,lift_date,rep_max_type')
    .in('user_id', uids)
    .in('lift_date', ['2026-02-09', '2026-02-10', '2026-02-11']);
  const existKey = new Set((existing || []).map((r: any) => `${r.user_id}|${r.lift_name}|${r.lift_date}|${r.rep_max_type}`));
  const toInsert = recs.filter(r => !existKey.has(`${r.user_id}|${r.lift_name}|${r.lift_date}|${r.rep_max_type}`));
  const skipped = recs.length - toInsert.length;

  // report
  const nameById = new Map((members || []).map((m: any) => [m.id, m.name]));
  for (const [name, date] of DATA) {
    const uid = idByName.get(name)!;
    const mine = toInsert.filter(r => r.user_id === uid);
    console.log(`${date} | ${name.padEnd(20)} | ${mine.map(r => `${r.lift_name === OHP ? 'OHP' : 'PP'} ${r.rep_max_type}=${r.weight_kg}`).join(', ')}`);
  }
  console.log(`\nCandidates: ${recs.length} | already exist (skip): ${skipped} | TO INSERT: ${toInsert.length}`);

  if (!APPLY) { console.log('\nDRY RUN — pass --apply to write.'); return; }
  for (let i = 0; i < toInsert.length; i += 100) {
    const batch = toInsert.slice(i, i + 100);
    const { error } = await sb.from('lift_records').insert(batch);
    if (error) { console.error('❌ insert error:', error); return; }
  }
  console.log(`✅ Inserted ${toInsert.length} lift_records.`);
}
main();
