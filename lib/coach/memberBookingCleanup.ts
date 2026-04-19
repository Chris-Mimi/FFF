import { SupabaseClient } from '@supabase/supabase-js';

// Cancels all future confirmed/waitlist bookings for a member.
// Called when a member is blocked or unapproved so their dangling bookings
// don't linger (UI would render them as "Unknown Member" if the member row's
// name resolution is compromised, and capacity is wasted).
//
// Past sessions are left alone — they're historical record.
// Returns count of cancelled bookings.
export async function cancelFutureBookingsForMember(
  supabase: SupabaseClient,
  memberId: string
): Promise<number> {
  const today = new Date().toISOString().split('T')[0];

  const { data: upcoming, error: fetchErr } = await supabase
    .from('bookings')
    .select('id, weekly_sessions!inner(date)')
    .eq('member_id', memberId)
    .in('status', ['confirmed', 'waitlist'])
    .gte('weekly_sessions.date', today);

  if (fetchErr) {
    console.error('Failed to load upcoming bookings for member:', memberId, fetchErr);
    return 0;
  }

  const ids = (upcoming || []).map((b) => b.id);
  if (ids.length === 0) return 0;

  const { error: updateErr } = await supabase
    .from('bookings')
    .update({ status: 'coach_cancelled', updated_at: new Date().toISOString() })
    .in('id', ids);

  if (updateErr) {
    console.error('Failed to cancel bookings for member:', memberId, updateErr);
    return 0;
  }

  return ids.length;
}
