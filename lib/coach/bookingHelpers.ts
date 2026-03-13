interface Booking {
  id: string;
  status: 'confirmed' | 'waitlist' | 'cancelled' | 'no_show' | 'late_cancel' | 'coach_cancelled';
  member: {
    id: string;
    name: string;
    email: string;
  };
}

interface Member {
  id: string;
  name: string;
  email: string;
  membership_types: string[];
  ten_card_sessions_used: number;
}

/**
 * Filter out members who already have active bookings
 * @param allMembers - All active members
 * @param currentBookings - Current session bookings
 * @returns Members available for booking
 */
export function filterAvailableMembers(
  allMembers: Member[],
  currentBookings: Booking[]
): Member[] {
  const bookedMemberIds = currentBookings
    .filter(b => b.status === 'confirmed' || b.status === 'waitlist')
    .map(b => b.member.id);

  return allMembers.filter(m => !bookedMemberIds.includes(m.id));
}

/**
 * Calculate number of confirmed bookings
 * @param bookings - All bookings for session
 * @returns Count of confirmed bookings
 */
export function calculateConfirmedCount(bookings: Booking[]): number {
  return bookings.filter(b => b.status === 'confirmed').length;
}

/**
 * Check if member can be added to session
 * @param confirmedCount - Current confirmed bookings
 * @param capacity - Session capacity
 * @returns True if can add to confirmed, false if should be waitlisted
 */
export function canAddToSession(confirmedCount: number, capacity: number): boolean {
  return confirmedCount < capacity;
}

/**
 * Calculate how many waitlist members can be promoted
 * @param newCapacity - Updated capacity
 * @param confirmedCount - Current confirmed bookings
 * @returns Number of spots opened
 */
export function getWaitlistPromoCount(newCapacity: number, confirmedCount: number): number {
  const spotsOpened = newCapacity - confirmedCount;
  return spotsOpened > 0 ? spotsOpened : 0;
}
