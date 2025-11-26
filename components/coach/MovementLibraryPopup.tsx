'use client';

import { supabase } from '@/lib/supabase';
import { Library, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { BarbellLift, Benchmark, ForgeBenchmark } from '@/types/movements';
import MultiSelectDropdown from './MultiSelectDropdown';
import ExerciseVideoModal from './ExerciseVideoModal';

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
  'Olympic Lifts',
  'Squats',
  'Pressing',
  'Pulling',
  'Deadlifts',
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
  onClose,
  onSelectExercise,
  onSelectLift,
  onSelectBenchmark,
  onSelectForgeBenchmark,
}: MovementLibraryPopupProps) {
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

  const [loading, setLoading] = useState(false);
  const [hasFetchedExercises, setHasFetchedExercises] = useState(false);
  const [hasFetchedLifts, setHasFetchedLifts] = useState(false);
  const [hasFetchedBenchmarks, setHasFetchedBenchmarks] = useState(false);
  const [hasFetchedForge, setHasFetchedForge] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Position and size state for draggable/resizable modal
  const [librarySize, setLibrarySize] = useState({ width: 800, height: 600 });
  const [libraryPos, setLibraryPos] = useState({ top: 100, left: 820 }); // Position to right of WorkoutModal
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
        .order('display_order');
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

  const handleSelectExercise = (exercise: string) => {
    onSelectExercise(exercise);
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
    const maxCols = 5;
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
          <p className='text-xs text-gray-600 mt-2'>
            {totalItems} {getTabLabel()}{totalItems !== 1 ? 's' : ''} found
          </p>
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
                Object.keys(filteredExerciseCategories).length > 0 ? (
                  <div className='space-y-4'>
                    {sortCategories(filteredExerciseCategories, EXERCISE_CATEGORY_ORDER).map(([category, categoryExercises]) => (
                      <div key={category}>
                        <div className='bg-[#208479] text-white px-3 py-2 rounded-t-lg mb-2'>
                          <h4 className='text-sm font-bold uppercase tracking-wide'>{category}</h4>
                        </div>
                        <div className='grid gap-0 mb-2' style={{ gridTemplateColumns: getGridColumns() }}>
                          {categoryExercises.map(exercise => (
                            <button
                              key={exercise.id}
                              onClick={() => handleSelectExercise(exercise.name)}
                              className='text-left px-0.5 py-0.5 hover:bg-[#208479] hover:text-white transition text-xs text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis'
                              title={exercise.description || undefined}
                            >
                              {exercise.name}
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
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-8 text-gray-500'>
                    <p className='text-sm'>No exercises found</p>
                  </div>
                )
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
    </div>
  );
}

export default MovementLibraryPopup;
