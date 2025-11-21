'use client';

import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import type { BarbellLift, Benchmark, ForgeBenchmark, ConfiguredLift, ConfiguredBenchmark, ConfiguredForgeBenchmark } from '@/types/movements';

// Format date to YYYY-MM-DD using local timezone
const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export interface WODSection {
  id: string;
  type: string;
  duration: number; // minutes
  content: string; // Free-form markdown text
  workout_type_id?: string; // Workout type (only for WOD sections)

  // Structured movements
  lifts?: ConfiguredLift[];
  benchmarks?: ConfiguredBenchmark[];
  forge_benchmarks?: ConfiguredForgeBenchmark[];
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
  is_published?: boolean;
  workout_publish_status?: string | null; // 'draft' | 'published' | null (null = no workout)
  google_event_id?: string | null;
  booking_info?: {
    session_id: string;
    confirmed_count: number;
    waitlist_count: number;
    capacity: number;
    time?: string;
  };
  selectedSessionIds?: string[]; // For applying workout to multiple sessions
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

interface WorkoutTitle {
  id: string;
  name: string;
  display_order: number;
  active: boolean;
}

export interface UseWorkoutModalResult {
  // State
  formData: WODFormData;
  errors: Record<string, string>;
  libraryOpen: boolean;
  activeSection: number | null;
  libraryKey: number;
  expandedSections: Set<string>;
  lastExpandedSectionId: string | null;
  draggedIndex: number | null;
  tracks: Track[];
  workoutTypes: WorkoutType[];
  sectionTypes: SectionType[];
  workoutTitles: WorkoutTitle[];
  loadingTracks: boolean;
  notesPanelOpen: boolean;
  isDragOver: boolean;
  notesModalSize: { width: number; height: number };
  notesModalPos: { bottom: number; left: number };
  isResizingNotes: boolean;
  isDraggingNotes: boolean;
  resizeStartNotes: { x: number; y: number; width: number; height: number };
  dragStartNotes: { x: number; y: number; bottom: number; left: number };
  publishModalOpen: boolean;
  sessionTime: string | null;
  editingTime: boolean;
  tempTime: string;
  otherSessions: Array<{id: string; time: string; workout_id: string | null}>;
  selectedSessionIds: Set<string>;
  applySessionsOpen: boolean;
  newSessionTime: string;

  // Movement Library state
  liftModalOpen: boolean;
  benchmarkModalOpen: boolean;
  forgeModalOpen: boolean;
  selectedLift: BarbellLift | null;
  selectedBenchmark: Benchmark | null;
  selectedForgeBenchmark: ForgeBenchmark | null;

  // Setters for time editing
  setEditingTime: React.Dispatch<React.SetStateAction<boolean>>;
  setTempTime: React.Dispatch<React.SetStateAction<string>>;
  setNewSessionTime: React.Dispatch<React.SetStateAction<string>>;

  // Functions
  handleChange: (field: keyof WODFormData, value: any) => void;
  toggleClassTime: (time: string) => void;
  handleTimeUpdate: () => Promise<void>;
  toggleSectionExpanded: (sectionId: string, sectionIndex?: number) => void;
  addSection: () => void;
  updateSection: (sectionId: string, updates: Partial<WODSection>) => void;
  deleteSection: (sectionId: string) => void;
  handleDragStart: (e: React.DragEvent, index: number) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, dropIndex: number) => void;
  openLibrary: () => void;
  closeLibrary: () => void;
  handleSelectExercise: (exercise: string) => void;
  handleSelectLift: (lift: BarbellLift) => void;
  handleSelectBenchmark: (benchmark: Benchmark) => void;
  handleSelectForgeBenchmark: (forge: ForgeBenchmark) => void;
  handleAddLiftToSection: (sectionId: string, configuredLift: ConfiguredLift) => void;
  handleAddBenchmarkToSection: (sectionId: string, configuredBenchmark: ConfiguredBenchmark) => void;
  handleAddForgeBenchmarkToSection: (sectionId: string, configuredForgeBenchmark: ConfiguredForgeBenchmark) => void;
  handleRemoveLift: (sectionId: string, liftIndex: number) => void;
  handleRemoveBenchmark: (sectionId: string, benchmarkIndex: number) => void;
  handleRemoveForgeBenchmark: (sectionId: string, forgeIndex: number) => void;
  setLiftModalOpen: (open: boolean) => void;
  setBenchmarkModalOpen: (open: boolean) => void;
  setForgeModalOpen: (open: boolean) => void;
  getTotalDuration: () => number;
  getElapsedMinutes: (sectionIndex: number) => number;
  validate: () => boolean;
  handleSubmit: (e: React.FormEvent) => void;
  handlePublish: (publishConfig: any) => Promise<void>;
  handleUnpublish: () => Promise<void>;
  handlePanelDragOver: (e: React.DragEvent) => void;
  handlePanelDragLeave: (e: React.DragEvent) => void;
  insertSectionAtCorrectPosition: (sections: WODSection[], newSection: WODSection) => WODSection[];
  handlePanelDrop: (e: React.DragEvent) => void;
  setNotesPanelOpen: (open: boolean) => void;
  handleNotesDragStart: (e: React.MouseEvent) => void;
  handleNotesResizeStart: (e: React.MouseEvent, corner: string) => void;
  setPublishModalOpen: (open: boolean) => void;
  setApplySessionsOpen: (open: boolean) => void;
}

export function useWorkoutModal(
  isOpen: boolean,
  date: Date,
  editingWOD?: WODFormData | null,
  onSave?: (wod: WODFormData) => void,
  onClose?: () => void,
  onTimeUpdated?: () => void
): UseWorkoutModalResult {
  const [formData, setFormData] = useState<WODFormData>({
    title: '',
    track_id: '',
    workout_type_id: '',
    classTimes: [],
    maxCapacity: 12,
    date: formatDateLocal(date),
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
  const [workoutTitles, setWorkoutTitles] = useState<WorkoutTitle[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [notesPanelOpen, setNotesPanelOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [notesModalSize, setNotesModalSize] = useState({ width: 600, height: 500 });
  const [notesModalPos, setNotesModalPos] = useState({ bottom: 20, left: 820 });
  const [isResizingNotes, setIsResizingNotes] = useState(false);
  const [isDraggingNotes, setIsDraggingNotes] = useState(false);
  const [resizeStartNotes, setResizeStartNotes] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [dragStartNotes, setDragStartNotes] = useState({ x: 0, y: 0, bottom: 0, left: 0 });
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [sessionTime, setSessionTime] = useState<string | null>(null);
  const [editingTime, setEditingTime] = useState(false);
  const [tempTime, setTempTime] = useState('12:00');

  // State for applying workout to other sessions
  const [otherSessions, setOtherSessions] = useState<Array<{id: string; time: string; workout_id: string | null}>>([]);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [applySessionsOpen, setApplySessionsOpen] = useState(false);

  // State for new session time when creating from scratch
  const [newSessionTime, setNewSessionTime] = useState('09:00');

  // Movement Library state
  const [liftModalOpen, setLiftModalOpen] = useState(false);
  const [benchmarkModalOpen, setBenchmarkModalOpen] = useState(false);
  const [forgeModalOpen, setForgeModalOpen] = useState(false);
  const [selectedLift, setSelectedLift] = useState<BarbellLift | null>(null);
  const [selectedBenchmark, setSelectedBenchmark] = useState<Benchmark | null>(null);
  const [selectedForgeBenchmark, setSelectedForgeBenchmark] = useState<ForgeBenchmark | null>(null);

  // Helper function to ensure time is zero-padded for select dropdown
  const padTime = (time: string): string => {
    if (!time) return '12:00';
    const [hours, minutes] = time.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  };

  // Fetch tracks and workout types on mount
  useEffect(() => {
    fetchTracksAndTypes();
  }, []);

  const fetchTracksAndTypes = async () => {
    setLoadingTracks(true);
    try {
      const [tracksResult, typesResult, sectionTypesResult, workoutTitlesResult] = await Promise.all([
        supabase.from('tracks').select('*').order('name'),
        supabase.from('workout_types').select('*').order('name'),
        supabase.from('section_types').select('*').order('display_order'),
        supabase.from('workout_titles').select('*').eq('active', true).order('display_order'),
      ]);

      if (tracksResult.error) throw tracksResult.error;
      if (typesResult.error) throw typesResult.error;
      if (sectionTypesResult.error) throw sectionTypesResult.error;
      if (workoutTitlesResult.error) throw workoutTitlesResult.error;

      setTracks(tracksResult.data || []);
      setWorkoutTypes(typesResult.data || []);
      setSectionTypes(sectionTypesResult.data || []);
      setWorkoutTitles(workoutTitlesResult.data || []);
    } catch (error) {
      console.error('Error fetching tracks, workout types, section types, and workout titles:', error);
    } finally {
      setLoadingTracks(false);
    }
  };

  // Reset form when modal opens or editingWOD changes
  useEffect(() => {
    if (isOpen) {
      // Fetch other sessions on the same date
      const fetchOtherSessions = async () => {
        const { data, error } = await supabase
          .from('weekly_sessions')
          .select('id, time, workout_id')
          .eq('date', formatDateLocal(date))
          .order('time', { ascending: true });

        if (!error && data) {
          // Filter out the current session if editing
          const filtered = editingWOD?.booking_info?.session_id
            ? data.filter(s => s.id !== editingWOD.booking_info!.session_id)
            : data;
          setOtherSessions(filtered);
        }
      };
      fetchOtherSessions();

      if (editingWOD) {
        // Check for pending section drop from calendar card BEFORE setting formData
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pendingSection = (window as any).__draggedSection;

        if (pendingSection) {
          // Clear immediately to prevent double-processing in React StrictMode
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).__draggedSection = null;

          // Add pending section to editingWOD before setting formData
          const newSection: WODSection = {
            id: `section-${Date.now()}`,
            type: pendingSection.type,
            duration: parseInt(pendingSection.duration) || 5,
            content: pendingSection.content,
          };
          const updatedSections = insertSectionAtCorrectPosition(editingWOD.sections, newSection);
          const allSectionIds = [...editingWOD.sections.map(s => s.id), newSection.id];

          setFormData({
            ...editingWOD,
            sections: updatedSections,
          });
          setExpandedSections(new Set(allSectionIds));
        } else if (formData.sections.length === 0 || formData.id !== editingWOD.id) {
          // Only reset formData if:
          // 1. formData is empty (initial state), OR
          // 2. We're editing a different workout (ID changed)
          // This prevents StrictMode's second run from overwriting section additions
          setFormData(editingWOD);
          const allSectionIds = editingWOD.sections.map(s => s.id);
          setExpandedSections(new Set(allSectionIds));
        }

        // Fetch session time if this WOD is linked to a session
        if (editingWOD.booking_info?.session_id) {
          const fetchSessionTime = async () => {
            const { data, error } = await supabase
              .from('weekly_sessions')
              .select('time')
              .eq('id', editingWOD.booking_info!.session_id)
              .single();

            if (!error && data) {
              setSessionTime(data.time);
              setTempTime(padTime(data.time));
            }
          };
          fetchSessionTime();
        } else {
          setSessionTime(null);
        }
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
          date: formatDateLocal(date),
          sections: templateSections,
        });
        // Expand the first section (Warm-up) and track it
        setExpandedSections(new Set([templateSections[0].id]));
        setLastExpandedSectionId(templateSections[0].id);
      }
      setErrors({});
      setActiveSection(null);
      setEditingTime(false);
      if (!editingWOD) {
        setSessionTime(null);
      }
    }
  }, [isOpen, editingWOD, date]);

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

  const handleTimeUpdate = async () => {
    if (!formData.booking_info?.session_id) return;

    try {
      // Add seconds for PostgreSQL TIME format
      const timeWithSeconds = tempTime.length === 5 ? `${tempTime}:00` : tempTime;

      const { error } = await supabase
        .from('weekly_sessions')
        .update({ time: timeWithSeconds })
        .eq('id', formData.booking_info.session_id);

      if (error) {
        console.error('Error updating session time:', error);
        alert('Failed to update time');
        return;
      }

      // Also update the workout's publish_time for Athlete page display
      if (formData.id) {
        await supabase
          .from('wods')
          .update({ publish_time: timeWithSeconds })
          .eq('id', formData.id);
      }

      // Set sessionTime with seconds to match DB format
      setSessionTime(timeWithSeconds);
      setEditingTime(false);
      // Trigger parent refresh to update card
      if (onTimeUpdated) {
        onTimeUpdated();
      }
    } catch (error) {
      console.error('Error updating session time:', error);
      alert('Failed to update time');
    }
  };

  const toggleSectionExpanded = (sectionId: string, sectionIndex?: number) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
        // Don't clear lastExpandedSectionId when collapsing - keep it as reference for adding new sections
        // If collapsing and this was the active section, clear activeSection
        if (sectionIndex !== undefined && activeSection === sectionIndex) {
          setActiveSection(null);
        }
      } else {
        newSet.add(sectionId);
        // Track this as the last expanded section
        setLastExpandedSectionId(sectionId);
        // Set this as the active section for library insertions
        if (sectionIndex !== undefined) {
          setActiveSection(sectionIndex);
        }
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

  const openLibrary = () => {
    // Only open library if there's at least one section
    if (formData.sections.length === 0) {
      alert('Please add a section first');
      return;
    }

    // If no section is currently active/expanded, use the first section
    if (activeSection === null) {
      const firstSection = formData.sections[0];
      setExpandedSections(prev => new Set(prev).add(firstSection.id));
      setActiveSection(0);
    }

    setLibraryOpen(true);
  };

  const closeLibrary = () => {
    setLibraryOpen(false);
    // Don't clear activeSection on close - keep it for next library open
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

    // Class times are now managed via schedule sessions, not required here
    // if (formData.classTimes.length === 0) {
    //   newErrors.classTimes = 'Select at least one class time';
    // }

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
      // If creating new workout without selecting existing sessions, use newSessionTime
      const dataToSave = {
        ...formData,
        selectedSessionIds: Array.from(selectedSessionIds),
        classTimes: (!editingWOD && selectedSessionIds.size === 0)
          ? [newSessionTime]
          : formData.classTimes,
      };
      if (onSave) {
        onSave(dataToSave);
      }
      if (onClose) {
        onClose();
      }
    }
  };

  const handlePublish = async (publishConfig: any) => {
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

      if (onTimeUpdated) {
        await onTimeUpdated();
      }
      setPublishModalOpen(false);
      if (onClose) {
        onClose(); // Close modal to refresh calendar
      }
      alert('Workout published successfully!');
    } catch (error) {
      console.error('Error publishing workout:', error);
      alert('Failed to publish workout. Please try again.');
      throw error;
    }
  };

  const handleUnpublish = async () => {
    if (!confirm('Unpublish this workout? It will be removed from athletes\' calendars.')) {
      return;
    }

    try {
      const response = await fetch(`/api/google/publish-workout?workoutId=${editingWOD?.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to unpublish workout');
      }

      if (onTimeUpdated) {
        await onTimeUpdated();
      }
      if (onClose) {
        onClose(); // Close modal to refresh calendar
      }
      alert('Workout unpublished successfully!');
    } catch (error) {
      console.error('Error unpublishing workout:', error);
      alert('Failed to unpublish workout. Please try again.');
    }
  };

  // Movement Library handlers
  const handleSelectLift = (lift: BarbellLift) => {
    setSelectedLift(lift);
    setLiftModalOpen(true);
    setLibraryOpen(false); // Close library when opening configure modal
  };

  const handleSelectBenchmark = (benchmark: Benchmark) => {
    setSelectedBenchmark(benchmark);
    setBenchmarkModalOpen(true);
    setLibraryOpen(false); // Close library when opening configure modal
  };

  const handleSelectForgeBenchmark = (forge: ForgeBenchmark) => {
    setSelectedForgeBenchmark(forge);
    setForgeModalOpen(true);
    setLibraryOpen(false); // Close library when opening configure modal
  };

  const handleAddLiftToSection = (sectionId: string, configuredLift: ConfiguredLift) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              lifts: [...(section.lifts || []), configuredLift],
            }
          : section
      ),
    }));
    // Don't close modal - let user add multiple items
  };

  const handleAddBenchmarkToSection = (sectionId: string, configuredBenchmark: ConfiguredBenchmark) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              benchmarks: [...(section.benchmarks || []), configuredBenchmark],
            }
          : section
      ),
    }));
    // Don't close modal - let user add multiple items
  };

  const handleAddForgeBenchmarkToSection = (sectionId: string, configuredForgeBenchmark: ConfiguredForgeBenchmark) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              forge_benchmarks: [...(section.forge_benchmarks || []), configuredForgeBenchmark],
            }
          : section
      ),
    }));
    // Don't close modal - let user add multiple items
  };

  const handleRemoveLift = (sectionId: string, liftIndex: number) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              lifts: section.lifts?.filter((_, idx) => idx !== liftIndex),
            }
          : section
      ),
    }));
  };

  const handleRemoveBenchmark = (sectionId: string, benchmarkIndex: number) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              benchmarks: section.benchmarks?.filter((_, idx) => idx !== benchmarkIndex),
            }
          : section
      ),
    }));
  };

  const handleRemoveForgeBenchmark = (sectionId: string, forgeIndex: number) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              forge_benchmarks: section.forge_benchmarks?.filter((_, idx) => idx !== forgeIndex),
            }
          : section
      ),
    }));
  };

  return {
    // State
    formData,
    errors,
    libraryOpen,
    activeSection,
    libraryKey,
    expandedSections,
    lastExpandedSectionId,
    draggedIndex,
    tracks,
    workoutTypes,
    sectionTypes,
    workoutTitles,
    loadingTracks,
    notesPanelOpen,
    isDragOver,
    notesModalSize,
    notesModalPos,
    isResizingNotes,
    isDraggingNotes,
    resizeStartNotes,
    dragStartNotes,
    publishModalOpen,
    sessionTime,
    editingTime,
    tempTime,
    otherSessions,
    selectedSessionIds,
    applySessionsOpen,
    newSessionTime,

    // Movement Library state
    liftModalOpen,
    benchmarkModalOpen,
    forgeModalOpen,
    selectedLift,
    selectedBenchmark,
    selectedForgeBenchmark,

    // Setters for time editing
    setEditingTime,
    setTempTime,
    setNewSessionTime,

    // Functions
    handleChange,
    toggleClassTime,
    handleTimeUpdate,
    toggleSectionExpanded,
    addSection,
    updateSection,
    deleteSection,
    handleDragStart,
    handleDragOver,
    handleDrop,
    openLibrary,
    closeLibrary,
    handleSelectExercise,
    handleSelectLift,
    handleSelectBenchmark,
    handleSelectForgeBenchmark,
    handleAddLiftToSection,
    handleAddBenchmarkToSection,
    handleAddForgeBenchmarkToSection,
    handleRemoveLift,
    handleRemoveBenchmark,
    handleRemoveForgeBenchmark,
    setLiftModalOpen,
    setBenchmarkModalOpen,
    setForgeModalOpen,
    getTotalDuration,
    getElapsedMinutes,
    validate,
    handleSubmit,
    handlePublish,
    handleUnpublish,
    handlePanelDragOver,
    handlePanelDragLeave,
    insertSectionAtCorrectPosition,
    handlePanelDrop,
    setNotesPanelOpen,
    handleNotesDragStart,
    handleNotesResizeStart,
    setPublishModalOpen,
    setApplySessionsOpen,
  };
}
