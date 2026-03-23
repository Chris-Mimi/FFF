'use client';

import { WODFormData, WODSection } from './WorkoutModal';
import { GripVertical, Search, X, Menu, Maximize2, Minimize2, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import remarkBreaks from 'remark-breaks';
import { useState, useEffect, useRef, useMemo } from 'react';
import { formatLift, formatBenchmark, formatForgeBenchmark } from '@/utils/logbook/formatters';
import { useTrackedExercises, useExerciseGroups } from '@/lib/exercise-storage';
import { useMovementTracking } from '@/hooks/coach/useMovementTracking';
import MovementTrackingPanel from './MovementTrackingPanel';
import type { ConfiguredLift, ConfiguredBenchmark, ConfiguredForgeBenchmark } from '@/types/movements';

interface WorkoutType {
  id: string;
  name: string;
}

interface Track {
  id: string;
  name: string;
}

interface SectionType {
  id: string;
  name: string;
  display_order: number;
}

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchResults: WODFormData[];
  selectedMovements: string[];
  onSelectedMovementsChange: (movements: string[]) => void;
  selectedWorkoutTypes: string[];
  onSelectedWorkoutTypesChange: (types: string[]) => void;
  selectedTracks: string[];
  onSelectedTracksChange: (tracks: string[]) => void;
  selectedSessionTypes: string[];
  onSelectedSessionTypesChange: (types: string[]) => void;
  includedSectionTypes: string[];
  onIncludedSectionTypesChange: (types: string[]) => void;
  movements: Map<string, number>;
  workoutTypes: WorkoutType[];
  tracks: Track[];
  sessionTypes: string[];
  sectionTypes: SectionType[];
  sectionTypeCounts: Record<string, number>;
  selectedSectionTypeFilter: string[];
  onSelectedSectionTypeFilterChange: (types: string[]) => void;
  trackCounts: Record<string, number>;
  workoutTypeCounts: Record<string, number>;
  sessionTypeCounts: Record<string, number>;
  members: Array<{ id: string; name: string; booking_count: number; date_of_birth: string | null }>;
  exerciseList: Array<{ id: string; name: string; display_name: string | null; category: string }>;
  selectedMembers: string[];
  onSelectedMembersChange: (members: string[]) => void;
  selectedSearchWOD: WODFormData | null;
  onSelectedSearchWODChange: (wod: WODFormData | null) => void;
  hoveredWOD: WODFormData | null;
  onHoveredWODChange: (wod: WODFormData | null) => void;
  onDragStart: (e: React.DragEvent, wod: WODFormData, sourceDate: string) => void;
  onSectionDragStart: (
    e: React.DragEvent,
    section: {
      type: string;
      duration: string;
      content: string;
      lifts?: ConfiguredLift[];
      benchmarks?: ConfiguredBenchmark[];
      forge_benchmarks?: ConfiguredForgeBenchmark[];
    }
  ) => void;
  onEditWOD: (wod: WODFormData) => void;
  onCreateWorkout: (date: Date, fromSearch: boolean) => void;
  highlightText: (text: string, searchTerms: string[]) => string;
}

export default function SearchPanel({
  isOpen,
  onClose,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  selectedMovements,
  onSelectedMovementsChange,
  selectedWorkoutTypes,
  onSelectedWorkoutTypesChange,
  selectedTracks,
  onSelectedTracksChange,
  selectedSessionTypes,
  onSelectedSessionTypesChange,
  includedSectionTypes,
  onIncludedSectionTypesChange,
  movements,
  workoutTypes,
  tracks,
  sessionTypes,
  sectionTypes,
  sectionTypeCounts,
  selectedSectionTypeFilter,
  onSelectedSectionTypeFilterChange,
  trackCounts,
  workoutTypeCounts,
  sessionTypeCounts,
  members,
  exerciseList,
  selectedMembers,
  onSelectedMembersChange,
  selectedSearchWOD,
  onSelectedSearchWODChange,
  hoveredWOD,
  onHoveredWODChange,
  onDragStart,
  onSectionDragStart,
  onEditWOD,
  onCreateWorkout,
  highlightText,
}: SearchPanelProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(true);
  const [mobileTrackingOpen, setMobileTrackingOpen] = useState(false);
  const [showUnique, setShowUnique] = useState(true);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [exerciseDropdownOpen, setExerciseDropdownOpen] = useState(false);
  const exerciseSearchRef = useRef<HTMLDivElement>(null);
  const { trackedExercises, addTracked, removeTracked, toggleTracked, batchSetActive, deactivateAll } = useTrackedExercises();
  const {
    groups: exerciseGroups,
    createGroup,
    deleteGroup,
    renameGroup,
    updateGroupExercises,
    toggleGroupActive,
    deactivateAllGroups,
    removeExerciseFromAllGroups,
  } = useExerciseGroups();
  const [showGroupNameInput, setShowGroupNameInput] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupExercises, setEditingGroupExercises] = useState<string | null>(null);

  const filteredExercises = useMemo(() => {
    if (!exerciseSearch.trim()) return [];
    const query = exerciseSearch.toLowerCase();
    const trackedIds = new Set(trackedExercises.map(e => e.id));
    return exerciseList
      .filter(ex => {
        if (trackedIds.has(ex.id)) return false;
        const name = (ex.display_name || ex.name).toLowerCase();
        return name.includes(query);
      })
;
  }, [exerciseSearch, exerciseList, trackedExercises]);

  // Derive exerciseNames Set for movement tracking
  const exerciseNamesSet = useMemo(() => {
    const names = new Set<string>();
    exerciseList.forEach(ex => {
      if (ex.display_name) names.add(ex.display_name);
    });
    return names;
  }, [exerciseList]);

  const activeTrackedExercises = useMemo(() => trackedExercises.filter(ex => ex.active !== false), [trackedExercises]);

  const { trackingData, lastPerformedData, globalLastProgrammed, loading: trackingLoading } = useMovementTracking({
    selectedMembers,
    trackedExercises: activeTrackedExercises,
    exerciseNames: exerciseNamesSet,
  });

  // Split members into kids (<16) and adults, with selected members sorted to top
  const { adultMembers, kidMembers } = useMemo(() => {
    const now = new Date();
    const kids: typeof members = [];
    const adults: typeof members = [];
    for (const m of members) {
      if (m.date_of_birth) {
        const dob = new Date(m.date_of_birth);
        const age = now.getFullYear() - dob.getFullYear() - (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
        if (age < 16) { kids.push(m); continue; }
      }
      adults.push(m);
    }
    const sortSelected = (list: typeof members) => {
      const sel = list.filter(m => selectedMembers.includes(m.id));
      const unsel = list.filter(m => !selectedMembers.includes(m.id));
      return [...sel, ...unsel];
    };
    return { adultMembers: sortSelected(adults), kidMembers: sortSelected(kids) };
  }, [members, selectedMembers]);

  // Deduplicate search results by workout_name + bi-weekly window
  const uniqueSearchResults = useMemo(() => {
    const seen = new Map<string, WODFormData>();
    searchResults.forEach(wod => {
      let key: string;
      if (wod.workout_name && wod.workout_week) {
        const match = wod.workout_week.match(/^(\d{4})-W(\d{2})$/);
        if (match) {
          const week = parseInt(match[2], 10);
          const biWeek = week % 2 === 0 ? week : week - 1;
          key = `${wod.workout_name}_${match[1]}-W${String(biWeek).padStart(2, '0')}`;
        } else {
          key = `${wod.workout_name}_${wod.workout_week}`;
        }
      } else {
        key = `${wod.id || wod.date}_${wod.time || ''}`;
      }
      if (!seen.has(key)) seen.set(key, wod);
    });
    return Array.from(seen.values());
  }, [searchResults]);

  const displayedResults = showUnique ? uniqueSearchResults : searchResults;

  // Close exercise dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exerciseSearchRef.current && !exerciseSearchRef.current.contains(e.target as Node)) {
        setExerciseDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to render section content with structured data (lifts, benchmarks, forge benchmarks)
  const renderSectionContent = (section: WODSection) => {
    const parts: React.ReactElement[] = [];

    // Add lifts with full details (sets, reps, percentage)
    if (section.lifts && section.lifts.length > 0) {
      section.lifts.forEach((lift: ConfiguredLift, idx: number) => {
        const formatted = formatLift(lift);
        parts.push(
          <div key={`lift-${idx}`} className='font-medium text-[#178da6]'>
            • {formatted}
          </div>
        );
      });
    }

    // Add benchmarks with name and description
    if (section.benchmarks && section.benchmarks.length > 0) {
      section.benchmarks.forEach((benchmark: ConfiguredBenchmark, idx: number) => {
        const { name, description } = formatBenchmark(benchmark);
        parts.push(
          <div key={`benchmark-${idx}`} className='font-medium text-[#178da6]'>
            • {name}
            {description && <span className='font-normal text-gray-700'> - {description}</span>}
          </div>
        );
      });
    }

    // Add forge benchmarks with name and description
    if (section.forge_benchmarks && section.forge_benchmarks.length > 0) {
      section.forge_benchmarks.forEach((forge: ConfiguredForgeBenchmark, idx: number) => {
        const { name, description } = formatForgeBenchmark(forge);
        parts.push(
          <div key={`forge-${idx}`} className='font-medium text-[#178da6]'>
            • {name}
            {description && <span className='font-normal text-gray-700'> - {description}</span>}
          </div>
        );
      });
    }

    // Add text content
    if (section.content && section.content.trim()) {
      parts.push(
        <div key='content' className='whitespace-pre-wrap'>
          {section.content}
        </div>
      );
    }

    return parts.length > 0 ? <>{parts}</> : null;
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={`fixed right-0 top-0 lg:top-[72px] h-dvh lg:h-[calc(100vh-72px)] w-full bg-white shadow-2xl z-50 flex flex-col border-t border-gray-400 transition-all duration-300 ${isMaximized ? 'lg:left-0' : 'lg:w-[800px] border-l-2 border-[#178da6]'}`}>
      {/* Header */}
      <div className='bg-[#178da6] text-white p-3 lg:p-4 flex justify-between items-center'>
        <div className='flex items-center gap-2'>
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className='lg:hidden hover:bg-[#14758c] p-3 rounded transition'
            title='Toggle Filters'
          >
            <Menu size={20} />
          </button>
          <h2 className='text-base sm:text-lg lg:text-xl font-bold'>Workouts</h2>
        </div>
        <div className='flex items-center gap-1'>
          <button
            onClick={() => setIsMaximized(prev => !prev)}
            className='hidden lg:block hover:bg-[#14758c] p-2.5 rounded transition'
            title={isMaximized ? 'Minimize' : 'Maximize'}
          >
            {isMaximized ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
          <button
            onClick={() => {
              onClose();
              onSelectedSearchWODChange(null);
              onSearchQueryChange('');
              onSelectedMovementsChange([]);
              onSelectedWorkoutTypesChange([]);
              onSelectedTracksChange([]);
              onSelectedSessionTypesChange([]);
              onIncludedSectionTypesChange([]);
              onSelectedSectionTypeFilterChange([]);
              setSidebarOpen(false);
              setIsMaximized(false);
              // Note: movements map should be reset in parent component
            }}
            className='hover:bg-[#14758c] p-2.5 rounded transition'
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className='flex-1 flex overflow-hidden relative'>
        {/* LEFT SIDEBAR - Filters */}
        <div className={`${
          sidebarOpen ? 'absolute inset-0 z-10' : 'hidden'
        } lg:relative lg:block w-full lg:w-[240px] border-r overflow-y-auto bg-gray-50`}>
          {/* Mobile Header */}
          <div className='lg:hidden flex justify-between items-center p-3 border-b bg-[#178da6] text-white sticky top-0 z-10'>
            <h3 className='font-semibold'>Filters</h3>
            <button
              onClick={() => setSidebarOpen(false)}
              className='hover:bg-[#14758c] p-3 rounded transition'
            >
              <X size={20} />
            </button>
          </div>

          {/* Movements Section */}
          <details className='border-b'>
            <summary className='px-3 py-2 font-semibold text-sm text-gray-900 cursor-pointer hover:bg-gray-100 flex items-center justify-between'>
              <span>Movements</span>
            </summary>
            <div className='px-2 py-2 space-y-1'>
              {Array.from(movements.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([movement, count]) => (
                  <button
                    key={movement}
                    onClick={() => {
                      onSelectedMovementsChange(
                        selectedMovements.includes(movement)
                          ? selectedMovements.filter(m => m !== movement)
                          : [...selectedMovements, movement]
                      );
                    }}
                    className={`w-full text-left px-2 py-1 rounded text-xs flex justify-between items-center transition ${
                      selectedMovements.includes(movement)
                        ? 'bg-[#178da6] text-white'
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
          <details className='border-b'>
            <summary className='px-3 py-2 font-semibold text-sm text-gray-900 cursor-pointer hover:bg-gray-100 flex items-center justify-between'>
              <span>Workout Types</span>
            </summary>
            <div className='px-2 py-2 space-y-1'>
              {workoutTypes.map(type => {
                const count = workoutTypeCounts[type.id] || 0;
                return (
                  <button
                    key={type.id}
                    onClick={() => {
                      onSelectedWorkoutTypesChange(
                        selectedWorkoutTypes.includes(type.id)
                          ? selectedWorkoutTypes.filter(t => t !== type.id)
                          : [...selectedWorkoutTypes, type.id]
                      );
                    }}
                    className={`w-full text-left px-2 py-1 rounded text-xs flex justify-between items-center transition ${
                      selectedWorkoutTypes.includes(type.id)
                        ? 'bg-[#178da6] text-white'
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
          <details className='border-b'>
            <summary className='px-3 py-2 font-semibold text-sm text-gray-900 cursor-pointer hover:bg-gray-100 flex items-center justify-between'>
              <span>Tracks</span>
            </summary>
            <div className='px-2 py-2 space-y-1'>
              {tracks.map(track => (
                <button
                  key={track.id}
                  onClick={() => {
                    onSelectedTracksChange(
                      selectedTracks.includes(track.id)
                        ? selectedTracks.filter(t => t !== track.id)
                        : [...selectedTracks, track.id]
                    );
                  }}
                  className={`w-full text-left px-2 py-1 rounded text-xs flex justify-between items-center transition ${
                    selectedTracks.includes(track.id)
                      ? 'bg-[#178da6] text-white'
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

          {/* Session Types Section */}
          <details className='border-b'>
            <summary className='px-3 py-2 font-semibold text-sm text-gray-900 cursor-pointer hover:bg-gray-100 flex items-center justify-between'>
              <span>Session Types</span>
            </summary>
            <div className='px-2 py-2 space-y-1'>
              {sessionTypes.map(sessionType => (
                <button
                  key={sessionType}
                  onClick={() => {
                    onSelectedSessionTypesChange(
                      selectedSessionTypes.includes(sessionType)
                        ? selectedSessionTypes.filter(t => t !== sessionType)
                        : [...selectedSessionTypes, sessionType]
                    );
                  }}
                  className={`w-full text-left px-2 py-1 rounded text-xs flex justify-between items-center transition ${
                    selectedSessionTypes.includes(sessionType)
                      ? 'bg-[#178da6] text-white'
                      : 'hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  <span className='truncate'>{sessionType}</span>
                  <span
                    className={`text-xs ml-1 ${selectedSessionTypes.includes(sessionType) ? 'opacity-75' : 'text-gray-500'}`}
                  >
                    {sessionTypeCounts[sessionType] || 0}
                  </span>
                </button>
              ))}
              {sessionTypes.length === 0 && (
                <p className='text-xs text-gray-500 px-2 py-1'>No session types found</p>
              )}
            </div>
          </details>

          {/* Section Types Filter */}
          <details className='border-b'>
            <summary className='px-3 py-2 font-semibold text-sm text-gray-900 cursor-pointer hover:bg-gray-100 flex items-center justify-between'>
              <span>Section Types{selectedSectionTypeFilter.length > 0 && <span className='ml-1 text-xs text-gray-500'>({selectedSectionTypeFilter.length})</span>}</span>
              {selectedSectionTypeFilter.length > 0 && (
                <button
                  onClick={e => { e.preventDefault(); onSelectedSectionTypeFilterChange([]); }}
                  className='text-[10px] text-gray-400 hover:text-red-500 px-1'
                  title='Clear section types'
                >
                  clear
                </button>
              )}
            </summary>
            <div className='px-2 py-2 space-y-1'>
              {sectionTypes
                .filter(st => (sectionTypeCounts[st.name] || 0) > 0)
                .map(st => (
                <button
                  key={st.id}
                  onClick={() => {
                    onSelectedSectionTypeFilterChange(
                      selectedSectionTypeFilter.includes(st.name)
                        ? selectedSectionTypeFilter.filter(t => t !== st.name)
                        : [...selectedSectionTypeFilter, st.name]
                    );
                  }}
                  className={`w-full text-left px-2 py-1 rounded text-xs flex justify-between items-center transition ${
                    selectedSectionTypeFilter.includes(st.name)
                      ? 'bg-[#178da6] text-white'
                      : 'hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  <span className='truncate'>{st.name}</span>
                  <span
                    className={`text-xs ml-1 ${selectedSectionTypeFilter.includes(st.name) ? 'opacity-75' : 'text-gray-500'}`}
                  >
                    {sectionTypeCounts[st.name] || 0}
                  </span>
                </button>
              ))}
              {sectionTypes.length === 0 && (
                <p className='text-xs text-gray-500 px-2 py-1'>No section types found</p>
              )}
            </div>
          </details>

          {/* Athletes Section */}
          <details className='border-b'>
            <summary className='px-3 py-2 font-semibold text-sm text-gray-900 cursor-pointer hover:bg-gray-100 flex items-center justify-between'>
              <span>Athletes{selectedMembers.length > 0 && <span className='ml-1 text-xs text-gray-500'>({selectedMembers.length})</span>}</span>
              {selectedMembers.length > 0 && (
                <button
                  onClick={e => { e.preventDefault(); onSelectedMembersChange([]); }}
                  className='text-[10px] text-gray-400 hover:text-red-500 px-1'
                  title='Clear athletes'
                >
                  clear
                </button>
              )}
            </summary>
            <div className='px-2 py-2 space-y-1'>
              {adultMembers.map(member => (
                <button
                  key={member.id}
                  onClick={() => {
                    onSelectedMembersChange(
                      selectedMembers.includes(member.id)
                        ? selectedMembers.filter(m => m !== member.id)
                        : [...selectedMembers, member.id]
                    );
                  }}
                  className={`w-full text-left px-2 py-1 rounded text-xs flex justify-between items-center transition ${
                    selectedMembers.includes(member.id)
                      ? 'bg-[#178da6] text-white'
                      : 'hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  <span className='truncate'>{member.name}</span>
                  <span
                    className={`text-xs ml-1 ${selectedMembers.includes(member.id) ? 'opacity-75' : 'text-gray-500'}`}
                  >
                    {member.booking_count}
                  </span>
                </button>
              ))}
              {adultMembers.length === 0 && (
                <p className='text-xs text-gray-500 px-2 py-1'>No members found</p>
              )}
            </div>
          </details>

          {/* Kids Section (<16) */}
          {kidMembers.length > 0 && (
            <details className='border-b'>
              <summary className='px-3 py-2 font-semibold text-sm text-gray-900 cursor-pointer hover:bg-gray-100 flex items-center justify-between'>
                <span>Kids{kidMembers.some(m => selectedMembers.includes(m.id)) && <span className='ml-1 text-xs text-gray-500'>({kidMembers.filter(m => selectedMembers.includes(m.id)).length})</span>}</span>
                {kidMembers.some(m => selectedMembers.includes(m.id)) && (
                  <button
                    onClick={e => {
                      e.preventDefault();
                      const kidIds = new Set(kidMembers.map(m => m.id));
                      onSelectedMembersChange(selectedMembers.filter(id => !kidIds.has(id)));
                    }}
                    className='text-[10px] text-gray-400 hover:text-red-500 px-1'
                    title='Clear kids'
                  >
                    clear
                  </button>
                )}
              </summary>
              <div className='px-2 py-2 space-y-1'>
                {kidMembers.map(member => (
                  <button
                    key={member.id}
                    onClick={() => {
                      onSelectedMembersChange(
                        selectedMembers.includes(member.id)
                          ? selectedMembers.filter(m => m !== member.id)
                          : [...selectedMembers, member.id]
                      );
                    }}
                    className={`w-full text-left px-2 py-1 rounded text-xs flex justify-between items-center transition ${
                      selectedMembers.includes(member.id)
                        ? 'bg-[#178da6] text-white'
                        : 'hover:bg-gray-200 text-gray-900'
                    }`}
                  >
                    <span className='truncate'>{member.name}</span>
                    <span
                      className={`text-xs ml-1 ${selectedMembers.includes(member.id) ? 'opacity-75' : 'text-gray-500'}`}
                    >
                      {member.booking_count}
                    </span>
                  </button>
                ))}
              </div>
            </details>
          )}

          {/* Custom Movements Section */}
          <details className='border-b'>
            <summary className='px-3 py-2 font-semibold text-sm text-gray-900 cursor-pointer hover:bg-gray-100 flex items-center justify-between'>
              <span>Custom Movements{trackedExercises.length > 0 && <span className='ml-1 text-xs text-gray-500'>({activeTrackedExercises.length}/{trackedExercises.length})</span>}</span>
              {activeTrackedExercises.length > 0 && (
                <button
                  onClick={e => { e.preventDefault(); deactivateAll(); deactivateAllGroups(); }}
                  className='text-[10px] text-gray-400 hover:text-red-500 px-1'
                  title='Deactivate all'
                >
                  clear
                </button>
              )}
            </summary>
            <div className='px-2 py-2 space-y-1'>
              {/* Search input */}
              <div ref={exerciseSearchRef} className='relative'>
                <input
                  type='text'
                  value={exerciseSearch}
                  onChange={e => {
                    setExerciseSearch(e.target.value);
                    setExerciseDropdownOpen(e.target.value.trim().length > 0);
                  }}
                  onFocus={() => {
                    if (exerciseSearch.trim()) setExerciseDropdownOpen(true);
                  }}
                  placeholder='Add exercise...'
                  className='w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 placeholder:text-gray-400 focus:ring-1 focus:ring-[#178da6] focus:border-transparent'
                />
                {exerciseDropdownOpen && filteredExercises.length > 0 && (
                  <div className='absolute top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto z-20'>
                    {filteredExercises.map(ex => (
                      <button
                        key={ex.id}
                        onClick={() => {
                          addTracked({
                            id: ex.id,
                            name: ex.name,
                            display_name: ex.display_name || undefined,
                            category: ex.category,
                          });
                          setExerciseSearch('');
                          setExerciseDropdownOpen(false);
                        }}
                        className='w-full text-left px-2 py-1 text-xs hover:bg-gray-100 text-gray-900 truncate'
                      >
                        {ex.display_name || ex.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Exercise Groups */}
              {(exerciseGroups.length > 0 || activeTrackedExercises.length > 0) && (
                <div className='space-y-1 py-1'>
                  <div className='flex flex-wrap items-center gap-1'>
                    {exerciseGroups.map(group => (
                      <div key={group.id} className='relative group/chip'>
                        <button
                          onClick={async () => {
                            const { exerciseIds, active } = await toggleGroupActive(group.id);
                            const trackedIds = new Set(trackedExercises.map(e => e.id));
                            const validIds = exerciseIds.filter(id => trackedIds.has(id));
                            if (validIds.length > 0) {
                              batchSetActive(validIds, active);
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                            group.active
                              ? 'bg-amber-200 text-amber-900 hover:bg-amber-300'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                          title={`${group.exercise_ids.filter(id => trackedExercises.some(e => e.id === id)).length} exercises — click to ${group.active ? 'deactivate' : 'activate'}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${group.active ? 'bg-amber-600' : 'bg-gray-400'}`} />
                          {group.name}
                        </button>
                        {/* Edit/delete on hover */}
                        {editingGroupId === group.id ? (
                          <div className='absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-30 p-2 min-w-[140px]'>
                            <input
                              type='text'
                              defaultValue={group.name}
                              autoFocus
                              className='w-full px-1.5 py-0.5 text-[10px] border border-gray-300 rounded mb-1'
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  const val = (e.target as HTMLInputElement).value.trim();
                                  if (val && val !== group.name) renameGroup(group.id, val);
                                  setEditingGroupId(null);
                                }
                                if (e.key === 'Escape') setEditingGroupId(null);
                              }}
                              onBlur={e => {
                                const related = e.relatedTarget as HTMLElement;
                                if (related?.closest('[data-group-menu]')) return;
                                const val = e.target.value.trim();
                                if (val && val !== group.name) renameGroup(group.id, val);
                                setEditingGroupId(null);
                              }}
                            />
                            <button
                              data-group-menu
                              onClick={() => {
                                setEditingGroupExercises(group.id);
                                setEditingGroupId(null);
                              }}
                              className='w-full text-left px-1.5 py-0.5 text-[10px] text-gray-700 hover:bg-gray-100 rounded'
                            >
                              Edit exercises
                            </button>
                            <button
                              data-group-menu
                              onClick={() => { deleteGroup(group.id); setEditingGroupId(null); }}
                              className='w-full text-left px-1.5 py-0.5 text-[10px] text-red-600 hover:bg-red-50 rounded'
                            >
                              Delete group
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={e => { e.stopPropagation(); setEditingGroupId(group.id); }}
                            className='absolute -top-1 -right-1 hidden group-hover/chip:flex w-3.5 h-3.5 items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-500'
                            title='Edit group'
                          >
                            <span className='text-[8px] leading-none'>✎</span>
                          </button>
                        )}
                      </div>
                    ))}
                    {/* Save as Group button */}
                    {activeTrackedExercises.length > 0 && !showGroupNameInput && (
                      <button
                        onClick={() => setShowGroupNameInput(true)}
                        className='inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 border border-dashed border-gray-300'
                      >
                        + Save as Group
                      </button>
                    )}
                    {showGroupNameInput && (
                      <input
                        type='text'
                        value={newGroupName}
                        onChange={e => setNewGroupName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newGroupName.trim()) {
                            createGroup(newGroupName.trim(), activeTrackedExercises.map(ex => ex.id));
                            setNewGroupName('');
                            setShowGroupNameInput(false);
                          }
                          if (e.key === 'Escape') {
                            setNewGroupName('');
                            setShowGroupNameInput(false);
                          }
                        }}
                        onBlur={() => {
                          if (newGroupName.trim()) {
                            createGroup(newGroupName.trim(), activeTrackedExercises.map(ex => ex.id));
                          }
                          setNewGroupName('');
                          setShowGroupNameInput(false);
                        }}
                        autoFocus
                        placeholder='Group name...'
                        className='px-2 py-0.5 text-[10px] border border-gray-300 rounded-full w-24 focus:ring-1 focus:ring-[#178da6] focus:border-transparent'
                      />
                    )}
                  </div>

                  {/* Active group exercise lists — nested under chips */}
                  {exerciseGroups.filter(g => g.active).map(group => {
                    const groupExercises = trackedExercises.filter(ex => group.exercise_ids.includes(ex.id));
                    if (groupExercises.length === 0) return null;
                    return (
                      <div key={group.id} className='ml-2 border-l-2 border-amber-300 pl-2 space-y-0.5'>
                        <div className='text-[9px] font-medium text-amber-700'>{group.name}</div>
                        {groupExercises.map(ex => (
                          <div key={ex.id} className='px-2 py-0.5 rounded text-xs bg-amber-50 text-gray-900 truncate'>
                            {ex.display_name || ex.name}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Edit group exercises header */}
              {editingGroupExercises && (() => {
                const editGroup = exerciseGroups.find(g => g.id === editingGroupExercises);
                if (!editGroup) return null;
                const trackedIds = new Set(trackedExercises.map(e => e.id));
                const validCount = editGroup.exercise_ids.filter(id => trackedIds.has(id)).length;
                return (
                  <div className='flex items-center justify-between px-2 py-1 bg-amber-100 rounded text-[10px] font-medium text-amber-800'>
                    <span>Editing: {editGroup.name} ({validCount})</span>
                    <button
                      onClick={() => {
                        const validIds = editGroup.exercise_ids.filter(id => trackedIds.has(id));
                        if (validIds.length !== editGroup.exercise_ids.length) {
                          updateGroupExercises(editGroup.id, validIds);
                        }
                        setEditingGroupExercises(null);
                      }}
                      className='px-1.5 py-0.5 bg-amber-200 hover:bg-amber-300 rounded text-amber-900'
                    >
                      Done
                    </button>
                  </div>
                );
              })()}

              {/* Tracked exercises list — hide exercises shown in active groups */}
              {(() => {
                const activeGroupExerciseIds = new Set(
                  exerciseGroups.filter(g => g.active).flatMap(g => g.exercise_ids)
                );
                const anyGroupActive = exerciseGroups.some(g => g.active);
                const displayExercises = editingGroupExercises
                  ? trackedExercises // Edit mode: show all
                  : trackedExercises.filter(ex => !activeGroupExerciseIds.has(ex.id));

                return displayExercises.map(ex => {
                  const editGroup = editingGroupExercises ? exerciseGroups.find(g => g.id === editingGroupExercises) : null;
                  const isInEditGroup = editGroup ? editGroup.exercise_ids.includes(ex.id) : false;

                  return (
                    <div
                      key={ex.id}
                      className={`flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer ${
                        editingGroupExercises
                          ? isInEditGroup ? 'bg-amber-100 text-gray-900' : 'bg-gray-50 text-gray-500'
                          : ex.active !== false
                            ? 'bg-amber-50 text-gray-900'
                            : 'bg-gray-100 text-gray-400 line-through'
                      }`}
                      onClick={() => {
                        if (editingGroupExercises && editGroup) {
                          const newIds = isInEditGroup
                            ? editGroup.exercise_ids.filter(id => id !== ex.id)
                            : [...editGroup.exercise_ids, ex.id];
                          updateGroupExercises(editingGroupExercises, newIds);
                        } else {
                          toggleTracked(ex.id);
                        }
                      }}
                      title={editingGroupExercises
                        ? isInEditGroup ? 'Click to remove from group' : 'Click to add to group'
                        : ex.active !== false ? 'Click to deactivate' : 'Click to activate'
                      }
                    >
                      <div className='flex items-center gap-1.5 truncate'>
                        {editingGroupExercises && (
                          <span className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 ${
                            isInEditGroup ? 'bg-amber-500 border-amber-500 text-white' : 'border-gray-300'
                          }`}>
                            {isInEditGroup && <span className='text-[8px]'>✓</span>}
                          </span>
                        )}
                        <span className='truncate'>{ex.display_name || ex.name}</span>
                      </div>
                      {!editingGroupExercises && (
                        <button
                          onClick={e => { e.stopPropagation(); removeTracked(ex.id); }}
                          className='ml-1 text-gray-400 hover:text-red-500 p-0.5 flex-shrink-0'
                          title='Remove permanently'
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  );
                });
              })()}
              {trackedExercises.length === 0 && (
                <p className='text-xs text-gray-500 px-2 py-1'>Search to add movements</p>
              )}
            </div>
          </details>
        </div>

        {/* RIGHT SIDE - Search and Results */}
        <div className='flex-1 flex flex-col overflow-hidden'>
          {/* Search Bar */}
          <div className='p-2 sm:p-3 lg:p-4 border-b'>
            <div className='relative'>
              <Search className='absolute left-2 sm:left-3 top-2 sm:top-3 text-gray-400' size={16} />
              <input
                type='text'
                value={searchQuery}
                onChange={e => onSearchQueryChange(e.target.value)}
                placeholder='Search workout history...'
                maxLength={200}
                autoComplete='off'
                readOnly
                onFocus={e => e.currentTarget.removeAttribute('readonly')}
                className='w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#178da6] focus:border-transparent'
              />
            </div>

            {/* Section Type Filter Buttons */}
            <div className='mt-2 sm:mt-3'>
              <div className='text-[10px] sm:text-xs font-semibold text-gray-700 mb-1 sm:mb-2'>Include in search:</div>
              <div className='flex flex-wrap gap-1 sm:gap-2'>
                <button
                  onClick={() => {
                    onIncludedSectionTypesChange([]);
                  }}
                  className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium transition ${
                    includedSectionTypes.length === 0
                      ? 'bg-[#178da6] text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => {
                    onIncludedSectionTypesChange(
                      includedSectionTypes.includes('Notes')
                        ? includedSectionTypes.filter((t: string) => t !== 'Notes')
                        : [...includedSectionTypes, 'Notes']
                    );
                  }}
                  className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium transition ${
                    includedSectionTypes.includes('Notes')
                      ? 'bg-[#178da6] text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Notes
                </button>
                <button
                  onClick={() => {
                    onIncludedSectionTypesChange(
                      includedSectionTypes.includes('Workout Name')
                        ? includedSectionTypes.filter((t: string) => t !== 'Workout Name')
                        : [...includedSectionTypes, 'Workout Name']
                    );
                  }}
                  className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium transition ${
                    includedSectionTypes.includes('Workout Name')
                      ? 'bg-[#178da6] text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Workout Name
                </button>
                {(() => {
                  const nonWodSections = sectionTypes.filter(st => st.name !== 'WOD' && !st.name.startsWith('WOD Pt.') && st.name.toLowerCase() !== 'wod movements');
                  const finalPrepIndex = nonWodSections.findIndex(st => st.name === 'Final prep/Info' || st.name === 'WOD Final Prep & Info');
                  const sectionsBeforeFinalPrep = finalPrepIndex >= 0 ? nonWodSections.slice(0, finalPrepIndex + 1) : nonWodSections;
                  const sectionsAfterFinalPrep = finalPrepIndex >= 0 ? nonWodSections.slice(finalPrepIndex + 1) : [];

                  return (
                    <>
                      {/* Section types up to and including Final prep/Info */}
                      {sectionsBeforeFinalPrep.map(sectionType => (
                        <button
                          key={sectionType.id}
                          onClick={() => {
                            onIncludedSectionTypesChange(
                              includedSectionTypes.includes(sectionType.name)
                                ? includedSectionTypes.filter((t: string) => t !== sectionType.name)
                                : [...includedSectionTypes, sectionType.name]
                            );
                          }}
                          className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium transition ${
                            includedSectionTypes.includes(sectionType.name)
                              ? 'bg-[#178da6] text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {sectionType.name}
                        </button>
                      ))}

                      {/* WOD (All Parts) Button - immediately after Final prep/Info */}
                      {(() => {
                        const wodSections = sectionTypes.filter(st =>
                          st.name === 'WOD' || st.name.startsWith('WOD Pt.') || st.name.toLowerCase() === 'wod movements'
                        );
                        const allWodSelected = wodSections.every(st => includedSectionTypes.includes(st.name));
                        const someWodSelected = wodSections.some(st => includedSectionTypes.includes(st.name));

                        return wodSections.length > 0 ? (
                          <button
                            onClick={() => {
                              const wodSectionNames = wodSections.map(st => st.name);
                              if (allWodSelected) {
                                // Remove all WOD sections
                                onIncludedSectionTypesChange(
                                  includedSectionTypes.filter((t: string) => !wodSectionNames.includes(t))
                                );
                              } else {
                                // Add all WOD sections
                                const newTypes = [...includedSectionTypes];
                                wodSectionNames.forEach(name => {
                                  if (!newTypes.includes(name)) {
                                    newTypes.push(name);
                                  }
                                });
                                onIncludedSectionTypesChange(newTypes);
                              }
                            }}
                            className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium transition ${
                              allWodSelected
                                ? 'bg-[#178da6] text-white'
                                : someWodSelected
                                ? 'bg-[#178da6] bg-opacity-50 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            WOD (All Parts)
                          </button>
                        ) : null;
                      })()}

                      {/* Remaining section types after Final prep/Info */}
                      {sectionsAfterFinalPrep.map(sectionType => (
                        <button
                          key={sectionType.id}
                          onClick={() => {
                            onIncludedSectionTypesChange(
                              includedSectionTypes.includes(sectionType.name)
                                ? includedSectionTypes.filter((t: string) => t !== sectionType.name)
                                : [...includedSectionTypes, sectionType.name]
                            );
                          }}
                          className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium transition ${
                            includedSectionTypes.includes(sectionType.name)
                              ? 'bg-[#178da6] text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {sectionType.name}
                        </button>
                      ))}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Active Filter Chips */}
            {(searchQuery ||
              selectedMovements.length > 0 ||
              selectedWorkoutTypes.length > 0 ||
              selectedTracks.length > 0 ||
              selectedSessionTypes.length > 0 ||
              selectedSectionTypeFilter.length > 0 ||
              selectedMembers.length > 0) && (
              <div className='flex flex-wrap gap-1 sm:gap-2 mt-2 sm:mt-3'>
                {searchQuery && (
                  <span className='inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-[#178da6] text-white text-[10px] sm:text-xs rounded-full'>
                    Search: &quot;{searchQuery}&quot;
                    <button
                      onClick={() => onSearchQueryChange('')}
                      className='hover:bg-[#14758c] rounded-full p-1.5'
                    >
                      <X size={12} className='sm:hidden' />
                      <X size={14} className='hidden sm:block' />
                    </button>
                  </span>
                )}
                {selectedMovements.map(movement => (
                  <span
                    key={movement}
                    className='inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-[#178da6] text-white text-[10px] sm:text-xs rounded-full'
                  >
                    {movement}
                    <button
                      onClick={() =>
                        onSelectedMovementsChange(
                          selectedMovements.filter(m => m !== movement)
                        )
                      }
                      className='hover:bg-[#14758c] rounded-full p-1.5'
                    >
                      <X size={12} className='sm:hidden' />
                      <X size={14} className='hidden sm:block' />
                    </button>
                  </span>
                ))}
                {selectedWorkoutTypes.map(typeId => {
                  const type = workoutTypes.find(t => t.id === typeId);
                  return type ? (
                    <span
                      key={typeId}
                      className='inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-[#178da6] text-white text-[10px] sm:text-xs rounded-full'
                    >
                      {type.name}
                      <button
                        onClick={() =>
                          onSelectedWorkoutTypesChange(
                            selectedWorkoutTypes.filter(t => t !== typeId)
                          )
                        }
                        className='hover:bg-[#14758c] rounded-full p-0.5'
                      >
                        <X size={10} className='sm:hidden' />
                        <X size={12} className='hidden sm:block' />
                      </button>
                    </span>
                  ) : null;
                })}
                {selectedTracks.map(trackId => {
                  const track = tracks.find(t => t.id === trackId);
                  return track ? (
                    <span
                      key={trackId}
                      className='inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-[#178da6] text-white text-[10px] sm:text-xs rounded-full'
                    >
                      {track.name}
                      <button
                        onClick={() =>
                          onSelectedTracksChange(
                            selectedTracks.filter(t => t !== trackId)
                          )
                        }
                        className='hover:bg-[#14758c] rounded-full p-0.5'
                      >
                        <X size={10} className='sm:hidden' />
                        <X size={12} className='hidden sm:block' />
                      </button>
                    </span>
                  ) : null;
                })}
                {selectedSessionTypes.map(sessionType => (
                  <span
                    key={sessionType}
                    className='inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-[#178da6] text-white text-[10px] sm:text-xs rounded-full'
                  >
                    {sessionType}
                    <button
                      onClick={() =>
                        onSelectedSessionTypesChange(
                          selectedSessionTypes.filter(t => t !== sessionType)
                        )
                      }
                      className='hover:bg-[#14758c] rounded-full p-1.5'
                    >
                      <X size={12} className='sm:hidden' />
                      <X size={14} className='hidden sm:block' />
                    </button>
                  </span>
                ))}
                {selectedSectionTypeFilter.map(sectionType => (
                  <span
                    key={sectionType}
                    className='inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-[#178da6] text-white text-[10px] sm:text-xs rounded-full'
                  >
                    {sectionType}
                    <button
                      onClick={() =>
                        onSelectedSectionTypeFilterChange(
                          selectedSectionTypeFilter.filter(t => t !== sectionType)
                        )
                      }
                      className='hover:bg-[#14758c] rounded-full p-1.5'
                    >
                      <X size={12} className='sm:hidden' />
                      <X size={14} className='hidden sm:block' />
                    </button>
                  </span>
                ))}
                {selectedMembers.map(memberId => {
                  const member = members.find(m => m.id === memberId);
                  return member ? (
                    <span
                      key={memberId}
                      className='inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-[#178da6] text-white text-[10px] sm:text-xs rounded-full'
                    >
                      {member.name}
                      <button
                        onClick={() =>
                          onSelectedMembersChange(
                            selectedMembers.filter(m => m !== memberId)
                          )
                        }
                        className='hover:bg-[#14758c] rounded-full p-1.5'
                      >
                        <X size={12} className='sm:hidden' />
                        <X size={14} className='hidden sm:block' />
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* Content area: Results + optional Tracking Panel */}
          <div className='flex-1 flex overflow-hidden'>

          {/* Mobile: Movement Tracking Panel (replaces results when open) */}
          {mobileTrackingOpen && activeTrackedExercises.length > 0 && (
            <div className='lg:hidden flex-1 overflow-auto'>
              <MovementTrackingPanel
                trackedExercises={activeTrackedExercises}
                trackingData={trackingData}
                lastPerformedData={lastPerformedData}
                globalLastProgrammed={globalLastProgrammed}
                loading={trackingLoading}
                selectedMembers={selectedMembers}
                members={members}
              />
            </div>
          )}

          {/* Left column: Results / Detail */}
          <div className={`flex flex-col overflow-y-auto overscroll-contain ${mobileTrackingOpen ? 'hidden lg:flex' : ''} ${activeTrackedExercises.length > 0 && isMaximized ? 'lg:w-1/3 w-full' : 'w-full'}`}>

          {/* Search Results */}
          {!selectedSearchWOD &&
            (searchQuery ||
              selectedMovements.length > 0 ||
              selectedWorkoutTypes.length > 0 ||
              selectedTracks.length > 0 ||
              selectedSessionTypes.length > 0 ||
              selectedSectionTypeFilter.length > 0 ||
              selectedMembers.length > 0) && (
              <div className='flex-1 overflow-y-auto overscroll-contain p-2 sm:p-3 pr-5 sm:pr-8'>
                <div className='flex items-center gap-2 mb-2 sm:mb-3'>
                  <h3 className='font-semibold text-sm sm:text-base text-gray-900'>
                    Results ({displayedResults.length})
                  </h3>
                  <button
                    onClick={() => setShowUnique(prev => !prev)}
                    className={`text-[10px] px-1.5 py-0.5 rounded border transition ${
                      showUnique
                        ? 'bg-[#178da6] text-white border-[#178da6]'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                    }`}
                    title={showUnique ? 'Showing unique workouts (by name). Click for all sessions.' : 'Showing all sessions. Click for unique workouts.'}
                  >
                    {showUnique ? 'Unique' : 'All'}
                  </button>
                </div>
                <div className='space-y-2 sm:space-y-3 relative'>
                  {displayedResults.map(wod => {
                    // Helper to generate preview text from structured data
                    const getPreviewText = (section: WODSection): string => {
                      const parts: string[] = [];

                      // Add lifts with full details (sets, reps, percentage)
                      if (section.lifts && section.lifts.length > 0) {
                        section.lifts.forEach((lift: ConfiguredLift) => {
                          parts.push(formatLift(lift));
                        });
                      }

                      // Add benchmarks with name and description
                      if (section.benchmarks && section.benchmarks.length > 0) {
                        section.benchmarks.forEach((benchmark: ConfiguredBenchmark) => {
                          const { name, description } = formatBenchmark(benchmark);
                          parts.push(description ? `${name} - ${description}` : name);
                        });
                      }

                      // Add forge benchmarks with name and description
                      if (section.forge_benchmarks && section.forge_benchmarks.length > 0) {
                        section.forge_benchmarks.forEach((forge: ConfiguredForgeBenchmark) => {
                          const { name, description } = formatForgeBenchmark(forge);
                          parts.push(description ? `${name} - ${description}` : name);
                        });
                      }

                      // Add text content
                      if (section.content && section.content.trim()) {
                        parts.push(section.content);
                      }

                      return parts.join(' • ');
                    };

                    // Show first section with content OR structured data
                    const previewSection = wod.sections.find(s => {
                      const hasContent = s.content && s.content.trim().length > 0;
                      const hasLifts = s.lifts && s.lifts.length > 0;
                      const hasBenchmarks = s.benchmarks && s.benchmarks.length > 0;
                      const hasForgeBenchmarks = s.forge_benchmarks && s.forge_benchmarks.length > 0;
                      return hasContent || hasLifts || hasBenchmarks || hasForgeBenchmarks;
                    });
                    const previewText = previewSection ? getPreviewText(previewSection) : '';
                    const wodDate = new Date(wod.date);
                    const formattedDate = wodDate.toLocaleDateString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    });
                    const formattedTime = wod.time ? wod.time.substring(0, 5) : '';
                    const searchTerms = searchQuery.trim() ? [searchQuery.trim()] : [];
                    const trackName = wod.track_id ? tracks.find(t => t.id === wod.track_id)?.name : null;

                    return (
                      <div
                        key={wod.id}
                        draggable
                        onDragStart={e => onDragStart(e, wod, wod.date)}
                        onClick={() => onSelectedSearchWODChange(wod)}
                        onMouseEnter={() => onHoveredWODChange(wod)}
                        onMouseLeave={() => onHoveredWODChange(null)}
                        className={`p-1.5 sm:p-2 bg-white rounded-lg cursor-pointer transition relative min-h-[50px] sm:min-h-[60px] w-full ${
                          hoveredWOD?.id === wod.id
                            ? 'border-0'
                            : 'border border-gray-200 hover:border-[#178da6] hover:bg-gray-50'
                        }`}
                      >
                        {/* Coach Notes indicator */}
                        {wod.coach_notes && wod.coach_notes.trim() && (
                          <span
                            className='absolute top-2 right-2 text-[10px] font-semibold bg-teal-50 text-teal-700 rounded px-1 py-0.5'
                            title='Has coach notes'
                          >
                            N
                          </span>
                        )}
                        <div className='text-[10px] sm:text-xs text-gray-500 mb-1'>
                          {formattedDate}{formattedTime && ` at ${formattedTime}`}
                        </div>
                        {wod.workout_name && (
                          <div className='text-xs sm:text-sm font-bold text-gray-700 mb-1'>
                            {wod.workout_name}
                          </div>
                        )}
                        <div
                          className='font-semibold text-[10px] sm:text-xs text-gray-900 mb-1 sm:mb-2'
                          dangerouslySetInnerHTML={{
                            __html: highlightText(wod.title + (trackName ? ` — ${trackName}` : ''), searchTerms),
                          }}
                        />
                        {previewSection && previewText && (
                          <>
                            <div className='text-[10px] sm:text-xs font-medium text-[#178da6] mb-0.5'>
                              {previewSection.type}
                            </div>
                            <div
                              className='text-[10px] sm:text-xs text-gray-700 whitespace-pre-wrap line-clamp-2 sm:line-clamp-3'
                              dangerouslySetInnerHTML={{
                                __html: highlightText(previewText, searchTerms),
                              }}
                            />
                          </>
                        )}

                        {/* Hover Popover - Full WOD Preview (Desktop Only) */}
                        {hoveredWOD?.id === wod.id && (
                          <div className='hidden lg:block absolute inset-0 bg-white border-2 border-[#178da6] rounded-lg shadow-2xl p-4 z-[200] overflow-y-auto'>
                            {wod.workout_name && (
                              <div className='text-sm font-bold text-gray-700 mb-1'>
                                {wod.workout_name}
                              </div>
                            )}
                            <div className='text-xs font-medium text-gray-900 mb-3'>{wod.title}{trackName && ` — ${trackName}`}</div>
                            <div className='space-y-3'>
                              {wod.sections.map((section, idx) => (
                                <div key={idx} className='border-b border-gray-200 pb-2 last:border-b-0'>
                                  <div className='text-xs font-semibold text-[#178da6] mb-1'>
                                    {section.type}
                                    {section.duration > 0 && ` (${section.duration} min)`}
                                  </div>
                                  <div className='text-xs text-gray-700'>
                                    {renderSectionContent(section)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {displayedResults.length === 0 && (
                    <p className='text-xs sm:text-sm text-gray-500'>No results found</p>
                  )}
                </div>
              </div>
            )}

          {/* WOD Detail View */}
          {selectedSearchWOD && (
            <div className='flex-1 overflow-y-auto p-2 sm:p-3 lg:p-4'>
              <button
                onClick={() => onSelectedSearchWODChange(null)}
                className='text-xs sm:text-sm text-[#178da6] hover:text-[#14758c] mb-2 sm:mb-4 flex items-center gap-1'
              >
                ← Back to results
              </button>

              {/* Draggable Entire WOD */}
              <div
                className='hover:bg-gray-50 p-1 sm:p-2 rounded-lg transition'
                id={`wod-${selectedSearchWOD.id}`}
              >
                <div className='space-y-2 sm:space-y-4'>
                  <div className='flex items-start gap-1 sm:gap-2'>
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
                        onDragStart(e, selectedSearchWOD, selectedSearchWOD.date);
                      }}
                      className='cursor-move hidden sm:block'
                    >
                      <GripVertical size={20} className='text-gray-400 mt-1 flex-shrink-0' />
                    </div>
                    <div className='flex-1'>
                      {selectedSearchWOD.workout_name && (
                        <div className='font-bold text-base sm:text-lg text-gray-700 mb-1'>
                          {selectedSearchWOD.workout_name}
                        </div>
                      )}
                      <h3 className='font-medium text-xs sm:text-sm text-gray-900 mb-1'>
                        {selectedSearchWOD.title}{selectedSearchWOD.track_id && tracks.find(t => t.id === selectedSearchWOD.track_id)?.name && ` — ${tracks.find(t => t.id === selectedSearchWOD.track_id)?.name}`}
                      </h3>
                      <p className='text-[10px] sm:text-xs text-gray-600'>
                        {new Date(selectedSearchWOD.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Sections with individual drag handles */}
                  <div className='space-y-2 sm:space-y-3'>
                    {selectedSearchWOD.sections.map((section, idx) => (
                      <div
                        key={idx}
                        id={`section-${selectedSearchWOD.id}-${idx}`}
                        className='bg-white rounded-lg border border-gray-200 p-2 sm:p-3 hover:border-[#178da6] transition flex gap-1 sm:gap-2'
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
                            onSectionDragStart(e, {
                              type: section.type,
                              duration: String(section.duration),
                              content: section.content,
                              lifts: section.lifts,
                              benchmarks: section.benchmarks,
                              forge_benchmarks: section.forge_benchmarks,
                            });
                          }}
                          className='cursor-move hidden sm:block'
                        >
                          <GripVertical
                            size={16}
                            className='text-gray-400 flex-shrink-0 mt-1'
                          />
                        </div>
                        <div className='flex-1'>
                          <div className='font-semibold text-xs sm:text-sm text-gray-900 mb-0.5 sm:mb-1'>
                            {section.type}
                          </div>
                          <div className='text-[10px] sm:text-xs text-gray-500 mb-1 sm:mb-2'>
                            {section.duration} min
                          </div>
                          <div className='text-xs sm:text-sm text-gray-700'>
                            {renderSectionContent(section)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Coach Notes */}
                  {selectedSearchWOD.coach_notes && (
                    <div className='bg-teal-50 rounded-lg border border-gray-200 p-2 sm:p-3'>
                      <div className='font-semibold text-xs sm:text-sm text-gray-900 mb-0.5 sm:mb-1'>
                        Coach Notes
                      </div>
                      <div className='text-xs sm:text-sm text-gray-700 prose prose-sm max-w-none'>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkBreaks]}
                          rehypePlugins={[rehypeRaw]}
                          components={{
                            a: ({ node, ...props }) => (
                              <a
                                {...props}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                              />
                            ),
                            p: ({ node, ...props }) => <p {...props} className="mb-2" />,
                            ul: ({ node, ...props }) => <ul {...props} className="list-disc ml-4 mb-2" />,
                            ol: ({ node, ...props }) => <ol {...props} className="list-decimal ml-4 mb-2" />,
                            li: ({ node, ...props }) => <li {...props} className="mb-1" />,
                            h1: ({ node, ...props }) => <h1 {...props} className="text-lg font-bold mb-2 mt-3" />,
                            h2: ({ node, ...props }) => <h2 {...props} className="text-base font-bold mb-2 mt-2" />,
                            h3: ({ node, ...props }) => <h3 {...props} className="text-sm font-bold mb-1 mt-2" />,
                            strong: ({ node, ...props }) => <strong {...props} className="font-bold" />,
                            em: ({ node, ...props }) => <em {...props} className="italic" />,
                          }}
                        >
                          {selectedSearchWOD.coach_notes}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className='flex gap-2 pt-2 sm:pt-4'>
                <button
                  onClick={() => {
                    onEditWOD(selectedSearchWOD);
                    onClose();
                    onSelectedSearchWODChange(null);
                  }}
                  className='flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base bg-[#178da6] hover:bg-[#14758c] text-white rounded-lg font-medium transition'
                >
                  Edit WOD
                </button>
              </div>
            </div>
          )}
          </div>{/* End left column */}

          {/* Right column: Movement Tracking Panel (maximized + desktop only) */}
          {activeTrackedExercises.length > 0 && isMaximized && (
            <div className='hidden lg:flex lg:w-2/3 border-l overflow-hidden'>
              <div className='w-full'>
                <MovementTrackingPanel
                  trackedExercises={activeTrackedExercises}
                  trackingData={trackingData}
                  lastPerformedData={lastPerformedData}
                  globalLastProgrammed={globalLastProgrammed}
                  loading={trackingLoading}
                  selectedMembers={selectedMembers}
                  members={members}
                />
              </div>
            </div>
          )}
          </div>{/* End content area */}

        </div>
      </div>

      {/* Footer */}
      <div className='border-t p-2 sm:p-3 lg:p-4 flex-shrink-0'>
        <div className='flex gap-2 justify-center'>
          {activeTrackedExercises.length > 0 && (
            <button
              onClick={() => setMobileTrackingOpen(prev => !prev)}
              className={`lg:hidden flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition ${
                mobileTrackingOpen
                  ? 'bg-[#178da6] text-white hover:bg-[#14758c]'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <span>Tracking</span>
              {mobileTrackingOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
          <button
            onClick={() => {
              onCreateWorkout(new Date(), true);
              onSelectedSearchWODChange(null);
            }}
            className='px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base bg-[#178da6] hover:bg-[#14758c] text-white rounded-lg font-medium transition'
          >
            + Create Workout
          </button>
        </div>
      </div>
    </div>
  );
}
