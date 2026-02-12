'use client';

import { Track } from '@/hooks/coach/useTracksCrud';

interface TracksTabProps {
  tracks: Track[];
  loadingTracks: boolean;
  showTrackModal: boolean;
  editingTrack: Track | null;
  trackFormData: { name: string; description: string; color: string };
  onAdd: () => void;
  onEdit: (track: Track) => void;
  onDelete: (trackId: string) => void;
  onSave: () => void;
  onCloseModal: () => void;
  onFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export default function TracksTab({
  tracks,
  loadingTracks,
  showTrackModal,
  editingTrack,
  trackFormData,
  onAdd,
  onEdit,
  onDelete,
  onSave,
  onCloseModal,
  onFormChange,
}: TracksTabProps) {
  return (
    <div className='space-y-4'>
      <div className='flex justify-between items-center'>
        <h2 className='text-2xl font-bold text-gray-900'>Tracks</h2>
        <button
          onClick={onAdd}
          className='px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700'
        >
          Add Track
        </button>
      </div>

      {loadingTracks ? (
        <div className='text-center py-8 text-gray-500'>Loading tracks...</div>
      ) : tracks.length === 0 ? (
        <div className='text-center py-8 text-gray-500'>
          No tracks yet. Click &quot;Add Track&quot; to create one.
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
          {tracks.map(track => (
            <div
              key={track.id}
              className='bg-white rounded-lg p-4 border-2 hover:shadow-md transition'
              style={{ borderColor: track.color || '#178da6' }}
            >
              <div className='flex justify-between items-start mb-2'>
                <h3 className='font-semibold text-gray-900'>{track.name}</h3>
                <div className='flex gap-2'>
                  <button
                    onClick={() => onEdit(track)}
                    className='text-sm text-blue-600 hover:text-blue-800'
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(track.id)}
                    className='text-sm text-red-600 hover:text-red-800'
                  >
                    Delete
                  </button>
                </div>
              </div>
              {track.description && (
                <p className='text-sm text-gray-600'>{track.description}</p>
              )}
              <div
                className='mt-2 h-2 rounded'
                style={{ backgroundColor: track.color || '#178da6' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Track Modal */}
      {showTrackModal && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
          <div className='bg-white text-gray-900 rounded-lg p-6 w-full max-w-md'>
            <h3 className='text-xl font-bold mb-4'>
              {editingTrack ? 'Edit Track' : 'Add New Track'}
            </h3>

            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Name <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  name='name'
                  value={trackFormData.name}
                  onChange={onFormChange}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg bg-white'
                  placeholder='e.g., Strength, Olympic Lifting'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Description
                </label>
                <textarea
                  name='description'
                  value={trackFormData.description}
                  onChange={onFormChange}
                  rows={3}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg bg-white'
                  placeholder='Optional description...'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Color
                </label>
                <input
                  type='color'
                  name='color'
                  value={trackFormData.color}
                  onChange={onFormChange}
                  className='w-full h-10 border border-gray-300 rounded-lg bg-white'
                />
              </div>
            </div>

            <div className='flex gap-3 mt-6'>
              <button
                onClick={onSave}
                className='flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700'
              >
                Save
              </button>
              <button
                onClick={onCloseModal}
                className='flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400'
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
