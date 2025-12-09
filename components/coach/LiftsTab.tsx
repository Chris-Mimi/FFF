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

interface Lift {
  id: string;
  name: string;
  category: string;
  display_order: number;
}

interface LiftsTabProps {
  lifts: Lift[];
  onAdd: () => void;
  onEdit: (lift: Lift) => void;
  onDelete: (id: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
  // Modal props
  showModal: boolean;
  onCloseModal: () => void;
  editingLift: Lift | null;
  form: {
    name: string;
    category: string;
  };
  onFormChange: (field: string, value: string | number) => void;
  onSave: () => void;
}

const CATEGORY_ORDER = ['Olympic', 'Squat', 'Press', 'Pull'];

// Sortable Lift Card Component
function SortableLiftCard({
  lift,
  onEdit,
  onDelete,
}: {
  lift: Lift;
  onEdit: (lift: Lift) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lift.id });

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
      className='border border-gray-300 rounded-lg p-3 bg-blue-200 hover:bg-sky-300 hover:shadow-lg hover:z-10 transition-all group relative'
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
            onEdit(lift);
          }}
          className='p-1 text-blue-600 hover:bg-blue-50 rounded transition'
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(lift.id);
          }}
          className='p-1 text-red-600 hover:bg-red-50 rounded transition'
        >
          <Trash2 size={16} />
        </button>
      </div>
      <h3 className='text-base font-bold text-gray-900 mb-1'>{lift.name}</h3>
      <p className='text-sm text-gray-800'>{lift.category}</p>
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
          ? 'border-blue-500 bg-blue-100'
          : 'border-gray-300 bg-gray-50'
      }`}
    />
  );
}

export default function LiftsTab({
  lifts,
  onAdd,
  onEdit,
  onDelete,
  onDragEnd,
  showModal,
  onCloseModal,
  editingLift,
  form,
  onFormChange,
  onSave,
}: LiftsTabProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Calculate global grid size from ALL lifts
  const maxDisplayOrder = lifts.length > 0
    ? Math.max(...lifts.map(l => l.display_order))
    : 0;
  const totalSlots = Math.max(maxDisplayOrder + 10, 25); // At least 25 slots (5 rows)

  // Create a map of display_order to lift (global)
  const liftsByPosition = new Map(
    lifts.map(l => [l.display_order, l])
  );

  // Group lifts by category for display
  const liftsByCategory: Record<string, Lift[]> = {};
  lifts.forEach(lift => {
    if (!liftsByCategory[lift.category]) {
      liftsByCategory[lift.category] = [];
    }
    liftsByCategory[lift.category].push(lift);
  });

  // Sort categories by predefined order, then add any unrecognized categories
  const allCategories = Object.keys(liftsByCategory);
  const sortedCategories = [
    ...CATEGORY_ORDER.filter(cat => liftsByCategory[cat]),
    ...allCategories.filter(cat => !CATEGORY_ORDER.includes(cat)).sort()
  ];

  // Generate grid rows (5 per row, global)
  const rows: number[][] = [];
  for (let i = 1; i <= totalSlots; i += 5) {
    rows.push([i, i + 1, i + 2, i + 3, i + 4]);
  }

  return (
    <>
      <div className='bg-white rounded-lg shadow p-6'>
        <div className='flex justify-between items-center mb-6'>
          <div className='flex items-center gap-3'>
            <h2 className='text-xl font-bold text-gray-900'>Barbell Lifts</h2>
            <span className='px-3 py-1 bg-blue-300 text-gray-700 rounded-full text-sm font-semibold'>
              {lifts.length}
            </span>
          </div>
          <button
            onClick={onAdd}
            className='px-4 py-2 bg-sky-500 text-gray-100 rounded-lg hover:bg-blue-600 transition flex items-center gap-2'
          >
            <Plus size={20} />
            Add Lift
          </button>
        </div>

        {lifts.length === 0 ? (
          <div className='text-center py-8 text-gray-500'>
            No lifts yet. Click &quot;Add Lift&quot; to create one.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={lifts.map(l => l.id)}
              strategy={rectSortingStrategy}
            >
              <div className='space-y-2'>
                {rows.map((rowPositions, rowIndex) => (
                  <div key={`row-${rowIndex}`}>
                    <div className='grid grid-cols-5 gap-3'>
                      {rowPositions.map((position) => {
                        const lift = liftsByPosition.get(position);
                        if (lift) {
                          return (
                            <SortableLiftCard
                              key={lift.id}
                              lift={lift}
                              onEdit={onEdit}
                              onDelete={onDelete}
                            />
                          );
                        }
                        // Empty droppable cell
                        return <DroppableEmptyCell key={`empty-${position}`} position={position} />;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Lift Modal */}
      {showModal && (
        <div className='fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4' onClick={onCloseModal}>
          <div className='bg-gray-500 rounded-lg max-w-lg w-full p-6 shadow-2xl' onClick={(e) => e.stopPropagation()}>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-xl font-bold text-gray-100'>
                {editingLift ? 'Edit Lift' : 'Add Lift'}
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
                  placeholder='e.g., Back Squat, Deadlift'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-100 mb-1'>
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => onFormChange('category', e.target.value)}
                  className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent cursor-pointer'
                >
                  <option value='Olympic'>Olympic</option>
                  <option value='Squat'>Squat</option>
                  <option value='Press'>Press</option>
                  <option value='Pull'>Pull</option>
                </select>
              </div>
            </div>

            <div className='flex gap-3 mt-6'>
              <button
                onClick={onSave}
                className='flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition flex items-center justify-center gap-2'
              >
                <Save size={18} />
                {editingLift ? 'Update' : 'Create'}
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
