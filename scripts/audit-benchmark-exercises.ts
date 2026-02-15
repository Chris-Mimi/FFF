/**
 * Audit benchmark & forge benchmark descriptions against exercises table.
 * Reports exercise names that don't match known exercises.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Extract exercise-like text from a benchmark description
function extractCandidates(description: string): string[] {
  const candidates: string[] = [];
  const lines = description.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Split by '+' and ',' for multiple exercises
    const parts = trimmed.split(/[+,]/).map(p => p.trim());

    for (const part of parts) {
      if (!part) continue;

      let text = '';

      // Bullet pattern
      const bulletMatch = part.match(/^[*•-]\s+(.+)$/);
      if (bulletMatch) text = bulletMatch[1];

      // Number + x + Movement
      if (!text) {
        const nxMatch = part.match(/^\d+[\s-]*x[\s-]*(.+)$/i);
        if (nxMatch) text = nxMatch[1];
      }

      // Number/rep-scheme + Movement
      if (!text) {
        const numMatch = part.match(/^\d+(?:-\d+)*\s+(.+)$/);
        if (numMatch) text = numMatch[1];
      }

      // Number+unit + Movement (500m Row)
      if (!text) {
        const unitMatch = part.match(/^\d+\s*(?:m|km|mi|cal|kcal|ft|metres?|meters?)\s+(.+)$/i);
        if (unitMatch) text = unitMatch[1];
      }

      // No number prefix — try as-is
      if (!text) text = part;

      // Clean trailing noise
      text = text.replace(/\s*@.*$/, '');
      text = text.replace(/\s+\d+\s*(?:kg|lbs?|m|ft|cal|kcal|reps?)?\s*$/i, '');
      text = text.replace(/\s*\([^)]*\)\s*$/, ''); // strip trailing parenthetical
      text = text.replace(/[,;.!?:]+$/, '');
      text = text.trim();

      if (text && text.length >= 3) {
        candidates.push(text);
      }
    }
  }

  return candidates;
}

async function audit() {
  // 1. Fetch all exercises
  const { data: exercises, error: exErr } = await supabase
    .from('exercises')
    .select('name, display_name');

  if (exErr) { console.error('Error fetching exercises:', exErr); return; }

  const exerciseNames = new Set<string>();
  const exerciseNamesLower = new Set<string>();
  exercises?.forEach(ex => {
    if (ex.name) {
      exerciseNames.add(ex.name);
      exerciseNamesLower.add(ex.name.toLowerCase());
    }
    if (ex.display_name) {
      exerciseNames.add(ex.display_name);
      exerciseNamesLower.add(ex.display_name.toLowerCase());
    }
  });

  console.log(`Loaded ${exerciseNames.size} exercise names\n`);

  // 2. Fetch benchmarks
  const { data: benchmarks, error: bErr } = await supabase
    .from('benchmark_workouts')
    .select('id, name, description')
    .order('name');

  if (bErr) { console.error('Error fetching benchmarks:', bErr); return; }

  // 3. Fetch forge benchmarks
  const { data: forgeBenchmarks, error: fErr } = await supabase
    .from('forge_benchmarks')
    .select('id, name, description')
    .order('name');

  if (fErr) { console.error('Error fetching forge benchmarks:', fErr); return; }

  // 4. Audit each benchmark
  const issues: { type: string; benchmarkName: string; candidate: string; suggestion: string }[] = [];

  const findMatch = (candidate: string): string | null => {
    const lower = candidate.toLowerCase();
    // Direct
    if (exerciseNamesLower.has(lower)) return null; // exact match, no issue
    // Depluralized
    const deplural = lower.replace(/s$/, '');
    if (deplural !== lower && exerciseNamesLower.has(deplural)) {
      const original = Array.from(exerciseNames).find(n => n.toLowerCase() === deplural);
      return original || null;
    }
    // Substring: find exercises containing this candidate or vice versa
    const matches: string[] = [];
    for (const name of exerciseNames) {
      const nameLower = name.toLowerCase();
      if (nameLower.includes(lower) || nameLower.includes(deplural) || lower.includes(nameLower)) {
        matches.push(name);
      }
    }
    if (matches.length > 0) {
      return matches.join(' | ');
    }
    return '(no match found)';
  };

  // Skip noise words
  const noiseWords = new Set([
    'for time', 'amrap', 'emom', 'rounds', 'reps', 'rest', 'then',
    'each', 'side', 'round', 'minute', 'minutes', 'seconds', 'sec',
    'rx', 'scaled', 'cap', 'time cap',
  ]);

  const isNoise = (text: string): boolean => {
    const lower = text.toLowerCase();
    if (noiseWords.has(lower)) return true;
    if (/^\d+$/.test(text)) return true; // pure numbers
    if (/^\d+\s*(?:min|sec|m|km|cal|kg|lb)s?$/i.test(text)) return true; // "5 min", "500m"
    if (text.split(/\s+/).length > 6) return true; // too long, probably instruction
    return false;
  };

  const auditBenchmarks = (items: any[], type: string) => {
    for (const item of items) {
      if (!item.description) continue;

      const candidates = extractCandidates(item.description);
      for (const candidate of candidates) {
        if (isNoise(candidate)) continue;

        const match = findMatch(candidate);
        if (match !== null) {
          issues.push({
            type,
            benchmarkName: item.name,
            candidate,
            suggestion: match,
          });
        }
      }
    }
  };

  auditBenchmarks(benchmarks || [], 'Benchmark');
  auditBenchmarks(forgeBenchmarks || [], 'Forge Benchmark');

  // 5. Output report
  if (issues.length === 0) {
    console.log('✅ All benchmark descriptions use exact exercise names!');
  } else {
    console.log(`Found ${issues.length} exercise name mismatches:\n`);
    console.log('='.repeat(80));

    // Group by benchmark
    const grouped: Record<string, typeof issues> = {};
    for (const issue of issues) {
      const key = `${issue.type}: ${issue.benchmarkName}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(issue);
    }

    for (const [benchmark, issueList] of Object.entries(grouped)) {
      console.log(`\n${benchmark}`);
      console.log('-'.repeat(benchmark.length));
      for (const issue of issueList) {
        console.log(`  "${issue.candidate}" → ${issue.suggestion}`);
      }
    }
  }
}

audit();
