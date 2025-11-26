'use client';

import ExerciseFormModal from '@/components/coach/ExerciseFormModal';
import MultiSelectDropdown from '@/components/coach/MultiSelectDropdown';
import { supabase } from '@/lib/supabase';
import { ChevronDown, ChevronRight, Edit2, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

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
  search_terms?: string;
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

  return (
    <>
      <div className='bg-white rounded-lg shadow p-6'>
        <div className='flex justify-between items-center mb-4'>
          <div className='flex items-center gap-3'>
            <h2 className='text-xl font-bold text-gray-900'>Exercise Library</h2>
            <span className='px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold'>
              {exercises.length}
            </span>
          </div>
          <button
            onClick={onAdd}
            className='px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-2'
          >
            <Plus size={20} />
            Add Exercise
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
              className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900'
            />
          </div>
        </div>

        {/* Filter Buttons */}
        <div className='mb-4 flex gap-3'>
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
        </div>

        {/* Group by category */}
        {sortCategories(
          exercises
            .filter(ex => {
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
                  (ex.body_parts && ex.body_parts.some(bp => bp.toLowerCase().includes(searchLower))) ||
                  (ex.search_terms && ex.search_terms.toLowerCase().includes(searchLower))
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
              className='w-full flex items-center gap-2 p-3 hover:bg-green-100 rounded-t-lg text-gray-800'
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
                    className='border border-gray-300 rounded-lg p-3 bg-green-50 hover:bg-green-100 hover:shadow-lg hover:z-10 transition-all group relative'
                  >
                    <div className='absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition'>
                      <button
                        onClick={() => onEdit(exercise)}
                        className='p-1 text-blue-600 hover:bg-blue-50 rounded transition'
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(exercise.id)}
                        className='p-1 text-red-600 hover:bg-red-50 rounded transition'
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
                    {exercise.tags && exercise.tags.length > 0 && (() => {
                      // Filter out tags that are duplicates of body_parts
                      const bodyPartsSet = new Set((exercise.body_parts || []).map(bp => bp.toLowerCase()));
                      const uniqueTags = exercise.tags.filter(tag => !bodyPartsSet.has(tag.toLowerCase()));
                      return uniqueTags.length > 0 ? (
                        <div className='flex flex-wrap gap-1 mt-2'>
                          {uniqueTags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className='text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded'>
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
    </>
  );
}
