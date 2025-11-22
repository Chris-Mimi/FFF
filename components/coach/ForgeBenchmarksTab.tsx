'use client';

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Edit2, GripVertical, Plus, Save, Trash2, X } from 'lucide-react';

interface Benchmark {
  id: string;
  name: string;
  type: string;
  description: string | null;
  display_order: number;
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

interface ForgeBenchmarksTabProps {
  forgeBenchmarks: Benchmark[];
  onAdd: () => void;
  onEdit: (forge: Benchmark) => void;
  onDelete: (id: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
  // Modal props
  showModal: boolean;
  onCloseModal: () => void;
  editingForge: Benchmark | null;
  form: {
    name: string;
    type: string;
    description: string;
    display_order: number;
  };
  onFormChange: (field: string, value: string | number) => void;
  onSave: () => void;
}

export default function ForgeBenchmarksTab({
  forgeBenchmarks,
  onAdd,
  onEdit,
  onDelete,
  onDragEnd,
  showModal,
  onCloseModal,
  editingForge,
  form,
  onFormChange,
  onSave,
}: ForgeBenchmarksTabProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
              <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3'>
                {forgeBenchmarks.map((forge) => (
                  <SortableForgeCard
                    key={forge.id}
                    forge={forge}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
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
                >
                  <option value='For Time'>For Time</option>
                  <option value='AMRAP'>AMRAP</option>
                  <option value='EMOM'>EMOM</option>
                  <option value='Max Reps'>Max Reps</option>
                  <option value='Max Weight'>Max Weight</option>
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

              <div>
                <label className='block text-sm font-medium text-gray-100 mb-1'>
                  Display Order
                </label>
                <input
                  type='number'
                  value={form.display_order}
                  onChange={(e) => onFormChange('display_order', parseInt(e.target.value) || 0)}
                  className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
                />
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
