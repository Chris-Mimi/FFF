'use client';

import { Calendar, Clock, Edit2, Users } from 'lucide-react';
import { SessionDetails } from '@/hooks/coach/useSessionDetails';
import { padTime } from '@/lib/coach/modalStateHelpers';

interface SessionInfoPanelProps {
  session: SessionDetails;
  workoutDate: string;
  editingCapacity: boolean;
  editingTime: boolean;
  newCapacity: number;
  newTime: string;
  onCapacityEdit: (editing: boolean) => void;
  onTimeEdit: (editing: boolean) => void;
  onCapacityChange: (capacity: number) => void;
  onTimeChange: (time: string) => void;
  onUpdateCapacity: () => Promise<void>;
  onUpdateTime: () => Promise<void>;
}

export default function SessionInfoPanel({
  session,
  workoutDate,
  editingCapacity,
  editingTime,
  newCapacity,
  newTime,
  onCapacityEdit,
  onTimeEdit,
  onCapacityChange,
  onTimeChange,
  onUpdateCapacity,
  onUpdateTime,
}: SessionInfoPanelProps) {
  return (
    <div className='bg-gray-50 rounded-lg p-4'>
      <div className='grid grid-cols-2 gap-4'>
        {/* Row 1: Date and Time */}
        <div className='flex items-center gap-2 text-gray-700'>
          <Calendar size={18} />
          <span className='font-medium'>Date:</span>
          <span className='text-sm'>
            {new Date(workoutDate).toLocaleDateString('en-GB', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>

        <div className='flex items-center gap-2 text-gray-700'>
          <Clock size={18} />
          <span className='font-medium'>Time:</span>
          {editingTime ? (
            <div className='flex items-center gap-2'>
              <select
                value={newTime}
                onChange={e => onTimeChange(e.target.value)}
                className='px-2 py-1 border rounded bg-white text-gray-900 text-sm'
              >
                {/* Generate time options in 15-minute increments */}
                {Array.from({ length: 24 }, (_, hour) =>
                  [0, 15, 30, 45].map(minute => {
                    const timeString = `${hour.toString().padStart(2, '0')}:${minute
                      .toString()
                      .padStart(2, '0')}`;
                    return (
                      <option key={timeString} value={timeString}>
                        {timeString}
                      </option>
                    );
                  })
                ).flat()}
              </select>
              <button
                onClick={onUpdateTime}
                className='px-3 py-1 bg-[#208479] text-white rounded hover:bg-[#1a6b62] text-sm'
              >
                Save
              </button>
              <button
                onClick={() => {
                  onTimeEdit(false);
                  onTimeChange(padTime(session.time));
                }}
                className='px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm'
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <span>{session.time}</span>
              <button
                onClick={() => {
                  onTimeChange(padTime(session.time));
                  onTimeEdit(true);
                }}
                className='p-1 text-gray-500 hover:text-[#208479]'
                title='Change time'
              >
                <Edit2 size={16} />
              </button>
            </>
          )}
        </div>

        {/* Row 2: Capacity and Status */}
        <div className='flex items-center gap-2 text-gray-700'>
          <Users size={18} />
          <span className='font-medium'>Capacity:</span>
          {editingCapacity ? (
            <div className='flex flex-col gap-1'>
              <div className='flex items-center gap-2'>
                <input
                  type='number'
                  min='0'
                  value={newCapacity}
                  onChange={e => onCapacityChange(parseInt(e.target.value))}
                  className='w-20 px-2 py-1 border rounded text-sm'
                />
                <button
                  onClick={onUpdateCapacity}
                  className='px-3 py-1 bg-[#208479] text-white rounded hover:bg-[#1a6b62] text-sm'
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    onCapacityEdit(false);
                    onCapacityChange(session.capacity);
                  }}
                  className='px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm'
                >
                  Cancel
                </button>
              </div>
              <p className='text-xs text-gray-500'>0 = unlimited</p>
            </div>
          ) : (
            <>
              <span>{session.capacity === 0 ? 'Unlimited' : `${session.capacity} spots`}</span>
              <button
                onClick={() => onCapacityEdit(true)}
                className='p-1 text-gray-500 hover:text-[#208479]'
                title='Change capacity'
              >
                <Edit2 size={16} />
              </button>
            </>
          )}
        </div>

        <div className='flex items-center gap-2 text-gray-700'>
          <span className='font-medium'>Status:</span>
          <span
            className={`px-2 py-1 rounded text-sm ${
              session.status === 'published'
                ? 'bg-green-100 text-green-800'
                : session.status === 'cancelled'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-200 text-gray-700'
            }`}
          >
            {session.status}
          </span>
        </div>
      </div>
    </div>
  );
}
