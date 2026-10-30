/**
 * Movement false-flag audit — finds library movements the Planner credits to a
 * workout although the text doesn't really program them (S419).
 *
 * Read-only. Runs the app's own extractor line by line, so every detection has
 * its evidence line. A (workout, movement) pair is listed only when it has NO
 * solid evidence: no lift / benchmark, and no line where the name is written as
 * a programmed item (start of line, after a rep count, after "Sc:", "or", "&").
 *
 * Categories:
 *   FUZZY     the name isn't in the text at all (loose / partial name match)
 *   PARTWORD  the name only occurs inside a longer word ("cleaned")
 *   NEGATION  the line says not / no / instead of / except
 *   PREFIX    another word sits directly in front ("KB Front Squat")
 *   INFO      only named in Whiteboard Intro / Final prep/Info
 *   PROSE     only named inside a sentence
 *
 * Usage: npx tsx scripts/audit-movement-false-flags.ts [--out report.tsv] [--cat PREFIX] [--limit 60]
 *          [--group] [--exclude "Diapers & Dumbbells"] [--only "Diapers & Dumbbells"]
 *          [--since YYYY-MM-DD] [--uncounted]
 * --exclude / --only take a case-insensitive pattern on wods.session_type,
 * e.g. --exclude "turnen|diapers" (Mimi's notes-only classes, S426).
 * --since only checks classes on/after that date (the 3-monthly audit, S428).
 * --uncounted lists the opposite problem (S426 "Section F"): lines that look
 *   programmed (bullet / count / distance first), outside Whiteboard Intro +
 *   Final prep/Info, that credit no library movement and whose words aren't part
 *   of a movement credited elsewhere in the same workout (shorthand rule).
 *   Grouped by text; some coaching cues still show up — judge by eye.
 *
 * 3-monthly audit: run both modes with --exclude "turnen|diapers" --since <last audit>.
 */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { extractMovementsFromText, extractMovementsFromWod } from '../utils/movement-extraction';

dotenv.config({ path: '.env.local' });

const arg = (name: string, def: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : def;
};
const outFile = arg('out', '');
const onlyCat = arg('cat', '');
const limit = Number(arg('limit', '60'));
const excludeType = arg('exclude', '');
const onlyType = arg('only', '');
const since = arg('since', '');
const uncounted = process.argv.includes('--uncounted');

// Service role so RLS never hides rows (claude-rules: diagnostic scripts).
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

type Section = { type?: string; content?: string; lifts?: unknown[]; benchmarks?: unknown[]; forge_benchmarks?: unknown[] };
type Wod = { id: string; workout_name: string | null; session_type: string | null; sections: Section[] | null };
type Evidence = { section: string; line: string; cat: string };
type WodArg = Parameters<typeof extractMovementsFromWod>[0];

const INFO_SECTIONS = new Set(['Whiteboard Intro', 'Final prep/Info']);
const NEGATION = /\b(not|no|don'?t|never|without|instead|rather than|except|avoid|nicht|kein\w*)\b/i;
// Text allowed directly in front of a name that is programmed as its own item.
const PROGRAMMED = /(^|[*•◦\-–:=,+&/(]|\d+[.)]|\([a-z0-9]\)|\d+\s*x|x\s*\d+|\d+|\d+\s*(m|km|cal|kcal|metres?|meters?|secs?|mins?)|\b(reps?|secs?|sec|mins?|min|minutes?|seconds?|metres?|meters?|of|m|km|cal|kcal|max|unbroken|or|and|barbell|bb|then|into|synchro|synchronised|synchronized|alternating|alt\.?|partner|team|weighted)\b)\s*$/i;

// --uncounted: a line "looks programmed" when it starts with one of these…
const LEAD = /^([*•◦\-–]|\d+\s*x\b|\d+x|\d+\s*(m|km|cals?|kcal|metres?|meters?)\b|\d+[.)])/i;
// …and these words say nothing about which movement it is.
const FILLER = new Set(['rounds', 'round', 'amrap', 'emom', 'for', 'time', 'rest', 'tabata', 'interval', 'intervals',
  'min', 'mins', 'minute', 'minutes', 'sec', 'secs', 'second', 'seconds', 'each', 'every', 'work', 'on', 'off',
  'then', 'sets', 'set', 'reps', 'rep', 'of', 'and', 'with', 'the', 'to', 'between', 'per', 'max', 'unbroken',
  'cap', 'left', 'right', 'side', 'sides', 'all', 'out', 'pace', 'slow', 'fast', 'easy', 'hard', 'kg', 'cals', 'cal',
  'metres', 'meters', 'scaling', 'load', 'sc', 'or', 'in', 'at', 'a', 'an', 'from', 'up', 'down']);
const coreWords = (line: string) =>
  line.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-zäöüß ]/g, ' ').split(/\s+/)
    .filter(w => w.length >= 3 && !FILLER.has(w));

// Letters and digits only, plural-insensitive: "Deep Squat Knee Circle" vs "…Circles".
const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const classify = (line: string, movement: string, section: string): string => {
  const lower = line.toLowerCase();
  const name = movement.toLowerCase();
  const at: number[] = [];
  for (let i = lower.indexOf(name); i !== -1; i = lower.indexOf(name, i + 1)) at.push(i);
  if (at.length === 0) {
    // Same name apart from plural / hyphen / spacing → not a guess.
    return squash(line).includes(squash(name).replace(/s$/, '')) ? 'SOLID' : 'FUZZY';
  }

  const wholeWord = at.filter(i => {
    const before = lower[i - 1] ?? ' ';
    const after = lower.slice(i + name.length).replace(/^(es|s)(?![a-z])/, '')[0] ?? ' ';
    return !/[a-z0-9]/.test(before) && !/[a-z]/.test(after);
  });
  if (wholeWord.length === 0) return 'PARTWORD';
  if (wholeWord.some(i => PROGRAMMED.test(lower.slice(0, i)))) return 'SOLID';
  if (NEGATION.test(line)) return 'NEGATION';
  if (INFO_SECTIONS.has(section)) return 'INFO';
  // A short lead-in (one or two words) in front of the name reads as a variant
  // prefix ("KB Front Squat"); anything longer is a sentence.
  const lead = lower.slice(0, wholeWord[0]).replace(/^[\s*•◦\-–\d.)x(]+/, '').trim();
  return lead.split(/\s+/).length <= 2 ? 'PREFIX' : 'PROSE';
};

async function main() {
  const known = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('exercises').select('name, display_name').range(from, from + 999);
    if (error) throw new Error(`exercises: ${error.message}`);
    data.forEach(r => { known.add(r.name); if (r.display_name) known.add(r.display_name); });
    if (data.length < 1000) break;
  }
  const knownLower = new Set(Array.from(known).map(n => n.toLowerCase()));
  const knownList = Array.from(knownLower);

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

  // One entry per distinct workout text (a workout run at 5 class times = 1).
  const unique = new Map<string, { date: string; wod: Wod; sessions: number }>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('weekly_sessions')
      .select('date, is_private, wods!inner(id, workout_name, session_type, sections)')
      .gte('date', since || '1900-01-01')
      .order('date')
      .range(from, from + 999);
    if (error) throw new Error(`weekly_sessions: ${error.message}`);
    (data as unknown as Array<{ date: string; is_private: boolean | null; wods: Wod | Wod[] }>).forEach(s => {
      if (s.is_private) return;
      const wod = Array.isArray(s.wods) ? s.wods[0] : s.wods;
      if (!wod) return;
      const sessionType = (wod.session_type ?? '').trim();
      if (excludeType && new RegExp(excludeType, 'i').test(sessionType)) return;
      if (onlyType && !new RegExp(onlyType, 'i').test(sessionType)) return;
      const key = JSON.stringify(wod.sections ?? []);
      const seen = unique.get(key);
      if (seen) seen.sessions++;
      else unique.set(key, { date: s.date, wod, sessions: 1 });
    });
    if (data.length < 1000) break;
  }

  const rows: string[] = [];
  const perCat = new Map<string, number>();
  let pairs = 0;
  const silent = new Map<string, { line: string; dates: string[] }>();

  for (const { date, wod, sessions } of unique.values()) {
    const structured = new Set<string>();
    const text = new Map<string, Evidence[]>();
    const blank: { line: string; section: string }[] = [];

    (wod.sections ?? []).forEach(section => {
      const type = section.type ?? '';
      const only = { ...section, content: '' };
      extractMovementsFromWod(
        { id: wod.id, title: '', date, sections: [only], classTimes: [] } as unknown as WodArg,
        known, new Map(), liftMap
      ).forEach(m => structured.add(m));

      String(section.content ?? '').split('\n').forEach(raw => {
        const line = raw.trim();
        if (!line) return;
        const found = new Set<string>();
        extractMovementsFromText(line, found, knownLower, knownList);
        if (![...found].some(m => knownLower.has(m.toLowerCase()))) blank.push({ line, section: type });
        found.forEach(m => {
          if (!knownLower.has(m.toLowerCase())) return; // the Planner ignores non-library names
          const list = text.get(m) ?? [];
          list.push({ section: type, line, cat: classify(line, m, type) });
          text.set(m, list);
        });
      });
    });

    text.forEach((evidence, movement) => {
      pairs++;
      if (structured.has(movement)) return;
      if (evidence.some(e => e.cat === 'SOLID')) return;
      const order = ['FUZZY', 'PARTWORD', 'NEGATION', 'PREFIX', 'INFO', 'PROSE'];
      const best = [...evidence].sort((a, b) => order.indexOf(a.cat) - order.indexOf(b.cat))[0];
      perCat.set(best.cat, (perCat.get(best.cat) ?? 0) + 1);
      rows.push([best.cat, date, String(wod.workout_name ?? '').slice(0, 38), movement, best.section, `${evidence.length}x`, `${sessions}s`, best.line.slice(0, 170)].join('\t'));
    });

    if (uncounted) {
      const credited = [...structured, ...text.keys()].map(m => m.toLowerCase()).join(' | ');
      blank.forEach(({ line, section }) => {
        if (INFO_SECTIONS.has(section) || !LEAD.test(line)) return;
        const core = coreWords(line);
        // Shorthand rule (Chris, S426): fine when the movement is credited elsewhere in the WOD.
        if (!core.length || core.every(w => credited.includes(w.replace(/s$/, '')))) return;
        const key = core.join(' ');
        const hit = silent.get(key) ?? { line, dates: [] };
        if (!hit.dates.includes(date)) hit.dates.push(date);
        silent.set(key, hit);
      });
    }
  }

  if (uncounted) {
    const out = [...silent.values()].sort((a, b) => b.dates.length - a.dates.length || a.line.localeCompare(b.line))
      .map(h => `${h.dates.length}\t${h.line.slice(0, 120)}\t${h.dates.slice(0, 4).join(',')}${h.dates.length > 4 ? '…' : ''}`);
    if (outFile) fs.writeFileSync(outFile, out.join('\n'));
    console.log(`distinct workouts: ${unique.size} | uncounted programmed-looking texts: ${out.length}`);
    out.slice(0, limit).forEach(r => console.log(r));
    return;
  }

  rows.sort();
  if (process.argv.includes('--group')) {
    // One row per (category, movement, line) with the number of workouts.
    const grouped = new Map<string, number>();
    rows.forEach(r => {
      const f = r.split('\t');
      const key = [f[0], f[3], f[7]].join('\t');
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    });
    const out = [...grouped.entries()].map(([k, n]) => `${k}\t${n}`).sort();
    if (outFile) fs.writeFileSync(outFile, out.join('\n'));
    console.log(`distinct (movement, line) candidates: ${out.length}`);
    out.filter(r => !onlyCat || r.startsWith(`${onlyCat}\t`)).slice(0, limit).forEach(r => console.log(r));
    return;
  }
  console.log(`distinct workouts: ${unique.size} | text-detected (workout, movement) pairs: ${pairs} | without solid evidence: ${rows.length}`);
  console.log([...perCat.entries()].map(([c, n]) => `${c} ${n}`).join(' | '));
  if (outFile) {
    fs.writeFileSync(outFile, rows.join('\n'));
    console.log(`full list → ${outFile}`);
  }
  rows.filter(r => !onlyCat || r.startsWith(`${onlyCat}\t`)).slice(0, limit).forEach(r => console.log(r));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
