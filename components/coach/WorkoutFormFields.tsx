'use client';

import { ChevronDown } from 'lucide-react';
import { WODFormData } from '@/hooks/coach/useWorkoutModal';

interface WorkoutFormFieldsProps {
  date: Date;
  formData: WODFormData;
  errors: Record<string, string>;
  workoutTitles: Array<{ id: string; name: string }>;
  tracks: Array<{ id: string; name: string; color?: string | null }>;
  otherSessions: Array<{ id: string; time: string; workout_id?: string | null }>;
  selectedSessionIds: Set<string>;
  applySessionsOpen: boolean;
  loadingTracks: boolean;
  onFieldChange: (field: keyof WODFormData, value: WODFormData[keyof WODFormData]) => void;
  onSessionSelectionToggle: (sessionId: string, checked: boolean) => void;
  onApplySessionsToggle: () => void;
}

export default function WorkoutFormFields({
  date,
  formData,
  errors,
  workoutTitles,
  tracks,
  otherSessions,
  selectedSessionIds,
  applySessionsOpen,
  loadingTracks,
  onFieldChange,
  onSessionSelectionToggle,
  onApplySessionsToggle,
}: WorkoutFormFieldsProps) {
  return (
    <>
      {/* Date Display */}
      <div className='bg-gray-50 p-3 rounded-lg'>
        <p className='text-sm text-gray-600'>Date</p>
        <p className='font-semibold text-gray-900'>
          {date.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* Session Type */}
      <div>
        <label className='block text-sm font-semibold mb-2 text-gray-900'>
          Session Type <span className='text-red-500'>*</span>
        </label>
        <div className='relative'>
          <input
            type='text'
            list='workout-titles'
            value={formData.title}
            onChange={e => onFieldChange('title', e.target.value)}
            placeholder='Select or type (e.g., WOD, Foundations, Kids & Teens)...'
            required
            maxLength={100}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900 placeholder-gray-400 ${
              errors.title ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          <datalist id='workout-titles'>
            {workoutTitles.map(wt => (
              <option key={wt.id} value={wt.name} />
            ))}
          </datalist>
        </div>
        {errors.title && <p className='text-red-500 text-sm mt-1'>{errors.title}</p>}
      </div>

      {/* Track */}
      <div>
        <label className='block text-sm font-semibold mb-2 text-gray-900'>Track</label>
        <select
          value={formData.track_id || ''}
          onChange={e => onFieldChange('track_id', e.target.value)}
          className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900 bg-white'
          disabled={loadingTracks}
        >
          <option value=''>Select Track...</option>
          {tracks.map(track => (
            <option key={track.id} value={track.id}>
              {track.name}
            </option>
          ))}
        </select>
      </div>

      {/* Max Capacity & Apply to Sessions */}
      <div>
        <div className='flex justify-between items-start gap-4'>
          <div className='flex-1'>
            <label className='block text-sm font-semibold mb-2 text-gray-900'>
              Max Capacity <span className='text-red-500'>*</span>
            </label>
            <input
              type='number'
              value={formData.maxCapacity}
              onChange={e => onFieldChange('maxCapacity', parseInt(e.target.value) || 0)}
              min='0'
              max='30'
              className={`w-32 px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900 ${
                errors.maxCapacity ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.maxCapacity && (
              <p className='text-red-500 text-sm mt-1'>{errors.maxCapacity}</p>
            )}
            <p className='text-xs text-gray-500 mt-1'>0 = unlimited capacity</p>
          </div>

          {/* Apply to Other Sessions Dropdown */}
          {otherSessions.length > 0 && (
            <div className='relative'>
              <button
                type='button'
                onClick={onApplySessionsToggle}
                className='mt-6 px-3 py-1.5 text-sm bg-white border-2 border-[#178da6] text-[#178da6] hover:bg-gray-50 rounded-lg flex items-center gap-2 transition'
                title='Apply this workout to other sessions'
              >
                <span>Apply to Sessions</span>
                {selectedSessionIds.size > 0 && (
                  <span className='bg-[#178da6] text-white text-xs px-1.5 py-0.5 rounded-full'>
                    {selectedSessionIds.size}
                  </span>
                )}
                <ChevronDown size={16} className={`transition-transform ${applySessionsOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {applySessionsOpen && (
                <div className='absolute right-0 mt-2 w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-50'>
                  <div className='p-3'>
                    <p className='text-xs text-gray-600 mb-3'>
                      Select existing sessions to apply this workout to:
                    </p>
                    <div className='space-y-2 max-h-48 overflow-y-auto'>
                      {otherSessions.map(session => (
                        <label key={session.id} className='flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded'>
                          <input
                            type='checkbox'
                            checked={selectedSessionIds.has(session.id)}
                            onChange={(e) => onSessionSelectionToggle(session.id, e.target.checked)}
                            className='w-4 h-4 text-[#178da6] focus:ring-[#178da6] rounded'
                          />
                          <span className='text-sm text-gray-700'>
                            {session.time}
                            {session.workout_id && <span className='text-gray-500 ml-2'>(has workout)</span>}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Workout Name Input */}
      <div>
        <label className='block text-sm font-semibold mb-2 text-gray-900'>
          Workout Name <span className='text-gray-500 text-xs font-normal'>(Optional)</span>
        </label>
        <input
          type='text'
          value={formData.workout_name || ''}
          onChange={e => onFieldChange('workout_name', e.target.value)}
          placeholder='e.g., "Overhead Fest", "Fran"'
          maxLength={100}
          className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900 placeholder-gray-400'
        />
        <p className='text-xs text-gray-500 mt-1'>
          Use for repeated workouts to track frequency accurately
        </p>
      </div>
    </>
  );
}
