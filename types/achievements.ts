export interface AchievementDefinition {
  id: string;
  name: string;
  category: string;
  branch: string;
  tier: number;
  description?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface AthleteAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  achieved_date: string;
  awarded_by?: string;
  notes?: string;
  created_at: string;
  achievement?: AchievementDefinition; // joined
}

export const ACHIEVEMENT_CATEGORIES = [
  'Bodyweight',
  'Gymnastics',
  'Olympic Lifting',
  'Skills',
  'Endurance',
] as const;

export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number];
