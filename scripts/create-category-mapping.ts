/**
 * Category Mapping Proposal Generator
 * Maps Cline's incorrect categories to the 8 valid categories
 */

import * as fs from 'fs';

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

// Manual category mapping based on exercise analysis
const CATEGORY_MAPPINGS: Record<string, string> = {
  // Additional Compound Exercises → Split between Gymnastics & Compound
  'Butterfly Pull-Up': 'Gymnastics & Bodyweight',
  'Chest-to-Bar Pull-Up': 'Gymnastics & Bodyweight',
  'Kipping Pull-Up': 'Gymnastics & Bodyweight',
  'Strict Chest-to-Bar Pull-Up': 'Gymnastics & Bodyweight',
  'Wide Grip Pull-Up': 'Gymnastics & Bodyweight',
  'Toes-to-Bar (T2B)': 'Gymnastics & Bodyweight',
  'Archer Push-Up': 'Gymnastics & Bodyweight',
  'Clapping Push-Up': 'Gymnastics & Bodyweight',
  'Diamond Push-Up': 'Gymnastics & Bodyweight',
  'Pike Push-Up': 'Gymnastics & Bodyweight',
  'Ring Push-Up': 'Gymnastics & Bodyweight',
  'ATG Zercher Squat': 'Compound Exercises',
  'Bulgarian Split Squat': 'Compound Exercises',
  'Goblet Squat': 'Compound Exercises',
  'Overhead Squat': 'Compound Exercises',
  'Pause Squat': 'Compound Exercises',
  'Deficit Deadlift': 'Compound Exercises',
  'Romanian Deadlift (RDL)': 'Compound Exercises',
  'Sumo Deadlift': 'Compound Exercises',
  'Trap Bar Deadlift': 'Compound Exercises',

  // Advanced Core Movements → Core, Abs & Isometric Holds
  'Hanging Knee Raise': 'Core, Abs & Isometric Holds',
  'Hanging Leg Raise': 'Core, Abs & Isometric Holds',
  'Strict Toes-to-Bar (ST2B)': 'Core, Abs & Isometric Holds',
  'Plank Shoulder Taps': 'Core, Abs & Isometric Holds',
  'Reverse Snow Angel': 'Core, Abs & Isometric Holds',

  // Running & Athletic Movements → Cardio & Conditioning
  'A-Skip': 'Cardio & Conditioning',
  'B-Skip': 'Cardio & Conditioning',
  'High Knee Run': 'Cardio & Conditioning',
  'Quick Step': 'Cardio & Conditioning',
  'Sprinting': 'Cardio & Conditioning',
  'Hill Sprint': 'Cardio & Conditioning',
  'Chest Pass': 'Specialty',
  'Overhead Med Ball Throw': 'Specialty',
  'Scoop Toss': 'Specialty',
  'Seated Med Ball Throw': 'Specialty',

  // Climbing Movements → Gymnastics & Bodyweight
  'Rope Climb': 'Gymnastics & Bodyweight',
  'Rope Climb Legless': 'Gymnastics & Bodyweight',

  // Kettlebell Specialty → Various categories
  'KB Dead Bug': 'Core, Abs & Isometric Holds',
  'KB Flow Complex': 'Specialty',
  'Banded Leg Lowering': 'Core, Abs & Isometric Holds',
  'Banded Pallof Press': 'Core, Abs & Isometric Holds',
  'Dragon Flag': 'Core, Abs & Isometric Holds',
  'Front Lever': 'Gymnastics & Bodyweight',
  'GHD Back Extension': 'Core, Abs & Isometric Holds',
  'GHD Russian Twist': 'Core, Abs & Isometric Holds',
  'Hollow Body Progression': 'Core, Abs & Isometric Holds',
  'Jefferson Curl': 'Recovery & Stretching',
  'Janda Sit-Up': 'Core, Abs & Isometric Holds',
  'Kneeling Pallof Press': 'Core, Abs & Isometric Holds',
  'Landmine Anti-Rotation Press': 'Core, Abs & Isometric Holds',
  'Medicine Ball Slams': 'Specialty',
  'Overhead Pallof Press': 'Core, Abs & Isometric Holds',
  'Pendlay Row': 'Compound Exercises',
  'Prone Cobra': 'Recovery & Stretching',
  'Reverse Hyper': 'Core, Abs & Isometric Holds',
  'Single Arm Overhead Press': 'Compound Exercises',
  'Active Recovery Walk': 'Recovery & Stretching',
  'Bear Crawl': 'Warm-up & Mobility',
  'Bird Dog': 'Core, Abs & Isometric Holds',
  'Commando Crawl': 'Warm-up & Mobility',
  'Crab Walk': 'Warm-up & Mobility',
  'Duck Walk': 'Warm-up & Mobility',
  'Elbow Bridge': 'Gymnastics & Bodyweight',
  'Fire Hydrants': 'Warm-up & Mobility',
  'Forward Lunge': 'Compound Exercises',
  'Frog Jumps': 'Cardio & Conditioning',
  'Frog Stand': 'Gymnastics & Bodyweight',
  'Good Morning': 'Compound Exercises',
  'Inverted Row': 'Compound Exercises',
  'Lateral Lunge': 'Compound Exercises',
  'Prisoner Squat': 'Compound Exercises',
  'Push-Up to T': 'Gymnastics & Bodyweight',
  'Reverse Lunge': 'Compound Exercises',
  'Russian Twist': 'Core, Abs & Isometric Holds',
  'Shoulder Bridge': 'Gymnastics & Bodyweight',
  'Side Plank': 'Core, Abs & Isometric Holds',
  'Single Leg Bridge': 'Gymnastics & Bodyweight',
  'Spiderman Crawl': 'Warm-up & Mobility',
  'Split Squat': 'Compound Exercises',
  'Squat Therapy': 'Warm-up & Mobility',
  'Step-Back Lunge': 'Compound Exercises',
  'Tuck Jump': 'Cardio & Conditioning',
  'Walking Lunge': 'Compound Exercises',

  // Recovery & Stretching issues → Recategorize Olympic/Specialty items
  'Advanced Tuck Planche': 'Gymnastics & Bodyweight',
  'Barbell Snatch Drill Tall': 'Olympic Lifting & Barbell Movements',
  'BR Alternating Waves': 'Cardio & Conditioning',
  'BR Claps': 'Cardio & Conditioning',
  'BR Double Unders': 'Cardio & Conditioning',
  'BR In-Out': 'Cardio & Conditioning',
  'BR Outside Circles': 'Cardio & Conditioning',
  'BR Single Arm': 'Cardio & Conditioning',
  'BR Slams': 'Cardio & Conditioning',
  'BR Wrist Rolling': 'Warm-up & Mobility',
  'Couch Stretch': 'Recovery & Stretching',
  'Empty Barbell Snatch Complex': 'Olympic Lifting & Barbell Movements',
  'False Grip Ring Row': 'Gymnastics & Bodyweight',
  'False Grip Tuck Swing': 'Gymnastics & Bodyweight',
  'Freestanding Handstand': 'Gymnastics & Bodyweight',
  'Front Squat Pause': 'Compound Exercises',
  'Front Squat with Bands': 'Compound Exercises',
  'Front Squat with Chains': 'Compound Exercises',
  'Handstand Pirouette': 'Gymnastics & Bodyweight',
  'Handstand Tuck Planche': 'Gymnastics & Bodyweight',
  'Handstand Walking': 'Gymnastics & Bodyweight',
  'Hang Clean RDL Complex': 'Olympic Lifting & Barbell Movements',
  'Hang Power Clean (HPC)': 'Olympic Lifting & Barbell Movements',
  'Hang Power Snatch (HPS)': 'Olympic Lifting & Barbell Movements',
  'L-Sit on Rings': 'Gymnastics & Bodyweight',
  'L-Sit to Handstand': 'Gymnastics & Bodyweight',
  'Overhead Squat (OHS)': 'Olympic Lifting & Barbell Movements',
  'Planche Leans': 'Gymnastics & Bodyweight',
  'Power Clean (PC)': 'Olympic Lifting & Barbell Movements',
  'Press to Handstand from L (GoWOD)': 'Gymnastics & Bodyweight',
  'Push Press (PP)': 'Olympic Lifting & Barbell Movements',
  'Ring Muscle-Up Transitions': 'Gymnastics & Bodyweight',
  'Ring Support Base': 'Gymnastics & Bodyweight',
  'Ring Support Hold': 'Gymnastics & Bodyweight',
  'Sandbag Carry Overhead': 'Specialty',
  'Sandbag Clean': 'Specialty',
  'Sandbag Get Up': 'Specialty',
  'Sandbag Load': 'Specialty',
  'Sandbag Over Shoulder': 'Specialty',
  'Sandbag Zercher Squat': 'Specialty',
  'Sled Drag': 'Specialty',
  'Sliding Leg Curl': 'Compound Exercises',
  'Snatch Balance': 'Olympic Lifting & Barbell Movements',
  'Snatch Pull from Blocks': 'Olympic Lifting & Barbell Movements',
  'Split Jerk (SJ)': 'Olympic Lifting & Barbell Movements',
  'Strict Ring Muscle-Up': 'Gymnastics & Bodyweight',
  'Tall Snatch': 'Olympic Lifting & Barbell Movements',
  'Tire Drill': 'Specialty',
  'Tire Flip': 'Specialty',
  'Tire Hit (Axe)': 'Specialty',
  'Tire Run Position': 'Specialty',
  'TIW Death March': 'Specialty',
  'TIW Farmers Carry': 'Specialty',
  'VT Clubbell Carry': 'Specialty',

  // Olympic Lifting & Barbell Movements that are already correct
  'Barbell Front Squat': 'Olympic Lifting & Barbell Movements',
  'KB Clean & Press': 'Olympic Lifting & Barbell Movements',
  'KB Swing': 'Olympic Lifting & Barbell Movements',
  'Push-up': 'Gymnastics & Bodyweight', // Not Olympic
  'Ring Muscle-Up': 'Gymnastics & Bodyweight', // Not Olympic

  // Already correct categories - just verify
  'Strict Pull-Up': 'Gymnastics & Bodyweight',
  '90/90 Hip Switch': 'Warm-up & Mobility',
};

function generateMapping() {
  console.log('📋 Category Mapping Proposal\n');
  console.log('=' .repeat(80));
  console.log('\n');

  // Group by new category
  const byNewCategory: Record<string, string[]> = {};

  for (const [exercise, newCategory] of Object.entries(CATEGORY_MAPPINGS)) {
    if (!byNewCategory[newCategory]) {
      byNewCategory[newCategory] = [];
    }
    byNewCategory[newCategory].push(exercise);
  }

  // Sort categories
  const sortedCategories = VALID_CATEGORIES.filter(cat => byNewCategory[cat]);

  console.log('## Proposed Category Mappings\n');
  console.log(`Total exercises to remap: ${Object.keys(CATEGORY_MAPPINGS).length}\n`);

  for (const category of sortedCategories) {
    const exercises = byNewCategory[category].sort();
    console.log(`### ${category} (${exercises.length} exercises)\n`);
    for (const ex of exercises) {
      console.log(`- ${ex}`);
    }
    console.log('');
  }

  // Summary by category
  console.log('## Summary by Target Category\n');
  console.log('| Category | Count |');
  console.log('|:---|---:|');
  for (const category of VALID_CATEGORIES) {
    const count = byNewCategory[category]?.length || 0;
    console.log(`| ${category} | ${count} |`);
  }
  console.log('');

  // Save to file
  const outputPath = 'database/testing-area/category-mapping-proposal.md';
  let content = '# Category Mapping Proposal\n\n';
  content += `**Generated:** ${new Date().toISOString()}\n\n`;
  content += '---\n\n';
  content += '## Overview\n\n';
  content += `This document proposes category corrections for ${Object.keys(CATEGORY_MAPPINGS).length} exercises.\n\n`;
  content += 'Cline created 5 invalid categories. This mapping reassigns all exercises to the 8 valid categories.\n\n';

  content += '## Proposed Mappings\n\n';

  for (const category of sortedCategories) {
    const exercises = byNewCategory[category].sort();
    content += `### ${category} (${exercises.length})\n\n`;
    for (const ex of exercises) {
      content += `- ${ex}\n`;
    }
    content += '\n';
  }

  content += '## Summary\n\n';
  content += '| Category | Count |\n';
  content += '|:---|---:|\n';
  for (const category of VALID_CATEGORIES) {
    const count = byNewCategory[category]?.length || 0;
    content += `| ${category} | ${count} |\n`;
  }
  content += '\n';

  content += '## Decision\n\n';
  content += '- [ ] Approve all mappings\n';
  content += '- [ ] Approve with modifications (list below)\n';
  content += '- [ ] Reject\n\n';
  content += '**Modifications:**\n\n';
  content += '```\n';
  content += '(List any exercises that should be in different categories)\n';
  content += '```\n';

  fs.writeFileSync(outputPath, content, 'utf-8');

  console.log('=' .repeat(80));
  console.log('\n✅ Category mapping proposal saved!');
  console.log(`📄 File: ${outputPath}\n`);
}

generateMapping();
