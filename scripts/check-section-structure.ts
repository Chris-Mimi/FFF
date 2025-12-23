import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xvrefulklquuizbpkppb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2cmVmdWxrbHF1dWl6YnBrcHBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDMzNDcyMywiZXhwIjoyMDc1OTEwNzIzfQ.d9Uf6r_JTq_Nw5akeBzVwS5css48gxS_B8T53D_PB60'
);

async function checkStructure() {
  const { data } = await supabase
    .from('section_types')
    .select('*')
    .limit(1);
  
  console.log('Section_types table structure:');
  console.log(JSON.stringify(data, null, 2));
}

checkStructure();
