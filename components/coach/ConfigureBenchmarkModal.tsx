'use client';

import { useState } from 'react';
import { ChevronLeft, X, GripVertical, ChevronDown } from 'lucide-react';
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
  const [selectedSectionId, setSelectedSectionId] = useState<string>(activeSection?.id || '');
  const [scalingOption, setScalingOption] = useState('None');
  const [visibility, setVisibility] = useState<'everyone' | 'coaches' | 'programmers'>('everyone');
  const [coachNotes, setCoachNotes] = useState('');
  const [athleteNotes, setAthleteNotes] = useState('');
  const [coachNotesExpanded, setCoachNotesExpanded] = useState(false);
  const [athleteNotesExpanded, setAthleteNotesExpanded] = useState(false);

  if (!isOpen || !benchmark) return null;

  const handleAdd = () => {
    if (!selectedSectionId) {
      alert('Please select a section');
      return;
    }

    const configuredBenchmark: ConfiguredBenchmark = {
      id: benchmark.id,
      name: benchmark.name,
      type: benchmark.type,
      scaling_option: scalingOption !== 'None' ? scalingOption : undefined,
      visibility,
      coach_notes: coachNotes || undefined,
      athlete_notes: athleteNotes || undefined,
    };

    onAddToSection(selectedSectionId, configuredBenchmark);
    onClose();
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110]'>
      <div className='bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto'>
        {/* Header */}
        <div className='bg-[#208479] text-white p-4 flex justify-between items-center sticky top-0 z-10'>
          <div className='flex items-center gap-2'>
            <button
              onClick={onClose}
              className='hover:bg-[#1a6b62] rounded-full p-1 transition'
            >
              <ChevronLeft size={24} />
            </button>
            <h3 className='font-bold text-lg'>Configure Benchmark</h3>
          </div>
          <button
            onClick={onClose}
            className='hover:bg-[#1a6b62] rounded-full p-1 transition'
          >
            <X size={24} />
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

          {/* Scaling Options */}
          <div>
            <div className='flex items-center justify-between mb-2'>
              <label className='block text-sm font-semibold text-gray-700'>Scaling Options</label>
              <button className='text-xs text-[#208479] hover:underline'>Edit Track Default</button>
            </div>
            <div className='relative'>
              <select
                value={scalingOption}
                onChange={e => setScalingOption(e.target.value)}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent appearance-none pr-10'
              >
                <option>None</option>
                <option>Rx</option>
                <option>Scaled</option>
              </select>
              <ChevronDown className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none' size={20} />
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className='block text-sm font-semibold text-gray-700 mb-2'>Visible to:</label>
            <div className='flex gap-4'>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input
                  type='radio'
                  name='visibility'
                  value='everyone'
                  checked={visibility === 'everyone'}
                  onChange={e => setVisibility(e.target.value as 'everyone')}
                  className='w-4 h-4 text-[#208479] focus:ring-[#208479]'
                />
                <span className='text-sm text-gray-700'>Everyone</span>
              </label>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input
                  type='radio'
                  name='visibility'
                  value='coaches'
                  checked={visibility === 'coaches'}
                  onChange={e => setVisibility(e.target.value as 'coaches')}
                  className='w-4 h-4 text-[#208479] focus:ring-[#208479]'
                />
                <span className='text-sm text-gray-700'>Coaches</span>
              </label>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input
                  type='radio'
                  name='visibility'
                  value='programmers'
                  checked={visibility === 'programmers'}
                  onChange={e => setVisibility(e.target.value as 'programmers')}
                  className='w-4 h-4 text-[#208479] focus:ring-[#208479]'
                />
                <span className='text-sm text-gray-700'>Programmers Only</span>
              </label>
            </div>
          </div>

          {/* Coach Notes */}
          <div>
            <button
              onClick={() => setCoachNotesExpanded(!coachNotesExpanded)}
              className='flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition'
            >
              <span className={`transform transition ${coachNotesExpanded ? 'rotate-90' : ''}`}>▸</span>
              Coach notes...
            </button>
            {coachNotesExpanded && (
              <textarea
                value={coachNotes}
                onChange={e => setCoachNotes(e.target.value)}
                placeholder='Notes visible to coaches only'
                className='mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent'
                rows={3}
              />
            )}
          </div>

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
                className='mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent'
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
