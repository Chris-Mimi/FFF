/**
 * Find orphan athlete_profiles rows — profiles whose user_id has no matching
 * `members` row. The Athletes page reads athlete_profiles, so an orphan shows
 * up there as a "ghost" athlete. The usual cause (S375): a registration was
 * Rejected, which deleted the members row + auth user but NOT the profile.
 *
 * Read-only by default (dry run).
 *   --delete         remove ALL listed orphans
 *   --id=<profileId> remove only that one orphan profile (safe, targeted)
 *
 * Usage:
 *   npx tsx scripts/find-orphan-athlete-profiles.ts                 # list only
 *   npx tsx scripts/find-orphan-athlete-profiles.ts --id=<uuid>     # delete one
 *   npx tsx scripts/find-orphan-athlete-profiles.ts --delete        # delete all
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const doDelete = process.argv.includes('--delete');
  const onlyArg = process.argv.find(a => a.startsWith('--id='));
  const onlyId = onlyArg ? onlyArg.slice('--id='.length) : null;

  const { data: profiles, error: pErr } = await supabase
    .from('athlete_profiles')
    .select('id, user_id, full_name, email, created_at');
  if (pErr) throw pErr;

  const { data: members, error: mErr } = await supabase
    .from('members')
    .select('id');
  if (mErr) throw mErr;

  const memberIds = new Set((members || []).map(m => m.id));
  const orphans = (profiles || []).filter(p => !p.user_id || !memberIds.has(p.user_id));

  console.log(`\nathlete_profiles: ${profiles?.length ?? 0} total, members: ${memberIds.size}`);
  console.log(`Orphan profiles (no matching members row): ${orphans.length}\n`);

  for (const o of orphans) {
    console.log(`  • ${o.full_name || '(no name)'} | ${o.email || '(no email)'} | user_id=${o.user_id} | created=${o.created_at} | profile_id=${o.id}`);
  }

  if (onlyId) {
    const target = orphans.find(o => o.id === onlyId);
    if (!target) {
      console.log(`\n--id=${onlyId} is not in the orphan list. Aborting (won't delete a non-orphan).\n`);
      return;
    }
    const { error } = await supabase.from('athlete_profiles').delete().eq('id', onlyId);
    if (error) throw error;
    console.log(`\nDeleted 1 orphan: ${target.full_name || target.email} (${onlyId}).\n`);
    return;
  }

  if (!doDelete) {
    console.log(orphans.length ? '\nDry run. Re-run with --id=<uuid> (one) or --delete (all).\n' : '\nNothing to clean up.\n');
    return;
  }

  if (orphans.length === 0) {
    console.log('\nNothing to delete.\n');
    return;
  }

  const ids = orphans.map(o => o.id);
  const { error: dErr } = await supabase.from('athlete_profiles').delete().in('id', ids);
  if (dErr) throw dErr;
  console.log(`\nDeleted ${ids.length} orphan athlete_profiles row(s).\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
