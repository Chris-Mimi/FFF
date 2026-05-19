import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';

// Service-role client bypasses RLS so cleanup of cross-user wod_section_results
// + lift_records actually completes. Browser-side cleanup with the coach's auth
// token hides the athlete's rows (S344-class incident).
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const { bookingId } = (await request.json()) as { bookingId?: string };
    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
    }

    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('id, member_id, session_id, status')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const memberId: string = booking.member_id;

    // Late-cancel DOES consume the 10-card (per the existing UX copy), so we do
    // NOT flip ten_card_consumed here — unlike coach-cancel which refunds.
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'late_cancel', updated_at: new Date().toISOString() })
      .eq('id', bookingId);

    if (updateError) {
      console.error('mark-late-cancel update failed:', updateError);
      return NextResponse.json({ error: 'Failed to mark late cancellation' }, { status: 500 });
    }

    // Cleanup any scores entered for this member on this session's WOD.
    // Late-cancel = athlete didn't attend, so any score is wrong (typically
    // entered by mistake — e.g. via copy-down). Mirrors the cleanup in
    // /api/coach/cancel-member-booking.
    const { data: session } = await supabaseAdmin
      .from('weekly_sessions')
      .select('workout_id')
      .eq('id', booking.session_id)
      .single();

    let wsrDeleted = 0;
    let liftRecordsDeleted = 0;

    if (session?.workout_id) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(memberId);
      const authUserId = authUser?.user?.id ?? null;
      const userIdFilter = authUserId ?? memberId;

      const { data: existingResults } = await supabaseAdmin
        .from('wod_section_results')
        .select('id, user_id')
        .eq('wod_id', session.workout_id)
        .or(`member_id.eq.${memberId},user_id.eq.${userIdFilter}`);

      const userIds = [...new Set((existingResults || []).map(r => r.user_id).filter(Boolean))];

      const { count: wsrCount } = await supabaseAdmin
        .from('wod_section_results')
        .delete({ count: 'exact' })
        .eq('wod_id', session.workout_id)
        .or(`member_id.eq.${memberId},user_id.eq.${userIdFilter}`);
      wsrDeleted = wsrCount ?? 0;

      if (userIds.length > 0) {
        const { count: lrCount } = await supabaseAdmin
          .from('lift_records')
          .delete({ count: 'exact' })
          .eq('wod_id', session.workout_id)
          .in('user_id', userIds);
        liftRecordsDeleted = lrCount ?? 0;
      }
    }

    return NextResponse.json({
      success: true,
      wsrDeleted,
      liftRecordsDeleted,
    });
  } catch (error) {
    console.error('mark-late-cancel error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
