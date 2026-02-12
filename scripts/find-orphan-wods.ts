import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // 1. Count total WODs
  const { count: totalCount } = await supabase
    .from('wods')
    .select('id', { count: 'exact', head: true });
  console.log(`\nTotal WODs in table: ${totalCount}`);

  // 2. Published vs unpublished
  const { count: publishedCount } = await supabase
    .from('wods')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true);
  console.log(`Published: ${publishedCount}`);
  console.log(`Unpublished: ${(totalCount || 0) - (publishedCount || 0)}`);

  // 3. NULL session_type records
  const { data: nullSessionTypes } = await supabase
    .from('wods')
    .select('id, date, session_type, workout_name, is_published, publish_time')
    .is('session_type', null)
    .order('date', { ascending: true });

  console.log(`\n${'='.repeat(80)}`);
  console.log(`NULL session_type records: ${nullSessionTypes?.length || 0}`);
  console.log('='.repeat(80));
  for (const w of nullSessionTypes || []) {
    console.log(`  ${w.date} | published: ${w.is_published} | name: "${w.workout_name || '(null)'}" | ID: ${w.id}`);
  }

  // 4. "Session" session_type (default, not updated)
  const { data: sessionTypes } = await supabase
    .from('wods')
    .select('id, date, session_type, workout_name, is_published, publish_time')
    .eq('session_type', 'Session')
    .order('date', { ascending: true });

  console.log(`\n${'='.repeat(80)}`);
  console.log(`"Session" session_type records: ${sessionTypes?.length || 0}`);
  console.log('='.repeat(80));
  for (const w of sessionTypes || []) {
    console.log(`  ${w.date} | published: ${w.is_published} | name: "${w.workout_name || '(null)'}" | ID: ${w.id}`);
  }

  // 5. Unpublished records with no sections (empty shells)
  const { data: unpublished } = await supabase
    .from('wods')
    .select('id, date, session_type, workout_name, is_published, sections')
    .eq('is_published', false)
    .order('date', { ascending: true });

  const emptyUnpublished = (unpublished || []).filter(w => {
    const sections = w.sections || [];
    return sections.length === 0;
  });

  const nonEmptyUnpublished = (unpublished || []).filter(w => {
    const sections = w.sections || [];
    return sections.length > 0;
  });

  console.log(`\n${'='.repeat(80)}`);
  console.log(`Unpublished records: ${unpublished?.length || 0}`);
  console.log(`  Empty (0 sections): ${emptyUnpublished.length}`);
  console.log(`  With content (has sections): ${nonEmptyUnpublished.length}`);
  console.log('='.repeat(80));

  console.log('\nEmpty unpublished (safe to delete):');
  for (const w of emptyUnpublished) {
    console.log(`  ${w.date} | session_type: "${w.session_type}" | name: "${w.workout_name || '(null)'}" | ID: ${w.id}`);
  }

  console.log('\nUnpublished WITH content (review carefully):');
  for (const w of nonEmptyUnpublished) {
    const sections = w.sections || [];
    console.log(`  ${w.date} | session_type: "${w.session_type}" | name: "${w.workout_name || '(null)'}" | sections: ${sections.length} | ID: ${w.id}`);
  }

  // 6. Check for any linked results on ALL unpublished records
  console.log(`\n${'='.repeat(80)}`);
  console.log('Checking linked results for ALL unpublished records...');
  console.log('='.repeat(80));
  let unpubWithResults = 0;
  for (const w of unpublished || []) {
    const { count: sr } = await supabase
      .from('wod_section_results')
      .select('id', { count: 'exact', head: true })
      .eq('wod_id', w.id);
    const { count: wl } = await supabase
      .from('workout_logs')
      .select('id', { count: 'exact', head: true })
      .eq('wod_id', w.id);
    if ((sr || 0) > 0 || (wl || 0) > 0) {
      console.log(`  ⚠️ HAS RESULTS: ${w.date} | "${w.workout_name || '(null)'}" | section_results: ${sr} | workout_logs: ${wl} | ID: ${w.id}`);
      unpubWithResults++;
    }
  }
  if (unpubWithResults === 0) {
    console.log('  ✅ No unpublished records have linked results — all safe to delete');
  }

  // 7. Published "Session" type records that should have a real type
  console.log(`\n${'='.repeat(80)}`);
  console.log('Published records with "Session" type (need session_type fix):');
  console.log('='.repeat(80));
  const publishedSessions = (sessionTypes || []).filter(w => w.is_published);
  for (const w of publishedSessions) {
    const { count: sr } = await supabase
      .from('wod_section_results')
      .select('id', { count: 'exact', head: true })
      .eq('wod_id', w.id);
    console.log(`  ${w.date} | name: "${w.workout_name || '(null)'}" | results: ${sr || 0} | ID: ${w.id}`);
  }

  // 8. Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('CLEANUP SUMMARY');
  console.log('='.repeat(80));
  console.log(`  Empty unpublished (delete): ${emptyUnpublished.length}`);
  console.log(`  Unpublished with content (review): ${nonEmptyUnpublished.length}`);
  console.log(`  Published with "Session" type (fix): ${publishedSessions.length}`);
}

main().catch(console.error);
