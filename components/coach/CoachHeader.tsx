'use client';

import { BarChart3, Calendar, Dumbbell, Image as ImageIcon, LogOut, Plus, Settings, UserCheck, Users } from 'lucide-react';
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

  // Button styling - smaller on mobile
  const buttonClass = 'flex items-center justify-center gap-1 bg-[#14758c] hover:bg-teal-800 px-2 py-1.5 md:px-4 md:py-2 rounded-lg transition text-xs md:text-sm';
  const iconSize = 16;

  return (
    <header className='bg-teal-900 text-white p-2 md:p-4 shadow-lg sticky top-0 z-50'>
      <div className='max-w-7xl mx-auto'>
        {/* Desktop: horizontal layout */}
        <div className='hidden lg:flex justify-between items-center'>
          <div>
            <h1 className='text-2xl font-bold'>The Forge - Coach Dashboard</h1>
            <p className='text-teal-100'>Welcome, {userName}</p>
          </div>
          <div className='flex items-center gap-3'>
            <button
              onClick={onSearchPanelToggle}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${searchPanelOpen ? 'bg-teal-800' : 'bg-[#14758c] hover:bg-teal-800'}`}
            >
              <Plus size={18} />
              Workouts
            </button>
            <button onClick={() => router.push('/coach/schedule')} className='flex items-center gap-2 bg-[#14758c] hover:bg-teal-800 px-4 py-2 rounded-lg transition'>
              <Calendar size={18} />
              Schedule
            </button>
            <button onClick={() => router.push('/coach/members')} className='flex items-center gap-2 bg-[#14758c] hover:bg-teal-800 px-4 py-2 rounded-lg transition'>
              <UserCheck size={18} />
              Members
            </button>
            <button onClick={() => router.push('/coach/athletes')} className='flex items-center gap-2 bg-[#14758c] hover:bg-teal-800 px-4 py-2 rounded-lg transition'>
              <Users size={18} />
              Athletes
            </button>
            <button onClick={() => router.push('/coach/analysis')} className='flex items-center gap-2 bg-[#14758c] hover:bg-teal-800 px-4 py-2 rounded-lg transition'>
              <BarChart3 size={18} />
              Analysis
            </button>
            <button onClick={() => router.push('/coach/benchmarks-lifts')} className='flex items-center gap-2 bg-[#14758c] hover:bg-teal-800 px-4 py-2 rounded-lg transition'>
              <Dumbbell size={18} />
              Toolkit
            </button>
            <button onClick={() => router.push('/coach/whiteboard')} className='flex items-center gap-2 bg-[#14758c] hover:bg-teal-800 px-4 py-2 rounded-lg transition'>
              <ImageIcon size={18} />
              Whiteboard
            </button>
            <button onClick={() => router.push('/coach/admin')} className='flex items-center gap-2 bg-[#14758c] hover:bg-teal-800 px-4 py-2 rounded-lg transition'>
              <Settings size={18} />
              Admin
            </button>
            <button onClick={onLogout} className='flex items-center gap-2 bg-[#14758c] hover:bg-teal-800 px-4 py-2 rounded-lg transition'>
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>

        {/* Mobile: 2-column, 5-row grid layout */}
        <div className='lg:hidden'>
          <div className='text-center mb-2'>
            <h1 className='text-base font-bold'>The Forge</h1>
          </div>
          <div className='grid grid-cols-2 gap-1.5'>
            <button
              onClick={onSearchPanelToggle}
              className={`${buttonClass} ${searchPanelOpen ? 'bg-teal-800' : ''}`}
            >
              <Plus size={iconSize} />
              <span>Workouts</span>
            </button>
            <button onClick={() => router.push('/coach/schedule')} className={buttonClass}>
              <Calendar size={iconSize} />
              <span>Schedule</span>
            </button>
            <button onClick={() => router.push('/coach/members')} className={buttonClass}>
              <UserCheck size={iconSize} />
              <span>Members</span>
            </button>
            <button onClick={() => router.push('/coach/athletes')} className={buttonClass}>
              <Users size={iconSize} />
              <span>Athletes</span>
            </button>
            <button onClick={() => router.push('/coach/analysis')} className={buttonClass}>
              <BarChart3 size={iconSize} />
              <span>Analysis</span>
            </button>
            <button onClick={() => router.push('/coach/benchmarks-lifts')} className={buttonClass}>
              <Dumbbell size={iconSize} />
              <span>Toolkit</span>
            </button>
            <button onClick={() => router.push('/coach/whiteboard')} className={buttonClass}>
              <ImageIcon size={iconSize} />
              <span>Whiteboard</span>
            </button>
            <button onClick={() => router.push('/coach/admin')} className={buttonClass}>
              <Settings size={iconSize} />
              <span>Admin</span>
            </button>
            <button onClick={onLogout} className={buttonClass}>
              <LogOut size={iconSize} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
