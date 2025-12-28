'use client';

import { supabase } from '@/lib/supabase';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ConfiguredLift, ConfiguredBenchmark, ConfiguredForgeBenchmark } from '@/types/movements';

interface WorkoutSection {
  id: string;
  type: string;
  duration: number;
  content: string;
  workout_type_id?: string;
  lifts?: ConfiguredLift[];
  benchmarks?: ConfiguredBenchmark[];
  forge_benchmarks?: ConfiguredForgeBenchmark[];
}

interface SectionResult {
  section_id: string;
  time_result?: string;
  reps_result?: number;
  weight_result?: number;
  rounds_result?: number;
  calories_result?: number;
  metres_result?: number;
  scaling_level?: string;
  task_completed?: boolean;
}

interface PublishedWorkout {
  id: string;
  title: string;
  date: string;
  track_id: string;
  sections: WorkoutSection[];
  publish_sections: string[];
  publish_time: string;
  publish_duration: number;
  session_id?: string;
  attended?: boolean;
  booked?: boolean; // User has a confirmed booking for future session
  track?: {
    name: string;
    color: string;
  };
  results?: SectionResult[];
}

interface AthletePageWorkoutsTabProps {
  userId: string;
  initialDate?: Date;
  onDateChange?: (date: Date) => void;
  onNavigateToLogbook?: (date: Date) => void;
}

interface BookingResponse {
  id: string;
  session_id: string;
  status: string;
  weekly_sessions: {
    id: string;
    date: string;
    time: string;
    workout_id: string | null;
    wods: {
      id: string;
      title: string;
      track_id: string;
      sections: WorkoutSection[];
      publish_sections: string[];
      publish_time: string;
      publish_duration: number;
      is_published: boolean;
      tracks: { name: string; color: string } | { name: string; color: string }[];
    } | null;
  };
}

// Format helper functions for movement display
function formatLift(lift: ConfiguredLift): string {
  if (lift.rep_type === 'constant') {
    const base = `${lift.name} ${lift.sets}x${lift.reps}`;
    return lift.percentage_1rm ? `${base} @ ${lift.percentage_1rm}%` : base;
  } else {
    const reps = lift.variable_sets?.map(s => s.reps).join('-') || '';
    return `${lift.name} ${reps}`;
  }
}

function formatBenchmark(benchmark: ConfiguredBenchmark): { name: string; description?: string; exercises?: string[] } {
  const scaling = benchmark.scaling_option ? ` (${benchmark.scaling_option})` : '';
  return {
    name: `${benchmark.name}${scaling}`,
    description: benchmark.description,
    exercises: benchmark.exercises
  };
}

function formatForgeBenchmark(forge: ConfiguredForgeBenchmark): { name: string; description?: string; exercises?: string[] } {
  const scaling = forge.scaling_option ? ` (${forge.scaling_option})` : '';
  return {
    name: `${forge.name}${scaling}`,
    description: forge.description,
    exercises: forge.exercises
  };
}

export default function AthletePageWorkoutsTab({ userId, initialDate, onDateChange, onNavigateToLogbook }: AthletePageWorkoutsTabProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const [workouts, setWorkouts] = useState<PublishedWorkout[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchPublishedWorkouts();
  }, [selectedDate, userId]);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchPublishedWorkouts = async () => {
    setLoading(true);
    try {
      // Get the week dates
      const weekDates = getWeekDates(selectedDate);
      const startDate = formatDate(weekDates[0]);
      const endDate = formatDate(weekDates[6]);

      // Fetch user's bookings for this week
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          session_id,
          status,
          weekly_sessions!inner (
            id,
            date,
            time,
            workout_id,
            wods (
              id,
              title,
              track_id,
              sections,
              publish_sections,
              publish_time,
              publish_duration,
              is_published,
              tracks:track_id (name, color)
            )
          )
        `)
        .eq('member_id', userId)
        .eq('status', 'confirmed')
        .gte('weekly_sessions.date', startDate)
        .lte('weekly_sessions.date', endDate);

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        return;
      }

      // Transform bookings into workout display format
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const workoutsFromBookings = (bookings || []).map((booking: any) => {
        const session = booking.weekly_sessions;
        const workout = session?.wods;

        // Parse session datetime and subtract 1 hour to determine if workout details should be visible
        const sessionDateTime = new Date(`${session.date}T${session.time}`);
        const oneHourBeforeSession = new Date(sessionDateTime.getTime() - 60 * 60 * 1000);
        const now = new Date();
        const shouldShowDetails = now >= oneHourBeforeSession;

        return {
          id: workout?.id || `session-${session.id}`,
          title: workout?.title || 'Workout',
          date: session.date,
          track_id: workout?.track_id || '',
          sections: workout?.sections || [],
          publish_sections: workout?.publish_sections || [],
          publish_time: session.time, // Use session time, not publish_time
          publish_duration: workout?.publish_duration || 60,
          session_id: session.id,
          attended: shouldShowDetails,
          booked: !shouldShowDetails,
          track: workout?.tracks ? (Array.isArray(workout.tracks) ? workout.tracks[0] : workout.tracks) : null,
        } as PublishedWorkout;
      });

      // Fetch section results for these workouts
      const workoutIds = workoutsFromBookings
        .filter(w => w.attended)
        .map(w => w.id);

      if (workoutIds.length > 0) {
        const { data: results, error: resultsError } = await supabase
          .from('wod_section_results')
          .select('section_id, time_result, reps_result, weight_result, rounds_result, calories_result, metres_result, scaling_level, task_completed, wod_id')
          .in('wod_id', workoutIds)
          .eq('user_id', userId);

        if (resultsError) {
          console.error('Error fetching results:', resultsError);
        }

        // Attach results to workouts
        workoutsFromBookings.forEach(workout => {
          workout.results = results?.filter(r => r.wod_id === workout.id) || [];
        });
      }

      setWorkouts(workoutsFromBookings);
    } catch (error) {
      console.error('Error fetching workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekDates = (date: Date): Date[] => {
    const curr = new Date(date);
    const first = curr.getDate() - curr.getDay() + 1; // Monday
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(curr);
      d.setDate(first + i);
      dates.push(d);
    }
    return dates;
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

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
  };

  const getWorkoutForDate = (date: Date): PublishedWorkout | undefined => {
    return workouts.find(w => w.date === formatDate(date));
  };

  const getPublishedSections = (workout: PublishedWorkout): WorkoutSection[] => {
    // Backwards compatibility: if publish_sections is null/empty, show all sections
    if (!workout.publish_sections || workout.publish_sections.length === 0) {
      return workout.sections;
    }
    return workout.sections.filter(section =>
      workout.publish_sections.includes(section.id)
    );
  };

  const weekDates = getWeekDates(selectedDate);
  const weekLabel = `${weekDates[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${weekDates[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='bg-white rounded-lg shadow p-6'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <Calendar className='text-[#208479]' size={32} />
            <div>
              <h2 className='text-2xl font-bold text-gray-900'>Published Workouts</h2>
              <p className='text-sm text-gray-600'>View your weekly training schedule</p>
            </div>
          </div>

          {/* Week Navigation */}
          <div className='flex items-center gap-4'>
            <button
              onClick={previousWeek}
              className='p-2 hover:bg-gray-100 rounded-full transition text-gray-900'
              title='Previous Week'
            >
              <ChevronLeft size={24} />
            </button>
            <div className='flex items-center gap-3'>
              <span className='text-lg font-semibold text-gray-900 min-w-[200px] text-center'>
                {weekLabel}
              </span>
              <button
                onClick={goToToday}
                className='px-3 py-1 bg-[#208479] hover:bg-[#1a6b62] text-white text-sm rounded-lg font-medium transition'
              >
                Today
              </button>
            </div>
            <button
              onClick={nextWeek}
              className='p-2 hover:bg-gray-100 rounded-full transition text-gray-900'
              title='Next Week'
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Weekly Calendar - Only show days with workouts */}
      <div className='grid gap-4' style={{ gridTemplateColumns: `repeat(${weekDates.filter(date => getWorkoutForDate(date)).length || 1}, minmax(0, 1fr))` }}>
        {weekDates.map((date, index) => {
          const workout = getWorkoutForDate(date);

          // Skip days without workouts
          if (!workout) return null;

          const isToday = formatDate(new Date()) === formatDate(date);
          const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });

          return (
            <div
              key={index}
              onClick={() => onNavigateToLogbook?.(date)}
              className={`bg-white rounded-lg shadow-md overflow-hidden ${
                isToday ? 'ring-4 ring-[#7dd3c0]' : 'border border-gray-400'
              } cursor-pointer hover:shadow-lg transition-shadow`}
            >
              {/* Day Header */}
              <div className={`p-3 text-center ${
                isToday
                  ? 'bg-cyan-100 text-gray-900'
                  : workout?.attended
                  ? 'bg-[#208479] text-white'
                  : workout?.booked
                  ? 'bg-[#7dd3c0] text-gray-900'
                  : 'bg-cyan-100 text-gray-900'
              }`}>
                <div className='text-sm font-semibold'>{dayName}</div>
                <div className='text-sm font-bold'>
                  {workout
                    ? `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} at ${workout.publish_time}`
                    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                  }
                </div>
              </div>

              {/* Workout Content */}
              <div className='p-3 min-h-[200px]'>
                {loading ? (
                  <div className='text-center text-gray-400 text-sm py-4'>Loading...</div>
                ) : (
                  workout.booked ? (
                    // Future booked session - show "Booked" placeholder
                    <div className='flex flex-col items-center justify-center h-full py-8'>
                      <div className='text-center'>
                        <div className='text-lg font-bold text-[#208479] mb-2'>Booked</div>
                        <div className='text-xs text-gray-600'>{workout.publish_time}</div>
                        <div className='text-xs text-gray-500 mt-1'>Workout details available closer to date</div>
                      </div>
                    </div>
                  ) : (
                    // Past attended workout - show full details
                    <div className='space-y-3'>
                      {/* Workout Title */}
                      <div className='flex items-center gap-2'>
                        {workout.track && (
                          <div
                            className='w-3 h-3 rounded-full flex-shrink-0'
                            style={{ backgroundColor: workout.track.color || '#208479' }}
                          />
                        )}
                        <h3 className='font-bold text-gray-900 text-sm'>{workout.title}</h3>
                      </div>

                      {/* Event Time */}
                      <div className='text-xs text-gray-600'>
                        {workout.publish_time} ({workout.publish_duration} min)
                      </div>

                      {/* Published Sections */}
                      {getPublishedSections(workout).map(section => {
                        // Match by section ID - results may have -content-0 suffix
                        const sectionResult = workout.results?.find(r =>
                          r.section_id === section.id || r.section_id.startsWith(section.id + '-content')
                        );
                        const hasResultData = sectionResult && (
                          sectionResult.time_result ||
                          sectionResult.reps_result ||
                          sectionResult.rounds_result ||
                          sectionResult.weight_result ||
                          sectionResult.calories_result ||
                          sectionResult.metres_result ||
                          sectionResult.scaling_level ||
                          (sectionResult.task_completed !== undefined && sectionResult.task_completed !== null)
                        );

                        return (
                        <div key={section.id} className='border-l-2 border-[#208479] pl-2'>
                          <div className='text-xs font-semibold text-[#208479] mb-1'>
                            {section.type} ({section.duration} min)
                          </div>

                          {/* Structured Movements */}
                          <div className='space-y-2 mb-2'>
                            {/* Lifts */}
                            {section.lifts && section.lifts.length > 0 && (
                              <div className='space-y-1'>
                                {section.lifts.map((lift, liftIdx) => (
                                  <div key={liftIdx} className='text-xs bg-blue-50 text-blue-900 rounded px-2 py-1'>
                                    <div className='font-semibold'>≡ {formatLift(lift)}</div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Benchmarks */}
                            {section.benchmarks && section.benchmarks.length > 0 && (
                              <div className='space-y-1'>
                                {section.benchmarks.map((benchmark, bmIdx) => {
                                  const formatted = formatBenchmark(benchmark);
                                  return (
                                    <div key={bmIdx} className='text-xs bg-teal-50 text-teal-900 rounded px-2 py-1'>
                                      <div className='font-semibold'>≡ {formatted.name}</div>
                                      {formatted.description && (
                                        <div className='text-teal-800 mt-0.5 whitespace-pre-wrap'>{formatted.description}</div>
                                      )}
                                      {!formatted.description && formatted.exercises && formatted.exercises.length > 0 && (
                                        <div className='text-teal-800 mt-0.5'>{formatted.exercises.join(' • ')}</div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Forge Benchmarks */}
                            {section.forge_benchmarks && section.forge_benchmarks.length > 0 && (
                              <div className='space-y-1'>
                                {section.forge_benchmarks.map((forge, forgeIdx) => {
                                  const formatted = formatForgeBenchmark(forge);
                                  return (
                                    <div key={forgeIdx} className='text-xs bg-cyan-50 text-cyan-900 rounded px-2 py-1'>
                                      <div className='font-semibold'>≡ {formatted.name}</div>
                                      {formatted.description && (
                                        <div className='text-cyan-800 mt-0.5 whitespace-pre-wrap'>{formatted.description}</div>
                                      )}
                                      {!formatted.description && formatted.exercises && formatted.exercises.length > 0 && (
                                        <div className='text-cyan-800 mt-0.5'>{formatted.exercises.join(' • ')}</div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Free-form content */}
                          {section.content && (
                            <div className='text-xs text-gray-700 whitespace-pre-wrap'>
                              {section.content}
                            </div>
                          )}

                          {/* Section Result */}
                          {hasResultData && (
                            <div className='bg-green-50 border border-green-200 rounded p-2 mt-2'>
                              <div className='text-xs font-bold text-green-900 mb-1'>Your Result:</div>
                              <div className='text-xs text-green-800 space-y-0.5'>
                                {sectionResult.time_result && <div>Time: {sectionResult.time_result}</div>}
                                {sectionResult.reps_result && <div>Reps: {sectionResult.reps_result}</div>}
                                {sectionResult.rounds_result && <div>Rounds: {sectionResult.rounds_result}</div>}
                                {sectionResult.weight_result && <div>Weight: {sectionResult.weight_result} kg</div>}
                                {sectionResult.calories_result && <div>Calories: {sectionResult.calories_result}</div>}
                                {sectionResult.metres_result && <div>Distance: {sectionResult.metres_result} m</div>}
                                {sectionResult.scaling_level && <div>Scaling: {sectionResult.scaling_level}</div>}
                                {sectionResult.task_completed !== null && <div>{sectionResult.task_completed ? '✓ Completed' : '○ Not Completed'}</div>}
                              </div>
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
