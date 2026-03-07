'use client';

import { ChevronDown, ChevronRight, Library, X } from 'lucide-react';
import { useState, useMemo } from 'react';
import { FocusTrap } from '@/components/ui/FocusTrap';

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

const CATEGORY_ORDER = [
  'Pre-Workout',
  'Olympic Lifting & Barbell Movements',
  'Compound Exercises',
  'Gymnastics & Bodyweight',
  'Core, Abs & Isometric Holds',
  'Cardio & Conditioning',
  'Strength & Functional Conditioning',
  'Recovery & Stretching',
];

function findExerciseData(allExercises: Exercise[], exerciseName: string) {
  return allExercises.find(ex =>
    ex.name === exerciseName ||
    ex.display_name === exerciseName ||
    ex.name.toLowerCase() === exerciseName.toLowerCase() ||
    ex.display_name?.toLowerCase() === exerciseName.toLowerCase()
  );
}

function ExerciseButton({
  exercise,
  exerciseData,
  onSelect,
  compact,
}: {
  exercise: ExerciseWithCount;
  exerciseData: Exercise | undefined;
  onSelect: () => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      className={`text-left ${compact ? 'px-2 py-1.5' : 'px-3 py-2'} border border-gray-300 rounded-lg hover:bg-[#178da6] hover:text-white transition group`}
    >
      <div className={`font-medium text-gray-900 group-hover:text-white ${compact ? 'text-xs leading-tight' : ''}`}>
        {exerciseData?.display_name || exercise.exercise}
      </div>
      {exerciseData?.equipment && exerciseData.equipment.length > 0 && (
        <div className='flex gap-1 mt-1 flex-wrap'>
          {(compact ? exerciseData.equipment.slice(0, 2) : exerciseData.equipment).map(eq => (
            <span key={eq} className={`${compact ? 'px-1 py-0.5 text-[10px]' : 'px-1.5 py-0.5 text-xs'} bg-blue-100 text-blue-700 group-hover:bg-blue-200 rounded`}>
              {eq}
            </span>
          ))}
          {compact && exerciseData.equipment.length > 2 && (
            <span className='px-1 py-0.5 bg-gray-100 text-gray-600 group-hover:bg-gray-200 text-[10px] rounded'>
              +{exerciseData.equipment.length - 2}
            </span>
          )}
        </div>
      )}
      <div className={`${compact ? 'text-[10px] mt-0.5' : 'text-xs mt-1'} text-gray-600 group-hover:text-white`}>
        {exercise.count > 0 ? `${exercise.count}x` : 'Not used yet'}
      </div>
    </button>
  );
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
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    const groups: Record<string, { exercise: ExerciseWithCount; data: Exercise | undefined }[]> = {};

    for (const ex of exercises) {
      const data = findExerciseData(allExercises, ex.exercise);
      const category = data?.category || 'Uncategorized';
      if (!groups[category]) groups[category] = [];
      groups[category].push({ exercise: ex, data });
    }

    // Sort items within each category alphabetically
    for (const cat of Object.keys(groups)) {
      groups[cat].sort((a, b) => {
        const nameA = (a.data?.display_name || a.exercise.exercise).toLowerCase();
        const nameB = (b.data?.display_name || b.exercise.exercise).toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }

    // Sort categories by CATEGORY_ORDER
    const sorted = CATEGORY_ORDER
      .filter(cat => groups[cat])
      .map(cat => ({ category: cat, items: groups[cat] }));

    // Add any categories not in the order list
    for (const cat of Object.keys(groups)) {
      if (!CATEGORY_ORDER.includes(cat)) {
        sorted.push({ category: cat, items: groups[cat] });
      }
    }

    return sorted;
  }, [exercises, allExercises]);

  const toggleCategory = (category: string) => {
    setCollapsed(prev => ({ ...prev, [category]: !prev[category] }));
  };

  if (!isOpen) return null;

  return (
    <FocusTrap>
    <>
      {/* Mobile: Full-screen modal */}
      <div className='md:hidden fixed inset-0 bg-black bg-opacity-50 z-50' onClick={onClose}>
        <div
          className='fixed inset-4 bg-white rounded-lg shadow-2xl border-2 border-[#178da6] flex flex-col'
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className='bg-[#178da6] text-white p-2 rounded-t-lg flex justify-between items-center'>
            <h3 className='font-bold flex items-center gap-2 text-sm'>
              <Library size={18} />
              Exercise Library
            </h3>
            <button
              onClick={onClose}
              className='hover:bg-[#14758c] p-1 rounded transition'
              aria-label='Close'
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className='flex-1 overflow-auto p-2'>
            {grouped.map(({ category, items }) => (
              <div key={category} className='mb-2'>
                <button
                  onClick={() => toggleCategory(category)}
                  className='w-full flex items-center gap-1.5 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-left'
                >
                  {collapsed[category] ? <ChevronRight size={14} className='text-gray-500 shrink-0' /> : <ChevronDown size={14} className='text-gray-500 shrink-0' />}
                  <span className='font-semibold text-xs text-gray-700'>{category}</span>
                  <span className='text-[10px] text-gray-400 ml-auto'>{items.length}</span>
                </button>
                {!collapsed[category] && (
                  <div className='grid grid-cols-2 gap-1.5 mt-1.5'>
                    {items.map(({ exercise, data }, idx) => (
                      <ExerciseButton
                        key={idx}
                        exercise={exercise}
                        exerciseData={data}
                        onSelect={() => { onExerciseSelect(exercise.exercise); onClose(); }}
                        compact
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop: Draggable/resizable panel */}
      <div
        className='hidden md:flex fixed bg-white rounded-lg shadow-2xl border-2 border-[#178da6] flex-col z-50'
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: `${size.width}px`,
          height: `${size.height}px`,
        }}
      >
        {/* Header - Draggable */}
        <div
          className='bg-[#178da6] text-white p-3 rounded-t-lg cursor-move flex justify-between items-center'
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
            className='hover:bg-[#14758c] p-1 rounded transition'
            aria-label='Close'
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-auto p-4'>
          {grouped.map(({ category, items }) => (
            <div key={category} className='mb-3'>
              <button
                onClick={() => toggleCategory(category)}
                className='w-full flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-left'
              >
                {collapsed[category] ? <ChevronRight size={16} className='text-gray-500 shrink-0' /> : <ChevronDown size={16} className='text-gray-500 shrink-0' />}
                <span className='font-semibold text-sm text-gray-700'>{category}</span>
                <span className='text-xs text-gray-400 ml-auto'>{items.length}</span>
              </button>
              {!collapsed[category] && (
                <div
                  className='grid gap-2 mt-2'
                  style={{
                    gridTemplateColumns: `repeat(${Math.max(2, Math.floor(size.width / 200))}, minmax(0, 1fr))`
                  }}
                >
                  {items.map(({ exercise, data }, idx) => (
                    <ExerciseButton
                      key={idx}
                      exercise={exercise}
                      exerciseData={data}
                      onSelect={() => onExerciseSelect(exercise.exercise)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
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
    </FocusTrap>
  );
}
