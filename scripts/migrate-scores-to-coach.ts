/**
 * Migrate Athlete Scores to Coach-Entered
 *
 * Converts existing self-entered scores to coach-entered by setting member_id.
 * This makes them read-only for the athlete (coach scores are authoritative).
 *
 * For primary members, member_id = user_id (auth ID), so we just copy user_id → member_id
 * on records where member_id is currently null.
 *
 * Usage:
 *   npx tsx scripts/migrate-scores-to-coach.ts              # Dry run
 *   npx tsx scripts/migrate-scores-to-coach.ts --apply       # Apply changes
 *   npx tsx scripts/migrate-scores-to-coach.ts --user <id>   # Specific user only
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

const DRY_RUN = !process.argv.includes('--apply');
const userArg = process.argv.find((_, i, arr) => arr[i - 1] === '--user');

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Migrate Scores to Coach-Entered — ${DRY_RUN ? 'DRY RUN' : '⚡ APPLYING'}`);
  console.log(`${'═'.repeat(60)}\n`);

  // Find all section results where member_id is null (self-entered)
  let query = supabase
    .from('wod_section_results')
    .select('id, user_id, member_id, wod_id, section_id, workout_date, scaling_level, time_result, reps_result, weight_result, rounds_result')
    .is('member_id', null);

  if (userArg) {
    query = query.eq('user_id', userArg);
    console.log(`  Filtering to user: ${userArg}\n`);
  }

  const { data: results, error } = await query;

  if (error) {
    console.error('❌ Error fetching results:', error.message);
    process.exit(1);
  }

  if (!results || results.length === 0) {
    console.log('No self-entered scores found to migrate.');
    return;
  }

  // Group by user for summary
  const byUser: Record<string, typeof results> = {};
  for (const r of results) {
    if (!r.user_id) continue;
    if (!byUser[r.user_id]) byUser[r.user_id] = [];
    byUser[r.user_id].push(r);
  }

  // Get member names for display
  const userIds = Object.keys(byUser);
  const { data: members } = await supabase
    .from('members')
    .select('id, name, display_name')
    .in('id', userIds);

  const nameMap: Record<string, string> = {};
  for (const m of members || []) {
    nameMap[m.id] = m.display_name || m.name || 'Unknown';
  }

  console.log(`Found ${results.length} self-entered scores across ${userIds.length} user(s):\n`);

  for (const [uid, scores] of Object.entries(byUser)) {
    const name = nameMap[uid] || uid;
    const dates = [...new Set(scores.map(s => s.workout_date))].sort();
    console.log(`  ${name}: ${scores.length} scores (${dates[0]} → ${dates[dates.length - 1]})`);
  }

  if (!DRY_RUN) {
    console.log(`\nMigrating...\n`);

    let updated = 0;
    let errors = 0;

    // Batch update: set member_id = user_id for each user
    for (const [uid, scores] of Object.entries(byUser)) {
      const ids = scores.map(s => s.id);
      const { error: updateError, count } = await supabase
        .from('wod_section_results')
        .update({ member_id: uid })
        .in('id', ids);

      if (updateError) {
        console.error(`  ❌ ${nameMap[uid] || uid}: ${updateError.message}`);
        errors++;
      } else {
        console.log(`  ✅ ${nameMap[uid] || uid}: ${count ?? ids.length} scores migrated`);
        updated += ids.length;
      }
    }

    console.log(`\n  Total migrated: ${updated}`);
    if (errors > 0) console.log(`  Errors: ${errors}`);
  } else {
    console.log(`\n  Run with --apply to migrate these scores.`);
  }

  console.log(`${'─'.repeat(60)}\n`);
}

main();
