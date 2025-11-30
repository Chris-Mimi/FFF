// AthletePageLogbookTab component
'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLogbookData } from '@/hooks/athlete/useLogbookData';
import { useWorkoutLogging } from '@/hooks/athlete/useWorkoutLogging';
import { formatLocalDate, getWeekDates, getMonthCalendarDays, getPublishedSections, WOD } from '@/utils/logbook-utils';

interface AthletePageLogbookTabProps {
  userId: string;
  initialDate?: Date;
  initialViewMode?: 'day' | 'week' | 'month';
  onDateChange?: (date: Date) => void;
}

export default function AthletePageLogbookTab({ userId, initialDate, initialViewMode, onDateChange }: AthletePageLogbookTabProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>(initialViewMode || 'week');
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);

  // Use extracted hooks
  const { workouts, workoutLogs, loading, setWorkoutLogs } = useLogbookData({
    userId,
    selectedDate,
    viewMode,
  });

  const { saveWorkoutLog } = useWorkoutLogging({
    userId,
    workoutLogs,
  });

  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  // Notify parent when date changes so it can be persisted across tab switches
  useEffect(() => {
    if (onDateChange) {
      onDateChange(selectedDate);
    }
  }, [selectedDate, onDateChange]);

  // Navigation handlers
  const previousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const nextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const previousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const previousMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
  };

  return (
    <div className='bg-white rounded-lg shadow p-6'>
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-2xl font-bold text-gray-900'>Athlete Logbook</h2>

        {/* View Mode Toggle */}
        <div className='flex bg-gray-100 rounded-lg p-1'>
          {(['day', 'week', 'month'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                viewMode === mode
                  ? 'bg-[#208479] text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Day View */}
      {viewMode === 'day' && (
        <div>
          {/* Date Navigation */}
          <div className='flex items-center justify-between mb-6'>
            <button
              onClick={previousDay}
              className='p-2 hover:bg-gray-100 rounded-lg transition text-gray-900'
            >
              <ChevronLeft size={20} />
            </button>

            <div className='flex items-center gap-4'>
              <h3 className='text-lg font-semibold text-gray-900'>
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h3>
              <button
                onClick={goToToday}
                className='px-3 py-1 bg-[#208479] hover:bg-[#1a6b62] text-white text-sm rounded-lg font-medium transition'
              >
                Today
              </button>
            </div>

            <button
              onClick={nextDay}
              className='p-2 hover:bg-gray-100 rounded-lg transition text-gray-900'
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Workouts */}
          {loading ? (
            <div className='text-center text-gray-500 py-8'>Loading workouts...</div>
          ) : workouts.length === 0 ? (
            <div className='text-center text-gray-500 py-8'>
              No workouts attended on this date
            </div>
          ) : (
            <div className='space-y-4'>
              {workouts.map(wod => (
                <div key={wod.id} className='border border-gray-200 rounded-lg p-4'>
                  <div className='flex items-center justify-between mb-3'>
                    <div className='flex items-center gap-3'>
                      {wod.tracks && (
                        <div
                          className='w-4 h-4 rounded-full'
                          style={{ backgroundColor: wod.tracks.color || '#208479' }}
                        />
                      )}
                      <h3 className='text-lg font-semibold text-gray-900'>{wod.title}</h3>
                    </div>
                    <span className='text-sm text-gray-500'>
                      {new Date(wod.date).toLocaleDateString()}
                    </span>
                  </div>

                  {wod.booked ? (
                    // Future booked workout - show placeholder
                    <div className='text-center py-12'>
                      <div className='text-2xl font-bold text-[#208479] mb-2'>Booked</div>
                      <div className='text-sm text-gray-500'>Workout details available after class</div>
                    </div>
                  ) : (
                    <>
                      {/* Workout Sections */}
                      <div className='space-y-3 mb-4'>
                    {getPublishedSections(wod).map(section => (
                      <div key={section.id} className='bg-gray-50 rounded-lg p-3'>
                        <div className='flex items-center justify-between mb-2'>
                          <span className='text-sm font-medium text-[#208479] uppercase'>
                            {section.type}
                          </span>
                          {section.duration && (
                            <span className='text-sm text-gray-500'>{section.duration}</span>
                          )}
                        </div>
                        <div className='text-sm text-gray-700 whitespace-pre-wrap'>
                          {section.content}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Workout Notes Section */}
                  <div className='mt-6 pt-6 border-t border-gray-200'>
                    <h4 className='font-semibold text-gray-900 mb-3'>My Notes & Results</h4>

                    <div className='space-y-4'>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-2'>Date</label>
                        <input
                          type='date'
                          value={workoutLogs[wod.id]?.date || formatLocalDate(selectedDate)}
                          onChange={e =>
                            setWorkoutLogs({
                              ...workoutLogs,
                              [wod.id]: {
                                result: workoutLogs[wod.id]?.result || '',
                                notes: workoutLogs[wod.id]?.notes || '',
                                date: e.target.value,
                              },
                            })
                          }
                          className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
                        />
                      </div>

                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-2'>
                          Result/Time
                        </label>
                        <input
                          type='text'
                          value={workoutLogs[wod.id]?.result || ''}
                          onChange={e =>
                            setWorkoutLogs({
                              ...workoutLogs,
                              [wod.id]: {
                                result: e.target.value,
                                notes: workoutLogs[wod.id]?.notes || '',
                                date:
                                  workoutLogs[wod.id]?.date || formatLocalDate(selectedDate),
                              },
                            })
                          }
                          placeholder='e.g., 12:45, 15 rounds, 100 kg'
                          className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
                        />
                      </div>

                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-2'>Notes</label>
                        <textarea
                          value={workoutLogs[wod.id]?.notes || ''}
                          onChange={e =>
                            setWorkoutLogs({
                              ...workoutLogs,
                              [wod.id]: {
                                result: workoutLogs[wod.id]?.result || '',
                                notes: e.target.value,
                                date:
                                  workoutLogs[wod.id]?.date || formatLocalDate(selectedDate),
                              },
                            })
                          }
                          placeholder='How did it feel? Any modifications?'
                          rows={4}
                          className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 resize-none'
                        />
                      </div>

                      <div className='flex justify-end'>
                        <button
                          onClick={() => saveWorkoutLog(wod.id)}
                          className='px-6 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white font-medium rounded-lg transition'
                        >
                          Save Log Entry
                        </button>
                      </div>
                    </div>
                  </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div>
          {/* Week Navigation */}
          <div className='flex items-center justify-between mb-6'>
            <button
              onClick={previousWeek}
              className='p-2 hover:bg-gray-100 rounded-lg transition text-gray-900'
            >
              <ChevronLeft size={20} />
            </button>

            <div className='flex items-center gap-4'>
              <h3 className='text-lg font-semibold text-gray-900'>
                {getWeekDates(selectedDate)[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {' '}
                {getWeekDates(selectedDate)[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </h3>
              <button
                onClick={goToToday}
                className='px-3 py-1 bg-[#208479] hover:bg-[#1a6b62] text-white text-sm rounded-lg font-medium transition'
              >
                Today
              </button>
            </div>

            <button
              onClick={nextWeek}
              className='p-2 hover:bg-gray-100 rounded-lg transition text-gray-900'
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Week Grid */}
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
                            onClick={() => {
                              setSelectedDate(date);
                              setViewMode('day');
                            }}
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
                                    style={{ backgroundColor: wod.tracks.color || '#208479' }}
                                  />
                                )}
                                <span className='text-xs font-medium text-gray-900 truncate'>
                                  {wod.title}
                                </span>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className='text-xs text-gray-400 text-center mt-8'>No workouts</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Month View */}
      {viewMode === 'month' && (
        <div>
          {/* Month Navigation */}
          <div className='flex items-center justify-between mb-6'>
            <button
              onClick={previousMonth}
              className='p-2 hover:bg-gray-100 rounded-lg transition text-gray-900'
            >
              <ChevronLeft size={20} />
            </button>

            <div className='flex items-center gap-4'>
              <h3 className='text-lg font-semibold text-gray-900'>
                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <button
                onClick={goToToday}
                className='px-3 py-1 bg-[#208479] hover:bg-[#1a6b62] text-white text-sm rounded-lg font-medium transition'
              >
                Today
              </button>
            </div>

            <button
              onClick={nextMonth}
              className='p-2 hover:bg-gray-100 rounded-lg transition text-gray-900'
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Calendar Grid */}
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
                      onClick={() => {
                        if (hasWorkouts) {
                          setSelectedDate(date);
                          setViewMode('day');
                        }
                      }}
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
                                  : 'bg-[#208479] text-white'
                              }`}
                            >
                              {wod.booked ? 'Booked' : wod.title}
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
      )}
    </div>
  );
}
