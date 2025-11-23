/**
 * Find Semantic Duplicates
 * Catches cases where Cline added generic versions of specific variants
 * Example: "Bear Crawl" when we already have "Bear Crawl Forwards"
 */

import * as fs from 'fs';

interface Exercise {
  name: string;
  category: string;
}

// Already confirmed duplicates to skip
const KNOWN_DUPLICATES = new Set([
  'Bear Crawl', // Generic version of "Bear Crawl Forwards"
]);

function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findSemanticDuplicates() {
  console.log('🔍 Semantic Duplicate Detector\n');

  // Load original exercises
  const currentPath = 'database/testing-area/exercises-current.json';
  const currentExercises: Exercise[] = JSON.parse(fs.readFileSync(currentPath, 'utf-8'));
  console.log(`✓ Loaded ${currentExercises.length} original exercises\n`);

  // Load Cline's exercises (from new-exercises list)
  const newExercises = [
    'ATG KoT Calf Raise Unilateral',
    'Bear Crawl',
    'BR Wrist Rolling',
    'Commando Crawl',
    'Crab Walk',
    'Duck Walk',
    'Fire Hydrants',
    'Spiderman Crawl',
    'Squat Therapy',
    // Add more as needed
  ];

  console.log('📊 Checking for semantic duplicates...\n');

  const semanticDuplicates: Array<{
    cline: string;
    original: string;
    type: string;
  }> = [];

  for (const clineEx of newExercises) {
    const clineNorm = normalizeExerciseName(clineEx);
    const clineWords = clineNorm.split(' ');

    for (const originalEx of currentExercises) {
      const origNorm = normalizeExerciseName(originalEx.name);
      const origWords = origNorm.split(' ');

      // Case 1: Cline's name is a subset of original (generic version)
      // "Bear Crawl" is subset of "Bear Crawl Forwards"
      if (clineWords.every(word => origWords.includes(word)) && clineWords.length < origWords.length) {
        semanticDuplicates.push({
          cline: clineEx,
          original: originalEx.name,
          type: 'Generic version of specific variant'
        });
        break;
      }

      // Case 2: Original is a subset of Cline's (specific version)
      // Less common, but check anyway
      if (origWords.every(word => clineWords.includes(word)) && origWords.length < clineWords.length) {
        // Only flag if the original is very simple (1-2 words)
        if (origWords.length <= 2) {
          semanticDuplicates.push({
            cline: clineEx,
            original: originalEx.name,
            type: 'Specific version of generic original'
          });
          break;
        }
      }
    }
  }

  console.log('## Semantic Duplicates Found\n');

  if (semanticDuplicates.length === 0) {
    console.log('✅ No semantic duplicates found!\n');
  } else {
    console.log(`Found ${semanticDuplicates.length} semantic duplicates:\n`);

    for (const dup of semanticDuplicates) {
      console.log(`### ${dup.cline}`);
      console.log(`- **Original:** ${dup.original}`);
      console.log(`- **Type:** ${dup.type}`);
      console.log(`- **Action:** ❌ Remove from new exercises list`);
      console.log('');
    }
  }

  // Save report
  const reportPath = 'database/testing-area/semantic-duplicates.md';
  let report = '# Semantic Duplicate Analysis\n\n';
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  report += 'These are cases where Cline added generic versions of exercises that already exist as specific variants.\n\n';
  report += '---\n\n';

  if (semanticDuplicates.length > 0) {
    report += '## Semantic Duplicates\n\n';

    for (const dup of semanticDuplicates) {
      report += `### ${dup.cline}\n\n`;
      report += `- **Original in database:** ${dup.original}\n`;
      report += `- **Type:** ${dup.type}\n`;
      report += `- **Recommendation:** Remove - use existing variant\n\n`;
    }
  } else {
    report += '✅ No semantic duplicates found.\n';
  }

  fs.writeFileSync(reportPath, report, 'utf-8');

  console.log('✅ Analysis complete!');
  console.log(`📄 Report: ${reportPath}\n`);
}

findSemanticDuplicates();
