/**
 * Movement recency report — answers "which staple movements haven't appeared in
 * a WOD for N weeks?" using the rules in memory-bank/movement-recency-queries.md.
 *
 * Read-only. Reuses the app's own extractor (extractMovementsFromWod) but only
 * feeds it sections in the chosen scope, so warm-ups/cool-downs don't count.
 *
 * Usage:
 *   npx tsx scripts/movement-recency.ts [--scope wod|trained|warmup]
 *     [--weeks 6] [--staple 10] [--months 10] [--kids] [--json out.json]
 */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config({ path: '.env.local' });
// Service role so RLS never hides rows (claude-rules: diagnostic scripts).
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const arg = (name: string, def: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : def;
};
const scope = arg('scope', 'wod');
const weeks = Number(arg('weeks', '6'));
const stapleMin = Number(arg('staple', '10'));
const months = Number(arg('months', '10'));
const includeKids = process.argv.includes('--kids');
const jsonOut = arg('json', '');

const WOD_TYPES = ['WOD', 'WOD Pt.1', 'WOD Pt.2', 'WOD Pt.3', 'WOD Pt.4', 'WOD Pt.5', 'WOD Pt.6'];
const SCOPES: Record<string, string[]> = {
  wod: WOD_TYPES,
  trained: [...WOD_TYPES, 'WOD movements', 'Strength', 'Olympic Lifting', 'Gymnastics', 'Skill', 'Accessory', 'Finisher/Bonus!'],
  warmup: ['Warm-up', 'Cool Down'],
};

const isoDaysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

(async () => {
  const { supabase } = await import('@/lib/supabase');
  const { fetchPublishedWorkouts, fetchAcronymMap, fetchLiftExerciseMap } = await import('@/utils/movement-analytics');
  const { extractMovementsFromWod } = await import('@/utils/movement-extraction');
  const { fetchAllExercises } = await import('@/utils/fetch-all-exercises');

  const allowed = new Set(SCOPES[scope].map(t => t.toLowerCase()));
  if (!SCOPES[scope]) throw new Error(`Unknown scope ${scope}`);

  const [exRes, acronymMap, liftMap] = await Promise.all([
    fetchAllExercises<{ id: string; name: string; display_name: string | null }>('id, name, display_name'),
    fetchAcronymMap(),
    fetchLiftExerciseMap(),
  ]);
  if (exRes.error) throw exRes.error;
  const byName = new Map<string, { id: string; name: string }>();
  const known = new Set<string>();
  for (const ex of exRes.data || []) {
    const label = ex.display_name || ex.name;
    byName.set(ex.name.toLowerCase(), { id: ex.id, name: label });
    known.add(ex.name);
    if (ex.display_name) { byName.set(ex.display_name.toLowerCase(), { id: ex.id, name: label }); known.add(ex.display_name); }
  }

  const workouts = await fetchPublishedWorkouts({
    excludeSessionTypes: includeKids ? [] : ['Kids & Teens', 'Diapers & Dumbbells'],
  });

  // exercise id → set of distinct dates (a WOD run at 3 class times = 1 appearance)
  const dates = new Map<string, Set<string>>();
  for (const w of workouts) {
    const sections = (w.sections || []).filter((s: { type?: string }) => allowed.has((s.type || '').toLowerCase()));
    if (!sections.length) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const found = extractMovementsFromWod({ id: w.id, title: '', date: w.date, sections, classTimes: [] } as any, known, acronymMap, liftMap);
    for (const m of found) {
      const ex = byName.get(m.toLowerCase());
      if (!ex) continue;
      if (!dates.has(ex.id)) dates.set(ex.id, new Set());
      dates.get(ex.id)!.add(w.date);
    }
  }

  // exercise id → movement pattern names
  const { data: pats, error: pErr } = await supabase.from('movement_patterns').select('id, name');
  if (pErr) throw pErr;
  const { data: links, error: lErr } = await supabase.from('movement_pattern_exercises').select('pattern_id, exercise_id');
  if (lErr) throw lErr;
  const patName = new Map((pats || []).map(p => [p.id, p.name]));
  const patternsOf = new Map<string, string[]>();
  for (const l of links || []) {
    const n = patName.get(l.pattern_id);
    if (!n) continue;
    patternsOf.set(l.exercise_id, [...(patternsOf.get(l.exercise_id) || []), n]);
  }

  const today = isoDaysAgo(0);
  const windowStart = isoDaysAgo(Math.round(months * 30.4));
  const overdueBefore = isoDaysAgo(weeks * 7);
  const nameOf = new Map([...byName.values()].map(e => [e.id, e.name]));

  const rows = [...dates.entries()].map(([id, set]) => {
    const all = [...set].filter(d => d <= today).sort();
    return {
      id,
      name: nameOf.get(id) || id,
      inWindow: all.filter(d => d >= windowStart).length,
      last: all.at(-1) || '',
      patterns: patternsOf.get(id) || [],
    };
  });
  const staples = rows.filter(r => r.inWindow >= stapleMin);
  const overdue = staples.filter(r => r.last < overdueBefore).sort((a, b) => a.last.localeCompare(b.last));
  const weeksAgo = (d: string) => Math.floor((Date.parse(today) - Date.parse(d)) / (7 * 864e5));

  console.log(`scope=${scope} staple>=${stapleMin} since ${windowStart} · overdue = last before ${overdueBefore} · ${workouts.length} sessions`);
  console.log(`staples: ${staples.length} · overdue: ${overdue.length}\n`);
  for (const r of overdue) {
    console.log(`${r.name.padEnd(40)} last ${r.last} (${weeksAgo(r.last)} wk) · ${r.inWindow}x · ${r.patterns.join(', ') || '—'}`);
  }
  console.log('\n--- fresh staples (for family cross-check) ---');
  for (const r of staples.filter(r => r.last >= overdueBefore).sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`${r.name.padEnd(40)} last ${r.last} · ${r.inWindow}x`);
  }
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ staples, overdue, all: rows }, null, 1));
})();
