'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface WOD {
  id: string;
  title: string | null;
  date: string | null;
}

interface WorkoutLog {
  id: string;
  wod_id?: string;
  workout_date: string;
  result?: string;
  notes?: string;
  workout?: {
    title: string | null;
    date: string | null;
  } | null;
}

export default function LogbookSection({ athleteId }: { athleteId?: string }) {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (athleteId) {
      fetchLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  const fetchLogs = async () => {
    if (!athleteId) return;
    setLoading(true);
    try {
      // Fetch workout logs
      const { data: logsData, error: logsError } = await supabase
        .from('workout_logs')
        .select('id, wod_id, workout_date, result, notes')
        .eq('user_id', athleteId)
        .order('workout_date', { ascending: false });

      if (logsError) {
        console.error('Error fetching workout logs:', logsError);
        throw logsError;
      }

      // Get unique workout IDs (excluding nulls)
      const workoutIds = [...new Set(logsData?.map(log => log.wod_id).filter(Boolean) || [])];

      // Fetch workout details if we have IDs
      let workoutsMap: Record<string, WOD> = {};
      if (workoutIds.length > 0) {
        const { data: workoutsData } = await supabase
          .from('wods')
          .select('id, title, date')
          .in('id', workoutIds);

        workoutsMap = (workoutsData || []).reduce((acc: Record<string, WOD>, wod: WOD) => {
          acc[wod.id] = wod;
          return acc;
        }, {});
      }

      // Attach workout data to logs and filter out orphaned logs
      const enrichedLogs = (logsData || []).map(log => ({
        ...log,
        workout: log.wod_id ? workoutsMap[log.wod_id] : null
      }));

      // Identify orphaned logs (no matching workout)
      const orphanedLogIds = enrichedLogs
        .filter(log => log.wod_id && !log.workout)
        .map(log => log.id);

      // Delete orphaned logs from database
      if (orphanedLogIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('workout_logs')
          .delete()
          .in('id', orphanedLogIds);

        if (deleteError) {
          console.error('Error deleting orphaned logs:', deleteError);
        }
      }

      // Only show logs with valid workouts
      const validLogs = enrichedLogs.filter(log => log.workout);
      setLogs(validLogs);
    } catch (error) {
      console.error('Error fetching workout logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p className='text-gray-500 text-center py-8'>Loading workout logs...</p>;
  }

  return (
    <div>
      <h3 className='text-lg font-bold text-gray-900 mb-4'>Workout Logs</h3>

      {logs.length === 0 ? (
        <p className='text-gray-500 text-center py-8'>No workout logs recorded yet</p>
      ) : (
        <div className='space-y-3'>
          {logs.map(log => (
            <div key={log.id} className='p-4 bg-gray-50 rounded-lg'>
              <div className='flex items-start justify-between mb-2'>
                <div>
                  <p className='font-semibold text-gray-900'>
                    {log.workout?.title || <span className='text-gray-400 italic'>Deleted Workout</span>}
                  </p>
                  <p className='text-sm text-gray-600'>
                    {new Date(log.workout_date).toLocaleDateString()}
                  </p>
                </div>
                {log.result && <p className='font-semibold text-[#178da6]'>{log.result}</p>}
              </div>
              {log.notes && <p className='text-sm text-gray-700 mt-2'>{log.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
