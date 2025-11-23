/**
 * Remove Duplicates from Merged File
 * Finds and removes duplicate exercise names
 */

import * as fs from 'fs';

interface Exercise {
  name: string;
  display_name: string;
  category: string;
  [key: string]: any;
}

function removeDuplicates() {
  console.log('🔍 Checking for duplicates in merged file...\n');

  const mergedPath = 'database/testing-area/exercises-merged-final.json';
  const exercises: Exercise[] = JSON.parse(fs.readFileSync(mergedPath, 'utf-8'));

  console.log(`Original count: ${exercises.length} exercises\n`);

  // Track duplicates
  const seen = new Map<string, Exercise>();
  const duplicates: Array<{name: string, count: number}> = [];
  const nameCount = new Map<string, number>();

  // Count occurrences
  for (const ex of exercises) {
    const count = nameCount.get(ex.name) || 0;
    nameCount.set(ex.name, count + 1);
  }

  // Find duplicates
  for (const [name, count] of nameCount.entries()) {
    if (count > 1) {
      duplicates.push({ name, count });
    }
  }

  if (duplicates.length > 0) {
    console.log('❌ Found duplicates:\n');
    for (const dup of duplicates) {
      console.log(`  - "${dup.name}" appears ${dup.count} times`);
    }
    console.log('');
  } else {
    console.log('✅ No duplicates found!\n');
    return;
  }

  // Remove duplicates (keep first occurrence)
  const uniqueExercises: Exercise[] = [];
  const seenNames = new Set<string>();

  for (const ex of exercises) {
    if (!seenNames.has(ex.name)) {
      uniqueExercises.push(ex);
      seenNames.add(ex.name);
    }
  }

  console.log(`Removed ${exercises.length - uniqueExercises.length} duplicate(s)\n`);
  console.log(`New count: ${uniqueExercises.length} exercises\n`);

  // Write back
  fs.writeFileSync(mergedPath, JSON.stringify(uniqueExercises, null, 2), 'utf-8');

  console.log('✅ Duplicates removed!\n');
  console.log(`📄 Updated: ${mergedPath}\n`);
}

removeDuplicates();
