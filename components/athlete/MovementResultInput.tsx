import React from 'react';

type ResultFields = Record<string, unknown>;
type MovementResult = Record<string, unknown>;

type Movement = {
  id?: string;
  name?: string;
  description?: string;
  result_fields: ResultFields;
  category?: string;
  has_scaling?: boolean;
};

interface MovementResultInputProps {
  movement: Movement;
  value: Partial<MovementResult>;
  onChange: (result: Partial<MovementResult>) => void;
  resultKey: string;
}

/**
 * MovementResultInput - Dynamic input component for logging movement results
 *
 * Renders input fields based on movement.result_fields JSONB schema
 * Supports all 6 movement categories with appropriate color themes
 */
export function MovementResultInput({
  movement,
  value,
  onChange,
  resultKey
}: MovementResultInputProps) {
  const resultFields = movement.result_fields;

  // Get category-specific color theme
  const getThemeClasses = () => {
    switch (movement.category) {
      case 'lift':
        return 'bg-blue-50 text-blue-900 border-blue-300 focus:ring-blue-500';
      case 'benchmark':
        return 'bg-teal-50 text-teal-900 border-teal-300 focus:ring-[#178da6]';
      case 'forge_benchmark':
        return 'bg-cyan-50 text-cyan-900 border-cyan-300 focus:ring-cyan-500';
      case 'max_effort':
        return 'bg-amber-50 text-amber-900 border-amber-300 focus:ring-amber-500';
      case 'hold':
        return 'bg-purple-50 text-purple-900 border-purple-300 focus:ring-purple-500';
      case 'cardio':
        return 'bg-green-50 text-green-900 border-green-300 focus:ring-green-500';
      default:
        return 'bg-gray-50 text-gray-900 border-gray-300 focus:ring-gray-500';
    }
  };

  const getBorderColor = () => {
    switch (movement.category) {
      case 'lift': return 'border-blue-300';
      case 'benchmark': return 'border-teal-300';
      case 'forge_benchmark': return 'border-cyan-300';
      case 'max_effort': return 'border-amber-300';
      case 'hold': return 'border-purple-300';
      case 'cardio': return 'border-green-300';
      default: return 'border-gray-300';
    }
  };

  const themeClasses = getThemeClasses();
  const [bgColor] = themeClasses.split(' ');

  // Update handler - preserves existing fields and includes movement metadata
  const updateField = (field: keyof MovementResult, fieldValue: string | number) => {
    onChange({
      ...value,
      movement_id: movement.id,
      // Store metadata for API call (extended fields not in MovementResult type)
      ...(movement.name && { movement_name: movement.name }),
      ...(movement.category && { movement_category: movement.category }),
      [field]: fieldValue
    } as Partial<MovementResult>);
  };

  return (
    <div className={`text-xs ${bgColor} rounded px-2 py-1`}>
      <div className='flex items-start justify-between gap-2'>
        {/* Movement name and description */}
        <div className='flex-1'>
          <div className='font-semibold'>≡ {movement.name}</div>
          {movement.description && (
            <div className={`${movement.category === 'lift' ? 'text-blue-800' : movement.category === 'benchmark' ? 'text-teal-800' : movement.category === 'forge_benchmark' ? 'text-cyan-800' : movement.category === 'max_effort' ? 'text-amber-800' : movement.category === 'hold' ? 'text-purple-800' : 'text-green-800'} whitespace-pre-wrap mt-0.5 mb-1 text-xs`}>
              {movement.description}
            </div>
          )}
        </div>

        {/* Dynamic input fields based on result_fields */}
        <div className='flex items-center gap-2 ml-auto flex-wrap'>
          {/* Time input (mm:ss format) */}
          {!!(resultFields.time as boolean) && (
            <input
              type='text'
              placeholder='mm:ss'
              value={(value.time_result as string) || ''}
              onChange={(e) => updateField('time_result', e.target.value)}
              className={`w-20 px-2 py-1 text-xs border ${getBorderColor()} rounded focus:ring-2 focus:border-transparent text-gray-900`}
            />
          )}

          {/* Rounds input (for AMRAP) */}
          {!!(resultFields.rounds_reps as boolean) && (
            <>
              <input
                type='number'
                placeholder='rounds'
                value={(value.rounds_result as string) || ''}
                onChange={(e) => updateField('rounds_result', parseInt(e.target.value) || '')}
                className={`w-20 px-2 py-1 text-xs border ${getBorderColor()} rounded focus:ring-2 focus:border-transparent text-gray-900`}
              />
              <span className='text-xs'>+</span>
            </>
          )}

          {/* Reps input */}
          {!!(resultFields.reps || resultFields.rounds_reps) && (
            <input
              type='number'
              placeholder='reps'
              value={(value.reps_result as string) || ''}
              onChange={(e) => updateField('reps_result', parseInt(e.target.value) || '')}
              className={`w-20 px-2 py-1 text-xs border ${getBorderColor()} rounded focus:ring-2 focus:border-transparent text-gray-900`}
            />
          )}

          {/* Weight input (kg) */}
          {!!(resultFields.weight as boolean) && (
            <input
              type='number'
              step='0.5'
              placeholder='kg'
              value={(value.weight_result as string) || ''}
              onChange={(e) => updateField('weight_result', parseFloat(e.target.value) || '')}
              className={`w-20 px-2 py-1 text-xs border ${getBorderColor()} rounded focus:ring-2 focus:border-transparent text-gray-900`}
            />
          )}

          {/* Distance input (meters) */}
          {!!(resultFields.distance_meters as boolean) && (
            <input
              type='number'
              step='0.1'
              placeholder='meters'
              value={(value.distance_result as string) || ''}
              onChange={(e) => updateField('distance_result', parseFloat(e.target.value) || '')}
              className={`w-24 px-2 py-1 text-xs border ${getBorderColor()} rounded focus:ring-2 focus:border-transparent text-gray-900`}
            />
          )}

          {/* Duration input (seconds for holds) */}
          {!!(resultFields.duration_seconds as boolean) && (
            <input
              type='number'
              placeholder='seconds'
              value={(value.duration_seconds as string) || ''}
              onChange={(e) => updateField('duration_seconds', parseInt(e.target.value) || '')}
              className={`w-20 px-2 py-1 text-xs border ${getBorderColor()} rounded focus:ring-2 focus:border-transparent text-gray-900`}
            />
          )}

          {/* Scaling dropdown */}
          {!!(resultFields.scaling as boolean) && (movement.has_scaling ?? true) && (
            <select
              value={(value.scaling_level as string) || 'Rx'}
              onChange={(e) => updateField('scaling_level', e.target.value as 'Rx' | 'Sc1' | 'Sc2' | 'Sc3')}
              className={`px-2 py-1 text-xs border ${getBorderColor()} rounded focus:ring-2 focus:border-transparent text-gray-900`}
            >
              <option value='Rx'>Rx</option>
              <option value='Sc1'>Sc1</option>
              <option value='Sc2'>Sc2</option>
              <option value='Sc3'>Sc3</option>
            </select>
          )}
        </div>
      </div>
    </div>
  );
}
