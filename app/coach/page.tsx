'use client';

import WODModal, { WODFormData, WODSection } from '@/components/WODModal';
import { getCurrentUser, signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
  BarChart3,
  Calendar,
  CalendarDays,
  Copy,
  GripVertical,
  LogOut,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type ViewMode = 'weekly' | 'monthly';

export default function CoachDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ role: string; name: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [wods, setWods] = useState<Record<string, WODFormData[]>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<Date>(new Date());
  const [editingWOD, setEditingWOD] = useState<WODFormData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [draggedWOD, setDraggedWOD] = useState<{ wod: WODFormData; sourceDate: string } | null>(
    null
  );
  const [copiedWOD, setCopiedWOD] = useState<WODFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notesPanel, setNotesPanel] = useState<{ isOpen: boolean; wod: WODFormData | null }>({
    isOpen: false,
    wod: null,
  });
  const [notesDraft, setNotesDraft] = useState('');
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<WODFormData[]>([]);
  const [tracks, setTracks] = useState<Array<{ id: string; name: string }>>([]);
  const [trackCounts, setTrackCounts] = useState<Record<string, number>>({});
  const [selectedSearchWOD, setSelectedSearchWOD] = useState<WODFormData | null>(null);
  const [quickEditMode, setQuickEditMode] = useState(false);
  const [quickEditWOD, setQuickEditWOD] = useState<WODFormData | null>(null);
  const [draggedSection, setDraggedSection] = useState<{
    type: string;
    duration: string;
    content: string;
  } | null>(null);
  const [notesPanelOpen, setNotesPanelOpen] = useState(false);
  const [workoutTypes, setWorkoutTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [sectionTypes, setSectionTypes] = useState<Array<{ id: string; name: string; display_order: number }>>([]);
  const [selectedMovements, setSelectedMovements] = useState<string[]>([]);
  const [selectedWorkoutTypes, setSelectedWorkoutTypes] = useState<string[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [movements, setMovements] = useState<Map<string, number>>(new Map());
  const [modalSize, setModalSize] = useState({ width: 768, height: 600 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [hoveredWOD, setHoveredWOD] = useState<WODFormData | null>(null);
  const [excludedSectionTypes, setExcludedSectionTypes] = useState<string[]>([]);

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        router.push('/login');
        return;
      }

      // Check if user is a coach
      const role = currentUser.user_metadata?.role || 'athlete';
      if (role !== 'coach') {
        router.push('/athlete');
        return;
      }

      setUser({
        role,
        name: currentUser.user_metadata?.full_name || currentUser.email || 'Coach',
      });
      setLoading(false);
      fetchWODs();
      fetchTracksAndCounts();
    };

    checkAuth();
  }, [router]);

  // Extract movements from WOD sections
  const extractMovements = (wods: WODFormData[]): Map<string, number> => {
    const movementCounts = new Map<string, number>();

    // Words to exclude from movement names (noise words)
    const excludeWords = new Set([
      'reps', 'rep', 'rounds', 'round', 'minutes', 'minute', 'min', 'mins',
      'seconds', 'second', 'sec', 'secs', 'meter', 'meters', 'calories', 'cal',
      'cals', 'each', 'side', 'total', 'amrap', 'emom', 'for', 'time', 'the',
      'and', 'or', 'of', 'in', 'at', 'to', 'a', 'an', 'with', 'without',
      'rx', 'scaled', 'beginner', 'intermediate', 'advanced'
    ]);

    // Helper function to normalize movement name
    const normalizeMovement = (movement: string): string => {
      return movement
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
        .trim();
    };

    // Helper function to check if a word is likely part of a movement name
    const isValidMovementWord = (word: string): boolean => {
      const cleaned = word.toLowerCase();
      return !excludeWords.has(cleaned) &&
             cleaned.length > 1 &&
             !/^\d+$/.test(cleaned);
    };

    wods.forEach(wod => {
      wod.sections.forEach(section => {
        const lines = section.content.split('\n');

        lines.forEach(line => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return;

          // Pattern 1: Number + x + Movement (e.g., "10x Air Squats", "10x Pass Throughs (PVC)")
          const numberXPattern = /^(?:\d+[\s-]*x[\s-]*|[\d-]+[\s-]*x[\s-]*)([\w\s\-()]+?)(?:\s*[@\d]|$)/i;
          let match = trimmedLine.match(numberXPattern);

          // Pattern 2: Bullet/asterisk + Movement (e.g., "* Arm Circles", "- Butt Kicks")
          if (!match) {
            const bulletPattern = /^[\s*•\-]+\s*([\w\s\-()]+?)(?:\s*[@\d]|$)/;
            match = trimmedLine.match(bulletPattern);
          }

          // Pattern 3: Number + Movement (e.g., "10 Air Squats", "21-15-9 Thrusters")
          if (!match) {
            const numberPattern = /^(?:\d+[\s-]*)([\w\s\-()]+?)(?:\s*[@\d]|$)/;
            match = trimmedLine.match(numberPattern);
          }

          // Pattern 4: Rep scheme + Movement (e.g., "21-15-9 Thrusters")
          if (!match) {
            const repSchemePattern = /^(?:\d+-\d+(?:-\d+)*[\s-]*)([\w\s\-()]+?)(?:\s*[@\d]|$)/;
            match = trimmedLine.match(repSchemePattern);
          }

          if (match && match[1]) {
            // Extract and clean the movement name
            let movementText = match[1].trim();

            // Remove trailing punctuation but keep parentheses
            movementText = movementText.replace(/[,;.!?]+$/, '');

            // Check if there's parenthetical content (like "PVC" or "Resistance Band")
            const hasParentheses = /\(([^)]+)\)/.test(movementText);

            if (hasParentheses) {
              // Preserve the entire phrase including parentheses
              const movement = normalizeMovement(movementText);
              if (movement.length >= 3) {
                movementCounts.set(movement, (movementCounts.get(movement) || 0) + 1);
              }
            } else {
              // Split into words and filter out noise for non-parenthetical movements
              const words = movementText.split(/\s+/).filter(isValidMovementWord);

              // Take up to 4 words for the movement name (most movements are 1-4 words)
              if (words.length > 0 && words.length <= 4) {
                const movement = normalizeMovement(words.join(' '));

                // Only add if movement name is substantial (at least 3 characters)
                if (movement.length >= 3) {
                  movementCounts.set(movement, (movementCounts.get(movement) || 0) + 1);
                }
              }
            }
          }
        });
      });
    });

    return movementCounts;
  };

  // Highlight search terms in text
  const highlightText = (text: string, searchTerms: string[]): string => {
    if (!searchTerms.length) return text;

    let result = text;
    searchTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      result = result.replace(regex, '<mark class="bg-yellow-200 text-gray-900">$1</mark>');
    });

    return result;
  };

  const fetchTracksAndCounts = async () => {
    try {
      // Fetch all tracks
      const { data: tracksData, error: tracksError } = await supabase
        .from('tracks')
        .select('*')
        .order('name', { ascending: true });

      if (tracksError) throw tracksError;
      setTracks(tracksData || []);

      // Fetch all workout types
      const { data: typesData, error: typesError } = await supabase
        .from('workout_types')
        .select('*')
        .order('name', { ascending: true });

      if (typesError) throw typesError;
      setWorkoutTypes(typesData || []);

      // Fetch all section types
      const { data: sectionTypesData, error: sectionTypesError } = await supabase
        .from('section_types')
        .select('*')
        .order('display_order', { ascending: true });

      if (sectionTypesError) throw sectionTypesError;
      setSectionTypes(sectionTypesData || []);

      // Fetch WOD counts grouped by track_id
      const { data: wodsData, error: wodsError } = await supabase.from('wods').select('track_id');

      if (wodsError) throw wodsError;

      // Count WODs per track
      const counts: Record<string, number> = {};
      wodsData?.forEach((wod: { track_id: string | null }) => {
        if (wod.track_id) {
          counts[wod.track_id] = (counts[wod.track_id] || 0) + 1;
        }
      });

      setTrackCounts(counts);
    } catch (error) {
      console.error('Error fetching tracks and counts:', error);
    }
  };

  // Search WODs with debounce
  useEffect(() => {
    if (
      !searchQuery &&
      !selectedMovements.length &&
      !selectedWorkoutTypes.length &&
      !selectedTracks.length
    ) {
      setSearchResults([]);
      setMovements(new Map());
      return;
    }

    const searchWODs = async () => {
      try {
        let query = supabase.from('wods').select('*');

        // Filter by tracks if selected
        if (selectedTracks.length > 0) {
          query = query.in('track_id', selectedTracks);
        }

        // Note: Workout type filtering moved to client-side (line ~328) since workout_type_id is now in sections JSONB

        // Order by date descending and get all WODs (filter client-side for better section content search)
        const { data, error } = await query.order('date', { ascending: false }).limit(500);

        if (error) throw error;

        // Map to WODFormData
        interface WODRecord {
          id: string;
          title: string;
          track_id: string | null;
          workout_type_id: string | null;
          class_times: string[];
          max_capacity: number;
          date: string;
          sections: Array<{
            id: string;
            type: string;
            title: string;
            duration: number;
            content: string;
            workout_type_id?: string;
          }>;
          coach_notes: string | null;
        }

        let results: WODFormData[] =
          data?.map((wod: WODRecord) => ({
            id: wod.id,
            title: wod.title,
            track_id: wod.track_id || undefined,
            workout_type_id: wod.workout_type_id || undefined,
            classTimes: wod.class_times,
            maxCapacity: wod.max_capacity,
            date: wod.date,
            sections: wod.sections,
            coach_notes: wod.coach_notes || undefined,
          })) || [];

        // Client-side filter for search query (OR logic for each term)
        if (searchQuery) {
          const searchTerms = searchQuery.trim().toLowerCase().split(/\s+/);
          results = results.filter(wod => {
            // Filter sections based on excluded section types
            const sectionsToSearch = excludedSectionTypes.length > 0
              ? wod.sections.filter(s => !excludedSectionTypes.includes(s.type))
              : wod.sections;

            const combinedText =
              `${wod.title} ${wod.coach_notes || ''} ${sectionsToSearch.map(s => s.content).join(' ')}`.toLowerCase();
            // If ANY search term matches, include this WOD
            return searchTerms.some(term => combinedText.includes(term));
          });
        }

        // Client-side filter for movements (AND logic)
        if (selectedMovements.length > 0) {
          results = results.filter(wod => {
            const combinedContent = wod.sections.map(s => s.content.toLowerCase()).join(' ');
            return selectedMovements.every(movement =>
              new RegExp(`\\b${movement.toLowerCase()}\\b`, 'i').test(combinedContent)
            );
          });
        }

        // Client-side filter for workout types (check section-level workout_type_id)
        if (selectedWorkoutTypes.length > 0) {
          results = results.filter(wod =>
            wod.sections.some(section =>
              section.workout_type_id && selectedWorkoutTypes.includes(section.workout_type_id)
            )
          );
        }

        setSearchResults(results);

        // Update movements map from all WODs
        const allMovements = extractMovements(results);
        setMovements(allMovements);
      } catch (error) {
        console.error('Error searching WODs:', error);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(searchWODs, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedMovements, selectedWorkoutTypes, selectedTracks, excludedSectionTypes]);

  const fetchWODs = async () => {
    try {
      const { data, error } = await supabase
        .from('wods')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;

      // Group WODs by date
      interface WODRecord {
        id: string;
        title: string;
        track_id: string | null;
        workout_type_id: string | null;
        class_times: string[];
        max_capacity: number;
        date: string;
        sections: Array<{
          id: string;
          type: string;
          title: string;
          duration: number;
          content: string;
        }>;
        coach_notes: string | null;
      }

      const grouped: Record<string, WODFormData[]> = {};
      data?.forEach((wod: WODRecord) => {
        const dateKey = wod.date;
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push({
          id: wod.id,
          title: wod.title,
          track_id: wod.track_id || undefined,
          workout_type_id: wod.workout_type_id || undefined,
          classTimes: wod.class_times,
          maxCapacity: wod.max_capacity,
          date: wod.date,
          sections: wod.sections,
          coach_notes: wod.coach_notes || undefined,
        });
      });

      setWods(grouped);
    } catch (error) {
      console.error('Error fetching WODs:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get ISO week number
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };

  const getWeekDates = () => {
    const curr = new Date(selectedDate);
    curr.setHours(0, 0, 0, 0); // Reset time to midnight
    const day = curr.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
    curr.setDate(curr.getDate() + diff);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(curr);
      dates.push(date);
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  };

  const getMonthDates = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1, 0, 0, 0, 0);

    // Start from Monday of the week containing the 1st
    const dayOfWeek = firstDay.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() + diff);

    const dates = [];
    const current = new Date(startDate);

    // Get 6 weeks (42 days) to cover full month
    for (let i = 0; i < 42; i++) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  const previousPeriod = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'weekly') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setSelectedDate(newDate);
  };

  const nextPeriod = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'weekly') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
  };

  const openCreateModal = (date: Date, openNotes: boolean = false) => {
    setModalDate(date);
    setEditingWOD(null);
    setIsModalOpen(true);
    setNotesPanelOpen(openNotes);
  };

  const openEditModal = (wod: WODFormData) => {
    setEditingWOD(wod);
    setModalDate(new Date(wod.date));
    setIsModalOpen(true);
  };

  const handleSaveWOD = async (wodData: WODFormData) => {
    const dateKey = formatDate(modalDate);

    try {
      if (editingWOD && editingWOD.id) {
        // Update existing WOD
        const { error } = await supabase
          .from('wods')
          .update({
            title: wodData.title,
            track_id: wodData.track_id || null,
            workout_type_id: wodData.workout_type_id || null,
            class_times: wodData.classTimes,
            max_capacity: wodData.maxCapacity,
            date: dateKey,
            sections: wodData.sections,
            coach_notes: wodData.coach_notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingWOD.id);

        if (error) throw error;
      } else {
        // Create new WOD
        const { error } = await supabase.from('wods').insert([
          {
            title: wodData.title,
            track_id: wodData.track_id || null,
            workout_type_id: wodData.workout_type_id || null,
            class_times: wodData.classTimes,
            max_capacity: wodData.maxCapacity,
            date: dateKey,
            sections: wodData.sections,
            coach_notes: wodData.coach_notes || null,
          },
        ]);

        if (error) throw error;
      }

      // Refresh WODs and track counts from database
      await fetchWODs();
      await fetchTracksAndCounts();
    } catch (error) {
      console.error('Error saving WOD:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error saving WOD: ${errorMessage}\n\nPlease check the console for details.`);
    }
  };

  const closeNotesPanel = () => {
    setNotesPanel({ isOpen: false, wod: null });
    setNotesDraft('');
    setModalSize({ width: 768, height: 600 }); // Reset size
  };

  const handleResizeStart = (e: React.MouseEvent, corner: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: modalSize.width,
      height: modalSize.height,
    });
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;

      const newWidth = Math.max(400, Math.min(1200, resizeStart.width + deltaX * 2));
      const newHeight = Math.max(400, Math.min(window.innerHeight * 0.9, resizeStart.height + deltaY * 2));

      setModalSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStart]);

  const handleSaveNotes = async () => {
    if (!notesPanel.wod?.id) return;

    try {
      const { error } = await supabase
        .from('wods')
        .update({
          coach_notes: notesDraft || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', notesPanel.wod.id);

      if (error) throw error;

      // Refresh WODs, track counts, and close panel
      await fetchWODs();
      await fetchTracksAndCounts();
      closeNotesPanel();
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Error saving notes. Please try again.');
    }
  };

  const handleDeleteWOD = async (dateKey: string, wodId: string) => {
    if (!confirm('Are you sure you want to delete this WOD?')) return;

    try {
      const { error } = await supabase.from('wods').delete().eq('id', wodId);

      if (error) throw error;

      // Refresh WODs and track counts from database
      await fetchWODs();
      await fetchTracksAndCounts();
    } catch (error) {
      console.error('Error deleting WOD:', error);
      alert('Error deleting WOD. Please try again.');
    }
  };

  const handleCopyWOD = async (wod: WODFormData, targetDate: Date) => {
    const dateKey = formatDate(targetDate);

    try {
      const { error } = await supabase.from('wods').insert([
        {
          title: wod.title,
          track_id: wod.track_id || null,
          workout_type_id: wod.workout_type_id || null,
          class_times: wod.classTimes,
          max_capacity: wod.maxCapacity,
          date: dateKey,
          sections: wod.sections,
        },
      ]);

      if (error) throw error;

      // Refresh WODs and track counts from database
      await fetchWODs();
      await fetchTracksAndCounts();
    } catch (error) {
      console.error('Error copying WOD:', error);
      alert('Error copying WOD. Please try again.');
    }
  };

  const handleDragStart = (e: React.DragEvent, wod: WODFormData, sourceDate: string) => {
    setDraggedWOD({ wod, sourceDate });
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', 'wod');
    // Store WOD data on window object for cross-component access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__draggedWOD = wod;
  };

  const handleSectionDragStart = (
    e: React.DragEvent,
    section: { type: string; duration: string; content: string }
  ) => {
    setDraggedSection(section);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', 'section');
    // Store section data on window object for cross-component access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__draggedSection = section;
  };

  const handleQuickEditDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dataType = e.dataTransfer.getData('text/plain');

    if (dataType === 'wod' && draggedWOD && quickEditWOD) {
      // Replace entire WOD content
      setQuickEditWOD({
        ...quickEditWOD,
        title: draggedWOD.wod.title,
        sections: [...draggedWOD.wod.sections],
        track_id: draggedWOD.wod.track_id,
        workout_type_id: draggedWOD.wod.workout_type_id,
      });
      setDraggedWOD(null);
    } else if (dataType === 'section' && draggedSection && quickEditWOD) {
      // Add section to WOD
      const newSection: WODSection = {
        id: `section-${Date.now()}`,
        type: draggedSection.type,
        duration: parseInt(draggedSection.duration) || 5,
        content: draggedSection.content,
      };
      setQuickEditWOD({
        ...quickEditWOD,
        sections: [...quickEditWOD.sections, newSection],
      });
      setDraggedSection(null);
    }
  };

  const saveQuickEdit = async () => {
    if (!quickEditWOD) return;

    try {
      const { error } = await supabase
        .from('wods')
        .insert([
          {
            title: quickEditWOD.title,
            track_id: quickEditWOD.track_id || null,
            workout_type_id: quickEditWOD.workout_type_id || null,
            class_times: quickEditWOD.classTimes,
            max_capacity: quickEditWOD.maxCapacity,
            date: quickEditWOD.date,
            sections: quickEditWOD.sections,
            coach_notes: quickEditWOD.coach_notes || null,
          },
        ])
        .select();

      if (error) throw error;

      await fetchWODs();
      await fetchTracksAndCounts();
      setQuickEditMode(false);
      setQuickEditWOD(null);
    } catch (error) {
      console.error('Error saving WOD:', error);
      alert('Error saving WOD. Please try again.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (!draggedWOD) return;

    handleCopyWOD(draggedWOD.wod, targetDate);
    setDraggedWOD(null);
  };

  const handleCopyToClipboard = (wod: WODFormData) => {
    setCopiedWOD(wod);
  };

  const handlePasteFromClipboard = (targetDate: Date) => {
    if (!copiedWOD) return;
    handleCopyWOD(copiedWOD, targetDate);
    setCopiedWOD(null); // Clear clipboard after pasting
  };

  if (loading || !user) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[#208479] mx-auto'></div>
          <p className='mt-4 text-gray-600'>Loading...</p>
        </div>
      </div>
    );
  }

  const displayDates = viewMode === 'weekly' ? getWeekDates() : getMonthDates();
  const weekDates = getWeekDates();

  return (
    <div className='min-h-screen bg-gray-200 flex'>
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isModalOpen && searchPanelOpen
            ? 'ml-[800px] mr-[800px]'
            : isModalOpen && quickEditMode && searchPanelOpen
              ? 'ml-[800px] mr-[1200px]'
              : isModalOpen && quickEditMode
                ? 'ml-[800px] mr-[400px]'
                : quickEditMode && searchPanelOpen
                  ? 'mr-[1200px]'
                  : quickEditMode
                    ? 'mr-[800px]'
                    : isModalOpen
                      ? 'ml-[800px]'
                      : searchPanelOpen
                        ? 'mr-[800px]'
                        : ''
        }`}
      >
        {/* Header */}
        <header className='bg-[#208479] text-white p-4 shadow-lg flex-shrink-0'>
          <div className='max-w-7xl mx-auto flex justify-between items-center'>
            <div>
              <h1 className='text-2xl font-bold'>The Forge - Coach Dashboard</h1>
              <p className='text-teal-100'>Welcome, {user.name}</p>
            </div>
            <div className='flex items-center gap-3'>
              <button
                onClick={() => setSearchPanelOpen(!searchPanelOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${searchPanelOpen ? 'bg-teal-800' : 'bg-[#1a6b62] hover:bg-teal-800'}`}
              >
                <Plus size={18} />
                Add Workout
              </button>
              <button
                onClick={() => router.push('/coach/athletes')}
                className='flex items-center gap-2 bg-[#1a6b62] hover:bg-teal-800 px-4 py-2 rounded-lg transition'
              >
                <Users size={18} />
                Athletes
              </button>
              <button
                onClick={() => router.push('/coach/analysis')}
                className='flex items-center gap-2 bg-[#1a6b62] hover:bg-teal-800 px-4 py-2 rounded-lg transition'
              >
                <BarChart3 size={18} />
                Analysis
              </button>
              <button
                onClick={handleLogout}
                className='flex items-center gap-2 bg-[#1a6b62] hover:bg-teal-800 px-4 py-2 rounded-lg transition'
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className='flex-1 flex flex-col'>
          {/* View Mode Toggle & Navigation */}
          <div className='bg-white border-b px-4 py-4 flex-shrink-0'>
            <div className='w-full space-y-4'>
              {/* View Mode Toggle */}
              <div className='flex justify-center'>
                <div className='inline-flex rounded-lg border border-gray-300 p-1 bg-gray-50'>
                  <button
                    onClick={() => setViewMode('weekly')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition ${
                      viewMode === 'weekly'
                        ? 'bg-[#208479] text-white'
                        : 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    <CalendarDays size={18} />
                    Weekly
                  </button>
                  <button
                    onClick={() => setViewMode('monthly')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition ${
                      viewMode === 'monthly'
                        ? 'bg-[#208479] text-white'
                        : 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    <Calendar size={18} />
                    Monthly
                  </button>
                </div>
              </div>

              {/* Period Navigation */}
              <div className='flex justify-between items-center'>
                <button
                  onClick={previousPeriod}
                  className='px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-900 font-medium'
                >
                  {viewMode === 'weekly' ? 'Previous Week' : 'Previous Month'}
                </button>
                <div className='flex items-center gap-4'>
                  <h2 className='text-xl font-semibold text-gray-900'>
                    {viewMode === 'weekly' ? (
                      <>
                        Week {getWeekNumber(weekDates[0])} -{' '}
                        {weekDates[0].toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </>
                    ) : (
                      <>
                        {selectedDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                      </>
                    )}
                  </h2>
                  {copiedWOD && (
                    <button
                      onClick={() => setCopiedWOD(null)}
                      className='text-xs px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition'
                      title='Cancel copy mode'
                    >
                      Cancel Copy
                    </button>
                  )}
                </div>
                <button
                  onClick={nextPeriod}
                  className='px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-900 font-medium'
                >
                  {viewMode === 'weekly' ? 'Next Week' : 'Next Month'}
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className='flex-1 flex flex-col w-full'>
            {viewMode === 'monthly' && (
              /* Month View with Week Numbers */
              <div className='w-full max-w-none px-4'>
                {/* Weekday Headers */}
                <div className='flex gap-2 mb-2'>
                  {/* Week number column header */}
                  <div className='w-8'></div>
                  {/* Day headers */}
                  <div className='flex-1 grid grid-cols-7 gap-2'>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <div
                        key={day}
                        className='text-center text-xs font-semibold text-white bg-[#208479] py-2 rounded'
                      >
                        {day}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Month Grid - 6 rows of 7 days */}
                {Array.from({ length: 6 }).map((_, weekIdx) => {
                  const weekStart = weekIdx * 7;
                  const weekDates = displayDates.slice(weekStart, weekStart + 7);
                  const weekNumber = getWeekNumber(weekDates[0]);

                  return (
                    <div key={weekIdx} className='flex gap-2 mb-2'>
                      {/* Week Number - Teal Box */}
                      <div className='w-8 flex items-center justify-center text-xs font-semibold text-white bg-[#208479] rounded'>
                        {weekNumber}
                      </div>

                      {/* Days in week */}
                      <div className='flex-1 grid grid-cols-7 gap-2'>
                        {weekDates.map((date, dayIdx) => {
                          const dateKey = formatDate(date);
                          const dayWODs = wods[dateKey] || [];
                          const isToday = formatDate(new Date()) === dateKey;
                          const isCurrentMonth = date.getMonth() === selectedDate.getMonth();

                          return (
                            <div
                              key={dayIdx}
                              className={`bg-white rounded-lg shadow p-2 min-h-[120px] relative ${
                                isToday ? 'ring-2 ring-[#208479]' : ''
                              } ${!isCurrentMonth ? 'opacity-40' : ''}`}
                              onDragOver={handleDragOver}
                              onDrop={e => handleDrop(e, date)}
                            >
                              {/* Day Number and Paste Button */}
                              <div className='flex items-center justify-between mb-1'>
                                <div
                                  className={`text-sm font-semibold ${
                                    isCurrentMonth
                                      ? 'text-[#208479]'
                                      : 'text-gray-400'
                                  }`}
                                >
                                  {date.getDate()}
                                </div>
                                {copiedWOD && (
                                  <button
                                    onClick={() => handlePasteFromClipboard(date)}
                                    className='text-[10px] px-1 py-0.5 bg-[#208479] text-white rounded hover:bg-[#1a6b62] transition'
                                    title='Paste WOD'
                                  >
                                    Paste
                                  </button>
                                )}
                              </div>

                              {/* WODs */}
                              {dayWODs.slice(0, 2).map((wod: WODFormData) => (
                                <div
                                  key={wod.id}
                                  draggable
                                  onDragStart={e => handleDragStart(e, wod, dateKey)}
                                  className='mb-1 p-1 bg-gray-50 rounded text-xs hover:bg-gray-200 cursor-move transition group relative'
                                  title='Drag to copy'
                                >
                                  <div className='flex items-center justify-between gap-1'>
                                    <div
                                      className='font-semibold text-gray-900 truncate flex-1 cursor-pointer'
                                      onClick={() => openEditModal(wod)}
                                    >
                                      {wod.title}
                                    </div>
                                    <div className='flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity'>
                                      <button
                                        onClick={e => {
                                          e.stopPropagation();
                                          handleCopyToClipboard(wod);
                                        }}
                                        className='text-[#208479] hover:text-[#1a6b62] p-0.5'
                                        title='Copy WOD'
                                      >
                                        <Copy size={12} />
                                      </button>
                                      <button
                                        onClick={e => {
                                          e.stopPropagation();
                                          handleDeleteWOD(dateKey, wod.id!);
                                        }}
                                        className='text-gray-500 hover:text-red-600 p-0.5'
                                        title='Delete WOD'
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {dayWODs.length > 2 && (
                                <div
                                  className='text-xs text-gray-600 hover:text-[#208479] cursor-pointer'
                                  onClick={() => openEditModal(dayWODs[2])}
                                  title='Click to see more WODs'
                                >
                                  +{dayWODs.length - 2} more
                                </div>
                              )}

                              {/* Add Button */}
                              <button
                                onClick={() => openCreateModal(date)}
                                className='w-full mt-1 py-1 text-xs text-gray-600 hover:text-[#208479] transition'
                              >
                                <Plus size={12} className='inline' />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {viewMode === 'weekly' && (
              /* Week View - 2 Weeks */
              <div className='px-4'>
                {/* First Week */}
                <div className='mb-6'>
                  {/* Week Number Banner */}
                  <div className='bg-[#208479] text-white px-4 py-2 rounded-t-lg mb-4'>
                    <div className='text-sm font-semibold'>Week {getWeekNumber(displayDates[0])}</div>
                  </div>

                  <div className='grid grid-cols-7 gap-2'>
                    {displayDates.slice(0, 7).map((date, idx) => {
                    const dateKey = formatDate(date);
                    const dayWODs = wods[dateKey] || [];
                    const isToday = formatDate(new Date()) === dateKey;

                    return (
                      <div
                        key={idx}
                        className={`bg-white rounded-lg shadow p-4 ${isToday ? 'ring-2 ring-[#208479]' : ''}`}
                        onDragOver={handleDragOver}
                        onDrop={e => handleDrop(e, date)}
                      >
                        {/* Day Header */}
                        <div className='mb-3 flex justify-between items-center'>
                          <div>
                            <div className='font-bold text-lg text-gray-900'>
                              {date.toLocaleDateString('en-GB', { weekday: 'long' })}
                            </div>
                            <div className='text-sm text-gray-700'>
                              {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </div>
                          </div>
                          {copiedWOD && (
                            <button
                              onClick={() => handlePasteFromClipboard(date)}
                              className='text-xs px-2 py-1 bg-[#208479] text-white rounded hover:bg-[#1a6b62] transition'
                              title='Paste WOD'
                            >
                              Paste
                            </button>
                          )}
                        </div>

                        {/* WODs for this day */}
                        {dayWODs.map((wod: WODFormData) => (
                          <div
                            key={wod.id}
                            draggable
                            onDragStart={e => handleDragStart(e, wod, dateKey)}
                            className='mb-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-move group relative'
                            title='Drag to copy or click to edit'
                          >
                            <div className='pr-8'>
                              <span
                                className='font-bold text-sm text-gray-900 cursor-pointer block mb-2'
                                onClick={e => {
                                  e.stopPropagation();
                                  openEditModal(wod);
                                }}
                              >
                                {wod.title}
                              </span>
                              <div className='text-xs text-gray-700'>
                                {wod.classTimes?.join(', ')}
                              </div>
                            </div>
                            <div className='absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  handleCopyToClipboard(wod);
                                }}
                                className='text-[#208479] hover:text-[#1a6b62] p-1 bg-white rounded shadow-sm'
                                title='Copy WOD'
                              >
                                <Copy size={14} />
                              </button>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  handleDeleteWOD(dateKey, wod.id!);
                                }}
                                className='text-gray-500 hover:text-red-600 p-1 bg-white rounded shadow-sm'
                                title='Delete WOD'
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Add WOD Button */}
                        <button
                          onClick={() => openCreateModal(date)}
                          className='w-full py-2 border-2 border-dashed border-gray-300 hover:border-[#208479] hover:bg-[#208479] hover:text-white rounded-lg text-gray-700 hover:text-white flex items-center justify-center gap-2 transition font-medium'
                        >
                          <Plus size={18} />
                          Add Workout
                        </button>
                      </div>
                    );
                  })}
                  </div>
                </div>

                {/* Second Week */}
                <div>
                  {/* Week Number Banner */}
                  <div className='bg-[#208479] text-white px-4 py-2 rounded-t-lg mb-4'>
                    <div className='text-sm font-semibold'>Week {getWeekNumber((() => {
                      const secondWeekStart = new Date(displayDates[0]);
                      secondWeekStart.setDate(secondWeekStart.getDate() + 7);
                      return secondWeekStart;
                    })())}</div>
                  </div>

                  <div className='grid grid-cols-7 gap-2'>
                    {Array.from({ length: 7 }).map((_, dayOffset) => {
                      const currentDate = new Date(displayDates[0]);
                      currentDate.setDate(currentDate.getDate() + 7 + dayOffset);
                      const date = currentDate;
                      const dateKey = formatDate(date);
                      const dayWODs = wods[dateKey] || [];
                      const isToday = formatDate(new Date()) === dateKey;

                      return (
                        <div
                          key={dayOffset}
                          className={`bg-white rounded-lg shadow p-4 ${isToday ? 'ring-2 ring-[#208479]' : ''}`}
                          onDragOver={handleDragOver}
                          onDrop={e => handleDrop(e, date)}
                        >
                          {/* Day Header */}
                          <div className='mb-3 flex justify-between items-center'>
                            <div>
                              <div className='font-bold text-lg text-gray-900'>
                                {date.toLocaleDateString('en-GB', { weekday: 'long' })}
                              </div>
                              <div className='text-sm text-gray-700'>
                                {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </div>
                            </div>
                            {copiedWOD && (
                              <button
                                onClick={() => handlePasteFromClipboard(date)}
                                className='text-xs px-2 py-1 bg-[#208479] text-white rounded hover:bg-[#1a6b62] transition'
                                title='Paste WOD'
                              >
                                Paste
                              </button>
                            )}
                          </div>

                          {/* WODs for this day */}
                          {dayWODs.map((wod: WODFormData) => (
                            <div
                              key={wod.id}
                              draggable
                              onDragStart={e => handleDragStart(e, wod, dateKey)}
                              className='mb-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-move group relative'
                              title='Drag to copy or click to edit'
                            >
                              <div className='pr-8'>
                                <span
                                  className='font-bold text-sm text-gray-900 cursor-pointer block mb-2'
                                  onClick={e => {
                                    e.stopPropagation();
                                    openEditModal(wod);
                                  }}
                                >
                                  {wod.title}
                                </span>
                                <div className='text-xs text-gray-700'>
                                  {wod.classTimes?.join(', ')}
                                </div>
                              </div>
                              <div className='absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleCopyToClipboard(wod);
                                  }}
                                  className='text-[#208479] hover:text-[#1a6b62] p-1 bg-white rounded shadow-sm'
                                  title='Copy WOD'
                                >
                                  <Copy size={14} />
                                </button>
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleDeleteWOD(dateKey, wod.id!);
                                  }}
                                  className='text-gray-500 hover:text-red-600 p-1 bg-white rounded shadow-sm'
                                  title='Delete WOD'
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}

                          {/* Add Workout Button */}
                          <button
                            onClick={() => openCreateModal(date)}
                            className='w-full py-2 border-2 border-dashed border-gray-300 hover:border-[#208479] hover:bg-[#208479] hover:text-white rounded-lg text-gray-700 hover:text-white flex items-center justify-center gap-2 transition font-medium'
                          >
                            <Plus size={18} />
                            Add Workout
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WOD Search Panel */}
      {searchPanelOpen && (
        <div className='fixed right-0 top-0 h-full w-[800px] bg-white shadow-2xl z-50 flex flex-col border-l-2 border-[#208479] animate-slide-in-right'>
          {/* Header */}
          <div className='bg-[#208479] text-white p-4 flex justify-between items-center'>
            <h2 className='text-xl font-bold'>Schedule a Workout</h2>
            <button
              onClick={() => {
                setSearchPanelOpen(false);
                setSelectedSearchWOD(null);
                setSearchQuery('');
                setSelectedMovements([]);
                setSelectedWorkoutTypes([]);
                setSelectedTracks([]);
                setSearchResults([]);
                setMovements(new Map());
              }}
              className='hover:bg-[#1a6b62] p-1 rounded transition'
            >
              <X size={24} />
            </button>
          </div>

          {/* Two-Column Layout */}
          <div className='flex-1 flex overflow-hidden'>
            {/* LEFT SIDEBAR - Filters */}
            <div className='w-[200px] border-r overflow-y-auto bg-gray-50'>
              {/* Movements Section */}
              <details className='border-b' open>
                <summary className='px-3 py-2 font-semibold text-sm text-gray-900 cursor-pointer hover:bg-gray-100'>
                  Movements
                </summary>
                <div className='px-2 py-2 space-y-1'>
                  {Array.from(movements.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([movement, count]) => (
                      <button
                        key={movement}
                        onClick={() => {
                          setSelectedMovements(prev =>
                            prev.includes(movement)
                              ? prev.filter(m => m !== movement)
                              : [...prev, movement]
                          );
                        }}
                        className={`w-full text-left px-2 py-1 rounded text-xs flex justify-between items-center transition ${
                          selectedMovements.includes(movement)
                            ? 'bg-[#208479] text-white'
                            : 'hover:bg-gray-200 text-gray-900'
                        }`}
                      >
                        <span className='truncate'>{movement}</span>
                        <span
                          className={`text-xs ml-1 ${selectedMovements.includes(movement) ? 'opacity-75' : 'text-gray-500'}`}
                        >
                          {count}
                        </span>
                      </button>
                    ))}
                  {movements.size === 0 && (
                    <p className='text-xs text-gray-500 px-2 py-1'>No movements found</p>
                  )}
                </div>
              </details>

              {/* Workout Types Section */}
              <details className='border-b' open>
                <summary className='px-3 py-2 font-semibold text-sm text-gray-900 cursor-pointer hover:bg-gray-100'>
                  Workout Types
                </summary>
                <div className='px-2 py-2 space-y-1'>
                  {workoutTypes.map(type => {
                    const count = searchResults.filter(wod =>
                      wod.sections.some(section => section.workout_type_id === type.id)
                    ).length;
                    return (
                      <button
                        key={type.id}
                        onClick={() => {
                          setSelectedWorkoutTypes(prev =>
                            prev.includes(type.id)
                              ? prev.filter(t => t !== type.id)
                              : [...prev, type.id]
                          );
                        }}
                        className={`w-full text-left px-2 py-1 rounded text-xs flex justify-between items-center transition ${
                          selectedWorkoutTypes.includes(type.id)
                            ? 'bg-[#208479] text-white'
                            : 'hover:bg-gray-200 text-gray-900'
                        }`}
                      >
                        <span className='truncate'>{type.name}</span>
                        <span
                          className={`text-xs ml-1 ${selectedWorkoutTypes.includes(type.id) ? 'opacity-75' : 'text-gray-500'}`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                  {workoutTypes.length === 0 && (
                    <p className='text-xs text-gray-500 px-2 py-1'>No types found</p>
                  )}
                </div>
              </details>

              {/* Tracks Section */}
              <details className='border-b' open>
                <summary className='px-3 py-2 font-semibold text-sm text-gray-900 cursor-pointer hover:bg-gray-100'>
                  Tracks
                </summary>
                <div className='px-2 py-2 space-y-1'>
                  {tracks.map(track => (
                    <button
                      key={track.id}
                      onClick={() => {
                        setSelectedTracks(prev =>
                          prev.includes(track.id)
                            ? prev.filter(t => t !== track.id)
                            : [...prev, track.id]
                        );
                      }}
                      className={`w-full text-left px-2 py-1 rounded text-xs flex justify-between items-center transition ${
                        selectedTracks.includes(track.id)
                          ? 'bg-[#208479] text-white'
                          : 'hover:bg-gray-200 text-gray-900'
                      }`}
                    >
                      <span className='truncate'>{track.name}</span>
                      <span
                        className={`text-xs ml-1 ${selectedTracks.includes(track.id) ? 'opacity-75' : 'text-gray-500'}`}
                      >
                        {trackCounts[track.id] || 0}
                      </span>
                    </button>
                  ))}
                  {tracks.length === 0 && (
                    <p className='text-xs text-gray-500 px-2 py-1'>No tracks found</p>
                  )}
                </div>
              </details>
            </div>

            {/* RIGHT SIDE - Search and Results */}
            <div className='flex-1 flex flex-col overflow-hidden'>
              {/* Search Bar */}
              <div className='p-4 border-b'>
                <div className='relative'>
                  <Search className='absolute left-3 top-3 text-gray-400' size={18} />
                  <input
                    type='text'
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder='Search workout history...'
                    className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#208479] focus:border-transparent'
                  />
                </div>

                {/* Section Type Filter Buttons */}
                <div className='mt-3'>
                  <div className='text-xs font-semibold text-gray-700 mb-2'>Exclude from search:</div>
                  <div className='flex flex-wrap gap-2'>
                    {sectionTypes.map(sectionType => (
                      <button
                        key={sectionType.id}
                        onClick={() => {
                          setExcludedSectionTypes(prev =>
                            prev.includes(sectionType.name)
                              ? prev.filter(t => t !== sectionType.name)
                              : [...prev, sectionType.name]
                          );
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                          excludedSectionTypes.includes(sectionType.name)
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {sectionType.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active Filter Chips */}
                {(searchQuery ||
                  selectedMovements.length > 0 ||
                  selectedWorkoutTypes.length > 0 ||
                  selectedTracks.length > 0) && (
                  <div className='flex flex-wrap gap-2 mt-3'>
                    {searchQuery && (
                      <span className='inline-flex items-center gap-1 px-2 py-1 bg-[#208479] text-white text-xs rounded-full'>
                        Search: &quot;{searchQuery}&quot;
                        <button
                          onClick={() => setSearchQuery('')}
                          className='hover:bg-[#1a6b62] rounded-full p-0.5'
                        >
                          <X size={12} />
                        </button>
                      </span>
                    )}
                    {selectedMovements.map(movement => (
                      <span
                        key={movement}
                        className='inline-flex items-center gap-1 px-2 py-1 bg-[#208479] text-white text-xs rounded-full'
                      >
                        {movement}
                        <button
                          onClick={() =>
                            setSelectedMovements(prev => prev.filter(m => m !== movement))
                          }
                          className='hover:bg-[#1a6b62] rounded-full p-0.5'
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    {selectedWorkoutTypes.map(typeId => {
                      const type = workoutTypes.find(t => t.id === typeId);
                      return type ? (
                        <span
                          key={typeId}
                          className='inline-flex items-center gap-1 px-2 py-1 bg-[#208479] text-white text-xs rounded-full'
                        >
                          {type.name}
                          <button
                            onClick={() =>
                              setSelectedWorkoutTypes(prev => prev.filter(t => t !== typeId))
                            }
                            className='hover:bg-[#1a6b62] rounded-full p-0.5'
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ) : null;
                    })}
                    {selectedTracks.map(trackId => {
                      const track = tracks.find(t => t.id === trackId);
                      return track ? (
                        <span
                          key={trackId}
                          className='inline-flex items-center gap-1 px-2 py-1 bg-[#208479] text-white text-xs rounded-full'
                        >
                          {track.name}
                          <button
                            onClick={() =>
                              setSelectedTracks(prev => prev.filter(t => t !== trackId))
                            }
                            className='hover:bg-[#1a6b62] rounded-full p-0.5'
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              {/* Search Results */}
              {!selectedSearchWOD &&
                (searchQuery ||
                  selectedMovements.length > 0 ||
                  selectedWorkoutTypes.length > 0 ||
                  selectedTracks.length > 0) && (
                  <div className='flex-1 overflow-y-auto p-4'>
                    <h3 className='font-semibold text-gray-900 mb-3'>
                      Results ({searchResults.length})
                    </h3>
                    <div className='space-y-3 relative'>
                      {searchResults.map(wod => {
                        const wodSection = wod.sections.find(s => s.type.toLowerCase() === 'wod');
                        const wodDate = new Date(wod.date);
                        const formattedDate = wodDate.toLocaleDateString('en-GB', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                        const searchTerms = searchQuery.trim().split(/\s+/).filter(Boolean);

                        return (
                          <div
                            key={wod.id}
                            draggable
                            onDragStart={e => handleDragStart(e, wod, wod.date)}
                            onClick={() => setSelectedSearchWOD(wod)}
                            onMouseEnter={() => setHoveredWOD(wod)}
                            onMouseLeave={() => setHoveredWOD(null)}
                            className={`p-3 bg-white rounded-lg cursor-pointer transition relative min-h-[80px] w-3/4 ${
                              hoveredWOD?.id === wod.id
                                ? 'border-0'
                                : 'border border-gray-200 hover:border-[#208479] hover:bg-gray-50'
                            }`}
                          >
                            <div className='text-xs text-gray-500 mb-1'>{formattedDate}</div>
                            <div
                              className='font-semibold text-sm text-gray-900 mb-2'
                              dangerouslySetInnerHTML={{
                                __html: highlightText(wod.title, searchTerms),
                              }}
                            />
                            {wodSection && (
                              <div
                                className='text-xs text-gray-700 whitespace-pre-wrap line-clamp-3'
                                dangerouslySetInnerHTML={{
                                  __html: highlightText(wodSection.content, searchTerms),
                                }}
                              />
                            )}

                            {/* Hover Popover - Full WOD Preview */}
                            {hoveredWOD?.id === wod.id && (
                              <div className='absolute inset-0 bg-white border-2 border-[#208479] rounded-lg shadow-2xl p-4 z-[200] overflow-y-auto'>
                                <div className='text-sm font-bold text-gray-900 mb-3'>{wod.title}</div>
                                <div className='space-y-3'>
                                  {wod.sections.map((section, idx) => (
                                    <div key={idx} className='border-b border-gray-200 pb-2 last:border-b-0'>
                                      <div className='text-xs font-semibold text-[#208479] mb-1'>
                                        {section.type}
                                        {section.duration > 0 && ` (${section.duration} min)`}
                                      </div>
                                      <div className='text-xs text-gray-700 whitespace-pre-wrap'>
                                        {section.content}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {searchResults.length === 0 && (
                        <p className='text-sm text-gray-500'>No results found</p>
                      )}
                    </div>
                  </div>
                )}

              {/* WOD Detail View */}
              {selectedSearchWOD && (
                <div className='flex-1 overflow-y-auto p-4'>
                  <button
                    onClick={() => setSelectedSearchWOD(null)}
                    className='text-sm text-[#208479] hover:text-[#1a6b62] mb-4 flex items-center gap-1'
                  >
                    ← Back to results
                  </button>

                  {/* Draggable Entire WOD */}
                  <div
                    className='hover:bg-gray-50 p-2 rounded-lg transition'
                    id={`wod-${selectedSearchWOD.id}`}
                  >
                    <div className='space-y-4'>
                      <div className='flex items-start gap-2'>
                        <div
                          draggable
                          onDragStart={e => {
                            const wodElement = document.getElementById(
                              `wod-${selectedSearchWOD.id}`
                            );
                            if (wodElement) {
                              const ghost = wodElement.cloneNode(true) as HTMLElement;
                              ghost.style.position = 'absolute';
                              ghost.style.top = '-9999px';
                              ghost.style.width = wodElement.offsetWidth + 'px';
                              ghost.style.backgroundColor = '#f9fafb';
                              ghost.style.padding = '8px';
                              ghost.style.borderRadius = '8px';
                              ghost.style.opacity = '0.9';
                              document.body.appendChild(ghost);
                              e.dataTransfer.setDragImage(ghost, 10, 10);
                              setTimeout(() => document.body.removeChild(ghost), 0);
                            }
                            handleDragStart(e, selectedSearchWOD, selectedSearchWOD.date);
                          }}
                          className='cursor-move'
                        >
                          <GripVertical size={20} className='text-gray-400 mt-1 flex-shrink-0' />
                        </div>
                        <div className='flex-1'>
                          <h3 className='font-bold text-lg text-gray-900 mb-1'>
                            {selectedSearchWOD.title}
                          </h3>
                          <p className='text-xs text-gray-600'>
                            {new Date(selectedSearchWOD.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Sections with individual drag handles */}
                      <div className='space-y-3'>
                        {selectedSearchWOD.sections.map((section, idx) => (
                          <div
                            key={idx}
                            id={`section-${selectedSearchWOD.id}-${idx}`}
                            className='bg-white rounded-lg border border-gray-200 p-3 hover:border-[#208479] transition flex gap-2'
                          >
                            <div
                              draggable
                              onDragStart={e => {
                                e.stopPropagation();
                                const sectionElement = document.getElementById(
                                  `section-${selectedSearchWOD.id}-${idx}`
                                );
                                if (sectionElement) {
                                  const ghost = sectionElement.cloneNode(true) as HTMLElement;
                                  ghost.style.position = 'absolute';
                                  ghost.style.top = '-9999px';
                                  ghost.style.width = sectionElement.offsetWidth + 'px';
                                  ghost.style.backgroundColor = 'white';
                                  ghost.style.opacity = '0.9';
                                  document.body.appendChild(ghost);
                                  e.dataTransfer.setDragImage(ghost, 10, 10);
                                  setTimeout(() => document.body.removeChild(ghost), 0);
                                }
                                handleSectionDragStart(e, {
                                  type: section.type,
                                  duration: String(section.duration),
                                  content: section.content,
                                });
                              }}
                              className='cursor-move'
                            >
                              <GripVertical
                                size={16}
                                className='text-gray-400 flex-shrink-0 mt-1'
                              />
                            </div>
                            <div className='flex-1'>
                              <div className='font-semibold text-sm text-gray-900 mb-1'>
                                {section.type}
                              </div>
                              <div className='text-xs text-gray-500 mb-2'>
                                {section.duration} min
                              </div>
                              <div className='text-sm text-gray-700 whitespace-pre-wrap'>
                                {section.content}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Coach Notes */}
                      {selectedSearchWOD.coach_notes && (
                        <div className='bg-yellow-50 rounded-lg border border-yellow-200 p-3'>
                          <div className='font-semibold text-sm text-gray-900 mb-1'>
                            Coach Notes
                          </div>
                          <div className='text-sm text-gray-700 whitespace-pre-wrap'>
                            {selectedSearchWOD.coach_notes}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className='flex gap-2 pt-4'>
                    <button
                      onClick={() => {
                        openEditModal(selectedSearchWOD);
                        setSearchPanelOpen(false);
                        setSelectedSearchWOD(null);
                      }}
                      className='flex-1 px-4 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white rounded-lg font-medium transition'
                    >
                      Edit WOD
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className='border-t p-4'>
            <button
              onClick={() => {
                openCreateModal(new Date(), true);
                setSelectedSearchWOD(null);
              }}
              className='w-full px-4 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white rounded-lg font-medium transition'
            >
              + Create New Workout
            </button>
          </div>
        </div>
      )}

      {/* Quick Edit Panel */}
      {quickEditMode && quickEditWOD && (
        <div
          className='fixed right-0 top-0 h-full w-[400px] bg-white shadow-2xl z-50 flex flex-col border-l-2 border-[#208479] animate-slide-in-right'
          style={{ right: searchPanelOpen ? '800px' : '0' }}
        >
          {/* Header */}
          <div className='bg-[#208479] text-white p-4 flex justify-between items-center'>
            <h2 className='text-xl font-bold'>Quick Edit WOD</h2>
            <button
              onClick={() => {
                setQuickEditMode(false);
                setQuickEditWOD(null);
              }}
              className='hover:bg-[#1a6b62] p-1 rounded transition'
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div
            className='flex-1 overflow-y-auto p-4 space-y-4'
            onDragOver={handleDragOver}
            onDrop={handleQuickEditDrop}
          >
            {/* Drop Zone Indicator */}
            <div className='border-2 border-dashed border-[#208479] rounded-lg p-4 text-center text-sm text-gray-600 bg-teal-50'>
              <p className='font-semibold text-[#208479]'>Drop Zone</p>
              <p className='text-xs'>Drag entire WODs or individual sections here</p>
            </div>

            {/* Title Input */}
            <div>
              <label className='block text-sm font-semibold mb-2 text-gray-900'>WOD Title</label>
              <input
                type='text'
                value={quickEditWOD.title}
                onChange={e => setQuickEditWOD({ ...quickEditWOD, title: e.target.value })}
                placeholder='Enter workout title...'
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 placeholder-gray-400'
              />
            </div>

            {/* Sections */}
            <div className='space-y-3'>
              {quickEditWOD.sections.map((section, idx) => (
                <div key={idx} className='bg-white rounded-lg border border-gray-200 p-3'>
                  <div className='flex items-center justify-between mb-2'>
                    <div className='font-semibold text-sm text-gray-900'>{section.type}</div>
                    <button
                      onClick={() => {
                        const newSections = quickEditWOD.sections.filter((_, i) => i !== idx);
                        setQuickEditWOD({ ...quickEditWOD, sections: newSections });
                      }}
                      className='text-red-600 hover:text-red-800 text-xs'
                    >
                      Remove
                    </button>
                  </div>
                  <div className='text-xs text-gray-500 mb-2'>{section.duration}</div>
                  <textarea
                    value={section.content}
                    onChange={e => {
                      const newSections = [...quickEditWOD.sections];
                      newSections[idx] = { ...newSections[idx], content: e.target.value };
                      setQuickEditWOD({ ...quickEditWOD, sections: newSections });
                    }}
                    placeholder='Enter section content...'
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 placeholder-gray-400 text-sm min-h-[100px] resize-y'
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className='border-t p-4 bg-gray-50 flex gap-3'>
            <button
              onClick={() => {
                setQuickEditMode(false);
                setQuickEditWOD(null);
              }}
              className='flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 font-medium transition'
            >
              Cancel
            </button>
            <button
              onClick={saveQuickEdit}
              className='flex-1 px-4 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white rounded-lg font-medium transition'
            >
              Save WOD
            </button>
          </div>
        </div>
      )}

      {/* WOD Modal as Side Panel */}
      <WODModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveWOD}
        date={modalDate}
        editingWOD={editingWOD}
        isPanel={true}
        panelOffset={searchPanelOpen ? 800 : quickEditMode ? 400 : 0}
        initialNotesOpen={notesPanelOpen}
        onNotesToggle={setNotesPanelOpen}
      />

      {/* Coach Notes Modal */}
      {notesPanel.isOpen && (
        <>
          {/* Backdrop */}
          <div className='fixed inset-0 bg-black bg-opacity-50 z-40' onClick={closeNotesPanel} />

          {/* Floating Modal */}
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
            <div
              className='bg-white rounded-lg shadow-2xl flex flex-col relative'
              style={{
                width: `${modalSize.width}px`,
                height: `${modalSize.height}px`,
                maxWidth: '90vw',
                maxHeight: '90vh'
              }}
            >
              {/* Resize Handles - Large corner triangles */}
              {/* Bottom-right */}
              <div
                className='absolute bottom-0 right-0 w-12 h-12 cursor-se-resize z-50'
                onMouseDown={(e) => handleResizeStart(e, 'se')}
                title='Drag to resize'
              >
                <div className='absolute bottom-0 right-0 w-0 h-0 border-l-[48px] border-l-transparent border-b-[48px] border-b-[#208479] hover:border-b-[#1a6b62] transition'></div>
                <div className='absolute bottom-1 right-1 text-white text-xs font-bold'>⇘</div>
              </div>
              {/* Top-right */}
              <div
                className='absolute top-0 right-0 w-12 h-12 cursor-ne-resize z-50'
                onMouseDown={(e) => handleResizeStart(e, 'ne')}
                title='Drag to resize'
              >
                <div className='absolute top-0 right-0 w-0 h-0 border-l-[48px] border-l-transparent border-t-[48px] border-t-[#208479] hover:border-t-[#1a6b62] transition rounded-tr-lg'></div>
                <div className='absolute top-1 right-1 text-white text-xs font-bold'>⇗</div>
              </div>
              {/* Bottom-left */}
              <div
                className='absolute bottom-0 left-0 w-12 h-12 cursor-sw-resize z-50'
                onMouseDown={(e) => handleResizeStart(e, 'sw')}
                title='Drag to resize'
              >
                <div className='absolute bottom-0 left-0 w-0 h-0 border-r-[48px] border-r-transparent border-b-[48px] border-b-[#208479] hover:border-b-[#1a6b62] transition rounded-bl-lg'></div>
                <div className='absolute bottom-1 left-1 text-white text-xs font-bold'>⇙</div>
              </div>
              {/* Top-left */}
              <div
                className='absolute top-0 left-0 w-12 h-12 cursor-nw-resize z-50'
                onMouseDown={(e) => handleResizeStart(e, 'nw')}
                title='Drag to resize'
              >
                <div className='absolute top-0 left-0 w-0 h-0 border-r-[48px] border-r-transparent border-t-[48px] border-t-[#208479] hover:border-t-[#1a6b62] transition rounded-tl-lg'></div>
                <div className='absolute top-1 left-1 text-white text-xs font-bold'>⇖</div>
              </div>
              {/* Header */}
              <div className='bg-[#208479] text-white p-6 rounded-t-lg flex justify-between items-start flex-shrink-0'>
              <div>
                <h2 className='text-2xl font-bold mb-2'>Coach Notes</h2>
                <p className='text-sm opacity-90'>
                  {notesPanel.wod?.title} -{' '}
                  {notesPanel.wod?.date
                    ? new Date(notesPanel.wod.date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : ''}
                </p>
                </div>
                <button
                  onClick={closeNotesPanel}
                  className='hover:bg-[#1a6b62] p-2 rounded transition'
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className='flex-1 overflow-y-auto p-6'>
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-semibold mb-2 text-gray-900'>Notes</label>
                  <textarea
                    value={notesDraft}
                    onChange={e => setNotesDraft(e.target.value)}
                    placeholder='Add private notes about this workout...&#10;&#10;Examples:&#10;- Athlete feedback&#10;- Scaling options used&#10;- Time management notes&#10;- Equipment setup details&#10;- Modifications made'
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 placeholder-gray-400 min-h-[400px] resize-y font-mono text-sm'
                  />
                  <p className='text-xs text-gray-500 mt-2'>
                    These notes are private and searchable. They&apos;ll help you find and reference
                    this workout in the future.
                  </p>
                </div>

                {/* WOD Preview */}
                <div className='border-t pt-4'>
                  <h3 className='text-sm font-semibold text-gray-900 mb-2'>Workout Preview</h3>
                  <div className='bg-gray-50 rounded-lg p-4 space-y-2'>
                    <div className='text-sm'>
                      <span className='font-semibold text-gray-700'>Class Times:</span>{' '}
                      <span className='text-gray-900'>
                        {notesPanel.wod?.classTimes?.join(', ') || 'None'}
                      </span>
                    </div>
                    <div className='text-sm'>
                      <span className='font-semibold text-gray-700'>Sections:</span>{' '}
                      <span className='text-gray-900'>{notesPanel.wod?.sections?.length || 0}</span>
                    </div>
                    <div className='text-sm'>
                      <span className='font-semibold text-gray-700'>Total Duration:</span>{' '}
                      <span className='text-gray-900'>
                        {notesPanel.wod?.sections?.reduce((sum, s) => sum + s.duration, 0) || 0}{' '}
                        mins
                      </span>
                    </div>
                  </div>
                </div>
                </div>
              </div>

              {/* Footer */}
              <div className='border-t p-6 bg-gray-50 rounded-b-lg flex justify-end gap-3 flex-shrink-0'>
                <button
                  onClick={closeNotesPanel}
                  className='px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 font-medium transition'
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNotes}
                  className='px-6 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white rounded-lg font-medium transition'
                >
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
