'use client';

import { Trash2, X } from 'lucide-react';

interface DeleteWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReturnToEmpty: () => void;
  onPermanentDelete: () => void;
}

export default function DeleteWorkoutModal({
  isOpen,
  onClose,
  onReturnToEmpty,
  onPermanentDelete,
}: DeleteWorkoutModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className='fixed inset-0 bg-black/50 z-50' onClick={onClose} />

      {/* Modal */}
      <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
        <div className='bg-white rounded-lg shadow-2xl max-w-md w-full'>
          {/* Header */}
          <div className='bg-[#208479] text-white p-4 rounded-t-lg flex justify-between items-center'>
            <h2 className='text-xl font-bold'>Delete Workout</h2>
            <button
              onClick={onClose}
              className='hover:bg-[#1a6b62] p-1 rounded transition'
              aria-label='Close modal'
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className='p-6'>
            <p className='text-gray-700 mb-6'>
              Are you sure you want to delete this workout?
            </p>

            <div className='space-y-3'>
              {/* Return to Empty State */}
              <button
                onClick={onReturnToEmpty}
                className='w-full px-4 py-3 bg-[#208479] hover:bg-[#1a6b62] text-white rounded-lg font-medium transition flex items-center justify-center gap-2'
              >
                <span>Return Session to Empty State</span>
              </button>

              <p className='text-xs text-gray-500 text-center'>
                The workout will be removed but the session time slot will remain for rebooking.
              </p>

              <div className='border-t pt-3 mt-3'>
                <p className='text-sm font-semibold text-gray-700 mb-2'>
                  Or permanently delete:
                </p>

                {/* Permanent Delete */}
                <button
                  onClick={onPermanentDelete}
                  className='w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2'
                >
                  <Trash2 size={18} />
                  <span>Permanently Delete Workout</span>
                </button>

                <p className='text-xs text-red-600 text-center mt-2'>
                  ⚠️ This will completely remove the workout from the database. This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className='border-t p-4 bg-gray-50 rounded-b-lg flex justify-end'>
            <button
              onClick={onClose}
              className='px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 font-medium transition'
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
