export const PERSONAL_ACTIVITY_TYPES = [
  'Schwimmen',
  'Laufen',
  'Radfahren',
  'Yoga',
  'Wandern',
  'Externes CrossFit',
  'Anderes Studio',
  'Sonstiges',
] as const;

export type PersonalActivityType = typeof PERSONAL_ACTIVITY_TYPES[number];

export interface PersonalActivity {
  id: string;
  user_id: string;
  activity_date: string;
  activity_type: PersonalActivityType | string;
  duration_min: number | null;
  effort: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonalActivityInput {
  activity_date: string;
  activity_type: PersonalActivityType | string;
  duration_min: number | null;
  effort: number | null;
  notes: string | null;
}
