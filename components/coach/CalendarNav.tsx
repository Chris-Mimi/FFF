'use client';

import { WODFormData } from '@/components/coach/WorkoutModal';
import { getWeekNumber } from '@/utils/date-utils';
import { Calendar, CalendarDays, Plus } from 'lucide-react';

type ViewMode = 'weekly' | 'monthly';

interface CalendarNavProps {
  viewMode: ViewMode;
  selectedDate: Date;
  weekDates: Date[];
  focusedDate: Date | null;
  copiedWOD: WODFormData | null;
  onViewModeChange: (mode: ViewMode) => void;
  onPreviousPeriod: () => void;
  onNextPeriod: () => void;
  onTodayClick: () => void;
  onAddWorkout: (date: Date) => void;
  onCancelCopy: () => void;
}

export const CalendarNav = ({
  viewMode,
  selectedDate,
  weekDates,
  focusedDate,
  copiedWOD,
  onViewModeChange,
  onPreviousPeriod,
  onNextPeriod,
  onTodayClick,
  onAddWorkout,
  onCancelCopy,
}: CalendarNavProps) => {
  return (
    <div className='bg-white border-b px-4 py-4 flex-shrink-0 sticky top-[72px] z-30'>
      <div className='w-full space-y-4'>
        {/* View Mode Toggle */}
        <div className='flex justify-center'>
          <div className='inline-flex rounded-lg border border-gray-300 p-1 bg-gray-50'>
            <button
              onClick={() => onViewModeChange('weekly')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition ${
                viewMode === 'weekly'
                  ? 'bg-[#208479] text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              <CalendarDays size={18} />
              Weekly
            </button>
            <button
              onClick={() => onViewModeChange('monthly')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition ${
                viewMode === 'monthly'
                  ? 'bg-[#208479] text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              <Calendar size={18} />
              Monthly
            </button>
          </div>
        </div>

        {/* Period Navigation */}
        <div className='flex justify-between items-center'>
          <button
            onClick={onPreviousPeriod}
            className='px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-900 font-medium'
          >
            {viewMode === 'weekly' ? 'Previous Week' : 'Previous Month'}
          </button>
          <div className='flex items-center gap-4'>
            <button
              onClick={onTodayClick}
              className='px-3 py-1 bg-[#208479] hover:bg-[#1a6b62] rounded text-white text-sm font-medium transition'
            >
              Today
            </button>
            <button
              onClick={() => onAddWorkout(focusedDate || new Date())}
              className='w-10 h-10 bg-teal-600 hover:bg-teal-700 rounded-lg shadow-md flex items-center justify-center transition'
              title={focusedDate ? `Add workout to ${focusedDate.toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}` : 'Add workout'}
            >
              <Plus size={24} strokeWidth={2.5} className='text-white' />
            </button>
            <h2 className='text-xl font-semibold text-gray-900'>
              {viewMode === 'weekly' ? (
                <>
                  Week {getWeekNumber(weekDates[0])} -{' '}
                  {weekDates[0].toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </>
              ) : (
                <>
                  {selectedDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </>
              )}
            </h2>
            {copiedWOD && (
              <button
                onClick={onCancelCopy}
                className='text-xs px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition'
                title='Cancel copy mode'
              >
                Cancel Copy
              </button>
            )}
          </div>
          <button
            onClick={onNextPeriod}
            className='px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-900 font-medium'
          >
            {viewMode === 'weekly' ? 'Next Week' : 'Next Month'}
          </button>
        </div>
      </div>
    </div>
  );
};
