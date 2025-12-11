'use client';

import { Send, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { WODSection } from './WorkoutModal';

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
    currentPublishConfig?.selectedSectionIds || []
  );
  const [eventTime, setEventTime] = useState(initialTime);
  const [eventDurationMinutes, setEventDurationMinutes] = useState(
    currentPublishConfig?.eventDurationMinutes || 60
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when modal opens or currentPublishConfig changes
  useEffect(() => {
    if (isOpen) {
      setSelectedSectionIds(currentPublishConfig?.selectedSectionIds || []);
      const time = sessionTime
        ? formatTime(sessionTime)
        : (currentPublishConfig?.eventTime || '09:00');
      setEventTime(time);
      setEventDurationMinutes(currentPublishConfig?.eventDurationMinutes || 60);
    }
  }, [isOpen, currentPublishConfig, sessionTime]);

  // Auto-calculate duration based on selected sections
  useEffect(() => {
    if (selectedSectionIds.length > 0) {
      const totalDuration = sections
        .filter(s => selectedSectionIds.includes(s.id))
        .reduce((sum, section) => sum + (section.duration || 0), 0);
      setEventDurationMinutes(totalDuration);
    }
  }, [selectedSectionIds, sections]);

  const handleToggleSection = (sectionId: string) => {
    setSelectedSectionIds(prev =>
      prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
    );
  };

  const handlePublish = async () => {
    if (selectedSectionIds.length === 0) {
      alert('Please select at least one section to publish');
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
      alert('Failed to publish workout. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col'>
        {/* Header */}
        <div className='bg-[#20766a] text-white p-4 flex justify-between items-center'>
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
          <button onClick={onClose} className='hover:bg-[#1a6b62] p-2 rounded transition'>
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
              {sections.map(section => (
                <label
                  key={section.id}
                  className='flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer'
                >
                  <input
                    type='checkbox'
                    checked={selectedSectionIds.includes(section.id)}
                    onChange={() => handleToggleSection(section.id)}
                    className='mt-1 h-4 w-4 text-[#20766a] focus:ring-[#20766a] rounded'
                  />
                  <div className='flex-1'>
                    <div className='font-medium text-gray-900'>
                      {section.type} ({section.duration} min)
                    </div>
                    {section.content && (
                      <div className='text-sm text-gray-600 mt-1 line-clamp-2'>
                        {section.content}
                      </div>
                    )}
                  </div>
                </label>
              ))}
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
                  .map(section => (
                    <div key={section.id} className='bg-white p-3 rounded border'>
                      <div className='font-medium text-[#20766a] mb-1'>
                        {section.type} ({section.duration} min)
                      </div>
                      <div className='text-sm text-gray-700 whitespace-pre-wrap'>
                        {section.content}
                      </div>
                    </div>
                  ))}
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
              className='px-4 py-2 bg-[#20766a] text-white rounded-lg hover:bg-[#1a6b62] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
            >
              <Send size={18} />
              {isSubmitting ? 'Publishing...' : currentPublishConfig ? 'Update' : 'Publish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
