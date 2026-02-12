'use client';

import { authFetch } from '@/lib/auth-fetch';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useEffect, useState, useRef } from 'react';
import type { BarbellLift, Benchmark, ForgeBenchmark, ConfiguredLift, ConfiguredBenchmark, ConfiguredForgeBenchmark } from '@/types/movements';
import { useSectionManagement } from './useSectionManagement';
import { useMovementConfiguration } from './useMovementConfiguration';
import { useModalResizing } from './useModalResizing';

// Format date to YYYY-MM-DD using local timezone
const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Calculate ISO week format: YYYY-Www (e.g., "2025-W50")
// Matches PostgreSQL's TO_CHAR(date, 'IYYY') || '-W' || TO_CHAR(date, 'IW')
const calculateWorkoutWeek = (date: Date): string => {
  // Use UTC to avoid timezone shifts
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Set to nearest Thursday (current date + 4 - current day of week)
  const dayOfWeek = d.getUTCDay() || 7; // 1=Mon, 7=Sun
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
  // Get year of Thursday (ISO year)
  const isoYear = d.getUTCFullYear();
  // Get first Thursday of ISO year (Jan 4 is always in week 1)
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4DayOfWeek = jan4.getUTCDay() || 7;
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4 + (4 - jan4DayOfWeek)));
  // Calculate week number (weeks between first Thursday and current Thursday + 1)
  const weekNo = Math.floor((d.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return `${isoYear}-W${String(weekNo).padStart(2, '0')}`;
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

  // Configurable scoring fields (determines which inputs athletes see)
  scoring_fields?: {
    time?: boolean;           // Show time input (mm:ss) — lower is better
    max_time?: boolean;       // Show time input (mm:ss) — higher is better (e.g. max hold)
    reps?: boolean;           // Show reps input (total)
    rounds_reps?: boolean;    // Show rounds + reps inputs (AMRAP)
    load?: boolean;           // Show weight/load input (kg)
    calories?: boolean;       // Show calories input
    metres?: boolean;         // Show distance input (metres)
    checkbox?: boolean;       // Show task completion checkbox
    scaling?: boolean;        // Show scaling dropdown
  };
}

export interface WODFormData {
  id?: string;
  title: string;
  session_type?: string; // Replaces 'title' field (WOD, Foundations, Kids & Teens, etc.)
  workout_name?: string; // Optional workout name for tracking repeated workouts
  workout_week?: string; // Auto-calculated ISO week (YYYY-Www)
  track_id?: string;
  workout_type_id?: string;
  classTimes: string[];
  maxCapacity: number;
  date: string;
  time?: string; // Session time (HH:MM:SS format) from weekly_sessions
  sections: WODSection[];
  coach_notes?: string;
  is_published?: boolean;
  workout_publish_status?: string | null; // 'draft' | 'published' | null (null = no workout)
  google_event_id?: string | null;
  publish_time?: string; // Time workout was/will be published (HH:MM:SS format)
  publish_sections?: string[]; // Section IDs that are published
  publish_duration?: number; // Duration in minutes
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
  editingLift: { sectionId: string; liftIndex: number; lift: ConfiguredLift } | null;
  selectedBenchmark: Benchmark | null;
  selectedForgeBenchmark: ForgeBenchmark | null;

  // Setters for time editing
  setEditingTime: React.Dispatch<React.SetStateAction<boolean>>;
  setTempTime: React.Dispatch<React.SetStateAction<string>>;
  setNewSessionTime: React.Dispatch<React.SetStateAction<string>>;
  setActiveSection: React.Dispatch<React.SetStateAction<number | null>>;

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
  handleEditLift: (sectionId: string, liftIndex: number) => void;
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
  handleSessionSelectionToggle: (sessionId: string, checked: boolean) => void;
  handleTextareaInteraction: (sectionId: string, cursorPosition: number) => void;
}

export function useWorkoutModal(
  isOpen: boolean,
  date: Date,
  editingWOD?: WODFormData | null,
  onSave?: (wod: WODFormData) => void,
  onClose?: () => void,
  onTimeUpdated?: () => void,
  initialNotesOpen: boolean = false
): UseWorkoutModalResult {
  const [formData, setFormData] = useState<WODFormData>({
    title: '',
    session_type: '',
    workout_name: '',
    workout_week: calculateWorkoutWeek(date),
    track_id: '',
    workout_type_id: '',
    classTimes: [],
    maxCapacity: 12,
    date: formatDateLocal(date),
    sections: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryKey, setLibraryKey] = useState(0);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [workoutTypes, setWorkoutTypes] = useState<WorkoutType[]>([]);
  const [sectionTypes, setSectionTypes] = useState<SectionType[]>([]);
  const [workoutTitles, setWorkoutTitles] = useState<WorkoutTitle[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [notesPanelOpen, setNotesPanelOpen] = useState(initialNotesOpen);
  const [isDragOver, setIsDragOver] = useState(false);
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

  // Ref to store cursor position when textarea loses focus
  const lastCursorPositionRef = useRef<Record<string, number>>({});

  // Update notes panel when initialNotesOpen changes
  useEffect(() => {
    setNotesPanelOpen(initialNotesOpen);
  }, [initialNotesOpen]);

  // Initialize extracted hooks
  const sectionManagement = useSectionManagement({
    sections: formData.sections,
    sectionTypes,
    onSectionsChange: (sections) => setFormData(prev => ({ ...prev, sections })),
    workoutId: editingWOD?.id || formData.id,
  });

  const movementConfiguration = useMovementConfiguration({
    sections: formData.sections,
    onSectionsChange: (sections) => setFormData(prev => ({ ...prev, sections })),
  });

  const modalResizing = useModalResizing();

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
            lifts: pendingSection.lifts,
            benchmarks: pendingSection.benchmarks,
            forge_benchmarks: pendingSection.forge_benchmarks,
          };
          const updatedSections = sectionManagement.insertSectionAtCorrectPosition(editingWOD.sections, newSection);

          setFormData({
            ...editingWOD,
            sections: updatedSections,
          });
          // Expanded sections are loaded from localStorage via workoutId in useSectionManagement
        } else if (formData.sections.length === 0 || formData.id !== editingWOD.id) {
          // Only reset formData if:
          // 1. formData is empty (initial state), OR
          // 2. We're editing a different workout (ID changed)
          // This prevents StrictMode's second run from overwriting section additions
          setFormData(editingWOD);
          // Expanded sections are loaded from localStorage via workoutId in useSectionManagement
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
          session_type: '',
          workout_name: '',
          workout_week: calculateWorkoutWeek(date),
          track_id: '',
          workout_type_id: '',
          classTimes: [],
          maxCapacity: 12,
          date: formatDateLocal(date),
          sections: templateSections,
        });
        // For new workout (no ID yet), manually expand first section
        // This is safe because there's no workoutId to load from localStorage
        if (!editingWOD) {
          sectionManagement.setExpandedSections(new Set([templateSections[0].id]));
          sectionManagement.setLastExpandedSectionId(templateSections[0].id);
        }
      }
      setErrors({});
      sectionManagement.setActiveSection(null);
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
          lifts: draggedSectionData.lifts,
          benchmarks: draggedSectionData.benchmarks,
          forge_benchmarks: draggedSectionData.forge_benchmarks,
        };
        // Insert section at correct position based on section type display_order
        const updatedSections = sectionManagement.insertSectionAtCorrectPosition(formData.sections, newSection);
        setFormData({
          ...formData,
          sections: updatedSections,
        });
        // Expand the new section
        sectionManagement.setExpandedSections(new Set([...sectionManagement.expandedSections, newSection.id]));
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = (field: keyof WODFormData, value: any) => {
    // If date changes, recalculate workout_week
    if (field === 'date') {
      const dateObj = new Date(value);
      setFormData(prev => ({
        ...prev,
        date: value,
        workout_week: calculateWorkoutWeek(dateObj),
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
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
        toast.error('Failed to update time');
        return;
      }

      // Also update the workout's publish_time and class_times for Athlete page display
      if (formData.id) {
        await supabase
          .from('wods')
          .update({
            publish_time: timeWithSeconds,
            class_times: [timeWithSeconds]
          })
          .eq('id', formData.id);
      }

      // Set sessionTime with seconds to match DB format
      setSessionTime(timeWithSeconds);
      // Update formData.classTimes to reflect the change
      setFormData(prev => ({
        ...prev,
        classTimes: [timeWithSeconds]
      }));
      setEditingTime(false);
      // Trigger parent refresh to update card
      if (onTimeUpdated) {
        onTimeUpdated();
      }
    } catch (error) {
      console.error('Error updating session time:', error);
      toast.error('Failed to update time');
    }
  };

  const openLibrary = () => {
    // Only open library if there's at least one section
    if (formData.sections.length === 0) {
      toast.warning('Please add a section first');
      return;
    }

    // If no section is currently active/expanded, use the first section
    if (sectionManagement.activeSection === null) {
      const firstSection = formData.sections[0];
      sectionManagement.setExpandedSections(prev => new Set(prev).add(firstSection.id));
      sectionManagement.setActiveSection(0);
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
    if (sectionManagement.activeSection === null) return;

    const section = formData.sections[sectionManagement.activeSection];
    if (!section) return;

    // Get cursor position - use stored position if available, otherwise use end of content
    let cursorPos = section.content.length;

    // Check if we have a stored cursor position for this section
    if (lastCursorPositionRef.current[section.id] !== undefined) {
      cursorPos = lastCursorPositionRef.current[section.id];
    } else {
      // Try to get current cursor position from textarea
      const textarea = document.querySelector(`textarea[data-section-id="${section.id}"]`) as HTMLTextAreaElement;
      if (textarea && textarea.selectionStart) {
        cursorPos = textarea.selectionStart;
      }
    }

    const beforeCursor = section.content.substring(0, cursorPos);
    const afterCursor = section.content.substring(cursorPos);

    // Trim trailing whitespace/newlines before cursor position but don't trim leading content
    const trimmedBefore = beforeCursor.replace(/(\n\s*)+$/, ''); // Remove trailing newlines and whitespace

    // Check if we need to add a newline (only if there's content before cursor without trailing newline)
    const needsNewline = trimmedBefore.length > 0 && !/\n$/.test(trimmedBefore);

    // Insert exercise at cursor position
    const newContent = `${trimmedBefore}${needsNewline ? '\n' : ''}* ${exercise}${afterCursor ? '\n' + afterCursor : ''}`;

    // Calculate new cursor position (after the inserted exercise)
    const newCursorPos = trimmedBefore.length + (needsNewline ? 1 : 0) + exercise.length + 2; // +2 for "* "

    // Store the new cursor position
    lastCursorPositionRef.current[section.id] = newCursorPos;

    sectionManagement.updateSection(section.id, { content: newContent });
  };

  // Save cursor position when user interacts with textarea
  const handleTextareaInteraction = (sectionId: string, cursorPosition: number) => {
    lastCursorPositionRef.current[sectionId] = cursorPosition;
    // Update lastExpandedSectionId so Add Section knows which section is active
    sectionManagement.setLastExpandedSectionId(sectionId);
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

    if (formData.maxCapacity < 0 || formData.maxCapacity > 30) {
      newErrors.maxCapacity = 'Capacity must be between 0 and 30 (0 = unlimited)';
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
      // Auto-save workout content before publishing
      if (onSave && editingWOD?.id) {
        await onSave(formData);
      }

      const requestBody = {
        workoutId: editingWOD?.id,
        publishConfig,
      };

      const response = await authFetch('/api/google/publish-workout', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(`Failed to publish workout: ${responseData.error || responseData.details || 'Unknown error'}`);
      }

      if (onTimeUpdated) {
        await onTimeUpdated();
      }
      setPublishModalOpen(false);
      if (onClose) {
        onClose(); // Close modal to refresh calendar
      }
      toast.success('Workout published successfully!');
    } catch (error) {
      console.error('Error publishing workout:', error);
      toast.error('Failed to publish workout. Please try again.');
      throw error;
    }
  };

  const handleUnpublish = async () => {
    if (!confirm('Unpublish this workout? It will be removed from athletes\' calendars.')) {
      return;
    }

    try {
      const response = await authFetch(`/api/google/publish-workout?workoutId=${editingWOD?.id}`, {
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
      toast.success('Workout unpublished successfully!');
    } catch (error) {
      console.error('Error unpublishing workout:', error);
      toast.error('Failed to unpublish workout. Please try again.');
    }
  };

  // Wrapper functions to close library when opening movement modals
  const handleSelectLift = (lift: BarbellLift) => {
    movementConfiguration.handleSelectLift(lift);
    setLibraryOpen(false);
  };

  const handleSelectBenchmark = (benchmark: Benchmark) => {
    movementConfiguration.handleSelectBenchmark(benchmark);
    setLibraryOpen(false);
  };

  const handleSelectForgeBenchmark = (forge: ForgeBenchmark) => {
    movementConfiguration.handleSelectForgeBenchmark(forge);
    setLibraryOpen(false);
  };

  const handleSessionSelectionToggle = (sessionId: string, checked: boolean) => {
    setSelectedSessionIds(prev => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(sessionId);
      } else {
        newSelected.delete(sessionId);
      }
      return newSelected;
    });
  };

  return {
    // State
    formData,
    errors,
    libraryOpen,
    activeSection: sectionManagement.activeSection,
    setActiveSection: sectionManagement.setActiveSection,
    libraryKey,
    expandedSections: sectionManagement.expandedSections,
    lastExpandedSectionId: sectionManagement.lastExpandedSectionId,
    draggedIndex: sectionManagement.draggedIndex,
    tracks,
    workoutTypes,
    sectionTypes,
    workoutTitles,
    loadingTracks,
    notesPanelOpen,
    isDragOver,
    notesModalSize: modalResizing.notesModalSize,
    notesModalPos: modalResizing.notesModalPos,
    isResizingNotes: modalResizing.isResizingNotes,
    isDraggingNotes: modalResizing.isDraggingNotes,
    resizeStartNotes: modalResizing.resizeStartNotes,
    dragStartNotes: modalResizing.dragStartNotes,
    publishModalOpen,
    sessionTime,
    editingTime,
    tempTime,
    otherSessions,
    selectedSessionIds,
    applySessionsOpen,
    newSessionTime,

    // Movement Library state
    liftModalOpen: movementConfiguration.liftModalOpen,
    benchmarkModalOpen: movementConfiguration.benchmarkModalOpen,
    forgeModalOpen: movementConfiguration.forgeModalOpen,
    selectedLift: movementConfiguration.selectedLift,
    editingLift: movementConfiguration.editingLift,
    selectedBenchmark: movementConfiguration.selectedBenchmark,
    selectedForgeBenchmark: movementConfiguration.selectedForgeBenchmark,

    // Setters for time editing
    setEditingTime,
    setTempTime,
    setNewSessionTime,

    // Functions
    handleChange,
    toggleClassTime,
    handleTimeUpdate,
    toggleSectionExpanded: sectionManagement.toggleSectionExpanded,
    addSection: sectionManagement.addSection,
    updateSection: sectionManagement.updateSection,
    deleteSection: sectionManagement.deleteSection,
    handleDragStart: sectionManagement.handleDragStart,
    handleDragOver: sectionManagement.handleDragOver,
    handleDrop: sectionManagement.handleDrop,
    openLibrary,
    closeLibrary,
    handleSelectExercise,
    handleTextareaInteraction,
    handleSelectLift,
    handleEditLift: movementConfiguration.handleEditLift,
    handleSelectBenchmark,
    handleSelectForgeBenchmark,
    handleAddLiftToSection: movementConfiguration.handleAddLiftToSection,
    handleAddBenchmarkToSection: movementConfiguration.handleAddBenchmarkToSection,
    handleAddForgeBenchmarkToSection: movementConfiguration.handleAddForgeBenchmarkToSection,
    handleRemoveLift: movementConfiguration.handleRemoveLift,
    handleRemoveBenchmark: movementConfiguration.handleRemoveBenchmark,
    handleRemoveForgeBenchmark: movementConfiguration.handleRemoveForgeBenchmark,
    setLiftModalOpen: movementConfiguration.setLiftModalOpen,
    setBenchmarkModalOpen: movementConfiguration.setBenchmarkModalOpen,
    setForgeModalOpen: movementConfiguration.setForgeModalOpen,
    getTotalDuration,
    getElapsedMinutes,
    validate,
    handleSubmit,
    handlePublish,
    handleUnpublish,
    handlePanelDragOver,
    handlePanelDragLeave,
    insertSectionAtCorrectPosition: sectionManagement.insertSectionAtCorrectPosition,
    handlePanelDrop,
    setNotesPanelOpen,
    handleNotesDragStart: modalResizing.handleNotesDragStart,
    handleNotesResizeStart: modalResizing.handleNotesResizeStart,
    setPublishModalOpen,
    setApplySessionsOpen,
    handleSessionSelectionToggle,
  };
}
