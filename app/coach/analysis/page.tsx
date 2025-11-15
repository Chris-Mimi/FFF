'use client';

import { supabase } from '@/lib/supabase';
import { ArrowLeft, BarChart3, ChevronLeft, ChevronRight, Edit2, Library, Plus, Trash2, X } from 'lucide-react';
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

  // Update exercise count when statistics change and selected exercises change
  useEffect(() => {
    if (statistics && selectedExercises.length > 0) {
      // This effect is maintained for any future usage, but we'll handle counts per chip
    }
  }, [statistics, selectedExercises]);

  // Restore scroll position after statistics update
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

      // Build exercise set and category map from database
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

      // Calculate date range based on timeframe period
      let endDate: Date;
      let startDate: Date;

      if (timeframePeriod === 0.25) {
        // 1 Week - 7 day rolling window ending on selected date
        endDate = new Date(selectedMonth);
        startDate = new Date(selectedMonth);
        startDate.setDate(endDate.getDate() - 6); // 7 days total including end date
      } else {
        endDate = new Date(year, month + 1, 0); // Last day of selected month
        startDate = new Date(year, month - timeframePeriod + 1, 1); // First day of period (handles negative months)
      }

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('wods')
        .select('*')
        .gte('date', startDateStr)
        .lte('date', endDateStr);

      if (error) throw error;

      interface WODRecord {
        id: string;
        title: string;
        track_id: string | null;
        workout_type_id: string | null;
        date: string;
        sections: WODSection[];
      }

      const wods: WOD[] = (data || []).map((wod: WODRecord) => ({
        id: wod.id,
        title: wod.title,
        track_id: wod.track_id,
        workout_type_id: wod.workout_type_id,
        date: wod.date,
        sections: wod.sections,
      }));

      calculateStatistics(wods);
    } catch (error) {
      console.error('Error fetching monthly WODs:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const calculateStatistics = (wods: WOD[]) => {
    // Total workouts
    const totalWorkouts = wods.length;

    // Track breakdown
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

    // Workout type breakdown
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

    // Exercise frequency - extract from section content using proper parsing
    const exerciseCounts: Record<string, number> = {};

    // Words to exclude from movement names
    const excludeWords = new Set([
      'reps', 'rep', 'rounds', 'round', 'minutes', 'minute', 'min', 'mins',
      'seconds', 'second', 'sec', 'secs', 'meter', 'meters', 'calories', 'cal',
      'cals', 'each', 'side', 'total', 'amrap', 'emom', 'for', 'time', 'the',
      'and', 'or', 'of', 'in', 'at', 'to', 'a', 'an', 'with', 'without',
      'rx', 'scaled', 'beginner', 'intermediate', 'advanced'
    ]);

    const normalizeMovement = (movement: string): string => {
      // Split on spaces while preserving hyphens and parentheses
      return movement
        .split(/\s+/)
        .map(word => {
          // Keep exact case for words containing parentheses (e.g., "(PVC)", "(RX)")
          if (word.includes('(') || word.includes(')')) {
            return word;
          }
          // For hyphenated words, normalize each part separately (e.g., "Knees-to-Elbows")
          if (word.includes('-')) {
            return word.split('-').map(part =>
              part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            ).join('-');
          }
          // Title case for regular words
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ')
        .trim();
    };

    const findMatchingExercise = (movement: string): string | null => {
      // First try exact match
      if (exercises.has(movement)) {
        return movement;
      }

      // Try with hyphens instead of spaces (e.g., "Pass Throughs" -> "Pass-Throughs")
      const hyphenated = movement.replace(/\s+/g, '-');
      if (exercises.has(hyphenated)) {
        return hyphenated;
      }

      // Try singular/plural variations
      const singular = movement.endsWith('s') ? movement.slice(0, -1) : movement + 's';
      if (exercises.has(singular)) {
        return singular;
      }

      const singularHyphenated = hyphenated.endsWith('s') ? hyphenated.slice(0, -1) : hyphenated + 's';
      if (exercises.has(singularHyphenated)) {
        return singularHyphenated;
      }

      // Try without trailing 's' for words like "Thrusters" -> "Thruster"
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

      // Check if the movement contains any known exercise (e.g., "Barbell Deadlift" contains "Deadlift")
      const movementWords = movement.split(' ');
      for (const exercise of exercises) {
        const exerciseWords = exercise.replace(/-/g, ' ').split(' ');
        // If all words from the known exercise appear in the movement, it's a match
        if (exerciseWords.every(word => movementWords.includes(word))) {
          return exercise; // Return the database name
        }
      }

      return null;
    };

    const isValidMovementWord = (word: string): boolean => {
      const cleaned = word.toLowerCase();
      return !excludeWords.has(cleaned) && cleaned.length > 1 && !/^\d+$/.test(cleaned);
    };

    wods.forEach(wod => {
      wod.sections.forEach(section => {
        const lines = section.content.split('\n');

        lines.forEach(line => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return;

          // Pattern 1: Number + x + Movement (e.g., "10x Air Squats")
          const numberXPattern = /^(?:\d+[\s-]*x[\s-]*|[\d-]+[\s-]*x[\s-]*)([\w\s\-()]+?)(?:\s*[@\d]|$)/i;
          let match = trimmedLine.match(numberXPattern);

          // Pattern 2: Bullet/asterisk + Movement (e.g., "* Arm Circles")
          if (!match) {
            const bulletPattern = /^[\s*•\-]+\s*([\w\s\-()]+?)(?:\s*[@\d]|$)/;
            match = trimmedLine.match(bulletPattern);
          }

          // Pattern 3: Number + Movement (e.g., "10 Air Squats", "500m Row")
          if (!match) {
            const numberPattern = /^(?:\d+[a-z]*[\s-]*)([\w\s\-()]+?)(?:\s*[@\d]|$)/i;
            match = trimmedLine.match(numberPattern);
          }

          // Pattern 4: Rep scheme + Movement (e.g., "21-15-9 Thrusters")
          if (!match) {
            const repSchemePattern = /^(?:\d+-\d+(?:-\d+)*[\s-]*)([\w\s\-()]+?)(?:\s*[@\d]|$)/;
            match = trimmedLine.match(repSchemePattern);
          }

          if (match && match[1]) {
            let movementText = match[1].trim();
            movementText = movementText.replace(/[,;.!?]+$/, '');

            // Normalize the movement (keep parentheses - they're part of exercise names)
            const movement = normalizeMovement(movementText);

            const matchedExercise = findMatchingExercise(movement);
            if (matchedExercise) {
              exerciseCounts[matchedExercise] = (exerciseCounts[matchedExercise] || 0) + 1;
            }
          }
        });
      });
    });

    // ALL exercises sorted by count (for search dropdown)
    const allExerciseFrequency = Object.entries(exerciseCounts)
      .map(([exercise, count]) => ({ exercise, count }))
      .sort((a, b) => b.count - a.count);

    // Top 40 for display
    const exerciseFrequency = allExerciseFrequency.slice(0, 40);

    // WOD duration - sum all sections with type "WOD" and categorize
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

          // Categorize by duration range
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

    // Exercise counts are now handled per chip
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
        // Move by 7 days for week view
        if (direction === 'prev') {
          newDate.setDate(newDate.getDate() - 7);
        } else {
          newDate.setDate(newDate.getDate() + 7);
        }
      } else {
        // Move by month for other views
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
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();

    if (timeframePeriod === 0.25) {
      // 1 Week - show actual date range (7 day rolling window ending on selected date)
      const endDate = new Date(selectedMonth);
      const startDate = new Date(selectedMonth);
      startDate.setDate(endDate.getDate() - 6);

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
        // Update existing track
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
        // Create new track
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

  // Get all exercises from database with counts from current timeframe, filtered by category and unused status
  const getAllExercisesWithCounts = () => {
    const exerciseList: Array<{ exercise: string; count: number }> = [];

    exercises.forEach(exerciseName => {
      // Filter by selected categories if any
      const exerciseCategory = exerciseCategories.get(exerciseName);
      if (selectedCategories.length > 0 && (!exerciseCategory || !selectedCategories.includes(exerciseCategory))) {
        return; // Skip this exercise
      }

      const exerciseData = statistics?.allExerciseFrequency.find(e => e.exercise === exerciseName);
      const count = exerciseData?.count || 0;

      // Filter by unused status if enabled
      if (showUnusedOnly && count > 0) {
        return; // Skip exercises that have been used
      }

      exerciseList.push({
        exercise: exerciseName,
        count: count
      });
    });

    // Sort by name
    return exerciseList.sort((a, b) => a.exercise.localeCompare(b.exercise));
  };

  // Filter exercises based on search AND selected categories
  const filteredExercises = statistics?.allExerciseFrequency.filter(e => {
    const matchesSearch = e.exercise.toLowerCase().includes(exerciseSearch.toLowerCase());
    // If no categories selected, show all; otherwise check if exercise matches selected categories
    const exerciseCategory = exerciseCategories.get(e.exercise);
    const matchesCategory = selectedCategories.length === 0 ||
      (exerciseCategory && selectedCategories.includes(exerciseCategory));
    return matchesSearch && matchesCategory;
  }) || [];

  // Filter Top 40 exercises by selected categories
  const filteredTopExercises = statistics?.exerciseFrequency.filter(e => {
    const exerciseCategory = exerciseCategories.get(e.exercise);
    return selectedCategories.length === 0 ||
      (exerciseCategory && selectedCategories.includes(exerciseCategory));
  }) || [];

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
        {/* Monthly Statistics Section */}
        <div className='bg-gray-600 rounded-xl shadow-xl p-8'>
          <div className='flex justify-between items-center mb-6'>
            <h2 className='text-xl font-bold text-gray-100'>Statistics</h2>
            <div className='flex items-center gap-6'>
              {/* Timeframe Period Selector */}
              <div className='flex items-center gap-2 bg-gray-100 rounded-lg p-1'>
                {([0.25, 1, 3, 6, 12] as TimeframePeriod[]).map(period => (
                  <button
                    key={period}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollPositionRef.current = window.scrollY;
                      setTimeframePeriod(period);
                    }}
                    className={`px-3 py-1.5 rounded-md font-semibold text-sm transition ${
                      timeframePeriod === period
                        ? 'bg-[#208479] text-white'
                        : 'text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {period === 0.25 ? '1 Week' : period === 1 ? '1 Month' : `${period} Months`}
                  </button>
                ))}
              </div>

              {/* Month Navigation */}
              <div className='flex items-center gap-4'>
                <button
                  onClick={() => changeMonth('prev')}
                  className='p-2 hover:bg-gray-400 rounded-lg transition'
                >
                  <ChevronLeft size={20} className='text-gray-100' />
                </button>
                <button
                  ref={dateButtonRef}
                  onClick={() => {
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
                  }}
                  className='text-lg font-semibold text-gray-100 min-w-[200px] text-center hover:bg-gray-400 px-4 py-2 rounded-lg transition border border-transparent hover:border-gray-500'
                >
                  {getTimeframeLabel()}
                </button>
                <button
                  onClick={() => changeMonth('next')}
                  className='p-2 hover:bg-gray-400 rounded-lg transition'
                >
                  <ChevronRight size={20} className='text-gray-100' />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className='text-center py-12 text-gray-500' style={{ minHeight: '400px' }}>
              <p>Loading...</p>
            </div>
          ) : statistics ? (
            <div className='space-y-6'>
              {/* Summary Cards with Duration Distribution */}
              <div className='flex gap-6 items-start'>
                {/* Summary Cards */}
                <div className='flex gap-4'>
                  <div className='bg-gradient-to-br from-[#208479] to-[#1a6b62] text-white rounded-lg p-4 flex items-center gap-3'>
                    <div>
                      <div className='text-xs font-semibold opacity-90'>Total Workouts</div>
                      <div className='text-2xl font-bold'>{statistics.totalWorkouts}</div>
                    </div>
                  </div>
                  <div className='bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4 flex items-center gap-3'>
                    <div>
                      <div className='text-xs font-semibold opacity-90'>Avg WOD Duration</div>
                      <div className='text-2xl font-bold'>
                        {statistics.averageWODDuration}
                        <span className='text-base ml-1'>min</span>
                      </div>
                    </div>
                  </div>
                  <div className='bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-lg p-4 flex items-center gap-3'>
                    <div>
                      <div className='text-xs font-semibold opacity-90'>Total WOD Time</div>
                      <div className='text-2xl font-bold'>
                        {statistics.totalWODDuration}
                        <span className='text-base ml-1'>min</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* WOD Duration Distribution - Compact */}
                <div className='flex-1'>
                  <h3 className='text-sm font-bold text-gray-100 mb-2'>WOD Duration Distribution</h3>
                  <div className='flex gap-2 flex-wrap'>
                    {statistics.durationBreakdown.map((duration, idx) => (
                      <div
                        key={idx}
                        className='bg-gray-50 rounded-lg p-2 text-center border border-gray-200 min-w-[80px]'
                      >
                        <div className='text-lg font-bold text-[#208479]'>{duration.count}</div>
                        <div className='text-[10px] text-gray-700 font-medium'>{duration.range}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Exercise Search */}
              <div className='bg-gray-700 border border-gray-500 rounded-lg p-6'>
                <h3 className='text-lg font-bold text-gray-100 mb-4'>Exercise/Movement Search</h3>

                {/* Category Filter Chips */}
                {categories.length > 0 && (
                  <div className='mb-4'>
                    <div className='flex items-center gap-2 mb-2'>
                      <span className='text-sm font-medium text-gray-100'>Filter by Category:</span>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      {categories.map(category => (
                        <button
                          key={category}
                          onClick={() => toggleCategory(category)}
                          className={`px-3 py-1.5 text-sm rounded-full font-medium transition ${
                            selectedCategories.includes(category)
                              ? 'bg-[#208479] text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                      <button
                        onClick={() => setShowUnusedOnly(!showUnusedOnly)}
                        className={`px-3 py-1.5 text-sm rounded-full font-medium transition border-2 ${
                          showUnusedOnly
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-white text-orange-600 border-orange-500 hover:bg-orange-50'
                        }`}
                      >
                        Unused
                      </button>
                      {(selectedCategories.length > 0 || showUnusedOnly) && (
                        <button
                          onClick={() => {
                            clearAllCategories();
                            setShowUnusedOnly(false);
                          }}
                          className='px-3 py-1.5 text-sm rounded-full bg-red-100 text-red-700 hover:bg-red-200 font-medium transition'
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Search Input with Browse Library Button */}
                <div className='flex gap-2 items-start'>
                  <div className='flex-1 relative'>
                    <input
                      type='text'
                      value={exerciseSearch}
                      onChange={(e) => setExerciseSearch(e.target.value)}
                      placeholder='Search for an exercise or movement...'
                      autoComplete='off'
                      readOnly
                      onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
                      className='w-full px-4 py-3 border border-gray-400 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-50'
                    />

                  {/* Dropdown Results */}
                  {exerciseSearch && filteredExercises.length > 0 && (
                    <div className='absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                      {filteredExercises.slice(0, 20).map((exercise, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleExerciseSelect(exercise.exercise)}
                          className='w-full px-4 py-3 text-left hover:bg-gray-300 flex justify-between items-center border-b border-gray-100 last:border-b-0'
                        >
                          <span className='text-gray-900 font-medium'>{exercise.exercise}</span>
                          <span className='text-[#208479] font-bold text-sm'>{exercise.count}x</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {exerciseSearch && filteredExercises.length === 0 && (
                    <div className='absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-100'>
                      No exercises found matching "{exerciseSearch}"
                    </div>
                  )}
                  </div>

                  {/* Browse Library Button */}
                  <button
                    onClick={() => setLibraryOpen(true)}
                    className='flex items-center gap-2 px-4 py-3 bg-[#208479] hover:bg-[#1a6b62] text-white rounded-lg font-medium transition whitespace-nowrap'
                  >
                    <Library size={20} />
                    Browse Library
                  </button>
                </div>

                {/* Selected Exercises as Chips */}
                {selectedExercises.length > 0 && (
                  <div className='mt-4'>
                    <div className='flex flex-wrap gap-2'>
                      {selectedExercises.map(exercise => {
                        const count = statistics?.allExerciseFrequency.find(e => e.exercise === exercise)?.count || 0;
                        return (
                          <span
                            key={exercise}
                            className='inline-flex items-center gap-1 px-3 py-2 bg-[#208479] text-white text-sm rounded-full'
                          >
                            <span className='font-medium'>{exercise}</span>
                            <span className='text-xs opacity-90'>({count}x)</span>
                            <button
                              onClick={() => removeExerciseSelection(exercise)}
                              className='hover:bg-[#1a6b62] rounded-full p-0.5 ml-1'
                            >
                              <X size={14} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                    <div className='mt-3 flex gap-2'>
                      <button
                        onClick={clearAllExerciseSelections}
                        className='px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg text-sm transition'
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                )}

                {!exerciseSearch && selectedExercises.length === 0 && (
                  <p className='text-sm text-gray-300 mt-3'>
                    Start typing to search through all exercises in the selected timeframe
                  </p>
                )}
              </div>

              {/* Track Breakdown */}
              {statistics.trackBreakdown.length > 0 && (
                <div>
                  <h3 className='text-lg font-bold text-gray-100 mb-3'>Workouts by Track</h3>
                  <div className='space-y-2'>
                    {statistics.trackBreakdown.map(track => (
                      <div key={track.trackId} className='flex items-center gap-3'>
                        <div
                          className='w-4 h-4 rounded-full flex-shrink-0'
                          style={{ backgroundColor: track.color }}
                        />
                        <div className='flex-1 flex items-center gap-3'>
                          <span className='text-gray-100 font-medium min-w-[150px]'>
                            {track.trackName}
                          </span>
                          <div className='flex-1 bg-gray-200 rounded-full h-6 relative'>
                            <div
                              className='h-6 rounded-full transition-all'
                              style={{
                                width: `${(track.count / statistics.totalWorkouts) * 100}%`,
                                backgroundColor: track.color,
                              }}
                            />
                            <span className='absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-700'>
                              {track.count}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Workout Type Breakdown */}
              {statistics.typeBreakdown.length > 0 && (
                <div>
                  <h3 className='text-lg font-bold text-gray-100 mb-3'>Workouts by Type</h3>
                  <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
                    {statistics.typeBreakdown.map(type => (
                      <div
                        key={type.typeId}
                        className='bg-gray-50 rounded-lg p-4 text-center border border-gray-200'
                      >
                        <div className='text-2xl font-bold text-[#208479]'>{type.count}</div>
                        <div className='text-sm text-gray-700 font-medium mt-1'>
                          {type.typeName}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Exercise Frequency */}
              {filteredTopExercises.length > 0 && (
                <div>
                  <h3 className='text-lg font-bold text-gray-100 mb-3'>
                    Top Exercises{selectedCategories.length > 0 && ` (${selectedCategories.join(', ')})`}
                  </h3>
                  <div className='flex flex-wrap gap-2'>
                    {filteredTopExercises.map((exercise, idx) => (
                      <span
                        key={idx}
                        className='inline-flex items-center px-3 py-2 bg-gray-100 text-gray-900 border-2 border-[#208479] text-sm rounded-full font-medium'
                      >
                        {exercise.exercise} ({exercise.count}x)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {statistics.totalWorkouts === 0 && (
                <div className='text-center py-12 text-gray-500'>
                  <BarChart3 size={48} className='mx-auto mb-4 text-gray-300' />
                  <p className='text-lg'>No workouts found for this month</p>
                  <p className='text-sm mt-2'>
                    Create some workouts on the dashboard to see statistics here.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className='text-center py-12 text-gray-500'>
              <BarChart3 size={48} className='mx-auto mb-4 text-gray-300' />
              <p className='text-lg'>No data available</p>
            </div>
          )}
        </div>

        {/* Track Management Section */}
        {!loading && (
          <div className='bg-gray-600 rounded-lg shadow p-5'>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-lg font-bold text-gray-100'>Manage Tracks</h2>
            <button
              onClick={() => openTrackModal()}
              className='px-3 py-1.5 bg-[#208479] hover:bg-[#1a6b62] text-white font-semibold rounded-lg flex items-center gap-2 transition text-sm'
            >
              <Plus size={16} />
              Add Track
            </button>
          </div>

          {loading ? (
            <p className='text-gray-500 text-sm'>Loading...</p>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3'>
              {tracks.map(track => (
                <div
                  key={track.id}
                  className='border border-gray-300 bg-gray-200 rounded-lg p-3 hover:shadow-md transition'
                >
                  <div className='flex items-start justify-between mb-1'>
                    <div className='flex items-center gap-2'>
                      <div
                        className='w-3 h-3 rounded-full'
                        style={{ backgroundColor: track.color || '#208479' }}
                      />
                      <h3 className='font-bold text-gray-700 text-sm'>{track.name}</h3>
                    </div>
                    <div className='flex gap-1'>
                      <button
                        onClick={() => openTrackModal(track)}
                        className='text-[#208479] hover:text-[#1a6b62] p-1'
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteTrack(track.id)}
                        className='text-gray-600 hover:text-red-500 p-1'
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {track.description && (
                    <p className='text-xs text-gray-600'>{track.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        )}
      </div>

      {/* Track Modal */}
      {trackModalOpen && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-lg shadow-2xl w-full max-w-md'>
            <div className='bg-[#208479] text-white p-4 rounded-t-lg'>
              <h3 className='text-xl font-bold'>{editingTrack ? 'Edit Track' : 'Add New Track'}</h3>
            </div>

            <div className='p-6 space-y-4'>
              <div>
                <label className='block text-sm font-semibold mb-2 text-gray-900'>
                  Track Name <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  value={trackFormData.name}
                  onChange={e => setTrackFormData({ ...trackFormData, name: e.target.value })}
                  placeholder='e.g., Strength Focus'
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
                />
              </div>

              <div>
                <label className='block text-sm font-semibold mb-2 text-gray-900'>
                  Description
                </label>
                <textarea
                  value={trackFormData.description}
                  onChange={e =>
                    setTrackFormData({ ...trackFormData, description: e.target.value })
                  }
                  placeholder='Brief description of this track...'
                  rows={3}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
                />
              </div>

              <div>
                <label className='block text-sm font-semibold mb-2 text-gray-900'>Color</label>
                <input
                  type='color'
                  value={trackFormData.color}
                  onChange={e => setTrackFormData({ ...trackFormData, color: e.target.value })}
                  className='w-full h-12 border border-gray-300 rounded-lg cursor-pointer'
                />
              </div>
            </div>

            <div className='flex gap-3 p-6 border-t'>
              <button
                onClick={() => setTrackModalOpen(false)}
                className='flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition'
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTrack}
                disabled={!trackFormData.name.trim()}
                className='flex-1 px-6 py-3 bg-[#208479] hover:bg-[#1a6b62] text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {editingTrack ? 'Save Changes' : 'Add Track'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date Range Picker Popover */}
      {dateRangeModalOpen && (
        <div
          className='fixed bg-white rounded-lg shadow-2xl w-80 border-2 border-[#208479] z-50'
          style={{
            top: `${pickerPosition.y}px`,
            left: `${pickerPosition.x}px`,
            cursor: isDragging ? 'grabbing' : 'default'
          }}
          onMouseMove={(e) => {
            if (isDragging) {
              setPickerPosition({
                x: e.clientX - dragOffset.x,
                y: e.clientY - dragOffset.y
              });
            }
          }}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
        >
          <div
            className='bg-[#208479] text-white px-4 py-2 rounded-t-lg flex justify-between items-center cursor-grab active:cursor-grabbing'
            onMouseDown={(e) => {
              const rect = e.currentTarget.parentElement!.getBoundingClientRect();
              setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
              });
              setIsDragging(true);
            }}
          >
            <h3 className='text-sm font-bold'>Select Date Range</h3>
            <button
              onClick={() => setDateRangeModalOpen(false)}
              className='hover:bg-[#1a6b62] rounded p-1 transition'
            >
              <X size={16} />
            </button>
          </div>

            <div className='p-4 space-y-3'>
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-2'>From</label>
                <div className='flex gap-2'>
                  <select
                    value={tempStartMonth.getMonth()}
                    onChange={(e) => {
                      const newStartMonth = new Date(tempStartMonth.getFullYear(), parseInt(e.target.value), 1);
                      if (newStartMonth <= tempEndMonth) {
                        setTempStartMonth(newStartMonth);
                      }
                    }}
                    className='flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#208479] focus:border-transparent text-sm text-gray-900 bg-white'
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, idx) => (
                      <option key={idx} value={idx}>{month}</option>
                    ))}
                  </select>
                  <input
                    type='number'
                    value={startYearInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setStartYearInput(value);
                      const year = parseInt(value);
                      if (!isNaN(year) && year >= 2000 && year <= 2099) {
                        const newStartMonth = new Date(year, tempStartMonth.getMonth(), 1);
                        if (newStartMonth <= tempEndMonth) {
                          setTempStartMonth(newStartMonth);
                        }
                      }
                    }}
                    onBlur={() => {
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
                    }}
                    className='w-24 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#208479] focus:border-transparent text-sm text-gray-900 bg-white'
                    placeholder='YYYY'
                    min='2000'
                    max='2099'
                  />
                </div>
              </div>

              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-2'>To</label>
                <div className='flex gap-2'>
                  <select
                    value={tempEndMonth.getMonth()}
                    onChange={(e) => {
                      const newEndMonth = new Date(tempEndMonth.getFullYear(), parseInt(e.target.value), 1);
                      if (newEndMonth >= tempStartMonth) {
                        setTempEndMonth(newEndMonth);
                      }
                    }}
                    className='flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#208479] focus:border-transparent text-sm text-gray-900 bg-white'
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, idx) => (
                      <option key={idx} value={idx}>{month}</option>
                    ))}
                  </select>
                  <input
                    type='number'
                    value={endYearInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEndYearInput(value);
                      const year = parseInt(value);
                      if (!isNaN(year) && year >= 2000 && year <= 2099) {
                        const newEndMonth = new Date(year, tempEndMonth.getMonth(), 1);
                        if (newEndMonth >= tempStartMonth) {
                          setTempEndMonth(newEndMonth);
                        }
                      }
                    }}
                    onBlur={() => {
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
                    }}
                    className='w-24 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#208479] focus:border-transparent text-sm text-gray-900 bg-white'
                    placeholder='YYYY'
                    min='2000'
                    max='2099'
                  />
                </div>
              </div>
            </div>

            <div className='p-3 border-t bg-gray-50 rounded-b-lg space-y-2'>
              <button
                onClick={() => {
                  const today = new Date();
                  const endMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                  const startMonth = new Date(today.getFullYear(), today.getMonth() - timeframePeriod + 1, 1);
                  setTempStartMonth(startMonth);
                  setTempEndMonth(endMonth);
                  setStartYearInput(startMonth.getFullYear().toString());
                  setEndYearInput(endMonth.getFullYear().toString());
                  setSelectedMonth(endMonth);
                }}
                className='w-full px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded transition'
              >
                Today
              </button>
              <div className='flex gap-2'>
                <button
                  onClick={() => setDateRangeModalOpen(false)}
                  className='flex-1 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm font-semibold rounded hover:bg-white transition'
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Calculate the period and set selectedMonth to the end month
                    const timeDiff = tempEndMonth.getTime() - tempStartMonth.getTime();
                    const daysDiff = Math.round(timeDiff / (1000 * 60 * 60 * 24)) + 1;
                    const monthsDiff = (tempEndMonth.getFullYear() - tempStartMonth.getFullYear()) * 12 +
                                      (tempEndMonth.getMonth() - tempStartMonth.getMonth()) + 1;

                    // Find closest timeframe period
                    if (daysDiff <= 7) setTimeframePeriod(0.25);
                    else if (monthsDiff === 1) setTimeframePeriod(1);
                    else if (monthsDiff === 3) setTimeframePeriod(3);
                    else if (monthsDiff === 6) setTimeframePeriod(6);
                    else if (monthsDiff === 12) setTimeframePeriod(12);
                    else setTimeframePeriod(monthsDiff as TimeframePeriod);

                    setSelectedMonth(tempEndMonth);
                  }}
                  className='flex-1 px-3 py-1.5 bg-[#208479] hover:bg-[#1a6b62] text-white text-sm font-semibold rounded transition'
                >
                  Apply
                </button>
              </div>
            </div>
        </div>
      )}

      {/* Exercise Library Panel */}
      {libraryOpen && (
        <div
          className='fixed bg-white rounded-lg shadow-2xl border-2 border-[#208479] flex flex-col z-50'
          style={{
            top: `${libraryPos.top}px`,
            left: `${libraryPos.left}px`,
            width: `${librarySize.width}px`,
            height: `${librarySize.height}px`,
          }}
        >
          {/* Header - Draggable */}
          <div
            className='bg-[#208479] text-white p-3 rounded-t-lg cursor-move flex justify-between items-center'
            onMouseDown={(e) => {
              const startX = e.clientX - libraryPos.left;
              const startY = e.clientY - libraryPos.top;

              const handleMouseMove = (moveEvent: MouseEvent) => {
                setLibraryPos({
                  left: moveEvent.clientX - startX,
                  top: moveEvent.clientY - startY,
                });
              };

              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          >
            <h3 className='font-bold flex items-center gap-2'>
              <Library size={20} />
              Exercise Library
            </h3>
            <button
              onClick={() => setLibraryOpen(false)}
              className='hover:bg-[#1a6b62] p-1 rounded transition'
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className='flex-1 overflow-auto p-4'>
            <div
              className='grid gap-2'
              style={{
                gridTemplateColumns: `repeat(${Math.max(2, Math.floor(librarySize.width / 200))}, minmax(0, 1fr))`
              }}
            >
              {getAllExercisesWithCounts().map((exercise, idx) => (
                <button
                  key={idx}
                  onClick={() => handleExerciseSelect(exercise.exercise)}
                  className='text-left px-3 py-2 border border-gray-300 rounded-lg hover:bg-[#208479] hover:text-white transition group'
                >
                  <div className='font-medium text-gray-900 group-hover:text-white'>{exercise.exercise}</div>
                  <div className='text-xs text-gray-600 group-hover:text-white'>
                    {exercise.count > 0 ? `${exercise.count}x` : 'Not used yet'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Resize Handle */}
          <div
            className='absolute bottom-0 right-0 w-4 h-4 cursor-se-resize'
            onMouseDown={(e) => {
              e.stopPropagation();
              const startX = e.clientX;
              const startY = e.clientY;
              const startWidth = librarySize.width;
              const startHeight = librarySize.height;

              const handleMouseMove = (moveEvent: MouseEvent) => {
                setLibrarySize({
                  width: Math.max(400, startWidth + (moveEvent.clientX - startX)),
                  height: Math.max(300, startHeight + (moveEvent.clientY - startY)),
                });
              };

              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          >
            <div className='absolute bottom-1 right-1 w-0 h-0 border-l-8 border-l-transparent border-b-8 border-b-gray-400' />
          </div>
        </div>
      )}
    </div>
  );
}
