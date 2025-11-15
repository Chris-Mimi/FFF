'use client';

import { BarChart3, Calendar, Dumbbell, LogOut, Plus, UserCheck, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CoachHeaderProps {
  userName: string;
  searchPanelOpen: boolean;
  onSearchPanelToggle: () => void;
  onLogout: () => void;
}

export const CoachHeader = ({
  userName,
  searchPanelOpen,
  onSearchPanelToggle,
  onLogout,
}: CoachHeaderProps) => {
  const router = useRouter();

  return (
    <header className='bg-[#208479] text-white p-4 shadow-lg sticky top-0 z-50'>
      <div className='max-w-7xl mx-auto flex justify-between items-center'>
        <div>
          <h1 className='text-2xl font-bold'>The Forge - Coach Dashboard</h1>
          <p className='text-teal-100'>Welcome, {userName}</p>
        </div>
        <div className='flex items-center gap-3'>
          <button
            onClick={onSearchPanelToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${searchPanelOpen ? 'bg-teal-800' : 'bg-[#1a6b62] hover:bg-teal-800'}`}
          >
            <Plus size={18} />
            Workout Library
          </button>
          <button
            onClick={() => router.push('/coach/schedule')}
            className='flex items-center gap-2 bg-[#1a6b62] hover:bg-teal-800 px-4 py-2 rounded-lg transition'
          >
            <Calendar size={18} />
            Schedule
          </button>
          <button
            onClick={() => router.push('/coach/members')}
            className='flex items-center gap-2 bg-[#1a6b62] hover:bg-teal-800 px-4 py-2 rounded-lg transition'
          >
            <UserCheck size={18} />
            Members
          </button>
          <button
            onClick={() => router.push('/coach/athletes')}
            className='flex items-center gap-2 bg-[#1a6b62] hover:bg-teal-800 px-4 py-2 rounded-lg transition'
          >
            <Users size={18} />
            Athletes
          </button>
          <button
            onClick={() => router.push('/coach/analysis')}
            className='flex items-center gap-2 bg-[#1a6b62] hover:bg-teal-800 px-4 py-2 rounded-lg transition'
          >
            <BarChart3 size={18} />
            Analysis
          </button>
          <button
            onClick={() => router.push('/coach/benchmarks-lifts')}
            className='flex items-center gap-2 bg-[#1a6b62] hover:bg-teal-800 px-4 py-2 rounded-lg transition'
          >
            <Dumbbell size={18} />
            Benchmarks & Lifts
          </button>
          <button
            onClick={onLogout}
            className='flex items-center gap-2 bg-[#1a6b62] hover:bg-teal-800 px-4 py-2 rounded-lg transition'
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};
