'use client';

import { WODFormData } from './WODModal';
import { X } from 'lucide-react';
import { useEffect } from 'react';

interface NotesModalProps {
  isOpen: boolean;
  wod: WODFormData | null;
  notesDraft: string;
  onNotesDraftChange: (notes: string) => void;
  onClose: () => void;
  onSave: () => void;
  modalSize: { width: number; height: number };
  onModalSizeChange: (size: { width: number; height: number }) => void;
  isResizing: boolean;
  onResizingChange: (resizing: boolean) => void;
  resizeStart: { x: number; y: number; width: number; height: number };
  onResizeStartChange: (start: { x: number; y: number; width: number; height: number }) => void;
}

export default function NotesModal({
  isOpen,
  wod,
  notesDraft,
  onNotesDraftChange,
  onClose,
  onSave,
  modalSize,
  onModalSizeChange,
  isResizing,
  onResizingChange,
  resizeStart,
  onResizeStartChange,
}: NotesModalProps) {
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;

      const newWidth = Math.max(400, Math.min(1200, resizeStart.width + deltaX * 2));
      const newHeight = Math.max(
        400,
        Math.min(window.innerHeight * 0.9, resizeStart.height + deltaY * 2)
      );

      onModalSizeChange({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      onResizingChange(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStart, onModalSizeChange, onResizingChange]);

  const handleResizeStart = (e: React.MouseEvent, corner: string) => {
    e.preventDefault();
    e.stopPropagation();
    onResizingChange(true);
    onResizeStartChange({
      x: e.clientX,
      y: e.clientY,
      width: modalSize.width,
      height: modalSize.height,
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className='fixed inset-0 bg-black bg-opacity-50 z-40' onClick={onClose} />

      {/* Floating Modal */}
      <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
        <div
          className='bg-white rounded-lg shadow-2xl flex flex-col relative'
          style={{
            width: `${modalSize.width}px`,
            height: `${modalSize.height}px`,
            maxWidth: '90vw',
            maxHeight: '90vh',
          }}
        >
          {/* Resize Handles - Large corner triangles */}
          {/* Bottom-right */}
          <div
            className='absolute bottom-0 right-0 w-12 h-12 cursor-se-resize z-50'
            onMouseDown={(e) => handleResizeStart(e, 'se')}
            title='Drag to resize'
          >
            <div className='absolute bottom-0 right-0 w-0 h-0 border-l-[48px] border-l-transparent border-b-[48px] border-b-[#208479] hover:border-b-[#1a6b62] transition'></div>
            <div className='absolute bottom-1 right-1 text-white text-xs font-bold'>⇘</div>
          </div>
          {/* Top-right */}
          <div
            className='absolute top-0 right-0 w-12 h-12 cursor-ne-resize z-50'
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
            title='Drag to resize'
          >
            <div className='absolute top-0 right-0 w-0 h-0 border-l-[48px] border-l-transparent border-t-[48px] border-t-[#208479] hover:border-t-[#1a6b62] transition rounded-tr-lg'></div>
            <div className='absolute top-1 right-1 text-white text-xs font-bold'>⇗</div>
          </div>
          {/* Bottom-left */}
          <div
            className='absolute bottom-0 left-0 w-12 h-12 cursor-sw-resize z-50'
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
            title='Drag to resize'
          >
            <div className='absolute bottom-0 left-0 w-0 h-0 border-r-[48px] border-r-transparent border-b-[48px] border-b-[#208479] hover:border-b-[#1a6b62] transition rounded-bl-lg'></div>
            <div className='absolute bottom-1 left-1 text-white text-xs font-bold'>⇙</div>
          </div>
          {/* Top-left */}
          <div
            className='absolute top-0 left-0 w-12 h-12 cursor-nw-resize z-50'
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
            title='Drag to resize'
          >
            <div className='absolute top-0 left-0 w-0 h-0 border-r-[48px] border-r-transparent border-t-[48px] border-t-[#208479] hover:border-t-[#1a6b62] transition rounded-tl-lg'></div>
            <div className='absolute top-1 left-1 text-white text-xs font-bold'>⇖</div>
          </div>
          {/* Header */}
          <div className='bg-[#208479] text-white p-6 rounded-t-lg flex justify-between items-start flex-shrink-0'>
            <div>
              <h2 className='text-2xl font-bold mb-2'>Coach Notes</h2>
              <p className='text-sm opacity-90'>
                {wod?.title} -{' '}
                {wod?.date
                  ? new Date(wod.date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className='hover:bg-[#1a6b62] p-2 rounded transition'
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className='flex-1 overflow-y-auto p-6'>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-semibold mb-2 text-gray-900'>
                  Notes
                </label>
                <textarea
                  value={notesDraft}
                  onChange={e => onNotesDraftChange(e.target.value)}
                  placeholder='Add private notes about this workout...&#10;&#10;Examples:&#10;- Athlete feedback&#10;- Scaling options used&#10;- Time management notes&#10;- Equipment setup details&#10;- Modifications made'
                  className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 placeholder-gray-400 min-h-[400px] resize-y font-mono text-sm'
                />
                <p className='text-xs text-gray-500 mt-2'>
                  These notes are private and searchable. They&apos;ll help you find and reference
                  this workout in the future.
                </p>
              </div>

              {/* WOD Preview */}
              <div className='border-t pt-4'>
                <h3 className='text-sm font-semibold text-gray-900 mb-2'>Workout Preview</h3>
                <div className='bg-gray-50 rounded-lg p-4 space-y-2'>
                  <div className='text-sm'>
                    <span className='font-semibold text-gray-700'>Class Times:</span>{' '}
                    <span className='text-gray-900'>
                      {wod?.classTimes?.join(', ') || 'None'}
                    </span>
                  </div>
                  <div className='text-sm'>
                    <span className='font-semibold text-gray-700'>Sections:</span>{' '}
                    <span className='text-gray-900'>{wod?.sections?.length || 0}</span>
                  </div>
                  <div className='text-sm'>
                    <span className='font-semibold text-gray-700'>Total Duration:</span>{' '}
                    <span className='text-gray-900'>
                      {wod?.sections?.reduce((sum, s) => sum + s.duration, 0) || 0} mins
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className='border-t p-6 bg-gray-50 rounded-b-lg flex justify-end gap-3 flex-shrink-0'>
            <button
              onClick={onClose}
              className='px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 font-medium transition'
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className='px-6 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white rounded-lg font-medium transition'
            >
              Save Notes
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
