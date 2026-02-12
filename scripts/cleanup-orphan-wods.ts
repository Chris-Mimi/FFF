import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // 1. Delete 68 empty unpublished records (0 sections, NULL everything)
  console.log('Step 1: Deleting empty unpublished records...');
  const { data: emptyUnpub } = await supabase
    .from('wods')
    .select('id, sections')
    .eq('is_published', false);

  const emptyIds = (emptyUnpub || [])
    .filter(w => !w.sections || w.sections.length === 0)
    .map(w => w.id);

  console.log(`  Found ${emptyIds.length} empty unpublished records`);

  if (emptyIds.length > 0) {
    const { error: delErr, count } = await supabase
      .from('wods')
      .delete({ count: 'exact' })
      .in('id', emptyIds);

    if (delErr) {
      console.error('  ❌ Error deleting empty records:', delErr.message);
    } else {
      console.log(`  ✅ Deleted ${count} empty unpublished records`);
    }
  }

  // 2. Delete 2 confirmed orphans
  console.log('\nStep 2: Deleting confirmed orphans...');
  const orphanIds = [
    'db6e50bd-2a66-49e2-a4dc-dbf41c56e993', // Mon 2025-12-01 "Strict Movements"
    '726757dd-c1d3-4dcb-a54c-dbac0d939548', // Mon 2026-01-12 "Weekend WOD"
  ];

  // Safety: verify they still have 0 linked results
  for (const id of orphanIds) {
    const { count: sr } = await supabase
      .from('wod_section_results')
      .select('id', { count: 'exact', head: true })
      .eq('wod_id', id);
    const { count: wl } = await supabase
      .from('workout_logs')
      .select('id', { count: 'exact', head: true })
      .eq('wod_id', id);

    if ((sr || 0) > 0 || (wl || 0) > 0) {
      console.error(`  ⚠️ SKIPPING ${id} — has ${sr} section_results, ${wl} workout_logs!`);
      continue;
    }

    const { data: wod } = await supabase
      .from('wods')
      .select('date, workout_name')
      .eq('id', id)
      .single();

    const { error: delErr } = await supabase
      .from('wods')
      .delete()
      .eq('id', id);

    if (delErr) {
      console.error(`  ❌ Error deleting orphan ${id}:`, delErr.message);
    } else {
      console.log(`  ✅ Deleted orphan: ${wod?.date} "${wod?.workout_name}"`);
    }
  }

  // 3. Fix session_type "Session" → "WOD" for Endurance #26.21
  console.log('\nStep 3: Fixing session_type for Endurance #26.21...');
  const targetId = '4a6dd417-a8fb-4507-ac68-52e3cc5f8a8f';
  const { error: updateErr } = await supabase
    .from('wods')
    .update({ session_type: 'WOD' })
    .eq('id', targetId);

  if (updateErr) {
    console.error('  ❌ Error updating session_type:', updateErr.message);
  } else {
    console.log('  ✅ Updated session_type: "Session" → "WOD"');
  }

  // 4. Final count
  const { count: finalCount } = await supabase
    .from('wods')
    .select('id', { count: 'exact', head: true });
  const { count: finalPublished } = await supabase
    .from('wods')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true);

  console.log(`\n${'='.repeat(60)}`);
  console.log('CLEANUP COMPLETE');
  console.log(`  Before: 196 total (117 published, 79 unpublished)`);
  console.log(`  After: ${finalCount} total (${finalPublished} published, ${(finalCount || 0) - (finalPublished || 0)} unpublished)`);
  console.log(`  Removed: ${196 - (finalCount || 0)} records`);
  console.log('='.repeat(60));
}

main().catch(console.error);
