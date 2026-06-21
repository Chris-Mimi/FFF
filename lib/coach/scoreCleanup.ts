import type { SupabaseClient } from '@supabase/supabase-js';

export interface ScoreCleanupResult {
  wsrDeleted: number;
  liftRecordsDeleted: number;
  reactionsDeleted: number;
}

// Removes a single athlete's SESSION score attached to one WOD:
// wod_section_results plus any reactions pointing at those rows. Used by every
// booking-deletion path (athlete cancel, coach cancel, late-cancel,
// delete-incident, delete-session) to guarantee no ghost scores remain on the
// session whiteboard / leaderboard.
//
// Deliberately does NOT delete lift_records. A lift_record is the athlete's
// personal-record history, keyed to a DATE, independent of any booking. The
// only people whose bookings get removed are no-shows — who never posted a
// score — so deleting their records was always a no-op in practice. It only
// ever fired destructively when a booking was pulled out from under an athlete
// who DID attend and lift: moving people between parallel sessions (a silent
// cancel + re-add), deleting/recreating a session, or regenerating the week.
// That silently wiped real PRs (the March/April Back Squat + Pendlay testing
// loss). A lift someone actually posted stays in their record book no matter
// how the booking is shuffled; genuinely-bad records are removed by hand via
// the athlete page (delete-lift).
//
// MUST be called with a service-role client. RLS hides cross-user reactions
// from the cancelling athlete and hides athlete-owned rows from a coach
// session (S344 incident).
//
// authUserId is the linked auth.users.id when the athlete has a login;
// pass null for family-member rows that have no auth user. The member_id /
// user_id OR-filter matches both coach-entered scores (saved with member_id)
// and athlete-self-entered scores (saved with user_id).
export async function cleanupAthleteScoresForWod(
  supabaseAdmin: SupabaseClient,
  wodId: string,
  memberId: string,
  authUserId: string | null,
): Promise<ScoreCleanupResult> {
  const userIdFilter = authUserId ?? memberId;

  // Capture WSR row ids before deletion — reactions FK by target_id and need
  // the actual ids to clean up.
  const { data: existingResults } = await supabaseAdmin
    .from('wod_section_results')
    .select('id')
    .eq('wod_id', wodId)
    .or(`member_id.eq.${memberId},user_id.eq.${userIdFilter}`);

  const wsrIds = (existingResults || []).map(r => r.id as string);

  // Reactions first — no FK constraint, so they'd be orphaned if the WSR
  // rows are deleted before this step.
  let reactionsDeleted = 0;
  if (wsrIds.length > 0) {
    const { count } = await supabaseAdmin
      .from('reactions')
      .delete({ count: 'exact' })
      .eq('target_type', 'wod_section_result')
      .in('target_id', wsrIds);
    reactionsDeleted += count ?? 0;
  }

  const { count: wsrCount } = await supabaseAdmin
    .from('wod_section_results')
    .delete({ count: 'exact' })
    .eq('wod_id', wodId)
    .or(`member_id.eq.${memberId},user_id.eq.${userIdFilter}`);

  return {
    wsrDeleted: wsrCount ?? 0,
    liftRecordsDeleted: 0, // never deleted here — see header
    reactionsDeleted,
  };
}

// Resolve the auth.users.id for a members.id (returns null if no auth user,
// e.g. family-member rows). Shared lookup used by every cleanup endpoint.
export async function resolveAuthUserId(
  supabaseAdmin: SupabaseClient,
  memberId: string,
): Promise<string | null> {
  const { data } = await supabaseAdmin.auth.admin.getUserById(memberId);
  return data?.user?.id ?? null;
}
