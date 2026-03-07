'use client';

import ExerciseFormModal from '@/components/coach/ExerciseFormModal';
import MultiSelectDropdown from '@/components/coach/MultiSelectDropdown';
import { supabase } from '@/lib/supabase';
import { ChevronDown, ChevronRight, Edit2, Plus, Search, Trash2, X, Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getExerciseFrequency, type ExerciseFrequency } from '@/utils/movement-analytics';


// Define category ordering (workout flow)
const EXERCISE_CATEGORY_ORDER = [
  'Warm-up & Mobility',
  'Olympic Lifting & Barbell Movements',
  'Compound Exercises',
  'Gymnastics & Bodyweight',
  'Core, Abs & Isometric Holds',
  'Cardio & Conditioning',
  'Strength & Functional Conditioning',
  'Recovery & Stretching',
];

// Display name mapping for buttons
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  'Olympic Lifting & Barbell Movements': 'Oly Lift & Barbell',
  'Core, Abs & Isometric Holds': 'Core, Abs & Iso',
  'Cardio & Conditioning': 'Cardio & Cond',
  'Strength & Functional Conditioning': 'Strength & Cond',
};

// Sort categories by predefined order
const sortCategories = (
  grouped: Record<string, Exercise[]>,
  categoryOrder: string[]
): [string, Exercise[]][] => {
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

interface Exercise {
  id: string;
  name: string;
  display_name?: string;
  category: string;
  subcategory?: string;
  description: string | null;
  video_url: string | null;
  tags: string[] | null;
  equipment?: string[];
  body_parts?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  is_warmup?: boolean;
  is_stretch?: boolean;
}

interface ExercisesTabProps {
  exercises: Exercise[];
  onAdd: () => void;
  onEdit: (exercise: Exercise) => void;
  onDelete: (id: string) => void;
  // Search & collapse state
  searchTerm: string;
  onSearchChange: (term: string) => void;
  collapsedCategories: Record<string, boolean>;
  onToggleCategory: (category: string) => void;
  // Modal props
  showModal: boolean;
  onCloseModal: () => void;
  editingExercise: Exercise | null;
  onSave: (exerciseData: Omit<Exercise, 'id'> & { id?: string }) => Promise<void>;
  // Video modal
  onOpenVideoModal: (videoUrl: string, exerciseName: string) => void;
}

export default function ExercisesTab({
  exercises,
  onAdd,
  onEdit,
  onDelete,
  searchTerm,
  onSearchChange,
  collapsedCategories,
  onToggleCategory,
  showModal,
  onCloseModal,
  editingExercise,
  onSave,
  onOpenVideoModal,
}: ExercisesTabProps) {
  // Filter state
  const [availableEquipment, setAvailableEquipment] = useState<string[]>([]);
  const [availableBodyParts, setAvailableBodyParts] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [selectedBodyParts, setSelectedBodyParts] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Exercise frequency state
  const [exerciseFrequencies, setExerciseFrequencies] = useState<Map<string, ExerciseFrequency>>(new Map());
  const [loadingFrequencies, setLoadingFrequencies] = useState(false);
  const [usageTimeRange, setUsageTimeRange] = useState<'all' | 1 | 3 | 6 | 12>('all');
  const [detailExercise, setDetailExercise] = useState<ExerciseFrequency | null>(null);

  // Fetch distinct equipment and body_parts for filters
  useEffect(() => {
    const fetchDistinctFilters = async () => {
      try {
        const { data: exerciseData, error } = await supabase
          .from('exercises')
          .select('equipment, body_parts');

        if (error) throw error;

        const equipmentSet = new Set<string>();
        const bodyPartsSet = new Set<string>();

        exerciseData?.forEach((ex) => {
          ex.equipment?.forEach((eq: string) => equipmentSet.add(eq));
          ex.body_parts?.forEach((bp: string) => bodyPartsSet.add(bp));
        });

        setAvailableEquipment(Array.from(equipmentSet).sort());
        setAvailableBodyParts(Array.from(bodyPartsSet).sort());
      } catch (error) {
        console.error('Error fetching filter options:', error);
      }
    };

    fetchDistinctFilters();
  }, []);

  // Fetch exercise frequencies
  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const fetchFrequencies = async () => {
      setLoadingFrequencies(true);
      try {
        // Calculate date filter based on time range
        let dateFilter = undefined;
        if (usageTimeRange !== 'all') {
          const today = new Date();
          const startDate = new Date();
          startDate.setMonth(today.getMonth() - usageTimeRange);
          dateFilter = {
            startDate: startDate.toISOString().split('T')[0], // YYYY-MM-DD
          };
        }

        const timeoutPromise = new Promise<ExerciseFrequency[]>((resolve) => {
          timeoutId = setTimeout(() => {
            console.warn('Exercise frequency fetch timed out after 10 seconds');
            resolve([]);
          }, 10000);
        });

        const frequencies = await Promise.race([
          getExerciseFrequency(dateFilter),
          timeoutPromise,
        ]);

        if (cancelled) return;
        clearTimeout(timeoutId);
        // Convert to Map for O(1) lookups
        const frequencyMap = new Map(frequencies.map(f => [f.id, f]));
        setExerciseFrequencies(frequencyMap);
      } catch (error) {
        if (cancelled) return;
        // Ignore AbortErrors from component unmount (React Strict Mode)
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Error fetching exercise frequencies:', error);
      } finally {
        if (!cancelled) setLoadingFrequencies(false);
      }
    };

    fetchFrequencies();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [usageTimeRange]);

  // Check if any filters are active
  const hasActiveFilters =
    selectedCategory !== null ||
    selectedEquipment.length > 0 ||
    selectedBodyParts.length > 0 ||
    usageTimeRange !== 'all' ||
    searchTerm !== '';

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedCategory(null);
    setSelectedEquipment([]);
    setSelectedBodyParts([]);
    setUsageTimeRange('all');
    onSearchChange('');
  };

  return (
    <>
      <div className='bg-white rounded-lg shadow p-6'>
        <div className='flex justify-between items-center mb-4'>
          <div className='flex items-center gap-1 sm:gap-2 md:gap-3'>
            <h2 className='text-sm sm:text-base md:text-xl font-bold text-gray-900'>Exercise Library</h2>
            <span className='px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 bg-[#ccfbf1] text-[#0f766e] rounded-full text-[10px] sm:text-xs md:text-sm font-semibold'>
              {exercises.length}
            </span>
          </div>
          <button
            onClick={onAdd}
            className='px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 bg-[#14b8a6] text-white rounded-lg hover:bg-[#0d9488] transition flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs md:text-base'
          >
            <Plus size={16} className='sm:w-5 sm:h-5' />
            <span className='hidden sm:inline'>Add Exercise</span>
            <span className='sm:hidden'>Add</span>
          </button>
        </div>

        {/* Search Box */}
        <div className='mb-4'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' size={18} />
            <input
              type='text'
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder='Search exercises by name, category, or tags...'
              className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent text-gray-900'
            />
          </div>
        </div>

        {/* Category Filter Buttons */}
        <div className='mb-4 flex flex-wrap gap-2'>
          {EXERCISE_CATEGORY_ORDER.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
                selectedCategory === category
                  ? 'bg-[#0d9488] text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {CATEGORY_DISPLAY_NAMES[category] || category}
            </button>
          ))}
        </div>

        {/* Filter Buttons */}
        <div className='mb-4 flex flex-wrap gap-2 sm:gap-3 items-end'>
          <MultiSelectDropdown
            label='Equipment'
            options={availableEquipment}
            selectedValues={selectedEquipment}
            onChange={setSelectedEquipment}
            placeholder='All Equipment'
          />
          <MultiSelectDropdown
            label='Body Parts'
            options={availableBodyParts}
            selectedValues={selectedBodyParts}
            onChange={setSelectedBodyParts}
            placeholder='All Body Parts'
          />

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className='p-1.5 sm:p-2 bg-gray-200 hover:bg-gray-300 rounded transition flex items-center justify-center text-gray-700'
              title='Clear all filters'
              aria-label='Clear all filters'
            >
              <X size={16} className='sm:w-[18px] sm:h-[18px]' />
            </button>
          )}

          {/* Usage Time Range Buttons */}
          <div className='flex items-center gap-1 sm:gap-2 w-full sm:w-auto sm:ml-auto'>
            <span className='text-[10px] sm:text-xs md:text-sm text-gray-600 font-medium'>Usage:</span>
            <button
              onClick={() => setUsageTimeRange('all')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold rounded transition ${
                usageTimeRange === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setUsageTimeRange(1)}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold rounded transition ${
                usageTimeRange === 1
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              1M
            </button>
            <button
              onClick={() => setUsageTimeRange(3)}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold rounded transition ${
                usageTimeRange === 3
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              3M
            </button>
            <button
              onClick={() => setUsageTimeRange(6)}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold rounded transition ${
                usageTimeRange === 6
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              6M
            </button>
            <button
              onClick={() => setUsageTimeRange(12)}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold rounded transition ${
                usageTimeRange === 12
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              12M
            </button>
          </div>
        </div>

        {/* Group by category */}
        {sortCategories(
          exercises
            .filter(ex => {
              // Category filter
              if (selectedCategory && ex.category !== selectedCategory) {
                return false;
              }

              // Search term filter
              if (searchTerm.trim()) {
                const searchLower = searchTerm.toLowerCase();
                const matchesSearch = (
                  ex.name.toLowerCase().includes(searchLower) ||
                  (ex.display_name && ex.display_name.toLowerCase().includes(searchLower)) ||
                  ex.category.toLowerCase().includes(searchLower) ||
                  (ex.subcategory && ex.subcategory.toLowerCase().includes(searchLower)) ||
                  (ex.tags && ex.tags.some(tag => tag.toLowerCase().includes(searchLower))) ||
                  (ex.equipment && ex.equipment.some(eq => eq.toLowerCase().includes(searchLower))) ||
                  (ex.body_parts && ex.body_parts.some(bp => bp.toLowerCase().includes(searchLower)))
                );
                if (!matchesSearch) return false;
              }

              // Equipment filter (OR within group)
              if (selectedEquipment.length > 0) {
                const hasEquipment = selectedEquipment.some(eq =>
                  ex.equipment?.includes(eq)
                );
                if (!hasEquipment) return false;
              }

              // Body Parts filter (OR within group)
              if (selectedBodyParts.length > 0) {
                const hasBodyPart = selectedBodyParts.some(bp =>
                  ex.body_parts?.includes(bp)
                );
                if (!hasBodyPart) return false;
              }

              return true;
            })
            .reduce((acc, ex) => {
              if (!acc[ex.category]) acc[ex.category] = [];
              acc[ex.category].push(ex);
              return acc;
            }, {} as Record<string, Exercise[]>),
          EXERCISE_CATEGORY_ORDER
        ).map(([category, categoryExercises]) => (
          <div key={category} className='mb-6 border rounded-lg'>
            <button
              onClick={() => onToggleCategory(category)}
              className='w-full flex items-center gap-2 p-3 hover:bg-[#ccfbf1] rounded-t-lg text-gray-800'
            >
              {collapsedCategories[category] ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
              <h3 className='text-lg font-semibold text-gray-800'>
                {category} ({categoryExercises.length})
              </h3>
            </button>
            {!collapsedCategories[category] && (
              <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 p-3'>
                {categoryExercises.sort((a, b) => (a.display_name || a.name).localeCompare(b.display_name || b.name)).map((exercise) => (
                  <div
                    key={exercise.id}
                    className='border border-gray-300 rounded-lg p-3 bg-[#f0fdfa] hover:bg-[#ccfbf1] hover:shadow-lg hover:z-10 transition-all group relative'
                  >
                    <div className='absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition'>
                      <button
                        onClick={() => onEdit(exercise)}
                        className='p-1 text-blue-600 hover:bg-blue-50 rounded transition'
                        aria-label='Edit exercise'
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(exercise.id)}
                        className='p-1 text-red-600 hover:bg-red-50 rounded transition'
                        aria-label='Delete exercise'
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <h4 className='text-base font-bold text-gray-900 mb-1'>
                      {exercise.display_name || exercise.name}
                      {exercise.video_url && (
                        <span
                          className='ml-2 cursor-pointer text-teal-500 hover:text-teal-600'
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenVideoModal(exercise.video_url!, exercise.display_name || exercise.name);
                          }}
                        >
                          📹
                        </span>
                      )}
                    </h4>
                    {exercise.subcategory && (
                      <p className='text-xs text-gray-600 mb-1'>{exercise.subcategory}</p>
                    )}
                    {/* Equipment badges */}
                    {exercise.equipment && exercise.equipment.length > 0 && (
                      <div className='flex flex-wrap gap-1 mb-1'>
                        {exercise.equipment.slice(0, 4).map((eq, idx) => (
                          <span key={idx} className='text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium'>
                            {eq}
                          </span>
                        ))}
                        {exercise.equipment.length > 4 && (
                          <span className='text-xs text-gray-500'>+{exercise.equipment.length - 4}</span>
                        )}
                      </div>
                    )}
                    {/* Usage frequency badge */}
                    {!loadingFrequencies && exerciseFrequencies.has(exercise.id) && (
                      <div className='mb-1'>
                        <button
                          onClick={e => { e.stopPropagation(); setDetailExercise(exerciseFrequencies.get(exercise.id)!); }}
                          className='text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium hover:bg-purple-200 transition-colors cursor-pointer'
                        >
                          Used {exerciseFrequencies.get(exercise.id)!.count}x
                        </button>
                      </div>
                    )}
                    {exercise.tags && exercise.tags.length > 0 && (() => {
                      // Filter out tags that are duplicates of body_parts
                      const bodyPartsSet = new Set((exercise.body_parts || []).map(bp => bp.toLowerCase()));
                      const uniqueTags = exercise.tags.filter(tag => !bodyPartsSet.has(tag.toLowerCase()));
                      return uniqueTags.length > 0 ? (
                        <div className='flex flex-wrap gap-1 mt-2'>
                          {uniqueTags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className='text-xs bg-[#99f6e4] text-[#115e59] px-2 py-0.5 rounded'>
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null;
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {exercises.length === 0 && (
          <div className='text-center py-8 text-gray-500'>
            No exercises yet. Click &quot;Add Exercise&quot; to create one.
          </div>
        )}
      </div>

      {/* Exercise Form Modal */}
      <ExerciseFormModal
        isOpen={showModal}
        onClose={onCloseModal}
        onSave={onSave}
        editingExercise={editingExercise}
      />

      {/* Exercise Usage Detail Panel */}
      {detailExercise && (
        <div className='fixed inset-0 z-50 flex items-start justify-end' onClick={() => setDetailExercise(null)}>
          <div
            className='relative bg-white shadow-2xl h-full w-full max-w-sm flex flex-col'
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className='flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-purple-50'>
              <div>
                <h3 className='font-semibold text-gray-900'>{detailExercise.name}</h3>
                <p className='text-xs text-purple-700 mt-0.5'>Used in {detailExercise.count} workout{detailExercise.count !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setDetailExercise(null)} className='p-1 text-gray-400 hover:text-gray-600 rounded'>
                <X size={18} />
              </button>
            </div>

            {/* Workout list */}
            <div className='flex-1 overflow-y-auto divide-y divide-gray-100'>
              {detailExercise.workouts.length === 0 ? (
                <p className='text-sm text-gray-500 p-4'>No workout details available.</p>
              ) : (
                detailExercise.workouts.map((w, i) => (
                  <div key={i} className='flex items-center gap-3 px-4 py-3 hover:bg-gray-50'>
                    <Calendar size={14} className='text-purple-400 flex-shrink-0' />
                    <div>
                      <p className='text-sm font-medium text-gray-800'>
                        {new Date(w.date + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      <p className='text-xs text-gray-500'>
                        {w.session_type}{w.workout_name ? ` · ${w.workout_name}` : ''}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
