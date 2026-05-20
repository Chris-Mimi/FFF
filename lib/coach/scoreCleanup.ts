import type { SupabaseClient } from '@supabase/supabase-js';

export interface ScoreCleanupResult {
  wsrDeleted: number;
  liftRecordsDeleted: number;
  reactionsDeleted: number;
}

// Removes a single athlete's scores attached to one WOD: wod_section_results,
// lift_records, and any reactions pointing at those rows. Used by every
// booking-deletion path (athlete cancel, coach cancel, late-cancel,
// delete-incident, delete-session) to guarantee no ghost scores remain.
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

  // Capture row ids before deletion — reactions FK by target_id and need
  // the actual ids to clean up.
  const { data: existingResults } = await supabaseAdmin
    .from('wod_section_results')
    .select('id, user_id')
    .eq('wod_id', wodId)
    .or(`member_id.eq.${memberId},user_id.eq.${userIdFilter}`);

  const wsrIds = (existingResults || []).map(r => r.id as string);
  const userIds = [...new Set((existingResults || []).map(r => r.user_id).filter(Boolean) as string[])];

  let liftRecordIds: string[] = [];
  if (userIds.length > 0) {
    const { data: existingLifts } = await supabaseAdmin
      .from('lift_records')
      .select('id')
      .eq('wod_id', wodId)
      .in('user_id', userIds);
    liftRecordIds = (existingLifts || []).map(r => r.id as string);
  }

  // Reactions first — no FK constraint, so they'd be orphaned if WSR/lift
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
  if (liftRecordIds.length > 0) {
    const { count } = await supabaseAdmin
      .from('reactions')
      .delete({ count: 'exact' })
      .eq('target_type', 'lift_record')
      .in('target_id', liftRecordIds);
    reactionsDeleted += count ?? 0;
  }

  const { count: wsrCount } = await supabaseAdmin
    .from('wod_section_results')
    .delete({ count: 'exact' })
    .eq('wod_id', wodId)
    .or(`member_id.eq.${memberId},user_id.eq.${userIdFilter}`);

  let liftRecordsDeleted = 0;
  if (userIds.length > 0) {
    const { count } = await supabaseAdmin
      .from('lift_records')
      .delete({ count: 'exact' })
      .eq('wod_id', wodId)
      .in('user_id', userIds);
    liftRecordsDeleted = count ?? 0;
  }

  return {
    wsrDeleted: wsrCount ?? 0,
    liftRecordsDeleted,
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
