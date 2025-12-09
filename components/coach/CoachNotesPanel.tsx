'use client';

import { X } from 'lucide-react';
import { useState } from 'react';
import { linkifyText } from '@/utils/linkify';

interface CoachNotesPanelProps {
  isOpen: boolean;
  notes: string;
  mode: 'floating' | 'side';
  // Floating mode props
  position?: { bottom: number; left: number };
  size?: { width: number; height: number };
  onDragStart?: (e: React.MouseEvent) => void;
  onResizeStart?: (e: React.MouseEvent, corner: 'nw' | 'ne' | 'sw' | 'se') => void;
  // Common props
  onClose: () => void;
  onChange: (notes: string) => void;
}

export default function CoachNotesPanel({
  isOpen,
  notes,
  mode,
  position,
  size,
  onDragStart,
  onResizeStart,
  onClose,
  onChange,
}: CoachNotesPanelProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (!isOpen) return null;

  // Floating modal (panel mode)
  if (mode === 'floating') {
    return (
      <div
        className='fixed z-[70]'
        style={{
          bottom: `${position?.bottom || 20}px`,
          left: `${position?.left || 820}px`,
        }}
      >
        <div
          className='bg-white rounded-lg shadow-2xl flex flex-col relative border-4 border-[#208479]'
          style={{
            width: `${size?.width || 600}px`,
            height: `${size?.height || 400}px`,
          }}
        >
          {/* Corner Resize Handles */}
          <div
            className='absolute bottom-0 right-0 w-8 h-8 cursor-se-resize z-50'
            onMouseDown={(e) => onResizeStart?.(e, 'se')}
            title='Drag to resize'
          >
            <div className='absolute bottom-0 right-0 w-0 h-0 border-l-[32px] border-l-transparent border-b-[32px] border-b-[#208479] hover:border-b-[#1a6b62] transition'></div>
          </div>
          <div
            className='absolute top-0 right-0 w-8 h-8 cursor-ne-resize z-50'
            onMouseDown={(e) => onResizeStart?.(e, 'ne')}
            title='Drag to resize'
          >
            <div className='absolute top-0 right-0 w-0 h-0 border-l-[32px] border-l-transparent border-t-[32px] border-t-[#208479] hover:border-t-[#1a6b62] transition rounded-tr-lg'></div>
          </div>
          <div
            className='absolute bottom-0 left-0 w-8 h-8 cursor-sw-resize z-50'
            onMouseDown={(e) => onResizeStart?.(e, 'sw')}
            title='Drag to resize'
          >
            <div className='absolute bottom-0 left-0 w-0 h-0 border-r-[32px] border-r-transparent border-b-[32px] border-b-[#208479] hover:border-b-[#1a6b62] transition rounded-bl-lg'></div>
          </div>
          <div
            className='absolute top-0 left-0 w-8 h-8 cursor-nw-resize z-50'
            onMouseDown={(e) => onResizeStart?.(e, 'nw')}
            title='Drag to resize'
          >
            <div className='absolute top-0 left-0 w-0 h-0 border-r-[32px] border-r-transparent border-t-[32px] border-t-[#208479] hover:border-t-[#1a6b62] transition rounded-tl-lg'></div>
          </div>

          {/* Header - Draggable */}
          <div
            className='bg-[#208479] text-white p-4 rounded-t-lg flex justify-between items-center flex-shrink-0 cursor-move'
            onMouseDown={onDragStart}
          >
            <h2 className='text-xl font-bold'>Coach Notes</h2>
            <button
              onClick={onClose}
              className='hover:bg-[#1a6b62] p-1 rounded transition'
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className='flex-1 overflow-y-auto p-4'>
            {isEditing || !notes ? (
              <textarea
                value={notes}
                onChange={e => onChange(e.target.value)}
                onBlur={() => setIsEditing(false)}
                onFocus={() => setIsEditing(true)}
                autoFocus={isEditing}
                placeholder='Add private notes about this workout...'
                className='w-full h-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 placeholder-gray-400 resize-none text-sm'
              />
            ) : (
              <div
                onClick={() => setIsEditing(true)}
                className='w-full h-full px-3 py-2 border border-gray-300 rounded-lg cursor-text text-gray-900 text-sm hover:border-gray-400 transition'
                dangerouslySetInnerHTML={{ __html: linkifyText(notes) }}
              />
            )}
          </div>

          {/* Footer */}
          <div className='border-t p-4 bg-gray-50 rounded-b-lg flex-shrink-0'>
            <p className='text-xs text-gray-500'>
              Notes are private and searchable. Auto-saved when you save the WOD.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Side panel (modal mode)
  return (
    <div className='w-[400px] bg-gray-50 shadow-xl flex flex-col border-l-2 border-[#208479]'>
      <div className='bg-[#208479] text-white p-4 flex justify-between items-center'>
        <h3 className='text-lg font-bold'>Coach Notes</h3>
        <button
          onClick={onClose}
          className='hover:bg-[#1a6b62] p-1 rounded transition'
        >
          <X size={20} />
        </button>
      </div>
      <div className='flex-1 overflow-y-auto p-4'>
        {isEditing || !notes ? (
          <textarea
            value={notes}
            onChange={e => onChange(e.target.value)}
            onBlur={() => setIsEditing(false)}
            onFocus={() => setIsEditing(true)}
            autoFocus={isEditing}
            placeholder='Add private notes about this workout...'
            className='w-full h-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 placeholder-gray-400 resize-none text-sm'
          />
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className='w-full h-full px-3 py-2 border border-gray-300 rounded-lg cursor-text text-gray-900 text-sm hover:border-gray-400 transition'
            dangerouslySetInnerHTML={{ __html: linkifyText(notes) }}
          />
        )}
      </div>
      <div className='border-t p-3 bg-white'>
        <p className='text-xs text-gray-500'>
          Notes are private and searchable. Auto-saved when you save the WOD.
        </p>
      </div>
    </div>
  );
}
