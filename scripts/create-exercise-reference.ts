/**
 * Create exercise naming reference from backup data
 */

import * as fs from 'fs';
import * as path from 'path';

interface Exercise {
  name: string;
  display_name: string | null;
  category: string;
}

async function createReference() {
  // Find most recent backup file
  const backupDir = path.join(process.cwd(), 'backups');
  const files = fs.readdirSync(backupDir);
  const exerciseFiles = files
    .filter(f => f.includes('exercises.json'))
    .sort()
    .reverse();

  if (exerciseFiles.length === 0) {
    console.error('❌ No exercise backup files found');
    return;
  }

  const backupFile = path.join(backupDir, exerciseFiles[0]);
  console.log(`📖 Reading from ${exerciseFiles[0]}...`);

  const exercises: Exercise[] = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));

  // Group by category
  const byCategory = exercises.reduce((acc, ex) => {
    if (!acc[ex.category]) {
      acc[ex.category] = [];
    }
    acc[ex.category].push({
      name: ex.name,
      display: ex.display_name || ex.name
    });
    return acc;
  }, {} as Record<string, { name: string; display: string }[]>);

  // Sort categories by typical workout flow
  const categoryOrder = [
    'Warm-up & Mobility',
    'Olympic Lifting & Barbell Movements',
    'Compound Exercises',
    'Gymnastics & Bodyweight',
    'Core, Abs & Isometric Holds',
    'Cardio & Conditioning',
    'Specialty',
    'Recovery & Stretching',
  ];

  // Create markdown output
  let markdown = '# Exercise Library Reference\n\n';
  markdown += '_Use these exact names (singular, title-cased) in benchmark/forge benchmark descriptions for exercise tracking in the Analysis tab._\n\n';
  markdown += '**Last updated:** ' + new Date().toISOString().split('T')[0] + '\n';
  markdown += '**Total exercises:** ' + exercises.length + '\n\n';

  markdown += '---\n\n';
  markdown += '## 📋 Quick Reference\n\n';
  markdown += '### Format Rules\n\n';
  markdown += '✅ **Correct formats:**\n';
  markdown += '- `10 x Burpee` (singular)\n';
  markdown += '- `25 Push-Up` (if "Push-Up" exists in library)\n';
  markdown += '- `50 Forward Lunge` (use specific variant)\n';
  markdown += '- `100 AbMat Sit-Up` (exact display name)\n';
  markdown += '- `* Airsquat` (bullets work)\n\n';

  markdown += '❌ **Won\'t match:**\n';
  markdown += '- `10 x Burpees` (plural)\n';
  markdown += '- `25 push-ups` (plural, but case-insensitive is OK)\n';
  markdown += '- `50 Lunges` (use specific type: Forward Lunge, Walking Lunge, etc.)\n\n';

  markdown += '### Common Exercises\n\n';
  markdown += '| Exercise | Use This Name |\n';
  markdown += '|----------|---------------|\n';
  markdown += '| Burpees | `Burpee` |\n';
  markdown += '| Push-ups | Find specific variant below (Weighted Push-Up, Rings Push-Up, etc.) |\n';
  markdown += '| Lunges | `Forward Lunge`, `Walking Lunge & Twist`, etc. |\n';
  markdown += '| Sit-ups | `AbMat Sit-Up` |\n';
  markdown += '| Air Squats | `Airsquat` |\n';
  markdown += '| Pull-ups | Find specific variant below |\n';
  markdown += '| Box Jumps | Find specific variant below |\n\n';

  markdown += '---\n\n';
  markdown += '## 📚 Full Exercise Library\n\n';

  // Sort categories
  const sortedCategories = Object.keys(byCategory).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  sortedCategories.forEach(category => {
    const exercises = byCategory[category].sort((a, b) => a.display.localeCompare(b.display));
    markdown += `### ${category} (${exercises.length})\n\n`;

    exercises.forEach(ex => {
      // Show display name prominently, with slug in backticks
      markdown += `- **${ex.display}**`;
      if (ex.name !== ex.display.toLowerCase().replace(/\s+/g, '-')) {
        markdown += ` _(\`${ex.name}\`)_`;
      }
      markdown += '\n';
    });
    markdown += '\n';
  });

  markdown += '---\n\n';
  markdown += '## 🔄 Updating This Reference\n\n';
  markdown += 'When you add new exercises to the database:\n\n';
  markdown += '```bash\n';
  markdown += 'npm run backup\n';
  markdown += 'npx tsx scripts/create-exercise-reference.ts\n';
  markdown += '```\n\n';
  markdown += 'Or ask Claude to update it for you.\n';

  // Write to file
  const outputPath = path.join(process.cwd(), 'EXERCISE_REFERENCE.md');
  fs.writeFileSync(outputPath, markdown);

  console.log(`✅ Created reference with ${exercises.length} exercises`);
  console.log(`📄 Saved to: EXERCISE_REFERENCE.md`);
}

createReference().catch(console.error);
