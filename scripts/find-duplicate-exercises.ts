/**
 * Duplicate Exercise Detector
 * Finds exercises that are likely duplicates with different names
 */

import * as fs from 'fs';

interface Exercise {
  name: string;
  display_name?: string;
  category: string;
  description?: string;
}

function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

function getWordSet(name: string): Set<string> {
  const normalized = normalizeExerciseName(name);
  return new Set(normalized.split(' '));
}

function calculateSimilarity(name1: string, name2: string): number {
  const words1 = getWordSet(name1);
  const words2 = getWordSet(name2);

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size; // Jaccard similarity
}

function _areExercisesSimilar(ex1: Exercise, ex2: Exercise): boolean {
  const norm1 = normalizeExerciseName(ex1.name);
  const norm2 = normalizeExerciseName(ex2.name);

  // Exact match after normalization
  if (norm1 === norm2) return true;

  // High similarity (80%+)
  if (calculateSimilarity(ex1.name, ex2.name) >= 0.8) return true;

  // Check for word reordering (all same words, different order)
  const words1 = Array.from(getWordSet(ex1.name)).sort();
  const words2 = Array.from(getWordSet(ex2.name)).sort();
  if (words1.length === words2.length && words1.every((w, i) => w === words2[i])) {
    return true;
  }

  return false;
}

function findDuplicates() {
  console.log('🔍 Duplicate Exercise Detector\n');

  // Load current database (original exercises)
  const currentPath = 'database/testing-area/exercises-current.json';
  const currentExercises: Exercise[] = JSON.parse(fs.readFileSync(currentPath, 'utf-8'));
  console.log(`✓ Loaded ${currentExercises.length} original exercises\n`);

  // Load enhanced file (Cline's exercises)
  const enhancedPath = 'database/testing-area/exercises-enhanced-sample.md';
  const enhancedContent = fs.readFileSync(enhancedPath, 'utf-8');

  // Parse markdown exercises
  const enhancedExercises: Exercise[] = [];
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
        enhancedExercises.push(currentExercise as Exercise);
      }
      const name = trimmed.substring(7, trimmed.length - 2).trim();
      currentExercise = { name, category: currentCategory };
      continue;
    }

    if (!currentExercise) continue;

    if (trimmed.startsWith('- **Description:**')) {
      currentExercise.description = trimmed.substring(18).trim();
    }
  }

  if (currentExercise && currentExercise.name) {
    enhancedExercises.push(currentExercise as Exercise);
  }

  console.log(`✓ Parsed ${enhancedExercises.length} Cline exercises\n`);

  // Find duplicates
  const duplicates: Array<{
    original: Exercise;
    cline: Exercise;
    similarity: number;
    reason: string;
  }> = [];

  const likelyDuplicates: Array<{
    original: Exercise;
    cline: Exercise;
    similarity: number;
    reason: string;
  }> = [];

  for (const clineEx of enhancedExercises) {
    for (const originalEx of currentExercises) {
      const norm1 = normalizeExerciseName(originalEx.name);
      const norm2 = normalizeExerciseName(clineEx.name);
      const similarity = calculateSimilarity(originalEx.name, clineEx.name);

      // Exact match
      if (norm1 === norm2) {
        duplicates.push({
          original: originalEx,
          cline: clineEx,
          similarity: 1.0,
          reason: 'Exact match (after normalization)'
        });
        break;
      }

      // Word reordering
      const words1 = Array.from(getWordSet(originalEx.name)).sort();
      const words2 = Array.from(getWordSet(clineEx.name)).sort();
      if (words1.length === words2.length &&
          words1.length > 1 &&
          words1.every((w, i) => w === words2[i])) {
        duplicates.push({
          original: originalEx,
          cline: clineEx,
          similarity: 1.0,
          reason: 'Same words, different order'
        });
        break;
      }

      // High similarity (80-99%)
      if (similarity >= 0.8 && similarity < 1.0) {
        likelyDuplicates.push({
          original: originalEx,
          cline: clineEx,
          similarity,
          reason: `${Math.round(similarity * 100)}% word overlap`
        });
        break;
      }
    }
  }

  // Output results
  console.log('📊 DUPLICATE ANALYSIS\n');
  console.log('=' .repeat(80));
  console.log('\n');

  console.log(`## Summary\n`);
  console.log(`Original exercises: ${currentExercises.length}`);
  console.log(`Cline exercises: ${enhancedExercises.length}`);
  console.log(`Confirmed duplicates: ${duplicates.length}`);
  console.log(`Likely duplicates (80-99% similar): ${likelyDuplicates.length}`);
  console.log(`Truly new exercises: ${enhancedExercises.length - duplicates.length - likelyDuplicates.length}`);
  console.log('\n');

  if (duplicates.length > 0) {
    console.log('## ❌ CONFIRMED DUPLICATES\n');
    console.log(`Found ${duplicates.length} exercises that are definitely duplicates:\n`);

    for (const dup of duplicates.sort((a, b) => a.original.name.localeCompare(b.original.name))) {
      console.log(`### ${dup.cline.name}`);
      console.log(`- **Original:** ${dup.original.name}`);
      console.log(`- **Cline:** ${dup.cline.name}`);
      console.log(`- **Reason:** ${dup.reason}`);
      console.log(`- **Original Category:** ${dup.original.category}`);
      console.log(`- **Cline Category:** ${dup.cline.category}`);
      console.log('');
    }
  }

  if (likelyDuplicates.length > 0) {
    console.log('## ⚠️  LIKELY DUPLICATES (REVIEW NEEDED)\n');
    console.log(`Found ${likelyDuplicates.length} exercises that may be duplicates:\n`);

    for (const dup of likelyDuplicates.sort((a, b) => b.similarity - a.similarity)) {
      console.log(`### ${dup.cline.name}`);
      console.log(`- **Original:** ${dup.original.name}`);
      console.log(`- **Cline:** ${dup.cline.name}`);
      console.log(`- **Similarity:** ${Math.round(dup.similarity * 100)}%`);
      console.log(`- **Reason:** ${dup.reason}`);
      console.log(`- **Original Category:** ${dup.original.category}`);
      console.log(`- **Cline Category:** ${dup.cline.category}`);
      console.log('');
    }
  }

  // Write report
  const reportPath = 'database/testing-area/duplicate-analysis.md';
  let report = '# Duplicate Exercise Analysis\n\n';
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  report += '---\n\n';

  report += '## Summary\n\n';
  report += `- Original exercises: ${currentExercises.length}\n`;
  report += `- Cline exercises: ${enhancedExercises.length}\n`;
  report += `- **Confirmed duplicates:** ${duplicates.length}\n`;
  report += `- **Likely duplicates (need review):** ${likelyDuplicates.length}\n`;
  report += `- **Truly new exercises:** ${enhancedExercises.length - duplicates.length - likelyDuplicates.length}\n\n`;

  if (duplicates.length > 0) {
    report += '## Confirmed Duplicates\n\n';
    report += 'These exercises are definitely duplicates and should be removed from Cline\'s list:\n\n';

    for (const dup of duplicates.sort((a, b) => a.original.name.localeCompare(b.original.name))) {
      report += `### ${dup.cline.name}\n`;
      report += `- **Original:** ${dup.original.name}\n`;
      report += `- **Cline:** ${dup.cline.name}\n`;
      report += `- **Reason:** ${dup.reason}\n`;
      report += `- **Original Category:** ${dup.original.category}\n`;
      report += `- **Cline Category:** ${dup.cline.category}\n`;
      report += `- **Action:** ❌ Remove from Cline's list\n\n`;
    }
  }

  if (likelyDuplicates.length > 0) {
    report += '## Likely Duplicates (Review Required)\n\n';
    report += 'These exercises may be duplicates. Please review and decide:\n\n';

    for (const dup of likelyDuplicates.sort((a, b) => b.similarity - a.similarity)) {
      report += `### ${dup.cline.name}\n`;
      report += `- **Original:** ${dup.original.name}\n`;
      report += `- **Cline:** ${dup.cline.name}\n`;
      report += `- **Similarity:** ${Math.round(dup.similarity * 100)}%\n`;
      report += `- **Reason:** ${dup.reason}\n`;
      report += `- **Original Category:** ${dup.original.category}\n`;
      report += `- **Cline Category:** ${dup.cline.category}\n`;

      if (dup.original.description && dup.cline.description) {
        report += `- **Original Description:** ${dup.original.description.substring(0, 150)}...\n`;
        report += `- **Cline Description:** ${dup.cline.description.substring(0, 150)}...\n`;
      }

      report += `- **Decision:** [ ] Remove (duplicate) / [ ] Keep (different exercise)\n\n`;
    }
  }

  report += '## Action Items\n\n';
  report += `1. Remove ${duplicates.length} confirmed duplicates\n`;
  report += `2. Review ${likelyDuplicates.length} likely duplicates\n`;
  report += `3. Proceed with ${enhancedExercises.length - duplicates.length - likelyDuplicates.length} truly new exercises\n`;

  fs.writeFileSync(reportPath, report, 'utf-8');

  console.log('=' .repeat(80));
  console.log('\n✅ Duplicate analysis complete!');
  console.log(`📄 Report saved: ${reportPath}\n`);
}

findDuplicates();
