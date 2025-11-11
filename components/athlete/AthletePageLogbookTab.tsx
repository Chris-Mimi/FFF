// LogbookTab component
'use client';

import { supabase } from '@/lib/supabase';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

interface WOD {
  id: string;
  title: string;
  date: string;
  tracks?: { name: string; color: string };
  workout_types?: { name: string };
  sections: Array<{ id: string; type: string; content: string; duration?: string }>;
  published_section_ids?: string[];
}

interface LogbookTabProps {
  userId: string;
  initialDate?: Date;
}

export default function LogbookTab({ userId, initialDate }: LogbookTabProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);
  const [attendedWorkouts, setAttendedWorkouts] = useState<WOD[]>([]);
  const [wods, setWods] = useState<WOD[]>([]);
  const [loading, setLoading] = useState(true);
  const [workoutLogs, setWorkoutLogs] = useState<
    Record<string, { result: string; notes: string; date: string }>
  >({});

  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  useEffect(() => {
    if (viewMode === 'day') {
      fetchWODsForDay();
    } else if (viewMode === 'week') {
      fetchAttendedWorkoutsForWeek();
    } else if (viewMode === 'month') {
      fetchAttendedWorkoutsForMonth();
    }
  }, [selectedDate, viewMode, userId]);

  const fetchWODsForDay = async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];

      // Get attended workouts for this user on this date
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('workout_attendance')
        .select('wod_id')
        .eq('user_id', userId)
        .eq('workout_date', dateStr);

      if (attendanceError) throw attendanceError;

      if (!attendanceData || attendanceData.length === 0) {
        setWods([]);
        setWorkoutLogs({});
        setLoading(false);
        return;
      }

      const wodIds = attendanceData.map(a => a.wod_id);

      // Fetch the actual WODs
      const { data: wodsData, error: wodsError } = await supabase
        .from('wods')
        .select(`
          id,
          title,
          date,
          sections,
          published_section_ids,
          tracks:track_id (name, color),
          workout_types:workout_type_id (name)
        `)
        .in('id', wodIds);

      if (wodsError) throw wodsError;

      const attendedWods = wodsData?.map(wod => ({
        ...wod,
        sections: wod.sections || []
      })) || [];

      const filteredWorkouts = attendedWods.filter((w): w is WOD => w !== null);
      setWods(filteredWorkouts);

      // Fetch existing workout logs for attended workouts for this user
      const { data: logsData, error: logsError } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('workout_date', dateStr)
        .eq('user_id', userId);

      if (logsError) throw logsError;

      // Convert logs array to object keyed by wod_id
      interface WorkoutLog {
        wod_id: string | null;
        result: string | null;
        notes: string | null;
        workout_date: string;
      }
      const logsMap: Record<string, { result: string; notes: string; date: string }> = {};
      (logsData || []).forEach((log: WorkoutLog) => {
        if (log.wod_id) {
          logsMap[log.wod_id] = {
            result: log.result || '',
            notes: log.notes || '',
            date: log.workout_date || dateStr,
          };
        }
      });
      setWorkoutLogs(logsMap);
    } catch (error) {
      console.error('Error fetching WODs:', error);
      setWods([]);
      setWorkoutLogs({});
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendedWorkoutsForWeek = async () => {
    setLoading(true);
    try {
      const weekDates = getWeekDates(selectedDate);
      const startStr = weekDates[0].toISOString().split('T')[0];
      const endStr = weekDates[6].toISOString().split('T')[0];

      // Get attended workouts for this user in this week
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('workout_attendance')
        .select('wod_id, workout_date')
        .eq('user_id', userId)
        .gte('workout_date', startStr)
        .lte('workout_date', endStr);

      if (attendanceError) throw attendanceError;

      if (!attendanceData || attendanceData.length === 0) {
        setAttendedWorkouts([]);
        setWorkoutLogs({});
        setLoading(false);
        return;
      }

      const wodIds = attendanceData.map(a => a.wod_id);

      // Fetch the actual WODs
      const { data: wodsData, error: wodsError } = await supabase
        .from('wods')
        .select(`
          id,
          title,
          date,
          sections,
          published_section_ids,
          tracks:track_id (name, color),
          workout_types:workout_type_id (name)
        `)
        .in('id', wodIds);

      if (wodsError) throw wodsError;

      const attendedWods = wodsData?.map(wod => ({
        ...wod,
        sections: wod.sections || []
      })) || [];

      const filteredWorkouts = attendedWods.filter((w): w is WOD => w !== null);
      setAttendedWorkouts(filteredWorkouts);

      // Fetch logs for attended workouts
      const { data: logsData } = await supabase
        .from('workout_logs')
        .select('*')
        .gte('workout_date', startStr)
        .lte('workout_date', endStr)
        .eq('user_id', userId);

      const logsMap: Record<string, { result: string; notes: string; date: string }> = {};
      (logsData || []).forEach((log) => {
        if (log.wod_id) {
          logsMap[log.wod_id] = {
            result: log.result || '',
            notes: log.notes || '',
            date: log.workout_date,
          };
        }
      });
      setWorkoutLogs(logsMap);
    } catch (error) {
      console.error('Error fetching attended workouts:', error);
      setAttendedWorkouts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendedWorkoutsForMonth = async () => {
    setLoading(true);
    try {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0);

      const startStr = startOfMonth.toISOString().split('T')[0];
      const endStr = endOfMonth.toISOString().split('T')[0];

      // Get attended workouts for this user in this month
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('workout_attendance')
        .select('wod_id, workout_date')
        .eq('user_id', userId)
        .gte('workout_date', startStr)
        .lte('workout_date', endStr);

      if (attendanceError) throw attendanceError;

      if (!attendanceData || attendanceData.length === 0) {
        setAttendedWorkouts([]);
        setWorkoutLogs({});
        setLoading(false);
        return;
      }

      const wodIds = attendanceData.map(a => a.wod_id);

      // Fetch the actual WODs
      const { data: wodsData, error: wodsError } = await supabase
        .from('wods')
        .select(`
          id,
          title,
          date,
          sections,
          published_section_ids,
          tracks:track_id (name, color),
          workout_types:workout_type_id (name)
        `)
        .in('id', wodIds);

      if (wodsError) throw wodsError;

      const attendedWods = wodsData?.map(wod => ({
        ...wod,
        sections: wod.sections || []
      })) || [];

      const filteredWorkouts = attendedWods.filter((w): w is WOD => w !== null);
      setAttendedWorkouts(filteredWorkouts);

      // Fetch logs for attended workouts
      const { data: logsData } = await supabase
        .from('workout_logs')
        .select('*')
        .gte('workout_date', startStr)
        .lte('workout_date', endStr)
        .eq('user_id', userId);

      const logsMap: Record<string, { result: string; notes: string; date: string }> = {};
      (logsData || []).forEach((log) => {
        if (log.wod_id) {
          logsMap[log.wod_id] = {
            result: log.result || '',
            notes: log.notes || '',
            date: log.workout_date,
          };
        }
      });
      setWorkoutLogs(logsMap);
    } catch (error) {
      console.error('Error fetching attended workouts:', error);
      setAttendedWorkouts([]);
    } finally {
      setLoading(false);
    }
  };

  const getPublishedSections = (wod: WOD) => {
    if (!wod.published_section_ids || wod.published_section_ids.length === 0) {
      return wod.sections;
    }
    return wod.sections.filter(section =>
      wod.published_section_ids?.includes(section.id)
    );
  };

  const handleSaveWorkoutLog = async (wodId: string) => {
    const log = workoutLogs[wodId];
    if (!log || (!log.result && !log.notes)) return;

    try {
      const dateStr = log.date;

      // Check if a log already exists for this WOD and user
      const { data: existingLogs, error: fetchError } = await supabase
        .from('workout_logs')
        .select('id')
        .eq('wod_id', wodId)
        .eq('workout_date', dateStr)
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine
        throw fetchError;
      }

      if (existingLogs) {
        // Update existing log
        const { error } = await supabase
          .from('workout_logs')
          .update({
            result: log.result || null,
            notes: log.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingLogs.id);

        if (error) throw error;
      } else {
        // Insert new log
        const { error } = await supabase.from('workout_logs').insert({
          user_id: userId,
          wod_id: wodId,
          workout_date: dateStr,
          result: log.result || null,
          notes: log.notes || null,
        });

        if (error) throw error;
      }

      alert('Workout log saved successfully!');
    } catch (error) {
      console.error('Error saving workout log:', error);
      alert('Failed to save workout log. Please try again.');
    }
  };

  const getWeekDates = (date: Date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
    startOfWeek.setDate(diff);

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + i);
      weekDates.push(currentDate);
    }
    return weekDates;
  };

  const previousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const nextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const previousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const previousMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(selectedDate.getMonth() - 1);
    setSelectedDate(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(selectedDate.getMonth() + 1);
    setSelectedDate(newDate);
  };

  const getMonthCalendarDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Get the Monday of the week containing the first day
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
    startDate.setDate(firstDay.getDate() - daysToSubtract);

    const days = [];
    const currentDate = new Date(startDate);

    // Generate 42 days (6 weeks) to fill the calendar grid
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
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
              className='p-2 hover:bg-gray-100 rounded-lg transition'
            >
              <ChevronLeft size={20} />
            </button>

            <div className='text-center'>
              <h3 className='text-lg font-semibold text-gray-900'>
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h3>
            </div>

            <button
              onClick={nextDay}
              className='p-2 hover:bg-gray-100 rounded-lg transition'
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Workouts */}
          {loading ? (
            <div className='text-center text-gray-500 py-8'>Loading workouts...</div>
          ) : wods.length === 0 ? (
            <div className='text-center text-gray-500 py-8'>
              No workouts attended on this date
            </div>
          ) : (
            <div className='space-y-4'>
              {wods.map(wod => (
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
                          value={workoutLogs[wod.id]?.date || selectedDate.toISOString().split('T')[0]}
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
                                  workoutLogs[wod.id]?.date || selectedDate.toISOString().split('T')[0],
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
                                  workoutLogs[wod.id]?.date || selectedDate.toISOString().split('T')[0],
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
                          onClick={() => handleSaveWorkoutLog(wod.id)}
                          className='px-6 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white font-medium rounded-lg transition'
                        >
                          Save Log Entry
                        </button>
                      </div>
                    </div>
                  </div>
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
              className='p-2 hover:bg-gray-100 rounded-lg transition'
            >
              <ChevronLeft size={20} />
            </button>

            <div className='text-center'>
              <h3 className='text-lg font-semibold text-gray-900'>
                {getWeekDates(selectedDate)[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {' '}
                {getWeekDates(selectedDate)[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </h3>
            </div>

            <button
              onClick={nextWeek}
              className='p-2 hover:bg-gray-100 rounded-lg transition'
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
                const dayWorkouts = attendedWorkouts.filter(w => w.date === date.toISOString().split('T')[0]);
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
                          <div key={wod.id}>
                            <button
                              onClick={() => setExpandedWorkoutId(expandedWorkoutId === wod.id ? null : wod.id)}
                              className='w-full text-left p-2 bg-white rounded border hover:shadow-sm transition'
                            >
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
                            </button>

                            {expandedWorkoutId === wod.id && (
                              <div className='mt-2 p-3 bg-white rounded-lg border'>
                                {/* Workout sections */}
                                <div className='space-y-2 mb-4'>
                                  {getPublishedSections(wod).map(section => (
                                    <div key={section.id} className='text-xs'>
                                      <div className='font-medium text-[#208479] uppercase mb-1'>
                                        {section.type}
                                      </div>
                                      <div className='text-gray-700 whitespace-pre-wrap'>
                                        {section.content}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Log Entry Form */}
                                <div className='pt-6 border-t border-gray-200'>
                                  <h4 className='font-semibold text-gray-900 mb-3'>My Notes & Results</h4>
                                  <div className='space-y-4'>
                                    <div>
                                      <label className='block text-sm font-medium text-gray-700 mb-2'>Date</label>
                                      <input
                                        type='date'
                                        value={workoutLogs[wod.id]?.date || wod.date}
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
                                      <label className='block text-sm font-medium text-gray-700 mb-2'>Result/Time</label>
                                      <input
                                        type='text'
                                        value={workoutLogs[wod.id]?.result || ''}
                                        onChange={e =>
                                          setWorkoutLogs({
                                            ...workoutLogs,
                                            [wod.id]: {
                                              result: e.target.value,
                                              notes: workoutLogs[wod.id]?.notes || '',
                                              date: workoutLogs[wod.id]?.date || wod.date,
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
                                              date: workoutLogs[wod.id]?.date || wod.date,
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
                                        onClick={() => handleSaveWorkoutLog(wod.id)}
                                        className='px-6 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white font-medium rounded-lg transition'
                                      >
                                        Save Log Entry
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className='text-xs text-gray-400 text-center mt-4'>No workouts</div>
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
              className='p-2 hover:bg-gray-100 rounded-lg transition'
            >
              <ChevronLeft size={20} />
            </button>

            <div className='text-center'>
              <h3 className='text-lg font-semibold text-gray-900'>
                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
            </div>

            <button
              onClick={nextMonth}
              className='p-2 hover:bg-gray-100 rounded-lg transition'
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
                {getMonthCalendarDays().map((date, index) => {
                  const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
                  const dayWorkouts = attendedWorkouts.filter(w => w.date === date.toISOString().split('T')[0]);
                  const hasWorkouts = dayWorkouts.length > 0;

                  return (
                    <div
                      key={index}
                      className={`min-h-[100px] p-2 border border-gray-200 ${
                        isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                      } ${hasWorkouts ? 'cursor-pointer hover:shadow-sm' : ''}`}
                      onClick={() => hasWorkouts && setExpandedWorkoutId(expandedWorkoutId === `month-${date.toISOString().split('T')[0]}` ? null : `month-${date.toISOString().split('T')[0]}`)}
                    >
                      <div className={`text-sm ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                        {date.getDate()}
                      </div>

                      {hasWorkouts && (
                        <div className='mt-1'>
                          {dayWorkouts.slice(0, 2).map(wod => (
                            <div key={wod.id} className='text-xs bg-[#208479] text-white rounded px-1 py-0.5 mb-1 truncate'>
                              {wod.title}
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

              {/* Expanded workout details */}
              {expandedWorkoutId?.startsWith('month-') && (() => {
                const dateStr = expandedWorkoutId.replace('month-', '');
                const dayWorkouts = attendedWorkouts.filter(w => w.date === dateStr);

                return (
                  <div className='mt-6 p-4 bg-gray-50 rounded-lg'>
                    <h4 className='font-semibold text-gray-900 mb-4'>
                      Workouts for {new Date(dateStr).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </h4>

                    {dayWorkouts.map(wod => (
                      <div key={wod.id} className='mb-6 p-4 bg-white rounded-lg border'>
                        <div className='flex items-center gap-3 mb-3'>
                          {wod.tracks && (
                            <div
                              className='w-4 h-4 rounded-full'
                              style={{ backgroundColor: wod.tracks.color || '#208479' }}
                            />
                          )}
                          <h5 className='text-lg font-semibold text-gray-900'>{wod.title}</h5>
                        </div>

                        {/* Workout sections */}
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

                        {/* Log form - same as week view */}
                        <div className='pt-6 border-t border-gray-200'>
                          <h4 className='font-semibold text-gray-900 mb-3'>My Notes & Results</h4>
                          <div className='space-y-4'>
                            <div>
                              <label className='block text-sm font-medium text-gray-700 mb-2'>Date</label>
                              <input
                                type='date'
                                value={workoutLogs[wod.id]?.date || wod.date}
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
                              <label className='block text-sm font-medium text-gray-700 mb-2'>Result/Time</label>
                              <input
                                type='text'
                                value={workoutLogs[wod.id]?.result || ''}
                                onChange={e =>
                                  setWorkoutLogs({
                                    ...workoutLogs,
                                    [wod.id]: {
                                      result: e.target.value,
                                      notes: workoutLogs[wod.id]?.notes || '',
                                      date: workoutLogs[wod.id]?.date || wod.date,
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
                                      date: workoutLogs[wod.id]?.date || wod.date,
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
                                onClick={() => handleSaveWorkoutLog(wod.id)}
                                className='px-6 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white font-medium rounded-lg transition'
                              >
                                Save Log Entry
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
