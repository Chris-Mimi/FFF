'use client';

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
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
      style={style}
      {...attributes}
      className='border border-gray-300 rounded-lg p-3 bg-cyan-200 hover:bg-cyan-300 hover:shadow-lg hover:z-10 transition-all group relative'
    >
      {/* Drag Handle */}
      <div
        {...listeners}
        className='absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600'
      >
        <GripVertical size={18} />
      </div>

      {/* Edit/Delete Buttons */}
      <div className='absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition'>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(forge);
          }}
          className='p-1 text-blue-600 hover:bg-blue-50 rounded transition'
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(forge.id);
          }}
          className='p-1 text-red-600 hover:bg-red-50 rounded transition'
        >
          <Trash2 size={16} />
        </button>
      </div>
      <h3 className='text-base font-bold text-gray-900 mb-1'>{forge.name}</h3>
      <p className='text-sm text-gray-800 mb-1'>{forge.type}</p>
      {forge.description && (
        <p className='text-xs text-gray-700 line-clamp-2 group-hover:line-clamp-none'>{forge.description}</p>
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
      className={`border border-dashed rounded-lg p-3 min-h-[100px] transition-colors ${
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
    useSensor(PointerSensor),
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
      <div className='bg-white rounded-lg shadow p-6'>
        <div className='flex justify-between items-center mb-4'>
          <div className='flex items-center gap-3'>
            <h2 className='text-xl font-bold text-gray-900'>Forge Benchmarks</h2>
            <span className='px-3 py-1 bg-cyan-300 text-gray-700 rounded-full text-sm font-semibold'>
              {forgeBenchmarks.length}
            </span>
          </div>
          <button
            onClick={onAdd}
            className='px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition flex items-center gap-2'
          >
            <Plus size={20} />
            Add Forge Benchmark
          </button>
        </div>

        {forgeBenchmarks.length === 0 ? (
          <div className='text-center py-8 text-gray-500'>
            No Forge benchmarks yet. Click &quot;Add Forge Benchmark&quot; to create one.
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
              <div className='space-y-2'>
                {rows.map((rowPositions, rowIndex) => (
                  <div key={`row-${rowIndex}`}>
                    <div className='grid grid-cols-5 gap-3'>
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
                    <div className='flex justify-center mt-1'>
                      <button
                        onClick={() => onInsertRow(rowPositions[4])}
                        className='text-xs text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 px-3 py-1 rounded transition'
                      >
                        + Insert Row Below
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
        <div className='fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4' onClick={onCloseModal}>
          <div className='bg-gray-500 rounded-lg max-w-lg w-full p-6 shadow-2xl' onClick={(e) => e.stopPropagation()}>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-xl font-bold text-gray-100'>
                {editingForge ? 'Edit Forge Benchmark' : 'Add Forge Benchmark'}
              </h3>
              <button
                onClick={onCloseModal}
                className='p-1 hover:bg-gray-100 rounded'
              >
                <X size={24} />
              </button>
            </div>

            <div className='space-y-4'>
              {/* Template Selection (only show when creating new) */}
              {!editingForge && (
                <div className='bg-gray-600 rounded-lg p-4 border-2 border-teal-500'>
                  <label className='block text-sm font-semibold text-gray-100 mb-2'>
                    Start from template (optional)
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 cursor-pointer'
                  >
                    <option value=''>None - Start from scratch</option>
                    {allForgeBenchmarks.map((forge) => (
                      <option key={forge.id} value={forge.id}>
                        {forge.name}
                      </option>
                    ))}
                  </select>
                  {selectedTemplate && (
                    <p className='text-xs text-gray-300 mt-2'>
                      ✓ Template loaded. All fields copied except name. Enter a new name to create your Forge Benchmark.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className='block text-sm font-medium text-gray-100 mb-1'>
                  Name
                </label>
                <input
                  type='text'
                  value={form.name}
                  onChange={(e) => onFormChange('name', e.target.value)}
                  className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
                  placeholder='e.g., Forge Friday, The Grind'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-100 mb-1'>
                  Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) => onFormChange('type', e.target.value)}
                  className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent cursor-pointer'
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
                <label className='block text-sm font-medium text-gray-100 mb-1'>
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => onFormChange('description', e.target.value)}
                  rows={4}
                  className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
                  placeholder='Workout details'
                />
              </div>

              <div className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  id='forge_has_scaling'
                  checked={form.has_scaling}
                  onChange={(e) => onFormChange('has_scaling', e.target.checked)}
                  className='w-4 h-4 text-teal-600 bg-white border-gray-300 rounded focus:ring-teal-500'
                />
                <label htmlFor='forge_has_scaling' className='text-sm font-medium text-gray-100 cursor-pointer'>
                  Has Scaling Options (Rx/Sc1/Sc2/Sc3)
                </label>
              </div>
            </div>

            <div className='flex gap-3 mt-6'>
              <button
                onClick={onSave}
                className='flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition flex items-center justify-center gap-2'
              >
                <Save size={18} />
                {editingForge ? 'Update' : 'Create'}
              </button>
              <button
                onClick={onCloseModal}
                className='px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition'
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
