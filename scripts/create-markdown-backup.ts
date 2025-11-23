/**
 * Create Markdown Backup
 * Creates a readable markdown version of the exercises backup
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
  description?: string;
  video_url?: string;
}

async function createMarkdownBackup() {
  console.log('📝 Creating markdown backup...\n');

  // Fetch all exercises
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('❌ Error fetching exercises:', error);
    throw error;
  }

  if (!exercises || exercises.length === 0) {
    console.error('❌ No exercises found in database');
    process.exit(1);
  }

  console.log(`✓ Fetched ${exercises.length} exercises\n`);

  // Create markdown content
  const today = new Date().toISOString().split('T')[0];
  let markdown = `# Exercise Library Backup\n\n`;
  markdown += `**Date:** ${today}\n`;
  markdown += `**Total Exercises:** ${exercises.length}\n\n`;
  markdown += `---\n\n`;

  // Group by category
  const byCategory: Record<string, Exercise[]> = {};
  for (const ex of exercises) {
    if (!byCategory[ex.category]) {
      byCategory[ex.category] = [];
    }
    byCategory[ex.category].push(ex);
  }

  // Table of Contents
  markdown += `## Table of Contents\n\n`;
  const categories = Object.keys(byCategory).sort();
  for (const category of categories) {
    const count = byCategory[category].length;
    markdown += `- [${category}](#${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}) (${count})\n`;
  }
  markdown += `\n---\n\n`;

  // Category breakdown
  markdown += `## Category Summary\n\n`;
  markdown += `| Category | Count |\n`;
  markdown += `|:---|---:|\n`;
  for (const category of categories) {
    const count = byCategory[category].length;
    markdown += `| ${category} | ${count} |\n`;
  }
  markdown += `\n---\n\n`;

  // Detailed exercise listings
  for (const category of categories) {
    const exercises = byCategory[category];
    markdown += `## ${category}\n\n`;
    markdown += `**Total:** ${exercises.length} exercises\n\n`;

    for (const ex of exercises) {
      markdown += `### ${ex.name}\n\n`;

      if (ex.description) {
        markdown += `**Description:** ${ex.description}\n\n`;
      }

      if (ex.body_parts && ex.body_parts.length > 0) {
        markdown += `**Body Parts:** ${ex.body_parts.join(', ')}\n\n`;
      }

      if (ex.tags && ex.tags.length > 0) {
        markdown += `**Tags:** ${ex.tags.join(', ')}\n\n`;
      }

      if (ex.equipment && ex.equipment.length > 0) {
        markdown += `**Equipment:** ${ex.equipment.join(', ')}\n\n`;
      }

      if (ex.difficulty) {
        markdown += `**Difficulty:** ${ex.difficulty}\n\n`;
      }

      if (ex.subcategory) {
        markdown += `**Subcategory:** ${ex.subcategory}\n\n`;
      }

      if (ex.video_url) {
        markdown += `**Video:** ${ex.video_url}\n\n`;
      }

      markdown += `---\n\n`;
    }
  }

  // Write markdown file
  const mdPath = `database/testing-area/exercises-backup-${today}.md`;
  fs.writeFileSync(mdPath, markdown, 'utf-8');

  const fileSize = (fs.statSync(mdPath).size / 1024).toFixed(2);

  console.log('✅ Markdown backup created!\n');
  console.log(`📄 File: ${mdPath}`);
  console.log(`📦 Size: ${fileSize} KB`);
  console.log(`📊 Exercises: ${exercises.length}\n`);

  // Also create JSON backup with same naming
  const jsonPath = `database/testing-area/exercises-backup-${today}.json`;
  fs.writeFileSync(jsonPath, JSON.stringify(exercises, null, 2), 'utf-8');

  const jsonSize = (fs.statSync(jsonPath).size / 1024).toFixed(2);

  console.log('📄 JSON backup: ' + jsonPath);
  console.log(`📦 Size: ${jsonSize} KB\n`);
}

createMarkdownBackup().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
