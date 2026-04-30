'use client';

import { WODFormData } from '@/hooks/coach/useWorkoutModal';

interface WorkoutFormFieldsProps {
  date: Date;
  formData: WODFormData;
  errors: Record<string, string>;
  workoutTitles: Array<{ id: string; name: string }>;
  tracks: Array<{ id: string; name: string; color?: string | null }>;
  loadingTracks: boolean;
  onFieldChange: (field: keyof WODFormData, value: WODFormData[keyof WODFormData]) => void;
}

export default function WorkoutFormFields({
  date,
  formData,
  errors,
  workoutTitles,
  tracks,
  loadingTracks,
  onFieldChange,
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

      {/* Max Capacity */}
      <div>
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

      {/* Workout Name Input */}
      <div>
        <label className='block text-sm font-semibold mb-2 text-gray-900'>
          Workout Name
        </label>
        <input
          type='text'
          value={formData.workout_name || ''}
          onChange={e => onFieldChange('workout_name', e.target.value)}
          placeholder='e.g., "Overhead Fest", "Fran"'
          maxLength={100}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900 placeholder-gray-400 ${
            errors.workout_name ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.workout_name && <p className='text-red-500 text-sm mt-1'>{errors.workout_name}</p>}
      </div>
    </>
  );
}
