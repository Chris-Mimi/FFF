/**
 * Bulk Republish Script
 *
 * Finds all historical workouts that have scoring sections and ensures they have:
 * 1. is_published = true
 * 2. publish_sections populated with all scorable section IDs
 *
 * This enables coach score entry for historical workouts.
 *
 * Usage:
 *   npx tsx scripts/bulk-republish.ts              # Dry run (shows what would change)
 *   npx tsx scripts/bulk-republish.ts --apply       # Apply changes
 *   npx tsx scripts/bulk-republish.ts --from 2025-11-01  # Only workouts from this date
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

const DRY_RUN = !process.argv.includes('--apply');
const fromArg = process.argv.find((_, i, arr) => arr[i - 1] === '--from');
const FROM_DATE = fromArg || '2025-01-01';

interface ScoringFields {
  time?: boolean;
  max_time?: boolean;
  reps?: boolean;
  load?: boolean;
  rounds_reps?: boolean;
  calories?: boolean;
  metres?: boolean;
  checkbox?: boolean;
  scaling?: boolean;
  time_amrap?: boolean;
}

interface WodSection {
  id: string;
  type: string;
  scoring_fields?: ScoringFields;
}

interface Wod {
  id: string;
  date: string;
  workout_name: string | null;
  session_type: string | null;
  is_published: boolean;
  publish_sections: string[] | null;
  sections: WodSection[];
}

function getScorabeSectionIds(sections: WodSection[]): string[] {
  return sections
    .filter(s => s.scoring_fields && Object.values(s.scoring_fields).some(v => v === true))
    .map(s => s.id);
}

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Bulk Republish — ${DRY_RUN ? 'DRY RUN' : '⚡ APPLYING CHANGES'}`);
  console.log(`  From: ${FROM_DATE}`);
  console.log(`${'═'.repeat(60)}\n`);

  // Fetch all workouts from the given date
  const { data: wods, error } = await supabase
    .from('wods')
    .select('id, date, workout_name, session_type, is_published, publish_sections, sections')
    .gte('date', FROM_DATE)
    .order('date', { ascending: true });

  if (error) {
    console.error('❌ Error fetching workouts:', error.message);
    process.exit(1);
  }

  if (!wods || wods.length === 0) {
    console.log('No workouts found.');
    return;
  }

  console.log(`Found ${wods.length} workouts total.\n`);

  let needsUpdate = 0;
  let alreadyOk = 0;
  let noScorable = 0;
  let updated = 0;
  let errors = 0;

  for (const wod of wods as Wod[]) {
    const scorableIds = getScorabeSectionIds(wod.sections || []);

    if (scorableIds.length === 0) {
      noScorable++;
      continue;
    }

    // Check if publish_sections already covers all scorable sections
    const existingPublished = new Set(wod.publish_sections || []);
    const missingIds = scorableIds.filter(id => !existingPublished.has(id));
    const alreadyPublished = wod.is_published;

    if (missingIds.length === 0 && alreadyPublished) {
      alreadyOk++;
      continue;
    }

    needsUpdate++;

    // Merge existing publish_sections with scorable ones (preserve any non-scorable sections that were already published)
    const mergedSections = [...new Set([...(wod.publish_sections || []), ...scorableIds])];

    const label = wod.workout_name || wod.session_type || 'Unnamed';
    console.log(`${DRY_RUN ? '🔍' : '⚡'} ${wod.date} — ${label}`);
    if (!alreadyPublished) console.log(`   Set is_published: false → true`);
    if (missingIds.length > 0) console.log(`   Add to publish_sections: ${missingIds.join(', ')}`);
    console.log(`   Final publish_sections: [${mergedSections.length} sections]`);

    if (!DRY_RUN) {
      const { error: updateError } = await supabase
        .from('wods')
        .update({
          is_published: true,
          publish_sections: mergedSections,
        })
        .eq('id', wod.id);

      if (updateError) {
        console.error(`   ❌ Error: ${updateError.message}`);
        errors++;
      } else {
        console.log(`   ✅ Updated`);
        updated++;
      }
    }
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Summary:`);
  console.log(`  Total workouts:          ${wods.length}`);
  console.log(`  No scorable sections:    ${noScorable}`);
  console.log(`  Already correct:         ${alreadyOk}`);
  console.log(`  Needs update:            ${needsUpdate}`);
  if (!DRY_RUN) {
    console.log(`  Updated:                 ${updated}`);
    console.log(`  Errors:                  ${errors}`);
  } else {
    console.log(`\n  Run with --apply to make changes.`);
  }
  console.log(`${'─'.repeat(60)}\n`);
}

main();
