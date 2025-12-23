import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xvrefulklquuizbpkppb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2cmVmdWxrbHF1dWl6YnBrcHBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDMzNDcyMywiZXhwIjoyMDc1OTEwNzIzfQ.d9Uf6r_JTq_Nw5akeBzVwS5css48gxS_B8T53D_PB60'
);

async function addWodParts() {
  // Get max display_order
  const { data: maxData } = await supabase
    .from('section_types')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1);
  
  const nextOrder = (maxData && maxData[0] ? maxData[0].display_order : 0) + 1;
  console.log(`Using display_order starting from: ${nextOrder}`);
  
  const newSections = [
    { 
      name: 'WOD Pt. 4', 
      description: 'Workout of the Day (main conditioning piece)',
      display_order: nextOrder
    },
    { 
      name: 'WOD Pt. 5', 
      description: 'Workout of the Day (main conditioning piece)',
      display_order: nextOrder + 1
    },
    { 
      name: 'WOD Pt. 6', 
      description: 'Workout of the Day (main conditioning piece)',
      display_order: nextOrder + 2
    }
  ];
  
  const { data, error } = await supabase
    .from('section_types')
    .insert(newSections)
    .select();
  
  if (error) {
    console.error('Error adding sections:', error);
  } else {
    console.log('\nSuccessfully added WOD Pt. 4, 5, 6:');
    console.table(data);
  }
}

addWodParts();
