import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
(async () => {
  const { data: cats } = await supabase.from('exercises').select('category').order('category');
  const unique = [...new Set((cats || []).map((r: { category: string }) => r.category))];
  console.log('Exercise categories:');
  for (const c of unique) console.log(`  - ${c}`);
  const { data: lifts } = await supabase.from('barbell_lifts').select('id, name, acronym').order('name');
  console.log('\nBarbell lifts:');
  for (const l of (lifts || [])) console.log(`  - ${l.name} (acronym=${l.acronym ?? 'null'})`);
  const { data: matches } = await supabase
    .from('exercises')
    .select('id, name, display_name, category, acronym')
    .eq('category', 'Olympic Lifting & Barbell Movements')
    .order('name');
  console.log('\nExercises in Olympic Lifting / Barbell Movements:');
  for (const e of (matches || [])) console.log(`  - "${e.display_name || e.name}" (slug=${e.name}) acronym=${e.acronym ?? 'null'}`);
})();
