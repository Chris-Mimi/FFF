export type AchievementDifficulty = 'bronze' | 'silver' | 'gold' | 'platinum';

export const ACHIEVEMENT_DIFFICULTIES: AchievementDifficulty[] = [
  'bronze', 'silver', 'gold', 'platinum',
];

export interface AchievementDefinition {
  id: string;
  name: string;
  category: string;
  branch: string;
  tier: number;
  difficulty: AchievementDifficulty;
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
  'Strength',
  'Skills',
  'Endurance',
] as const;

export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number];
