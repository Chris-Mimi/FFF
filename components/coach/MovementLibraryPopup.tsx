'use client';

import { supabase } from '@/lib/supabase';
import { Library, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { BarbellLift, Benchmark, ForgeBenchmark } from '@/types/movements';

interface Exercise {
  id: string;
  name: string;
  category: string;
  description: string | null;
  video_url: string | null;
  tags: string[] | null;
}

type TabType = 'exercises' | 'lifts' | 'benchmarks' | 'forge';

interface MovementLibraryPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: string) => void;
  onSelectLift: (lift: BarbellLift) => void;
  onSelectBenchmark: (benchmark: Benchmark) => void;
  onSelectForgeBenchmark: (forge: ForgeBenchmark) => void;
}

// Movement Library Popup Component
function MovementLibraryPopup({
  isOpen,
  onClose,
  onSelectExercise,
  onSelectLift,
  onSelectBenchmark,
  onSelectForgeBenchmark,
}: MovementLibraryPopupProps) {
  const [activeTab, setActiveTab] = useState<TabType>('exercises');
  const [searchTerm, setSearchTerm] = useState('');

  // Data states
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [lifts, setLifts] = useState<BarbellLift[]>([]);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [forgeBenchmarks, setForgeBenchmarks] = useState<ForgeBenchmark[]>([]);

  const [loading, setLoading] = useState(false);
  const [hasFetchedExercises, setHasFetchedExercises] = useState(false);
  const [hasFetchedLifts, setHasFetchedLifts] = useState(false);
  const [hasFetchedBenchmarks, setHasFetchedBenchmarks] = useState(false);
  const [hasFetchedForge, setHasFetchedForge] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Position and size state for draggable/resizable modal
  const [librarySize, setLibrarySize] = useState({ width: 800, height: 600 });
  const [libraryPos, setLibraryPos] = useState({ bottom: 100, left: 820 }); // Position to right of WorkoutModal
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
  }, [isDragging, isResizing, dragStart, resizeStart, resizeCorner, libraryPos.bottom, libraryPos.left]);

  // Fetch data based on active tab
  useEffect(() => {
    if (!isOpen) return;

    switch (activeTab) {
      case 'exercises':
        if (!hasFetchedExercises) fetchExercises();
        break;
      case 'lifts':
        if (!hasFetchedLifts) fetchLifts();
        break;
      case 'benchmarks':
        if (!hasFetchedBenchmarks) fetchBenchmarks();
        break;
      case 'forge':
        if (!hasFetchedForge) fetchForgeBenchmarks();
        break;
    }
  }, [isOpen, activeTab, hasFetchedExercises, hasFetchedLifts, hasFetchedBenchmarks, hasFetchedForge]);

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('exercises').select('*').order('name');
      if (error) throw error;
      setExercises(data || []);
      setHasFetchedExercises(true);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLifts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('barbell_lifts')
        .select('*')
        .order('display_order');
      if (error) throw error;
      setLifts(data || []);
      setHasFetchedLifts(true);
    } catch (error) {
      console.error('Error fetching lifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBenchmarks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('benchmark_workouts')
        .select('*')
        .order('display_order');
      if (error) throw error;
      setBenchmarks(data || []);
      setHasFetchedBenchmarks(true);
    } catch (error) {
      console.error('Error fetching benchmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchForgeBenchmarks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('forge_benchmarks')
        .select('*')
        .order('display_order');
      if (error) throw error;
      setForgeBenchmarks(data || []);
      setHasFetchedForge(true);
    } catch (error) {
      console.error('Error fetching forge benchmarks:', error);
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
      // Clear search when closing
      setSearchTerm('');
    }
  }, [isOpen]);

  // Filter exercises by category - memoized
  const filteredExerciseCategories = useMemo(() => {
    const grouped: Record<string, Exercise[]> = {};
    exercises.forEach(exercise => {
      if (!grouped[exercise.category]) {
        grouped[exercise.category] = [];
      }
      grouped[exercise.category].push(exercise);
    });

    const trimmedSearch = searchTerm.trim();
    if (!trimmedSearch) return grouped;

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
    return filtered;
  }, [exercises, searchTerm]);

  // Filter lifts by category
  const filteredLiftCategories = useMemo(() => {
    const grouped: Record<string, BarbellLift[]> = {};
    lifts.forEach(lift => {
      if (!grouped[lift.category]) {
        grouped[lift.category] = [];
      }
      grouped[lift.category].push(lift);
    });

    const trimmedSearch = searchTerm.trim();
    if (!trimmedSearch) return grouped;

    const filtered: Record<string, BarbellLift[]> = {};
    Object.entries(grouped).forEach(([category, categoryLifts]) => {
      const matchingLifts = categoryLifts.filter(lift =>
        lift.name.toLowerCase().includes(trimmedSearch.toLowerCase())
      );
      if (matchingLifts.length > 0) {
        filtered[category] = matchingLifts;
      }
    });
    return filtered;
  }, [lifts, searchTerm]);

  // Filter benchmarks
  const filteredBenchmarks = useMemo(() => {
    const trimmedSearch = searchTerm.trim();
    if (!trimmedSearch) return benchmarks;
    return benchmarks.filter(b =>
      b.name.toLowerCase().includes(trimmedSearch.toLowerCase())
    );
  }, [benchmarks, searchTerm]);

  // Filter forge benchmarks
  const filteredForgeBenchmarks = useMemo(() => {
    const trimmedSearch = searchTerm.trim();
    if (!trimmedSearch) return forgeBenchmarks;
    return forgeBenchmarks.filter(f =>
      f.name.toLowerCase().includes(trimmedSearch.toLowerCase())
    );
  }, [forgeBenchmarks, searchTerm]);

  // Calculate total items based on active tab
  const totalItems = useMemo(() => {
    switch (activeTab) {
      case 'exercises':
        return Object.values(filteredExerciseCategories).flat().length;
      case 'lifts':
        return Object.values(filteredLiftCategories).flat().length;
      case 'benchmarks':
        return filteredBenchmarks.length;
      case 'forge':
        return filteredForgeBenchmarks.length;
      default:
        return 0;
    }
  }, [activeTab, filteredExerciseCategories, filteredLiftCategories, filteredBenchmarks, filteredForgeBenchmarks]);

  if (!isOpen) return null;

  const handleSelectExercise = (exercise: string) => {
    onSelectExercise(exercise);
  };

  const handleSelectLift = (lift: BarbellLift) => {
    onSelectLift(lift);
  };

  const handleSelectBenchmark = (benchmark: Benchmark) => {
    onSelectBenchmark(benchmark);
  };

  const handleSelectForgeBenchmark = (forge: ForgeBenchmark) => {
    onSelectForgeBenchmark(forge);
  };

  // Calculate responsive columns based on width
  const getColumnClass = () => {
    if (librarySize.width >= 1100) return 'grid-cols-4';
    if (librarySize.width >= 800) return 'grid-cols-3';
    return 'grid-cols-2';
  };

  // Get label for current tab
  const getTabLabel = () => {
    switch (activeTab) {
      case 'exercises': return 'exercise';
      case 'lifts': return 'lift';
      case 'benchmarks': return 'benchmark';
      case 'forge': return 'forge benchmark';
    }
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
            Movement Library
          </h3>
          <button
            onClick={onClose}
            className='px-4 py-2 bg-[#1a6b62] hover:bg-[#145a52] text-white rounded-lg font-semibold transition flex items-center gap-2'
          >
            Done
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className='flex border-b border-gray-300 bg-gray-50'>
          <button
            onClick={() => setActiveTab('exercises')}
            className={`flex-1 px-4 py-3 font-semibold transition ${
              activeTab === 'exercises'
                ? 'bg-white text-[#208479] border-b-2 border-[#208479]'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Exercises
          </button>
          <button
            onClick={() => setActiveTab('lifts')}
            className={`flex-1 px-4 py-3 font-semibold transition ${
              activeTab === 'lifts'
                ? 'bg-white text-[#208479] border-b-2 border-[#208479]'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Lifts
          </button>
          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`flex-1 px-4 py-3 font-semibold transition ${
              activeTab === 'benchmarks'
                ? 'bg-white text-[#208479] border-b-2 border-[#208479]'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Benchmarks
          </button>
          <button
            onClick={() => setActiveTab('forge')}
            className={`flex-1 px-4 py-3 font-semibold transition ${
              activeTab === 'forge'
                ? 'bg-white text-[#208479] border-b-2 border-[#208479]'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Forge
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
              placeholder={`Search ${getTabLabel()}s...`}
              autoComplete='off'
              readOnly
              onFocus={e => e.currentTarget.removeAttribute('readonly')}
              className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 placeholder-gray-400'
            />
          </div>
          <p className='text-xs text-gray-600 mt-2'>
            {totalItems} {getTabLabel()}{totalItems !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Content Area */}
        <div className='flex-1 overflow-y-auto p-4'>
          {loading ? (
            <div className='text-center py-8 text-gray-500'>
              <p className='text-sm'>Loading {getTabLabel()}s...</p>
            </div>
          ) : (
            <>
              {/* Exercises Tab */}
              {activeTab === 'exercises' && (
                Object.keys(filteredExerciseCategories).length > 0 ? (
                  <div className='space-y-4'>
                    {Object.entries(filteredExerciseCategories).map(([category, categoryExercises]) => (
                      <div key={category}>
                        <div className='bg-[#208479] text-white px-3 py-2 rounded-t-lg mb-2'>
                          <h4 className='text-sm font-bold uppercase tracking-wide'>{category}</h4>
                        </div>
                        <div className={`grid ${getColumnClass()} gap-2 mb-3`}>
                          {categoryExercises.map(exercise => (
                            <button
                              key={exercise.id}
                              onClick={() => handleSelectExercise(exercise.name)}
                              className='w-full text-left px-3 py-2 hover:bg-[#208479] hover:text-white rounded transition text-sm text-gray-900'
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
                  </div>
                )
              )}

              {/* Lifts Tab */}
              {activeTab === 'lifts' && (
                Object.keys(filteredLiftCategories).length > 0 ? (
                  <div className='space-y-4'>
                    {Object.entries(filteredLiftCategories).map(([category, categoryLifts]) => (
                      <div key={category}>
                        <div className='bg-[#208479] text-white px-3 py-2 rounded-t-lg mb-2'>
                          <h4 className='text-sm font-bold uppercase tracking-wide'>{category}</h4>
                        </div>
                        <div className={`grid ${getColumnClass()} gap-2 mb-3`}>
                          {categoryLifts.map(lift => (
                            <button
                              key={lift.id}
                              onClick={() => handleSelectLift(lift)}
                              className='w-full text-left px-3 py-2 hover:bg-[#208479] hover:text-white rounded transition text-sm text-gray-900 flex items-center justify-between'
                            >
                              <span>{lift.name}</span>
                              <span className='text-gray-400 hover:text-white'>→</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-8 text-gray-500'>
                    <p className='text-sm'>No lifts found</p>
                  </div>
                )
              )}

              {/* Benchmarks Tab */}
              {activeTab === 'benchmarks' && (
                filteredBenchmarks.length > 0 ? (
                  <div className={`grid ${getColumnClass()} gap-2`}>
                    {filteredBenchmarks.map(benchmark => (
                      <button
                        key={benchmark.id}
                        onClick={() => handleSelectBenchmark(benchmark)}
                        className='w-full text-left px-3 py-2 hover:bg-[#208479] hover:text-white rounded transition text-sm text-gray-900 flex items-center justify-between'
                      >
                        <span>{benchmark.name}</span>
                        <span className='text-gray-400 hover:text-white'>→</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-8 text-gray-500'>
                    <p className='text-sm'>No benchmarks found</p>
                  </div>
                )
              )}

              {/* Forge Benchmarks Tab */}
              {activeTab === 'forge' && (
                filteredForgeBenchmarks.length > 0 ? (
                  <div className={`grid ${getColumnClass()} gap-2`}>
                    {filteredForgeBenchmarks.map(forge => (
                      <button
                        key={forge.id}
                        onClick={() => handleSelectForgeBenchmark(forge)}
                        className='w-full text-left px-3 py-2 hover:bg-[#208479] hover:text-white rounded transition text-sm text-gray-900 flex items-center justify-between'
                      >
                        <span>{forge.name}</span>
                        <span className='text-gray-400 hover:text-white'>→</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-8 text-gray-500'>
                    <p className='text-sm'>No forge benchmarks found</p>
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MovementLibraryPopup;
