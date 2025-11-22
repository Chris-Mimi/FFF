'use client';

import DateRangePicker from '@/components/coach/analysis/DateRangePicker';
import ExerciseLibraryPanel from '@/components/coach/analysis/ExerciseLibraryPanel';
import StatisticsSection from '@/components/coach/analysis/StatisticsSection';
import TrackManagementSection from '@/components/coach/analysis/TrackManagementSection';
import TrackModal from '@/components/coach/analysis/TrackModal';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface Track {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
}

interface WorkoutType {
  id: string;
  name: string;
  description: string | null;
}

interface WODSection {
  id: string;
  type: string;
  content: string;
  duration?: string;
}

interface WOD {
  id: string;
  title: string;
  track_id: string | null;
  workout_type_id: string | null;
  date: string;
  sections: WODSection[];
}

interface Statistics {
  totalWorkouts: number;
  trackBreakdown: { trackId: string; trackName: string; count: number; color: string }[];
  typeBreakdown: { typeId: string; typeName: string; count: number }[];
  exerciseFrequency: { exercise: string; count: number }[];
  allExerciseFrequency: { exercise: string; count: number }[];
  totalWODDuration: number;
  averageWODDuration: number;
  durationBreakdown: { range: string; count: number }[];
}

type TimeframePeriod = 0.25 | 1 | 3 | 6 | 12;

export default function AnalysisPage() {
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [workoutTypes, setWorkoutTypes] = useState<WorkoutType[]>([]);
  const [exercises, setExercises] = useState<Set<string>>(new Set());
  const [exerciseCategories, setExerciseCategories] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [timeframePeriod, setTimeframePeriod] = useState<TimeframePeriod>(1);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const scrollPositionRef = useRef<number>(0);

  // Exercise Search State
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Exercise Library Panel State
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryPos, setLibraryPos] = useState({ top: 100, left: 100 });
  const [librarySize, setLibrarySize] = useState({ width: 600, height: 500 });
  const [showUnusedOnly, setShowUnusedOnly] = useState(false);

  // Track Management Modal State
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [trackFormData, setTrackFormData] = useState({
    name: '',
    description: '',
    color: '#208479',
  });

  // Date Range Picker State
  const [dateRangeModalOpen, setDateRangeModalOpen] = useState(false);
  const [tempStartMonth, setTempStartMonth] = useState(new Date());
  const [tempEndMonth, setTempEndMonth] = useState(new Date());
  const [startYearInput, setStartYearInput] = useState('');
  const [endYearInput, setEndYearInput] = useState('');
  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const checkAuth = async () => {
      const { getCurrentUser } = await import('@/lib/auth');
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        router.push('/login');
        return;
      }

      const role = currentUser.user_metadata?.role || 'athlete';
      if (role !== 'coach') {
        router.push('/coach');
        return;
      }

      fetchData();
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (tracks.length > 0 && workoutTypes.length > 0) {
      fetchMonthlyWODs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, timeframePeriod, tracks, workoutTypes]);

  useEffect(() => {
    if (scrollPositionRef.current > 0) {
      window.scrollTo(0, scrollPositionRef.current);
      scrollPositionRef.current = 0;
    }
  }, [statistics]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tracksResult, typesResult, exercisesResult] = await Promise.all([
        supabase.from('tracks').select('*').order('name'),
        supabase.from('workout_types').select('*').order('name'),
        supabase.from('exercises').select('name, category').order('name'),
      ]);

      if (tracksResult.error) throw tracksResult.error;
      if (typesResult.error) throw typesResult.error;
      if (exercisesResult.error) throw exercisesResult.error;

      setTracks(tracksResult.data || []);
      setWorkoutTypes(typesResult.data || []);

      const exerciseSet = new Set<string>();
      const categoryMap = new Map<string, string>();
      const categorySet = new Set<string>();

      (exercisesResult.data || []).forEach(ex => {
        exerciseSet.add(ex.name);
        if (ex.category) {
          categoryMap.set(ex.name, ex.category);
          categorySet.add(ex.category);
        }
      });

      setExercises(exerciseSet);
      setExerciseCategories(categoryMap);
      setCategories(Array.from(categorySet).sort());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyWODs = async () => {
    setLoadingStats(true);
    try {
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth();

      let endDate: Date;
      let startDate: Date;

      if (timeframePeriod === 0.25) {
        const selectedDate = new Date(selectedMonth);
        const dayOfWeek = selectedDate.getDay();
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

        startDate = new Date(selectedDate);
        startDate.setDate(selectedDate.getDate() - daysFromMonday);

        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
      } else {
        endDate = new Date(year, month + 1, 0);
        startDate = new Date(year, month - timeframePeriod + 1, 1);
      }

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('weekly_sessions')
        .select(`
          id,
          date,
          time,
          workout_id,
          wods (
            id,
            title,
            track_id,
            workout_type_id,
            sections,
            workout_publish_status
          )
        `)
        .gte('date', startDateStr)
        .lte('date', endDateStr);

      if (error) throw error;

      interface SessionRecord {
        id: string;
        date: string;
        time: string;
        workout_id: string | null;
        wods: {
          id: string;
          title: string;
          track_id: string | null;
          workout_type_id: string | null;
          sections: WODSection[];
          workout_publish_status: string | null;
        } | null;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wods: WOD[] = (data as any as SessionRecord[])
        .filter((session) => session.wods !== null && session.wods.workout_publish_status === 'published')
        .map((session) => ({
          id: session.wods!.id,
          title: session.wods!.title,
          track_id: session.wods!.track_id,
          workout_type_id: session.wods!.workout_type_id,
          date: session.date,
          sections: session.wods!.sections,
        }));

      calculateStatistics(wods);
    } catch (error) {
      console.error('Error fetching monthly WODs:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const calculateStatistics = (wods: WOD[]) => {
    const totalWorkouts = wods.length;

    const trackCounts: Record<string, number> = {};
    wods.forEach(wod => {
      if (wod.track_id) {
        trackCounts[wod.track_id] = (trackCounts[wod.track_id] || 0) + 1;
      }
    });

    const trackBreakdown = Object.entries(trackCounts)
      .map(([trackId, count]) => {
        const track = tracks.find(t => t.id === trackId);
        return {
          trackId,
          trackName: track?.name || 'Unknown',
          count,
          color: track?.color || '#208479',
        };
      })
      .sort((a, b) => b.count - a.count);

    const typeCounts: Record<string, number> = {};
    wods.forEach(wod => {
      if (wod.workout_type_id) {
        typeCounts[wod.workout_type_id] = (typeCounts[wod.workout_type_id] || 0) + 1;
      }
    });

    const typeBreakdown = Object.entries(typeCounts)
      .map(([typeId, count]) => {
        const type = workoutTypes.find(t => t.id === typeId);
        return {
          typeId,
          typeName: type?.name || 'Unknown',
          count,
        };
      })
      .sort((a, b) => b.count - a.count);

    const exerciseCounts: Record<string, number> = {};
    const excludeWords = new Set([
      'reps', 'rep', 'rounds', 'round', 'minutes', 'minute', 'min', 'mins',
      'seconds', 'second', 'sec', 'secs', 'meter', 'meters', 'calories', 'cal',
      'cals', 'each', 'side', 'total', 'amrap', 'emom', 'for', 'time', 'the',
      'and', 'or', 'of', 'in', 'at', 'to', 'a', 'an', 'with', 'without',
      'rx', 'scaled', 'beginner', 'intermediate', 'advanced'
    ]);

    const normalizeMovement = (movement: string): string => {
      return movement
        .split(/\s+/)
        .map(word => {
          if (word.includes('(') || word.includes(')')) {
            return word;
          }
          if (word.includes('-')) {
            return word.split('-').map(part =>
              part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            ).join('-');
          }
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ')
        .trim();
    };

    const findMatchingExercise = (movement: string): string | null => {
      if (exercises.has(movement)) {
        return movement;
      }

      const hyphenated = movement.replace(/\s+/g, '-');
      if (exercises.has(hyphenated)) {
        return hyphenated;
      }

      const singular = movement.endsWith('s') ? movement.slice(0, -1) : movement + 's';
      if (exercises.has(singular)) {
        return singular;
      }

      const singularHyphenated = hyphenated.endsWith('s') ? hyphenated.slice(0, -1) : hyphenated + 's';
      if (exercises.has(singularHyphenated)) {
        return singularHyphenated;
      }

      for (const exercise of exercises) {
        if (exercise === movement ||
            exercise + 's' === movement ||
            exercise === movement + 's' ||
            exercise === hyphenated ||
            exercise + 's' === hyphenated ||
            exercise === hyphenated + 's') {
          return exercise;
        }
      }

      const movementWords = movement.split(' ');
      for (const exercise of exercises) {
        const exerciseWords = exercise.replace(/-/g, ' ').split(' ');
        if (exerciseWords.every(word => movementWords.includes(word))) {
          return exercise;
        }
      }

      return null;
    };

    wods.forEach(wod => {
      wod.sections.forEach(section => {
        const lines = section.content.split('\n');

        lines.forEach(line => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return;

          const numberXPattern = /^(?:\d+[\s-]*x[\s-]*|[\d-]+[\s-]*x[\s-]*)([\w\s\-()]+?)(?:\s*[@\d]|$)/i;
          let match = trimmedLine.match(numberXPattern);

          if (!match) {
            const bulletPattern = /^[\s*•\-]+\s*([\w\s\-()]+?)(?:\s*[@\d]|$)/;
            match = trimmedLine.match(bulletPattern);
          }

          if (!match) {
            const numberPattern = /^(?:\d+[a-z]*[\s-]*)([\w\s\-()]+?)(?:\s*[@\d]|$)/i;
            match = trimmedLine.match(numberPattern);
          }

          if (!match) {
            const repSchemePattern = /^(?:\d+-\d+(?:-\d+)*[\s-]*)([\w\s\-()]+?)(?:\s*[@\d]|$)/;
            match = trimmedLine.match(repSchemePattern);
          }

          if (match && match[1]) {
            let movementText = match[1].trim();
            movementText = movementText.replace(/[,;.!?]+$/, '');

            const movement = normalizeMovement(movementText);

            const matchedExercise = findMatchingExercise(movement);
            if (matchedExercise) {
              exerciseCounts[matchedExercise] = (exerciseCounts[matchedExercise] || 0) + 1;
            }
          }
        });
      });
    });

    const allExerciseFrequency = Object.entries(exerciseCounts)
      .map(([exercise, count]) => ({ exercise, count }))
      .sort((a, b) => b.count - a.count);

    const exerciseFrequency = allExerciseFrequency.slice(0, 40);

    let totalWODDuration = 0;
    let wodCount = 0;
    const durationRanges = {
      '1-8 mins': 0,
      '9-12 mins': 0,
      '13-20 mins': 0,
      '21-30 mins': 0,
      '31-45 mins': 0,
      '45-60 mins': 0,
      '60+ mins': 0,
    };

    wods.forEach(wod => {
      const wodSections = wod.sections.filter(s => s.type === 'WOD');
      if (wodSections.length > 0) {
        let wodTotalDuration = 0;
        wodSections.forEach(section => {
          if (section.duration) {
            const duration = parseInt(section.duration);
            if (!isNaN(duration)) {
              wodTotalDuration += duration;
            }
          }
        });

        if (wodTotalDuration > 0) {
          wodCount++;
          totalWODDuration += wodTotalDuration;

          if (wodTotalDuration >= 1 && wodTotalDuration <= 8) {
            durationRanges['1-8 mins']++;
          } else if (wodTotalDuration >= 9 && wodTotalDuration <= 12) {
            durationRanges['9-12 mins']++;
          } else if (wodTotalDuration >= 13 && wodTotalDuration <= 20) {
            durationRanges['13-20 mins']++;
          } else if (wodTotalDuration >= 21 && wodTotalDuration <= 30) {
            durationRanges['21-30 mins']++;
          } else if (wodTotalDuration >= 31 && wodTotalDuration <= 45) {
            durationRanges['31-45 mins']++;
          } else if (wodTotalDuration >= 46 && wodTotalDuration <= 60) {
            durationRanges['45-60 mins']++;
          } else if (wodTotalDuration > 60) {
            durationRanges['60+ mins']++;
          }
        }
      }
    });

    const averageWODDuration = wodCount > 0 ? Math.round(totalWODDuration / wodCount) : 0;

    const durationBreakdown = Object.entries(durationRanges).map(([range, count]) => ({
      range,
      count,
    }));

    setStatistics({
      totalWorkouts,
      trackBreakdown,
      typeBreakdown,
      exerciseFrequency,
      allExerciseFrequency,
      totalWODDuration,
      averageWODDuration,
      durationBreakdown,
    });
  };

  const handleLogout = async () => {
    const { signOut } = await import('@/lib/auth');
    await signOut();
    router.push('/login');
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      if (timeframePeriod === 0.25) {
        if (direction === 'prev') {
          newDate.setDate(newDate.getDate() - 7);
        } else {
          newDate.setDate(newDate.getDate() + 7);
        }
      } else {
        if (direction === 'prev') {
          newDate.setMonth(newDate.getMonth() - 1);
        } else {
          newDate.setMonth(newDate.getMonth() + 1);
        }
      }
      return newDate;
    });
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getTimeframeLabel = () => {
    if (timeframePeriod === 0.25) {
      const selectedDate = new Date(selectedMonth);
      const dayOfWeek = selectedDate.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

      const startDate = new Date(selectedDate);
      startDate.setDate(selectedDate.getDate() - daysFromMonday);

      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }

    if (timeframePeriod === 1) {
      return formatMonthYear(selectedMonth);
    }

    const endDate = new Date(selectedMonth);
    const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - timeframePeriod + 1, 1);
    const startMonthYear = startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const endMonthYear = endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    return `${startMonthYear} - ${endMonthYear}`;
  };

  const openTrackModal = (track?: Track) => {
    if (track) {
      setEditingTrack(track);
      setTrackFormData({
        name: track.name,
        description: track.description || '',
        color: track.color || '#208479',
      });
    } else {
      setEditingTrack(null);
      setTrackFormData({
        name: '',
        description: '',
        color: '#208479',
      });
    }
    setTrackModalOpen(true);
  };

  const handleSaveTrack = async () => {
    try {
      if (editingTrack) {
        const { error } = await supabase
          .from('tracks')
          .update({
            name: trackFormData.name,
            description: trackFormData.description || null,
            color: trackFormData.color,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTrack.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('tracks').insert([
          {
            name: trackFormData.name,
            description: trackFormData.description || null,
            color: trackFormData.color,
          },
        ]);

        if (error) throw error;
      }

      setTrackModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving track:', error);
      alert('Error saving track. Please try again.');
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!confirm('Are you sure you want to delete this track?')) return;

    try {
      const { error } = await supabase.from('tracks').delete().eq('id', trackId);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting track:', error);
      alert('Error deleting track. Please try again.');
    }
  };

  const handleExerciseSelect = (exercise: string) => {
    if (!selectedExercises.includes(exercise)) {
      setSelectedExercises([...selectedExercises, exercise]);
    }
    setExerciseSearch('');
  };

  const removeExerciseSelection = (exerciseToRemove: string) => {
    setSelectedExercises(selectedExercises.filter(e => e !== exerciseToRemove));
    setExerciseSearch('');
  };

  const clearAllExerciseSelections = () => {
    setSelectedExercises([]);
    setExerciseSearch('');
  };

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const clearAllCategories = () => {
    setSelectedCategories([]);
  };

  const getAllExercisesWithCounts = () => {
    const exerciseList: Array<{ exercise: string; count: number }> = [];

    exercises.forEach(exerciseName => {
      const exerciseCategory = exerciseCategories.get(exerciseName);
      if (selectedCategories.length > 0 && (!exerciseCategory || !selectedCategories.includes(exerciseCategory))) {
        return;
      }

      const exerciseData = statistics?.allExerciseFrequency.find(e => e.exercise === exerciseName);
      const count = exerciseData?.count || 0;

      if (showUnusedOnly && count > 0) {
        return;
      }

      exerciseList.push({
        exercise: exerciseName,
        count: count
      });
    });

    return exerciseList.sort((a, b) => a.exercise.localeCompare(b.exercise));
  };

  const filteredExercises = statistics?.allExerciseFrequency.filter(e => {
    const matchesSearch = e.exercise.toLowerCase().includes(exerciseSearch.toLowerCase());
    const exerciseCategory = exerciseCategories.get(e.exercise);
    const matchesCategory = selectedCategories.length === 0 ||
      (exerciseCategory && selectedCategories.includes(exerciseCategory));
    return matchesSearch && matchesCategory;
  }) || [];

  const filteredTopExercises = statistics?.exerciseFrequency.filter(e => {
    const exerciseCategory = exerciseCategories.get(e.exercise);
    return selectedCategories.length === 0 ||
      (exerciseCategory && selectedCategories.includes(exerciseCategory));
  }) || [];

  // Handler functions for components
  const handleTrackFormChange = (field: string, value: string) => {
    setTrackFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTimeframePeriodChange = (period: TimeframePeriod) => {
    scrollPositionRef.current = window.scrollY;
    setTimeframePeriod(period);
  };

  const handleOpenDateRangePicker = () => {
    const endDate = new Date(selectedMonth);
    const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - timeframePeriod + 1, 1);
    setTempStartMonth(startDate);
    setTempEndMonth(endDate);
    setStartYearInput(startDate.getFullYear().toString());
    setEndYearInput(endDate.getFullYear().toString());
    if (!dateRangeModalOpen && dateButtonRef.current) {
      const rect = dateButtonRef.current.getBoundingClientRect();
      setPickerPosition({ x: rect.left, y: rect.bottom + 8 });
    }
    setDateRangeModalOpen(true);
  };

  const handleDateRangeDragStart = (e: React.MouseEvent, rect: DOMRect) => {
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  };

  const handleDateRangeDragMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPickerPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleDateRangeDragEnd = () => {
    setIsDragging(false);
  };

  const handleDateRangeApply = (monthsDiff: number, daysDiff: number) => {
    if (daysDiff <= 7) setTimeframePeriod(0.25);
    else if (monthsDiff === 1) setTimeframePeriod(1);
    else if (monthsDiff === 3) setTimeframePeriod(3);
    else if (monthsDiff === 6) setTimeframePeriod(6);
    else if (monthsDiff === 12) setTimeframePeriod(12);
    else setTimeframePeriod(monthsDiff as TimeframePeriod);

    setSelectedMonth(tempEndMonth);
    setDateRangeModalOpen(false);
  };

  const handleDateRangeToday = () => {
    const today = new Date();
    const endMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startMonth = new Date(today.getFullYear(), today.getMonth() - timeframePeriod + 1, 1);
    setTempStartMonth(startMonth);
    setTempEndMonth(endMonth);
    setStartYearInput(startMonth.getFullYear().toString());
    setEndYearInput(endMonth.getFullYear().toString());
    setSelectedMonth(endMonth);
    setDateRangeModalOpen(false);
  };

  const handleStartYearBlur = () => {
    const year = parseInt(startYearInput);
    if (isNaN(year) || year < 2000 || year > 2099) {
      const currentYear = new Date().getFullYear();
      setStartYearInput(currentYear.toString());
      setTempStartMonth(new Date(currentYear, tempStartMonth.getMonth(), 1));
    } else {
      const newStartMonth = new Date(year, tempStartMonth.getMonth(), 1);
      if (newStartMonth > tempEndMonth) {
        setStartYearInput(tempStartMonth.getFullYear().toString());
      }
    }
  };

  const handleEndYearBlur = () => {
    const year = parseInt(endYearInput);
    if (isNaN(year) || year < 2000 || year > 2099) {
      const currentYear = new Date().getFullYear();
      setEndYearInput(currentYear.toString());
      setTempEndMonth(new Date(currentYear, tempEndMonth.getMonth(), 1));
    } else {
      const newEndMonth = new Date(year, tempEndMonth.getMonth(), 1);
      if (newEndMonth < tempStartMonth) {
        setEndYearInput(tempEndMonth.getFullYear().toString());
      }
    }
  };

  const handleClearFilters = () => {
    clearAllCategories();
    setShowUnusedOnly(false);
  };

  return (
    <div className='min-h-screen bg-gray-400'>
      {/* Header */}
      <header className='bg-[#208479] text-white p-4 shadow-md sticky top-0 z-40'>
        <div className='max-w-7xl mx-auto flex justify-between items-center'>
          <div className='flex items-center gap-4'>
            <button
              onClick={() => router.push('/coach')}
              className='hover:bg-[#1a6b62] p-2 rounded transition flex items-center gap-2'
            >
              <ArrowLeft size={20} />
              Back to Dashboard
            </button>
            <div className='flex items-center gap-2'>
              <BarChart3 size={24} />
              <h1 className='text-2xl font-bold'>Workout Analysis</h1>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className='px-4 py-2 bg-white text-[#208479] font-semibold rounded hover:bg-gray-300 transition'
          >
            Logout
          </button>
        </div>
      </header>

      <div className='max-w-7xl mx-auto p-6 space-y-6' style={{ minHeight: 'calc(100vh - 200px)' }}>
        <StatisticsSection
          loading={loading}
          statistics={statistics}
          timeframePeriod={timeframePeriod}
          onTimeframePeriodChange={handleTimeframePeriodChange}
          selectedMonth={selectedMonth}
          onChangeMonth={changeMonth}
          timeframeLabel={getTimeframeLabel()}
          dateButtonRef={dateButtonRef}
          onOpenDateRangePicker={handleOpenDateRangePicker}
          categories={categories}
          selectedCategories={selectedCategories}
          onToggleCategory={toggleCategory}
          showUnusedOnly={showUnusedOnly}
          onToggleUnusedOnly={() => setShowUnusedOnly(!showUnusedOnly)}
          onClearFilters={handleClearFilters}
          exerciseSearch={exerciseSearch}
          onExerciseSearchChange={setExerciseSearch}
          filteredExercises={filteredExercises}
          onExerciseSelect={handleExerciseSelect}
          onOpenLibrary={() => setLibraryOpen(true)}
          selectedExercises={selectedExercises}
          onRemoveExercise={removeExerciseSelection}
          onClearAllExercises={clearAllExerciseSelections}
          filteredTopExercises={filteredTopExercises}
        />

        {!loading && (
          <TrackManagementSection
            tracks={tracks}
            loading={loading}
            onAddTrack={() => openTrackModal()}
            onEditTrack={openTrackModal}
            onDeleteTrack={handleDeleteTrack}
          />
        )}
      </div>

      <TrackModal
        isOpen={trackModalOpen}
        onClose={() => setTrackModalOpen(false)}
        editingTrack={editingTrack}
        formData={trackFormData}
        onFormChange={handleTrackFormChange}
        onSave={handleSaveTrack}
      />

      <DateRangePicker
        isOpen={dateRangeModalOpen}
        onClose={() => setDateRangeModalOpen(false)}
        position={pickerPosition}
        tempStartMonth={tempStartMonth}
        tempEndMonth={tempEndMonth}
        onStartMonthChange={setTempStartMonth}
        onEndMonthChange={setTempEndMonth}
        startYearInput={startYearInput}
        endYearInput={endYearInput}
        onStartYearInputChange={setStartYearInput}
        onEndYearInputChange={setEndYearInput}
        onStartYearBlur={handleStartYearBlur}
        onEndYearBlur={handleEndYearBlur}
        timeframePeriod={timeframePeriod}
        onApply={handleDateRangeApply}
        onToday={handleDateRangeToday}
        isDragging={isDragging}
        dragOffset={dragOffset}
        onDragStart={handleDateRangeDragStart}
        onDragMove={handleDateRangeDragMove}
        onDragEnd={handleDateRangeDragEnd}
      />

      <ExerciseLibraryPanel
        isOpen={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        position={libraryPos}
        size={librarySize}
        exercises={getAllExercisesWithCounts()}
        onExerciseSelect={handleExerciseSelect}
        onPositionChange={setLibraryPos}
        onSizeChange={setLibrarySize}
      />
    </div>
  );
}
