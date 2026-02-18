'use client';

import { Send, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { WODSection } from './WorkoutModal';
import { FocusTrap } from '@/components/ui/FocusTrap';
import type { ConfiguredLift, ConfiguredBenchmark, ConfiguredForgeBenchmark, VariableSet } from '@/types/movements';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (config: PublishConfig) => Promise<void>;
  sections: WODSection[];
  currentPublishConfig?: PublishConfig | null;
  workoutDate: Date;
  sessionTime?: string; // Auto-populate from session
}

export interface PublishConfig {
  selectedSectionIds: string[];
  eventTime: string;
  eventDurationMinutes: number;
}

// Helper to strip seconds from time (HH:MM:SS -> HH:MM)
const formatTime = (time?: string): string => {
  if (!time) return '09:00';
  // If time includes seconds (HH:MM:SS), strip them
  return time.includes(':') ? time.substring(0, 5) : time;
};

export default function PublishModal({
  isOpen,
  onClose,
  onPublish,
  sections,
  currentPublishConfig,
  workoutDate,
  sessionTime,
}: PublishModalProps) {
  // Determine initial time: sessionTime > currentPublishConfig > default
  const initialTime = sessionTime
    ? formatTime(sessionTime)
    : (currentPublishConfig?.eventTime || '09:00');

  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>(
    sections.map(s => s.id)
  );
  const [eventTime, setEventTime] = useState(initialTime);
  const [eventDurationMinutes, setEventDurationMinutes] = useState(
    currentPublishConfig?.eventDurationMinutes || 60
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when modal opens or currentPublishConfig changes
  useEffect(() => {
    if (isOpen) {
      // Calculate initial section selection
      // If previously published, merge old selection with any new sections
      let initialSelection: string[];
      if (currentPublishConfig?.selectedSectionIds) {
        const allSectionIds = sections.map(s => s.id);
        const oldSelection = currentPublishConfig.selectedSectionIds;
        // Include all previously selected sections that still exist
        const validOldSelection = oldSelection.filter(id => allSectionIds.includes(id));
        // Add any new sections that weren't in the old config
        const newSections = allSectionIds.filter(id => !oldSelection.includes(id));
        initialSelection = [...validOldSelection, ...newSections];
      } else {
        // First time publishing - select all sections
        initialSelection = sections.map(s => s.id);
      }

      setSelectedSectionIds(initialSelection);
      const time = sessionTime
        ? formatTime(sessionTime)
        : (currentPublishConfig?.eventTime || '09:00');
      setEventTime(time);
      setEventDurationMinutes(currentPublishConfig?.eventDurationMinutes || 60);
    }
  }, [isOpen, currentPublishConfig, sessionTime, sections]);

  // Auto-calculate duration based on selected sections
  useEffect(() => {
    if (selectedSectionIds.length > 0) {
      const totalDuration = sections
        .filter(s => selectedSectionIds.includes(s.id))
        .reduce((sum, section) => sum + (section.duration || 0), 0);
      setEventDurationMinutes(totalDuration);
    }
  }, [selectedSectionIds, sections]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleToggleSection = (sectionId: string) => {
    setSelectedSectionIds(prev =>
      prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
    );
  };

  const handlePublish = async () => {
    if (selectedSectionIds.length === 0) {
      toast.warning('Please select at least one section to publish');
      return;
    }

    setIsSubmitting(true);
    try {
      await onPublish({
        selectedSectionIds,
        eventTime,
        eventDurationMinutes,
      });
      onClose();
    } catch (error) {
      console.error('Publish error:', error);
      toast.error('Failed to publish workout. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <FocusTrap>
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white text-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col'>
        {/* Header */}
        <div className='bg-[#178da6] text-white p-4 flex justify-between items-center'>
          <div>
            <h2 className='text-xl font-bold'>Publish Workout</h2>
            <p className='text-sm text-gray-100'>
              {workoutDate.toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <button onClick={onClose} className='hover:bg-[#14758c] p-2 rounded transition' aria-label='Close modal'>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className='p-6 overflow-y-auto flex-1 space-y-6'>
          {/* Section Selection */}
          <div>
            <h3 className='font-semibold text-gray-900 mb-3'>
              Select Sections for Athletes <span className='text-red-500'>*</span>
            </h3>
            <div className='space-y-2'>
              {sections.map(section => {
                // Build preview text showing what's in this section
                const previewParts: string[] = [];

                if (section.lifts && section.lifts.length > 0) {
                  previewParts.push(`${section.lifts.length} lift${section.lifts.length > 1 ? 's' : ''}`);
                }
                if (section.benchmarks && section.benchmarks.length > 0) {
                  previewParts.push(`${section.benchmarks.length} benchmark${section.benchmarks.length > 1 ? 's' : ''}`);
                }
                if (section.forge_benchmarks && section.forge_benchmarks.length > 0) {
                  previewParts.push(`${section.forge_benchmarks.length} forge benchmark${section.forge_benchmarks.length > 1 ? 's' : ''}`);
                }

                const hasStructuredContent = previewParts.length > 0;
                const preview = hasStructuredContent
                  ? previewParts.join(', ')
                  : section.content;

                return (
                  <label
                    key={section.id}
                    className='flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer'
                  >
                    <input
                      type='checkbox'
                      checked={selectedSectionIds.includes(section.id)}
                      onChange={() => handleToggleSection(section.id)}
                      className='mt-1 h-4 w-4 text-[#178da6] focus:ring-[#178da6] rounded'
                    />
                    <div className='flex-1'>
                      <div className='font-medium text-gray-900'>
                        {section.type} ({section.duration} min)
                      </div>
                      {section.intent_notes && (
                        <div className='text-xs text-amber-700 mt-1'>
                          Intent: {section.intent_notes.length > 80 ? section.intent_notes.slice(0, 80) + '…' : section.intent_notes}
                          {section.show_intent_to_athletes && <span className='ml-1 text-amber-500'>(visible to athletes)</span>}
                        </div>
                      )}
                      {preview && (
                        <div className='text-sm text-gray-600 mt-1 line-clamp-2'>
                          {preview}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className='block font-semibold text-gray-900 mb-2'>
              Duration (minutes) <span className='text-xs text-gray-500 font-normal'>(auto-calculated)</span>
            </label>
            <input
              type='number'
              value={eventDurationMinutes}
              readOnly
              className='w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-900 cursor-not-allowed'
            />
          </div>

          {/* Preview */}
          {selectedSectionIds.length > 0 && (
            <div className='bg-gray-50 p-4 rounded-lg'>
              <h4 className='font-semibold text-gray-900 mb-2'>Athlete Preview</h4>
              <div className='space-y-3'>
                {sections
                  .filter(s => selectedSectionIds.includes(s.id))
                  .map(section => {
                    // Format helpers (match API route logic)
                    const formatLift = (lift: ConfiguredLift): string => {
                      if (lift.rep_type === 'constant') {
                        const base = `${lift.name} ${lift.sets}x${lift.reps}`;
                        return lift.percentage_1rm ? `${base} @ ${lift.percentage_1rm}%` : base;
                      } else {
                        const reps = lift.variable_sets?.map((s: VariableSet) => s.reps).join('-') || '';
                        const percentages = lift.variable_sets?.map((s: VariableSet) => s.percentage_1rm) || [];

                        let base = `${lift.name} ${reps}`;

                        const definedPercentages = percentages.filter(p => p !== undefined && p !== null);
                        if (definedPercentages.length > 0) {
                          const percentageString = percentages
                            .map(p => p !== undefined && p !== null ? p.toString() : '')
                            .filter(p => p !== '')
                            .join('-');

                          if (percentageString) {
                            base += ` @ ${percentageString}%`;
                          }
                        }

                        return base;
                      }
                    };

                    const formatBenchmark = (benchmark: ConfiguredBenchmark): string => {
                      const scaling = benchmark.scaling_option ? ` (${benchmark.scaling_option})` : '';
                      return `${benchmark.name}${scaling}`;
                    };

                    const formatForgeBenchmark = (forge: ConfiguredForgeBenchmark): string => {
                      const scaling = forge.scaling_option ? ` (${forge.scaling_option})` : '';
                      return `${forge.name}${scaling}`;
                    };

                    return (
                      <div key={section.id} className='bg-white p-3 rounded border'>
                        <div className='font-medium text-[#178da6] mb-2'>
                          {section.type} ({section.duration} min)
                        </div>

                        <div className='text-sm text-gray-700 space-y-2'>
                          {/* Lifts */}
                          {section.lifts && section.lifts.length > 0 && (
                            <div>
                              {section.lifts.map((lift, idx) => (
                                <div key={idx}>• {formatLift(lift)}</div>
                              ))}
                            </div>
                          )}

                          {/* Benchmarks */}
                          {section.benchmarks && section.benchmarks.length > 0 && (
                            <div className='space-y-1'>
                              {section.benchmarks.map((benchmark, idx) => (
                                <div key={idx}>
                                  <div className='font-semibold'>{formatBenchmark(benchmark)}</div>
                                  {benchmark.exercises && benchmark.exercises.length > 0 && (
                                    <div className='text-xs text-gray-600 mt-0.5'>
                                      {benchmark.exercises.join(' • ')}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Forge Benchmarks */}
                          {section.forge_benchmarks && section.forge_benchmarks.length > 0 && (
                            <div className='space-y-1'>
                              {section.forge_benchmarks.map((forge, idx) => (
                                <div key={idx}>
                                  <div className='font-semibold'>{formatForgeBenchmark(forge)}</div>
                                  {forge.exercises && forge.exercises.length > 0 && (
                                    <div className='text-xs text-gray-600 mt-0.5'>
                                      {forge.exercises.join(' • ')}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Content */}
                          {section.content && (
                            <div className='whitespace-pre-wrap'>
                              {section.content}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='border-t p-4 flex justify-between items-center gap-4 bg-gray-50'>
          <div className='text-sm text-gray-600'>
            {selectedSectionIds.length} section{selectedSectionIds.length !== 1 ? 's' : ''} selected
          </div>
          <div className='flex gap-2'>
            <button
              onClick={onClose}
              className='px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition'
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handlePublish}
              disabled={isSubmitting || selectedSectionIds.length === 0}
              className='px-4 py-2 bg-[#178da6] text-white rounded-lg hover:bg-[#14758c] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
            >
              <Send size={18} />
              {isSubmitting ? 'Publishing...' : currentPublishConfig ? 'Update' : 'Publish'}
            </button>
          </div>
        </div>
      </div>
    </div>
    </FocusTrap>
  );
}
