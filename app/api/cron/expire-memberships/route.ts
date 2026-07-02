/**
 * Daily cron: flip gym_memberships rows whose end_date has passed
 * from status='active' → 'expired'.
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

  return NextResponse.json({
    expired: data?.length ?? 0,
    rows: data ?? [],
  });
}
