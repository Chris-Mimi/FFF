/**
 * Exercise Import Script
 * Imports exercises from JSON file to Supabase exercises table
 *
 * Usage:
 *   npx tsx scripts/import-exercises.ts [path-to-json]
 *
 * Example:
 *   npx tsx scripts/import-exercises.ts database/exercises-import-sample.json
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

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

// Use service role key to bypass RLS policies for bulk import
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ExerciseImport {
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

async function importExercises(jsonFilePath: string) {
  console.log('🏋️  Exercise Import Script\n');
  console.log('📁 Reading file:', jsonFilePath);

  // Read JSON file
  let exercises: ExerciseImport[];
  try {
    const fileContent = fs.readFileSync(jsonFilePath, 'utf-8');
    exercises = JSON.parse(fileContent);
    console.log('✓ Loaded', exercises.length, 'exercises from JSON\n');
  } catch (error) {
    console.error('❌ Error reading JSON file:', error);
    process.exit(1);
  }

  // Validate JSON structure
  const invalidExercises = exercises.filter(ex => !ex.name || !ex.category);
  if (invalidExercises.length > 0) {
    console.error('❌ Error: Some exercises missing required fields (name, category):');
    invalidExercises.forEach(ex => console.error('  -', ex));
    process.exit(1);
  }

  console.log('📊 Import Summary:');
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

  // Transform for database (map JSON structure to DB columns)
  const dbExercises = exercises.map(ex => ({
    name: ex.name,
    display_name: ex.display_name || ex.name,
    category: ex.category,
    subcategory: ex.subcategory || null,
    description: ex.description || null,
    video_url: ex.video_url || null,
    tags: ex.tags || [],
    equipment: ex.equipment || [],
    body_parts: ex.body_parts || [],
    difficulty: ex.difficulty || null,
    is_warmup: ex.is_warmup || false,
    is_stretch: ex.is_stretch || false,
    search_terms: ex.search_terms || `${ex.name} ${ex.category}`.toLowerCase(),
  }));

  // Import to Supabase using upsert (handles duplicates)
  console.log('⬆️  Uploading to Supabase...');
  const { data, error } = await supabase
    .from('exercises')
    .upsert(dbExercises, {
      onConflict: 'name',
      ignoreDuplicates: false // Update existing records
    })
    .select();

  if (error) {
    console.error('❌ Error importing exercises:', error);
    process.exit(1);
  }

  console.log('✅ Import successful!');
  console.log('   Inserted/Updated:', data?.length || 0, 'exercises');
  console.log('');
  console.log('🎉 Exercise library ready!');
  console.log('   View at: /coach (Exercise Library button)');
}

// Main execution
const args = process.argv.slice(2);
const jsonPath = args[0] || 'database/exercises-import-sample.json';

if (!fs.existsSync(jsonPath)) {
  console.error('❌ Error: File not found:', jsonPath);
  console.log('\nUsage: npx tsx scripts/import-exercises.ts [path-to-json]');
  console.log('Example: npx tsx scripts/import-exercises.ts database/exercises-import-sample.json');
  process.exit(1);
}

importExercises(jsonPath).catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
