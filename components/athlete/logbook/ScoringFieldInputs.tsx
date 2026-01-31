'use client';

/**
 * ScoringFieldInputs - Reusable scoring input component
 *
 * Renders configurable scoring inputs based on scoring_fields configuration.
 * Used across: content sections, lifts, benchmarks, forge benchmarks.
 *
 * Eliminates ~600 lines of duplicated input logic.
 */

interface ScoringFieldInputsProps {
  scoringFields: {
    time?: boolean;
    rounds_reps?: boolean;
    reps?: boolean;
    load?: boolean;
    calories?: boolean;
    metres?: boolean;
    checkbox?: boolean;
    scaling?: boolean;
  };
  values: {
    time_result?: string;
    rounds_result?: string;
    reps_result?: string;
    weight_result?: string;
    calories_result?: string;
    metres_result?: string;
    task_completed?: boolean;
    scaling_level?: 'Rx' | 'Sc1' | 'Sc2' | 'Sc3' | '';
  };
  onChange: (updates: Partial<ScoringFieldInputsProps['values']>) => void;
  variant?: 'default' | 'lift' | 'benchmark' | 'forge';
  showLabel?: boolean;
}

export default function ScoringFieldInputs({
  scoringFields,
  values,
  onChange,
  variant = 'default',
  showLabel = true,
}: ScoringFieldInputsProps) {
  // Determine border and text colors based on variant
  const getBorderColor = () => {
    switch (variant) {
      case 'lift':
        return 'border-blue-300';
      case 'benchmark':
        return 'border-teal-300';
      case 'forge':
        return 'border-cyan-300';
      default:
        return 'border-gray-300';
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'lift':
        return 'text-blue-700';
      case 'benchmark':
        return 'text-teal-700';
      case 'forge':
        return 'text-cyan-700';
      default:
        return 'text-gray-600';
    }
  };

  const borderColor = getBorderColor();
  const textColor = getTextColor();

  // Check if any field is enabled
  const hasAnyEnabledField = Object.values(scoringFields).some(v => v === true);
  if (!hasAnyEnabledField) return null;

  return (
    <div className='flex items-center gap-2 ml-auto flex-wrap'>
      {showLabel && (
        <span className='text-xs font-medium text-gray-600'>Result:</span>
      )}

      {/* Time Input */}
      {scoringFields.time && (
        <input
          type='text'
          placeholder='mm:ss'
          value={values.time_result || ''}
          onChange={(e) => onChange({ time_result: e.target.value })}
          className={`w-16 px-2 py-1 text-xs text-center border ${borderColor} rounded focus:ring-2 focus:ring-[#208479] text-gray-900`}
        />
      )}

      {/* Rounds + Reps Input */}
      {scoringFields.rounds_reps && (
        <>
          <div className='flex items-center gap-1'>
            <input
              type='number'
              placeholder='Rounds'
              value={values.rounds_result || ''}
              onChange={(e) => onChange({ rounds_result: e.target.value })}
              className={`w-14 px-2 py-1 text-xs text-center border ${borderColor} rounded focus:ring-2 focus:ring-[#208479] text-gray-900`}
            />
            <span className={`text-xs ${textColor}`}>rds</span>
          </div>
          <span className='text-xs'>+</span>
        </>
      )}

      {/* Reps Input */}
      {(scoringFields.reps || scoringFields.rounds_reps) && (
        <div className='flex items-center gap-1'>
          <input
            type='number'
            placeholder='Reps'
            value={values.reps_result || ''}
            onChange={(e) => onChange({ reps_result: e.target.value })}
            className={`w-16 px-2 py-1 text-xs text-center border ${borderColor} rounded focus:ring-2 focus:ring-[#208479] text-gray-900`}
          />
          <span className={`text-xs ${textColor}`}>reps</span>
        </div>
      )}

      {/* Load/Weight Input */}
      {scoringFields.load && (
        <div className='flex items-center gap-1'>
          <input
            type='number'
            step='0.5'
            placeholder='Load'
            value={values.weight_result || ''}
            onChange={(e) => onChange({ weight_result: e.target.value })}
            className={`w-16 px-2 py-1 text-xs text-center border ${borderColor} rounded focus:ring-2 focus:ring-[#208479] text-gray-900`}
          />
          <span className={`text-xs ${textColor}`}>kg</span>
        </div>
      )}

      {/* Calories Input */}
      {scoringFields.calories && (
        <div className='flex items-center gap-1'>
          <input
            type='number'
            placeholder='Cal'
            value={values.calories_result || ''}
            onChange={(e) => onChange({ calories_result: e.target.value })}
            className={`w-16 px-2 py-1 text-xs text-center border ${borderColor} rounded focus:ring-2 focus:ring-[#208479] text-gray-900`}
          />
          <span className={`text-xs ${textColor}`}>cal</span>
        </div>
      )}

      {/* Metres/Distance Input */}
      {scoringFields.metres && (
        <div className='flex items-center gap-1'>
          <input
            type='number'
            step='0.1'
            placeholder='Distance'
            value={values.metres_result || ''}
            onChange={(e) => onChange({ metres_result: e.target.value })}
            className={`w-20 px-2 py-1 text-xs text-center border ${borderColor} rounded focus:ring-2 focus:ring-[#208479] text-gray-900`}
          />
          <span className={`text-xs ${textColor}`}>m</span>
        </div>
      )}

      {/* Checkbox Input */}
      {scoringFields.checkbox && (
        <label className='flex items-center gap-1 text-xs'>
          <input
            type='checkbox'
            checked={values.task_completed || false}
            onChange={(e) => onChange({ task_completed: e.target.checked })}
            className='rounded border-gray-300'
          />
          <span>✓</span>
        </label>
      )}

      {/* Scaling Dropdown */}
      {scoringFields.scaling && (
        <select
          value={values.scaling_level || ''}
          onChange={(e) => onChange({ scaling_level: e.target.value as 'Rx' | 'Sc1' | 'Sc2' | 'Sc3' | '' })}
          className={`w-14 px-1 py-0.5 text-xs border ${borderColor} rounded focus:ring-2 focus:ring-[#208479] text-gray-900 bg-white`}
        >
          <option value=''>-</option>
          <option value='Rx'>Rx</option>
          <option value='Sc1'>Sc1</option>
          <option value='Sc2'>Sc2</option>
          <option value='Sc3'>Sc3</option>
        </select>
      )}
    </div>
  );
}
