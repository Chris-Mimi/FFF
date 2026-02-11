'use client';

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Edit2, GripVertical, Plus, Save, Trash2, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Benchmark {
  id: string;
  name: string;
  type: string;
  description: string | null;
  display_order: number;
  has_scaling?: boolean;
}

// Sortable Forge Card Component
function SortableForgeCard({
  forge,
  onEdit,
  onDelete,
}: {
  forge: Benchmark;
  onEdit: (forge: Benchmark) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: forge.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, touchAction: 'none' }}
      {...attributes}
      className='border border-gray-300 rounded-lg p-1.5 sm:p-2 md:p-3 bg-cyan-200 hover:bg-cyan-300 hover:shadow-lg hover:z-10 transition-all group relative'
    >
      {/* Drag Handle */}
      <div
        {...listeners}
        className='absolute top-1 sm:top-2 left-1 sm:left-2 md:opacity-0 md:group-hover:opacity-100 transition cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600'
      >
        <GripVertical size={14} className='sm:w-4 sm:h-4 md:w-[18px] md:h-[18px]' />
      </div>

      {/* Edit/Delete Buttons */}
      <div className='absolute top-1 sm:top-2 right-1 sm:right-2 flex gap-0.5 sm:gap-1 md:opacity-0 md:group-hover:opacity-100 transition'>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(forge);
          }}
          className='p-0.5 sm:p-1 text-blue-600 hover:bg-blue-50 rounded transition'
          aria-label='Edit forge benchmark'
        >
          <Edit2 size={12} className='sm:w-4 sm:h-4' />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(forge.id);
          }}
          className='p-0.5 sm:p-1 text-red-600 hover:bg-red-50 rounded transition'
          aria-label='Delete forge benchmark'
        >
          <Trash2 size={12} className='sm:w-4 sm:h-4' />
        </button>
      </div>
      <h3 className='text-xs sm:text-sm md:text-base font-bold text-gray-900 mb-0.5 sm:mb-1'>{forge.name}</h3>
      <p className='text-[10px] sm:text-xs md:text-sm text-gray-800 mb-0.5 sm:mb-1'>{forge.type}</p>
      {forge.description && (
        <p className='text-[9px] sm:text-[10px] md:text-xs text-gray-700 line-clamp-2 group-hover:line-clamp-none'>{forge.description}</p>
      )}
    </div>
  );
}

// Droppable Empty Cell Component
function DroppableEmptyCell({ position }: { position: number }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `empty-${position}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`border border-dashed rounded-lg p-1.5 sm:p-2 md:p-3 min-h-[60px] sm:min-h-[80px] md:min-h-[100px] transition-colors ${
        isOver
          ? 'border-cyan-500 bg-cyan-100'
          : 'border-gray-300 bg-gray-50'
      }`}
    />
  );
}

interface ForgeBenchmarksTabProps {
  forgeBenchmarks: Benchmark[];
  onAdd: () => void;
  onEdit: (forge: Benchmark) => void;
  onDelete: (id: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onInsertRow: (afterPosition: number) => void;
  // Modal props
  showModal: boolean;
  onCloseModal: () => void;
  editingForge: Benchmark | null;
  form: {
    name: string;
    type: string;
    description: string;
    display_order: number;
    has_scaling: boolean;
  };
  onFormChange: (field: string, value: string | number | boolean) => void;
  onSave: () => void;
  workoutTypes: Array<{ id: string; name: string }>;
  loadingWorkoutTypes: boolean;
}

export default function ForgeBenchmarksTab({
  forgeBenchmarks,
  onAdd,
  onEdit,
  onDelete,
  onDragEnd,
  onInsertRow,
  showModal,
  onCloseModal,
  editingForge,
  form,
  onFormChange,
  onSave,
  workoutTypes,
  loadingWorkoutTypes,
}: ForgeBenchmarksTabProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // State for template selection
  const [allForgeBenchmarks, setAllForgeBenchmarks] = useState<Benchmark[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // Fetch all forge benchmarks for template selection
  useEffect(() => {
    const fetchAllForgeBenchmarks = async () => {
      const { data } = await supabase
        .from('forge_benchmarks')
        .select('*')
        .order('name');

      if (data) {
        setAllForgeBenchmarks(data as Benchmark[]);
      }
    };

    if (showModal) {
      fetchAllForgeBenchmarks();
      // Reset template selection when modal opens
      if (!editingForge) {
        setSelectedTemplate('');
      }
    }
  }, [showModal, editingForge]);

  // Handler for template selection
  const handleTemplateSelect = (forgeId: string) => {
    setSelectedTemplate(forgeId);

    if (!forgeId) {
      // Clear form if "None" selected
      onFormChange('name', '');
      onFormChange('type', '');
      onFormChange('description', '');
      onFormChange('has_scaling', false);
      return;
    }

    const template = allForgeBenchmarks.find(f => f.id === forgeId);
    if (template) {
      // Keep name empty so user must enter new name
      onFormChange('name', '');
      onFormChange('type', template.type);
      onFormChange('description', template.description || '');
      onFormChange('has_scaling', template.has_scaling || false);
    }
  };

  // Create a fixed grid with specific positions
  // Calculate max slots needed (highest display_order + some buffer)
  const maxDisplayOrder = forgeBenchmarks.length > 0
    ? Math.max(...forgeBenchmarks.map(f => f.display_order))
    : 0;
  const totalSlots = Math.max(maxDisplayOrder + 10, 25); // At least 25 slots (5 rows)

  // Create a map of display_order to benchmark
  const benchmarksByPosition = new Map(
    forgeBenchmarks.map(f => [f.display_order, f])
  );

  // Generate grid slots grouped by rows (5 per row)
  const rows: number[][] = [];
  for (let i = 1; i <= totalSlots; i += 5) {
    rows.push([i, i + 1, i + 2, i + 3, i + 4]);
  }

  return (
    <>
      <div className='bg-white rounded-lg shadow p-2 sm:p-4 md:p-6'>
        <div className='flex justify-between items-center mb-2 sm:mb-4'>
          <div className='flex items-center gap-1 sm:gap-2 md:gap-3'>
            <h2 className='text-sm sm:text-base md:text-xl font-bold text-gray-900'>Forge Benchmarks</h2>
            <span className='px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 bg-cyan-300 text-gray-700 rounded-full text-[10px] sm:text-xs md:text-sm font-semibold'>
              {forgeBenchmarks.length}
            </span>
          </div>
          <button
            onClick={onAdd}
            className='px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs md:text-base'
          >
            <Plus size={16} className='sm:w-5 sm:h-5' />
            <span className='hidden sm:inline'>Add Forge</span>
            <span className='sm:hidden'>Add</span>
          </button>
        </div>

        {forgeBenchmarks.length === 0 ? (
          <div className='text-center py-4 sm:py-8 text-xs sm:text-sm text-gray-500'>
            No Forge benchmarks yet. Click &quot;Add Forge&quot; to create one.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={forgeBenchmarks.map(f => f.id)}
              strategy={rectSortingStrategy}
            >
              <div className='space-y-1 sm:space-y-2'>
                {rows.map((rowPositions, rowIndex) => (
                  <div key={`row-${rowIndex}`}>
                    <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2 md:gap-3'>
                      {rowPositions.map((position) => {
                        const forge = benchmarksByPosition.get(position);
                        if (forge) {
                          return (
                            <SortableForgeCard
                              key={forge.id}
                              forge={forge}
                              onEdit={onEdit}
                              onDelete={onDelete}
                            />
                          );
                        }
                        // Empty droppable cell
                        return <DroppableEmptyCell key={`empty-${position}`} position={position} />;
                      })}
                    </div>
                    {/* Insert Row Below button */}
                    <div className='flex justify-center mt-0.5 sm:mt-1'>
                      <button
                        onClick={() => onInsertRow(rowPositions[4])}
                        className='text-[10px] sm:text-xs text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 px-2 sm:px-3 py-0.5 sm:py-1 rounded transition'
                      >
                        + Insert Row
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Forge Benchmark Modal */}
      {showModal && (
        <div className='fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-2 sm:p-4'>
          <div className='bg-gray-500 rounded-lg max-w-lg w-full p-3 sm:p-4 md:p-6 shadow-2xl max-h-[95vh] overflow-y-auto' onClick={(e) => e.stopPropagation()}>
            <div className='flex justify-between items-center mb-2 sm:mb-3 md:mb-4'>
              <h3 className='text-base sm:text-lg md:text-xl font-bold text-gray-100'>
                {editingForge ? 'Edit Forge' : 'Add Forge'}
              </h3>
              <button
                onClick={onCloseModal}
                className='p-1 hover:bg-gray-100 rounded'
                aria-label='Close'
              >
                <X size={20} className='sm:w-6 sm:h-6' />
              </button>
            </div>

            <div className='space-y-2 sm:space-y-3 md:space-y-4'>
              {/* Template Selection (only show when creating new) */}
              {!editingForge && (
                <div className='bg-gray-600 rounded-lg p-2 sm:p-3 md:p-4 border-2 border-teal-500'>
                  <label className='block text-xs sm:text-sm font-semibold text-gray-100 mb-1 sm:mb-2'>
                    Start from template (optional)
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className='w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 cursor-pointer'
                  >
                    <option value=''>None - Start from scratch</option>
                    {allForgeBenchmarks.map((forge) => (
                      <option key={forge.id} value={forge.id}>
                        {forge.name}
                      </option>
                    ))}
                  </select>
                  {selectedTemplate && (
                    <p className='text-[10px] sm:text-xs text-gray-300 mt-1 sm:mt-2'>
                      ✓ Template loaded. Enter a new name to create your Forge.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className='block text-xs sm:text-sm font-medium text-gray-100 mb-1'>
                  Name
                </label>
                <input
                  type='text'
                  value={form.name}
                  onChange={(e) => onFormChange('name', e.target.value)}
                  className='w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
                  placeholder='e.g., Forge Friday, The Grind'
                />
              </div>

              <div>
                <label className='block text-xs sm:text-sm font-medium text-gray-100 mb-1'>
                  Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) => onFormChange('type', e.target.value)}
                  className='w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent cursor-pointer'
                  disabled={loadingWorkoutTypes}
                >
                  {loadingWorkoutTypes ? (
                    <option>Loading types...</option>
                  ) : (
                    <>
                      <option value=''>Select type...</option>
                      {workoutTypes.map(type => (
                        <option key={type.id} value={type.name}>
                          {type.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className='block text-xs sm:text-sm font-medium text-gray-100 mb-1'>
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => onFormChange('description', e.target.value)}
                  rows={3}
                  className='w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
                  placeholder='Workout details'
                />
              </div>

              <div className='flex items-center gap-1.5 sm:gap-2'>
                <input
                  type='checkbox'
                  id='forge_has_scaling'
                  checked={form.has_scaling}
                  onChange={(e) => onFormChange('has_scaling', e.target.checked)}
                  className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-600 bg-white border-gray-300 rounded focus:ring-teal-500'
                />
                <label htmlFor='forge_has_scaling' className='text-[10px] sm:text-xs md:text-sm font-medium text-gray-100 cursor-pointer'>
                  Has Scaling Options (Rx/Sc1/Sc2/Sc3)
                </label>
              </div>
            </div>

            <div className='flex gap-2 sm:gap-3 mt-3 sm:mt-4 md:mt-6'>
              <button
                onClick={onSave}
                className='flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm md:text-base bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition flex items-center justify-center gap-1 sm:gap-2'
              >
                <Save size={14} className='sm:w-4 sm:h-4 md:w-[18px] md:h-[18px]' />
                {editingForge ? 'Update' : 'Create'}
              </button>
              <button
                onClick={onCloseModal}
                className='px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm md:text-base bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition'
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
