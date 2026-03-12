'use client';

import { useState, useEffect } from 'react';

/**
 * ScoringFieldInputs - Reusable scoring input component
 *
 * Renders configurable scoring inputs based on scoring_fields configuration.
 * Used across: content sections, lifts, benchmarks, forge benchmarks.
 *
 * For Time workouts (time + reps/rounds_reps): shows mutually exclusive toggle.
 */

interface ScoringFieldInputsProps {
  scoringFields: {
    time?: boolean;
    max_time?: boolean;
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
  // Detect "For Time with cap" scenario: time + (reps or rounds_reps)
  const isForTimeWithCap = !!scoringFields.time && (!!scoringFields.reps || !!scoringFields.rounds_reps);

  // Derive initial mode from existing values
  const deriveMode = (): 'finished' | 'cap' | null => {
    if (!isForTimeWithCap) return null;
    const hasTime = !!(values.time_result && values.time_result.trim());
    const hasReps = !!(values.reps_result && values.reps_result.trim());
    const hasRounds = !!(values.rounds_result && values.rounds_result.trim());
    if (hasTime) return 'finished';
    if (hasReps || hasRounds) return 'cap';
    return null;
  };

  const [forTimeMode, setForTimeMode] = useState<'finished' | 'cap' | null>(deriveMode);

  // Sync mode when values change externally (e.g. loading saved data)
  useEffect(() => {
    if (!isForTimeWithCap) return;
    const derived = deriveMode();
    if (derived && !forTimeMode) {
      setForTimeMode(derived);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.time_result, values.reps_result, values.rounds_result]);

  const handleModeSwitch = (mode: 'finished' | 'cap') => {
    setForTimeMode(mode);
    if (mode === 'finished') {
      // Clear reps/rounds when switching to time
      onChange({ rounds_result: '', reps_result: '' });
    } else {
      // Clear time when switching to cap
      onChange({ time_result: '' });
    }
  };

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

  // Should show time input?
  const showTime = isForTimeWithCap ? forTimeMode === 'finished' : (scoringFields.time || scoringFields.max_time);
  // Should show reps/rounds inputs?
  const showCapFields = isForTimeWithCap ? forTimeMode === 'cap' : false;

  return (
    <div className='flex items-center gap-2 ml-auto flex-wrap'>
      {showLabel && (
        <span className='text-xs font-medium text-gray-600'>Result:</span>
      )}

      {/* Scaling Dropdown — always first when enabled */}
      {scoringFields.scaling && (
        <select
          value={values.scaling_level || ''}
          onChange={(e) => onChange({ scaling_level: e.target.value as 'Rx' | 'Sc1' | 'Sc2' | 'Sc3' | '' })}
          className={`w-14 px-1 py-0.5 text-xs border ${borderColor} rounded focus:ring-2 focus:ring-[#178da6] text-gray-900 bg-white`}
        >
          <option value=''>-</option>
          <option value='Rx'>Rx</option>
          <option value='Sc1'>Sc1</option>
          <option value='Sc2'>Sc2</option>
          <option value='Sc3'>Sc3</option>
        </select>
      )}

      {/* For Time toggle: Finished vs Time Cap */}
      {isForTimeWithCap && (
        <div className='flex rounded overflow-hidden border border-gray-300 text-[10px] font-medium'>
          <button
            type='button'
            onClick={() => handleModeSwitch('finished')}
            className={`px-2 py-1 transition-colors ${
              forTimeMode === 'finished'
                ? 'bg-teal-600 text-white'
                : 'bg-white text-gray-500 hover:bg-gray-100'
            }`}
          >
            Time
          </button>
          <button
            type='button'
            onClick={() => handleModeSwitch('cap')}
            className={`px-2 py-1 transition-colors border-l border-gray-300 ${
              forTimeMode === 'cap'
                ? 'bg-amber-500 text-white'
                : 'bg-white text-gray-500 hover:bg-gray-100'
            }`}
          >
            Cap
          </button>
        </div>
      )}

      {/* Time Input (For Time or Max Time) — shown when not in "cap" mode */}
      {showTime && (
        <input
          type='text'
          placeholder='mm:ss'
          maxLength={8}
          pattern='[0-9:]*'
          value={values.time_result || ''}
          onChange={(e) => onChange({ time_result: e.target.value })}
          className={`w-16 px-2 py-1 text-xs text-center border ${borderColor} rounded focus:ring-2 focus:ring-[#178da6] text-gray-900`}
        />
      )}

      {/* Max Time Input (standalone, not part of For Time toggle) */}
      {!isForTimeWithCap && scoringFields.max_time && (
        <input
          type='text'
          placeholder='mm:ss'
          maxLength={8}
          pattern='[0-9:]*'
          value={values.time_result || ''}
          onChange={(e) => onChange({ time_result: e.target.value })}
          className={`w-16 px-2 py-1 text-xs text-center border ${borderColor} rounded focus:ring-2 focus:ring-[#178da6] text-gray-900`}
        />
      )}

      {/* Rounds + Reps Input — For Time cap mode OR standalone rounds_reps */}
      {(showCapFields || (!isForTimeWithCap && scoringFields.rounds_reps)) && scoringFields.rounds_reps && (
        <>
          <div className='flex items-center gap-1'>
            <input
              type='number'
              placeholder='Rounds'
              min='0'
              max='999'
              value={values.rounds_result || ''}
              onChange={(e) => onChange({ rounds_result: e.target.value })}
              className={`w-14 px-2 py-1 text-xs text-center border ${borderColor} rounded focus:ring-2 focus:ring-[#178da6] text-gray-900`}
            />
            <span className={`text-xs ${textColor}`}>rds</span>
          </div>
          <span className='text-xs'>+</span>
        </>
      )}

      {/* Reps Input — For Time cap mode OR standalone reps/rounds_reps */}
      {(showCapFields || (!isForTimeWithCap && (scoringFields.reps || scoringFields.rounds_reps))) && (
        <div className='flex items-center gap-1'>
          <input
            type='number'
            placeholder='Reps'
            min='0'
            max='9999'
            value={values.reps_result || ''}
            onChange={(e) => onChange({ reps_result: e.target.value })}
            className={`w-16 px-2 py-1 text-xs text-center border ${borderColor} rounded focus:ring-2 focus:ring-[#178da6] text-gray-900`}
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
            min='0'
            max='999'
            placeholder='Load'
            value={values.weight_result || ''}
            onChange={(e) => onChange({ weight_result: e.target.value })}
            className={`w-16 px-2 py-1 text-xs text-center border ${borderColor} rounded focus:ring-2 focus:ring-[#178da6] text-gray-900`}
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
            min='0'
            max='9999'
            value={values.calories_result || ''}
            onChange={(e) => onChange({ calories_result: e.target.value })}
            className={`w-16 px-2 py-1 text-xs text-center border ${borderColor} rounded focus:ring-2 focus:ring-[#178da6] text-gray-900`}
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
            min='0'
            max='99999'
            placeholder='Distance'
            value={values.metres_result || ''}
            onChange={(e) => onChange({ metres_result: e.target.value })}
            className={`w-20 px-2 py-1 text-xs text-center border ${borderColor} rounded focus:ring-2 focus:ring-[#178da6] text-gray-900`}
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
    </div>
  );
}
