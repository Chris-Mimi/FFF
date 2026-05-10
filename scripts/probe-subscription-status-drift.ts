/**
 * Probe: list all subscription rows with their likely-correct state inferred
 * from timestamp/period evidence.
 *
 * Heuristic for SUSPECT rows (likely actually trialing but stored as active):
 *   - status='active'
 *   - updated_at within 5s of created_at (no post-creation webhook ever applied)
 *
 * These are candidates for the line-185 bug where checkout.completed wrote
 * a placeholder 'active' status that was never corrected by subscription.*
 *
 * Read-only.
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
  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select('id, member_id, status, plan_type, current_period_end, cancel_at_period_end, stripe_subscription_id, created_at, updated_at')
    .order('created_at', { ascending: true });
  if (error) { console.error(error.message); process.exit(1); }

  const memberIds = [...new Set((subs ?? []).map(s => s.member_id))];
  const { data: members } = await supabase
    .from('members')
    .select('id, name, display_name, email, athlete_subscription_end, athlete_subscription_status')
    .in('id', memberIds);
  const memberById = new Map((members ?? []).map(m => [m.id, m]));

  console.log(`Total subscription rows: ${subs?.length ?? 0}\n`);
  console.log('Status | Member name                  | created_at  | updated_at  | period_end  | flag');
  console.log('-'.repeat(110));

  let suspectCount = 0;
  for (const s of subs ?? []) {
    const m = memberById.get(s.member_id);
    const name = ((m?.display_name || m?.name || '?') as string).slice(0, 28).padEnd(28);
    const createdAt = (s.created_at as string).slice(0, 19);
    const updatedAt = (s.updated_at as string).slice(0, 19);
    const periodEnd = (s.current_period_end as string)?.slice(0, 19) ?? '-';
    const drift = new Date(s.updated_at).getTime() - new Date(s.created_at).getTime();
    const driftSec = Math.abs(drift / 1000);

    const isSuspect = s.status === 'active' && driftSec < 5;
    let flag = '';
    if (isSuspect) {
      suspectCount++;
      flag = '⚠️  SUSPECT — never updated post-creation, may actually be trialing';
    } else if (s.status === 'trialing') {
      const periodEndDate = new Date(s.current_period_end);
      if (periodEndDate.getTime() < Date.now()) {
        flag = '⚠️  STALE — trial period_end has passed but status still trialing';
      }
    }

    console.log(`${(s.status || '?').padEnd(8)} | ${name} | ${createdAt} | ${updatedAt} | ${periodEnd} | ${flag}`);
  }

  console.log('\n' + '='.repeat(110));
  console.log(`Suspect rows (status=active + no post-creation update): ${suspectCount}`);
  console.log('Each suspect needs to be checked in Stripe directly: search the customer or sub ID.');
  console.log('If Stripe shows it as trialing, the local row needs UPDATE to status=trialing.');
}

main().catch(err => { console.error(err); process.exit(1); });
