/**
 * Backfill members.athlete_subscription_end for Stripe-paying members.
 *
 * Pre-S358 (before 2026-05-21), the webhook's periodEnd fell back to `now`
 * instead of reading from the SubscriptionItem, so every renewal wrote
 * athlete_subscription_end = renewal-date instead of renewal-date + 30 days.
 * S358 fixed the forward path; this script cleans up the residue.
 *
 * Targets: subscriptions with status='active' where
 *   members.athlete_subscription_end differs from subscriptions.current_period_end.
 * Skips: trialing (webhook intentionally skips these too — trial-end ≠ sub-end).
 *
 * Defaults to dry-run. Pass --apply to commit.
 *
 * Usage:
 *   npx tsx scripts/sync-athlete-subscription-end.ts
 *   npx tsx scripts/sync-athlete-subscription-end.ts --apply
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY (will UPDATE members rows)' : 'DRY-RUN (no changes)'}`);
  console.log('='.repeat(80));

  // Get all active subscriptions
  const { data: subs, error: subsError } = await supabase
    .from('subscriptions')
    .select('id, member_id, current_period_end, status, stripe_subscription_id')
    .eq('status', 'active')
    .order('current_period_end', { ascending: false });

  if (subsError) { console.error(subsError.message); process.exit(1); }
  if (!subs?.length) { console.log('No active subscriptions found.'); return; }

  // Dedupe to one sub per member (pick latest current_period_end, already sorted desc)
  const latestByMember = new Map<string, typeof subs[0]>();
  for (const s of subs) {
    if (!latestByMember.has(s.member_id)) latestByMember.set(s.member_id, s);
  }

  const memberIds = [...latestByMember.keys()];

  // Fetch members
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('id, name, display_name, athlete_subscription_end')
    .in('id', memberIds);

  if (membersError) { console.error(membersError.message); process.exit(1); }

  const memberById = new Map((members ?? []).map(m => [m.id, m]));

  const toUpdate: { memberId: string; name: string; current: string; correct: string }[] = [];
  const alreadyCorrect: string[] = [];

  for (const [memberId, sub] of latestByMember) {
    const member = memberById.get(memberId);
    if (!member) continue;

    const name = member.display_name || member.name || memberId;
    const current = member.athlete_subscription_end;
    const correct = sub.current_period_end;

    // Compare as timestamps (strip ms differences)
    const currentMs = current ? new Date(current).getTime() : 0;
    const correctMs = new Date(correct).getTime();

    if (Math.abs(currentMs - correctMs) < 1000) {
      alreadyCorrect.push(name);
    } else {
      toUpdate.push({ memberId, name, current: current?.slice(0, 10) ?? 'null', correct: correct.slice(0, 10) });
    }
  }

  console.log(`\nActive subscriptions checked: ${latestByMember.size}`);
  console.log(`Already correct:              ${alreadyCorrect.length}`);
  console.log(`Need update:                  ${toUpdate.length}`);

  if (toUpdate.length > 0) {
    console.log('\n--- Changes (current → correct) ---');
    for (const u of toUpdate) {
      console.log(`  ${u.name.padEnd(30)}  ${u.current}  →  ${u.correct}`);
    }
  }

  if (APPLY && toUpdate.length > 0) {
    console.log(`\nApplying ${toUpdate.length} UPDATE(s)...`);
    let done = 0;
    for (const u of toUpdate) {
      const { error: updErr } = await supabase
        .from('members')
        .update({
          athlete_subscription_end: new Date(latestByMember.get(u.memberId)!.current_period_end).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', u.memberId);

      if (updErr) {
        console.error(`  ${u.name} UPDATE failed: ${updErr.message}`);
        continue;
      }
      done++;
      console.log(`  ✓ ${u.name}`);
    }
    console.log(`\nUpdated ${done}/${toUpdate.length}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log(APPLY ? 'DONE.' : 'DRY-RUN complete. Re-run with --apply to commit.');
}

main().catch(err => { console.error(err); process.exit(1); });
