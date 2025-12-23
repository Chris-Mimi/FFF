import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xvrefulklquuizbpkppb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2cmVmdWxrbHF1dWl6YnBrcHBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDMzNDcyMywiZXhwIjoyMDc1OTEwNzIzfQ.d9Uf6r_JTq_Nw5akeBzVwS5css48gxS_B8T53D_PB60'
);

async function addWodParts() {
  // First check existing WOD sections
  const { data: existing } = await supabase
    .from('section_types')
    .select('*')
    .like('name', 'WOD%')
    .order('name');
  
  console.log('Existing WOD sections:');
  console.table(existing);
  
  // Add new WOD parts
  const newSections = [
    { name: 'WOD Pt. 4', allows_lifts: true, allows_benchmarks: true, allows_forge_benchmarks: true, allows_free_form: true },
    { name: 'WOD Pt. 5', allows_lifts: true, allows_benchmarks: true, allows_forge_benchmarks: true, allows_free_form: true },
    { name: 'WOD Pt. 6', allows_lifts: true, allows_benchmarks: true, allows_forge_benchmarks: true, allows_free_form: true }
  ];
  
  const { data, error } = await supabase
    .from('section_types')
    .insert(newSections)
    .select();
  
  if (error) {
    console.error('Error adding sections:', error);
  } else {
    console.log('\nSuccessfully added:');
    console.table(data);
  }
}

addWodParts();
