const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Use service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSessions() {
  const { data: sessions, error } = await supabase
    .from('weekly_sessions')
    .select('id, date, time, workout_id')
    .order('date', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\n=== WEEKLY_SESSIONS (Last 20) ===`);
  console.log(`Total sessions: ${sessions.length}\n`);

  sessions.forEach(s => {
    console.log(`${s.date} ${s.time} - Workout ID: ${s.workout_id ? s.workout_id.substring(0, 8) + '...' : 'NULL'}`);
  });

  // Check if there are orphaned wods (no weekly_session)
  console.log('\n\n=== CHECKING FOR ORPHANED WODS ===');
  const { data: wods } = await supabase
    .from('wods')
    .select('id, title, date, sections')
    .order('date', { ascending: false });

  const wodIds = new Set(wods.map(w => w.id));
  const sessionWodIds = new Set(sessions.map(s => s.workout_id).filter(Boolean));

  const orphanedWods = wods.filter(w => !sessionWodIds.has(w.id));

  console.log(`\nTotal WODs: ${wods.length}`);
  console.log(`WODs linked to sessions: ${sessionWodIds.size}`);
  console.log(`Orphaned WODs (no session): ${orphanedWods.length}`);

  if (orphanedWods.length > 0) {
    console.log('\nOrphaned WODs (first 10):');
    orphanedWods.slice(0, 10).forEach(w => {
      const sectionsCount = w.sections?.length || 0;
      console.log(`  - ${w.date} | ${w.title.padEnd(20)} | Sections: ${sectionsCount} | ID: ${w.id.substring(0, 8)}...`);
    });
  }
}

checkSessions().catch(console.error);
