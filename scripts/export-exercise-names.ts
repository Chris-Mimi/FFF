/**
 * Export exercise names for benchmark creation reference
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { supabase } from '../lib/supabase';
import * as fs from 'fs';

async function exportExerciseNames() {
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('name, display_name, category')
    .order('category, name');

  if (error) {
    console.error('Error fetching exercises:', error);
    return;
  }

  // Group by category
  const byCategory = exercises?.reduce((acc, ex) => {
    if (!acc[ex.category]) {
      acc[ex.category] = [];
    }
    acc[ex.category].push({
      name: ex.name,
      display: ex.display_name || ex.name
    });
    return acc;
  }, {} as Record<string, { name: string; display: string }[]>);

  // Create markdown output
  let markdown = '# Exercise Library Reference\n\n';
  markdown += 'Use these exact names (singular, title-cased) in benchmark descriptions for exercise tracking.\n\n';
  markdown += '**Format examples:**\n';
  markdown += '- `10 x Burpee` ✅\n';
  markdown += '- `10 x Burpees` ❌ (plural won\'t match)\n';
  markdown += '- `25 Push-Up` ✅\n';
  markdown += '- `25 push-ups` ❌ (case-insensitive OK, but singular required)\n\n';
  markdown += '---\n\n';

  Object.entries(byCategory || {}).forEach(([category, exs]) => {
    markdown += `## ${category}\n\n`;
    exs.forEach(ex => {
      markdown += `- **${ex.display}** (\`${ex.name}\`)\n`;
    });
    markdown += '\n';
  });

  // Write to file
  const outputPath = 'EXERCISE_REFERENCE.md';
  fs.writeFileSync(outputPath, markdown);
  console.log(`✅ Exported ${exercises?.length} exercises to ${outputPath}`);
}

exportExerciseNames();
