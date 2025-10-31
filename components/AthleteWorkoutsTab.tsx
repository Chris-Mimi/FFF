'use client';

import { supabase } from '@/lib/supabase';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

interface WorkoutSection {
  id: string;
  type: string;
  duration: number;
  content: string;
  workout_type_id?: string;
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
  track?: {
    name: string;
    color: string;
  };
}

interface AthleteWorkoutsTabProps {
  userId: string;
}

export default function AthleteWorkoutsTab({ userId }: AthleteWorkoutsTabProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workouts, setWorkouts] = useState<PublishedWorkout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublishedWorkouts();
  }, [selectedDate]);

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

      const { data, error } = await supabase
        .from('wods')
        .select(
          `
          id,
          title,
          date,
          track_id,
          sections,
          publish_sections,
          publish_time,
          publish_duration,
          tracks:track_id (name, color)
        `
        )
        .eq('is_published', true)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching published workouts:', error);
        return;
      }

      const formattedWorkouts: PublishedWorkout[] = (data || []).map(workout => ({
        id: workout.id,
        title: workout.title,
        date: workout.date,
        track_id: workout.track_id,
        sections: workout.sections || [],
        publish_sections: workout.publish_sections || [],
        publish_time: workout.publish_time,
        publish_duration: workout.publish_duration,
        track: Array.isArray(workout.tracks) ? workout.tracks[0] : workout.tracks,
      }));

      setWorkouts(formattedWorkouts);
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

  const getWorkoutForDate = (date: Date): PublishedWorkout | undefined => {
    return workouts.find(w => w.date === formatDate(date));
  };

  const getPublishedSections = (workout: PublishedWorkout): WorkoutSection[] => {
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
            <span className='text-lg font-semibold text-gray-900 min-w-[200px] text-center'>
              {weekLabel}
            </span>
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

      {/* Weekly Calendar */}
      <div className='grid grid-cols-7 gap-4'>
        {weekDates.map((date, index) => {
          const workout = getWorkoutForDate(date);
          const isToday = formatDate(new Date()) === formatDate(date);
          const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });

          return (
            <div
              key={index}
              className={`bg-white rounded-lg shadow-md overflow-hidden ${
                isToday ? 'ring-2 ring-[#208479]' : 'border border-gray-400'
              }`}
            >
              {/* Day Header */}
              <div className={`p-3 text-center ${isToday ? 'bg-[#208479] text-white' : 'bg-gray-300 text-gray-900'}`}>
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
                ) : workout ? (
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
                    {getPublishedSections(workout).map(section => (
                      <div key={section.id} className='border-l-2 border-[#208479] pl-2'>
                        <div className='text-xs font-semibold text-[#208479] mb-1'>
                          {section.type} ({section.duration} min)
                        </div>
                        <div className='text-xs text-gray-700 whitespace-pre-wrap'>
                          {section.content}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-center text-gray-400 text-sm py-8'>No workout</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
