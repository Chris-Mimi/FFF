/**
 * Merge Exercises
 * Reads the reviewed markdown file, extracts exercises marked "Keep",
 * merges with existing database, and creates final import JSON
 */

import * as fs from 'fs';

interface Exercise {
  name: string;
  display_name: string;
  category: string;
  subcategory?: string;
  equipment?: string[];
  body_parts?: string[];
  tags?: string[];
  difficulty?: string;
  is_warmup?: boolean;
  is_stretch?: boolean;
  search_terms?: string;
  description?: string;
  video_url?: string;
}

// Category mappings from earlier analysis
const CATEGORY_MAPPINGS: Record<string, string> = {
  'ATG KoT Calf Raise Unilateral': 'Warm-up & Mobility',
  'Bear Crawl': 'Warm-up & Mobility',
  'BR Wrist Rolling': 'Warm-up & Mobility',
  'Commando Crawl': 'Warm-up & Mobility',
  'Crab Walk': 'Warm-up & Mobility',
  'Duck Walk': 'Warm-up & Mobility',
  'Fire Hydrants': 'Warm-up & Mobility',
  'Spiderman Crawl': 'Warm-up & Mobility',
  'Squat Therapy': 'Warm-up & Mobility',
  'Barbell Front Squat': 'Olympic Lifting & Barbell Movements',
  'Barbell Snatch Drill Tall': 'Olympic Lifting & Barbell Movements',
  'Empty Barbell Snatch Complex': 'Olympic Lifting & Barbell Movements',
  'Hang Clean RDL Complex': 'Olympic Lifting & Barbell Movements',
  'KB Clean & Press': 'Olympic Lifting & Barbell Movements',
  'KB Swing': 'Olympic Lifting & Barbell Movements',
  'Overhead Squat (OHS)': 'Olympic Lifting & Barbell Movements',
  'Power Clean (PC)': 'Olympic Lifting & Barbell Movements',
  'Push Press (PP)': 'Olympic Lifting & Barbell Movements',
  'Snatch Balance': 'Olympic Lifting & Barbell Movements',
  'Snatch Pull from Blocks': 'Olympic Lifting & Barbell Movements',
  'Split Jerk (SJ)': 'Olympic Lifting & Barbell Movements',
  'Tall Snatch': 'Olympic Lifting & Barbell Movements',
  'ATG Zercher Squat': 'Compound Exercises',
  'Bulgarian Split Squat': 'Compound Exercises',
  'Deficit Deadlift': 'Compound Exercises',
  'Forward Lunge': 'Compound Exercises',
  'Front Squat Pause': 'Compound Exercises',
  'Front Squat with Bands': 'Compound Exercises',
  'Front Squat with Chains': 'Compound Exercises',
  'Goblet Squat': 'Compound Exercises',
  'Good Morning': 'Compound Exercises',
  'Inverted Row': 'Compound Exercises',
  'Lateral Lunge': 'Compound Exercises',
  'Overhead Squat': 'Compound Exercises',
  'Pause Squat': 'Compound Exercises',
  'Pendlay Row': 'Compound Exercises',
  'Prisoner Squat': 'Compound Exercises',
  'Reverse Lunge': 'Compound Exercises',
  'Romanian Deadlift (RDL)': 'Compound Exercises',
  'Single Arm Overhead Press': 'Compound Exercises',
  'Sliding Leg Curl': 'Compound Exercises',
  'Split Squat': 'Compound Exercises',
  'Step-Back Lunge': 'Compound Exercises',
  'Sumo Deadlift': 'Compound Exercises',
  'Trap Bar Deadlift': 'Compound Exercises',
  'Advanced Tuck Planche': 'Gymnastics & Bodyweight',
  'Archer Push-Up': 'Gymnastics & Bodyweight',
  'Butterfly Pull-Up': 'Gymnastics & Bodyweight',
  'Chest-to-Bar Pull-Up': 'Gymnastics & Bodyweight',
  'Clapping Push-Up': 'Gymnastics & Bodyweight',
  'Elbow Bridge': 'Gymnastics & Bodyweight',
  'False Grip Ring Row': 'Gymnastics & Bodyweight',
  'False Grip Tuck Swing': 'Gymnastics & Bodyweight',
  'Freestanding Handstand': 'Gymnastics & Bodyweight',
  'Frog Stand': 'Gymnastics & Bodyweight',
  'Front Lever': 'Gymnastics & Bodyweight',
  'Handstand Pirouette': 'Gymnastics & Bodyweight',
  'Handstand Tuck Planche': 'Gymnastics & Bodyweight',
  'Handstand Walking': 'Gymnastics & Bodyweight',
  'L-Sit on Rings': 'Gymnastics & Bodyweight',
  'L-Sit to Handstand': 'Gymnastics & Bodyweight',
  'Pike Push-Up': 'Gymnastics & Bodyweight',
  'Planche Leans': 'Gymnastics & Bodyweight',
  'Press to Handstand from L (GoWOD)': 'Gymnastics & Bodyweight',
  'Push-Up to T': 'Gymnastics & Bodyweight',
  'Ring Muscle-Up Transitions': 'Gymnastics & Bodyweight',
  'Ring Push-Up': 'Gymnastics & Bodyweight',
  'Ring Support Base': 'Gymnastics & Bodyweight',
  'Ring Support Hold': 'Gymnastics & Bodyweight',
  'Rope Climb Legless': 'Gymnastics & Bodyweight',
  'Shoulder Bridge': 'Gymnastics & Bodyweight',
  'Strict Chest-to-Bar Pull-Up': 'Gymnastics & Bodyweight',
  'Strict Ring Muscle-Up': 'Gymnastics & Bodyweight',
  'Toes-to-Bar (T2B)': 'Gymnastics & Bodyweight',
  'Wide Grip Pull-Up': 'Gymnastics & Bodyweight',
  'Banded Leg Lowering': 'Core, Abs & Isometric Holds',
  'Banded Pallof Press': 'Core, Abs & Isometric Holds',
  'Bird Dog': 'Core, Abs & Isometric Holds',
  'Dragon Flag': 'Core, Abs & Isometric Holds',
  'GHD Back Extension': 'Core, Abs & Isometric Holds',
  'GHD Russian Twist': 'Core, Abs & Isometric Holds',
  'Hanging Knee Raise': 'Core, Abs & Isometric Holds',
  'Hanging Leg Raise': 'Core, Abs & Isometric Holds',
  'Hollow Body Progression': 'Core, Abs & Isometric Holds',
  'Janda Sit-Up': 'Core, Abs & Isometric Holds',
  'KB Dead Bug': 'Core, Abs & Isometric Holds',
  'Kneeling Pallof Press': 'Core, Abs & Isometric Holds',
  'Landmine Anti-Rotation Press': 'Core, Abs & Isometric Holds',
  'Overhead Pallof Press': 'Core, Abs & Isometric Holds',
  'Plank Shoulder Taps': 'Core, Abs & Isometric Holds',
  'Reverse Hyper': 'Core, Abs & Isometric Holds',
  'Reverse Snow Angel': 'Core, Abs & Isometric Holds',
  'Russian Twist': 'Core, Abs & Isometric Holds',
  'Side Plank': 'Core, Abs & Isometric Holds',
  'Strict Toes-to-Bar (ST2B)': 'Core, Abs & Isometric Holds',
  'Curl Up': 'Core, Abs & Isometric Holds',
  'L-Sit Hold': 'Core, Abs & Isometric Holds',
  'Pullover Sit-Up': 'Core, Abs & Isometric Holds',
  'A-Skip': 'Cardio & Conditioning',
  'B-Skip': 'Cardio & Conditioning',
  'BR Alternating Waves': 'Cardio & Conditioning',
  'BR Claps': 'Cardio & Conditioning',
  'BR Double Unders': 'Cardio & Conditioning',
  'BR In-Out': 'Cardio & Conditioning',
  'BR Outside Circles': 'Cardio & Conditioning',
  'BR Single Arm': 'Cardio & Conditioning',
  'BR Slams': 'Cardio & Conditioning',
  'Frog Jumps': 'Cardio & Conditioning',
  'High Knee Run': 'Cardio & Conditioning',
  'Hill Sprint': 'Cardio & Conditioning',
  'Quick Step': 'Cardio & Conditioning',
  'Sprinting': 'Cardio & Conditioning',
  'Tuck Jump': 'Cardio & Conditioning',
  'Chest Pass': 'Specialty',
  'KB Flow Complex': 'Specialty',
  'Medicine Ball Slams': 'Specialty',
  'Overhead Med Ball Throw': 'Specialty',
  'Sandbag Carry Overhead': 'Specialty',
  'Sandbag Clean': 'Specialty',
  'Sandbag Get Up': 'Specialty',
  'Sandbag Load': 'Specialty',
  'Sandbag Over Shoulder': 'Specialty',
  'Sandbag Zercher Squat': 'Specialty',
  'Scoop Toss': 'Specialty',
  'Seated Med Ball Throw': 'Specialty',
  'Sled Drag': 'Specialty',
  'TIW Death March': 'Specialty',
  'TIW Farmers Carry': 'Specialty',
  'Tire Drill': 'Specialty',
  'Tire Flip': 'Specialty',
  'Tire Hit (Axe)': 'Specialty',
  'Tire Run Position': 'Specialty',
  'VT Clubbell Carry': 'Specialty',
  'Farmer\'s Carry (DB/KB)': 'Specialty',
  'Wall Ball': 'Specialty',
  'Active Recovery Walk': 'Recovery & Stretching',
  'Couch Stretch': 'Recovery & Stretching',
  'Jefferson Curl': 'Recovery & Stretching',
  'Prone Cobra': 'Recovery & Stretching',
};

function parseReviewedMarkdown(): Array<{name: string, category: string}> {
  console.log('📄 Reading reviewed exercises...\n');

  const reviewPath = 'database/testing-area/new-exercises-review.md';
  const content = fs.readFileSync(reviewPath, 'utf-8');
  const lines = content.split('\n');

  const keptExercises: Array<{name: string, category: string}> = [];
  let currentExercise = '';
  let currentCategory = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Category header
    if (line.match(/^##\s+(.+)\s+\(\d+\)/)) {
      const match = line.match(/^##\s+(.+)\s+\(\d+\)/);
      if (match) {
        currentCategory = match[1];
      }
      continue;
    }

    // Exercise name
    if (line.startsWith('### ')) {
      currentExercise = line.substring(4).trim();
      continue;
    }

    // Decision line
    if (line.includes('**Decision:**')) {
      // Check if marked as Keep (various checkbox formats)
      if (line.match(/\[[xX ]*[xX][xX ]*\]\s*Keep/)) {
        keptExercises.push({
          name: currentExercise,
          category: currentCategory
        });
      }
    }
  }

  console.log(`✓ Found ${keptExercises.length} exercises marked to keep\n`);
  return keptExercises;
}

function loadEnhancedExerciseDetails(): Map<string, Exercise> {
  console.log('📥 Loading enhanced exercise details...\n');

  const enhancedPath = 'database/testing-area/exercises-enhanced-sample.md';
  const content = fs.readFileSync(enhancedPath, 'utf-8');
  const lines = content.split('\n');

  const exerciseMap = new Map<string, Exercise>();
  let currentExercise: Partial<Exercise> | null = null;
  let currentCategory = '';

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.match(/^##\s+\d+\.\s+/)) {
      currentCategory = trimmed.replace(/^##\s+\d+\.\s+/, '').trim();
      continue;
    }

    if (trimmed.startsWith('#### **') && trimmed.endsWith('**')) {
      if (currentExercise && currentExercise.name) {
        exerciseMap.set(currentExercise.name, currentExercise as Exercise);
      }
      const name = trimmed.substring(7, trimmed.length - 2).trim();
      currentExercise = {
        name,
        display_name: name,
        category: currentCategory,
        equipment: [],
        body_parts: [],
        tags: []
      };
      continue;
    }

    if (!currentExercise) continue;

    if (trimmed.startsWith('- **Body Parts:**')) {
      const bodyStr = trimmed.substring(17).trim();
      if (bodyStr && bodyStr !== 'None') {
        currentExercise.body_parts = bodyStr.split(',').map(b => b.trim());
      }
    } else if (trimmed.startsWith('- **Tags:**')) {
      const tagsStr = trimmed.substring(11).trim();
      if (tagsStr && tagsStr !== 'None') {
        currentExercise.tags = tagsStr.split(',').map(t => t.trim());
      }
    } else if (trimmed.startsWith('- **Description:**')) {
      currentExercise.description = trimmed.substring(18).trim();
    } else if (trimmed.startsWith('- **Equipment:**')) {
      const equipStr = trimmed.substring(16).trim();
      if (equipStr && equipStr !== 'None') {
        currentExercise.equipment = equipStr.split(',').map(e => e.trim());
      }
    } else if (trimmed.startsWith('- **Difficulty:**')) {
      currentExercise.difficulty = trimmed.substring(17).trim().toLowerCase();
    } else if (trimmed.startsWith('- **Subcategory:**')) {
      currentExercise.subcategory = trimmed.substring(18).trim();
    }
  }

  if (currentExercise && currentExercise.name) {
    exerciseMap.set(currentExercise.name, currentExercise as Exercise);
  }

  console.log(`✓ Loaded ${exerciseMap.size} enhanced exercise details\n`);
  return exerciseMap;
}

function mergeExercises() {
  console.log('🔀 Exercise Merge Tool\n');
  console.log('=' .repeat(80));
  console.log('\n');

  // Parse reviewed exercises
  const keptExercises = parseReviewedMarkdown();

  if (keptExercises.length === 0) {
    console.error('❌ No exercises marked to keep! Check your markdown file.');
    process.exit(1);
  }

  // Load enhanced details
  const enhancedDetails = loadEnhancedExerciseDetails();

  // Load current database
  console.log('📥 Loading current database...\n');
  const currentPath = 'database/testing-area/exercises-current.json';
  const currentExercises: Exercise[] = JSON.parse(fs.readFileSync(currentPath, 'utf-8'));
  console.log(`✓ Loaded ${currentExercises.length} existing exercises\n`);

  // Build new exercises array
  const newExercises: Exercise[] = [];

  for (const kept of keptExercises) {
    const details = enhancedDetails.get(kept.name);

    if (!details) {
      console.warn(`⚠️  Warning: No details found for "${kept.name}", skipping...`);
      continue;
    }

    // Use the corrected category from mapping or the reviewed category
    const correctCategory = CATEGORY_MAPPINGS[kept.name] || kept.category;

    // Create exercise object with corrected category
    const exercise: Exercise = {
      name: kept.name, // Use the name from review (user may have changed it)
      display_name: kept.name,
      category: correctCategory,
      description: details.description || '',
      body_parts: details.body_parts || [],
      tags: details.tags || [],
      equipment: details.equipment || [],
      difficulty: details.difficulty,
      subcategory: details.subcategory,
      is_warmup: correctCategory === 'Warm-up & Mobility',
      is_stretch: correctCategory === 'Recovery & Stretching',
      search_terms: `${kept.name.toLowerCase()} ${correctCategory.toLowerCase()} ${(details.tags || []).join(' ').toLowerCase()}`
    };

    newExercises.push(exercise);
  }

  console.log(`✓ Prepared ${newExercises.length} new exercises\n`);

  // Merge with existing
  const mergedExercises = [...currentExercises, ...newExercises];

  // Sort by category, then name
  mergedExercises.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });

  console.log('📊 Merge Summary:\n');
  console.log(`Existing exercises: ${currentExercises.length}`);
  console.log(`New exercises: ${newExercises.length}`);
  console.log(`Total exercises: ${mergedExercises.length}`);
  console.log('');

  // Category breakdown
  const categoryCounts: Record<string, number> = {};
  for (const ex of mergedExercises) {
    categoryCounts[ex.category] = (categoryCounts[ex.category] || 0) + 1;
  }

  console.log('Category breakdown:');
  for (const [cat, count] of Object.entries(categoryCounts).sort()) {
    console.log(`  ${cat}: ${count}`);
  }
  console.log('');

  // Write merged file
  const outputPath = 'database/testing-area/exercises-merged-final.json';
  fs.writeFileSync(outputPath, JSON.stringify(mergedExercises, null, 2), 'utf-8');

  const fileSize = (fs.statSync(outputPath).size / 1024).toFixed(2);

  console.log('=' .repeat(80));
  console.log('\n✅ Merge complete!\n');
  console.log(`📄 Output file: ${outputPath}`);
  console.log(`📦 File size: ${fileSize} KB`);
  console.log(`📊 Total exercises: ${mergedExercises.length}\n`);
}

mergeExercises();
