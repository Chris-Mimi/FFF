export type MemberStatus = 'pending' | 'active' | 'blocked' | 'subscriptions' | 'at-risk';

export type MembershipType = 'member' | 'drop_in' | 'ten_card' | 'wellpass' | 'hansefit' | 'trial';

export type ClassType = 'ekt' | 't' | 'cfk' | 'cft';

export interface Member {
  id: string;
  email: string;
  name: string;
  display_name: string | null;
  phone: string | null;
  status: MemberStatus;
  account_type: 'primary' | 'family_member';
  primary_member_id: string | null;
  athlete_trial_start: string | null;
  athlete_subscription_status: 'trial' | 'active' | 'expired';
  athlete_subscription_end: string | null;
  created_at: string;
  membership_types: MembershipType[];
  ten_card_purchase_date: string | null;
  ten_card_sessions_used: number;
  ten_card_total?: number;
  ten_card_expiry_date?: string | null;
  attendance_count?: number;
  last_attendance_date?: string | null;
  date_of_birth: string | null;
  class_types: ClassType[];
  gender: 'M' | 'F' | null;
}

export const MEMBERSHIP_TYPE_LABELS: Record<MembershipType, string> = {
  member: 'Mb',
  drop_in: 'Di',
  ten_card: '10',
  wellpass: 'Wp',
  hansefit: 'Hf',
  trial: 'Pt',
};

export const MEMBERSHIP_TYPE_COLORS: Record<MembershipType, { active: string; inactive: string }> = {
  member: { active: 'bg-blue-600 text-white', inactive: 'bg-gray-700 text-gray-300 hover:bg-blue-600/20' },
  drop_in: { active: 'bg-emerald-600 text-white', inactive: 'bg-gray-700 text-gray-300 hover:bg-emerald-600/20' },
  ten_card: { active: 'bg-purple-600 text-white', inactive: 'bg-gray-700 text-gray-300 hover:bg-purple-600/20' },
  wellpass: { active: 'bg-orange-600 text-white', inactive: 'bg-gray-700 text-gray-300 hover:bg-orange-600/20' },
  hansefit: { active: 'bg-pink-600 text-white', inactive: 'bg-gray-700 text-gray-300 hover:bg-pink-600/20' },
  trial: { active: 'bg-amber-600 text-white', inactive: 'bg-gray-700 text-gray-300 hover:bg-amber-600/20' },
};

export const CLASS_TYPE_LABELS: Record<ClassType, string> = {
  ekt: 'EKT',
  t: 'Tu',
  cfk: 'CFK',
  cft: 'CFT',
};

export const CLASS_TYPE_COLORS: Record<ClassType, { active: string; inactive: string }> = {
  ekt: { active: 'bg-cyan-600 text-white', inactive: 'bg-gray-700 text-gray-300 hover:bg-cyan-600/20' },
  t: { active: 'bg-indigo-600 text-white', inactive: 'bg-gray-700 text-gray-300 hover:bg-indigo-600/20' },
  cfk: { active: 'bg-rose-600 text-white', inactive: 'bg-gray-700 text-gray-300 hover:bg-rose-600/20' },
  cft: { active: 'bg-violet-600 text-white', inactive: 'bg-gray-700 text-gray-300 hover:bg-violet-600/20' },
};

export const getAge = (dateOfBirth: string | null): number | null => {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const formatMemberDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getTrialStatus = (member: Member) => {
  if (member.athlete_subscription_status === 'trial' && member.athlete_subscription_end) {
    const daysLeft = Math.ceil(
      (new Date(member.athlete_subscription_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysLeft > 0 ? `${daysLeft} days left` : 'Expired';
  }
  return member.athlete_subscription_status === 'active' ? 'Active' : 'No access';
};
