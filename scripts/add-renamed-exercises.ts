/**
 * Add Renamed Exercises
 * Adds the 4 exercises that were renamed during review
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

// Mapping of new name → original name in enhanced file
const RENAMED_EXERCISES: Record<string, string> = {
  'Reverse (Elbow) Bridge': 'Elbow Bridge',
  'Pull-Up Chest-to-Bar Strict': 'Strict Chest-to-Bar Pull-Up',
  'Ring Muscle-Up Strict': 'Strict Ring Muscle-Up',
  'Toes-to-Bar Strict (T2B)': 'Strict Toes-to-Bar (ST2B)',
};

// Category mappings
const CATEGORIES: Record<string, string> = {
  'Elbow Bridge': 'Gymnastics & Bodyweight',
  'Strict Chest-to-Bar Pull-Up': 'Gymnastics & Bodyweight',
  'Strict Ring Muscle-Up': 'Gymnastics & Bodyweight',
  'Strict Toes-to-Bar (ST2B)': 'Core, Abs & Isometric Holds',
};

function loadEnhancedDetails(): Map<string, Exercise> {
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

  console.log(`✓ Loaded ${exerciseMap.size} exercise details\n`);
  return exerciseMap;
}

function addRenamedExercises() {
  console.log('📝 Adding Renamed Exercises\n');
  console.log('=' .repeat(80));
  console.log('\n');

  // Load enhanced details
  const enhancedDetails = loadEnhancedDetails();

  // Load merged file
  console.log('📥 Loading merged exercises...\n');
  const mergedPath = 'database/testing-area/exercises-merged-final.json';
  const mergedExercises: Exercise[] = JSON.parse(fs.readFileSync(mergedPath, 'utf-8'));
  console.log(`✓ Loaded ${mergedExercises.length} existing exercises\n`);

  // Add renamed exercises
  console.log('➕ Adding renamed exercises:\n');

  let addedCount = 0;

  for (const [newName, originalName] of Object.entries(RENAMED_EXERCISES)) {
    const details = enhancedDetails.get(originalName);

    if (!details) {
      console.warn(`⚠️  Warning: Could not find details for "${originalName}"`);
      continue;
    }

    const category = CATEGORIES[originalName];

    const exercise: Exercise = {
      name: newName,
      display_name: newName,
      category: category,
      description: details.description || '',
      body_parts: details.body_parts || [],
      tags: details.tags || [],
      equipment: details.equipment || [],
      difficulty: details.difficulty,
      subcategory: details.subcategory,
      is_warmup: category === 'Warm-up & Mobility',
      is_stretch: category === 'Recovery & Stretching',
      search_terms: `${newName.toLowerCase()} ${category.toLowerCase()} ${(details.tags || []).join(' ').toLowerCase()}`
    };

    mergedExercises.push(exercise);
    console.log(`✓ Added: ${newName}`);
    console.log(`  Category: ${category}`);
    console.log(`  Original: ${originalName}`);
    console.log('');
    addedCount++;
  }

  // Sort by category, then name
  mergedExercises.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });

  console.log('📊 Final Summary:\n');
  console.log(`Added exercises: ${addedCount}`);
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

  // Write final file
  fs.writeFileSync(mergedPath, JSON.stringify(mergedExercises, null, 2), 'utf-8');

  const fileSize = (fs.statSync(mergedPath).size / 1024).toFixed(2);

  console.log('=' .repeat(80));
  console.log('\n✅ Complete!\n');
  console.log(`📄 Output file: ${mergedPath}`);
  console.log(`📦 File size: ${fileSize} KB`);
  console.log(`📊 Total exercises: ${mergedExercises.length}\n`);
}

addRenamedExercises();
