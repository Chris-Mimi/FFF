'use client';

import { useState, useEffect } from 'react';
import { GripVertical, ChevronDown } from 'lucide-react';
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
    { set_number: 1, reps: 5, percentage_1rm: undefined },
  ]);

  const [athleteNotes, setAthleteNotes] = useState('Record your heaviest set');
  const [athleteNotesExpanded, setAthleteNotesExpanded] = useState(true);

  // Draggable state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Position modal to the right of WorkoutModal on open
  useEffect(() => {
    if (isOpen) {
      // WorkoutModal is 800px wide (panel mode) or max-w-5xl (modal mode ~896px)
      // Position configure modal to the right with some padding
      const rightX = 790; // 800px + 20px padding
      const topY = 70; // Top padding
      setPosition({ x: rightX, y: topY });
    }
  }, [isOpen]);

  // Load athlete notes from localStorage when lift changes
  useEffect(() => {
    if (lift && !editingLift) {
      const storageKey = `athlete_notes_lift_${lift.name}`;
      const savedNotes = localStorage.getItem(storageKey);
      if (savedNotes) {
        setAthleteNotes(savedNotes);
        setAthleteNotesExpanded(true);
      } else {
        setAthleteNotes('Record your heaviest set');
        setAthleteNotesExpanded(true);
      }
    }
  }, [lift, editingLift]);

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

      setAthleteNotes(existingLift.athlete_notes || '');
      // Expand athlete notes if they exist
      setAthleteNotesExpanded(!!existingLift.athlete_notes);
    } else {
      // Reset to defaults when not editing
      setRepType('constant');
      setSets(5);
      setReps(5);
      setPercentage(undefined);
      setVariableSets([{ set_number: 1, reps: 5, percentage_1rm: undefined }]);
      setAthleteNotes('Record your heaviest set');
      setAthleteNotesExpanded(true);
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

  if (!isOpen || !lift) return null;

  const handleAddSet = () => {
    setVariableSets(prev => [
      ...prev,
      { set_number: prev.length + 1, reps: 5, percentage_1rm: undefined },
    ]);
  };

  const handleRemoveSet = () => {
    if (variableSets.length > 1) {
      setVariableSets(prev => prev.slice(0, -1));
    }
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
      alert('Please select a section');
      return;
    }

    const configuredLift: ConfiguredLift = {
      id: lift.id,
      name: lift.name,
      rep_type: repType,
      ...(repType === 'constant'
        ? { sets, reps, percentage_1rm: percentage }
        : { variable_sets: variableSets }),
      visibility: 'everyone',
      athlete_notes: athleteNotes || undefined,
    };

    // Save athlete notes to localStorage for future use
    if (athleteNotes) {
      const storageKey = `athlete_notes_lift_${lift.name}`;
      localStorage.setItem(storageKey, athleteNotes);
    }

    onAddToSection(selectedSectionId, configuredLift);
    // Don't close modal - let user add multiple items
  };

  // Format display text for drag handle
  const getDisplayText = () => {
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
        className='bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto pointer-events-auto absolute'
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        {/* Header - Draggable */}
        <div
          className='bg-[#208479] text-white p-4 flex justify-between items-center sticky top-0 z-10 cursor-move'
          onMouseDown={handleDragStart}
        >
          <div className='flex items-center gap-2'>
            <h3 className='font-bold text-lg'>Configure Sets/Reps</h3>
          </div>
          <button
            onClick={onClose}
            className='bg-white text-[#208479] hover:bg-gray-100 px-4 py-2 rounded-lg font-semibold transition'
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
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent appearance-none pr-10'
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
              className='mt-7 px-6 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white rounded-lg font-semibold transition'
            >
              {editingLift ? 'Update' : 'Add'}
            </button>
          </div>

          {/* Drag Preview */}
          <div className='bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2 text-gray-700'>
            <GripVertical size={20} className='text-gray-400' />
            <span className='font-semibold'>{getDisplayText()}</span>
          </div>

          {/* Constant/Variable Tabs */}
          <div className='border-b border-gray-300'>
            <div className='flex'>
              <button
                onClick={() => setRepType('constant')}
                className={`flex-1 px-4 py-3 font-semibold transition ${
                  repType === 'constant'
                    ? 'bg-white text-[#208479] border-b-2 border-[#208479]'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Constant Reps
              </button>
              <button
                onClick={() => setRepType('variable')}
                className={`flex-1 px-4 py-3 font-semibold transition ${
                  repType === 'variable'
                    ? 'bg-white text-[#208479] border-b-2 border-[#208479]'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Variable Reps
              </button>
            </div>
          </div>

          {/* Constant Reps Content */}
          {repType === 'constant' && (
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
                      className='w-32 px-4 py-3 text-3xl text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
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
                      className='w-32 px-4 py-3 text-3xl text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
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
                    max='100'
                    className='flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
                  />
                  <span className='text-gray-600 font-semibold'>%</span>
                </div>
              </div>
            </div>
          )}

          {/* Variable Reps Content */}
          {repType === 'variable' && (
            <div className='space-y-4'>
              <div className='border border-gray-300 rounded-lg overflow-hidden'>
                <table className='w-full'>
                  <thead className='bg-gray-100'>
                    <tr>
                      <th className='px-4 py-2 text-left text-sm font-semibold text-gray-600'>Set</th>
                      <th className='px-4 py-2 text-left text-sm font-semibold text-gray-600'>Reps</th>
                      <th className='px-4 py-2 text-left text-sm font-semibold text-gray-600'>Percentage</th>
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
                            className='w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
                            min='1'
                          />
                        </td>
                        <td className='px-4 py-2'>
                          <input
                            type='number'
                            value={set.percentage_1rm || ''}
                            onChange={e => handleUpdateVariableSet(idx, 'percentage_1rm', e.target.value ? parseInt(e.target.value) : undefined)}
                            placeholder='%'
                            className='w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
                            min='0'
                            max='100'
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className='flex gap-2'>
                <button
                  onClick={handleAddSet}
                  className='flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition'
                >
                  + Add Set
                </button>
                <button
                  onClick={handleRemoveSet}
                  disabled={variableSets.length <= 1}
                  className='flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition disabled:bg-gray-300 disabled:cursor-not-allowed'
                >
                  − Remove Set
                </button>
              </div>
            </div>
          )}

          {/* Athlete Notes */}
          <div>
            <button
              onClick={() => setAthleteNotesExpanded(!athleteNotesExpanded)}
              className='flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition'
            >
              <span className={`transform transition ${athleteNotesExpanded ? 'rotate-90' : ''}`}>▸</span>
              Athlete notes...
            </button>
            {athleteNotesExpanded && (
              <textarea
                value={athleteNotes}
                onChange={e => setAthleteNotes(e.target.value)}
                placeholder='Notes visible to athletes'
                className='mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
                rows={3}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfigureLiftModal;
