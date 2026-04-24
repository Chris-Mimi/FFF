/**
 * Import historical lift records from data/athletes/*.json into the lift_records table.
 *
 * Each JSON file maps lift keys (e.g. "1RM Deadlift (DL)", "3 RM BS") to arrays
 * of { weight_kg, date } entries. This script:
 *   1. Resolves the athlete's user_id from the members table via full_name.
 *   2. Parses each lift key → lift_name + reps + rep_max_type.
 *   3. Calculates estimated 1RM (Epley formula) for reps > 1.
 *   4. Inserts records, skipping any that already exist (same user + lift + date + rep_max_type).
 *
 * Defaults to dry-run. Pass --apply to commit changes.
 *
 * Usage:
 *   npx tsx scripts/import-athlete-lift-records.ts
 *   npx tsx scripts/import-athlete-lift-records.ts --apply
 *   npx tsx scripts/import-athlete-lift-records.ts --apply --athlete michi-stadele
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');
const ATHLETE_FILTER = (() => {
  const idx = process.argv.indexOf('--athlete');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Lift key → canonical lift_name ─────────────────────────────────────────
// Keys are matched case-insensitively after stripping the leading "NRM " prefix.
const LIFT_NAME_MAP: Record<string, string> = {
  // Deadlift variations
  'deadlift (dl)':          'Deadlift',
  'deadlift':               'Deadlift',
  'dl':                     'Deadlift',
  'sumo dl':                'Sumo Deadlift',
  'sumo deadlift':          'Sumo Deadlift',

  // Squat variations
  'back squat (bs)':        'Back Squat',
  'back squat':             'Back Squat',
  'bs':                     'Back Squat',
  'front squat (fs)':       'Front Squat',
  'front squat':            'Front Squat',
  'fs':                     'Front Squat',
  'overhead squat (ohs)':   'Overhead Squat',
  'overhead squat':         'Overhead Squat',
  'ohs':                    'Overhead Squat',

  // Olympic lifts
  'clean':                  'Clean',
  'clean & jerk (c&j)':     'Clean & Jerk',
  'clean & jerk':           'Clean & Jerk',
  'snatch':                 'Snatch',

  // Press variations
  'overhead press (ohp)':   'Strict Overhead Shoulder Press',
  'overhead press':         'Strict Overhead Shoulder Press',
  'barbell ohp':            'Strict Overhead Shoulder Press',
  'ohp':                    'Strict Overhead Shoulder Press',
  'push press (pp)':        'Push Press',
  'push press':             'Push Press',
  'pp':                     'Push Press',
  'bench press (bp)':       'Bench Press',
  'bench press':            'Bench Press',
  'bp':                     'Bench Press',

  // Jerk
  'pj':                     'Power Jerk',
  'power jerk':             'Power Jerk',
};

const REP_MAX_TYPE: Record<number, string> = {
  1:  '1RM',
  3:  '3RM',
  5:  '5RM',
  10: '10RM',
};

/**
 * Parse a JSON lift key like "1RM Deadlift (DL)" or "3 RM BS" into
 * { liftName, reps, repMaxType }.
 * Returns null if the key cannot be parsed.
 */
function parseLiftKey(key: string): { liftName: string; reps: number; repMaxType: string } | null {
  // Match patterns: "1RM ...", "3 RM ...", "10RM ...", "10 RM ..."
  const match = key.match(/^(\d+)\s*RM\s+(.+)$/i);
  if (!match) return null;

  const reps = parseInt(match[1], 10);
  const rawName = match[2].trim().toLowerCase();

  const liftName = LIFT_NAME_MAP[rawName];
  if (!liftName) {
    console.warn(`  ⚠️  Unknown lift name fragment: "${match[2]}" (from key "${key}")`);
    return null;
  }

  const repMaxType = REP_MAX_TYPE[reps] ?? 'Other';
  return { liftName, reps, repMaxType };
}

/** Epley estimated 1RM: weight × (1 + reps/30). Null for single reps. */
function epley(weightKg: number, reps: number): number | null {
  if (reps <= 1) return null;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

// ── Main ───────────────────────────────────────────────────────────────────

interface AthleteJson {
  athlete: string;
  full_name: string;
  gender: string;
  results: Record<string, Array<{ weight_kg: number; date: string }>>;
}

async function main() {
  console.log(`\n🏋️  Athlete Lift Records Importer — ${APPLY ? 'APPLY MODE' : 'DRY RUN'}\n`);

  const dataDir = path.join(process.cwd(), 'data', 'athletes');
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && !fs.statSync(path.join(dataDir, f)).isDirectory());

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const file of files) {
    if (ATHLETE_FILTER && !file.includes(ATHLETE_FILTER)) continue;

    const filePath = path.join(dataDir, file);
    const json: AthleteJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    console.log(`\n👤 ${json.full_name} (${file})`);

    // ── Resolve user_id ──
    const { data: members, error: memberError } = await supabase
      .from('members')
      .select('id, name')
      .eq('name', json.full_name)
      .limit(1);

    if (memberError || !members?.length) {
      console.log(`  ❌ Not found in members table — skipping`);
      continue;
    }

    const userId = members[0].id;
    console.log(`  ✅ user_id: ${userId}`);

    // ── Fetch existing records to avoid duplication ──
    const { data: existing } = await supabase
      .from('lift_records')
      .select('lift_name, lift_date, rep_max_type')
      .eq('user_id', userId);

    const existingSet = new Set(
      (existing ?? []).map(r => `${r.lift_name}|${r.lift_date}|${r.rep_max_type}`)
    );

    // ── Process each lift key ──
    const toInsert: object[] = [];

    for (const [key, entries] of Object.entries(json.results)) {
      const parsed = parseLiftKey(key);
      if (!parsed) continue;

      const { liftName, reps, repMaxType } = parsed;

      for (const entry of entries) {
        const dedupKey = `${liftName}|${entry.date}|${repMaxType}`;
        if (existingSet.has(dedupKey)) {
          totalSkipped++;
          continue;
        }

        toInsert.push({
          user_id:        userId,
          lift_name:      liftName,
          weight_kg:      entry.weight_kg,
          reps:           reps,
          rep_max_type:   repMaxType,
          calculated_1rm: epley(entry.weight_kg, reps),
          lift_date:      entry.date,
        });

        existingSet.add(dedupKey); // prevent intra-batch duplicates
      }
    }

    console.log(`  📦 ${toInsert.length} new records to insert, ${totalSkipped} already exist`);

    if (!APPLY || toInsert.length === 0) {
      if (!APPLY && toInsert.length > 0) {
        console.log(`  ℹ️  Dry run — pass --apply to commit`);
      }
      totalInserted += 0;
      continue;
    }

    // ── Insert in batches of 100 ──
    const BATCH = 100;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const batch = toInsert.slice(i, i + BATCH);
      const { error } = await supabase.from('lift_records').insert(batch);
      if (error) {
        console.error(`  ❌ Insert error:`, error.message);
        totalErrors += batch.length;
      } else {
        totalInserted += batch.length;
        console.log(`  ✅ Inserted batch ${Math.floor(i / BATCH) + 1} (${batch.length} records)`);
      }
    }
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`✅ Inserted:  ${totalInserted}`);
  console.log(`⏭️  Skipped:   ${totalSkipped} (already existed)`);
  console.log(`❌ Errors:    ${totalErrors}`);
  if (!APPLY) {
    console.log(`\n💡 Run with --apply to commit changes.`);
  }
}

main().catch(console.error);
