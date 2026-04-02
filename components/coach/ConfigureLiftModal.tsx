'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { GripVertical, ChevronDown, X, ArrowUp, ArrowDown } from 'lucide-react';
import type { BarbellLift, ConfiguredLift, VariableSet, WODSection } from '@/types/movements';

interface ConfigureLiftModalProps {
  isOpen: boolean;
  lift: BarbellLift | null;
  editingLift: { sectionId: string; liftIndex: number; lift: ConfiguredLift } | null;
  activeSection: WODSection | null;
  availableSections: WODSection[];
  onClose: () => void;
  onAddToSection: (sectionId: string, configuredLift: ConfiguredLift) => void;
}

function ConfigureLiftModal({
  isOpen,
  lift,
  editingLift,
  activeSection,
  availableSections,
  onClose,
  onAddToSection,
}: ConfigureLiftModalProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    activeSection?.id || (availableSections.length > 0 ? availableSections[0].id : '')
  );
  const [repType, setRepType] = useState<'constant' | 'variable'>('constant');

  // Constant reps state
  const [sets, setSets] = useState(5);
  const [reps, setReps] = useState(5);
  const [percentage, setPercentage] = useState<number | undefined>(undefined);

  // Variable reps state
  const [variableSets, setVariableSets] = useState<VariableSet[]>([
    { set_number: 1, reps: 10, percentage_1rm: 40 },
    { set_number: 2, reps: 6, percentage_1rm: 50 },
    { set_number: 3, reps: 5, percentage_1rm: 60 },
    { set_number: 4, reps: 5, percentage_1rm: 70 },
    { set_number: 5, reps: 5, percentage_1rm: 80 },
    { set_number: 6, reps: 5, percentage_1rm: 85 },
    { set_number: 7, reps: 5, percentage_1rm: 90 },
  ]);

  // RM Test state
  const [rmTest, setRmTest] = useState<'1RM' | '3RM' | '5RM' | '10RM' | null>(null);

  // Draggable state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Position modal to the right of WorkoutModal on open (centered on mobile)
  useEffect(() => {
    if (isOpen) {
      if (window.innerWidth < 768) {
        setPosition({ x: 0, y: 0 });
      } else {
        setPosition({ x: 790, y: 70 });
      }
    }
  }, [isOpen]);

  // Pre-populate form when editing existing lift
  useEffect(() => {
    if (editingLift) {
      const { lift: existingLift, sectionId } = editingLift;

      setSelectedSectionId(sectionId);
      setRepType(existingLift.rep_type);

      if (existingLift.rep_type === 'constant') {
        setSets(existingLift.sets || 5);
        setReps(existingLift.reps || 5);
        setPercentage(existingLift.percentage_1rm);
      } else {
        setVariableSets(existingLift.variable_sets || [{ set_number: 1, reps: 5, percentage_1rm: undefined }]);
      }

      setRmTest(existingLift.rm_test || null);
    } else {
      // Reset to defaults when not editing
      setRmTest(null);
      setRepType('constant');
      setSets(5);
      setReps(5);
      setPercentage(undefined);
      setVariableSets([
        { set_number: 1, reps: 10, percentage_1rm: 40 },
        { set_number: 2, reps: 6, percentage_1rm: 50 },
        { set_number: 3, reps: 5, percentage_1rm: 60 },
        { set_number: 4, reps: 5, percentage_1rm: 70 },
        { set_number: 5, reps: 5, percentage_1rm: 80 },
        { set_number: 6, reps: 5, percentage_1rm: 85 },
        { set_number: 7, reps: 5, percentage_1rm: 90 },
      ]);
    }
  }, [editingLift]);

  // Drag handlers
  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  useEffect(() => {
    const handleDragMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging, dragStart]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !lift) return null;

  const handleAddSet = () => {
    setVariableSets(prev => [
      ...prev,
      { set_number: prev.length + 1, reps: 5, percentage_1rm: undefined },
    ]);
  };

  const handleDeleteSet = (indexToDelete: number) => {
    if (variableSets.length > 1) {
      setVariableSets(prev => {
        const newSets = prev.filter((_, idx) => idx !== indexToDelete);
        // Re-number the sets
        return newSets.map((set, idx) => ({ ...set, set_number: idx + 1 }));
      });
    }
  };

  const handleMoveSet = (index: number, direction: 'up' | 'down') => {
    setVariableSets(prev => {
      const newSets = [...prev];
      const swapIdx = direction === 'up' ? index - 1 : index + 1;
      [newSets[index], newSets[swapIdx]] = [newSets[swapIdx], newSets[index]];
      return newSets.map((set, idx) => ({ ...set, set_number: idx + 1 }));
    });
  };

  const handleUpdateVariableSet = (index: number, field: 'reps' | 'percentage_1rm', value: number | undefined) => {
    setVariableSets(prev =>
      prev.map((set, idx) =>
        idx === index ? { ...set, [field]: value } : set
      )
    );
  };

  const handleAdd = () => {
    if (!selectedSectionId) {
      toast.warning('Please select a section');
      return;
    }

    const configuredLift: ConfiguredLift = {
      id: lift.id,
      name: lift.name,
      rep_type: repType,
      ...(rmTest
        ? { sets: 1, reps: parseInt(rmTest.replace('RM', '')), rm_test: rmTest }
        : repType === 'constant'
          ? { sets, reps, percentage_1rm: percentage }
          : { variable_sets: variableSets }),
      visibility: 'everyone',
    };

    onAddToSection(selectedSectionId, configuredLift);
    // Don't close modal - let user add multiple items
  };

  // Format display text for drag handle
  const getDisplayText = () => {
    if (rmTest) {
      return `${lift.name} ${rmTest}`;
    }
    if (repType === 'constant') {
      const base = `${lift.name} ${sets}x${reps}`;
      return percentage ? `${base} @ ${percentage}%` : base;
    } else {
      const repsText = variableSets.map(s => s.reps).join('-');
      return `${lift.name} ${repsText}`;
    }
  };

  return (
    <div className='fixed inset-0 z-[110] pointer-events-none'>
      <div
        className={`bg-white shadow-2xl overflow-y-auto pointer-events-auto absolute ${
          position.x === 0 && position.y === 0
            ? 'inset-0 max-h-full'
            : 'rounded-lg w-full max-w-2xl max-h-[90vh]'
        }`}
        style={
          position.x === 0 && position.y === 0
            ? undefined
            : { left: `${position.x}px`, top: `${position.y}px` }
        }
      >
        {/* Header - Draggable */}
        <div
          className='bg-[#178da6] text-white p-4 flex justify-between items-center sticky top-0 z-10 cursor-move'
          onMouseDown={handleDragStart}
        >
          <div className='flex items-center gap-2'>
            <h3 className='font-bold text-lg'>Configure Sets/Reps</h3>
          </div>
          <button
            onClick={onClose}
            className='bg-white text-[#178da6] hover:bg-gray-100 px-4 py-2 rounded-lg font-semibold transition'
          >
            Done
          </button>
        </div>

        {/* Content */}
        <div className='p-6 space-y-6'>
          {/* Section Selector + Add Button */}
          <div className='flex items-center gap-3'>
            <div className='flex-1'>
              <label className='block text-sm font-semibold text-gray-700 mb-2'>
                Add to Section
              </label>
              <div className='relative'>
                <select
                  value={selectedSectionId}
                  onChange={e => setSelectedSectionId(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent appearance-none pr-10 text-gray-900'
                >
                  {availableSections.map(section => (
                    <option key={section.id} value={section.id}>
                      {section.type} ({section.duration} min)
                    </option>
                  ))}
                </select>
                <ChevronDown className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none' size={20} />
              </div>
            </div>
            <button
              onClick={handleAdd}
              className='mt-7 px-6 py-2 bg-[#178da6] hover:bg-[#14758c] text-white rounded-lg font-semibold transition'
            >
              {editingLift ? 'Update' : 'Add'}
            </button>
          </div>

          {/* Drag Preview */}
          <div className={`rounded-lg p-3 flex items-center gap-2 text-gray-700 ${
            rmTest ? 'bg-amber-50 border border-amber-300' : 'bg-blue-50 border border-blue-200'
          }`}>
            <GripVertical size={20} className='text-gray-400' />
            <span className='font-semibold'>{getDisplayText()}</span>
          </div>

          {/* RM Test Toggle */}
          <div className='bg-amber-50 border border-amber-200 rounded-lg p-3'>
            <div className='flex items-center justify-between'>
              <div>
                <label className='text-sm font-semibold text-gray-700'>RM Test</label>
                <p className='text-xs text-gray-500'>Auto-saves to lift cards & progress charts</p>
              </div>
              <button
                onClick={() => {
                  if (rmTest) {
                    setRmTest(null);
                  } else {
                    setRmTest('1RM');
                    setRepType('constant');
                    setSets(1);
                    setReps(1);
                  }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  rmTest ? 'bg-amber-500' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  rmTest ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            {rmTest && (
              <div className='mt-3 flex gap-2'>
                {(['1RM', '3RM', '5RM', '10RM'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setRmTest(type);
                      setRepType('constant');
                      setSets(1);
                      setReps(parseInt(type.replace('RM', '')));
                    }}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                      rmTest === type
                        ? 'bg-amber-500 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Constant/Variable Tabs - hidden when RM test active */}
          {!rmTest && (
            <>
              <div className='border-b border-gray-300'>
                <div className='flex'>
                  <button
                    onClick={() => setRepType('constant')}
                    className={`flex-1 px-4 py-3 font-semibold transition ${
                      repType === 'constant'
                        ? 'bg-white text-[#178da6] border-b-2 border-[#178da6]'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Constant Reps
                  </button>
                  <button
                    onClick={() => setRepType('variable')}
                    className={`flex-1 px-4 py-3 font-semibold transition ${
                      repType === 'variable'
                        ? 'bg-white text-[#178da6] border-b-2 border-[#178da6]'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Variable Reps
                  </button>
                </div>
              </div>
            </>
          )}

          {/* RM Test Summary */}
          {rmTest && (
            <div className='text-center py-4'>
              <div className='text-4xl font-bold text-amber-600'>{rmTest}</div>
              <div className='text-sm text-gray-500 mt-1'>
                {parseInt(rmTest.replace('RM', ''))} rep max test
              </div>
            </div>
          )}

          {/* Constant Reps Content */}
          {!rmTest && repType === 'constant' && (
            <div className='space-y-4'>
              <div className='flex items-center gap-8 justify-center'>
                {/* Sets */}
                <div className='text-center'>
                  <label className='block text-sm font-semibold text-gray-600 mb-2'>SETS</label>
                  <div className='flex flex-col items-center gap-2'>
                    <input
                      type='number'
                      value={sets}
                      onChange={e => setSets(Math.max(1, parseInt(e.target.value) || 1))}
                      min='1'
                      max='99'
                      className='w-32 px-4 py-3 text-3xl text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
                    />
                    <div className='flex gap-2'>
                      <button
                        onClick={() => setSets(prev => Math.max(1, prev - 1))}
                        className='px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold transition'
                      >
                        −
                      </button>
                      <button
                        onClick={() => setSets(prev => prev + 1)}
                        className='px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold transition'
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* × Symbol */}
                <div className='text-4xl font-bold text-gray-400 mt-8'>×</div>

                {/* Reps */}
                <div className='text-center'>
                  <label className='block text-sm font-semibold text-gray-600 mb-2'>REPS</label>
                  <div className='flex flex-col items-center gap-2'>
                    <input
                      type='number'
                      value={reps}
                      onChange={e => setReps(Math.max(1, parseInt(e.target.value) || 1))}
                      min='1'
                      max='999'
                      className='w-32 px-4 py-3 text-3xl text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
                    />
                    <div className='flex gap-2'>
                      <button
                        onClick={() => setReps(prev => Math.max(1, prev - 1))}
                        className='px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold transition'
                      >
                        −
                      </button>
                      <button
                        onClick={() => setReps(prev => prev + 1)}
                        className='px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold transition'
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Percentage of 1RM */}
              <div>
                <label className='block text-sm font-semibold text-gray-700 mb-2'>
                  Percentage of 1RM (optional)
                </label>
                <div className='flex items-center gap-2'>
                  <input
                    type='number'
                    value={percentage || ''}
                    onChange={e => setPercentage(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder='e.g., 75'
                    min='0'
                    max='120'
                    className='flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
                  />
                  <span className='text-gray-600 font-semibold'>%</span>
                </div>
              </div>
            </div>
          )}

          {/* Variable Reps Content */}
          {!rmTest && repType === 'variable' && (
            <div className='space-y-4'>
              <div className='border border-gray-300 rounded-lg overflow-hidden'>
                <table className='w-full'>
                  <thead className='bg-gray-100'>
                    <tr>
                      <th className='px-4 py-2 text-left text-sm font-semibold text-gray-600'>Set</th>
                      <th className='px-4 py-2 text-left text-sm font-semibold text-gray-600'>Reps</th>
                      <th className='px-4 py-2 text-left text-sm font-semibold text-gray-600'>Percentage</th>
                      <th className='px-4 py-2 text-center text-sm font-semibold text-gray-600'></th>
                    </tr>
                  </thead>
                  <tbody>
                    {variableSets.map((set, idx) => (
                      <tr key={idx} className='border-t border-gray-200'>
                        <td className='px-4 py-2 font-semibold text-gray-700'>#{set.set_number}</td>
                        <td className='px-4 py-2'>
                          <input
                            type='number'
                            value={set.reps}
                            onChange={e => handleUpdateVariableSet(idx, 'reps', parseInt(e.target.value) || 1)}
                            className='w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
                            min='1'
                          />
                        </td>
                        <td className='px-4 py-2'>
                          <input
                            type='number'
                            value={set.percentage_1rm || ''}
                            onChange={e => handleUpdateVariableSet(idx, 'percentage_1rm', e.target.value ? parseInt(e.target.value) : undefined)}
                            placeholder='%'
                            className='w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
                            min='0'
                            max='120'
                          />
                        </td>
                        <td className='px-4 py-2 text-center'>
                          <div className='flex items-center justify-center gap-1'>
                            <button
                              onClick={() => handleMoveSet(idx, 'up')}
                              disabled={idx === 0}
                              className='p-1 text-gray-500 hover:bg-gray-100 rounded transition disabled:text-gray-300 disabled:cursor-not-allowed'
                              title='Move up'
                              aria-label='Move set up'
                            >
                              <ArrowUp size={16} />
                            </button>
                            <button
                              onClick={() => handleMoveSet(idx, 'down')}
                              disabled={idx === variableSets.length - 1}
                              className='p-1 text-gray-500 hover:bg-gray-100 rounded transition disabled:text-gray-300 disabled:cursor-not-allowed'
                              title='Move down'
                              aria-label='Move set down'
                            >
                              <ArrowDown size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteSet(idx)}
                              disabled={variableSets.length <= 1}
                              className='p-1 text-red-600 hover:bg-red-50 rounded transition disabled:text-gray-300 disabled:cursor-not-allowed'
                              title='Delete this set'
                              aria-label='Delete set'
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <button
                  onClick={handleAddSet}
                  className='w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition'
                >
                  + Add Set
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default ConfigureLiftModal;
