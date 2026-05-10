export type GymContractType =
  | 'full_year_upfront'
  | 'monthly_1_year'
  | 'monthly_6_months';

export type GymMembershipStatus = 'active' | 'expired' | 'cancelled';

export interface GymMembership {
  id: string;
  member_id: string;
  contract_type: GymContractType;
  start_date: string;   // YYYY-MM-DD
  end_date: string;     // YYYY-MM-DD
  status: GymMembershipStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const CONTRACT_TYPE_LABELS: Record<GymContractType, string> = {
  full_year_upfront: '1 year (paid upfront)',
  monthly_1_year: '1 year (monthly)',
  monthly_6_months: '6 months (monthly)',
};

export function contractDurationMonths(t: GymContractType): number {
  return t === 'monthly_6_months' ? 6 : 12;
}

/**
 * Compute end_date for a given contract type and start_date.
 * Adds N months to the start_date; the result is the day BEFORE the next
 * contract anniversary (e.g. 2026-05-10 + 12mo → 2027-05-09).
 */
export function computeContractEndDate(
  startDate: string,
  contractType: GymContractType,
): string {
  const months = contractDurationMonths(contractType);
  const [y, m, d] = startDate.split('-').map(Number);
  const end = new Date(Date.UTC(y, m - 1 + months, d));
  end.setUTCDate(end.getUTCDate() - 1);
  return end.toISOString().slice(0, 10);
}
