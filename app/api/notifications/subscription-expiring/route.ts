import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';
import { notifySubscriptionExpiring, notifySubscriptionExpiringCoach } from '@/lib/notifications';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const { memberId } = await request.json();

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
    }

    const { data: member } = await supabaseAdmin
      .from('members')
      .select('id, name, display_name, athlete_subscription_end')
      .eq('id', memberId)
      .single();

    if (!member || !member.athlete_subscription_end) {
      return NextResponse.json({ error: 'Member not found or no end date' }, { status: 404 });
    }

    const now = new Date();
    const end = new Date(member.athlete_subscription_end);
    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0 || daysLeft > 14) {
      return NextResponse.json({ success: true, skipped: true });
    }

    // Check if we already notified today (prevent duplicates across page loads)
    const todayStr = now.toISOString().split('T')[0];
    const { data: existingLog } = await supabaseAdmin
      .from('notification_log')
      .select('id')
      .eq('user_id', memberId)
      .eq('notification_type', 'subscription_expiring')
      .gte('created_at', todayStr + 'T00:00:00')
      .lte('created_at', todayStr + 'T23:59:59')
      .maybeSingle();

    if (existingLog) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const memberName = member.display_name || member.name;
    notifySubscriptionExpiring(memberId, daysLeft);
    notifySubscriptionExpiringCoach(memberName, daysLeft);

    return NextResponse.json({ success: true, daysLeft });
  } catch (error) {
    console.error('Subscription expiring notification error:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
