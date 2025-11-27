import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Equipment assignment rules based on name patterns (order matters - first match wins)
const equipmentRules = [
  // Plate-specific exercises (must come before general barbell patterns)
  { pattern: /plate.*overhead|overhead.*plate/i, equipment: ['plates'] },
  { pattern: /plate.*ground.?to.?overhead|ground.?to.?overhead.*plate/i, equipment: ['plates'] },
  { pattern: /plate.*pinch|pinch.*plate/i, equipment: ['plates'] },
  { pattern: /plate.*drag|drag.*plate/i, equipment: ['plates'] },
  { pattern: /plate.*carry|carry.*plate/i, equipment: ['plates'] },
  { pattern: /bumper.*plate|plate.*raise|plate.*press/i, equipment: ['plates'] },

  // Recovery & Mobility Equipment
  { pattern: /foam roll/i, equipment: ['foam roller'] },
  { pattern: /ball smash|ball roll|lacrosse ball|massage ball/i, equipment: ['massage ball'] },

  // Dumbbell Movements (MUST come before barbell Olympic lifts)
  { pattern: /dumbbell.*press|press.*dumbbell|db.*press|db-.*press/i, equipment: ['dumbbell'] },
  { pattern: /dumbbell.*row|row.*dumbbell|db.*row|db-.*row/i, equipment: ['dumbbell'] },
  { pattern: /dumbbell.*snatch|snatch.*dumbbell|db.*snatch|db-.*snatch|db.*alt.*snatch/i, equipment: ['dumbbell'] },
  { pattern: /dumbbell.*clean|clean.*dumbbell|db.*clean|db-.*clean/i, equipment: ['dumbbell'] },
  { pattern: /dumbbell.*curl|curl.*dumbbell|db.*curl|db-.*curl/i, equipment: ['dumbbell'] },
  { pattern: /dumbbell.*lunge|lunge.*dumbbell|db.*lunge|db-.*lunge/i, equipment: ['dumbbell'] },
  { pattern: /dumbbell.*deadlift|deadlift.*dumbbell|db.*deadlift|db-.*deadlift/i, equipment: ['dumbbell'] },
  { pattern: /dumbbell.*thruster|thruster.*dumbbell|db.*thruster|db-.*thruster/i, equipment: ['dumbbell'] },
  { pattern: /dumbbell|^db-|^db /i, equipment: ['dumbbell'] },

  // Kettlebell Movements (MUST come before barbell Olympic lifts)
  { pattern: /kettlebell.*swing|swing.*kettlebell|kb.*swing|kb-.*swing/i, equipment: ['kettlebell'] },
  { pattern: /kettlebell.*snatch|snatch.*kettlebell|kb.*snatch|kb-.*snatch/i, equipment: ['kettlebell'] },
  { pattern: /kettlebell.*clean|clean.*kettlebell|kb.*clean|kb-.*clean/i, equipment: ['kettlebell'] },
  { pattern: /kettlebell.*deadlift|deadlift.*kettlebell|kb.*deadlift|kb-.*deadlift/i, equipment: ['kettlebell'] },
  { pattern: /turkish get-?up|TGU/i, equipment: ['kettlebell'] },
  { pattern: /kettlebell|^kb-|^kb /i, equipment: ['kettlebell'] },

  // Barbell Movements (no plates - it's a given)
  { pattern: /barbell.*clean|clean.*barbell/i, equipment: ['barbell'] },
  { pattern: /barbell.*snatch|snatch.*barbell/i, equipment: ['barbell'] },
  { pattern: /barbell.*press|press.*barbell/i, equipment: ['barbell'] },
  { pattern: /barbell.*row|row.*barbell|pendlay.*row/i, equipment: ['barbell'] },
  { pattern: /barbell.*squat|squat.*barbell/i, equipment: ['barbell'] },
  { pattern: /barbell.*deadlift|deadlift.*barbell/i, equipment: ['barbell'] },
  { pattern: /barbell/i, equipment: ['barbell'] },

  // Specific Olympic Lifts (barbell - after DB/KB patterns)
  { pattern: /clean.*jerk|power clean|hang clean|squat clean/i, equipment: ['barbell'] },
  { pattern: /snatch|power snatch|hang snatch|squat snatch/i, equipment: ['barbell'] },
  { pattern: /overhead squat|OHS/i, equipment: ['barbell'] },
  { pattern: /front squat|back squat|squat \(|box squat/i, equipment: ['barbell'] },
  { pattern: /deadlift|sumo deadlift|romanian deadlift|RDL/i, equipment: ['barbell'] },
  { pattern: /bench press/i, equipment: ['barbell', 'bench'] },
  { pattern: /shoulder press|military press|push press|jerk/i, equipment: ['barbell'] },
  { pattern: /thruster/i, equipment: ['barbell'] },

  // Pull-up Bar Movements
  { pattern: /pull-?up|chin-?up|chest.?to.?bar|C2B|bar muscle-?up/i, equipment: ['pull-up bar'] },
  { pattern: /toes.?to.?bar|T2B|knees.?to.?elbow|K2E/i, equipment: ['pull-up bar'] },
  { pattern: /hanging.*knee|hanging.*leg/i, equipment: ['pull-up bar'] },

  // Rings
  { pattern: /ring.*dip|dip.*ring|ring.*row|row.*ring/i, equipment: ['rings'] },
  { pattern: /ring.*muscle.?up|muscle.?up.*ring/i, equipment: ['rings'] },
  { pattern: /ring.*push.?up|push.?up.*ring/i, equipment: ['rings'] },
  { pattern: /ring/i, equipment: ['rings'] },

  // Rope & Climbing
  { pattern: /rope climb/i, equipment: ['rope'] },
  { pattern: /rope.*double.?under|double.?under.*rope|DU/i, equipment: ['jump rope'] },
  { pattern: /rope.*single.?under|single.?under.*rope|jump rope|skipping/i, equipment: ['jump rope'] },
  { pattern: /battle.?rope/i, equipment: ['battle rope'] },

  // Cardio Machines (must come after dumbbell/barbell row patterns)
  { pattern: /rowing machine|row machine|erg row/i, equipment: ['rowing machine'] },
  { pattern: /(?<!air)bike|assault bike/i, equipment: ['assault bike'] }, // Negative lookbehind for airbike
  { pattern: /ski erg/i, equipment: ['ski erg'] }, // More specific - not just "ski"
  { pattern: /echo bike/i, equipment: ['echo bike'] },
  { pattern: /airbike/i, equipment: ['assault bike'] }, // Handle airbike separately

  // Box & Plyometrics
  { pattern: /box jump|box step|step.?up/i, equipment: ['box'] },
  { pattern: /box.*over|jump.*over/i, equipment: ['box'] },

  // Balls
  { pattern: /wall ball|wall.?ball/i, equipment: ['wall ball', 'target'] },
  { pattern: /medicine.?ball|med.?ball|MB /i, equipment: ['medicine ball'] },
  { pattern: /slam.?ball/i, equipment: ['slam ball'] },

  // GHD & Bench
  { pattern: /GHD|glute.?ham|back extension/i, equipment: ['GHD'] },
  { pattern: /bench/i, equipment: ['bench'] },

  // Sled & Prowler
  { pattern: /sled.*push|sled.*pull|sled.*drag|prowler/i, equipment: ['sled'] },

  // Bands & Resistance
  { pattern: /resistance band|band.*pull|band.*stretch/i, equipment: ['resistance band'] },

  // Parallettes & Paralettes
  { pattern: /parallette|L-sit.*hold/i, equipment: ['parallettes'] },

  // Sandbag
  { pattern: /sandbag/i, equipment: ['sandbag'] },

  // Specialty Equipment
  { pattern: /tyre.*flip|tire.*flip|tyre.*pull|tire.*pull|tyre.*drag|tire.*drag/i, equipment: ['tire'] },
  { pattern: /trolley/i, equipment: ['trolley'] },

  // Running/Cardio (no equipment) - must come before ski erg pattern
  { pattern: /a-skip|b-skip|c-skip|skip/i, equipment: ['none'] }, // Running drills
  { pattern: /run|jog|sprint|dash/i, equipment: ['none'] },
  { pattern: /burpee/i, equipment: ['none'] },
  { pattern: /bear.*crawl|commando.*crawl/i, equipment: ['none'] },

  // Bodyweight Movements (no equipment needed - "bodyweight" goes in search_terms)
  { pattern: /air squat|bodyweight squat|pistol/i, equipment: ['none'] },
  { pattern: /push-?up|press-?up/i, equipment: ['none'] },
  { pattern: /sit-?up|crunch/i, equipment: ['none'] },
  { pattern: /lunge(?! dumbbell)|walking lunge/i, equipment: ['none'] },
  { pattern: /plank|hold/i, equipment: ['none'] },
  { pattern: /handstand|HSPU|HS walk/i, equipment: ['none'] },
  { pattern: /dip(?! ring)/i, equipment: ['dip bars'] },
  { pattern: /jump|hop/i, equipment: ['none'] },

  // Stretching & Mobility (no equipment)
  { pattern: /stretch|mobility/i, equipment: ['none'] },
  { pattern: /dynamic|static/i, equipment: ['none'] },

  // Important: "bodyweight" should NOT be in equipment field
  // It should be in search_terms field instead
  // Equipment = what physical equipment is needed
  // Bodyweight = descriptor of the exercise type
];

// Category-based defaults (used if no pattern matches)
const categoryDefaults: Record<string, string[]> = {
  'Olympic Lifting & Barbell Movements': ['barbell'],
  'Warm-up & Mobility': ['none'],
  'Recovery & Stretching': ['none'],
  'Cardio & Conditioning': ['none'], // Will be overridden by specific patterns
  'Gymnastics & Bodyweight': ['none'], // "bodyweight" is a descriptor, not equipment
  'Core, Abs & Isometric Holds': ['none'], // "bodyweight" is a descriptor, not equipment
};

interface ExerciseUpdate {
  id: string;
  name: string;
  category: string;
  currentEquipment: string[] | null;
  newEquipment: string[];
  matched: string; // Pattern or category default
}

async function populateEquipment(dryRun = true) {
  console.log('🔍 Fetching exercises from database...\n');

  // Fetch all exercises
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, name, category, equipment')
    .order('category, name');

  if (error) {
    console.error('❌ Error fetching exercises:', error);
    return;
  }

  console.log(`📊 Found ${exercises.length} exercises\n`);
  console.log(`${dryRun ? '🔍 DRY RUN MODE - No changes will be saved' : '✍️  WRITE MODE - Changes will be saved'}\n`);
  console.log('─'.repeat(80));

  const updates: ExerciseUpdate[] = [];
  const unmatchedExercises: Array<{ name: string; category: string; currentEquipment: string[] | null }> = [];
  let alreadyCorrect = 0;
  let noMatch = 0;

  for (const exercise of exercises) {
    // Note: We DO NOT skip exercises with existing equipment
    // We need to check and correct them

    let assignedEquipment: string[] = [];
    let matchedBy = '';

    // Check name patterns first (highest priority)
    for (const rule of equipmentRules) {
      if (rule.pattern.test(exercise.name)) {
        assignedEquipment = rule.equipment;
        matchedBy = `Pattern: ${rule.pattern.source}`;
        break;
      }
    }

    // Fallback to category default if no pattern matched
    if (assignedEquipment.length === 0 && categoryDefaults[exercise.category]) {
      assignedEquipment = categoryDefaults[exercise.category];
      matchedBy = `Category: ${exercise.category}`;
    }

    // Track the update if equipment changed or needs correction
    if (assignedEquipment.length > 0) {
      // Check if equipment is different from current
      const currentEq = (exercise.equipment || []).sort().join(',');
      const newEq = assignedEquipment.sort().join(',');

      if (currentEq !== newEq) {
        updates.push({
          id: exercise.id,
          name: exercise.name,
          category: exercise.category,
          currentEquipment: exercise.equipment,
          newEquipment: assignedEquipment,
          matched: matchedBy,
        });
      } else {
        alreadyCorrect++;
      }
    } else {
      noMatch++;
      unmatchedExercises.push({
        name: exercise.name,
        category: exercise.category,
        currentEquipment: exercise.equipment,
      });
      console.log(`⚠️  No match: ${exercise.name} (${exercise.category})`);
    }
  }

  // Display updates grouped by category
  console.log('\n📝 Proposed Updates:\n');
  const byCategory = updates.reduce((acc, update) => {
    if (!acc[update.category]) acc[update.category] = [];
    acc[update.category].push(update);
    return acc;
  }, {} as Record<string, ExerciseUpdate[]>);

  for (const [category, categoryUpdates] of Object.entries(byCategory)) {
    console.log(`\n📂 ${category} (${categoryUpdates.length} exercises)`);
    console.log('─'.repeat(80));
    categoryUpdates.slice(0, 5).forEach(update => {
      console.log(`  ✓ ${update.name}`);
      console.log(`    Current:  ${(update.currentEquipment || ['none']).join(', ')}`);
      console.log(`    New:      ${update.newEquipment.join(', ')}`);
      console.log(`    Matched:  ${update.matched}`);
    });
    if (categoryUpdates.length > 5) {
      console.log(`  ... and ${categoryUpdates.length - 5} more`);
    }
  }

  // Summary statistics
  console.log('\n' + '═'.repeat(80));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(80));
  console.log(`Total exercises:        ${exercises.length}`);
  console.log(`Already correct:        ${alreadyCorrect} (${((alreadyCorrect / exercises.length) * 100).toFixed(1)}%)`);
  console.log(`Will be updated:        ${updates.length} (${((updates.length / exercises.length) * 100).toFixed(1)}%)`);
  console.log(`No match found:         ${noMatch} (${((noMatch / exercises.length) * 100).toFixed(1)}%)`);
  console.log('═'.repeat(80));

  // Perform updates if not dry run
  if (!dryRun && updates.length > 0) {
    console.log('\n🚀 Starting database updates...\n');

    let successCount = 0;
    let errorCount = 0;

    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('exercises')
        .update({ equipment: update.newEquipment })
        .eq('id', update.id);

      if (updateError) {
        console.error(`❌ Error updating ${update.name}:`, updateError.message);
        errorCount++;
      } else {
        successCount++;
        if (successCount % 50 === 0) {
          console.log(`   Progress: ${successCount}/${updates.length} exercises updated...`);
        }
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('✅ UPDATE COMPLETE');
    console.log('═'.repeat(80));
    console.log(`Success: ${successCount}`);
    console.log(`Errors:  ${errorCount}`);
    console.log('═'.repeat(80));
  } else if (dryRun) {
    console.log('\n💡 To apply these changes, run:');
    console.log('   npx tsx scripts/populate-equipment.ts --apply\n');
  }

  // List exercises with no match for manual review
  if (noMatch > 0 && unmatchedExercises.length > 0) {
    console.log('\n' + '═'.repeat(80));
    console.log('⚠️  EXERCISES REQUIRING MANUAL REVIEW');
    console.log('═'.repeat(80));
    console.log(`Found ${unmatchedExercises.length} exercises without equipment assignment\n`);
    console.log('📍 How to assign equipment:');
    console.log('   1. Open Coach Library page (Benchmarks & Lifts → Exercises tab)');
    console.log('   2. Find the exercise in the list');
    console.log('   3. Click the Edit button (pencil icon)');
    console.log('   4. Enter equipment in the "Equipment" field (comma-separated)');
    console.log('   5. Save the exercise\n');
    console.log('📝 Unmatched Exercises:\n');

    unmatchedExercises.forEach((ex, idx) => {
      console.log(`   ${idx + 1}. ${ex.name}`);
      console.log(`      Category: ${ex.category}`);
      console.log(`      Current Equipment: ${(ex.currentEquipment || ['none']).join(', ')}`);
      console.log('');
    });

    console.log('💡 Alternatively, add patterns to this script:');
    console.log('   Edit scripts/populate-equipment.ts and add new pattern rules\n');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const applyChanges = args.includes('--apply') || args.includes('-a');

populateEquipment(!applyChanges);
