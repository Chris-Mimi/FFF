'use client';

import { useState } from 'react';
import { ChevronDown, Edit2, Plus, Trash2 } from 'lucide-react';

interface Track {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
}

interface TrackManagementSectionProps {
  tracks: Track[];
  loading: boolean;
  onAddTrack: () => void;
  onEditTrack: (track: Track) => void;
  onDeleteTrack: (trackId: string) => void;
}

export default function TrackManagementSection({
  tracks,
  loading,
  onAddTrack,
  onEditTrack,
  onDeleteTrack,
}: TrackManagementSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className='bg-gray-600 rounded-lg shadow p-5'>
      <div className='flex justify-between items-center mb-4'>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className='flex items-center gap-2 text-lg font-bold text-gray-100 hover:text-white transition'
        >
          <ChevronDown
            size={20}
            className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
          Manage Tracks
        </button>
        <button
          onClick={onAddTrack}
          className='px-3 py-1.5 bg-[#208479] hover:bg-[#1a6b62] text-white font-semibold rounded-lg flex items-center gap-2 transition text-sm'
        >
          <Plus size={16} />
          Add Track
        </button>
      </div>

      {isExpanded && (
        loading ? (
          <p className='text-gray-500 text-sm'>Loading...</p>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3'>
            {tracks.map(track => (
              <div
                key={track.id}
                className='border border-gray-300 bg-gray-200 rounded-lg p-3 hover:shadow-md transition'
              >
                <div className='flex items-start justify-between mb-1'>
                  <div className='flex items-center gap-2'>
                    <div
                      className='w-3 h-3 rounded-full'
                      style={{ backgroundColor: track.color || '#206d84ff' }}
                    />
                    <h3 className='font-bold text-gray-700 text-sm'>{track.name}</h3>
                  </div>
                  <div className='flex gap-1'>
                    <button
                      onClick={() => onEditTrack(track)}
                      className='text-[#208479] hover:text-orange-400 p-1'
                      aria-label='Edit track'
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => onDeleteTrack(track.id)}
                      className='text-gray-600 hover:text-red-500 p-1'
                      aria-label='Delete track'
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {track.description && (
                  <p className='text-xs text-gray-600'>{track.description}</p>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
