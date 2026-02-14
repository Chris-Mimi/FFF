'use client';

import { Edit2, Plus, Save, Trash2, X } from 'lucide-react';
import { FocusTrap } from '@/components/ui/FocusTrap';

interface Benchmark {
  id: string;
  name: string;
  type: string;
  description: string | null;
  display_order: number;
}

interface BenchmarksTabProps {
  benchmarks: Benchmark[];
  onAdd: () => void;
  onEdit: (benchmark: Benchmark) => void;
  onDelete: (id: string) => void;
  // Modal props
  showModal: boolean;
  onCloseModal: () => void;
  editingBenchmark: Benchmark | null;
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

export default function BenchmarksTab({
  benchmarks,
  onAdd,
  onEdit,
  onDelete,
  showModal,
  onCloseModal,
  editingBenchmark,
  form,
  onFormChange,
  onSave,
  workoutTypes,
  loadingWorkoutTypes,
}: BenchmarksTabProps) {
  return (
    <>
      <div className='bg-white rounded-lg shadow p-6'>
        <div className='flex justify-between items-center mb-4'>
          <div className='flex items-center gap-3'>
            <h2 className='text-xl font-bold text-gray-900'>Benchmark Workouts</h2>
            <span className='px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-semibold'>
              {benchmarks.length}
            </span>
          </div>
          <button
            onClick={onAdd}
            className='px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition flex items-center gap-2'
          >
            <Plus size={20} />
            Add Benchmark
          </button>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3'>
          {benchmarks.map((benchmark) => (
            <div
              key={benchmark.id}
              className='border border-gray-300 rounded-lg p-3 bg-teal-100 hover:bg-teal-200 hover:shadow-lg hover:z-10 transition-all group relative'
            >
              <div className='absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition'>
                <button
                  onClick={() => onEdit(benchmark)}
                  className='p-1 text-blue-600 hover:bg-blue-50 rounded transition'
                  aria-label='Edit benchmark'
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => onDelete(benchmark.id)}
                  className='p-1 text-red-600 hover:bg-red-50 rounded transition'
                  aria-label='Delete benchmark'
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <h3 className='text-base font-bold text-gray-900 mb-1'>{benchmark.name}</h3>
              <p className='text-sm text-gray-800 mb-1'>{benchmark.type}</p>
              {benchmark.description && (
                <p className='text-xs text-gray-700 line-clamp-2 group-hover:line-clamp-none'>{benchmark.description}</p>
              )}
            </div>
          ))}

          {benchmarks.length === 0 && (
            <div className='text-center py-8 text-gray-500'>
              No benchmarks yet. Click &quot;Add Benchmark&quot; to create one.
            </div>
          )}
        </div>
      </div>

      {/* Benchmark Modal */}
      {showModal && (
        <FocusTrap>
        <div className='fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4'>
          <div className='bg-gray-500 rounded-lg max-w-lg w-full p-6 shadow-2xl' onClick={(e) => e.stopPropagation()}>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-xl font-bold text-gray-100'>
                {editingBenchmark ? 'Edit Benchmark' : 'Add Benchmark'}
              </h3>
              <button
                onClick={onCloseModal}
                className='p-1 hover:bg-gray-100 rounded'
                aria-label='Close'
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
                  placeholder='e.g., Fran, Helen, Murph'
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
                  placeholder='Workout details (e.g., 21-15-9 Thrusters & Pull-ups)'
                />
              </div>

              <div className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  id='has_scaling'
                  checked={form.has_scaling}
                  onChange={(e) => onFormChange('has_scaling', e.target.checked)}
                  className='w-4 h-4 text-teal-600 bg-white border-gray-300 rounded focus:ring-teal-500'
                />
                <label htmlFor='has_scaling' className='text-sm font-medium text-gray-100 cursor-pointer'>
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
                {editingBenchmark ? 'Update' : 'Create'}
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
        </FocusTrap>
      )}
    </>
  );
}
