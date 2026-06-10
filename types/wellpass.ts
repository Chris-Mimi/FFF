export type WellpassExemptionMode = 'auto' | 'always_exempt' | 'always_enforce';

export interface WellpassIdentity {
  id: string;
  wellpass_name: string;
  min_checkins_required: number;
  tracked: boolean;
  exemption_mode: WellpassExemptionMode;
  notes: string | null;
  paused_at: string | null;
  pause_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface WellpassWeeklyCheckin {
  id: string;
  wellpass_identity_id: string;
  year: number;
  week_number: number;
  week_start: string;
  week_end: string;
  checkin_count: number;
  imported_at: string;
}

export interface WellpassLinkedMember {
  member_id: string;
  name: string;
  athlete_subscription_status: 'trial' | 'active' | 'past_due' | 'expired';
  wellpass_booking_restricted: boolean;
}

export interface WellpassWeeklyBookings {
  year: number;
  week_number: number;
  booking_count: number;
}

export type WellpassBlockReason = 'recent_dormancy' | 'annual_pace' | 'ratio_sustained';

export interface WellpassScoreFields {
  // YTD (since Jan 1 of current calendar year, ISO weeks)
  ytd_logins: number;
  ytd_target: number; // = min × weeks elapsed in year
  ytd_pct: number; // 0–N percent of YTD target hit; 0 when target=0
  ytd_attendances: number;
  ytd_ratio: number | null;

  // All-time (since first imported week for this identity)
  alltime_logins: number;
  alltime_target: number;
  alltime_pct: number;
  alltime_attendances: number;
  alltime_ratio: number | null;

  // Block context — what (if anything) the recompute would trip on right now
  block_reason: WellpassBlockReason | null;
  // Soft yellow flag: shared identity, ratio below 1.5, not yet sustained enough
  // to auto-block. Used by the UI for the early-warning chip.
  ratio_flag: boolean;
  // Whether the ratio rule applies at all (shared identity = linked_members > 1)
  is_shared: boolean;
}

export interface WellpassIdentityRow extends WellpassIdentity, WellpassScoreFields {
  linked_members: WellpassLinkedMember[];
  weekly_history: WellpassWeeklyCheckin[];
  weekly_bookings: WellpassWeeklyBookings[];
  is_exempt: boolean;
  latest_week: WellpassWeeklyCheckin | null;
  status: 'ok' | 'below_threshold' | 'untracked' | 'no_data' | 'paused';
}

export interface ParsedWeekSheet {
  week_number: number;
  week_start: string;
  week_end: string;
  rows: { wellpass_name: string; checkin_count: number }[];
}

export interface WellpassImportResult {
  weeks_imported: number;
  rows_inserted: number;
  identities_created: number;
  identities_linked: number;
  identities_unmatched: string[];
  blocks_applied: { wellpass_name: string; member_names: string[] }[];
  blocks_cleared: { wellpass_name: string; member_names: string[] }[];
}

export const isExempt = (
  identity: Pick<WellpassIdentity, 'exemption_mode'>,
  linkedMembers: Pick<WellpassLinkedMember, 'athlete_subscription_status'>[]
): boolean => {
  if (identity.exemption_mode === 'always_exempt') return true;
  if (identity.exemption_mode === 'always_enforce') return false;
  return linkedMembers.some((m) => m.athlete_subscription_status === 'active');
};
