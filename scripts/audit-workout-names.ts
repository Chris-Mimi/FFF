/**
 * Workout-name audit — does each workout's NAME mention every movement in its
 * main sections (Skill, Gymnastics, Strength, Olympic Lifting, WOD / WOD Pt.N,
 * Finisher, Accessory)? Chris, S429: "if a Push-up was done in a WOD it should
 * say so in the name". Names use short forms (BJ, GHDSU, HPS, "M-up Drills"),
 * so a movement counts as named when:
 *   - one of its library tags (acronyms) is a whole word in the name, or
 *   - an upper-case token in the name spells the initials of 2+ consecutive
 *     words of the movement ("BBJ" = Burpee Broad Jump, "BOR" = Bent Over Row), or
 *   - one of its distinctive words appears in the name
 *     (prefix match both ways, so "Row" covers "Rower", "Ski" covers "SkiErg").
 * Lenient on purpose — it surfaces movements the name doesn't mention AT ALL.
 * The output is a review list, not a fix list: read it, then rename by hand.
 *
 *   npx tsx scripts/audit-workout-names.ts [--since YYYY-MM-DD] [--json out.json]
 *
 * Skips private sessions and Mimi's / kids / non-class session types.
 */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { extractMovementsFromWod } from '../utils/movement-extraction';

dotenv.config({ path: '.env.local' });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const args = process.argv.slice(2);
const argVal = (flag: string) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const since = argVal('--since');
const jsonOut = argVal('--json');

const SKIP_TYPES = /turnen|diapers|kids|open gym|party|bauchtanz|specialty/i;
const MAIN_SECTIONS = /^(skill|gymnastics|strength|olympic lifting|wod( pt\.\d)?|finisher\/bonus!|accessory)$/i;
// Words that don't identify a movement on their own.
const GENERIC = new Set([
  'kb', 'db', 'bb', 'barbell', 'dumbbell', 'kettlebell', 'c2', 'concept', 'strict', 'kipping', 'single',
  'double', 'arm', 'arms', 'leg', 'legs', 'l&r', 'lr', 'with', 'to', 'the', 'and', 'plus', 'on', 'of',
  'a', 'in', 'from', 'drill', 'hold', 'partner', 'alternating', 'weighted', 'band', 'banded', 'the',
  'm', 'km', 'up', 'x', '&', 'oh', 'step', 'steps',
]);

// Compound words split for initials: "Handstand Push-Up" → H S P U = HSPU, "Wallball" → WB
const COMPOUND: Record<string, string[]> = {
  handstand: ['hand', 'stand'], wallball: ['wall', 'ball'], kettlebell: ['kettle', 'bell'],
  dumbbell: ['dumb', 'bell'], skierg: ['ski', 'erg'], airbike: ['air', 'bike'], slamball: ['slam', 'ball'],
  situp: ['sit', 'up'], pullup: ['pull', 'up'], pushup: ['push', 'up'], medball: ['med', 'ball'],
};

type Section = { id: string; type?: string; content?: string; lifts?: unknown[]; benchmarks?: unknown[]; forge_benchmarks?: unknown[] };
type Wod = { id: string; workout_name: string | null; session_type: string | null; sections: Section[] | null };
type WodArg = Parameters<typeof extractMovementsFromWod>[0];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9äöüß&]+/g, ' ').trim();
const squash = (s: string) => s.replace(/s$/, '');
const words = (s: string) => norm(s.replace(/-/g, '')).split(/\s+/).filter(Boolean).map(squash);

async function main() {
  // Library names + tags (acronyms)
  const known = new Set<string>();
  const tagsByName = new Map<string, string[]>();
  const display = new Map<string, string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('exercises').select('name, display_name, tags').range(from, from + 999);
    if (error) throw new Error(`exercises: ${error.message}`);
    data.forEach((r: { name: string; display_name: string | null; tags: string[] | null }) => {
      known.add(r.name);
      if (r.display_name) known.add(r.display_name);
      const tags = (r.tags || []).filter(Boolean);
      [r.name, r.display_name].filter(Boolean).forEach(n => {
        tagsByName.set(n!.toLowerCase(), tags);
        display.set(n!.toLowerCase(), r.display_name || r.name); // slug "c2-rower" → "C2 Rower"
      });
    });
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

  // One entry per distinct (name + text); count class times and keep dates.
  const unique = new Map<string, { dates: string[]; wod: Wod }>();
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
      if (!wod || SKIP_TYPES.test(wod.session_type ?? '')) return;
      const key = `${wod.workout_name}::${JSON.stringify(wod.sections ?? [])}`;
      const seen = unique.get(key);
      if (seen) { if (!seen.dates.includes(s.date)) seen.dates.push(s.date); }
      else unique.set(key, { dates: [s.date], wod });
    });
    if (data.length < 1000) break;
  }

  // name → movement → { sections, dates }
  const report = new Map<string, Map<string, { sections: Set<string>; dates: Set<string> }>>();
  let checked = 0;
  for (const { dates, wod } of unique.values()) {
    const name = (wod.workout_name ?? '').trim();
    if (!name) continue;
    checked++;
    const nameNorm = norm(name);
    const nameWords = words(name);
    const nameSquashed = nameNorm.replace(/\s+/g, '');
    // Upper-case tokens in the name read as acronyms ("BBJ", "BOR", "GHDSU")
    const nameInitials = new Set((name.match(/\b[A-Z][A-Za-z]*[A-Z]\b/g) || []).map(t => t.toLowerCase()));

    const isNamed = (movement: string) => {
      const tags = tagsByName.get(movement.toLowerCase()) || [];
      if (tags.some(t => new RegExp(`(^|[^a-z0-9])${t.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`).test(name.toLowerCase()))) return true;
      if (nameSquashed.includes(norm(movement).replace(/\s+/g, ''))) return true;
      // Initials of any run of 2+ consecutive words: "Burpee Broad Jump" → BBJ, "Bent Over Row" → BOR
      const all = norm(movement.replace(/-/g, ' ')).split(/\s+/).filter(Boolean).flatMap(w => COMPOUND[w] ?? [w]);
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 2; j <= all.length; j++) {
          const ini = all.slice(i, j).map(w => w[0]).join('');
          if (nameInitials.has(ini)) return true;
        }
      }
      const distinct = words(movement).filter(w => !GENERIC.has(w) && !/^\d+$/.test(w));
      if (distinct.length === 0) return true;
      if (distinct.some(w => nameWords.some(t => t.length >= 3 && (w.startsWith(t) || t.startsWith(w))))) return true;
      // Short upper-case abbreviation of one word: "DB SN" = DB Snatch
      return distinct.some(w => Array.from(nameInitials).some(t => t.length >= 2 && w.startsWith(t)));
    };

    // movement (library display name) → section types it appears in
    const inWod = new Map<string, Set<string>>();
    for (const section of wod.sections ?? []) {
      if (!MAIN_SECTIONS.test((section.type ?? '').trim())) continue;
      extractMovementsFromWod(
        { id: wod.id, title: '', date: dates[0], sections: [section], classTimes: [] } as unknown as WodArg,
        known, new Map(), liftMap
      ).forEach(m => {
        const label = display.get(m.toLowerCase());
        if (!label) return; // library names only
        (inWod.get(label) ?? inWod.set(label, new Set()).get(label)!).add(section.type ?? '');
      });
    }
    const headWord = (m: string) => words(m).find(w => !GENERIC.has(w) && !/^\d+$/.test(w));
    const coveredHeads = new Set<string>();
    const missing: string[] = [];
    for (const m of inWod.keys()) {
      if (isNamed(m)) { const h = headWord(m); if (h) coveredHeads.add(h); }
      else missing.push(m);
    }
    // A scaling variant of a named movement ("KB Swing Russian" next to AKBS,
    // "Push-up Knees" next to "Push-up") shares its first word with it — not a miss.
    for (const m of missing) {
      const h = headWord(m);
      if (h && coveredHeads.has(h)) continue;
      const byMove = report.get(name) ?? new Map();
      const entry = byMove.get(m) ?? { sections: new Set<string>(), dates: new Set<string>() };
      inWod.get(m)!.forEach(s => entry.sections.add(s));
      dates.forEach(d => entry.dates.add(d));
      byMove.set(m, entry);
      report.set(name, byMove);
    }
  }

  const names = Array.from(report.keys()).sort((a, b) => a.localeCompare(b));
  console.log(`Checked ${checked} distinct workouts (${unique.size} incl. unnamed). ${names.length} names miss at least one movement.\n`);
  const out: Record<string, { movement: string; sections: string[]; dates: string[] }[]> = {};
  for (const n of names) {
    const rows = Array.from(report.get(n)!.entries()).map(([movement, e]) => ({
      movement, sections: Array.from(e.sections), dates: Array.from(e.dates).sort(),
    }));
    out[n] = rows;
    const allDates = Array.from(new Set(rows.flatMap(r => r.dates))).sort();
    console.log(`■ ${n}   (${allDates.map(d => d.slice(5)).join(', ')})`);
    // Variants of one movement on one line: "Push-up: Knees, Strict, Wide"
    const groups = new Map<string, string[]>();
    rows.forEach(r => {
      const head = words(r.movement).find(w => !GENERIC.has(w) && !/^\d+$/.test(w)) ?? r.movement;
      (groups.get(head) ?? groups.set(head, []).get(head)!).push(`${r.movement} [${r.sections.join('/')}]`);
    });
    groups.forEach(list => console.log(`    - ${list.join(' · ')}`));
  }
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(out, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
