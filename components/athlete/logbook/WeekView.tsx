'use client';

import { getWeekDates, formatLocalDate, type WOD } from '@/utils/logbook-utils';

interface WeekViewProps {
  selectedDate: Date;
  workouts: WOD[];
  loading: boolean;
  onDateSelect: (date: Date) => void;
  onViewModeChange: (mode: 'day') => void;
}

export default function WeekView({
  selectedDate,
  workouts,
  loading,
  onDateSelect,
  onViewModeChange,
}: WeekViewProps) {
  const handleWorkoutClick = (date: Date) => {
    onDateSelect(date);
    onViewModeChange('day');
  };

  return (
    <div>
      {loading ? (
        <div className='text-center text-gray-500 py-8'>Loading workouts...</div>
      ) : (
        <div className='grid grid-cols-7 gap-4'>
          {getWeekDates(selectedDate).map((date, index) => {
            const dateStr = formatLocalDate(date);
            const dayWorkouts = workouts.filter(w => w.date === dateStr);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

            return (
              <div key={index} className='bg-gray-50 rounded-lg p-3 min-h-[200px]'>
                <div className='text-center mb-3'>
                  <div className='text-sm font-semibold text-gray-900'>{dayName}</div>
                  <div className='text-sm text-gray-600'>
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>

                {dayWorkouts.length > 0 ? (
                  <div className='space-y-2'>
                    {dayWorkouts.map(wod => (
                      <button
                        key={wod.id}
                        onClick={() => handleWorkoutClick(date)}
                        className={`w-full text-left p-2 rounded border hover:shadow-sm transition ${
                          wod.booked ? 'bg-[#7dd3c0] border-[#7dd3c0]' : 'bg-white'
                        }`}
                      >
                        {wod.booked ? (
                          <div className='text-xs font-bold text-gray-900 text-center'>Booked</div>
                        ) : (
                          <div className='flex items-center gap-2 mb-1'>
                            {wod.tracks && (
                              <div
                                className='w-2 h-2 rounded-full flex-shrink-0'
                                style={{ backgroundColor: wod.tracks.color || '#178da6' }}
                              />
                            )}
                            <span className='text-xs font-medium text-gray-900 truncate'>
                              {wod.session_type || wod.title}
                              {(wod.workout_name || wod.tracks?.name) && (
                                <span className='text-gray-600'> - {wod.workout_name || wod.tracks?.name}</span>
                              )}
                            </span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className='text-xs text-gray-500 text-center mt-8'>No workouts</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
