import type { SupabaseClient } from '@supabase/supabase-js';
import { notifyWaitlistPromoted } from '@/lib/notifications';

/**
 * Promotes the longest-waiting waitlist booking on a session to confirmed,
 * cascading the 10-card increment for ten_card payers (own card or shared
 * parent card) and firing the waitlist-promoted notification.
 *
 * Caller is responsible for deciding WHEN to promote (e.g. after a confirmed
 * booking was cancelled, or after a confirmed booking became OG and freed
 * a slot). This helper does NOT check capacity itself.
 */
export async function promoteFromWaitlist(
  supabase: SupabaseClient,
  sessionId: string,
  session: { date: string; time: string }
): Promise<{ promotedMemberId: string | null }> {
  const { data: waitlistBookings } = await supabase
    .from('bookings')
    .select('id, member_id')
    .eq('session_id', sessionId)
    .eq('status', 'waitlist')
    .order('booked_at', { ascending: true })
    .limit(1);

  if (!waitlistBookings || waitlistBookings.length === 0) {
    return { promotedMemberId: null };
  }

  const firstWaitlist = waitlistBookings[0];

  await supabase
    .from('bookings')
    .update({ status: 'confirmed', updated_at: new Date().toISOString() })
    .eq('id', firstWaitlist.id);

  const { data: promotedMember } = await supabase
    .from('members')
    .select('id, membership_types, primary_payment_method, ten_card_holder_id, ten_card_sessions_used, ten_card_total')
    .eq('id', firstWaitlist.member_id)
    .single();

  const promotedMethod = promotedMember?.primary_payment_method || promotedMember?.membership_types?.[0] || null;
  const promotedUsesTenCard = promotedMethod === 'ten_card';
  const promotedHolderId = promotedUsesTenCard && promotedMember
    ? (promotedMember.ten_card_holder_id || promotedMember.id)
    : null;

  if (promotedUsesTenCard && promotedHolderId && promotedMember) {
    let holderUsed: number;
    let holderTotal: number;
    if (promotedHolderId === promotedMember.id) {
      holderUsed = promotedMember.ten_card_sessions_used || 0;
      holderTotal = promotedMember.ten_card_total || 10;
    } else {
      const { data: holder } = await supabase
        .from('members')
        .select('ten_card_sessions_used, ten_card_total')
        .eq('id', promotedHolderId)
        .single();
      holderUsed = holder?.ten_card_sessions_used || 0;
      holderTotal = holder?.ten_card_total || 10;
    }

    if (holderUsed < holderTotal) {
      await supabase
        .from('members')
        .update({ ten_card_sessions_used: holderUsed + 1 })
        .eq('id', promotedHolderId);
    }
  }

  notifyWaitlistPromoted(firstWaitlist.member_id, session.date, session.time);

  return { promotedMemberId: firstWaitlist.member_id };
}
