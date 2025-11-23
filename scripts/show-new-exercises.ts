/**
 * Show Truly New Exercises
 * Lists the 144 exercises that are genuinely new (not duplicates)
 */

import * as fs from 'fs';

interface Exercise {
  name: string;
  category: string;
  description?: string;
  body_parts?: string[];
  tags?: string[];
  equipment?: string[];
  difficulty?: string;
  subcategory?: string;
}

// List of all 113 duplicates to exclude (110 confirmed + 3 from user decisions)
const DUPLICATES_TO_REMOVE = new Set([
  '90/90',
  '90° Ext. Rotation (SU)',
  'AbMat Sit-Up',
  'Active Spiderman Stretch',
  'Airsquat',
  'Alt. Pigeon Pose',
  'Arm Circles',
  'Arm Rotations',
  'ATG FHL Calf Raise',
  'ATG KoT Calf Raise',
  'ATG Patrick Step Up',
  'ATG Peterson Step Up',
  'ATG Poliquin Step Up',
  'ATG Split Squat',
  'ATG Split Squat - Loaded',
  'ATG Split Squat w OH PVC',
  'ATG Split Squat w OH RB',
  'ATG Tibialis Raise',
  'Backwards Walk',
  'Barbell Back Squat',
  'Barbell Clean',
  'Barbell Clean Drill: Rack Delivery',
  'Barbell Clean Drill: Tall Clean',
  'Barbell Deadlift',
  'Barbell Snatch',
  'Battle Rope',
  'Bicycles',
  'Box Jump',
  'Broad Jump',
  'Burpee',
  'Burpee Box Jump Over',
  'Child\'s Pose',
  'Crunchy Frog',
  'DB Bench Press',
  'Deep Squat Hold',
  'Fifer Scissors',
  'FR Adductor (GoWOD)',
  'FR Calf',
  'FR Glute (GoWOD)',
  'FR Hamstring (GoWOD)',
  'FR Lat (GoWOD)',
  'FR Quad (GoWOD)',
  'FR Specific Lower Back',
  'FR Upper Back',
  'Front Scale',
  'GHD Hip Extension',
  'GHD Sit-Up',
  'Half Bridge',
  'Half Lotus (GoWOD)',
  'Handstand Hold',
  'Handstand Shoulder Taps',
  'Hip Elevation to Rear Push-Up',
  'Hip Rock And Raise',
  'Hollow Hold',
  'Hollow Rocks',
  'Impossible Plank',
  'In and Outs',
  'Inchworm',
  'Jumping Jacks',
  'KB Deadlift',
  'KB Goblet Squat',
  'Lat (GoWOD)',
  'Lat Stretch (GoWOD)',
  'Leg Climbs',
  'Walking Lunge', // Word reorder duplicate of "Lunge Walking"
  'Mason Twist',
  'Mule Kick',
  'Oblique V-Ups',
  'Parallettes L-Sit Hold',
  'Piriformis Supine',
  'Plank',
  'Plank - Rotating',
  'Plank + Target Tap',
  'Kipping Pull-Up', // Word reorder duplicate of "Pull-Up Kipping"
  'Strict Pull-Up', // Word reorder duplicate of "Pull-Up Strict"
  'Pulse Ups or Heels to the Heavens',
  'Diamond Push-Up', // Word reorder duplicate of "Push-up Diamond"
  'Quadruped Hold',
  'Reverse Leg Lift',
  'Reverse Plank',
  'Rope Climb',
  'Scorpion',
  'Seated Leg Raise',
  'Seated Neck Stretch',
  'Side Pretzel Stretch',
  'Side-Arm Balance',
  'Single Leg Bridge',
  'Single-Arm Bridge with OH Reach',
  'Single-Leg Half Bridge',
  'Sled Push',
  'Sphynx',
  'Spinal Stretch',
  'Superman Double Pump',
  'Superman Hold',
  'Superman Rocks',
  'Table Top',
  'Table Top Toe Touch',
  'TFL (Conor Harris)',
  'Up-Down',
  'V-Sit (GoWOD)',
  'V-Stretch (GoWOD)',
  'V-Up/Roll Up',
  'Wall Hinge (GoWOD)',
  'Wall Sit',
  'WB Seated Russian Twist',
  'Windmill Toe-Tap',
  '90/90 Hip Switch', // Duplicate of 90/90
  'Push-up', // Generic duplicate
  'Ring Muscle-Up', // Duplicate
  // 3 likely duplicates user chose to remove:
  'Cross Lac Leg/ Wide Leg Sit-Ups', // Typo version - keeping original
  'Hang Power Clean (HPC)', // Remove - keeping "Barbell Hang Power Clean (HPC)"
  'Hang Power Snatch (HPS)', // Remove - keeping "Barbell Hang Power Snatch (HPS)"
]);

// Category mapping for the new exercises
const CATEGORY_MAPPINGS: Record<string, string> = {
  // Warm-up & Mobility
  'Bear Crawl': 'Warm-up & Mobility',
  'Commando Crawl': 'Warm-up & Mobility',
  'Crab Walk': 'Warm-up & Mobility',
  'Duck Walk': 'Warm-up & Mobility',
  'Fire Hydrants': 'Warm-up & Mobility',
  'Spiderman Crawl': 'Warm-up & Mobility',
  'Squat Therapy': 'Warm-up & Mobility',
  'BR Wrist Rolling': 'Warm-up & Mobility',

  // Olympic Lifting & Barbell Movements
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

  // Compound Exercises
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

  // Gymnastics & Bodyweight
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

  // Core, Abs & Isometric Holds
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

  // Cardio & Conditioning
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

  // Specialty
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

  // Recovery & Stretching
  'Active Recovery Walk': 'Recovery & Stretching',
  'Couch Stretch': 'Recovery & Stretching',
  'Jefferson Curl': 'Recovery & Stretching',
  'Prone Cobra': 'Recovery & Stretching',

  // New additions user approved
  'ATG KoT Calf Raise Unilateral': 'Warm-up & Mobility',

  // Additional exercises that need mapping
  'Curl Up': 'Core, Abs & Isometric Holds',
  'Farmer\'s Carry (DB/KB)': 'Specialty',
  'L-Sit Hold': 'Core, Abs & Isometric Holds',
  'Pullover Sit-Up': 'Core, Abs & Isometric Holds',
  'Wall Ball': 'Specialty',
};

function showNewExercises() {
  console.log('📋 Truly New Exercises (144)\n');
  console.log('=' .repeat(80));
  console.log('\n');

  // Parse Cline's enhanced file
  const enhancedPath = 'database/testing-area/exercises-enhanced-sample.md';
  const enhancedContent = fs.readFileSync(enhancedPath, 'utf-8');

  const exercises: Exercise[] = [];
  const lines = enhancedContent.split('\n');
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
        exercises.push(currentExercise as Exercise);
      }
      const name = trimmed.substring(7, trimmed.length - 2).trim();
      currentExercise = { name, category: currentCategory };
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
    exercises.push(currentExercise as Exercise);
  }

  // Filter out duplicates
  const newExercises = exercises.filter(ex => !DUPLICATES_TO_REMOVE.has(ex.name));

  console.log(`Found ${newExercises.length} truly new exercises\n`);

  // Group by corrected category
  const byCategory: Record<string, Exercise[]> = {};

  for (const ex of newExercises) {
    const correctCategory = CATEGORY_MAPPINGS[ex.name] || ex.category;
    if (!byCategory[correctCategory]) {
      byCategory[correctCategory] = [];
    }
    byCategory[correctCategory].push(ex);
  }

  // Display by category
  const VALID_CATEGORIES = [
    'Warm-up & Mobility',
    'Olympic Lifting & Barbell Movements',
    'Compound Exercises',
    'Gymnastics & Bodyweight',
    'Core, Abs & Isometric Holds',
    'Cardio & Conditioning',
    'Specialty',
    'Recovery & Stretching'
  ];

  for (const category of VALID_CATEGORIES) {
    const exercises = byCategory[category];
    if (!exercises || exercises.length === 0) continue;

    console.log(`## ${category} (${exercises.length})\n`);

    for (const ex of exercises.sort((a, b) => a.name.localeCompare(b.name))) {
      console.log(`### ${ex.name}`);
      if (ex.description) {
        const shortDesc = ex.description.length > 150
          ? ex.description.substring(0, 150) + '...'
          : ex.description;
        console.log(`${shortDesc}`);
      }
      if (ex.body_parts && ex.body_parts.length > 0) {
        console.log(`**Body Parts:** ${ex.body_parts.slice(0, 5).join(', ')}${ex.body_parts.length > 5 ? '...' : ''}`);
      }
      console.log('');
    }
  }

  // Summary
  console.log('=' .repeat(80));
  console.log('\n## Summary\n');
  for (const category of VALID_CATEGORIES) {
    const count = byCategory[category]?.length || 0;
    if (count > 0) {
      console.log(`${category}: ${count}`);
    }
  }
  console.log(`\nTotal: ${newExercises.length} new exercises`);

  // Save to file
  const reportPath = 'database/testing-area/new-exercises-review.md';
  let report = '# New Exercises for Review (144)\n\n';
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  report += 'These are the truly new exercises after removing 113 duplicates.\n\n';
  report += '---\n\n';

  for (const category of VALID_CATEGORIES) {
    const exercises = byCategory[category];
    if (!exercises || exercises.length === 0) continue;

    report += `## ${category} (${exercises.length})\n\n`;

    for (const ex of exercises.sort((a, b) => a.name.localeCompare(b.name))) {
      report += `### ${ex.name}\n\n`;
      if (ex.description) {
        report += `**Description:** ${ex.description}\n\n`;
      }
      if (ex.body_parts && ex.body_parts.length > 0) {
        report += `**Body Parts:** ${ex.body_parts.join(', ')}\n\n`;
      }
      if (ex.tags && ex.tags.length > 0) {
        report += `**Tags:** ${ex.tags.join(', ')}\n\n`;
      }
      if (ex.equipment && ex.equipment.length > 0) {
        report += `**Equipment:** ${ex.equipment.join(', ')}\n\n`;
      }
      if (ex.difficulty) {
        report += `**Difficulty:** ${ex.difficulty}\n\n`;
      }
      report += `**Decision:** [ ] Keep / [ ] Remove\n\n`;
      report += '---\n\n';
    }
  }

  report += '## Summary\n\n';
  for (const category of VALID_CATEGORIES) {
    const count = byCategory[category]?.length || 0;
    if (count > 0) {
      report += `- ${category}: ${count}\n`;
    }
  }
  report += `\n**Total:** ${newExercises.length} new exercises\n`;

  fs.writeFileSync(reportPath, report, 'utf-8');

  console.log('\n✅ Review document created!');
  console.log(`📄 File: ${reportPath}\n`);
}

showNewExercises();
