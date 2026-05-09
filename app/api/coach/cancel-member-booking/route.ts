import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';
import { getEffectivePaymentMethod } from '@/types/member';

// Service-role client bypasses RLS so cleanup of cross-user wod_section_results
// + lift_records actually completes. The browser-side equivalent in
// useBookingManagement used the coach's auth token; RLS hid the athlete's rows
// → SELECT returned 0 → userIds.length>0 gate failed → lift_records cleanup
// silently skipped → ghost rows on leaderboard / Lifts / Records.
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

    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'coach_cancelled', updated_at: new Date().toISOString() })
      .eq('id', bookingId);

    if (updateError) {
      console.error('cancel-member-booking update failed:', updateError);
      return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 });
    }

    // 10-card refund — walks to ten_card_holder_id for family-shared cards.
    const { data: member } = await supabaseAdmin
      .from('members')
      .select('membership_types, ten_card_sessions_used, primary_payment_method, ten_card_holder_id')
      .eq('id', memberId)
      .single();

    if (member) {
      const effectiveMethod = getEffectivePaymentMethod({
        primary_payment_method: member.primary_payment_method as never,
        membership_types: member.membership_types as never,
      });

      if (effectiveMethod === 'ten_card') {
        const holderId = member.ten_card_holder_id || memberId;
        let holderUsed = member.ten_card_sessions_used || 0;
        if (holderId !== memberId) {
          const { data: holder } = await supabaseAdmin
            .from('members')
            .select('ten_card_sessions_used')
            .eq('id', holderId)
            .single();
          holderUsed = holder?.ten_card_sessions_used || 0;
        }
        if (holderUsed > 0) {
          await supabaseAdmin
            .from('members')
            .update({ ten_card_sessions_used: holderUsed - 1 })
            .eq('id', holderId);
        }
      }
    }

    // Cleanup scores for this member on this session's WOD.
    const { data: session } = await supabaseAdmin
      .from('weekly_sessions')
      .select('workout_id')
      .eq('id', booking.session_id)
      .single();

    let wsrDeleted = 0;
    let liftRecordsDeleted = 0;

    if (session?.workout_id) {
      // Resolve auth user id — athlete-self-entered scores save with
      // user_id = auth.users.id which can differ from members.id.
      // members.id may equal auth.users.id for self-registered athletes,
      // but family-member rows don't have an auth user at all.
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(memberId);
      const authUserId = authUser?.user?.id ?? null;
      const userIdFilter = authUserId ?? memberId;

      // Capture user_ids from wod_section_results before deletion — lift_records
      // cleanup needs the auth user id, which the wsr row carries.
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
    console.error('cancel-member-booking error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
