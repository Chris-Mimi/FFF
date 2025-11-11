'use client';

import AthletePageBenchmarksTab from '@/components/athlete/AthletePageBenchmarksTab';
import AthletePageForgeBenchmarksTab from '@/components/athlete/AthletePageForgeBenchmarksTab';
import AthletePageLiftsTab from '@/components/athlete/AthletePageLiftsTab';
import AthletePageLogbookTab from '@/components/athlete/AthletePageLogbookTab';
import AthletePageProfileTab from '@/components/athlete/AthletePageProfileTab';
import AthletePageRecordsTab from '@/components/athlete/AthletePageRecordsTab';
import AthletePageSecurityTab from '@/components/athlete/AthletePageSecurityTab';
import AthletePageWorkoutsTab from '@/components/athlete/AthletePageWorkoutsTab';
import { getCurrentUserId } from '@/lib/auth';
import { Award, BookOpen, Calendar, Dumbbell, Shield, Target, Trophy, User } from 'lucide-react';
import { useState } from 'react';

export default function AthletePage() {
  const [activeTab, setActiveTab] = useState('workouts');
  const activeProfileId = getCurrentUserId();
  const logbookDate = new Date();

  // ✅ Add tabs array here
  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'workouts', label: 'Workouts', icon: Calendar },
    { id: 'logbook', label: 'Athlete Logbook', icon: BookOpen },
    { id: 'benchmarks', label: 'Benchmark Workouts', icon: Trophy },
    { id: 'forge-benchmarks', label: 'Forge Benchmarks', icon: Target },
    { id: 'lifts', label: 'Barbell Lifts', icon: Dumbbell },
    { id: 'records', label: 'Personal Records', icon: Award },
    { id: 'security', label: 'Access & Security', icon: Shield },
  ];

  // ...existing switch logic below
  switch (activeTab) {
    case 'workouts':
      return <AthletePageWorkoutsTab userId={activeProfileId} />;
    case 'profile':
      return <AthletePageProfileTab userId={activeProfileId} />;
    case 'logbook':
      return <AthletePageLogbookTab userId={activeProfileId} initialDate={logbookDate} />;
    case 'benchmarks':
      return <AthletePageBenchmarksTab userId={activeProfileId} />;
    case 'forge-benchmarks':
      return <AthletePageForgeBenchmarksTab userId={activeProfileId} />;
    case 'lifts':
      return <AthletePageLiftsTab userId={activeProfileId} />;
    case 'records':
      return <AthletePageRecordsTab userId={activeProfileId} />;
    case 'security':
      return <AthletePageSecurityTab />;
    default:
      return null;
  }
}
