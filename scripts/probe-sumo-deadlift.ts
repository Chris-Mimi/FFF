import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

(async () => {
  // Step 1: find sumo + deadlift exercise ids
  const { data: ex } = await supabase
    .from('exercises')
    .select('id, name, display_name')
    .or('name.ilike.%sumo%,name.ilike.%deadlift%');

  console.log('=== Deadlift / Sumo exercises in library ===');
  for (const e of ex || []) console.log(`  - "${e.display_name || e.name}" (id=${e.id}, slug=${e.name})`);

  const exIds = (ex || []).map(e => e.id);

  // Step 2: find which patterns include them
  const { data: links } = await supabase
    .from('movement_pattern_exercises')
    .select('pattern_id, exercise_id')
    .in('exercise_id', exIds);

  if (!links || links.length === 0) {
    console.log('\n  ❌ No movement_patterns include any deadlift / sumo exercise.');
    return;
  }

  const patternIds = [...new Set(links.map(l => l.pattern_id))];
  const { data: patterns } = await supabase
    .from('movement_patterns')
    .select('id, name')
    .in('id', patternIds);

  console.log('\n=== Movement patterns linked to those exercises ===');
  for (const p of patterns || []) {
    const myLinks = links.filter(l => l.pattern_id === p.id);
    const exNames = myLinks.map(l => {
      const e = ex?.find(e => e.id === l.exercise_id);
      return e?.display_name || e?.name || '?';
    });
    console.log(`  - "${p.name}" → [${exNames.join(', ')}]`);
  }
})();
