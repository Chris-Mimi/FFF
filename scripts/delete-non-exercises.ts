import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// All naming conventions, abbreviations, resources, and summary notes to delete
const NON_EXERCISES = [
  // Naming Conventions - Equipment
  '**BB** = Barbell',
  '**BR** = Ball Roll (NOTE: Normally BS for Ball Smash, but we use BS for Back Squat, so renamed to BR)',
  '**C2** = Concept2 (Rower/Skierg)',
  '**DB** = Dumbbell',
  '**FR** = Foam Roller',
  '**GHD** = Glute-Ham Developer',
  '**KB** = Kettlebell',
  '**MB** = Medicine Ball',
  '**PVC** = PVC Pipe',
  '**RB** = Resistance Band',
  '**SB** = Sandbag',
  '**TRX** = TRX Suspension Trainer',
  '**WB** = Wallball',

  // Naming Conventions - Movement Types
  '**AKBS** = American Kettlebell Swing',
  '**Alt.** = Alternating',
  '**ATG** = Ass-to-Grass',
  '**BSS** = Bulgarian Split Squat',
  '**C&P** = Clean & Press',
  '**C2B** = Chest to Bar',
  '**DL** = Deadlift',
  '**DUs** = Double-Unders',
  '**SU** = Single Unders',
  '**FS** = Front Squat',
  '**HPC** = Hang Power Clean',
  '**HPS** = Hang Power Snatch',
  '**HSPU** = Handstand Push-Up',
  '**HSW** = Handstand Walk',
  '**OH** = Overhead',
  '**OHP** = Overhead Press',
  '**OHS** = Overhead Squat',
  '**OTB** = Over the Box',
  '**PJ** = Push Jerk',
  '**PP** = Push Press',
  '**PT** = Pass Through',
  '**RDL** = Romanian Deadlift',
  '**RKBS** = Russian Kettlebell Swing',
  '**SU** = Single-Unders (also Squat University)',
  '**T2B** = Toes to Bar',
  '**TGU** = Turkish Get-Up',
  '**WGS** = World\'s Greatest Stretch',

  // Naming Conventions - Anatomical
  '**Dbl** = Double',
  '**FHL** = Flexor Hallucis Longus',
  '**KoT** = Knee Over Toe',
  '**TFL** = Tensor Fascia Latae',

  // Naming Conventions - Movement Patterns
  '**ATY** = (ITY) Shape of letters during movement',
  '**PNF** = Proprioceptive Neuromuscular Facilitation',

  // Resources
  '**GoWOD** = Mobility app/program',
  '**GMB** = Gold Medal Bodies (GMB Fitness)',
  '**SU** = Squat University (Dr. Aaron Horschig)',
  '**Catalyst** = Catalyst Athletics Olympic Weightlifting',
  '**Saturno** = Gymnastics Mobility program',
  '**Torokhtiy** = Olympic Weightlifting program',
  '**Power Monkey** = Gymnastics program (Dave Durante)',
  '**Wildman Athletica** = Kettlebell program (Mark Wildman)',
  '**P90X** = Full fitness program, Ab Ripper X (Tony Horton)',

  // Summary notes
  '56% fewer categories than original (8 vs 18) = faster dropdown navigation',
  'Merged Olympic & Barbell for efficient strength programming',
  'Combined Compound movements into single category',
  'Unified Core/Abs with Isometric Holds for complete core training',
  'Added P90X Ab Ripper X exercises for variety',
];

async function deleteNonExercises() {
  console.log('🧹 Cleaning Exercise Database\n');
  console.log(`Deleting ${NON_EXERCISES.length} non-exercise entries...\n`);

  let deletedCount = 0;
  let notFoundCount = 0;

  for (const name of NON_EXERCISES) {
    const { error, count } = await supabase
      .from('exercises')
      .delete({ count: 'exact' })
      .eq('name', name);

    if (error) {
      console.error(`❌ Error deleting "${name}":`, error.message);
    } else if (count === 0) {
      notFoundCount++;
      console.log(`⚠️  Not found: "${name}"`);
    } else {
      deletedCount++;
      console.log(`✓ Deleted: "${name}"`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Deleted: ${deletedCount}`);
  console.log(`   Not found: ${notFoundCount}`);
  console.log(`   Total processed: ${NON_EXERCISES.length}`);

  // Get new exercise count
  const { count } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true });

  console.log(`\n✅ Database now has ${count} actual exercises`);
}

deleteNonExercises();
