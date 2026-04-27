import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function run() {
  // Pull every section result that has a non-null track value
  const { data: rows, error } = await supabase
    .from('wod_section_results')
    .select('wod_id, track, workout_date')
    .not('track', 'is', null)
    .order('workout_date', { ascending: false });

  if (error) { console.error(error); return; }

  // Group by wod_id, collect distinct track values + count
  const byWod = new Map<string, { tracks: Set<number>; count: number; date: string | null }>();
  for (const r of rows || []) {
    if (!r.wod_id) continue;
    const e = byWod.get(r.wod_id) || { tracks: new Set<number>(), count: 0, date: null };
    e.tracks.add(r.track as number);
    e.count++;
    if (!e.date || (r.workout_date && r.workout_date > e.date)) e.date = r.workout_date;
    byWod.set(r.wod_id, e);
  }

  // Look up wod names
  const wodIds = [...byWod.keys()];
  const { data: wods } = await supabase
    .from('wods')
    .select('id, date, workout_name, session_type')
    .in('id', wodIds);
  const wodInfo = new Map((wods || []).map(w => [w.id, w]));

  // Sort by most recent date desc
  const list = [...byWod.entries()]
    .map(([id, v]) => ({ id, ...v, wod: wodInfo.get(id) }))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  if (list.length === 0) {
    console.log('No section results have track set.\n');
  } else {
    console.log(`\n${list.length} WODs have section results with track set:\n`);
    console.log('Date       | Session       | Workout Name                | Tracks | Result rows');
    console.log('-'.repeat(95));
    for (const e of list) {
      const date = e.wod?.date || e.date || '?';
      const session = (e.wod?.session_type || '?').padEnd(13);
      const name = (e.wod?.workout_name || '(unnamed)').padEnd(28);
      const tracks = [...e.tracks].sort().join(',').padEnd(6);
      console.log(`${date} | ${session} | ${name} | ${tracks} | ${e.count}`);
    }
  }

  // Also check benchmark_results
  const { data: bench } = await supabase
    .from('benchmark_results')
    .select('benchmark_name, track, result_date')
    .not('track', 'is', null)
    .order('result_date', { ascending: false });

  if (bench?.length) {
    const byBench = new Map<string, { tracks: Set<number>; count: number; date: string | null }>();
    for (const r of bench) {
      const key = r.benchmark_name || '(unnamed benchmark)';
      const e = byBench.get(key) || { tracks: new Set<number>(), count: 0, date: null };
      e.tracks.add(r.track as number);
      e.count++;
      if (!e.date || (r.result_date && r.result_date > e.date)) e.date = r.result_date;
      byBench.set(key, e);
    }
    console.log(`\n${byBench.size} benchmarks have results with track set:\n`);
    console.log('Latest     | Benchmark                          | Tracks | Result rows');
    console.log('-'.repeat(80));
    const blist = [...byBench.entries()].sort((a, b) => (b[1].date || '').localeCompare(a[1].date || ''));
    for (const [name, v] of blist) {
      const tracks = [...v.tracks].sort().join(',').padEnd(6);
      console.log(`${(v.date || '?').padEnd(10)} | ${name.padEnd(34)} | ${tracks} | ${v.count}`);
    }
  } else {
    console.log('\nNo benchmark_results have track set.');
  }
}

async function listConfigured() {
  // Pull WODs whose sections have scoring_fields.track enabled (regardless of scored results)
  const { data: wods, error } = await supabase
    .from('wods')
    .select('id, date, workout_name, session_type, sections')
    .order('date', { ascending: false });
  if (error) { console.error(error); return; }
  const matches: { date: string; session: string; name: string; sectionTypes: string[] }[] = [];
  for (const w of wods || []) {
    const tracked: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const s of (w.sections as any[]) || []) {
      if (s?.scoring_fields?.track === true) tracked.push(s.type || '?');
    }
    if (tracked.length) matches.push({
      date: w.date,
      session: w.session_type || '?',
      name: w.workout_name || '(unnamed)',
      sectionTypes: tracked,
    });
  }
  if (!matches.length) {
    console.log('\nNo WODs have any section with scoring_fields.track enabled.');
    return;
  }
  console.log(`\n${matches.length} WODs have at least one section configured with track scoring:\n`);
  console.log('Date       | Session       | Workout Name                | Sections w/ track');
  console.log('-'.repeat(100));
  for (const m of matches) {
    console.log(`${m.date} | ${m.session.padEnd(13)} | ${m.name.padEnd(28)} | ${m.sectionTypes.join(', ')}`);
  }
}

run().then(() => listConfigured()).catch(console.error);
