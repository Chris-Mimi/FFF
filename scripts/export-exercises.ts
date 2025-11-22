/**
 * Exercise Export Script
 * Exports exercises from Supabase database to JSON file
 *
 * Usage:
 *   npx tsx scripts/export-exercises.ts [output-path]
 *
 * Example:
 *   npx tsx scripts/export-exercises.ts database/exercises-import.json
 *   npx tsx scripts/export-exercises.ts database/exercises-backup.json
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

// Use service role key to bypass RLS policies for full access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ExerciseExport {
  name: string;
  display_name: string;
  category: string;
  subcategory?: string;
  equipment?: string[];
  body_parts?: string[];
  tags?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  is_warmup?: boolean;
  is_stretch?: boolean;
  search_terms?: string;
  description?: string;
  video_url?: string;
}

async function exportExercises(outputPath: string) {
  console.log('🏋️  Exercise Export Script\n');
  console.log('📥 Fetching exercises from database...');

  // Fetch all exercises from database
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('❌ Error fetching exercises:', error);
    process.exit(1);
  }

  if (!exercises || exercises.length === 0) {
    console.error('❌ No exercises found in database');
    process.exit(1);
  }

  console.log('✓ Fetched', exercises.length, 'exercises from database\n');

  console.log('📊 Export Summary:');
  console.log('   Total exercises:', exercises.length);

  // Group by category
  const categories = exercises.reduce((acc, ex) => {
    acc[ex.category] = (acc[ex.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(categories).forEach(([cat, count]) => {
    console.log(`   - ${cat}: ${count}`);
  });
  console.log('');

  // Transform database records to JSON export format
  const jsonExercises: ExerciseExport[] = exercises.map(ex => {
    const result: ExerciseExport = {
      name: ex.name,
      display_name: ex.display_name || ex.name,
      category: ex.category,
    };

    // Only include optional fields if they have values
    if (ex.subcategory) result.subcategory = ex.subcategory;
    if (ex.equipment && ex.equipment.length > 0) result.equipment = ex.equipment;
    if (ex.body_parts && ex.body_parts.length > 0) result.body_parts = ex.body_parts;
    if (ex.tags && ex.tags.length > 0) result.tags = ex.tags;
    if (ex.difficulty) result.difficulty = ex.difficulty;
    if (ex.is_warmup) result.is_warmup = ex.is_warmup;
    if (ex.is_stretch) result.is_stretch = ex.is_stretch;
    if (ex.search_terms) result.search_terms = ex.search_terms;
    if (ex.description) result.description = ex.description;
    if (ex.video_url) result.video_url = ex.video_url;

    return result;
  });

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    console.log('📁 Creating directory:', outputDir);
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write to JSON file with pretty formatting
  console.log('⬇️  Writing to file:', outputPath);
  try {
    fs.writeFileSync(
      outputPath,
      JSON.stringify(jsonExercises, null, 2),
      'utf-8'
    );
    console.log('✅ Export successful!');
    console.log('   Exported:', jsonExercises.length, 'exercises');
    console.log('');
    console.log('🎉 Export complete!');
    console.log('   File:', outputPath);
    console.log('   Size:', (fs.statSync(outputPath).size / 1024).toFixed(2), 'KB');
  } catch (error) {
    console.error('❌ Error writing file:', error);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);
const outputPath = args[0] || 'database/exercises-export.json';

// Check if file exists and confirm overwrite
if (fs.existsSync(outputPath)) {
  console.log('⚠️  File already exists:', outputPath);
  console.log('   This will overwrite the existing file.');
  console.log('');
}

exportExercises(outputPath).catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
