'use client';

import { Play, X } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FocusTrap } from '@/components/ui/FocusTrap';

interface MovementInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  description: string | null;
  videoUrl: string | null;
  onPlayVideo: (name: string, url: string) => void;
}

/**
 * Read-only panel showing an exercise's written description from the library,
 * so the coach doesn't have to copy movement mechanics into the workout's
 * Intent/Stimulus or Notes fields. Sits BELOW ExerciseVideoModal (z-110) so the
 * video can open on top of it.
 */
export default function MovementInfoModal({
  isOpen,
  onClose,
  exerciseName,
  description,
  videoUrl,
  onPlayVideo,
}: MovementInfoModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  // Portal to <body> so the panel escapes the WorkoutModal's stacking context.
  return createPortal(
    <FocusTrap>
      <>
        <div className='fixed inset-0 bg-black/50 z-[105]' onClick={onClose} />

        <div
          className='fixed z-[105] bg-white rounded-lg shadow-2xl flex flex-col
                     inset-x-4 top-16 bottom-16
                     sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-24 sm:-translate-x-1/2
                     sm:w-[min(36rem,calc(100vw-2rem))] sm:max-h-[70vh]'
          role='dialog'
          aria-modal='true'
          aria-label={`${exerciseName} — movement description`}
        >
          {/* Header */}
          <div className='flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-200 bg-sky-50 rounded-t-lg'>
            <h3 className='text-sm font-semibold text-sky-900 leading-snug'>{exerciseName}</h3>
            <button
              type='button'
              onClick={onClose}
              className='flex-shrink-0 p-1 -m-1 text-gray-400 hover:text-gray-700 rounded transition'
              aria-label='Close'
            >
              <X size={18} />
            </button>
          </div>

          {/* Description */}
          <div className='flex-1 overflow-y-auto px-4 py-3'>
            {description ? (
              <p className='text-sm text-gray-800 whitespace-pre-wrap leading-relaxed'>
                {description}
              </p>
            ) : (
              <p className='text-sm text-gray-400 italic'>
                No description saved for this movement yet.
              </p>
            )}
          </div>

          {/* Video handoff */}
          {videoUrl && (
            <div className='px-4 py-3 border-t border-gray-200'>
              <button
                type='button'
                onClick={() => onPlayVideo(exerciseName, videoUrl)}
                className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 transition'
              >
                <Play size={12} className='fill-white' />
                Play demo video
              </button>
            </div>
          )}
        </div>
      </>
    </FocusTrap>,
    document.body
  );
}
