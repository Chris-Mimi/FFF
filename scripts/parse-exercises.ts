import * as fs from 'fs';
import * as path from 'path';

interface Exercise {
  name: string;
  display_name: string;
  category: string;
  subcategory: string;
  equipment: string[];
  body_parts: string[];
  difficulty: string;
  is_warmup: boolean;
  is_stretch: boolean;
  search_terms: string[];
  description: string;
}

// Category and file mappings
const markdownFiles = [
  'exercises-Warm-up & Mobility 2025-11-24.md',
  'exercises-Olympic Lifting & Barbell Movements 2025-11-24.md',
  'exercises-Compound Exercises 2025-11-24.md',
  'exercises-Gymnastics & Bodyweight 2025-11-24.md',
  'exercises-Core, Abs & Isometric Holds 2025-11-24.md',
  'exercises-Cardio & Conditioning 2025-11-24.md',
  'exercises-Recovery & Stretching 2025-11-24.md',
  'exercises-Strength & Functional Conditioning-2025-11-24.md',
];

const testingAreaPath = path.join(__dirname, '..', 'database', 'testing-area');

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseEquipment(tags: string[]): string[] {
  const equipmentKeywords = [
    'barbell', 'dumbbell', 'kettlebell', 'wallball', 'slamball',
    'rings', 'pull-up-bar', 'battle-rope', 'resistance-band',
    'pvc-pipe', 'rig', 'box', 'plate', 'sandbag', 'sled',
    'medicine-ball', 'foam-roller', 'c2-rower', 'skierg', 'airbike',
    'ghd', 'rope', 'parallettes', 'wedge', 'platform'
  ];

  const found = tags.filter(tag => equipmentKeywords.includes(tag));
  return found.length > 0 ? found : ['bodyweight'];
}

function inferDifficulty(tags: string[], description: string): string {
  const advancedKeywords = ['advanced', 'elite', 'strict', 'complex', 'freestanding'];
  const beginnerKeywords = ['beginner', 'basic', 'assisted', 'progression', 'fundamental'];

  const text = [...tags, description].join(' ').toLowerCase();

  if (advancedKeywords.some(kw => text.includes(kw))) return 'advanced';
  if (beginnerKeywords.some(kw => text.includes(kw))) return 'beginner';
  return 'intermediate';
}

function fixTypos(text: string): string {
  return text
    .replace('途中', '') // Remove Chinese characters
    .replace('American swingVariation', 'American swing variation')
    .replace('controldepth', 'control depth')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseMarkdownFile(filePath: string, category: string): Exercise[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const exercises: Exercise[] = [];

  // Split exercises by #### headers
  const sections = content.split(/^#### /m);

  let currentSubcategory = '';

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    // Check for subcategory
    const subcategoryMatch = section.match(/^###\s+(.+)$/m);
    if (subcategoryMatch) {
      currentSubcategory = subcategoryMatch[1].trim();
    }

    // Skip if this doesn't look like an exercise
    if (!section.includes('**Body Parts:**')) continue;

    // Extract display name (first line after ####)
    const lines = section.split('\n');
    let displayName = lines[0]?.trim() || '';
    // Remove all ** markers
    displayName = displayName.replace(/\*\*/g, '').trim();
    if (!displayName || displayName.startsWith('#')) continue;

    // Extract body parts
    const bodyPartsMatch = section.match(/- \*\*Body Parts:\*\*\s*(.+)/);
    const bodyParts = bodyPartsMatch
      ? bodyPartsMatch[1].split(',').map(s => s.trim()).filter(s => s.length > 0)
      : [];

    // Extract tags
    const tagsMatch = section.match(/- \*\*Tags:\*\*\s*(.+)/);
    const tags = tagsMatch
      ? tagsMatch[1].split(',').map(s => fixTypos(s.trim())).filter(s => s.length > 0)
      : [];

    // Extract description
    const descMatch = section.match(/- \*\*Description:\*\*\s*(.+)/);
    const description = descMatch ? fixTypos(descMatch[1].trim()) : '';

    if (displayName && bodyParts.length > 0) {
      const name = slugify(displayName);
      const equipment = parseEquipment(tags);
      const difficulty = inferDifficulty(tags, description);
      const isWarmup = tags.some(t => t.includes('warm-up') || t.includes('mobility'));
      const isStretch = tags.some(t => t.includes('stretch') || t.includes('recovery'));

      exercises.push({
        name,
        display_name: displayName,
        category,
        subcategory: currentSubcategory || category,
        equipment,
        body_parts: bodyParts,
        difficulty,
        is_warmup: isWarmup,
        is_stretch: isStretch,
        search_terms: tags,
        description,
      });
    }
  }

  return exercises;
}

function main() {
  const allExercises: Exercise[] = [];

  for (const file of markdownFiles) {
    const filePath = path.join(testingAreaPath, file);

    // Extract category from filename
    const category = file
      .replace('exercises-', '')
      .replace(' 2025-11-24.md', '')
      .replace('-2025-11-24.md', '')
      .trim();

    console.log(`Processing: ${category}...`);
    const exercises = parseMarkdownFile(filePath, category);
    allExercises.push(...exercises);
    console.log(`  Found ${exercises.length} exercises`);
  }

  const output = {
    exercises: allExercises,
    metadata: {
      total_count: allExercises.length,
      categories: markdownFiles.length,
      generated: '2025-11-24',
      source: '8 markdown files',
    },
  };

  const outputPath = path.join(testingAreaPath, 'exercises-complete-2025-11-24.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\nComplete! Generated ${allExercises.length} exercises`);
  console.log(`Output: ${outputPath}`);
}

main();
