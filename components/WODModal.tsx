'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Search,
  Library,
  ChevronDown,
  GripVertical,
  Check,
  FileText,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

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

const SECTION_TYPES = [
  'Whiteboard Intro',
  'Warm-up',
  'Skill',
  'Gymnastics',
  'Accessory',
  'Strength',
  'WOD Preparation',
  'WOD',
  'Cool Down',
];

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
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectExercise = (exercise: string) => {
    onSelectExercise(exercise);
    onClose();
  };

  // Filter exercises across all categories
  const getFilteredCategories = () => {
    // Group exercises by category
    const grouped: Record<string, Exercise[]> = {};

    exercises.forEach(exercise => {
      if (!grouped[exercise.category]) {
        grouped[exercise.category] = [];
      }
      grouped[exercise.category].push(exercise);
    });

    if (!searchTerm) {
      return grouped;
    }

    // With search term - filter exercises in each category
    const filtered: Record<string, Exercise[]> = {};
    Object.entries(grouped).forEach(([category, categoryExercises]) => {
      const matchingExercises = categoryExercises.filter(
        exercise =>
          exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          exercise.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      if (matchingExercises.length > 0) {
        filtered[category] = matchingExercises;
      }
    });
    return filtered;
  };

  const filteredCategories = getFilteredCategories();
  const totalExercises = Object.values(filteredCategories).flat().length;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4'>
      <div className='bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col'>
        {/* Header */}
        <div className='bg-[#208479] text-white p-4 flex justify-between items-center rounded-t-lg'>
          <h3 className='font-bold flex items-center gap-2'>
            <Library size={20} />
            Exercise Library
          </h3>
          <button onClick={onClose} className='hover:bg-[#1a6b62] p-1 rounded transition'>
            <X size={20} />
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

                  {/* Exercise Buttons */}
                  <div className='space-y-1 mb-3'>
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
            >
              {SECTION_TYPES.map(type => (
                <option key={type} value={type}>
                  {type}
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
              {elapsedMinutes}-{endTime} min
            </div>

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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [workoutTypes, setWorkoutTypes] = useState<WorkoutType[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [notesPanelOpen, setNotesPanelOpen] = useState(initialNotesOpen);
  const [isDragOver, setIsDragOver] = useState(false);

  // Sync local notesPanelOpen with parent state
  useEffect(() => {
    setNotesPanelOpen(initialNotesOpen);
  }, [initialNotesOpen]);

  // Fetch tracks and workout types on mount
  useEffect(() => {
    fetchTracksAndTypes();
  }, []);

  const fetchTracksAndTypes = async () => {
    setLoadingTracks(true);
    try {
      const [tracksResult, typesResult] = await Promise.all([
        supabase.from('tracks').select('*').order('name'),
        supabase.from('workout_types').select('*').order('name'),
      ]);

      if (tracksResult.error) throw tracksResult.error;
      if (typesResult.error) throw typesResult.error;

      setTracks(tracksResult.data || []);
      setWorkoutTypes(typesResult.data || []);
    } catch (error) {
      console.error('Error fetching tracks and workout types:', error);
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
            type: 'Accessory',
            duration: 10,
            content: '',
          },
          {
            id: `section-${timestamp}-3`,
            type: 'Strength',
            duration: 15,
            content: '',
          },
          {
            id: `section-${timestamp}-4`,
            type: 'WOD',
            duration: 15,
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
        // Expand the first section (Warm-up)
        setExpandedSections(new Set([templateSections[0].id]));
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
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const addSection = () => {
    const newSection: WODSection = {
      id: `section-${Date.now()}`,
      type: 'Warm-up',
      duration: 5,
      content: '',
    };

    setFormData(prev => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));

    // Collapse all existing sections and expand only the new one
    setExpandedSections(new Set([newSection.id]));
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

  const handleSelectExercise = (exercise: string) => {
    if (activeSection === null) return;

    const section = formData.sections[activeSection];
    if (!section) return;

    // Add exercise as a bullet point
    const newContent = section.content ? `${section.content}\n* ${exercise}` : `* ${exercise}`;

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
        setFormData({
          ...formData,
          sections: [...formData.sections, newSection],
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
        {/* Coach Notes Panel - Separate Panel to the RIGHT of WOD Panel */}
        {notesPanelOpen && (
          <div className='fixed left-[800px] top-0 h-full w-[400px] bg-white shadow-2xl z-50 flex flex-col border-l-2 border-[#208479] animate-slide-in-right'>
            {/* Header */}
            <div className='bg-[#208479] text-white p-4 flex justify-between items-center'>
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
            <div className='border-t p-4 bg-gray-50'>
              <p className='text-xs text-gray-500'>
                Notes are private and searchable. Auto-saved when you save the WOD.
              </p>
            </div>
          </div>
        )}

        {/* WOD Panel */}
        <div className='fixed left-0 top-0 h-full w-[800px] bg-white shadow-2xl z-50 flex flex-col border-r-2 border-[#208479] animate-slide-in-left'>
          {/* Header */}
          <div className='bg-[#208479] text-white p-4 flex justify-between items-center'>
            <h2 className='text-xl font-bold'>{editingWOD ? 'Edit WOD' : 'Create New WOD'}</h2>
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

            {/* Track and Workout Type */}
            <div className='flex gap-6 items-start'>
              {/* Track */}
              <div className='flex-1'>
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

              {/* Workout Type */}
              <div className='flex-1'>
                <label className='block text-sm font-semibold mb-2 text-gray-900'>
                  Workout Type
                </label>
                <select
                  value={formData.workout_type_id || ''}
                  onChange={e => handleChange('workout_type_id', e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 bg-white'
                  disabled={loadingTracks}
                >
                  <option value=''>Select Workout Type...</option>
                  {workoutTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
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

          {/* Exercise Library Popup */}
          <ExerciseLibraryPopup
            isOpen={libraryOpen}
            onClose={() => setLibraryOpen(false)}
            onSelectExercise={handleSelectExercise}
          />
        </div>
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
            <h2 className='text-xl font-bold'>{editingWOD ? 'Edit WOD' : 'Create New WOD'}</h2>
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

              {/* Track and Workout Type */}
              <div className='flex gap-6 items-start'>
                {/* Track */}
                <div className='flex-1'>
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

                {/* Workout Type */}
                <div className='flex-1'>
                  <label className='block text-sm font-semibold mb-2 text-gray-900'>
                    Workout Type
                  </label>
                  <select
                    value={formData.workout_type_id || ''}
                    onChange={e => handleChange('workout_type_id', e.target.value)}
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 bg-white'
                    disabled={loadingTracks}
                  >
                    <option value=''>Select Workout Type...</option>
                    {workoutTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
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
        isOpen={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelectExercise={handleSelectExercise}
      />
    </>
  );
}
