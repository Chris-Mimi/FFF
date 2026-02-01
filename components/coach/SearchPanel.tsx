'use client';

import { WODFormData } from './WorkoutModal';
import { GripVertical, Search, X, Menu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import remarkBreaks from 'remark-breaks';
import { useState } from 'react';

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
  trackCounts: Record<string, number>;
  workoutTypeCounts: Record<string, number>;
  sessionTypeCounts: Record<string, number>;
  selectedSearchWOD: WODFormData | null;
  onSelectedSearchWODChange: (wod: WODFormData | null) => void;
  hoveredWOD: WODFormData | null;
  onHoveredWODChange: (wod: WODFormData | null) => void;
  onDragStart: (e: React.DragEvent, wod: WODFormData, sourceDate: string) => void;
  onSectionDragStart: (
    e: React.DragEvent,
    section: { type: string; duration: string; content: string }
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
  trackCounts,
  workoutTypeCounts,
  sessionTypeCounts,
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

  if (!isOpen) return null;

  return (
    <div className='fixed right-0 top-0 lg:top-[72px] h-screen lg:h-[calc(100vh-72px)] w-full lg:w-[800px] bg-white shadow-2xl z-50 flex flex-col border-l-2 border-[#208479] border-t border-gray-400 animate-slide-in-right'>
      {/* Header */}
      <div className='bg-[#208479] text-white p-3 lg:p-4 flex justify-between items-center'>
        <div className='flex items-center gap-2'>
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className='lg:hidden hover:bg-[#1a6b62] p-1 rounded transition'
            title='Toggle Filters'
          >
            <Menu size={20} />
          </button>
          <h2 className='text-base sm:text-lg lg:text-xl font-bold'>Workout Library</h2>
        </div>
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
            setSidebarOpen(false);
            // Note: movements map should be reset in parent component
          }}
          className='hover:bg-[#1a6b62] p-1 rounded transition'
        >
          <X size={24} />
        </button>
      </div>

      {/* Two-Column Layout */}
      <div className='flex-1 flex overflow-hidden relative'>
        {/* LEFT SIDEBAR - Filters */}
        <div className={`${
          sidebarOpen ? 'absolute inset-0 z-10' : 'hidden'
        } lg:relative lg:block w-full lg:w-[200px] border-r overflow-y-auto bg-gray-50`}>
          {/* Mobile Header */}
          <div className='lg:hidden flex justify-between items-center p-3 border-b bg-[#208479] text-white sticky top-0 z-10'>
            <h3 className='font-semibold'>Filters</h3>
            <button
              onClick={() => setSidebarOpen(false)}
              className='hover:bg-[#1a6b62] p-1 rounded transition'
            >
              <X size={20} />
            </button>
          </div>

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
                      onSelectedMovementsChange(
                        selectedMovements.includes(movement)
                          ? selectedMovements.filter(m => m !== movement)
                          : [...selectedMovements, movement]
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
                    onSelectedTracksChange(
                      selectedTracks.includes(track.id)
                        ? selectedTracks.filter(t => t !== track.id)
                        : [...selectedTracks, track.id]
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

          {/* Session Types Section */}
          <details className='border-b' open>
            <summary className='px-3 py-2 font-semibold text-sm text-gray-900 cursor-pointer hover:bg-gray-100'>
              Session Types
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
                      ? 'bg-[#208479] text-white'
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
                autoComplete='off'
                readOnly
                onFocus={e => e.currentTarget.removeAttribute('readonly')}
                className='w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#208479] focus:border-transparent'
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
                      ? 'bg-[#208479] text-white'
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
                      ? 'bg-[#208479] text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Notes
                </button>
                {(() => {
                  const nonWodSections = sectionTypes.filter(st => st.name !== 'WOD' && !st.name.startsWith('WOD Pt.'));
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
                              ? 'bg-[#208479] text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {sectionType.name}
                        </button>
                      ))}

                      {/* WOD (All Parts) Button - immediately after Final prep/Info */}
                      {(() => {
                        const wodSections = sectionTypes.filter(st =>
                          st.name === 'WOD' || st.name.startsWith('WOD Pt.')
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
                                ? 'bg-[#208479] text-white'
                                : someWodSelected
                                ? 'bg-[#208479] bg-opacity-50 text-white'
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
                              ? 'bg-[#208479] text-white'
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
              selectedSessionTypes.length > 0) && (
              <div className='flex flex-wrap gap-1 sm:gap-2 mt-2 sm:mt-3'>
                {searchQuery && (
                  <span className='inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-[#208479] text-white text-[10px] sm:text-xs rounded-full'>
                    Search: &quot;{searchQuery}&quot;
                    <button
                      onClick={() => onSearchQueryChange('')}
                      className='hover:bg-[#1a6b62] rounded-full p-0.5'
                    >
                      <X size={10} className='sm:hidden' />
                      <X size={12} className='hidden sm:block' />
                    </button>
                  </span>
                )}
                {selectedMovements.map(movement => (
                  <span
                    key={movement}
                    className='inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-[#208479] text-white text-[10px] sm:text-xs rounded-full'
                  >
                    {movement}
                    <button
                      onClick={() =>
                        onSelectedMovementsChange(
                          selectedMovements.filter(m => m !== movement)
                        )
                      }
                      className='hover:bg-[#1a6b62] rounded-full p-0.5'
                    >
                      <X size={10} className='sm:hidden' />
                      <X size={12} className='hidden sm:block' />
                    </button>
                  </span>
                ))}
                {selectedWorkoutTypes.map(typeId => {
                  const type = workoutTypes.find(t => t.id === typeId);
                  return type ? (
                    <span
                      key={typeId}
                      className='inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-[#208479] text-white text-[10px] sm:text-xs rounded-full'
                    >
                      {type.name}
                      <button
                        onClick={() =>
                          onSelectedWorkoutTypesChange(
                            selectedWorkoutTypes.filter(t => t !== typeId)
                          )
                        }
                        className='hover:bg-[#1a6b62] rounded-full p-0.5'
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
                      className='inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-[#208479] text-white text-[10px] sm:text-xs rounded-full'
                    >
                      {track.name}
                      <button
                        onClick={() =>
                          onSelectedTracksChange(
                            selectedTracks.filter(t => t !== trackId)
                          )
                        }
                        className='hover:bg-[#1a6b62] rounded-full p-0.5'
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
                    className='inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-[#208479] text-white text-[10px] sm:text-xs rounded-full'
                  >
                    {sessionType}
                    <button
                      onClick={() =>
                        onSelectedSessionTypesChange(
                          selectedSessionTypes.filter(t => t !== sessionType)
                        )
                      }
                      className='hover:bg-[#1a6b62] rounded-full p-0.5'
                    >
                      <X size={10} className='sm:hidden' />
                      <X size={12} className='hidden sm:block' />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Search Results */}
          {!selectedSearchWOD &&
            (searchQuery ||
              selectedMovements.length > 0 ||
              selectedWorkoutTypes.length > 0 ||
              selectedTracks.length > 0 ||
              selectedSessionTypes.length > 0) && (
              <div className='flex-1 overflow-y-auto p-2 sm:p-4'>
                <h3 className='font-semibold text-sm sm:text-base text-gray-900 mb-2 sm:mb-3'>
                  Results ({searchResults.length})
                </h3>
                <div className='space-y-2 sm:space-y-3 relative'>
                  {searchResults.map(wod => {
                    // Helper to generate preview text from structured data
                    const getPreviewText = (section: any): string => {
                      const parts: string[] = [];

                      // Add lifts
                      if (section.lifts && section.lifts.length > 0) {
                        section.lifts.forEach((lift: any) => {
                          if (lift.name) parts.push(lift.name);
                        });
                      }

                      // Add benchmarks
                      if (section.benchmarks && section.benchmarks.length > 0) {
                        section.benchmarks.forEach((benchmark: any) => {
                          if (benchmark.name) parts.push(benchmark.name);
                          if (benchmark.description) parts.push(`(${benchmark.description})`);
                        });
                      }

                      // Add forge benchmarks
                      if (section.forge_benchmarks && section.forge_benchmarks.length > 0) {
                        section.forge_benchmarks.forEach((forge: any) => {
                          if (forge.name) parts.push(forge.name);
                          if (forge.description) parts.push(`(${forge.description})`);
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
                        className={`p-2 sm:p-3 bg-white rounded-lg cursor-pointer transition relative min-h-[60px] sm:min-h-[80px] w-full lg:w-3/4 ${
                          hoveredWOD?.id === wod.id
                            ? 'border-0'
                            : 'border border-gray-200 hover:border-[#208479] hover:bg-gray-50'
                        }`}
                      >
                        <div className='text-[10px] sm:text-xs text-gray-500 mb-1'>
                          {formattedDate}{formattedTime && ` at ${formattedTime}`}
                        </div>
                        {(wod.workout_name || trackName) && (
                          <div className='text-[10px] sm:text-xs font-medium text-gray-700 mb-1'>
                            {wod.workout_name && <span>{wod.workout_name}</span>}
                            {wod.workout_name && trackName && <span className='text-gray-400'> • </span>}
                            {trackName && <span>{trackName}</span>}
                          </div>
                        )}
                        <div
                          className='font-semibold text-xs sm:text-sm text-gray-900 mb-1 sm:mb-2'
                          dangerouslySetInnerHTML={{
                            __html: highlightText(wod.title, searchTerms),
                          }}
                        />
                        {previewSection && previewText && (
                          <>
                            <div className='text-[10px] sm:text-xs font-medium text-[#208479] mb-0.5'>
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
                          <div className='hidden lg:block absolute inset-0 bg-white border-2 border-[#208479] rounded-lg shadow-2xl p-4 z-[200] overflow-y-auto'>
                            {(wod.workout_name || trackName) && (
                              <div className='text-xs font-medium text-gray-700 mb-1'>
                                {wod.workout_name && <span>{wod.workout_name}</span>}
                                {wod.workout_name && trackName && <span className='text-gray-400'> • </span>}
                                {trackName && <span>{trackName}</span>}
                              </div>
                            )}
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
                className='text-xs sm:text-sm text-[#208479] hover:text-[#1a6b62] mb-2 sm:mb-4 flex items-center gap-1'
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
                      {(selectedSearchWOD.workout_name || (selectedSearchWOD.track_id && tracks.find(t => t.id === selectedSearchWOD.track_id)?.name)) && (
                        <div className='text-xs sm:text-sm font-medium text-gray-700 mb-1'>
                          {selectedSearchWOD.workout_name && <span>{selectedSearchWOD.workout_name}</span>}
                          {selectedSearchWOD.workout_name && selectedSearchWOD.track_id && tracks.find(t => t.id === selectedSearchWOD.track_id)?.name && <span className='text-gray-400'> • </span>}
                          {selectedSearchWOD.track_id && <span>{tracks.find(t => t.id === selectedSearchWOD.track_id)?.name}</span>}
                        </div>
                      )}
                      <h3 className='font-bold text-base sm:text-lg text-gray-900 mb-1'>
                        {selectedSearchWOD.title}
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
                        className='bg-white rounded-lg border border-gray-200 p-2 sm:p-3 hover:border-[#208479] transition flex gap-1 sm:gap-2'
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
                          <div className='text-xs sm:text-sm text-gray-700 whitespace-pre-wrap'>
                            {section.content}
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
                  className='flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base bg-[#208479] hover:bg-[#1a6b62] text-white rounded-lg font-medium transition'
                >
                  Edit WOD
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className='border-t p-2 sm:p-3 lg:p-4'>
        <button
          onClick={() => {
            onCreateWorkout(new Date(), true);
            onSelectedSearchWODChange(null);
          }}
          className='w-full px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base bg-[#208479] hover:bg-[#1a6b62] text-white rounded-lg font-medium transition'
        >
          + Create New Workout
        </button>
      </div>
    </div>
  );
}
