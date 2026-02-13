'use client';

import { useEffect } from 'react';

interface Track {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
}

interface TrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTrack: Track | null;
  formData: {
    name: string;
    description: string;
    color: string;
  };
  onFormChange: (field: string, value: string) => void;
  onSave: () => void;
}

export default function TrackModal({
  isOpen,
  onClose,
  editingTrack,
  formData,
  onFormChange,
  onSave,
}: TrackModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-lg shadow-2xl w-full max-w-md'>
        <div className='bg-[#178da6] text-white p-4 rounded-t-lg'>
          <h3 className='text-xl font-bold'>{editingTrack ? 'Edit Track' : 'Add New Track'}</h3>
        </div>

        <div className='p-6 space-y-4'>
          <div>
            <label className='block text-sm font-semibold mb-2 text-gray-900'>
              Track Name <span className='text-red-500'>*</span>
            </label>
            <input
              type='text'
              value={formData.name}
              onChange={e => onFormChange('name', e.target.value)}
              placeholder='e.g., Strength Focus'
              required
              maxLength={100}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
            />
          </div>

          <div>
            <label className='block text-sm font-semibold mb-2 text-gray-900'>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={e => onFormChange('description', e.target.value)}
              placeholder='Brief description of this track...'
              rows={3}
              maxLength={500}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
            />
          </div>

          <div>
            <label className='block text-sm font-semibold mb-2 text-gray-900'>Color</label>
            <input
              type='color'
              value={formData.color}
              onChange={e => onFormChange('color', e.target.value)}
              className='w-full h-12 border border-gray-300 rounded-lg cursor-pointer'
            />
          </div>
        </div>

        <div className='flex gap-3 p-6 border-t'>
          <button
            onClick={onClose}
            className='flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition'
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!formData.name.trim()}
            className='flex-1 px-6 py-3 bg-[#178da6] hover:bg-[#14758c] text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {editingTrack ? 'Save Changes' : 'Add Track'}
          </button>
        </div>
      </div>
    </div>
  );
}
