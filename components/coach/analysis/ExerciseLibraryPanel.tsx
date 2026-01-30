'use client';

import { Library, X } from 'lucide-react';

interface Exercise {
  id: string;
  name: string;
  display_name: string | null;
  category: string;
  subcategory?: string;
  equipment?: string[];
  body_parts?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

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
  allExercises: Exercise[];
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
  allExercises,
  onExerciseSelect,
  onPositionChange,
  onSizeChange,
}: ExerciseLibraryPanelProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Mobile: Full-screen modal */}
      <div className='md:hidden fixed inset-0 bg-black bg-opacity-50 z-50' onClick={onClose}>
        <div
          className='fixed inset-4 bg-white rounded-lg shadow-2xl border-2 border-[#208479] flex flex-col'
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className='bg-[#208479] text-white p-2 rounded-t-lg flex justify-between items-center'>
            <h3 className='font-bold flex items-center gap-2 text-sm'>
              <Library size={18} />
              Exercise Library
            </h3>
            <button
              onClick={onClose}
              className='hover:bg-[#1a6b62] p-1 rounded transition'
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className='flex-1 overflow-auto p-2'>
            <div className='grid grid-cols-2 gap-2'>
              {exercises.map((exercise, idx) => {
                const exerciseData = allExercises.find(ex =>
                  ex.name === exercise.exercise ||
                  ex.display_name === exercise.exercise ||
                  ex.name.toLowerCase() === exercise.exercise.toLowerCase() ||
                  ex.display_name?.toLowerCase() === exercise.exercise.toLowerCase()
                );
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      onExerciseSelect(exercise.exercise);
                      onClose();
                    }}
                    className='text-left px-2 py-1.5 border border-gray-300 rounded-lg hover:bg-[#208479] hover:text-white transition group'
                  >
                    <div className='font-medium text-gray-900 group-hover:text-white text-xs leading-tight'>
                      {exerciseData?.display_name || exercise.exercise}
                    </div>
                    {exerciseData?.equipment && exerciseData.equipment.length > 0 && (
                      <div className='flex gap-1 mt-1 flex-wrap'>
                        {exerciseData.equipment.slice(0, 2).map(eq => (
                          <span key={eq} className='px-1 py-0.5 bg-blue-100 text-blue-700 group-hover:bg-blue-200 text-[10px] rounded'>
                            {eq}
                          </span>
                        ))}
                        {exerciseData.equipment.length > 2 && (
                          <span className='px-1 py-0.5 bg-gray-100 text-gray-600 group-hover:bg-gray-200 text-[10px] rounded'>
                            +{exerciseData.equipment.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                    <div className='text-[10px] text-gray-600 group-hover:text-white mt-0.5'>
                      {exercise.count > 0 ? `${exercise.count}x` : 'Not used yet'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: Draggable/resizable panel */}
      <div
        className='hidden md:flex fixed bg-white rounded-lg shadow-2xl border-2 border-[#208479] flex-col z-50'
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
            {exercises.map((exercise, idx) => {
              const exerciseData = allExercises.find(ex =>
                ex.name === exercise.exercise ||
                ex.display_name === exercise.exercise ||
                ex.name.toLowerCase() === exercise.exercise.toLowerCase() ||
                ex.display_name?.toLowerCase() === exercise.exercise.toLowerCase()
              );
              return (
                <button
                  key={idx}
                  onClick={() => onExerciseSelect(exercise.exercise)}
                  className='text-left px-3 py-2 border border-gray-300 rounded-lg hover:bg-[#208479] hover:text-white transition group'
                >
                  <div className='font-medium text-gray-900 group-hover:text-white'>
                    {exerciseData?.display_name || exercise.exercise}
                  </div>
                  {exerciseData?.equipment && exerciseData.equipment.length > 0 && (
                    <div className='flex gap-1 mt-1 flex-wrap'>
                      {exerciseData.equipment.map(eq => (
                        <span key={eq} className='px-1.5 py-0.5 bg-blue-100 text-blue-700 group-hover:bg-blue-200 text-xs rounded'>
                          {eq}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className='text-xs text-gray-600 group-hover:text-white mt-1'>
                    {exercise.count > 0 ? `${exercise.count}x` : 'Not used yet'}
                  </div>
                </button>
              );
            })}
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
    </>
  );
}
