/**
 * Rewrite exact workout-text lines across wods, with a Planner before/after per workout.
 * (S427: Planner false-flag fixes — "400m Run" → "Run 400m", plurals, sentences that
 *  named a movement nobody did.)
 *
 *   npx tsx scripts/rewrite-workout-lines.ts <edits.json>            # dry run
 *   npx tsx scripts/rewrite-workout-lines.ts <edits.json> --commit
 *
 * edits.json = [{ "old": "<whole line, trimmed>", "new": "<replacement>",
 *                 "dates"?: ["YYYY-MM-DD", ...], "section"?: "<section type>",
 *                 "allTypes"?: true }]
 * A line matches only when its trimmed text equals "old" exactly. Without "dates" an
 * edit applies to every wod. FitKids Turnen / Eltern-Kind-Turnen / Diapers & Dumbbells
 * are skipped unless "allTypes" is set (Mimi's notes — S426). Every edit must hit at
 * least one line, or nothing is written.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { extractMovementsFromWod } from '../utils/movement-extraction';

dotenv.config({ path: '.env.local' });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const COMMIT = process.argv.includes('--commit');
const file = process.argv.slice(2).find(a => a !== '--commit');
if (!file) {
  console.error('Usage: npx tsx scripts/rewrite-workout-lines.ts <edits.json> [--commit]');
  process.exit(1);
}

type Edit = { old: string; new: string; dates?: string[]; section?: string; allTypes?: boolean };
type Section = { type?: string; content?: string };
type Wod = { id: string; date: string; session_type: string | null; workout_name: string | null; sections: Section[] | null };
type WodArg = Parameters<typeof extractMovementsFromWod>[0];

const SKIP_TYPES = /Turnen|Diapers/i;

async function main() {
  const edits: Edit[] = JSON.parse(fs.readFileSync(file!, 'utf8'));

  const known = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('exercises').select('name, display_name').range(from, from + 999);
    if (error) throw new Error(`exercises: ${error.message}`);
    data.forEach(r => { known.add(r.name); if (r.display_name) known.add(r.display_name); });
    if (data.length < 1000) break;
  }
  const { data: liftRows, error: liftErr } = await db
    .from('barbell_lifts')
    .select('name, exercises:exercise_id ( name, display_name )')
    .not('exercise_id', 'is', null);
  if (liftErr) throw new Error(`barbell_lifts: ${liftErr.message}`);
  const liftMap = new Map<string, string>();
  (liftRows as unknown as Array<{ name: string; exercises: { name: string; display_name: string | null } | { name: string; display_name: string | null }[] | null }>).forEach(r => {
    const linked = Array.isArray(r.exercises) ? r.exercises[0] : r.exercises;
    if (r.name && linked) liftMap.set(r.name.toLowerCase(), (linked.display_name || linked.name).toLowerCase());
  });
  const credits = (w: Wod, sections: Section[]) => new Set(extractMovementsFromWod(
    { id: w.id, title: '', date: w.date, sections, classTimes: [] } as unknown as WodArg, known, new Map(), liftMap
  ));

  const wods: Wod[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('wods').select('id, date, session_type, workout_name, sections').order('date').range(from, from + 999);
    if (error) throw new Error(`wods: ${error.message}`);
    wods.push(...(data as Wod[]));
    if (data.length < 1000) break;
  }

  const hits = edits.map(() => 0);
  const changed: Array<{ w: Wod; sections: Section[] }> = [];
  for (const w of wods) {
    let touched = false;
    const sections = (w.sections ?? []).map(sec => {
      const lines = String(sec.content ?? '').split('\n').map(raw => {
        const trimmed = raw.trim();
        const i = edits.findIndex(e =>
          e.old === trimmed &&
          (!e.dates || e.dates.includes(w.date)) &&
          (!e.section || e.section === sec.type) &&
          (e.allTypes || !SKIP_TYPES.test(w.session_type ?? ''))
        );
        if (i === -1) return raw;
        hits[i]++;
        touched = true;
        return raw.slice(0, raw.indexOf(trimmed)) + edits[i].new + raw.slice(raw.indexOf(trimmed) + trimmed.length);
      });
      return { ...sec, content: lines.join('\n') };
    });
    if (touched) changed.push({ w, sections });
  }

  // One block per identical change (a workout run at 5 class times prints once).
  const groups = new Map<string, string[]>();
  for (const { w, sections } of changed) {
    const out: string[] = [`=== ${w.session_type ?? ''} | ${w.workout_name ?? ''}`];
    (w.sections ?? []).forEach((sec, s) => {
      const before = String(sec.content ?? '').split('\n');
      const after = String(sections[s].content ?? '').split('\n');
      before.forEach((line, l) => {
        if (line !== after[l]) out.push(`  [${sec.type}]\n    - ${line.trim()}\n    + ${after[l].trim()}`);
      });
    });
    const a = credits(w, w.sections ?? []), b = credits(w, sections);
    const lost = Array.from(a).filter(m => !b.has(m)), gained = Array.from(b).filter(m => !a.has(m));
    out.push(`  Planner: LOST ${lost.join(', ') || '-'} | GAINED ${gained.join(', ') || '-'}`);
    const key = out.join('\n');
    groups.set(key, [...(groups.get(key) ?? []), w.date]);
  }
  groups.forEach((dates, block) => console.log(`\n${block}\n  dates: ${dates.join(', ')}`));

  console.log('\n--- hits per edit');
  edits.forEach((e, i) => console.log(`  ${String(hits[i]).padStart(3)}  ${e.old}  →  ${e.new}`));
  console.log(`\n${changed.length} wods would change.`);

  const missing = edits.filter((_, i) => hits[i] === 0);
  if (missing.length) {
    console.error(`\n${missing.length} edit(s) matched nothing — fix the edits file. Nothing written.`);
    process.exit(1);
  }
  if (!COMMIT) { console.log('Dry run — add --commit to write.'); return; }

  for (const { w, sections } of changed) {
    const { error } = await db.from('wods').update({ sections }).eq('id', w.id);
    if (error) throw new Error(`update ${w.id}: ${error.message}`);
  }
  console.log(`Wrote ${changed.length} wods.`);
}

main().catch(e => { console.error(e); process.exit(1); });
