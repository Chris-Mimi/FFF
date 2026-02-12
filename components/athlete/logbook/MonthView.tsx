'use client';

import { getMonthCalendarDays, formatLocalDate, type WOD } from '@/utils/logbook-utils';

interface MonthViewProps {
  selectedDate: Date;
  workouts: WOD[];
  loading: boolean;
  onDateSelect: (date: Date) => void;
  onViewModeChange: (mode: 'day') => void;
}

export default function MonthView({
  selectedDate,
  workouts,
  loading,
  onDateSelect,
  onViewModeChange,
}: MonthViewProps) {
  const handleDayClick = (date: Date, hasWorkouts: boolean) => {
    if (hasWorkouts) {
      onDateSelect(date);
      onViewModeChange('day');
    }
  };

  return (
    <div>
      {loading ? (
        <div className='text-center text-gray-500 py-8'>Loading workouts...</div>
      ) : (
        <div>
          {/* Day headers */}
          <div className='grid grid-cols-7 gap-1 mb-2'>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className='p-2 text-center text-sm font-medium text-gray-500'>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className='grid grid-cols-7 gap-1'>
            {getMonthCalendarDays(selectedDate).map((date, index) => {
              const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
              const dateStr = formatLocalDate(date);
              const dayWorkouts = workouts.filter(w => w.date === dateStr);
              const hasWorkouts = dayWorkouts.length > 0;

              return (
                <div
                  key={index}
                  className={`min-h-[100px] p-2 border border-gray-200 ${
                    isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                  } ${hasWorkouts ? 'cursor-pointer hover:shadow-sm' : ''}`}
                  onClick={() => handleDayClick(date, hasWorkouts)}
                >
                  <div className={`text-sm ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                    {date.getDate()}
                  </div>

                  {hasWorkouts && (
                    <div className='mt-1'>
                      {dayWorkouts.slice(0, 2).map(wod => (
                        <div
                          key={wod.id}
                          className={`text-xs rounded px-1 py-0.5 mb-1 truncate ${
                            wod.booked
                              ? 'bg-[#7dd3c0] text-gray-900 font-bold'
                              : 'bg-[#178da6] text-white'
                          }`}
                        >
                          {wod.booked ? 'Booked' : `${wod.session_type || wod.title}${(wod.workout_name || wod.tracks?.name) ? ` - ${wod.workout_name || wod.tracks?.name}` : ''}`}
                        </div>
                      ))}
                      {dayWorkouts.length > 2 && (
                        <div className='text-xs text-gray-500'>+{dayWorkouts.length - 2} more</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
