'use client';

import { supabase } from '@/lib/supabase';
import {
  Check,
  ChevronDown,
  FileText,
  GripVertical,
  Library,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import PublishModal, { PublishConfig } from './PublishModal';

interface WODModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (wod: WODFormData) => void;
  date: Date;
  editingWOD?: WODFormData | null;
  isPanel?: boolean;
  panelOffset?: number;
  initialNotesOpen?: boolean;
  onNotesToggle?: (open: boolean) => void;
}

export interface WODSection {
  id: string;
  type: string;
  duration: number; // minutes
  content: string; // Free-form markdown text
  workout_type_id?: string; // Workout type (only for WOD sections)
}

export interface WODFormData {
  id?: string;
  title: string;
  track_id?: string;
  workout_type_id?: string;
  classTimes: string[];
  maxCapacity: number;
  date: string;
  sections: WODSection[];
  coach_notes?: string;
}

interface Exercise {
  id: string;
  name: string;
  category: string;
  description: string | null;
  video_url: string | null;
  tags: string[] | null;
}

interface Track {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
}

interface WorkoutType {
  id: string;
  name: string;
  description: string | null;
}

interface SectionType {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
}

const CLASS_TIME_OPTIONS = ['9:00', '10:00', '11:00', '15:00', '16:00', '17:15', '18:30'];

const WORKOUT_TITLE_OPTIONS = [
  'WOD',
  'Foundations',
  'Endurance',
  'Kids',
  'Kids & Teens',
  'ElternKind Turnen',
  'FitKids Turnen',
  'Diapers & Dumbbells',
];

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

// Section Component
function WODSectionComponent({
  section,
  sectionIndex,
  elapsedMinutes,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDelete,
  onOpenLibrary,
  onDragStart,
  onDragOver,
  onDrop,
  workoutTypes,
  sectionTypes,
  loadingTracks,
}: {
  section: WODSection;
  sectionIndex: number;
  elapsedMinutes: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<WODSection>) => void;
  onDelete: () => void;
  onOpenLibrary: () => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  workoutTypes: WorkoutType[];
  sectionTypes: SectionType[];
  loadingTracks: boolean;
}) {
  const endTime = elapsedMinutes + section.duration;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea as content changes
  useEffect(() => {
    if (textareaRef.current && isExpanded) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [section.content, isExpanded]);

  return (
    <div
      className='border border-gray-300 rounded-lg bg-white overflow-hidden'
      onDragOver={e => onDragOver(e, sectionIndex)}
      onDrop={e => onDrop(e, sectionIndex)}
    >
      {/* Section Header */}
      <div className='flex items-start gap-2 p-3 bg-gray-50 border-b border-gray-200'>
        {/* Drag Handle */}
        <div
          draggable
          onDragStart={e => onDragStart(e, sectionIndex)}
          className='cursor-move text-gray-400 hover:text-gray-600 mt-1'
        >
          <GripVertical size={18} />
        </div>

        {/* Main Content Area */}
        <div className='flex-1 min-w-0'>
          {/* Top Row: Type, Duration, Time Range, Actions */}
          <div className='flex items-center gap-3 flex-wrap mb-2'>
            <select
              value={section.type}
              onChange={e => onUpdate({ type: e.target.value })}
              className='px-3 py-1 border border-gray-300 rounded text-sm font-semibold focus:ring-2 focus:ring-[#208479] focus:border-transparent bg-white text-gray-900'
              disabled={loadingTracks}
            >
              {sectionTypes.map(type => (
                <option key={type.id} value={type.name}>
                  {type.name}
                </option>
              ))}
            </select>

            <div className='flex items-center gap-2 text-sm'>
              <input
                type='number'
                value={section.duration}
                onChange={e => onUpdate({ duration: parseInt(e.target.value) || 0 })}
                min='0'
                max='60'
                className='w-16 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-[#208479] focus:border-transparent bg-white text-gray-900'
              />
              <span className='text-gray-700'>mins</span>
            </div>

            <div className='text-xs text-gray-700 bg-white px-2 py-1 rounded border border-gray-200'>
              {elapsedMinutes + 1}-{endTime} min
            </div>

            {/* Workout Type Dropdown - Only for WOD sections */}
            {section.type === 'WOD' && (
              <div className='flex items-center gap-2'>
                <label className='text-xs font-semibold text-gray-700'>Type:</label>
                <select
                  value={section.workout_type_id || ''}
                  onChange={e => onUpdate({ workout_type_id: e.target.value })}
                  className='px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 bg-white text-xs'
                  disabled={loadingTracks}
                >
                  <option value=''>Select Type...</option>
                  {workoutTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type='button'
              onClick={onOpenLibrary}
              className='text-xs text-[#208479] hover:text-[#1a6b62] flex items-center gap-1'
            >
              <Library size={14} />
              Library
            </button>

            <div className='ml-auto flex items-center gap-2'>
              <button
                type='button'
                onClick={onToggleExpand}
                className='text-gray-500 hover:text-gray-700 p-1'
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                <ChevronDown
                  size={16}
                  className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
              </button>
              <button
                type='button'
                onClick={onDelete}
                className='text-gray-400 hover:text-red-600 p-1'
                title='Delete section'
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Content Preview/Editor */}
          {isExpanded ? (
            <div className='space-y-2'>
              <textarea
                ref={textareaRef}
                value={section.content}
                onChange={e => onUpdate({ content: e.target.value })}
                placeholder='Add exercises (one per line):&#10;* Burpees&#10;* Elephant Walk&#10;* ATY Raises'
                rows={3}
                data-section-id={section.id}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent font-mono text-sm bg-white resize-none overflow-hidden min-h-[80px] text-gray-900 placeholder-gray-400'
              />
              <p className='text-xs text-gray-600'>
                Tip: Use * for bullet points, add reps/sets, cut/paste, reorder freely
              </p>
            </div>
          ) : (
            <div
              onClick={onToggleExpand}
              className='cursor-pointer hover:bg-gray-50 rounded p-2 -m-2'
            >
              {section.content ? (
                <div className='text-sm text-gray-900 whitespace-pre-wrap font-mono bg-gray-50 p-2 rounded border border-gray-200 max-h-32 overflow-auto'>
                  {section.content}
                </div>
              ) : (
                <div className='text-sm text-gray-500 italic'>
                  No exercises added yet. Click here or Library to add exercises.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WODModal({
  isOpen,
  onClose,
  onSave,
  date,
  editingWOD,
  isPanel = false,
  initialNotesOpen = false,
  onNotesToggle,
}: WODModalProps) {
  const [formData, setFormData] = useState<WODFormData>({
    title: '',
    track_id: '',
    workout_type_id: '',
    classTimes: [],
    maxCapacity: 12,
    date: date.toISOString().split('T')[0],
    sections: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<number | null>(null);
  const [libraryKey, setLibraryKey] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [lastExpandedSectionId, setLastExpandedSectionId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [workoutTypes, setWorkoutTypes] = useState<WorkoutType[]>([]);
  const [sectionTypes, setSectionTypes] = useState<SectionType[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [notesPanelOpen, setNotesPanelOpen] = useState(initialNotesOpen);
  const [isDragOver, setIsDragOver] = useState(false);
  const [notesModalSize, setNotesModalSize] = useState({ width: 600, height: 500 });
  const [notesModalPos, setNotesModalPos] = useState({ bottom: 20, left: 820 });
  const [isResizingNotes, setIsResizingNotes] = useState(false);
  const [isDraggingNotes, setIsDraggingNotes] = useState(false);
  const [resizeStartNotes, setResizeStartNotes] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [dragStartNotes, setDragStartNotes] = useState({ x: 0, y: 0, bottom: 0, left: 0 });
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isPublishing, setIsPublishing] = useState(false);

  // Sync local notesPanelOpen with parent state
  useEffect(() => {
    setNotesPanelOpen(initialNotesOpen);
  }, [initialNotesOpen]);

  // Handle Notes modal drag (move)
  const handleNotesDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingNotes(true);
    setDragStartNotes({
      x: e.clientX,
      y: e.clientY,
      bottom: notesModalPos.bottom,
      left: notesModalPos.left,
    });
  };

  // Handle Notes modal resize
  const [resizeCorner, setResizeCorner] = useState<string>('');
  const handleNotesResizeStart = (e: React.MouseEvent, corner: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingNotes(true);
    setResizeCorner(corner);
    setResizeStartNotes({
      x: e.clientX,
      y: e.clientY,
      width: notesModalSize.width,
      height: notesModalSize.height,
    });
  };

  useEffect(() => {
    if (isDraggingNotes) {
      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - dragStartNotes.x;
        const deltaY = e.clientY - dragStartNotes.y;

        setNotesModalPos({
          bottom: Math.max(0, dragStartNotes.bottom - deltaY),
          left: Math.max(0, dragStartNotes.left + deltaX),
        });
      };

      const handleMouseUp = () => {
        setIsDraggingNotes(false);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }

    if (isResizingNotes) {
      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - resizeStartNotes.x;
        const deltaY = e.clientY - resizeStartNotes.y;

        let newWidth = resizeStartNotes.width;
        let newHeight = resizeStartNotes.height;
        let newBottom = notesModalPos.bottom;
        let newLeft = notesModalPos.left;

        // Handle resize based on corner - ALL expand in drag direction
        switch (resizeCorner) {
          case 'se': // Bottom-right: drag down/right = grow
            newWidth = resizeStartNotes.width + deltaX;
            newHeight = resizeStartNotes.height + deltaY; // Drag down = taller
            newBottom = notesModalPos.bottom - deltaY; // Move bottom down
            break;
          case 'sw': // Bottom-left: drag down/left = grow
            newWidth = resizeStartNotes.width - deltaX;
            newHeight = resizeStartNotes.height + deltaY; // Drag down = taller
            newLeft = notesModalPos.left + deltaX;
            newBottom = notesModalPos.bottom - deltaY; // Move bottom down
            break;
          case 'ne': // Top-right: drag up/right = grow
            newWidth = resizeStartNotes.width + deltaX;
            newHeight = resizeStartNotes.height - deltaY; // Drag up (-Y) = taller
            newBottom = notesModalPos.bottom - deltaY; // Accommodate growth
            break;
          case 'nw': // Top-left: drag up/left = grow
            newWidth = resizeStartNotes.width - deltaX;
            newHeight = resizeStartNotes.height - deltaY; // Drag up (-Y) = taller
            newLeft = notesModalPos.left + deltaX;
            newBottom = notesModalPos.bottom - deltaY; // Accommodate growth
            break;
        }

        // Apply constraints
        newWidth = Math.max(400, Math.min(1000, newWidth));
        newHeight = Math.max(300, Math.min(window.innerHeight * 0.9, newHeight));
        newBottom = Math.max(0, newBottom);
        newLeft = Math.max(0, newLeft);

        setNotesModalSize({ width: newWidth, height: newHeight });

        // Update position (all corners affect position now)
        const updates: { left?: number; bottom?: number } = {};

        if (resizeCorner === 'sw' || resizeCorner === 'nw') {
          updates.left = newLeft;
        }
        // All corners affect bottom position
        updates.bottom = newBottom;

        setNotesModalPos(prev => ({ ...prev, ...updates }));
      };

      const handleMouseUp = () => {
        setIsResizingNotes(false);
        setResizeCorner('');
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingNotes, isResizingNotes, dragStartNotes, resizeStartNotes]);

  // Fetch tracks and workout types on mount
  useEffect(() => {
    fetchTracksAndTypes();
  }, []);

  const fetchTracksAndTypes = async () => {
    setLoadingTracks(true);
    try {
      const [tracksResult, typesResult, sectionTypesResult] = await Promise.all([
        supabase.from('tracks').select('*').order('name'),
        supabase.from('workout_types').select('*').order('name'),
        supabase.from('section_types').select('*').order('display_order'),
      ]);

      if (tracksResult.error) throw tracksResult.error;
      if (typesResult.error) throw typesResult.error;
      if (sectionTypesResult.error) throw sectionTypesResult.error;

      setTracks(tracksResult.data || []);
      setWorkoutTypes(typesResult.data || []);
      setSectionTypes(sectionTypesResult.data || []);
    } catch (error) {
      console.error('Error fetching tracks, workout types, and section types:', error);
    } finally {
      setLoadingTracks(false);
    }
  };

  // Reset form when modal opens or editingWOD changes
  useEffect(() => {
    if (isOpen) {
      if (editingWOD) {
        setFormData(editingWOD);
        // When editing, expand all sections to show full content
        const allSectionIds = editingWOD.sections.map(s => s.id);
        setExpandedSections(new Set(allSectionIds));
      } else {
        // Create template sections for new WOD
        const timestamp = Date.now();
        const templateSections: WODSection[] = [
          {
            id: `section-${timestamp}-1`,
            type: 'Warm-up',
            duration: 12,
            content: '',
          },
          {
            id: `section-${timestamp}-2`,
            type: 'WOD',
            duration: 15,
            content: '',
          },
          {
            id: `section-${timestamp}-3`,
            type: 'Cool Down',
            duration: 10,
            content: '',
          },
        ];

        setFormData({
          title: '',
          track_id: '',
          workout_type_id: '',
          classTimes: [],
          maxCapacity: 12,
          date: date.toISOString().split('T')[0],
          sections: templateSections,
        });
        // Expand the first section (Warm-up) and track it
        setExpandedSections(new Set([templateSections[0].id]));
        setLastExpandedSectionId(templateSections[0].id);
      }
      setErrors({});
      setActiveSection(null);
    }
  }, [isOpen, editingWOD, date]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = (field: keyof WODFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const toggleClassTime = (time: string) => {
    setFormData(prev => ({
      ...prev,
      classTimes: prev.classTimes.includes(time)
        ? prev.classTimes.filter(t => t !== time)
        : [...prev.classTimes, time].sort(),
    }));
  };

  const toggleSectionExpanded = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
        // Don't clear lastExpandedSectionId when collapsing - keep it as reference for adding new sections
      } else {
        newSet.add(sectionId);
        // Track this as the last expanded section
        setLastExpandedSectionId(sectionId);
      }
      return newSet;
    });
  };

  const addSection = () => {
    // Determine the section type for the new section
    let newSectionType = 'Warm-up'; // Default fallback

    if (lastExpandedSectionId && sectionTypes.length > 0) {
      const expandedSection = formData.sections.find(s => s.id === lastExpandedSectionId);
      if (expandedSection) {
        // Find the current section type in the ordered list
        const currentTypeIndex = sectionTypes.findIndex(t => t.name === expandedSection.type);
        if (currentTypeIndex !== -1 && currentTypeIndex < sectionTypes.length - 1) {
          // Use the next section type in display_order
          newSectionType = sectionTypes[currentTypeIndex + 1].name;
        } else if (currentTypeIndex === sectionTypes.length - 1) {
          // If we're at the last type, cycle back to first
          newSectionType = sectionTypes[0].name;
        }
      }
    }

    const newSection: WODSection = {
      id: `section-${Date.now()}`,
      type: newSectionType,
      duration: 5,
      content: '',
    };

    setFormData(prev => {
      // Find the index of the last expanded section
      const expandedIndex = lastExpandedSectionId
        ? prev.sections.findIndex(s => s.id === lastExpandedSectionId)
        : -1;

      // If there's an expanded section, insert after it; otherwise add at the end
      if (expandedIndex !== -1) {
        const newSections = [...prev.sections];
        newSections.splice(expandedIndex + 1, 0, newSection);
        return { ...prev, sections: newSections };
      } else {
        return { ...prev, sections: [...prev.sections, newSection] };
      }
    });

    // Collapse all existing sections and expand only the new one
    setExpandedSections(new Set([newSection.id]));
    setLastExpandedSectionId(newSection.id);
  };

  const updateSection = (sectionId: string, updates: Partial<WODSection>) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      ),
    }));
  };

  const deleteSection = (sectionId: string) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.filter(section => section.id !== sectionId),
    }));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newSections = [...formData.sections];
    const [draggedSection] = newSections.splice(draggedIndex, 1);
    newSections.splice(dropIndex, 0, draggedSection);

    setFormData(prev => ({
      ...prev,
      sections: newSections,
    }));

    setDraggedIndex(null);
  };

  const openLibraryForSection = (sectionIndex: number) => {
    setActiveSection(sectionIndex);
    setLibraryOpen(true);
  };

  const closeLibrary = () => {
    setLibraryOpen(false);
    setActiveSection(null);
    // Force library to remount on next open by changing key
    setLibraryKey(prev => prev + 1);
  };

  const handleSelectExercise = (exercise: string) => {
    if (activeSection === null) return;

    const section = formData.sections[activeSection];
    if (!section) return;

    // Find the textarea element for the active section to get cursor position
    const textarea = document.querySelector(`textarea[data-section-id="${section.id}"]`) as HTMLTextAreaElement;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const beforeCursor = section.content.substring(0, cursorPos);
    const afterCursor = section.content.substring(cursorPos);

    // Trim trailing whitespace/newlines before cursor position but don't trim leading content
    const trimmedBefore = beforeCursor.replace(/(\n\s*)+$/, ''); // Remove trailing newlines and whitespace

    // Check if we need to add a newline (only if there's content before cursor without trailing newline)
    const needsNewline = trimmedBefore.length > 0 && !/\n$/.test(trimmedBefore);

    // Insert exercise at cleaned cursor position
    const newContent = `${trimmedBefore}${needsNewline ? '\n' : ''}* ${exercise}${afterCursor ? '\n' + afterCursor : ''}`;

    updateSection(section.id, { content: newContent });
  };

  const getTotalDuration = () => {
    return formData.sections.reduce((sum, section) => sum + section.duration, 0);
  };

  const getElapsedMinutes = (sectionIndex: number) => {
    return formData.sections
      .slice(0, sectionIndex)
      .reduce((sum, section) => sum + section.duration, 0);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (formData.classTimes.length === 0) {
      newErrors.classTimes = 'Select at least one class time';
    }

    if (formData.sections.length === 0) {
      newErrors.sections = 'Add at least one section';
    }

    if (formData.maxCapacity < 1 || formData.maxCapacity > 30) {
      newErrors.maxCapacity = 'Capacity must be between 1 and 30';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validate()) {
      onSave(formData);
      onClose();
    }
  };

  const handlePublish = async (publishConfig: PublishConfig) => {
    setIsPublishing(true);
    try {
      const response = await fetch('/api/google/publish-workout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workoutId: editingWOD?.id,
          publishConfig,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to publish workout');
      }

      setPublishModalOpen(false);
      alert('Workout published successfully!');
    } catch (error) {
      console.error('Error publishing workout:', error);
      alert('Failed to publish workout. Please try again.');
      throw error;
    } finally {
      setIsPublishing(false);
    }
  };

  // Handle drag and drop from search panel
  const handlePanelDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handlePanelDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const insertSectionAtCorrectPosition = (sections: WODSection[], newSection: WODSection): WODSection[] => {
    // Get display_order for the new section
    const newSectionType = sectionTypes.find(t => t.name === newSection.type);
    if (!newSectionType) {
      // Fallback: append to end
      return [...sections, newSection];
    }

    // Find insertion index
    let insertIndex = sections.length; // Default to end
    for (let i = 0; i < sections.length; i++) {
      const existingSectionType = sectionTypes.find(t => t.name === sections[i].type);
      if (existingSectionType && existingSectionType.display_order > newSectionType.display_order) {
        insertIndex = i;
        break;
      }
    }

    // Insert at calculated position
    const newSections = [...sections];
    newSections.splice(insertIndex, 0, newSection);
    return newSections;
  };

  const handlePanelDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const dataType = e.dataTransfer.getData('text/plain');

    if (dataType === 'wod') {
      // Handle entire WOD drop - get data from window object (set by drag handler in coach page)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const draggedWODData = (window as any).__draggedWOD;
      if (draggedWODData) {
        setFormData({
          ...formData,
          title: draggedWODData.title,
          sections: [...draggedWODData.sections],
          track_id: draggedWODData.track_id,
          workout_type_id: draggedWODData.workout_type_id,
        });
      }
    } else if (dataType === 'section') {
      // Handle section drop - get data from window object
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const draggedSectionData = (window as any).__draggedSection;
      if (draggedSectionData) {
        const newSection: WODSection = {
          id: `section-${Date.now()}`,
          type: draggedSectionData.type,
          duration: parseInt(draggedSectionData.duration) || 5,
          content: draggedSectionData.content,
        };
        // Insert section at correct position based on section type display_order
        const updatedSections = insertSectionAtCorrectPosition(formData.sections, newSection);
        setFormData({
          ...formData,
          sections: updatedSections,
        });
        // Expand the new section
        setExpandedSections(new Set([...expandedSections, newSection.id]));
      }
    }
  };

  if (!isOpen) return null;

  const totalDuration = getTotalDuration();

  if (isPanel) {
    return (
      <>
        {/* Coach Notes Floating Modal */}
        {notesPanelOpen && (
          <div
            className='fixed z-[70]'
            style={{
              bottom: `${notesModalPos.bottom}px`,
              left: `${notesModalPos.left}px`,
            }}
          >
            <div
              className='bg-white rounded-lg shadow-2xl flex flex-col relative border-4 border-[#208479]'
              style={{
                width: `${notesModalSize.width}px`,
                height: `${notesModalSize.height}px`,
              }}
            >
              {/* Corner Resize Handles */}
              <div
                className='absolute bottom-0 right-0 w-8 h-8 cursor-se-resize z-50'
                onMouseDown={(e) => handleNotesResizeStart(e, 'se')}
                title='Drag to resize'
              >
                <div className='absolute bottom-0 right-0 w-0 h-0 border-l-[32px] border-l-transparent border-b-[32px] border-b-[#208479] hover:border-b-[#1a6b62] transition'></div>
              </div>
              <div
                className='absolute top-0 right-0 w-8 h-8 cursor-ne-resize z-50'
                onMouseDown={(e) => handleNotesResizeStart(e, 'ne')}
                title='Drag to resize'
              >
                <div className='absolute top-0 right-0 w-0 h-0 border-l-[32px] border-l-transparent border-t-[32px] border-t-[#208479] hover:border-t-[#1a6b62] transition rounded-tr-lg'></div>
              </div>
              <div
                className='absolute bottom-0 left-0 w-8 h-8 cursor-sw-resize z-50'
                onMouseDown={(e) => handleNotesResizeStart(e, 'sw')}
                title='Drag to resize'
              >
                <div className='absolute bottom-0 left-0 w-0 h-0 border-r-[32px] border-r-transparent border-b-[32px] border-b-[#208479] hover:border-b-[#1a6b62] transition rounded-bl-lg'></div>
              </div>
              <div
                className='absolute top-0 left-0 w-8 h-8 cursor-nw-resize z-50'
                onMouseDown={(e) => handleNotesResizeStart(e, 'nw')}
                title='Drag to resize'
              >
                <div className='absolute top-0 left-0 w-0 h-0 border-r-[32px] border-r-transparent border-t-[32px] border-t-[#208479] hover:border-t-[#1a6b62] transition rounded-tl-lg'></div>
              </div>

              {/* Header - Draggable */}
              <div
                className='bg-[#208479] text-white p-4 rounded-t-lg flex justify-between items-center flex-shrink-0 cursor-move'
                onMouseDown={handleNotesDragStart}
              >
                <h2 className='text-xl font-bold'>Coach Notes</h2>
                <button
                    onClick={() => {
                      setNotesPanelOpen(false);
                      onNotesToggle?.(false);
                    }}
                    className='hover:bg-[#1a6b62] p-1 rounded transition'
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Content */}
                <div className='flex-1 overflow-y-auto p-4'>
                  <textarea
                    value={formData.coach_notes || ''}
                    onChange={e => handleChange('coach_notes', e.target.value)}
                    placeholder='Add private notes about this workout...&#10;&#10;Examples:&#10;- Athlete feedback&#10;- Scaling options used&#10;- Time management notes&#10;- Equipment setup details&#10;- Modifications made'
                    className='w-full h-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 placeholder-gray-400 resize-none text-sm'
                  />
                </div>

              {/* Footer */}
              <div className='border-t p-4 bg-gray-50 rounded-b-lg flex-shrink-0'>
                <p className='text-xs text-gray-500'>
                  Notes are private and searchable. Auto-saved when you save the WOD.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* WOD Panel */}
        <div className='fixed left-0 top-[72px] h-[calc(100vh-72px)] w-[800px] bg-white shadow-2xl z-50 flex flex-col border-r-2 border-[#208479] border-t border-gray-400 animate-slide-in-left'>
          {/* Header */}
          <div className='bg-[#208479] text-white p-4 flex justify-between items-center'>
            <h2 className='text-xl font-bold'>{editingWOD ? 'Edit Workout' : 'Create New Workout'}</h2>
            <div className='flex items-center gap-2'>
              <button
                onClick={e => {
                  e.preventDefault();
                  const newValue = !notesPanelOpen;
                  setNotesPanelOpen(newValue);
                  onNotesToggle?.(newValue);
                }}
                className={`hover:bg-[#1a6b62] p-2 rounded transition flex items-center gap-2 ${notesPanelOpen ? 'bg-[#1a6b62]' : ''}`}
                title='Coach Notes'
              >
                <FileText size={20} />
                <span className='text-sm'>Notes</span>
              </button>
              {editingWOD?.id && (
                <button
                  onClick={e => {
                    e.preventDefault();
                    setPublishModalOpen(true);
                  }}
                  className='hover:bg-[#1a6b62] p-2 rounded transition flex items-center gap-2'
                  title='Publish Workout'
                >
                  <Send size={20} />
                  <span className='text-sm'>Publish</span>
                </button>
              )}
              <button
                onClick={e => {
                  e.preventDefault();
                  if (validate()) {
                    onSave(formData);
                    onClose();
                  }
                }}
                className='hover:bg-[#1a6b62] p-1 rounded transition'
              >
                <Check size={24} />
              </button>
              <button onClick={onClose} className='hover:bg-[#1a6b62] p-1 rounded transition'>
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Content Area - Form Only (No notes panel in side panel mode) */}
          <form
            onSubmit={handleSubmit}
            className='flex-1 overflow-y-auto p-6 space-y-6'
            onDragOver={handlePanelDragOver}
            onDragLeave={handlePanelDragLeave}
            onDrop={handlePanelDrop}
          >
            {/* Drop Zone Indicator */}
            {isDragOver && (
              <div className='sticky top-0 z-10 mb-4 border-2 border-dashed border-[#208479] rounded-lg p-4 text-center text-sm bg-teal-50 animate-pulse'>
                <p className='font-semibold text-[#208479]'>Drop Here</p>
                <p className='text-xs text-gray-600'>Drop WOD or section to add to this workout</p>
              </div>
            )}

            {/* Date Display */}
            <div className='bg-gray-50 p-3 rounded-lg'>
              <p className='text-sm text-gray-600'>Date</p>
              <p className='font-semibold text-gray-900'>
                {date.toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>

            {/* Title */}
            <div>
              <label className='block text-sm font-semibold mb-2 text-gray-900'>
                Workout Title <span className='text-red-500'>*</span>
              </label>
              <div className='relative'>
                <input
                  type='text'
                  list='workout-titles'
                  value={formData.title}
                  onChange={e => handleChange('title', e.target.value)}
                  placeholder='Select or type custom title...'
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 placeholder-gray-400 ${
                    errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <datalist id='workout-titles'>
                  {WORKOUT_TITLE_OPTIONS.map(title => (
                    <option key={title} value={title} />
                  ))}
                </datalist>
              </div>
              {errors.title && <p className='text-red-500 text-sm mt-1'>{errors.title}</p>}
            </div>

            {/* Track */}
            <div>
              <label className='block text-sm font-semibold mb-2 text-gray-900'>Track</label>
              <select
                value={formData.track_id || ''}
                onChange={e => handleChange('track_id', e.target.value)}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 bg-white'
                disabled={loadingTracks}
              >
                <option value=''>Select Track...</option>
                {tracks.map(track => (
                  <option key={track.id} value={track.id}>
                    {track.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Class Times and Max Capacity */}
            <div className='flex gap-6 items-start'>
              {/* Class Times */}
              <div className='flex-1'>
                <label className='block text-sm font-semibold mb-2 text-gray-900'>
                  Class Times <span className='text-red-500'>*</span>
                </label>
                <div className='flex flex-wrap gap-2'>
                  {CLASS_TIME_OPTIONS.map(time => (
                    <button
                      key={time}
                      type='button'
                      onClick={() => toggleClassTime(time)}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                        formData.classTimes.includes(time)
                          ? 'bg-[#208479] text-white'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
                {errors.classTimes && (
                  <p className='text-red-500 text-sm mt-1'>{errors.classTimes}</p>
                )}
              </div>

              {/* Max Capacity */}
              <div className='w-32'>
                <label className='block text-sm font-semibold mb-2 text-gray-900'>
                  Max Capacity <span className='text-red-500'>*</span>
                </label>
                <input
                  type='number'
                  value={formData.maxCapacity}
                  onChange={e => handleChange('maxCapacity', parseInt(e.target.value) || 0)}
                  min='1'
                  max='30'
                  className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 ${
                    errors.maxCapacity ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.maxCapacity && (
                  <p className='text-red-500 text-sm mt-1'>{errors.maxCapacity}</p>
                )}
              </div>
            </div>

            {/* Sections */}
            <div>
              <div className='flex justify-between items-center mb-3'>
                <div>
                  <label className='block text-sm font-semibold text-gray-900'>
                    Workout Sections <span className='text-red-500'>*</span>
                  </label>
                  <p className='text-xs text-gray-600 mt-1'>
                    Total Duration:{' '}
                    <span className='font-semibold text-[#208479]'>{totalDuration} mins</span>
                  </p>
                </div>
                <button
                  type='button'
                  onClick={addSection}
                  className='px-4 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white text-sm font-medium rounded-lg flex items-center gap-2 transition'
                >
                  <Plus size={16} />
                  Add Section
                </button>
              </div>

              {errors.sections && <p className='text-red-500 text-sm mb-2'>{errors.sections}</p>}

              <div className='space-y-4'>
                {formData.sections.map((section, index) => (
                  <WODSectionComponent
                    key={section.id}
                    section={section}
                    sectionIndex={index}
                    elapsedMinutes={getElapsedMinutes(index)}
                    isExpanded={expandedSections.has(section.id)}
                    onToggleExpand={() => toggleSectionExpanded(section.id)}
                    onUpdate={updates => updateSection(section.id, updates)}
                    onDelete={() => deleteSection(section.id)}
                    onOpenLibrary={() => openLibraryForSection(index)}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    workoutTypes={workoutTypes}
                    sectionTypes={sectionTypes}
                    loadingTracks={loadingTracks}
                  />
                ))}

                {formData.sections.length === 0 && (
                  <div className='text-center py-8 text-gray-500'>
                    <p>No sections yet. Click &quot;Add Section&quot; to get started.</p>
                  </div>
                )}
              </div>
            </div>
          </form>

        </div>

        {/* Exercise Library Popup - Outside panel for proper z-index */}
        <ExerciseLibraryPopup
          key={libraryKey}
          isOpen={libraryOpen}
          onClose={closeLibrary}
          onSelectExercise={handleSelectExercise}
        />

        {/* Publish Modal */}
        <PublishModal
          isOpen={publishModalOpen}
          onClose={() => setPublishModalOpen(false)}
          onPublish={handlePublish}
          sections={formData.sections}
          workoutDate={date}
        />
      </>
    );
  }

  // Original modal mode
  return (
    <>
      <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
        <div
          className={`bg-white rounded-lg shadow-2xl w-full ${notesPanelOpen ? 'max-w-7xl' : 'max-w-5xl'} max-h-[90vh] overflow-hidden flex flex-col transition-all duration-300`}
        >
          {/* Header */}
          <div className='bg-[#208479] text-white p-4 flex justify-between items-center'>
            <h2 className='text-xl font-bold'>{editingWOD ? 'Edit Workout' : 'Create New Workout'}</h2>
            <div className='flex items-center gap-2'>
              <button
                onClick={e => {
                  e.preventDefault();
                  const newValue = !notesPanelOpen;
                  setNotesPanelOpen(newValue);
                  onNotesToggle?.(newValue);
                }}
                className={`hover:bg-[#1a6b62] p-2 rounded transition flex items-center gap-2 ${notesPanelOpen ? 'bg-[#1a6b62]' : ''}`}
                title='Coach Notes'
              >
                <FileText size={20} />
                <span className='text-sm'>Notes</span>
              </button>
              {editingWOD?.id && (
                <button
                  onClick={e => {
                    e.preventDefault();
                    setPublishModalOpen(true);
                  }}
                  className='hover:bg-[#1a6b62] p-2 rounded transition flex items-center gap-2'
                  title='Publish Workout'
                >
                  <Send size={20} />
                  <span className='text-sm'>Publish</span>
                </button>
              )}
              <button
                onClick={e => {
                  e.preventDefault();
                  if (validate()) {
                    onSave(formData);
                    onClose();
                  }
                }}
                className='hover:bg-[#1a6b62] p-1 rounded transition'
              >
                <Check size={24} />
              </button>
              <button onClick={onClose} className='hover:bg-[#1a6b62] p-1 rounded transition'>
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Content Area - Form and Notes Side by Side */}
          <div className='flex-1 flex overflow-hidden'>
            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className={`${notesPanelOpen ? 'flex-1' : 'w-full'} overflow-y-auto p-6 space-y-6`}
            >
              {/* Date Display */}
              <div className='bg-gray-50 p-3 rounded-lg'>
                <p className='text-sm text-gray-600'>Date</p>
                <p className='font-semibold text-gray-900'>
                  {date.toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>

              {/* Title */}
              <div>
                <label className='block text-sm font-semibold mb-2 text-gray-900'>
                  Workout Title <span className='text-red-500'>*</span>
                </label>
                <div className='relative'>
                  <input
                    type='text'
                    list='workout-titles'
                    value={formData.title}
                    onChange={e => handleChange('title', e.target.value)}
                    placeholder='Select or type custom title...'
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 placeholder-gray-400 ${
                      errors.title ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <datalist id='workout-titles'>
                    {WORKOUT_TITLE_OPTIONS.map(title => (
                      <option key={title} value={title} />
                    ))}
                  </datalist>
                </div>
                {errors.title && <p className='text-red-500 text-sm mt-1'>{errors.title}</p>}
              </div>

              {/* Track */}
              <div>
                <label className='block text-sm font-semibold mb-2 text-gray-900'>Track</label>
                <select
                  value={formData.track_id || ''}
                  onChange={e => handleChange('track_id', e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 bg-white'
                  disabled={loadingTracks}
                >
                  <option value=''>Select Track...</option>
                  {tracks.map(track => (
                    <option key={track.id} value={track.id}>
                      {track.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class Times and Max Capacity */}
              <div className='flex gap-6 items-start'>
                {/* Class Times */}
                <div className='flex-1'>
                  <label className='block text-sm font-semibold mb-2 text-gray-900'>
                    Class Times <span className='text-red-500'>*</span>
                  </label>
                  <div className='flex flex-wrap gap-2'>
                    {CLASS_TIME_OPTIONS.map(time => (
                      <button
                        key={time}
                        type='button'
                        onClick={() => toggleClassTime(time)}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                          formData.classTimes.includes(time)
                            ? 'bg-[#208479] text-white'
                            : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                  {errors.classTimes && (
                    <p className='text-red-500 text-sm mt-1'>{errors.classTimes}</p>
                  )}
                </div>

                {/* Max Capacity */}
                <div className='w-32'>
                  <label className='block text-sm font-semibold mb-2 text-gray-900'>
                    Max Capacity <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='number'
                    value={formData.maxCapacity}
                    onChange={e => handleChange('maxCapacity', parseInt(e.target.value) || 0)}
                    min='1'
                    max='30'
                    className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 ${
                      errors.maxCapacity ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.maxCapacity && (
                    <p className='text-red-500 text-sm mt-1'>{errors.maxCapacity}</p>
                  )}
                </div>
              </div>

              {/* Sections */}
              <div>
                <div className='flex justify-between items-center mb-3'>
                  <div>
                    <label className='block text-sm font-semibold text-gray-900'>
                      Workout Sections <span className='text-red-500'>*</span>
                    </label>
                    <p className='text-xs text-gray-600 mt-1'>
                      Total Duration:{' '}
                      <span className='font-semibold text-[#208479]'>{totalDuration} mins</span>
                    </p>
                  </div>
                  <button
                    type='button'
                    onClick={addSection}
                    className='px-4 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white text-sm font-medium rounded-lg flex items-center gap-2 transition'
                  >
                    <Plus size={16} />
                    Add Section
                  </button>
                </div>

                {errors.sections && <p className='text-red-500 text-sm mb-2'>{errors.sections}</p>}

                <div className='space-y-4'>
                  {formData.sections.map((section, index) => (
                    <WODSectionComponent
                      key={section.id}
                      section={section}
                      sectionIndex={index}
                      elapsedMinutes={getElapsedMinutes(index)}
                      isExpanded={expandedSections.has(section.id)}
                      onToggleExpand={() => toggleSectionExpanded(section.id)}
                      onUpdate={updates => updateSection(section.id, updates)}
                      onDelete={() => deleteSection(section.id)}
                      onOpenLibrary={() => openLibraryForSection(index)}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      workoutTypes={workoutTypes}
                      sectionTypes={sectionTypes}
                      loadingTracks={loadingTracks}
                    />
                  ))}

                  {formData.sections.length === 0 && (
                    <div className='text-center py-8 text-gray-500'>
                      <p>No sections yet. Click &quot;Add Section&quot; to get started.</p>
                    </div>
                  )}
                </div>
              </div>
            </form>

            {/* Coach Notes Side Panel */}
            {notesPanelOpen && (
              <div className='w-[400px] bg-gray-50 shadow-xl flex flex-col border-l-2 border-[#208479]'>
                {/* Header */}
                <div className='bg-[#208479] text-white p-4 flex justify-between items-center'>
                  <h3 className='text-lg font-bold'>Coach Notes</h3>
                  <button
                    onClick={() => {
                      setNotesPanelOpen(false);
                      onNotesToggle?.(false);
                    }}
                    className='hover:bg-[#1a6b62] p-1 rounded transition'
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Content */}
                <div className='flex-1 overflow-y-auto p-4'>
                  <textarea
                    value={formData.coach_notes || ''}
                    onChange={e => handleChange('coach_notes', e.target.value)}
                    placeholder='Add private notes about this workout...&#10;&#10;Examples:&#10;- Athlete feedback&#10;- Scaling options used&#10;- Time management notes&#10;- Equipment setup details&#10;- Modifications made'
                    className='w-full h-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 placeholder-gray-400 resize-none text-sm'
                  />
                </div>

                {/* Footer */}
                <div className='border-t p-3 bg-white'>
                  <p className='text-xs text-gray-500'>
                    Notes are private and searchable. Auto-saved when you save the WOD.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Exercise Library Popup */}
      <ExerciseLibraryPopup
        key={libraryKey}
        isOpen={libraryOpen}
        onClose={closeLibrary}
        onSelectExercise={handleSelectExercise}
      />

      {/* Publish Modal */}
      <PublishModal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        onPublish={handlePublish}
        sections={formData.sections}
        workoutDate={date}
      />
    </>
  );
}
