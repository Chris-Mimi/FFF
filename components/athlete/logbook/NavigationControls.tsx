'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface NavigationControlsProps {
  viewMode: 'day' | 'week' | 'month';
  selectedDate: Date;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

export default function NavigationControls({
  viewMode,
  selectedDate,
  onPrevious,
  onNext,
  onToday,
}: NavigationControlsProps) {
  const getDateLabel = () => {
    if (viewMode === 'day') {
      return selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } else if (viewMode === 'week') {
      return `Week of ${selectedDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })}`;
    } else {
      return selectedDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      });
    }
  };

  const getPreviousLabel = () => {
    if (viewMode === 'day') return 'Previous Day';
    if (viewMode === 'week') return 'Previous Week';
    return 'Previous Month';
  };

  const getNextLabel = () => {
    if (viewMode === 'day') return 'Next Day';
    if (viewMode === 'week') return 'Next Week';
    return 'Next Month';
  };

  return (
    <div className='flex items-center justify-between mb-6'>
      <button
        onClick={onPrevious}
        className='p-2 hover:bg-gray-100 rounded-full transition text-gray-900'
        title={getPreviousLabel()}
        aria-label={getPreviousLabel()}
      >
        <ChevronLeft size={24} />
      </button>

      <div className='flex items-center gap-2 md:gap-3'>
        <h3 className='text-sm md:text-lg font-semibold text-gray-900'>
          {getDateLabel()}
        </h3>
        <button
          onClick={onToday}
          className='px-2 md:px-3 py-1 bg-[#208479] hover:bg-[#1a6b62] text-white text-xs md:text-sm rounded-lg font-medium transition'
        >
          Today
        </button>
      </div>

      <button
        onClick={onNext}
        className='p-2 hover:bg-gray-100 rounded-full transition text-gray-900'
        title={getNextLabel()}
        aria-label={getNextLabel()}
      >
        <ChevronRight size={24} />
      </button>
    </div>
  );
}
