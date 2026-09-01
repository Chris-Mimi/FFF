/**
 * Daily maintenance cron. Two jobs:
 *   1. Flip gym_memberships rows whose end_date has passed
 *      from status='active' → 'expired'.
 *   2. Prune notification_log rows older than NOTIFICATION_LOG_RETENTION_DAYS.
 *
 * Both live here rather than in separate routes so the app only consumes one
 * Vercel cron slot.
 *
 * Schedule: see vercel.json (default 06:00 UTC daily).
 *
 * Auth: Vercel sets `Authorization: Bearer ${CRON_SECRET}` on cron-triggered
 * requests. Reject anything else so this can't be invoked from the public
 * internet.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/** How long to keep notification_log rows. The only reader needs 1 day. */
const NOTIFICATION_LOG_RETENTION_DAYS = 90;

export async function GET(request: NextRequest) {
  // Fail closed: if the secret isn't configured, reject everything rather
  // than leaving this service-role endpoint open to the public internet.
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabaseAdmin
    .from('gym_memberships')
    .update({ status: 'expired' })
    .eq('status', 'active')
    .lt('end_date', today)
    .select('id, member_id, end_date');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── Job 2: prune the notification log ────────────────────────────────────
  // notification_log is write-only: nothing in the app displays it, and the
  // single read (notifications/subscription-expiring) only ever looks at rows
  // created TODAY to avoid sending a duplicate reminder. So rows past the
  // retention window carry no functional value — they just inflate every
  // `npm run backup` snapshot (it was the largest table in the dump at 4 MB).
  // 90 days is deliberately generous vs the 1 day actually required, so there's
  // still history to inspect if push delivery ever needs debugging.
  const cutoff = new Date(Date.now() - NOTIFICATION_LOG_RETENTION_DAYS * 86400000).toISOString();

  const { count: prunedCount, error: pruneError } = await supabaseAdmin
    .from('notification_log')
    .delete({ count: 'exact' })
    .lt('created_at', cutoff);

  // A pruning failure must not fail the whole cron — job 1 already succeeded
  // and expiring memberships is the more important of the two.
  if (pruneError) {
    console.error('[cron] notification_log prune failed:', pruneError.message);
  }

  return NextResponse.json({
    expired: data?.length ?? 0,
    rows: data ?? [],
    notificationLogPruned: pruneError ? null : (prunedCount ?? 0),
    notificationLogPruneError: pruneError?.message ?? null,
  });
}
