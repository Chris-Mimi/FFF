'use client';

import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/auth-fetch';
import { ChevronLeft, ChevronRight, Image as ImageIcon, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ConfiguredLift, ConfiguredBenchmark, ConfiguredForgeBenchmark } from '@/types/movements';
import { FocusTrap } from '@/components/ui/FocusTrap';

interface WorkoutSection {
  id: string;
  type: string;
  duration: number;
  content: string;
  workout_type_id?: string;
  lifts?: ConfiguredLift[];
  benchmarks?: ConfiguredBenchmark[];
  forge_benchmarks?: ConfiguredForgeBenchmark[];
  intent_notes?: string;
  show_intent_to_athletes?: boolean;
}

interface SectionResult {
  id: string;
  section_id: string;
  time_result?: string;
  reps_result?: number;
  weight_result?: number;
  rounds_result?: number;
  calories_result?: number;
  metres_result?: number;
  scaling_level?: string;
  task_completed?: boolean;
  is_coach_entered?: boolean;
}

interface LiftResult {
  lift_name: string;
  weight_kg: number;
  reps: number;
  rep_scheme: string;
}

interface BenchmarkResult {
  benchmark_name: string;
  time_result?: string;
  reps_result?: string;
  weight_result?: string;
  scaling_level?: string;
}

interface WhiteboardPhoto {
  id: string;
  photo_label: string;
  photo_url: string;
  caption?: string | null;
}

interface PublishedWorkout {
  id: string;
  title: string;
  workout_name?: string;
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
  liftResults?: LiftResult[];
  benchmarkResults?: BenchmarkResult[];
  hasCoachScores?: boolean;
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
    const percentages = lift.variable_sets?.map(s => s.percentage_1rm) || [];

    let base = `${lift.name} ${reps}`;

    // Only show percentages if ALL sets have them defined (no undefined/null values)
    const allHavePercentages = percentages.length > 0 && percentages.every(p => p !== undefined && p !== null);
    if (allHavePercentages) {
      // Show ALL percentages for each set: "40-40-50-50-50-50-50%"
      base += ` @ ${percentages.join('-')}%`;
    }

    return base;
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
  const [weekPhotos, setWeekPhotos] = useState<WhiteboardPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<WhiteboardPhoto | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);
  const [scoreQueryModal, setScoreQueryModal] = useState<{ workoutName: string } | null>(null);
  const [scoreQueryMessage, setScoreQueryMessage] = useState('');
  const [scoreQuerySending, setScoreQuerySending] = useState(false);

  const handleScoreQuery = async () => {
    if (!scoreQueryMessage.trim() || !scoreQueryModal) return;
    setScoreQuerySending(true);
    try {
      const res = await authFetch('/api/score-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutName: scoreQueryModal.workoutName,
          message: scoreQueryMessage.trim(),
        }),
      });
      if (!res.ok) throw new Error('Failed to send');
      const data = await res.json();
      setScoreQueryModal(null);
      setScoreQueryMessage('');
      const { toast } = await import('sonner');
      // DEBUG: show push result temporarily
      const pr = data.pushResult;
      toast.success(`Sent! coaches:${pr?.coachCount} subs:${pr?.subCount} ok:${pr?.results?.filter((r: {ok:boolean}) => r.ok).length}`);
    } catch {
      const { toast } = await import('sonner');
      toast.error('Failed to send score query. Please try again.');
    } finally {
      setScoreQuerySending(false);
    }
  };

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
    fetchWeekPhotos();
  }, [selectedDate, userId]);

  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };

  const fetchWeekPhotos = async () => {
    try {
      const weekNumber = getWeekNumber(selectedDate);
      const isoWeek = `${selectedDate.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;

      const response = await authFetch(`/api/whiteboard-photos?week=${isoWeek}`);
      if (!response.ok) throw new Error('Failed to fetch photos');
      const data = await response.json();
      setWeekPhotos(data);
    } catch (error) {
      console.error('Error fetching week photos:', error);
      setWeekPhotos([]);
    }
  };

  const handleViewPhoto = (photo: WhiteboardPhoto) => {
    setSelectedPhoto(photo);
    setShowPhotoModal(true);
  };

  const handleClosePhotoModal = () => {
    setShowPhotoModal(false);
    setSelectedPhoto(null);
  };

  const handlePreviousPhoto = () => {
    if (!selectedPhoto || weekPhotos.length === 0) return;
    const currentIndex = weekPhotos.findIndex(p => p.id === selectedPhoto.id);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : weekPhotos.length - 1;
    setSelectedPhoto(weekPhotos[prevIndex]);
  };

  const handleNextPhoto = () => {
    if (!selectedPhoto || weekPhotos.length === 0) return;
    const currentIndex = weekPhotos.findIndex(p => p.id === selectedPhoto.id);
    const nextIndex = currentIndex < weekPhotos.length - 1 ? currentIndex + 1 : 0;
    setSelectedPhoto(weekPhotos[nextIndex]);
  };

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
              workout_name,
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

      // Transform bookings into workout display format (skip unpublished workouts)
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const workoutsFromBookings = (bookings || []).filter((booking: any) => {
        const workout = booking.weekly_sessions?.wods;
        return workout && workout.is_published;
      }).map((booking: any) => {
      /* eslint-enable @typescript-eslint/no-explicit-any */
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
          workout_name: workout?.workout_name,
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

      // Fetch section results for these workouts (exclude fallback session-* IDs)
      const workoutIds = workoutsFromBookings
        .filter(w => w.attended && !w.id.startsWith('session-'))
        .map(w => w.id);
      const workoutDates = workoutsFromBookings
        .filter(w => w.attended)
        .map(w => w.date);

      if (workoutIds.length > 0) {
        // Fetch WOD section results — self-entered (by user_id) + coach-entered (by member_id)
        const [selfQuery, coachQuery] = await Promise.all([
          supabase
            .from('wod_section_results')
            .select('id, section_id, time_result, reps_result, weight_result, rounds_result, calories_result, metres_result, scaling_level, task_completed, wod_id, member_id')
            .in('wod_id', workoutIds)
            .eq('user_id', userId),
          supabase
            .from('wod_section_results')
            .select('id, section_id, time_result, reps_result, weight_result, rounds_result, calories_result, metres_result, scaling_level, task_completed, wod_id, member_id')
            .in('wod_id', workoutIds)
            .eq('member_id', userId)
            .not('member_id', 'is', null),
        ]);

        if (selfQuery.error) console.error('Error fetching self results:', selfQuery.error);
        if (coachQuery.error) console.error('Error fetching coach results:', coachQuery.error);

        // Merge and deduplicate (coach scores take priority), mark source
        const coachResults = (coachQuery.data || []).map(r => ({ ...r, is_coach_entered: true }));
        const coachResultIds = new Set(coachResults.map(r => r.id));
        const selfResults = (selfQuery.data || [])
          .filter(r => !coachResultIds.has(r.id))
          .map(r => ({ ...r, is_coach_entered: false }));
        const results = [...coachResults, ...selfResults];

        // Fetch lift records
        const { data: liftRecords, error: liftError } = await supabase
          .from('lift_records')
          .select('lift_name, weight_kg, reps, rep_scheme, lift_date')
          .in('lift_date', workoutDates)
          .eq('user_id', userId);

        if (liftError) {
          console.error('Error fetching lift records:', liftError);
        }

        // Fetch benchmark results
        const { data: benchmarkResults, error: benchmarkError } = await supabase
          .from('benchmark_results')
          .select('benchmark_name, time_result, reps_result, weight_result, scaling_level, result_date')
          .in('result_date', workoutDates)
          .eq('user_id', userId);

        if (benchmarkError) {
          console.error('Error fetching benchmark results:', benchmarkError);
        }

        // Attach results to workouts and flag coach-entered scores
        workoutsFromBookings.forEach(workout => {
          const wodResults = results?.filter(r => r.wod_id === workout.id) || [];
          workout.results = wodResults;
          workout.hasCoachScores = wodResults.some(r => r.is_coach_entered);
          workout.liftResults = liftRecords?.filter(r => r.lift_date === workout.date) || [];
          workout.benchmarkResults = benchmarkResults?.filter(r => r.result_date === workout.date) || [];
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
    const day = curr.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Sunday: go back 6 days, others: calculate from Monday
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + diff);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
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
    <div className='space-y-4 md:space-y-6'>
      {/* Week Navigation */}
      <div className='flex items-center justify-between bg-white rounded-lg shadow-sm p-4'>
        <button
          onClick={previousWeek}
          className='p-2 hover:bg-gray-100 rounded-full transition text-gray-900'
          title='Previous Week'
          aria-label='Previous week'
        >
          <ChevronLeft size={24} />
        </button>
        <div className='flex items-center gap-2 md:gap-3'>
          <span className='text-sm md:text-lg font-semibold text-gray-900'>
            {weekLabel}
          </span>
          <button
            onClick={goToToday}
            className='px-2 md:px-3 py-1 bg-[#178da6] hover:bg-[#14758c] text-white text-xs md:text-sm rounded-lg font-medium transition'
          >
            Today
          </button>
        </div>
        <button
          onClick={nextWeek}
          className='p-2 hover:bg-gray-100 rounded-full transition text-gray-900'
          title='Next Week'
          aria-label='Next week'
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Weekly Calendar - Only show days with workouts */}
      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'>
        {weekDates.map((date, index) => {
          const workout = getWorkoutForDate(date);

          // Skip days without workouts
          if (!workout) return null;

          const isToday = formatDate(new Date()) === formatDate(date);
          const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });

          return (
            <div
              key={index}
              onClick={() => {
                if (workout.hasCoachScores) {
                  setExpandedWorkoutId(prev => prev === workout.id ? null : workout.id);
                } else {
                  onNavigateToLogbook?.(date);
                }
              }}
              className={`bg-white rounded-lg shadow-md overflow-hidden ${
                isToday ? 'ring-4 ring-[#7dd3c0]' : 'border border-gray-400'
              } cursor-pointer hover:shadow-lg transition-shadow`}
            >
              {/* Day Header */}
              <div className={`p-4 md:p-3 text-center ${
                isToday
                  ? 'bg-cyan-100 text-gray-900'
                  : workout?.attended
                  ? 'bg-[#178da6] text-white'
                  : workout?.booked
                  ? 'bg-[#7dd3c0] text-gray-900'
                  : 'bg-cyan-100 text-gray-900'
              }`}>
                <div className='text-sm font-semibold'>{dayName}</div>
                <div className='text-sm font-bold'>
                  {workout
                    ? `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} at ${workout.publish_time.slice(0, 5)}`
                    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                  }
                </div>

                {/* Mobile-Only: Workout Title & Name - visible only on small screens */}
                {workout && (
                  <div className='mt-2 md:hidden'>
                    <div className='text-sm font-semibold'>{workout.title}</div>
                    {workout.workout_name && (
                      <div className='text-xs mt-1 opacity-90'>{workout.workout_name}</div>
                    )}
                    {workout.hasCoachScores && (
                      <div className='inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-medium'>
                        Score Recorded
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile Expanded View - Coach scores read-only */}
              {workout.hasCoachScores && expandedWorkoutId === workout.id && (
                <div className='md:hidden p-3 border-t border-gray-200 bg-gray-50'>
                  {getPublishedSections(workout).map(section => {
                    const sectionResult = workout.results?.find(r =>
                      (r.section_id === section.id || r.section_id.startsWith(section.id + '-content')) && r.is_coach_entered
                    );
                    const hasResultData = sectionResult && (
                      sectionResult.time_result || sectionResult.reps_result || sectionResult.rounds_result ||
                      sectionResult.weight_result || sectionResult.calories_result || sectionResult.metres_result ||
                      sectionResult.scaling_level || (sectionResult.task_completed !== undefined && sectionResult.task_completed !== null)
                    );

                    return (
                      <div key={section.id} className='mb-3'>
                        <div className='text-xs font-semibold text-[#178da6] mb-1'>
                          {section.type}
                          {(section.duration > 0) && ` (${section.duration} min)`}
                        </div>
                        {section.content && (
                          <div className='text-xs text-gray-700 whitespace-pre-wrap mb-2'>{section.content}</div>
                        )}
                        {hasResultData && (
                          <div className='bg-green-50 border border-green-200 rounded p-2'>
                            <div className='text-xs font-bold text-green-900 mb-1'>Your Result (Coach Entered):</div>
                            <div className='text-xs text-green-800 space-y-0.5'>
                              {sectionResult.time_result && <div>Time: {sectionResult.time_result}</div>}
                              {sectionResult.rounds_result && <div>Rounds: {sectionResult.rounds_result}</div>}
                              {sectionResult.reps_result && <div>Reps: {sectionResult.reps_result}</div>}
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
                  <button
                    onClick={(e) => { e.stopPropagation(); setScoreQueryModal({ workoutName: workout.workout_name || workout.title }); }}
                    className='mt-2 w-full text-xs text-[#178da6] font-medium py-1.5 border border-[#178da6] rounded hover:bg-[#178da6]/10 transition'
                  >
                    Query Score
                  </button>
                </div>
              )}

              {/* Workout Content - HIDDEN on mobile, VISIBLE on desktop */}
              <div className='hidden md:block p-3 min-h-[200px]'>
                {loading ? (
                  <div className='text-center text-gray-500 text-sm py-4'>Loading...</div>
                ) : (
                  workout.booked ? (
                    // Future booked session - show "Booked" placeholder
                    <div className='flex flex-col items-center justify-center h-full py-8'>
                      <div className='text-center'>
                        <div className='text-lg font-bold text-[#178da6] mb-2'>Booked</div>
                        <div className='text-xs text-gray-600'>{workout.publish_time.slice(0, 5)}</div>
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
                            style={{ backgroundColor: workout.track.color || '#178da6' }}
                          />
                        )}
                        <h3 className='font-bold text-gray-900 text-sm'>{workout.title}</h3>
                      </div>

                      {/* Event Time */}
                      <div className='text-xs text-gray-600'>
                        {workout.publish_time.slice(0, 5)} ({workout.publish_duration} min)
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
                        <div key={section.id} className='border-l-2 border-[#178da6] pl-2'>
                          <div className='text-xs font-semibold text-[#178da6] mb-1'>
                            {section.type}
                            {(section.duration > 0) && ` (${section.duration} min)`}
                          </div>

                          {/* Intent / Stimulus (if coach enabled for athletes) */}
                          {section.intent_notes && section.show_intent_to_athletes && (
                            <div className='text-xs bg-amber-50 border-l-2 border-amber-400 px-2 py-1.5 mb-2 text-amber-900'>
                              <span className='font-semibold'>Intent:</span> {section.intent_notes}
                            </div>
                          )}

                          {/* Structured Movements */}
                          <div className='space-y-2 mb-2'>
                            {/* Lifts */}
                            {section.lifts && section.lifts.length > 0 && (
                              <div className='space-y-1'>
                                {section.lifts.map((lift, liftIdx) => {
                                  const repScheme = lift.rep_type === 'constant'
                                    ? `${lift.sets || 1}x${lift.reps || 1}`
                                    : lift.variable_sets?.map(s => s.reps).join('-') || '1';
                                  const liftResult = workout.liftResults?.find(r =>
                                    r.lift_name === lift.name && r.rep_scheme === repScheme
                                  );

                                  return (
                                    <div key={liftIdx} className='text-xs bg-blue-50 text-blue-900 rounded px-2 py-1'>
                                      <div className='font-semibold'>≡ {formatLift(lift)}</div>
                                      {liftResult && (
                                        <div className='mt-1 text-blue-800 font-medium'>
                                          ✓ {liftResult.reps} reps @ {liftResult.weight_kg} kg
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Benchmarks */}
                            {section.benchmarks && section.benchmarks.length > 0 && (
                              <div className='space-y-1'>
                                {section.benchmarks.map((benchmark, bmIdx) => {
                                  const formatted = formatBenchmark(benchmark);
                                  const benchmarkResult = workout.benchmarkResults?.find(r =>
                                    r.benchmark_name === benchmark.name
                                  );

                                  return (
                                    <div key={bmIdx} className='text-xs bg-teal-50 text-teal-900 rounded px-2 py-1'>
                                      <div className='font-semibold'>≡ {formatted.name}</div>
                                      {formatted.description && (
                                        <div className='text-teal-800 mt-0.5 whitespace-pre-wrap'>{formatted.description}</div>
                                      )}
                                      {!formatted.description && formatted.exercises && formatted.exercises.length > 0 && (
                                        <div className='text-teal-800 mt-0.5'>{formatted.exercises.join(' • ')}</div>
                                      )}
                                      {benchmarkResult && (
                                        <div className='mt-1 text-teal-800 font-medium'>
                                          ✓ {benchmarkResult.time_result && `Time: ${benchmarkResult.time_result}`}
                                          {benchmarkResult.reps_result && ` Reps: ${benchmarkResult.reps_result}`}
                                          {benchmarkResult.weight_result && ` Weight: ${benchmarkResult.weight_result} kg`}
                                          {benchmarkResult.scaling_level && ` (${benchmarkResult.scaling_level})`}
                                        </div>
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
                                  const forgeResult = workout.benchmarkResults?.find(r =>
                                    r.benchmark_name === forge.name
                                  );

                                  return (
                                    <div key={forgeIdx} className='text-xs bg-cyan-50 text-cyan-900 rounded px-2 py-1'>
                                      <div className='font-semibold'>≡ {formatted.name}</div>
                                      {formatted.description && (
                                        <div className='text-cyan-800 mt-0.5 whitespace-pre-wrap'>{formatted.description}</div>
                                      )}
                                      {!formatted.description && formatted.exercises && formatted.exercises.length > 0 && (
                                        <div className='text-cyan-800 mt-0.5'>{formatted.exercises.join(' • ')}</div>
                                      )}
                                      {forgeResult && (
                                        <div className='mt-1 text-cyan-800 font-medium'>
                                          ✓ {forgeResult.time_result && `Time: ${forgeResult.time_result}`}
                                          {forgeResult.reps_result && ` Reps: ${forgeResult.reps_result}`}
                                          {forgeResult.weight_result && ` Weight: ${forgeResult.weight_result} kg`}
                                          {forgeResult.scaling_level && ` (${forgeResult.scaling_level})`}
                                        </div>
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
                              <div className='text-xs font-bold text-green-900 mb-1'>
                                Your Result{sectionResult.is_coach_entered ? ' (Coach Entered)' : ''}:
                              </div>
                              <div className='text-xs text-green-800 space-y-0.5'>
                                {sectionResult.time_result && <div>Time: {sectionResult.time_result}</div>}
                                {sectionResult.rounds_result && <div>Rounds: {sectionResult.rounds_result}</div>}
                                {sectionResult.reps_result && <div>Reps: {sectionResult.reps_result}</div>}
                                {sectionResult.weight_result && <div>Weight: {sectionResult.weight_result} kg</div>}
                                {sectionResult.calories_result && <div>Calories: {sectionResult.calories_result}</div>}
                                {sectionResult.metres_result && <div>Distance: {sectionResult.metres_result} m</div>}
                                {sectionResult.scaling_level && <div>Scaling: {sectionResult.scaling_level}</div>}
                                {sectionResult.task_completed !== null && <div>{sectionResult.task_completed ? '✓ Completed' : '○ Not Completed'}</div>}
                              </div>
                              {sectionResult.is_coach_entered && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setScoreQueryModal({ workoutName: workout.workout_name || workout.title }); }}
                                  className='mt-2 text-xs text-[#178da6] font-medium py-1 px-3 border border-[#178da6] rounded hover:bg-[#178da6]/10 transition'
                                >
                                  Query Score
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        );
                      })}

                      {/* Whiteboard Photo Thumbnails */}
                      {!workout.booked && weekPhotos.length > 0 && (
                        <div className='mt-4 pt-3 border-t border-gray-200'>
                          <div className='flex items-center gap-2 mb-2'>
                            <ImageIcon size={14} className='text-gray-600' />
                            <span className='text-xs font-semibold text-gray-700'>Whiteboard</span>
                          </div>
                          <div className='flex gap-2 overflow-x-auto'>
                            {weekPhotos.map((photo) => (
                              <div
                                key={photo.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewPhoto(photo);
                                }}
                                className='flex-shrink-0 cursor-pointer hover:opacity-80 transition'
                              >
                                <img
                                  src={photo.photo_url}
                                  alt={photo.photo_label}
                                  className='w-16 h-16 object-cover rounded border border-gray-300'
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Photo Modal */}
      {showPhotoModal && selectedPhoto && (
        <FocusTrap>
        <div
          className='fixed inset-0 bg-black bg-opacity-90 z-50 overflow-y-auto cursor-pointer'
          onClick={handleClosePhotoModal}
        >
          <div className='min-h-full flex items-center justify-center p-4'>
            {/* Previous Arrow */}
            {weekPhotos.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); handlePreviousPhoto(); }}
                className='absolute left-4 top-1/2 -translate-y-1/2 bg-white text-gray-700 p-3 rounded-full hover:bg-gray-100 z-10 shadow-lg'
                aria-label='Previous photo'
              >
                <ChevronLeft size={28} />
              </button>
            )}

            <div
              className='relative cursor-default'
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleClosePhotoModal}
                className='absolute -top-12 right-0 bg-white text-gray-700 p-2 rounded-full hover:bg-gray-100 z-10 shadow-lg'
                aria-label='Close modal'
              >
                <X size={24} />
              </button>
              <img
                src={selectedPhoto.photo_url}
                alt={selectedPhoto.photo_label}
                className='max-w-[90vw] max-h-[85vh] object-contain rounded-lg'
              />
              <div className='mt-2 bg-black bg-opacity-70 text-white p-3 rounded-lg'>
                <p className='font-medium'>{selectedPhoto.photo_label}</p>
                {selectedPhoto.caption && <p className='text-sm mt-1'>{selectedPhoto.caption}</p>}
                {weekPhotos.length > 1 && (
                  <p className='text-xs text-gray-500 mt-1'>
                    {weekPhotos.findIndex(p => p.id === selectedPhoto.id) + 1} / {weekPhotos.length}
                  </p>
                )}
              </div>
            </div>

            {/* Next Arrow */}
            {weekPhotos.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); handleNextPhoto(); }}
                className='absolute right-4 top-1/2 -translate-y-1/2 bg-white text-gray-700 p-3 rounded-full hover:bg-gray-100 z-10 shadow-lg'
                aria-label='Next photo'
              >
                <ChevronRight size={28} />
              </button>
            )}
          </div>
        </div>
        </FocusTrap>
      )}

      {/* Score Query Modal */}
      {scoreQueryModal && (
        <FocusTrap>
          <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4' onClick={() => { setScoreQueryModal(null); setScoreQueryMessage(''); }}>
            <div className='bg-white rounded-lg shadow-xl w-full max-w-sm p-4' onClick={(e) => e.stopPropagation()}>
              <h3 className='font-bold text-gray-900 text-sm mb-1'>Query Score</h3>
              <p className='text-xs text-gray-600 mb-3'>
                Tell your coach why you think your score for <span className='font-semibold'>{scoreQueryModal.workoutName}</span> needs reviewing.
              </p>
              <textarea
                value={scoreQueryMessage}
                onChange={(e) => setScoreQueryMessage(e.target.value)}
                placeholder='e.g. "I think my time was 8:30, not 9:30"'
                className='w-full border border-gray-300 rounded p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#178da6] focus:border-transparent'
                rows={3}
                autoFocus
              />
              <div className='flex gap-2 mt-3'>
                <button
                  onClick={() => { setScoreQueryModal(null); setScoreQueryMessage(''); }}
                  className='flex-1 text-sm py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition'
                >
                  Cancel
                </button>
                <button
                  onClick={handleScoreQuery}
                  disabled={!scoreQueryMessage.trim() || scoreQuerySending}
                  className='flex-1 text-sm py-2 bg-[#178da6] text-white rounded hover:bg-[#136e82] transition disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {scoreQuerySending ? 'Sending...' : 'Send to Coach'}
                </button>
              </div>
            </div>
          </div>
        </FocusTrap>
      )}
    </div>
  );
}
