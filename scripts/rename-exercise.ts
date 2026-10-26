/**
 * Rename an exercise in the Exercise Library AND in every workout text that names it.
 * (S423: "Handstand 2-Footed Kick-Up" → "Handstand Kick-Up: 2-Footed";
 *  S425: "Dead Stop Knees to Bar (BMU drill)" → "BMU Drill: Dead Stop Knees to Bar".)
 *
 * Dry run shows: the exercise row(s), every wod + section that contains the old
 * name (with the line before/after), and the Planner detector's credited
 * movements for each affected wod, old library + old text vs new library + new
 * text — the only allowed difference is the name swap (S419 rule).
 *
 *   npx tsx scripts/rename-exercise.ts "<old name>" "<new name>"            # dry run
 *   npx tsx scripts/rename-exercise.ts "<old name>" "<new name>" --commit
 *
 * --also "<text>" (repeatable): other spellings in workout text to change to the
 * new name too (S425: "Dead Stop Knees to Bar" without the suffix). Those weren't
 * credited before, so the Planner may GAIN the movement there — that's allowed.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { extractMovementsFromWod } from '../utils/movement-extraction';

dotenv.config({ path: '.env.local' });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const COMMIT = process.argv.includes('--commit');
const args = process.argv.slice(2).filter(a => a !== '--commit');
const ALSO: string[] = [];
for (let i = args.indexOf('--also'); i !== -1; i = args.indexOf('--also')) {
  if (args[i + 1]) ALSO.push(args[i + 1]);
  args.splice(i, 2);
}
const [OLD, NEW] = args;
if (!OLD || !NEW) {
  console.error('Usage: npx tsx scripts/rename-exercise.ts "<old name>" "<new name>" [--also "<text>"] [--commit]');
  process.exit(1);
}

type Section = { id: string; content?: string; [k: string]: unknown };
type Ex = { id: string; name: string; display_name: string | null };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const OLD_RE = new RegExp(escape(OLD), 'gi');
// Workout-text replacement. NEW is listed first so an alias that sits inside the
// new name (e.g. "Dead Stop Knees to Bar" inside "BMU Drill: Dead Stop Knees to
// Bar") is never re-replaced; OLD before the aliases so the longest form wins.
const TEXT_RE = new RegExp([NEW, OLD, ...ALSO].map(escape).join('|'), 'gi');
const renameText = (s: string) => s.replace(TEXT_RE, NEW);

async function pageAll<T>(table: string, columns: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(columns).order('id').range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return out;
  }
}

function knownSet(exs: Ex[]): Set<string> {
  const s = new Set<string>();
  for (const e of exs) {
    s.add(e.name);
    if (e.display_name) s.add(e.display_name);
  }
  return s;
}

async function main() {
  const exercises = await pageAll<Ex>('exercises', 'id, name, display_name');
  const targets = exercises.filter(e => OLD_RE.test(e.name) || OLD_RE.test(e.display_name ?? ''));
  OLD_RE.lastIndex = 0;
  console.log(`Exercise rows matching "${OLD}": ${targets.length}`);
  for (const t of targets) console.log(`  ${t.id}  name="${t.name}"  display_name="${t.display_name}"`);
  const clash = exercises.filter(e => e.name.toLowerCase() === NEW.toLowerCase() || (e.display_name ?? '').toLowerCase() === NEW.toLowerCase());
  if (clash.length) throw new Error(`"${NEW}" already exists: ${clash.map(c => c.id).join(', ')}`);
  if (targets.length !== 1) throw new Error('Expected exactly 1 exercise row — stopping.');
  const target = targets[0];

  const renamedExercises = exercises.map(e => e.id !== target.id ? e : {
    ...e,
    name: e.name.replace(OLD_RE, NEW),
    display_name: e.display_name ? e.display_name.replace(OLD_RE, NEW) : e.display_name,
  });
  const oldKnown = knownSet(exercises);
  const newKnown = knownSet(renamedExercises);

  const wods = await pageAll<{ id: string; date: string; workout_name: string | null; sections: Section[] | null }>(
    'wods', 'id, date, workout_name, sections');
  const affected = wods.filter(w => (w.sections ?? []).some(s => {
    const c = String(s.content ?? '');
    return renameText(c) !== c;
  }));
  const nameHits = wods.filter(w => OLD_RE.test(w.workout_name ?? ''));
  OLD_RE.lastIndex = 0;
  console.log(`\nWorkouts with the name in section text: ${affected.length}`);
  if (nameHits.length) console.log(`⚠️ Workouts with it in the workout NAME (not changed): ${nameHits.map(w => w.date).join(', ')}`);

  let diffProblems = 0;
  const updates: { id: string; sections: Section[] }[] = [];
  for (const w of affected.sort((a, b) => a.date.localeCompare(b.date))) {
    const newSections = (w.sections ?? []).map(s => ({ ...s, content: renameText(String(s.content ?? '')) }));
    console.log(`\n${w.date}  ${w.workout_name}  (${w.id})`);
    for (const s of newSections) for (const line of String(s.content).split('\n')) if (line.includes(NEW)) console.log(`   → ${line.trim()}`);

    const before = extractMovementsFromWod({ sections: w.sections ?? [] } as never, oldKnown);
    const after = extractMovementsFromWod({ sections: newSections } as never, newKnown);
    const lost = [...before].filter(m => !after.has(m));
    const gained = [...after].filter(m => !before.has(m));
    // Allowed: OLD swaps to NEW, or (alias-only text) NEW is gained with nothing lost.
    const ok = gained.length === 1 && gained[0].toLowerCase() === NEW.toLowerCase() &&
      (lost.length === 0 || (lost.length === 1 && lost[0].toLowerCase() === OLD.toLowerCase()));
    console.log(`   Planner: ${ok ? '✅ only the name swaps' : `⚠️ lost [${lost.join(', ')}] gained [${gained.join(', ')}]`}`);
    if (!ok) diffProblems++;
    updates.push({ id: w.id, sections: newSections });
  }

  if (diffProblems) throw new Error(`${diffProblems} workout(s) change Planner detection beyond the rename — stopping.`);
  if (!COMMIT) { console.log('\nDry run — add --commit to write.'); return; }

  const { error: eErr } = await db.from('exercises').update({
    name: renamedExercises.find(e => e.id === target.id)!.name,
    display_name: renamedExercises.find(e => e.id === target.id)!.display_name,
  }).eq('id', target.id);
  if (eErr) throw new Error(`exercise: ${eErr.message}`);
  console.log('\n✅ exercise renamed');
  for (const u of updates) {
    const { error } = await db.from('wods').update({ sections: u.sections }).eq('id', u.id);
    if (error) throw new Error(`wod ${u.id}: ${error.message}`);
  }
  console.log(`✅ ${updates.length} workouts updated`);
}

main().catch(e => { console.error(e); process.exit(1); });
