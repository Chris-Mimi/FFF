import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Validate new capacity against confirmed bookings
 * @param newCapacity - Proposed new capacity
 * @param confirmedCount - Current confirmed bookings
 * @returns Validation result with message
 */
export function validateCapacity(
  newCapacity: number,
  confirmedCount: number
): { valid: boolean; message?: string } {
  if (newCapacity < 0) {
    return { valid: false, message: 'Capacity cannot be negative' };
  }

  // 0 = unlimited capacity, skip confirmed count check
  if (newCapacity === 0) {
    return { valid: true };
  }

  if (newCapacity < confirmedCount) {
    return {
      valid: false,
      message: `Cannot reduce capacity below confirmed bookings (${confirmedCount})`,
    };
  }

  return { valid: true };
}

/**
 * Promote waitlist members when capacity increases
 * @param supabase - Supabase client
 * @param sessionId - Session ID
 * @param spotsOpened - Number of new spots available
 * @returns Promise resolving when promotion complete
 */
export async function promoteWaitlistMembers(
  supabase: SupabaseClient,
  sessionId: string,
  spotsOpened: number
): Promise<string[]> {
  if (spotsOpened <= 0) return [];

  // Fetch waitlist bookings in order
  const { data: waitlistBookings } = await supabase
    .from('bookings')
    .select('id, member_id')
    .eq('session_id', sessionId)
    .eq('status', 'waitlist')
    .order('booked_at', { ascending: true })
    .limit(spotsOpened);

  if (!waitlistBookings || waitlistBookings.length === 0) return [];

  const promotedMemberIds: string[] = [];

  // Promote each waitlist member
  for (const booking of waitlistBookings) {
    // Update booking status
    await supabase
      .from('bookings')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', booking.id);

    // Increment 10-card if applicable
    const { data: member } = await supabase
      .from('members')
      .select('membership_types, ten_card_sessions_used')
      .eq('id', booking.member_id)
      .single();

    if (member?.membership_types?.includes('ten_card')) {
      await supabase
        .from('members')
        .update({
          ten_card_sessions_used: (member.ten_card_sessions_used || 0) + 1,
        })
        .eq('id', booking.member_id);
    }

    promotedMemberIds.push(booking.member_id);
  }

  return promotedMemberIds;
}

/**
 * Update workout capacity (if workout exists)
 * @param supabase - Supabase client
 * @param workoutId - Workout ID (nullable)
 * @param newCapacity - New capacity value
 */
export async function updateWorkoutCapacity(
  supabase: SupabaseClient,
  workoutId: string | null,
  newCapacity: number
): Promise<void> {
  if (!workoutId) return;

  await supabase
    .from('wods')
    .update({ max_capacity: newCapacity })
    .eq('id', workoutId);
}

/**
 * Promote waitlist members for a session after its capacity has been updated.
 * Handles capacity === 0 (unlimited) by promoting every waitlist entry.
 */
export async function promoteWaitlistForSession(
  supabase: SupabaseClient,
  sessionId: string,
  newCapacity: number
): Promise<string[]> {
  if (newCapacity === 0) {
    const { count: waitlistCount } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('status', 'waitlist');
    return promoteWaitlistMembers(supabase, sessionId, waitlistCount || 0);
  }

  const { count: confirmedCount } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('status', 'confirmed');

  const spotsOpened = newCapacity - (confirmedCount || 0);
  return promoteWaitlistMembers(supabase, sessionId, spotsOpened);
}

/**
 * Promote waitlist for every session linked to a given workout after its capacity changed.
 */
export async function promoteWaitlistForWorkout(
  supabase: SupabaseClient,
  workoutId: string,
  newCapacity: number
): Promise<string[]> {
  const { data: sessions } = await supabase
    .from('weekly_sessions')
    .select('id')
    .eq('workout_id', workoutId);

  if (!sessions || sessions.length === 0) return [];

  const promoted: string[] = [];
  for (const s of sessions) {
    const ids = await promoteWaitlistForSession(supabase, s.id, newCapacity);
    promoted.push(...ids);
  }
  return promoted;
}
