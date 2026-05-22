export type WellpassExemptionMode = 'auto' | 'always_exempt' | 'always_enforce';

export interface WellpassIdentity {
  id: string;
  wellpass_name: string;
  min_checkins_required: number;
  tracked: boolean;
  exemption_mode: WellpassExemptionMode;
  notes: string | null;
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

export interface WellpassIdentityRow extends WellpassIdentity {
  linked_members: WellpassLinkedMember[];
  weekly_history: WellpassWeeklyCheckin[];
  is_exempt: boolean;
  latest_week: WellpassWeeklyCheckin | null;
  status: 'ok' | 'below_threshold' | 'untracked' | 'no_data';
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
