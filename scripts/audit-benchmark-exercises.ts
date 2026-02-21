/**
 * Audit benchmark & forge benchmark descriptions against exercises table.
 * Reports exercise names that don't match known exercises.
 *
 * Mirrors the matching logic in utils/movement-extraction.ts:
 * 1. Direct match (case-insensitive)
 * 2. Deplural (strip trailing 's')
 * 3. Generic→canonical failsafe mapping
 * 4. Substring matching
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Same failsafe mapping as movement-extraction.ts
const genericToCanonical: Record<string, string> = {
  'pull-up': 'pull-up kipping',
  'pull-ups': 'pull-up kipping',
  'push-up': 'push-up strict',
  'push-ups': 'push-up strict',
  'handstand push-up': 'handstand push-up kipping',
  'handstand push-ups': 'handstand push-up kipping',
  'deadlift': 'barbell deadlift',
  'deadlifts': 'barbell deadlift',
  'thruster': 'barbell thruster',
  'thrusters': 'barbell thruster',
  'clean': 'barbell clean',
  'cleans': 'barbell clean',
  'snatch': 'barbell snatch',
  'snatches': 'barbell snatch',
  'push press': 'barbell push press (pp)',
  'push jerk': 'barbell push jerk (pj)',
  'push jerks': 'barbell push jerk (pj)',
  'hang power clean': 'barbell hang power clean (hpc)',
  'hang power cleans': 'barbell hang power clean (hpc)',
  'clean & jerk': 'barbell clean & jerk (c&j)',
  'clean & jerks': 'barbell clean & jerk (c&j)',
  'clean and jerk': 'barbell clean & jerk (c&j)',
  'clean and jerks': 'barbell clean & jerk (c&j)',
  'bench press': 'barbell bench press',
  'overhead squat': 'overhead squat (ohs)',
  'overhead squats': 'overhead squat (ohs)',
  'ring muscle-up': 'ring muscle-up (kipping)',
  'ring muscle-ups': 'ring muscle-up (kipping)',
  'muscle-up': 'ring muscle-up (kipping)',
  'muscle-ups': 'ring muscle-up (kipping)',
  'knees to elbows': 'bar hanging knees to elbows',
  'knee to elbow': 'bar hanging knees to elbows',
  'kb swing': 'kb swing american (akbs)',
  'kb swings': 'kb swing american (akbs)',
  'kettlebell swing': 'kb swing american (akbs)',
  'kettlebell swings': 'kb swing american (akbs)',
  'sit-up': 'abmat sit-up',
  'sit-ups': 'abmat sit-up',
  'back extension': 'ghd back extension',
  'back extensions': 'ghd back extension',
  'double-under': 'jump rope double-unders (dus)',
  'double-unders': 'jump rope double-unders (dus)',
  'double under': 'jump rope double-unders (dus)',
  'double unders': 'jump rope double-unders (dus)',
  'walking lunge': 'lunge walking',
  'walking lunges': 'lunge walking',
  'row': 'c2 rower',
  'rowing': 'c2 rower',
};

// Noise phrases — instruction text, not exercises
const noisePatterns = [
  /^reps?\s+of/i,
  /^rounds?\s+for/i,
  /^for\s+time/i,
  /^min\s+/i,
  /^\d+\s*min/i,
  /^emom/i,
  /^amrap/i,
  /^rest\b/i,
  /^then\b/i,
  /^each\b/i,
  /^rounds?\s+of/i,
  /^tabata\b/i,
  /^perform\b/i,
  /^on\s+a\s+\d/i,
  /^the\s+tabata/i,
  /^score\b/i,
  /^unit\b/i,
  /^scaled/i,
  /^sc\d:/i,
  /^rx:/i,
  /^secs?\s+work/i,
  /^minute\s+/i,
  /^reps?\s+per/i,
  /^bodyweight\b/i,
  /\bfor\s+time$/i,
  /\bfor\s+max\s+reps$/i,
  /\bmoving\s+on\b/i,
  /\bfollowed\s+by\b/i,
  /\bagainst\s+the\s+wall/i,
  /\bshoulder/i,
  /\bstraight\s+legs/i,
  /\bbent\s+knees/i,
  /\btuck\s+hold/i,
  /\bbanded\s+with/i,
  /\bwrists\b/i,
  /\blegs\s+clearly/i,
  /\binstead$/i,
  /^rounds?\b$/i,
  /^\(.+\)$/,                   // standalone parenthetical like "(Hero Workout)"
  /^ascending\b/i,
  /\bas\s+fast\s+as/i,
  /\bas\s+many\b/i,
  /\bmetres?\b.*\bpossible/i,   // "1000 metres as fast as possible"
  /\bfor\s+time\b/i,
  /\bsecs?\s+rest\b/i,
  /\bif\s+you\b/i,
  /\bheels?\s+higher/i,
  /\bcalories\b/i,              // "(calories)" description text
  /\blevel\s+with/i,
  /\bmanage\s+at\s+least/i,
];

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

      // Movement + x + Number (e.g., "Burpee x 10")
      if (!text) {
        const mxnMatch = part.match(/^(.+?)\s+x\s+\d+/i);
        if (mxnMatch) text = mxnMatch[1];
      }

      // No number prefix — try as-is
      if (!text) text = part;

      // Clean @ mentions, trailing punctuation, and trailing weight/distance
      text = text.replace(/\s*@.*$/, '');
      text = text.replace(/[,;.!?:]+$/, '');
      text = text.replace(/\s+\d+\s*(?:kg|lbs?)?\s*$/i, ''); // strip trailing weight
      text = text.trim();

      if (text && text.length >= 3) {
        // Try with full text first (preserves parentheticals + distances)
        candidates.push(text);
      }
    }
  }

  return candidates;
}

function isNoise(text: string): boolean {
  if (/^\d+$/.test(text)) return true;
  if (/^\d+\s*(?:min|sec|m|km|cal|kg|lb)s?$/i.test(text)) return true;
  if (text.split(/\s+/).length > 8) return true;
  return noisePatterns.some(p => p.test(text));
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

  // 4. Match function — mirrors movement-extraction.ts logic
  const findMatch = (candidate: string): string | null => {
    const lower = candidate.toLowerCase().trim();
    if (!lower || lower.length < 3) return null;

    // 1. Direct match
    if (exerciseNamesLower.has(lower)) return null; // exact match, no issue

    // 2. Deplural
    const deplural = lower.replace(/s$/, '');
    if (deplural !== lower && exerciseNamesLower.has(deplural)) return null; // deplural match, OK

    // 3. Try with variant parenthetical included (e.g., "Ring Muscle-Up (kipping)")
    const parenMatch = candidate.match(/^(.*?\([^)]+\))/);
    if (parenMatch) {
      const withParen = parenMatch[1].toLowerCase();
      if (exerciseNamesLower.has(withParen)) return null;
      const withParenDeplural = withParen.replace(/s\)$/, ')');
      if (withParenDeplural !== withParen && exerciseNamesLower.has(withParenDeplural)) return null;
    }

    // 4. Strip weight parenthetical only (keep variant labels)
    const withoutWeight = candidate.replace(/\s*\(\d+[^)]*\)\s*$/, '').trim().toLowerCase();
    if (withoutWeight !== lower && exerciseNamesLower.has(withoutWeight)) return null;

    // 5. Generic→canonical failsafe
    const canonical = genericToCanonical[lower] || genericToCanonical[deplural];
    if (canonical && exerciseNamesLower.has(canonical)) return null; // failsafe handles it

    // 6. Substring matching (flag these — they work but are imprecise)
    const lowerList = Array.from(exerciseNamesLower);
    for (const exercise of lowerList) {
      if (exercise.length < 4) continue;
      if (lower.includes(exercise) || lower.includes(exercise + 's')) {
        const display = Array.from(exerciseNames).find(n => n.toLowerCase() === exercise);
        return `[substring] ${display || exercise}`;
      }
      if (lower.length >= 4 && (exercise.includes(lower) || exercise.includes(deplural))) {
        const display = Array.from(exerciseNames).find(n => n.toLowerCase() === exercise);
        return `[substring] ${display || exercise}`;
      }
    }

    return '(no match found)';
  };

  // 5. Audit
  const issues: { type: string; benchmarkName: string; candidate: string; suggestion: string }[] = [];

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

  // 6. Output report
  if (issues.length === 0) {
    console.log('✅ All benchmark descriptions use exact exercise names!');
  } else {
    console.log(`Found ${issues.length} remaining mismatches:\n`);
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
