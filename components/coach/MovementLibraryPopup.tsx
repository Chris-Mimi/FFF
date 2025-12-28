'use client';

import { useRecentExercises } from '@/lib/exercise-storage';
import { supabase } from '@/lib/supabase';
import type { BarbellLift, Benchmark, ForgeBenchmark } from '@/types/movements';
import { useUserFavorites } from '@/utils/exercise-favorites';
import { ChevronDown, ChevronRight, Library, Search, Star, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import ExerciseVideoModal from './ExerciseVideoModal';
import ExerciseFormModal from './ExerciseFormModal';
import MultiSelectDropdown from './MultiSelectDropdown';

interface Exercise {
  id: string;
  name: string;
  display_name?: string;
  category: string;
  subcategory?: string;
  description: string | null;
  video_url: string | null;
  tags: string[] | null;
  equipment?: string[] | null;
  body_parts?: string[] | null;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  is_warmup?: boolean;
  is_stretch?: boolean;
  search_terms?: string;
}

type TabType = 'exercises' | 'lifts' | 'benchmarks' | 'forge';

// Define category ordering (workout flow)
const EXERCISE_CATEGORY_ORDER = [
  'Warm-up & Mobility',
  'Olympic Lifting & Barbell Movements',
  'Compound Exercises',
  'Gymnastics & Bodyweight',
  'Core, Abs & Isometric Holds',
  'Cardio & Conditioning',
  'Specialty',
  'Recovery & Stretching',
];

const LIFT_CATEGORY_ORDER = [
  'Olympic',
  'Squat',
  'Press',
  'Pull',
];

// Sort categories by predefined order
const sortCategories = <T,>(
  grouped: Record<string, T[]>,
  categoryOrder: string[]
): [string, T[]][] => {
  return Object.entries(grouped).sort(([catA], [catB]) => {
    const indexA = categoryOrder.indexOf(catA);
    const indexB = categoryOrder.indexOf(catB);
    // If category not in order array, put at end
    if (indexA === -1 && indexB === -1) return catA.localeCompare(catB);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
};

interface MovementLibraryPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: string) => void;
  onSelectLift: (lift: BarbellLift) => void;
  onSelectBenchmark: (benchmark: Benchmark) => void;
  onSelectForgeBenchmark: (forge: ForgeBenchmark) => void;
}

// Movement Library Popup Component
function MovementLibraryPopup({
  isOpen,
  onClose: parentOnClose,
  onSelectExercise,
  onSelectLift,
  onSelectBenchmark,
  onSelectForgeBenchmark,
}: MovementLibraryPopupProps) {
  const onClose = parentOnClose;
  const [activeTab, setActiveTab] = useState<TabType>('exercises');
  const [searchTerm, setSearchTerm] = useState('');

  // Data states
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [lifts, setLifts] = useState<BarbellLift[]>([]);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [forgeBenchmarks, setForgeBenchmarks] = useState<ForgeBenchmark[]>([]);

  // Filter states (exercises tab only)
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [selectedBodyParts, setSelectedBodyParts] = useState<string[]>([]);
  const [availableEquipment, setAvailableEquipment] = useState<string[]>([]);
  const [availableBodyParts, setAvailableBodyParts] = useState<string[]>([]);

  // Video modal state
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState('');
  const [selectedVideoName, setSelectedVideoName] = useState('');

  // Create modals state
  const [showCreateBenchmarkModal, setShowCreateBenchmarkModal] = useState(false);
  const [showCreateForgeModal, setShowCreateForgeModal] = useState(false);
  const [showCreateLiftModal, setShowCreateLiftModal] = useState(false);
  const [showCreateExerciseModal, setShowCreateExerciseModal] = useState(false);

  // Form states for creating new items
  const [benchmarkForm, setBenchmarkForm] = useState({ name: '', type: 'For Time', description: '', has_scaling: true });
  const [forgeForm, setForgeForm] = useState({ name: '', type: 'For Time', description: '', has_scaling: true });
  const [liftForm, setLiftForm] = useState({ name: '', category: 'Olympic' });
  const [workoutTypes, setWorkoutTypes] = useState<Array<{ id: string; name: string }>>([]);

  // Favorites and Recently Used hooks
  const { favorites, favoriteIds, isFavorited, toggleFavorite } = useUserFavorites();
  const { recentExercises, addRecent } = useRecentExercises();

  // Collapsible sections state
  const [favoritesCollapsed, setFavoritesCollapsed] = useState(false);
  const [recentCollapsed, setRecentCollapsed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [hasFetchedExercises, setHasFetchedExercises] = useState(false);
  const [hasFetchedLifts, setHasFetchedLifts] = useState(false);
  const [hasFetchedBenchmarks, setHasFetchedBenchmarks] = useState(false);
  const [hasFetchedForge, setHasFetchedForge] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Position and size state for draggable/resizable modal
  const [librarySize, setLibrarySize] = useState({ width: 950, height: 850 });
  const [libraryPos, setLibraryPos] = useState({ top: 70, left: 770 }); // Position to right of WorkoutModal
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, top: 0, left: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Handle drag
  const handleLibraryDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      top: libraryPos.top,
      left: libraryPos.left,
    });
  };

  // Handle resize (bottom-right corner only)
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: librarySize.width,
      height: librarySize.height,
    });
  };

  // Drag and resize effects
  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        setLibraryPos({
          top: Math.max(0, dragStart.top + deltaY),
          left: Math.max(0, dragStart.left + deltaX),
        });
      };
      const handleMouseUp = () => setIsDragging(false);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }

    if (isResizing) {
      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;

        const newWidth = Math.max(600, Math.min(1400, resizeStart.width + deltaX));
        const newHeight = Math.max(400, Math.min(900, resizeStart.height + deltaY));

        setLibrarySize({ width: newWidth, height: newHeight });
      };
      const handleMouseUp = () => setIsResizing(false);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart]);

  // Fetch data based on active tab
  useEffect(() => {
    if (!isOpen) return;

    switch (activeTab) {
      case 'exercises':
        if (!hasFetchedExercises) fetchExercises();
        break;
      case 'lifts':
        if (!hasFetchedLifts) fetchLifts();
        break;
      case 'benchmarks':
        if (!hasFetchedBenchmarks) fetchBenchmarks();
        break;
      case 'forge':
        if (!hasFetchedForge) fetchForgeBenchmarks();
        break;
    }
  }, [isOpen, activeTab, hasFetchedExercises, hasFetchedLifts, hasFetchedBenchmarks, hasFetchedForge]);

  // Reset filters when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedEquipment([]);
      setSelectedBodyParts([]);
      setSearchTerm('');
    }
  }, [isOpen]);

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('exercises').select('*').order('name');
      if (error) throw error;
      setExercises(data || []);
      setHasFetchedExercises(true);
      // Fetch distinct filter values after exercises loaded
      fetchDistinctFilters(data || []);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDistinctFilters = (exercisesData: Exercise[]) => {
    // Extract distinct equipment values
    const equipmentSet = new Set<string>();
    exercisesData.forEach((ex) => {
      ex.equipment?.forEach((eq) => {
        if (eq) equipmentSet.add(eq);
      });
    });
    const uniqueEquipment = Array.from(equipmentSet).sort();
    setAvailableEquipment(uniqueEquipment);

    // Extract distinct body_parts values
    const bodyPartsSet = new Set<string>();
    exercisesData.forEach((ex) => {
      ex.body_parts?.forEach((bp) => {
        if (bp) bodyPartsSet.add(bp);
      });
    });
    const uniqueBodyParts = Array.from(bodyPartsSet).sort();
    setAvailableBodyParts(uniqueBodyParts);
  };

  const fetchLifts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('barbell_lifts')
        .select('*')
        .order('display_order');
      if (error) throw error;
      setLifts(data || []);
      setHasFetchedLifts(true);
    } catch (error) {
      console.error('Error fetching lifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBenchmarks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('benchmark_workouts')
        .select('*')
        .order('name');
      if (error) throw error;
      setBenchmarks(data || []);
      setHasFetchedBenchmarks(true);
    } catch (error) {
      console.error('Error fetching benchmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchForgeBenchmarks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('forge_benchmarks')
        .select('*')
        .order('display_order');
      if (error) throw error;
      setForgeBenchmarks(data || []);
      setHasFetchedForge(true);
    } catch (error) {
      console.error('Error fetching forge benchmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch workout types
  const fetchWorkoutTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('workout_types')
        .select('id, name')
        .order('name');
      if (error) throw error;
      setWorkoutTypes(data || []);
    } catch (error) {
      console.error('Error fetching workout types:', error);
    }
  };

  // Create handlers
  const handleCreateBenchmark = async () => {
    try {
      // Get the highest display_order from database
      const { data: existing } = await supabase
        .from('benchmark_workouts')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);

      const maxOrder = existing && existing.length > 0 ? existing[0].display_order : 0;

      const { error } = await supabase
        .from('benchmark_workouts')
        .insert({
          name: benchmarkForm.name,
          type: benchmarkForm.type,
          description: benchmarkForm.description || null,
          has_scaling: benchmarkForm.has_scaling,
          display_order: maxOrder + 1
        });
      if (error) throw error;

      setShowCreateBenchmarkModal(false);
      setBenchmarkForm({ name: '', type: 'For Time', description: '', has_scaling: true });
      await fetchBenchmarks();
    } catch (error: unknown) {
      console.error('Error creating benchmark:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCreateForgeBenchmark = async () => {
    // Validate required fields
    if (!forgeForm.name.trim()) {
      alert('Please enter a name for the Forge Benchmark');
      return;
    }

    try {
      // Get the highest display_order from database
      const { data: existing } = await supabase
        .from('forge_benchmarks')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);

      const maxOrder = existing && existing.length > 0 ? existing[0].display_order : 0;

      const { data, error } = await supabase
        .from('forge_benchmarks')
        .insert({
          name: forgeForm.name.trim(),
          type: forgeForm.type,
          description: forgeForm.description || null,
          has_scaling: forgeForm.has_scaling,
          display_order: maxOrder + 1
        })
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Created forge benchmark:', data);
      alert('Forge Benchmark created successfully!');

      setShowCreateForgeModal(false);
      setForgeForm({ name: '', type: 'For Time', description: '', has_scaling: true });
      await fetchForgeBenchmarks();
    } catch (error: unknown) {
      console.error('Error creating forge benchmark:', error);
      alert(`Error creating Forge Benchmark: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCreateLift = async () => {
    try {
      // Get the highest display_order from database
      const { data: existing } = await supabase
        .from('barbell_lifts')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);

      const maxOrder = existing && existing.length > 0 ? existing[0].display_order : 0;

      const { error } = await supabase
        .from('barbell_lifts')
        .insert({
          name: liftForm.name,
          category: liftForm.category,
          display_order: maxOrder + 1
        });
      if (error) throw error;

      setShowCreateLiftModal(false);
      setLiftForm({ name: '', category: 'Olympic' });
      await fetchLifts();
    } catch (error: unknown) {
      console.error('Error creating lift:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCreateExercise = async (exerciseData: Omit<Exercise, 'id'> & { id?: string }) => {
    try {
      const { error } = await supabase
        .from('exercises')
        .insert(exerciseData);

      if (error) throw error;

      setShowCreateExerciseModal(false);
      await fetchExercises();
    } catch (error: unknown) {
      console.error('Error creating exercise:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Video modal handlers
  const openVideoModal = (videoUrl: string, exerciseName: string) => {
    setSelectedVideoUrl(videoUrl);
    setSelectedVideoName(exerciseName);
    setVideoModalOpen(true);
  };

  const closeVideoModal = () => {
    setVideoModalOpen(false);
    setSelectedVideoUrl('');
    setSelectedVideoName('');
  };

  // Fetch workout types when needed for create modals
  useEffect(() => {
    if (showCreateBenchmarkModal || showCreateForgeModal) {
      fetchWorkoutTypes();
    }
  }, [showCreateBenchmarkModal, showCreateForgeModal]);

  useEffect(() => {
    if (isOpen) {
      // Clear search and focus input when opening
      setSearchTerm('');
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    } else {
      // Clear search and reset filters when closing
      setSearchTerm('');
      setSelectedEquipment([]);
      setSelectedBodyParts([]);
    }
  }, [isOpen]);

  // Filter exercises by category - memoized
  // Applies equipment/body_parts filters (OR within groups, AND between groups) then search filter
  const filteredExerciseCategories = useMemo(() => {
    // Step 1: Apply equipment and body_parts filters
    let filteredExercises = exercises;

    // Apply equipment filter (OR within: barbell OR dumbbell)
    if (selectedEquipment.length > 0) {
      filteredExercises = filteredExercises.filter(exercise =>
        selectedEquipment.some(eq => exercise.equipment?.includes(eq))
      );
    }

    // Apply body_parts filter (OR within: legs OR shoulders)
    if (selectedBodyParts.length > 0) {
      filteredExercises = filteredExercises.filter(exercise =>
        selectedBodyParts.some(bp => exercise.body_parts?.includes(bp))
      );
    }

    // Step 2: Apply search filter
    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch) {
      const searchLower = trimmedSearch.toLowerCase();
      filteredExercises = filteredExercises.filter(
        exercise =>
          exercise.name.toLowerCase().includes(searchLower) ||
          (exercise.display_name && exercise.display_name.toLowerCase().includes(searchLower)) ||
          exercise.category.toLowerCase().includes(searchLower) ||
          (exercise.subcategory && exercise.subcategory.toLowerCase().includes(searchLower)) ||
          exercise.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
          exercise.equipment?.some(eq => eq.toLowerCase().includes(searchLower)) ||
          exercise.body_parts?.some(bp => bp.toLowerCase().includes(searchLower)) ||
          (exercise.search_terms && exercise.search_terms.toLowerCase().includes(searchLower))
      );
    }

    // Step 3: Group by category
    const grouped: Record<string, Exercise[]> = {};
    filteredExercises.forEach(exercise => {
      if (!grouped[exercise.category]) {
        grouped[exercise.category] = [];
      }
      grouped[exercise.category].push(exercise);
    });

    return grouped;
  }, [exercises, selectedEquipment, selectedBodyParts, searchTerm]);

  // Filter lifts by category
  const filteredLiftCategories = useMemo(() => {
    const grouped: Record<string, BarbellLift[]> = {};
    lifts.forEach(lift => {
      if (!grouped[lift.category]) {
        grouped[lift.category] = [];
      }
      grouped[lift.category].push(lift);
    });

    const trimmedSearch = searchTerm.trim();
    if (!trimmedSearch) return grouped;

    const filtered: Record<string, BarbellLift[]> = {};
    Object.entries(grouped).forEach(([category, categoryLifts]) => {
      const matchingLifts = categoryLifts.filter(lift =>
        lift.name.toLowerCase().includes(trimmedSearch.toLowerCase())
      );
      if (matchingLifts.length > 0) {
        filtered[category] = matchingLifts;
      }
    });
    return filtered;
  }, [lifts, searchTerm]);

  // Filter benchmarks
  const filteredBenchmarks = useMemo(() => {
    const trimmedSearch = searchTerm.trim();
    if (!trimmedSearch) return benchmarks;
    return benchmarks.filter(b =>
      b.name.toLowerCase().includes(trimmedSearch.toLowerCase())
    );
  }, [benchmarks, searchTerm]);

  // Filter forge benchmarks
  const filteredForgeBenchmarks = useMemo(() => {
    const trimmedSearch = searchTerm.trim();
    if (!trimmedSearch) return forgeBenchmarks;
    return forgeBenchmarks.filter(f =>
      f.name.toLowerCase().includes(trimmedSearch.toLowerCase())
    );
  }, [forgeBenchmarks, searchTerm]);

  // Calculate total items based on active tab
  const totalItems = useMemo(() => {
    switch (activeTab) {
      case 'exercises':
        return Object.values(filteredExerciseCategories).flat().length;
      case 'lifts':
        return Object.values(filteredLiftCategories).flat().length;
      case 'benchmarks':
        return filteredBenchmarks.length;
      case 'forge':
        return filteredForgeBenchmarks.length;
      default:
        return 0;
    }
  }, [activeTab, filteredExerciseCategories, filteredLiftCategories, filteredBenchmarks, filteredForgeBenchmarks]);

  if (!isOpen) return null;

  const handleSelectExercise = (exerciseName: string, exerciseData?: Exercise) => {
    onSelectExercise(exerciseName);

    // Track in recently used if we have the exercise data
    if (exerciseData) {
      addRecent({
        id: exerciseData.id,
        name: exerciseData.name,
        display_name: exerciseData.display_name,
        category: exerciseData.category,
      });
    }
  };

  const handleSelectLift = (lift: BarbellLift) => {
    onSelectLift(lift);
  };

  const handleSelectBenchmark = (benchmark: Benchmark) => {
    onSelectBenchmark(benchmark);
  };

  const handleSelectForgeBenchmark = (forge: ForgeBenchmark) => {
    onSelectForgeBenchmark(forge);
  };

  // Calculate grid columns (max 5 columns)
  const getGridColumns = () => {
    const contentWidth = librarySize.width - 32; // Account for padding
    const minColWidth = 140;
    const maxCols = 4;
    const possibleCols = Math.floor(contentWidth / minColWidth);
    const actualCols = Math.min(possibleCols, maxCols);
    return `repeat(${actualCols}, 1fr)`;
  };

  // Get label for current tab
  const getTabLabel = () => {
    switch (activeTab) {
      case 'exercises': return 'exercise';
      case 'lifts': return 'lift';
      case 'benchmarks': return 'benchmark';
      case 'forge': return 'forge benchmark';
    }
  };

  return (
    <div
      className='fixed z-[100]'
      style={{
        top: `${libraryPos.top}px`,
        left: `${libraryPos.left}px`,
      }}
    >
      <div
        className='bg-white rounded-lg shadow-2xl flex flex-col relative border-4 border-[#208479]'
        style={{
          width: `${librarySize.width}px`,
          height: `${librarySize.height}px`,
        }}
      >
        {/* Bottom-right resize handle */}
        <div
          className='absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-50'
          onMouseDown={handleResizeStart}
          title='Drag to resize'
        >
          <div className='absolute bottom-0 right-0 w-0 h-0 border-l-[24px] border-l-transparent border-b-[24px] border-b-[#208479] hover:border-b-[#1a6b62] transition'></div>
        </div>

        {/* Header - Draggable */}
        <div
          className='bg-[#208479] text-white p-4 flex justify-between items-center rounded-t-lg cursor-move flex-shrink-0'
          onMouseDown={handleLibraryDragStart}
        >
          <h3 className='font-bold flex items-center gap-2'>
            <Library size={20} />
            Movement Library
          </h3>
          <button
            onClick={onClose}
            className='px-4 py-2 bg-[#1a6b62] hover:bg-[#145a52] text-white rounded-lg font-semibold transition flex items-center gap-2'
          >
            Done
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className='flex border-b border-gray-300 bg-gray-50'>
          <button
            onClick={() => setActiveTab('exercises')}
            className={`flex-1 px-4 py-3 font-semibold transition ${
              activeTab === 'exercises'
                ? 'bg-white text-[#208479] border-b-2 border-[#208479]'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Exercises
          </button>
          <button
            onClick={() => setActiveTab('lifts')}
            className={`flex-1 px-4 py-3 font-semibold transition ${
              activeTab === 'lifts'
                ? 'bg-white text-[#208479] border-b-2 border-[#208479]'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Lifts
          </button>
          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`flex-1 px-4 py-3 font-semibold transition ${
              activeTab === 'benchmarks'
                ? 'bg-white text-[#208479] border-b-2 border-[#208479]'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Benchmarks
          </button>
          <button
            onClick={() => setActiveTab('forge')}
            className={`flex-1 px-4 py-3 font-semibold transition ${
              activeTab === 'forge'
                ? 'bg-white text-[#208479] border-b-2 border-[#208479]'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Forge
          </button>
        </div>

        {/* Search Box */}
        <div className='p-4 border-b'>
          <div className='relative'>
            <Search
              className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400'
              size={18}
            />
            <input
              ref={searchInputRef}
              type='text'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={`Search ${getTabLabel()}s...`}
              autoComplete='off'
              readOnly
              onFocus={e => e.currentTarget.removeAttribute('readonly')}
              className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 placeholder-gray-400'
            />
          </div>
          <div className='flex items-center justify-between mt-2'>
            <p className='text-xs text-gray-600'>
              {totalItems} {getTabLabel()}{totalItems !== 1 ? 's' : ''} found
            </p>
            {activeTab === 'benchmarks' && (
              <button
                onClick={() => setShowCreateBenchmarkModal(true)}
                className='text-xs text-[#208479] hover:text-[#1a6b62] font-semibold flex items-center gap-1 transition'
              >
                <span>+ Create New</span>
              </button>
            )}
            {activeTab === 'forge' && (
              <button
                onClick={() => setShowCreateForgeModal(true)}
                className='text-xs text-[#208479] hover:text-[#1a6b62] font-semibold flex items-center gap-1 transition'
              >
                <span>+ Create New</span>
              </button>
            )}
            {activeTab === 'lifts' && (
              <button
                onClick={() => setShowCreateLiftModal(true)}
                className='text-xs text-[#208479] hover:text-[#1a6b62] font-semibold flex items-center gap-1 transition'
              >
                <span>+ Create New</span>
              </button>
            )}
            {activeTab === 'exercises' && (
              <button
                onClick={() => setShowCreateExerciseModal(true)}
                className='text-xs text-[#208479] hover:text-[#1a6b62] font-semibold flex items-center gap-1 transition'
              >
                <span>+ Create New</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Section (Exercises Tab Only) */}
        {activeTab === 'exercises' && (
          <div className='px-4 py-3 border-b bg-gray-50'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              <MultiSelectDropdown
                label='Equipment'
                options={availableEquipment}
                selectedValues={selectedEquipment}
                onChange={setSelectedEquipment}
                placeholder='All equipment'
              />
              <MultiSelectDropdown
                label='Body Parts'
                options={availableBodyParts}
                selectedValues={selectedBodyParts}
                onChange={setSelectedBodyParts}
                placeholder='All body parts'
              />
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className='flex-1 overflow-y-auto p-4'>
          {loading ? (
            <div className='text-center py-8 text-gray-500'>
              <p className='text-sm'>Loading {getTabLabel()}s...</p>
            </div>
          ) : (
            <>
              {/* Exercises Tab */}
              {activeTab === 'exercises' && (
                <>
                  {/* Favorites Section */}
                  {favorites.length > 0 && (
                    <div className='mb-4'>
                      <button
                        onClick={() => setFavoritesCollapsed(!favoritesCollapsed)}
                        className='w-full flex items-center gap-2 bg-amber-100 px-3 py-2 rounded-t-lg hover:bg-amber-200 transition'
                      >
                        {favoritesCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                        <Star size={16} className='text-amber-600 fill-amber-600' />
                        <h4 className='text-sm font-bold text-amber-900 uppercase tracking-wide'>
                          Favorites ({favorites.length})
                        </h4>
                      </button>
                      {!favoritesCollapsed && (
                        <div className='grid gap-0 mb-2 bg-amber-50 p-2 rounded-b-lg' style={{ gridTemplateColumns: getGridColumns() }}>
                          {favorites.map(exercise => (
                            <div key={exercise.id} className='relative group'>
                              <button
                                onClick={() => handleSelectExercise(exercise.display_name || exercise.name, exercise)}
                                className='w-full text-left px-0.5 py-0.5 hover:bg-[#208479] hover:text-white transition text-xs text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis pr-5'
                                title={exercise.description || undefined}
                              >
                                {exercise.display_name || exercise.name}
                                {exercise.video_url && (
                                  <span
                                    className='ml-1 cursor-pointer hover:text-teal-500'
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openVideoModal(exercise.video_url!, exercise.display_name || exercise.name);
                                    }}
                                  >
                                    📹
                                  </span>
                                )}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(exercise.id);
                                }}
                                className='absolute right-0.5 top-0.5 opacity-100 hover:scale-110 transition'
                                title='Remove from favorites'
                              >
                                <Star size={12} className='text-amber-500 fill-amber-500' />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recently Used Section */}
                  {recentExercises.length > 0 && (
                    <div className='mb-4'>
                      <button
                        onClick={() => setRecentCollapsed(!recentCollapsed)}
                        className='w-full flex items-center gap-2 bg-blue-100 px-3 py-2 rounded-t-lg hover:bg-blue-200 transition'
                      >
                        {recentCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                        <h4 className='text-sm font-bold text-blue-900 uppercase tracking-wide'>
                          Recently Used ({recentExercises.length})
                        </h4>
                      </button>
                      {!recentCollapsed && (
                        <div className='grid gap-0 mb-2 bg-blue-50 p-2 rounded-b-lg' style={{ gridTemplateColumns: getGridColumns() }}>
                          {recentExercises.map(exercise => {
                            // Find full exercise data from exercises array
                            const fullExercise = exercises.find(ex => ex.id === exercise.id);
                            return (
                              <div key={exercise.id} className='relative group'>
                                <button
                                  onClick={() => handleSelectExercise(exercise.display_name || exercise.name, fullExercise)}
                                  className='w-full text-left px-0.5 py-0.5 hover:bg-[#208479] hover:text-white transition text-xs text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis pr-5'
                                  title={fullExercise?.description || undefined}
                                >
                                  {exercise.display_name || exercise.name}
                                  {fullExercise?.video_url && (
                                    <span
                                      className='ml-1 cursor-pointer hover:text-teal-500'
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openVideoModal(fullExercise.video_url!, exercise.display_name || exercise.name);
                                      }}
                                    >
                                      📹
                                    </span>
                                  )}
                                </button>
                                {fullExercise && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFavorite(fullExercise.id);
                                    }}
                                    className='absolute right-0.5 top-0.5 opacity-0 group-hover:opacity-100 hover:scale-110 transition'
                                    title={isFavorited(fullExercise.id) ? 'Remove from favorites' : 'Add to favorites'}
                                  >
                                    <Star
                                      size={12}
                                      className={isFavorited(fullExercise.id) ? 'text-amber-500 fill-amber-500' : 'text-gray-400'}
                                    />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Category Sections */}
                  {Object.keys(filteredExerciseCategories).length > 0 ? (
                  <div className='space-y-4'>
                    {sortCategories(filteredExerciseCategories, EXERCISE_CATEGORY_ORDER).map(([category, categoryExercises]) => (
                      <div key={category}>
                        <div className='bg-[#208479] text-white px-3 py-2 rounded-t-lg mb-2'>
                          <h4 className='text-sm font-bold uppercase tracking-wide'>{category}</h4>
                        </div>
                        <div className='grid gap-0 mb-2' style={{ gridTemplateColumns: getGridColumns() }}>
                          {categoryExercises.map(exercise => (
                            <div key={exercise.id} className='relative group'>
                              <button
                                onClick={() => handleSelectExercise(exercise.display_name || exercise.name, exercise)}
                                className='w-full text-left px-0.5 py-0.5 hover:bg-[#208479] hover:text-white transition text-xs text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis pr-5'
                                title={exercise.description || undefined}
                              >
                                {exercise.display_name || exercise.name}
                                {exercise.video_url && (
                                  <span
                                    className='ml-1 cursor-pointer hover:text-teal-500'
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openVideoModal(exercise.video_url!, exercise.name);
                                    }}
                                  >
                                    📹
                                  </span>
                                )}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(exercise.id);
                                }}
                                className='absolute right-0.5 top-0.5 opacity-0 group-hover:opacity-100 hover:scale-110 transition'
                                title={isFavorited(exercise.id) ? 'Remove from favorites' : 'Add to favorites'}
                              >
                                <Star
                                  size={12}
                                  className={isFavorited(exercise.id) ? 'text-amber-500 fill-amber-500' : 'text-gray-400'}
                                />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-8 text-gray-500'>
                    <p className='text-sm'>No exercises found</p>
                  </div>
                )}
                </>
              )}

              {/* Lifts Tab */}
              {activeTab === 'lifts' && (
                Object.keys(filteredLiftCategories).length > 0 ? (
                  <div className='space-y-4'>
                    {sortCategories(filteredLiftCategories, LIFT_CATEGORY_ORDER).map(([category, categoryLifts]) => (
                      <div key={category}>
                        <div className='bg-[#208479] text-white px-3 py-2 rounded-t-lg mb-2'>
                          <h4 className='text-sm font-bold uppercase tracking-wide'>{category}</h4>
                        </div>
                        <div className='grid gap-0 mb-2' style={{ gridTemplateColumns: getGridColumns() }}>
                          {categoryLifts.map(lift => (
                            <button
                              key={lift.id}
                              onClick={() => handleSelectLift(lift)}
                              className='text-left px-0.5 py-0.5 hover:bg-[#208479] hover:text-white transition text-xs text-gray-900 flex items-center justify-between whitespace-nowrap overflow-hidden'
                            >
                              <span className='overflow-hidden text-ellipsis'>{lift.name}</span>
                              <span className='text-gray-400 hover:text-white ml-1'>→</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-8 text-gray-500'>
                    <p className='text-sm'>No lifts found</p>
                  </div>
                )
              )}

              {/* Benchmarks Tab */}
              {activeTab === 'benchmarks' && (
                filteredBenchmarks.length > 0 ? (
                  <div className='grid gap-0' style={{ gridTemplateColumns: getGridColumns() }}>
                    {filteredBenchmarks.map(benchmark => (
                      <button
                        key={benchmark.id}
                        onClick={() => handleSelectBenchmark(benchmark)}
                        className='text-left px-0.5 py-0.5 hover:bg-[#208479] hover:text-white transition text-xs text-gray-900 flex items-center justify-between whitespace-nowrap overflow-hidden'
                      >
                        <span className='overflow-hidden text-ellipsis'>{benchmark.name}</span>
                        <span className='text-gray-400 hover:text-white ml-1'>→</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-8 text-gray-500'>
                    <p className='text-sm'>No benchmarks found</p>
                  </div>
                )
              )}

              {/* Forge Benchmarks Tab */}
              {activeTab === 'forge' && (
                filteredForgeBenchmarks.length > 0 ? (
                  <div className='grid gap-0' style={{ gridTemplateColumns: getGridColumns() }}>
                    {filteredForgeBenchmarks.map(forge => (
                      <button
                        key={forge.id}
                        onClick={() => handleSelectForgeBenchmark(forge)}
                        className='text-left px-0.5 py-0.5 hover:bg-[#208479] hover:text-white transition text-xs text-gray-900 flex items-center justify-between whitespace-nowrap overflow-hidden'
                      >
                        <span className='overflow-hidden text-ellipsis'>{forge.name}</span>
                        <span className='text-gray-400 hover:text-white ml-1'>→</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-8 text-gray-500'>
                    <p className='text-sm'>No forge benchmarks found</p>
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>

      {/* Video Modal */}
      <ExerciseVideoModal
        isOpen={videoModalOpen}
        onClose={closeVideoModal}
        videoUrl={selectedVideoUrl}
        exerciseName={selectedVideoName}
      />

      {/* Create Benchmark Modal */}
      {showCreateBenchmarkModal && (
        <div className='fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4'>
          <div className='bg-white rounded-lg max-w-lg w-full p-6 shadow-2xl' onClick={(e) => e.stopPropagation()}>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-xl font-bold text-gray-900'>Add Benchmark</h3>
              <button onClick={() => setShowCreateBenchmarkModal(false)} className='p-1 hover:bg-gray-600 rounded'>
                <X size={24} className='text-white' />
              </button>
            </div>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-100 mb-1'>Name</label>
                <input
                  type='text'
                  value={benchmarkForm.name}
                  onChange={(e) => setBenchmarkForm({ ...benchmarkForm, name: e.target.value })}
                  className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg'
                  placeholder='e.g., Fran, Helen, Murph'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-100 mb-1'>Type</label>
                <select
                  value={benchmarkForm.type}
                  onChange={(e) => setBenchmarkForm({ ...benchmarkForm, type: e.target.value })}
                  className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg'
                >
                  <option value=''>Select type...</option>
                  {workoutTypes.map(type => (
                    <option key={type.id} value={type.name}>{type.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-100 mb-1'>Description</label>
                <textarea
                  value={benchmarkForm.description}
                  onChange={(e) => setBenchmarkForm({ ...benchmarkForm, description: e.target.value })}
                  rows={4}
                  className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg'
                  placeholder='Workout details (e.g., 21-15-9 Thrusters & Pull-ups)'
                />
              </div>
              <div className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  id='benchmark_has_scaling'
                  checked={benchmarkForm.has_scaling}
                  onChange={(e) => setBenchmarkForm({ ...benchmarkForm, has_scaling: e.target.checked })}
                  className='w-4 h-4'
                />
                <label htmlFor='benchmark_has_scaling' className='text-sm text-gray-100'>Has Scaling Options (Rx/Sc1/Sc2/Sc3)</label>
              </div>
            </div>
            <div className='flex gap-3 mt-6'>
              <button onClick={handleCreateBenchmark} className='flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600'>
                Create
              </button>
              <button onClick={() => setShowCreateBenchmarkModal(false)} className='px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700'>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Forge Benchmark Modal */}
      {showCreateForgeModal && (
        <div className='fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4' onClick={(e) => e.stopPropagation()}>
          <div className='bg-gray-500 rounded-lg max-w-lg w-full p-6 shadow-2xl' onClick={(e) => e.stopPropagation()}>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-xl font-bold text-gray-100'>Add Forge Benchmark</h3>
              <button onClick={() => setShowCreateForgeModal(false)} className='p-1 hover:bg-gray-600 rounded'>
                <X size={24} className='text-white' />
              </button>
            </div>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-100 mb-1'>Name</label>
                <input
                  type='text'
                  value={forgeForm.name}
                  onChange={(e) => setForgeForm({ ...forgeForm, name: e.target.value })}
                  className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg'
                  placeholder='e.g., Forge 1, Forge 2'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-100 mb-1'>Type</label>
                <select
                  value={forgeForm.type}
                  onChange={(e) => setForgeForm({ ...forgeForm, type: e.target.value })}
                  className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg'
                >
                  <option value=''>Select type...</option>
                  {workoutTypes.map(type => (
                    <option key={type.id} value={type.name}>{type.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-100 mb-1'>Description</label>
                <textarea
                  value={forgeForm.description}
                  onChange={(e) => setForgeForm({ ...forgeForm, description: e.target.value })}
                  rows={4}
                  className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg'
                  placeholder='Workout details (e.g., 3 Rounds: 15 Box Jumps, 10 HSPU, 5 Power Cleans)'
                />
              </div>
              <div className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  id='forge_has_scaling'
                  checked={forgeForm.has_scaling}
                  onChange={(e) => setForgeForm({ ...forgeForm, has_scaling: e.target.checked })}
                  className='w-4 h-4'
                />
                <label htmlFor='forge_has_scaling' className='text-sm text-gray-100'>Has Scaling Options (Rx/Sc1/Sc2/Sc3)</label>
              </div>
            </div>
            <div className='flex gap-3 mt-6'>
              <button onClick={handleCreateForgeBenchmark} className='flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600'>
                Create
              </button>
              <button onClick={() => setShowCreateForgeModal(false)} className='px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700'>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Lift Modal */}
      {showCreateLiftModal && (
        <div className='fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4' onClick={(e) => e.stopPropagation()}>
          <div className='bg-gray-500 rounded-lg max-w-lg w-full p-6 shadow-2xl' onClick={(e) => e.stopPropagation()}>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-xl font-bold text-gray-100'>Add Barbell Lift</h3>
              <button onClick={() => setShowCreateLiftModal(false)} className='p-1 hover:bg-gray-600 rounded'>
                <X size={24} className='text-white' />
              </button>
            </div>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-100 mb-1'>Name</label>
                <input
                  type='text'
                  value={liftForm.name}
                  onChange={(e) => setLiftForm({ ...liftForm, name: e.target.value })}
                  className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg'
                  placeholder='e.g., Back Squat, Snatch'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-100 mb-1'>Category</label>
                <select
                  value={liftForm.category}
                  onChange={(e) => setLiftForm({ ...liftForm, category: e.target.value })}
                  className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg'
                >
                  <option value='Olympic'>Olympic</option>
                  <option value='Squat'>Squat</option>
                  <option value='Press'>Press</option>
                </select>
              </div>
            </div>
            <div className='flex gap-3 mt-6'>
              <button onClick={handleCreateLift} className='flex-1 px-4 py-2 bg-blue-400 text-white rounded-lg hover:bg-blue-500'>
                Create
              </button>
              <button onClick={() => setShowCreateLiftModal(false)} className='px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700'>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Exercise Modal */}
      <ExerciseFormModal
        isOpen={showCreateExerciseModal}
        onClose={() => setShowCreateExerciseModal(false)}
        onSave={handleCreateExercise}
        editingExercise={null}
      />
    </div>
  );
}

export default MovementLibraryPopup;
