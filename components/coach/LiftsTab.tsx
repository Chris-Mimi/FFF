'use client';

import { Edit2, Plus, Save, Trash2, X } from 'lucide-react';

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
  // Modal props
  showModal: boolean;
  onCloseModal: () => void;
  editingLift: Lift | null;
  form: {
    name: string;
    category: string;
    display_order: number;
  };
  onFormChange: (field: string, value: string | number) => void;
  onSave: () => void;
}

export default function LiftsTab({
  lifts,
  onAdd,
  onEdit,
  onDelete,
  showModal,
  onCloseModal,
  editingLift,
  form,
  onFormChange,
  onSave,
}: LiftsTabProps) {
  return (
    <>
      <div className='bg-white rounded-lg shadow p-6'>
        <div className='flex justify-between items-center mb-4'>
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

        <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3'>
          {lifts.map((lift) => (
            <div
              key={lift.id}
              className='border border-gray-300 rounded-lg p-3 bg-blue-200 hover:bg-sky-300 hover:shadow-lg hover:z-10 transition-all group relative'
            >
              <div className='absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition'>
                <button
                  onClick={() => onEdit(lift)}
                  className='p-1 text-blue-600 hover:bg-blue-50 rounded transition'
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => onDelete(lift.id)}
                  className='p-1 text-red-600 hover:bg-red-50 rounded transition'
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <h3 className='text-base font-bold text-gray-900 mb-1'>{lift.name}</h3>
              <p className='text-sm text-gray-800'>{lift.category}</p>
            </div>
          ))}

          {lifts.length === 0 && (
            <div className='text-center py-8 text-gray-500'>
              No lifts yet. Click &quot;Add Lift&quot; to create one.
            </div>
          )}
        </div>
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
                  <option value='Squat'>Squat</option>
                  <option value='Pull'>Pull</option>
                  <option value='Press'>Press</option>
                  <option value='Olympic'>Olympic</option>
                </select>
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
