'use client';

import LeaderboardView from './LeaderboardView';

interface AthletePageCommunityTabProps {
  userId: string;
  initialDate?: Date;
  onDateChange?: (date: Date) => void;
}

export default function AthletePageCommunityTab({ userId, initialDate, onDateChange }: AthletePageCommunityTabProps) {
  return (
    <LeaderboardView userId={userId} initialDate={initialDate} onDateChange={onDateChange} />
  );
}
