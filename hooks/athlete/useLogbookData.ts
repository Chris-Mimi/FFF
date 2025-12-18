import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatLocalDate, getWeekDates, getMonthCalendarDays, WOD } from '@/utils/logbook-utils';

interface UseLogbookDataProps {
  userId: string;
  selectedDate: Date;
  viewMode: 'day' | 'week' | 'month';
}

interface WorkoutLogEntry {
  result: string;
  notes: string;
  date: string;
}

interface UseLogbookDataReturn {
  workouts: WOD[];
  workoutLogs: Record<string, WorkoutLogEntry>;
  loading: boolean;
  setWorkoutLogs: (logs: Record<string, WorkoutLogEntry>) => void;
}

/**
 * Filter workouts to only those user has booked
 * Determines if workout is attended (past) or booked (future)
 */
async function filterUserWorkouts(
  wodsData: any[],
  userId: string
): Promise<WOD[]> {
  const userWorkouts = await Promise.all(
    wodsData.map(async (workout) => {
      // Get session for this workout (including time)
      const { data: sessionData } = await supabase
        .from('weekly_sessions')
        .select('id, time')
        .eq('workout_id', workout.id)
        .maybeSingle();

      if (!sessionData) return null;

      // Check if user has confirmed booking
      const { data: booking } = await supabase
        .from('bookings')
        .select('status')
        .eq('session_id', sessionData.id)
        .eq('member_id', userId)
        .eq('status', 'confirmed')
        .maybeSingle();

      if (!booking) return null;

      // Parse session datetime and subtract 1 hour to determine if workout details should be visible
      const sessionDateTime = new Date(`${workout.date}T${sessionData.time}`);
      const oneHourBeforeSession = new Date(sessionDateTime.getTime() - 60 * 60 * 1000);
      const now = new Date();
      const shouldShowDetails = now >= oneHourBeforeSession;

      return {
        ...workout,
        time: sessionData.time,
        sections: workout.sections || [],
        tracks: Array.isArray(workout.tracks) ? workout.tracks[0] : workout.tracks,
        workout_types: Array.isArray(workout.workout_types)
          ? workout.workout_types[0]
          : workout.workout_types,
        attended: shouldShowDetails,
        booked: !shouldShowDetails,
      };
    })
  );

  return userWorkouts.filter(w => w !== null) as WOD[];
}

/**
 * Convert workout logs array to keyed object
 */
function mapWorkoutLogs(logsData: any[], dateStr: string): Record<string, WorkoutLogEntry> {
  const logsMap: Record<string, WorkoutLogEntry> = {};
  (logsData || []).forEach((log) => {
    if (log.wod_id) {
      logsMap[log.wod_id] = {
        result: log.result || '',
        notes: log.notes || '',
        date: log.workout_date || dateStr,
      };
    }
  });
  return logsMap;
}

export function useLogbookData({
  userId,
  selectedDate,
  viewMode,
}: UseLogbookDataProps): UseLogbookDataReturn {
  const [workouts, setWorkouts] = useState<WOD[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<Record<string, WorkoutLogEntry>>({});
  const [loading, setLoading] = useState(true);

  const fetchWorkoutsForDay = async () => {
    setLoading(true);
    try {
      const dateStr = formatLocalDate(selectedDate);

      // Get workouts for this date
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
        .eq('date', dateStr);

      if (wodsError) throw wodsError;

      if (!wodsData || wodsData.length === 0) {
        setWorkouts([]);
        setWorkoutLogs({});
        setLoading(false);
        return;
      }

      // Filter to user's booked workouts
      const filteredWorkouts = await filterUserWorkouts(wodsData, userId);
      setWorkouts(filteredWorkouts);

      // Fetch existing workout logs
      const { data: logsData, error: logsError } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('workout_date', dateStr)
        .eq('user_id', userId);

      if (logsError) throw logsError;

      setWorkoutLogs(mapWorkoutLogs(logsData, dateStr));
    } catch (error: any) {
      console.error('Error fetching WODs:', error);
      console.error('Error message:', error?.message);
      console.error('Error code:', error?.code);
      console.error('Error details:', error?.details);
      console.error('Error hint:', error?.hint);
      setWorkouts([]);
      setWorkoutLogs({});
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkoutsForWeek = async () => {
    setLoading(true);
    try {
      const weekDates = getWeekDates(selectedDate);
      const startStr = formatLocalDate(weekDates[0]);
      const endStr = formatLocalDate(weekDates[6]);

      // Get workouts for this week
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
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: true });

      if (wodsError) throw wodsError;

      if (!wodsData || wodsData.length === 0) {
        setWorkouts([]);
        setWorkoutLogs({});
        setLoading(false);
        return;
      }

      // Filter to user's booked workouts
      const filteredWorkouts = await filterUserWorkouts(wodsData, userId);
      setWorkouts(filteredWorkouts);

      // Fetch logs for week
      const { data: logsData } = await supabase
        .from('workout_logs')
        .select('*')
        .gte('workout_date', startStr)
        .lte('workout_date', endStr)
        .eq('user_id', userId);

      setWorkoutLogs(mapWorkoutLogs(logsData || [], startStr));
    } catch (error) {
      console.error('Error fetching workouts for week:', error);
      setWorkouts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkoutsForMonth = async () => {
    setLoading(true);
    try {
      const monthDates = getMonthCalendarDays(selectedDate);
      const startStr = formatLocalDate(monthDates[0]);
      const endStr = formatLocalDate(monthDates[monthDates.length - 1]);

      // Get workouts for this month
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
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: true });

      if (wodsError) throw wodsError;

      if (!wodsData || wodsData.length === 0) {
        setWorkouts([]);
        setWorkoutLogs({});
        setLoading(false);
        return;
      }

      // Filter to user's booked workouts
      const filteredWorkouts = await filterUserWorkouts(wodsData, userId);
      setWorkouts(filteredWorkouts);

      // Fetch logs for month
      const { data: logsData } = await supabase
        .from('workout_logs')
        .select('*')
        .gte('workout_date', startStr)
        .lte('workout_date', endStr)
        .eq('user_id', userId);

      setWorkoutLogs(mapWorkoutLogs(logsData || [], startStr));
    } catch (error) {
      console.error('Error fetching workouts for month:', error);
      setWorkouts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'day') {
      fetchWorkoutsForDay();
    } else if (viewMode === 'week') {
      fetchWorkoutsForWeek();
    } else if (viewMode === 'month') {
      fetchWorkoutsForMonth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, viewMode, userId]);

  return {
    workouts,
    workoutLogs,
    loading,
    setWorkoutLogs,
  };
}
