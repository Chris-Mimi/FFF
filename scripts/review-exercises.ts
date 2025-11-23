/**
 * Exercise Review Script
 * Compares Cline/Grok's enhanced file with current database export
 * Identifies new exercises, category issues, and description quality
 *
 * Usage:
 *   npx tsx scripts/review-exercises.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Valid categories from original
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

function parseMarkdownExercises(mdContent: string): Exercise[] {
  const exercises: Exercise[] = [];
  const lines = mdContent.split('\n');

  let currentExercise: Partial<Exercise> | null = null;
  let currentCategory = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for category header (## 1. Category Name)
    if (line.match(/^##\s+\d+\.\s+/)) {
      currentCategory = line.replace(/^##\s+\d+\.\s+/, '').trim();
      continue;
    }

    // Check for exercise header (#### **Exercise Name**)
    if (line.startsWith('#### **') && line.endsWith('**')) {
      // Save previous exercise if exists
      if (currentExercise && currentExercise.name) {
        exercises.push(currentExercise as Exercise);
      }

      // Start new exercise
      const name = line.substring(7, line.length - 2).trim();
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

    // Parse fields (fields are on bullet points with **Field:**)
    if (line.startsWith('- **Body Parts:**')) {
      const bodyStr = line.substring(17).trim();
      if (bodyStr && bodyStr !== 'None') {
        currentExercise.body_parts = bodyStr.split(',').map(b => b.trim()).filter(b => b);
      }
    } else if (line.startsWith('- **Tags:**')) {
      const tagsStr = line.substring(11).trim();
      if (tagsStr && tagsStr !== 'None') {
        currentExercise.tags = tagsStr.split(',').map(t => t.trim()).filter(t => t);
      }
    } else if (line.startsWith('- **Description:**')) {
      currentExercise.description = line.substring(18).trim();
    } else if (line.startsWith('- **Equipment:**')) {
      const equipStr = line.substring(16).trim();
      if (equipStr && equipStr !== 'None') {
        currentExercise.equipment = equipStr.split(',').map(e => e.trim()).filter(e => e);
      }
    } else if (line.startsWith('- **Difficulty:**')) {
      currentExercise.difficulty = line.substring(17).trim().toLowerCase();
    } else if (line.startsWith('- **Subcategory:**')) {
      currentExercise.subcategory = line.substring(18).trim();
    } else if (line.startsWith('- **Search Terms:**')) {
      currentExercise.search_terms = line.substring(19).trim();
    }
  }

  // Save last exercise
  if (currentExercise && currentExercise.name) {
    exercises.push(currentExercise as Exercise);
  }

  return exercises;
}

function reviewExercises() {
  console.log('🔍 Exercise Review Script\n');

  // Read current database export (source of truth)
  console.log('📥 Reading current database export...');
  const currentPath = 'database/testing-area/exercises-current.json';
  const currentExercises: Exercise[] = JSON.parse(fs.readFileSync(currentPath, 'utf-8'));
  console.log(`✓ Loaded ${currentExercises.length} exercises from database\n`);

  // Read Cline's enhanced file
  console.log('📥 Reading Cline/Grok enhanced file...');
  const enhancedPath = 'database/testing-area/exercises-enhanced-sample.md';
  const enhancedContent = fs.readFileSync(enhancedPath, 'utf-8');
  const enhancedExercises = parseMarkdownExercises(enhancedContent);
  console.log(`✓ Parsed ${enhancedExercises.length} exercises from markdown\n`);

  // Create lookup maps
  const currentNames = new Set(currentExercises.map(e => e.name.toLowerCase().trim()));

  // Analysis arrays
  const newExercises: Exercise[] = [];
  const invalidCategories: Array<{name: string, category: string}> = [];
  const missingDescriptions: string[] = [];
  const shortDescriptions: Array<{name: string, description: string, length: number}> = [];
  const suspiciousDescriptions: Array<{name: string, description: string, issue: string}> = [];

  console.log('🔍 Analyzing exercises...\n');

  // Analyze each enhanced exercise
  for (const exercise of enhancedExercises) {
    const nameLower = exercise.name.toLowerCase().trim();

    // Check if new exercise
    if (!currentNames.has(nameLower)) {
      newExercises.push(exercise);
    }

    // Check category validity
    if (!VALID_CATEGORIES.includes(exercise.category)) {
      invalidCategories.push({ name: exercise.name, category: exercise.category });
    }

    // Check descriptions
    if (!exercise.description || exercise.description.trim() === '') {
      missingDescriptions.push(exercise.name);
    } else {
      const desc = exercise.description.trim();
      const wordCount = desc.split(/\s+/).length;

      // Flag very short descriptions (< 5 words)
      if (wordCount < 5) {
        shortDescriptions.push({
          name: exercise.name,
          description: desc,
          length: wordCount
        });
      }

      // Flag suspicious patterns
      if (desc.toLowerCase().includes('todo') ||
          desc.toLowerCase().includes('tbd') ||
          desc.toLowerCase().includes('fill in') ||
          desc === exercise.name) {
        suspiciousDescriptions.push({
          name: exercise.name,
          description: desc,
          issue: 'Placeholder text detected'
        });
      }
    }
  }

  // Category distribution
  const categoryCounts: Record<string, number> = {};
  for (const ex of enhancedExercises) {
    categoryCounts[ex.category] = (categoryCounts[ex.category] || 0) + 1;
  }

  // Generate report
  console.log('📊 REVIEW REPORT\n');
  console.log('=' .repeat(80));
  console.log('\n');

  // Summary
  console.log('## Summary\n');
  console.log(`Database exercises:  ${currentExercises.length}`);
  console.log(`Enhanced exercises:  ${enhancedExercises.length}`);
  console.log(`New exercises:       ${newExercises.length}`);
  console.log(`Invalid categories:  ${invalidCategories.length}`);
  console.log(`Missing descriptions: ${missingDescriptions.length}`);
  console.log(`Short descriptions:  ${shortDescriptions.length}`);
  console.log(`Suspicious descriptions: ${suspiciousDescriptions.length}`);
  console.log('\n');

  // Category breakdown
  console.log('## Category Distribution\n');
  const sortedCategories = Object.entries(categoryCounts).sort((a, b) => a[0].localeCompare(b[0]));
  for (const [cat, count] of sortedCategories) {
    const valid = VALID_CATEGORIES.includes(cat) ? '✓' : '❌';
    console.log(`${valid} ${cat}: ${count}`);
  }
  console.log('\n');

  // New exercises
  if (newExercises.length > 0) {
    console.log('## ⚠️  NEW EXERCISES ADDED BY CLINE\n');
    console.log(`Found ${newExercises.length} exercises not in original database:\n`);

    const byCategory: Record<string, Exercise[]> = {};
    for (const ex of newExercises) {
      if (!byCategory[ex.category]) byCategory[ex.category] = [];
      byCategory[ex.category].push(ex);
    }

    for (const [cat, exercises] of Object.entries(byCategory).sort()) {
      console.log(`### ${cat} (${exercises.length})\n`);
      for (const ex of exercises.sort((a, b) => a.name.localeCompare(b.name))) {
        console.log(`- ${ex.name}`);
        if (ex.description) {
          console.log(`  Description: ${ex.description.substring(0, 100)}${ex.description.length > 100 ? '...' : ''}`);
        }
      }
      console.log('');
    }
  }

  // Invalid categories
  if (invalidCategories.length > 0) {
    console.log('## ❌ INVALID CATEGORIES\n');
    console.log(`Found ${invalidCategories.length} exercises with invalid categories:\n`);
    for (const item of invalidCategories) {
      console.log(`- ${item.name}: "${item.category}"`);
    }
    console.log('\n');
  }

  // Missing descriptions
  if (missingDescriptions.length > 0) {
    console.log('## ⚠️  MISSING DESCRIPTIONS\n');
    console.log(`${missingDescriptions.length} exercises without descriptions:\n`);
    for (const name of missingDescriptions.slice(0, 20)) {
      console.log(`- ${name}`);
    }
    if (missingDescriptions.length > 20) {
      console.log(`... and ${missingDescriptions.length - 20} more`);
    }
    console.log('\n');
  }

  // Short descriptions
  if (shortDescriptions.length > 0) {
    console.log('## ⚠️  SHORT DESCRIPTIONS (< 5 words)\n');
    console.log(`${shortDescriptions.length} exercises with very short descriptions:\n`);
    for (const item of shortDescriptions.slice(0, 20)) {
      console.log(`- ${item.name} (${item.length} words): "${item.description}"`);
    }
    if (shortDescriptions.length > 20) {
      console.log(`... and ${shortDescriptions.length - 20} more`);
    }
    console.log('\n');
  }

  // Suspicious descriptions
  if (suspiciousDescriptions.length > 0) {
    console.log('## ❌ SUSPICIOUS DESCRIPTIONS\n');
    console.log(`${suspiciousDescriptions.length} exercises with placeholder/suspicious text:\n`);
    for (const item of suspiciousDescriptions) {
      console.log(`- ${item.name}: "${item.description}"`);
      console.log(`  Issue: ${item.issue}`);
    }
    console.log('\n');
  }

  // Write detailed report to file
  const reportPath = 'database/testing-area/review-report.md';
  let reportContent = '# Exercise Review Report\n\n';
  reportContent += `**Generated:** ${new Date().toISOString()}\n\n`;
  reportContent += '---\n\n';

  reportContent += '## Summary\n\n';
  reportContent += `- Database exercises: ${currentExercises.length}\n`;
  reportContent += `- Enhanced exercises: ${enhancedExercises.length}\n`;
  reportContent += `- New exercises: ${newExercises.length}\n`;
  reportContent += `- Invalid categories: ${invalidCategories.length}\n`;
  reportContent += `- Missing descriptions: ${missingDescriptions.length}\n`;
  reportContent += `- Short descriptions: ${shortDescriptions.length}\n`;
  reportContent += `- Suspicious descriptions: ${suspiciousDescriptions.length}\n\n`;

  if (newExercises.length > 0) {
    reportContent += '## New Exercises (Not in Original)\n\n';
    const byCategory: Record<string, Exercise[]> = {};
    for (const ex of newExercises) {
      if (!byCategory[ex.category]) byCategory[ex.category] = [];
      byCategory[ex.category].push(ex);
    }

    for (const [cat, exercises] of Object.entries(byCategory).sort()) {
      reportContent += `### ${cat} (${exercises.length})\n\n`;
      for (const ex of exercises.sort((a, b) => a.name.localeCompare(b.name))) {
        reportContent += `#### ${ex.name}\n`;
        reportContent += `- **Category:** ${ex.category}\n`;
        if (ex.subcategory) reportContent += `- **Subcategory:** ${ex.subcategory}\n`;
        if (ex.equipment && ex.equipment.length > 0) reportContent += `- **Equipment:** ${ex.equipment.join(', ')}\n`;
        if (ex.body_parts && ex.body_parts.length > 0) reportContent += `- **Body Parts:** ${ex.body_parts.join(', ')}\n`;
        if (ex.difficulty) reportContent += `- **Difficulty:** ${ex.difficulty}\n`;
        if (ex.description) reportContent += `- **Description:** ${ex.description}\n`;
        reportContent += '\n';
      }
    }
  }

  if (invalidCategories.length > 0) {
    reportContent += '## Invalid Categories\n\n';
    for (const item of invalidCategories) {
      reportContent += `- **${item.name}**: "${item.category}"\n`;
    }
    reportContent += '\n';
  }

  fs.writeFileSync(reportPath, reportContent, 'utf-8');

  console.log('=' .repeat(80));
  console.log(`\n✅ Review complete!\n`);
  console.log(`📄 Detailed report saved: ${reportPath}\n`);
}

reviewExercises();
