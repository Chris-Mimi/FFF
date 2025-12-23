import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkWodSections() {
  const { data, error } = await supabase
    .from('section_types')
    .select('name, allows_lifts, allows_benchmarks, allows_forge_benchmarks, allows_free_form')
    .like('name', 'WOD%')
    .order('name');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Existing WOD sections:');
    console.table(data);
  }
}

checkWodSections();
