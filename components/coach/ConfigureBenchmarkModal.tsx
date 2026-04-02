'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { GripVertical, ChevronDown } from 'lucide-react';
import type { Benchmark, ConfiguredBenchmark, WODSection } from '@/types/movements';

interface ConfigureBenchmarkModalProps {
  isOpen: boolean;
  benchmark: Benchmark | null;
  activeSection: WODSection | null;
  availableSections: WODSection[];
  onClose: () => void;
  onAddToSection: (sectionId: string, configuredBenchmark: ConfiguredBenchmark) => void;
}

function ConfigureBenchmarkModal({
  isOpen,
  benchmark,
  activeSection,
  availableSections,
  onClose,
  onAddToSection,
}: ConfigureBenchmarkModalProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    activeSection?.id || (availableSections.length > 0 ? availableSections[0].id : '')
  );
  const [athleteNotes, setAthleteNotes] = useState('');
  const [athleteNotesExpanded, setAthleteNotesExpanded] = useState(false);

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
        setPosition({ x: 820, y: 100 });
      }
    }
  }, [isOpen]);

  // Load athlete notes from localStorage when benchmark changes
  useEffect(() => {
    if (benchmark) {
      const storageKey = `athlete_notes_benchmark_${benchmark.name}`;
      const savedNotes = localStorage.getItem(storageKey);
      if (savedNotes) {
        setAthleteNotes(savedNotes);
        setAthleteNotesExpanded(true);
      } else {
        setAthleteNotes('');
        setAthleteNotesExpanded(false);
      }
    }
  }, [benchmark]);

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

  if (!isOpen || !benchmark) return null;

  const handleAdd = () => {
    if (!selectedSectionId) {
      toast.warning('Please select a section');
      return;
    }

    const configuredBenchmark: ConfiguredBenchmark = {
      id: benchmark.id,
      name: benchmark.name,
      type: benchmark.type,
      description: benchmark.description || undefined,
      has_scaling: benchmark.has_scaling,
      visibility: 'everyone',
      athlete_notes: athleteNotes || undefined,
    };

    // Save athlete notes to localStorage for future use
    if (athleteNotes) {
      const storageKey = `athlete_notes_benchmark_${benchmark.name}`;
      localStorage.setItem(storageKey, athleteNotes);
    }

    onAddToSection(selectedSectionId, configuredBenchmark);
    // Don't close modal - let user add multiple items
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
            <h3 className='font-bold text-lg'>Configure Benchmark</h3>
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
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent appearance-none pr-10'
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
              Add
            </button>
          </div>

          {/* Drag Preview */}
          <div className='bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2 text-gray-700'>
            <GripVertical size={20} className='text-gray-400' />
            <span className='font-semibold'>
              {benchmark.name} ({benchmark.type})
            </span>
          </div>

          {/* Benchmark Info */}
          {benchmark.description && (
            <div className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
              <p className='text-sm text-gray-700'>{benchmark.description}</p>
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
                maxLength={500}
                className='mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
                rows={3}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfigureBenchmarkModal;
