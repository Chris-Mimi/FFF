'use client';

import { Library, X } from 'lucide-react';

interface ExerciseWithCount {
  exercise: string;
  count: number;
}

interface ExerciseLibraryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  position: { top: number; left: number };
  size: { width: number; height: number };
  exercises: ExerciseWithCount[];
  onExerciseSelect: (exercise: string) => void;
  onPositionChange: (position: { top: number; left: number }) => void;
  onSizeChange: (size: { width: number; height: number }) => void;
}

export default function ExerciseLibraryPanel({
  isOpen,
  onClose,
  position,
  size,
  exercises,
  onExerciseSelect,
  onPositionChange,
  onSizeChange,
}: ExerciseLibraryPanelProps) {
  if (!isOpen) return null;

  return (
    <div
      className='fixed bg-white rounded-lg shadow-2xl border-2 border-[#208479] flex flex-col z-50'
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
      }}
    >
      {/* Header - Draggable */}
      <div
        className='bg-[#208479] text-white p-3 rounded-t-lg cursor-move flex justify-between items-center'
        onMouseDown={(e) => {
          const startX = e.clientX - position.left;
          const startY = e.clientY - position.top;

          const handleMouseMove = (moveEvent: MouseEvent) => {
            onPositionChange({
              left: moveEvent.clientX - startX,
              top: moveEvent.clientY - startY,
            });
          };

          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };

          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        }}
      >
        <h3 className='font-bold flex items-center gap-2'>
          <Library size={20} />
          Exercise Library
        </h3>
        <button
          onClick={onClose}
          className='hover:bg-[#1a6b62] p-1 rounded transition'
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className='flex-1 overflow-auto p-4'>
        <div
          className='grid gap-2'
          style={{
            gridTemplateColumns: `repeat(${Math.max(2, Math.floor(size.width / 200))}, minmax(0, 1fr))`
          }}
        >
          {exercises.map((exercise, idx) => (
            <button
              key={idx}
              onClick={() => onExerciseSelect(exercise.exercise)}
              className='text-left px-3 py-2 border border-gray-300 rounded-lg hover:bg-[#208479] hover:text-white transition group'
            >
              <div className='font-medium text-gray-900 group-hover:text-white'>{exercise.exercise}</div>
              <div className='text-xs text-gray-600 group-hover:text-white'>
                {exercise.count > 0 ? `${exercise.count}x` : 'Not used yet'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Resize Handle */}
      <div
        className='absolute bottom-0 right-0 w-4 h-4 cursor-se-resize'
        onMouseDown={(e) => {
          e.stopPropagation();
          const startX = e.clientX;
          const startY = e.clientY;
          const startWidth = size.width;
          const startHeight = size.height;

          const handleMouseMove = (moveEvent: MouseEvent) => {
            onSizeChange({
              width: Math.max(400, startWidth + (moveEvent.clientX - startX)),
              height: Math.max(300, startHeight + (moveEvent.clientY - startY)),
            });
          };

          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };

          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        }}
      >
        <div className='absolute bottom-1 right-1 w-0 h-0 border-l-8 border-l-transparent border-b-8 border-b-gray-400' />
      </div>
    </div>
  );
}
