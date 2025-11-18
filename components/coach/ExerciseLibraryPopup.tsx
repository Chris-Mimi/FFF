'use client';

import { supabase } from '@/lib/supabase';
import { Library, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface Exercise {
  id: string;
  name: string;
  category: string;
  description: string | null;
  video_url: string | null;
  tags: string[] | null;
}

// Exercise Library Popup Component
function ExerciseLibraryPopup({
  isOpen,
  onClose,
  onSelectExercise,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Position and size state for draggable/resizable modal
  const [librarySize, setLibrarySize] = useState({ width: 800, height: 600 });
  const [libraryPos, setLibraryPos] = useState({ bottom: 100, left: 300 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeCorner, setResizeCorner] = useState<string>('');
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, bottom: 0, left: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Handle drag
  const handleLibraryDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      bottom: libraryPos.bottom,
      left: libraryPos.left,
    });
  };

  // Handle resize
  const handleLibraryResizeStart = (e: React.MouseEvent, corner: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeCorner(corner);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: librarySize.width,
      height: librarySize.height,
    });
  };

  // Drag and resize effects
  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        setLibraryPos({
          bottom: Math.max(0, dragStart.bottom - deltaY),
          left: Math.max(0, dragStart.left + deltaX),
        });
      };
      const handleMouseUp = () => setIsDragging(false);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }

    if (isResizing) {
      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        let newBottom = libraryPos.bottom;
        let newLeft = libraryPos.left;

        switch (resizeCorner) {
          case 'se':
            newWidth = resizeStart.width + deltaX;
            newHeight = resizeStart.height + deltaY;
            newBottom = libraryPos.bottom - deltaY;
            break;
          case 'sw':
            newWidth = resizeStart.width - deltaX;
            newHeight = resizeStart.height + deltaY;
            newLeft = libraryPos.left + deltaX;
            newBottom = libraryPos.bottom - deltaY;
            break;
          case 'ne':
            newWidth = resizeStart.width + deltaX;
            newHeight = resizeStart.height - deltaY;
            newBottom = libraryPos.bottom - deltaY;
            break;
          case 'nw':
            newWidth = resizeStart.width - deltaX;
            newHeight = resizeStart.height - deltaY;
            newLeft = libraryPos.left + deltaX;
            newBottom = libraryPos.bottom - deltaY;
            break;
        }

        newWidth = Math.max(600, Math.min(1400, newWidth));
        newHeight = Math.max(400, Math.min(window.innerHeight * 0.9, newHeight));
        newBottom = Math.max(0, newBottom);
        newLeft = Math.max(0, newLeft);

        setLibrarySize({ width: newWidth, height: newHeight });
        const updates: { left?: number; bottom?: number } = {};
        if (resizeCorner === 'sw' || resizeCorner === 'nw') updates.left = newLeft;
        updates.bottom = newBottom;
        setLibraryPos(prev => ({ ...prev, ...updates }));
      };
      const handleMouseUp = () => {
        setIsResizing(false);
        setResizeCorner('');
      };
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart, resizeCorner]);

  // Fetch exercises from Supabase only once
  useEffect(() => {
    if (isOpen && !hasFetched) {
      fetchExercises();
    }
  }, [isOpen, hasFetched]);

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('exercises').select('*').order('name');

      if (error) throw error;
      setExercises(data || []);
      setHasFetched(true);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Clear search and focus input when opening
      setSearchTerm('');
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    } else {
      // Clear search when closing to ensure clean state on next open
      setSearchTerm('');
    }
  }, [isOpen]);

  // Filter exercises across all categories - memoized to ensure recalculation
  const filteredCategories = useMemo(() => {
    console.log('Recalculating filtered categories. searchTerm:', JSON.stringify(searchTerm), 'length:', searchTerm.length);

    // Group exercises by category
    const grouped: Record<string, Exercise[]> = {};

    exercises.forEach(exercise => {
      if (!grouped[exercise.category]) {
        grouped[exercise.category] = [];
      }
      grouped[exercise.category].push(exercise);
    });

    const trimmedSearch = searchTerm.trim();
    console.log('Trimmed search:', JSON.stringify(trimmedSearch), 'length:', trimmedSearch.length);

    if (!trimmedSearch) {
      console.log('Search is empty, returning all exercises');
      return grouped;
    }

    console.log('Search has value, filtering...');
    // With search term - filter exercises in each category
    const filtered: Record<string, Exercise[]> = {};
    Object.entries(grouped).forEach(([category, categoryExercises]) => {
      const matchingExercises = categoryExercises.filter(
        exercise =>
          exercise.name.toLowerCase().includes(trimmedSearch.toLowerCase()) ||
          exercise.tags?.some(tag => tag.toLowerCase().includes(trimmedSearch.toLowerCase()))
      );
      if (matchingExercises.length > 0) {
        filtered[category] = matchingExercises;
      }
    });
    console.log('Returning filtered results');
    return filtered;
  }, [exercises, searchTerm]);

  const totalExercises = useMemo(
    () => Object.values(filteredCategories).flat().length,
    [filteredCategories]
  );

  if (!isOpen) return null;

  const handleSelectExercise = (exercise: string) => {
    onSelectExercise(exercise);
    // Keep library open for multiple selections
  };

  // Calculate responsive columns based on width
  const getColumnClass = () => {
    if (librarySize.width >= 1100) return 'grid-cols-4';
    if (librarySize.width >= 800) return 'grid-cols-3';
    return 'grid-cols-2';
  };

  return (
    <div
      className='fixed z-[100]'
      style={{
        bottom: `${libraryPos.bottom}px`,
        left: `${libraryPos.left}px`,
      }}
    >
      <div
        className='bg-white rounded-lg shadow-2xl flex flex-col relative border-4 border-[#208479]'
        style={{
          width: `${librarySize.width}px`,
          height: `${librarySize.height}px`,
        }}
      >
        {/* Corner Resize Handles */}
        <div
          className='absolute bottom-0 right-0 w-8 h-8 cursor-se-resize z-50'
          onMouseDown={e => handleLibraryResizeStart(e, 'se')}
          title='Drag to resize'
        >
          <div className='absolute bottom-0 right-0 w-0 h-0 border-l-[32px] border-l-transparent border-b-[32px] border-b-[#208479] hover:border-b-[#1a6b62] transition'></div>
        </div>
        <div
          className='absolute top-0 right-0 w-8 h-8 cursor-ne-resize z-50'
          onMouseDown={e => handleLibraryResizeStart(e, 'ne')}
          title='Drag to resize'
        >
          <div className='absolute top-0 right-0 w-0 h-0 border-l-[32px] border-l-transparent border-t-[32px] border-t-[#208479] hover:border-t-[#1a6b62] transition rounded-tr-lg'></div>
        </div>
        <div
          className='absolute bottom-0 left-0 w-8 h-8 cursor-sw-resize z-50'
          onMouseDown={e => handleLibraryResizeStart(e, 'sw')}
          title='Drag to resize'
        >
          <div className='absolute bottom-0 left-0 w-0 h-0 border-r-[32px] border-r-transparent border-b-[32px] border-b-[#208479] hover:border-b-[#1a6b62] transition rounded-bl-lg'></div>
        </div>
        <div
          className='absolute top-0 left-0 w-8 h-8 cursor-nw-resize z-50'
          onMouseDown={e => handleLibraryResizeStart(e, 'nw')}
          title='Drag to resize'
        >
          <div className='absolute top-0 left-0 w-0 h-0 border-r-[32px] border-r-transparent border-t-[32px] border-t-[#208479] hover:border-t-[#1a6b62] transition rounded-tl-lg'></div>
        </div>

        {/* Header - Draggable */}
        <div
          className='bg-[#208479] text-white p-4 flex justify-between items-center rounded-t-lg cursor-move flex-shrink-0'
          onMouseDown={handleLibraryDragStart}
        >
          <h3 className='font-bold flex items-center gap-2'>
            <Library size={20} />
            Exercise Library
          </h3>
          <button
            onClick={onClose}
            className='px-4 py-2 bg-[#1a6b62] hover:bg-[#145a52] text-white rounded-lg font-semibold transition flex items-center gap-2'
          >
            Done
            <X size={18} />
          </button>
        </div>

        {/* Search Box */}
        <div className='p-4 border-b'>
          <div className='relative'>
            <Search
              className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400'
              size={18}
            />
            <input
              ref={searchInputRef}
              type='text'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder='Search exercises...'
              autoComplete='off'
              readOnly
              onFocus={e => e.currentTarget.removeAttribute('readonly')}
              className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 placeholder-gray-400'
            />
          </div>
          <p className='text-xs text-gray-600 mt-2'>
            {totalExercises} exercise{totalExercises !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Exercise List by Category */}
        <div className='flex-1 overflow-y-auto p-4'>
          {loading ? (
            <div className='text-center py-8 text-gray-500'>
              <p className='text-sm'>Loading exercises...</p>
            </div>
          ) : Object.keys(filteredCategories).length > 0 ? (
            <div className='space-y-4'>
              {Object.entries(filteredCategories).map(([category, categoryExercises]) => (
                <div key={category}>
                  {/* Category Header */}
                  <div className='bg-[#208479] text-white px-3 py-2 rounded-t-lg mb-2'>
                    <h4 className='text-sm font-bold uppercase tracking-wide'>{category}</h4>
                  </div>

                  {/* Exercise Buttons - Responsive Grid */}
                  <div className={`grid ${getColumnClass()} gap-2 mb-3`}>
                    {categoryExercises.map(exercise => (
                      <button
                        key={exercise.id}
                        onClick={() => handleSelectExercise(exercise.name)}
                        className='w-full text-left px-3 py-2 hover:bg-[#208479] hover:text-white rounded transition text-sm text-gray-900 hover:text-white'
                        title={exercise.description || undefined}
                      >
                        {exercise.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='text-center py-8 text-gray-500'>
              <p className='text-sm'>No exercises found</p>
              <p className='text-xs mt-1'>Try a different search term</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExerciseLibraryPopup;
