// AthletePageLogbookTab component
'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useLogbookData } from '@/hooks/athlete/useLogbookData';
import { useWorkoutLogging } from '@/hooks/athlete/useWorkoutLogging';
import { useAthleteLogbookState } from '@/hooks/athlete/useAthleteLogbookState';
import { useAthleteNavigation } from '@/hooks/athlete/useAthleteNavigation';
import { usePhotoHandling } from '@/hooks/athlete/usePhotoHandling';
import { useLiftManagement } from '@/hooks/athlete/useLiftManagement';
import { useBenchmarkManagement } from '@/hooks/athlete/useBenchmarkManagement';
import { useAthleteLiftPRs, roundToPlate } from '@/hooks/athlete/useAthleteLiftPRs';
import { formatLocalDate, getPublishedSections } from '@/utils/logbook-utils';
import type { ConfiguredLift, ConfiguredBenchmark, ConfiguredForgeBenchmark } from '@/types/movements';
import { supabase } from '@/lib/supabase';
import ScoringFieldInputs from './logbook/ScoringFieldInputs';
import NavigationControls from './logbook/NavigationControls';
import WeekView from './logbook/WeekView';
import MonthView from './logbook/MonthView';
import WhiteboardSection from './logbook/WhiteboardSection';
import PhotoModal from './logbook/PhotoModal';
import { formatLift, formatBenchmark, formatForgeBenchmark } from '@/utils/logbook/formatters';
import { saveSectionResult } from '@/utils/logbook/savingLogic';
import { loadSectionResults, loadBenchmarkResultsToSection, loadLiftResultsToSection } from '@/utils/logbook/loadingLogic';

interface SectionResult {
  time_result?: string;
  reps_result?: string;
  weight_result?: string;
  weight_result_2?: string;
  weight_result_3?: string;
  scaling_level?: 'Rx' | 'Sc1' | 'Sc2' | 'Sc3' | '';
  scaling_level_2?: 'Rx' | 'Sc1' | 'Sc2' | 'Sc3' | '';
  scaling_level_3?: 'Rx' | 'Sc1' | 'Sc2' | 'Sc3' | '';
  rounds_result?: string;
  calories_result?: string;
  metres_result?: string;
  task_completed?: boolean;
}

interface AthletePageLogbookTabProps {
  userId: string;
  initialDate?: Date;
  initialViewMode?: 'day' | 'week' | 'month';
  onDateChange?: (date: Date) => void;
}

export default function AthletePageLogbookTab({ userId, initialDate, initialViewMode, onDateChange }: AthletePageLogbookTabProps) {
  const savingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  // State management via custom hook
  const state = useAthleteLogbookState(initialDate, initialViewMode);
  const {
    selectedDate,
    setSelectedDate,
    viewMode,
    setViewMode,
    liftRecords,
    setLiftRecords,
    benchmarkResults,
    setBenchmarkResults,
    sectionResults,
    setSectionResults,
    whiteboardPhotos,
    setWhiteboardPhotos,
    photosLoading,
    setPhotosLoading,
    selectedPhoto,
    setSelectedPhoto,
    showPhotoModal,
    setShowPhotoModal,
  } = state;

  // Track which sections have coach-entered scores (wodId:::sectionId)
  const [coachLockedSections, setCoachLockedSections] = useState<Set<string>>(new Set());

  // Best 1RM per lift for auto percentage calculator
  const best1RMMap = useAthleteLiftPRs(userId);

  // Use extracted data hooks
  const { workouts, workoutLogs, loading, setWorkoutLogs } = useLogbookData({
    userId,
    selectedDate,
    viewMode,
  });

  const { saveWorkoutLog } = useWorkoutLogging({
    userId,
    workoutLogs,
  });

  // Navigation handlers via custom hook
  const navigation = useAthleteNavigation(selectedDate, setSelectedDate);
  const { previousDay, nextDay, previousWeek, nextWeek, previousMonth, nextMonth, goToToday } = navigation;

  // Photo handling via custom hook
  const photoHandlers = usePhotoHandling(
    selectedDate,
    whiteboardPhotos,
    setWhiteboardPhotos,
    photosLoading,
    setPhotosLoading,
    selectedPhoto,
    setSelectedPhoto,
    setShowPhotoModal
  );
  const { handleViewPhoto, handleClosePhotoModal, handlePreviousPhoto, handleNextPhoto, getWeekNumber } = photoHandlers;

  // Lift management via custom hook
  const liftHandlers = useLiftManagement(userId, liftRecords, setLiftRecords, workouts);
  const { saveLiftRecord, loadLiftRecords } = liftHandlers;

  // Benchmark management via custom hook
  const benchmarkHandlers = useBenchmarkManagement(userId, benchmarkResults, setBenchmarkResults);
  const { saveBenchmarkResult } = benchmarkHandlers;


  // Wrapper functions that use utilities and update state
  const loadSectionResultsWrapper = async (workoutDate: string) => {
    const { results: newResults, coachLockedSections: locked } = await loadSectionResults(userId, workoutDate);
    // Only keep results for WODs the user is actually booked into (prevents stray records from polluting state)
    const bookedWodIds = new Set(workouts.map(w => w.id));
    const filteredResults: Record<string, SectionResult> = {};
    for (const [key, value] of Object.entries(newResults)) {
      const wodId = key.split(':::')[0];
      if (bookedWodIds.has(wodId)) {
        filteredResults[key] = value;
      }
    }
    setSectionResults(prev => {
      const updated = { ...prev, ...filteredResults };
      return updated;
    });
    setCoachLockedSections(locked);
  };

  const saveSectionResultWrapper = async (wodId: string, sectionId: string, result: SectionResult, workoutDate: string) => {
    await saveSectionResult(userId, wodId, sectionId, result, workoutDate);
  };

  // UNIFIED SAVE FUNCTION - Handles all scoring data (lifts, benchmarks, forge, content) and notes
  const saveAllResults = async (workoutDate: string) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
    // Find ALL workouts for this date to build valid WOD ID set
    const dateWorkouts = workouts.filter(w => formatLocalDate(new Date(w.date)) === workoutDate);
    if (dateWorkouts.length === 0) {
      toast.warning('Workout not found');
      return;
    }
    const currentWorkout = dateWorkouts[0];
    const validWodIds = new Set(dateWorkouts.map(w => w.id));

    // Only save entries belonging to workouts on this date (not accumulated from other dates)
    const resultsToSave = Object.entries(sectionResults).filter(([key, result]) => {
      const wodId = key.split(':::')[0];
      if (!validWodIds.has(wodId)) return false;
      return result.time_result || result.reps_result || result.weight_result || result.weight_result_2 || result.weight_result_3 || result.scaling_level || result.scaling_level_2 || result.scaling_level_3 ||
        result.rounds_result || result.calories_result || result.metres_result || result.task_completed;
    });

    // Check if there are notes to save
    const hasNotes = workoutLogs[currentWorkout.id]?.notes?.trim();

    // If no results AND no notes, show error
    if (resultsToSave.length === 0 && !hasNotes) {
      toast.warning('No results or notes to save');
      return;
    }

    let savedCount = 0;
    let errorCount = 0;
    let coachBlockedCount = 0;
    const errors: string[] = [];

    for (const [key, result] of resultsToSave) {
      try {
        // Parse key: format is "wodId:::sectionId:::type-idx"
        const parts = key.split(':::');
        if (parts.length < 3) continue;

        const [wodId, sectionId, itemIdentifier] = parts;
        // Find the specific workout this entry belongs to
        const entryWorkout = dateWorkouts.find(w => w.id === wodId);
        const section = entryWorkout ? getPublishedSections(entryWorkout, userId).find(s => s.id === sectionId) : null;
        if (!section) continue;

        // Determine item type
        if (itemIdentifier.startsWith('lift-')) {
          // Save as lift record
          const liftIdx = parseInt(itemIdentifier.replace('lift-', ''));
          const lift = section.lifts?.[liftIdx];
          if (lift && result.weight_result) {
            if (lift.rm_test) {
              // RM Test: save WITHOUT repScheme → triggers rep_max_type path
              const reps = parseInt(lift.rm_test.replace('RM', ''));
              await saveLiftRecord(lift.name, result.weight_result, reps, workoutDate);
            } else {
              // Regular lift: save WITH repScheme as before
              const repScheme = lift.rep_type === 'constant'
                ? `${lift.sets || 1}x${lift.reps || 1}`
                : lift.variable_sets?.map(s => s.reps).join('-') || '1';
              const reps = parseInt(result.reps_result || '0') || 0;
              await saveLiftRecord(lift.name, result.weight_result, reps, workoutDate, repScheme);
            }
            savedCount++;
          }
        } else if (itemIdentifier.startsWith('benchmark-')) {
          // Save as benchmark result
          const bmIdx = parseInt(itemIdentifier.replace('benchmark-', ''));
          const benchmark = section.benchmarks?.[bmIdx];
          if (benchmark) {
            // Only use rounds+reps format when rounds are present (AMRAP)
            // Otherwise send raw reps value (parseInt stops at '+' and loses the reps)
            const repsValue = result.rounds_result
              ? `${result.rounds_result}+${result.reps_result || '0'}`
              : result.reps_result || '';

            await saveBenchmarkResult(
              benchmark.name,
              benchmark.type,
              result.time_result || '',
              repsValue,
              result.weight_result || '',
              workoutDate,
              result.scaling_level || 'Rx',
              benchmark.id
            );
            savedCount++;
          }
        } else if (itemIdentifier.startsWith('forge-')) {
          // Save as forge benchmark result
          const forgeIdx = parseInt(itemIdentifier.replace('forge-', ''));
          const forge = section.forge_benchmarks?.[forgeIdx];
          if (forge) {
            // Only use rounds+reps format when rounds are present (AMRAP)
            // Otherwise send raw reps value (parseInt stops at '+' and loses the reps)
            const repsValue = result.rounds_result
              ? `${result.rounds_result}+${result.reps_result || '0'}`
              : result.reps_result || '';

            await saveBenchmarkResult(
              forge.name,
              forge.type,
              result.time_result || '',
              repsValue,
              result.weight_result || '',
              workoutDate,
              result.scaling_level || 'Rx',
              undefined,
              forge.id
            );
            savedCount++;
          }
        } else if (itemIdentifier.startsWith('content-')) {
          // Save as general section result (free-form exercise)
          await saveSectionResultWrapper(wodId, `${sectionId}-${itemIdentifier}`, result, workoutDate);
          savedCount++;
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        if (msg.includes('coach has already recorded')) {
          coachBlockedCount++;
          toast.info(msg);
        } else {
          errorCount++;
          errors.push(msg);
        }
      }
    }

    // Also save workout notes if present
    if (workoutLogs[currentWorkout.id]?.notes) {
      try {
        await saveWorkoutLog(currentWorkout.id);
      } catch (error) {
        errors.push('Failed to save notes');
      }
    }

    if (errorCount === 0 && savedCount > 0) {
      toast.success(`Successfully saved ${savedCount} results!`);
    } else if (errorCount > 0) {
      toast.error(`Saved ${savedCount} of ${resultsToSave.length - coachBlockedCount} results. ${errorCount} failed. Please try again.`);
    }
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const loadBenchmarkResultsToSectionWrapper = async (workoutDate: string) => {
    const newResults = await loadBenchmarkResultsToSection(userId, workoutDate, workouts);
    setSectionResults(prev => ({ ...prev, ...newResults }));
  };

  const loadLiftResultsToSectionWrapper = async (workoutDate: string) => {
    const newResults = await loadLiftResultsToSection(userId, workoutDate, workouts);
    setSectionResults(prev => ({ ...prev, ...newResults }));
  };

  // Load lift records when workouts or selected date change
  useEffect(() => {
    let cancelled = false;

    const loadAllData = async () => {
      if (workouts.length > 0 && selectedDate && userId && !cancelled) {
        const dateStr = formatLocalDate(selectedDate);
        // Run sequentially to avoid race conditions with state updates
        if (!cancelled) await loadLiftRecords(dateStr);
        if (!cancelled) await loadSectionResultsWrapper(dateStr);
        if (!cancelled) await loadBenchmarkResultsToSectionWrapper(dateStr);
        if (!cancelled) await loadLiftResultsToSectionWrapper(dateStr);

      }
    };

    loadAllData();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workouts, selectedDate, userId]);

  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDate]);

  // Notify parent when date changes so it can be persisted across tab switches
  useEffect(() => {
    if (onDateChange) {
      onDateChange(selectedDate);
    }
  }, [selectedDate, onDateChange]);


  return (
    <div className='bg-white rounded-lg shadow p-6'>
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-2xl font-bold text-gray-900'>Athlete Logbook</h2>

        {/* View Mode Toggle */}
        <div className='flex bg-gray-100 rounded-lg p-1'>
          {(['day', 'week', 'month'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                viewMode === mode
                  ? 'bg-[#178da6] text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Day View */}
      {viewMode === 'day' && (
        <div>
          <NavigationControls
            viewMode='day'
            selectedDate={selectedDate}
            onPrevious={previousDay}
            onNext={nextDay}
            onToday={goToToday}
          />

          {/* Workouts */}
          {loading ? (
            <div className='text-center text-gray-500 py-8'>Loading workouts...</div>
          ) : workouts.length === 0 ? (
            <div className='text-center text-gray-500 py-8'>
              No workouts attended on this date
            </div>
          ) : (
            <div className='space-y-4'>
              {workouts.map(wod => (
                <div key={wod.id} className='border border-gray-200 rounded-lg p-4'>
                  <div className='flex items-center justify-between mb-3'>
                    <div className='flex items-center gap-3'>
                      {wod.tracks && (
                        <div
                          className='w-4 h-4 rounded-full'
                          style={{ backgroundColor: wod.tracks.color || '#178da6' }}
                        />
                      )}
                      <h3 className='text-lg font-semibold text-gray-900'>
                        {wod.session_type || wod.title}
                        {(wod.workout_name || wod.tracks?.name) && (
                          <span className='text-gray-600'> - {wod.workout_name || wod.tracks?.name}</span>
                        )}
                      </h3>
                    </div>
                    {wod.time && (
                      <span className='text-sm text-gray-500'>
                        {wod.time.slice(0, 5)}
                      </span>
                    )}
                  </div>

                  {wod.booked ? (
                    // Future booked workout - show placeholder
                    <div className='text-center py-12'>
                      <div className='text-2xl font-bold text-[#178da6] mb-2'>Booked</div>
                      <div className='text-sm text-gray-500'>Workout details available after class</div>
                    </div>
                  ) : (
                    <>
                      {/* Workout Sections */}
                      <div className='space-y-3 mb-4'>
                    {getPublishedSections(wod, userId).map(section => {
                      const sectionLocked = coachLockedSections.has(`${wod.id}:::${section.id}`);
                      return (
                      <div key={section.id} className='bg-gray-50 rounded-lg p-3'>
                        <div className='flex items-center gap-3 flex-wrap mb-2'>
                          <span className='text-sm font-medium text-[#178da6] uppercase'>
                            {section.type}
                          </span>
                          {Number(section.duration) > 0 && (
                            <span className='text-sm text-gray-500'>{section.duration} min</span>
                          )}
                          {sectionLocked && (
                            <span className='text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded'>
                              Scored by coach
                            </span>
                          )}

                          {/* Inline Scoring Inputs for free-form content sections */}
                          {(() => {
                            // Only show inline scoring for sections WITHOUT lifts/benchmarks/forge
                            const hasStructuredItems =
                              (section.lifts && section.lifts.length > 0) ||
                              (section.benchmarks && section.benchmarks.length > 0) ||
                              (section.forge_benchmarks && section.forge_benchmarks.length > 0);

                            if (hasStructuredItems) return null;

                            const scoringFields = section.scoring_fields || {};
                            const hasAnyEnabledField = Object.values(scoringFields).some(v => v === true);

                            if (!hasAnyEnabledField) return null;

                            const itemKey = `${wod.id}:::${section.id}:::content-0`;

                            return (
                              <ScoringFieldInputs
                                scoringFields={scoringFields}
                                values={sectionResults[itemKey] || {}}
                                onChange={(updates) =>
                                  setSectionResults({
                                    ...sectionResults,
                                    [itemKey]: { ...(sectionResults[itemKey] || {}), ...updates },
                                  })
                                }
                                variant='default'
                                disabled={sectionLocked}
                              />
                            );
                          })()}
                        </div>

                        {/* Lifts (Blue Badges) + Configurable Scoring Fields */}
                        {section.lifts && section.lifts.length > 0 && (
                          <div className='space-y-2 mb-2'>
                            {section.lifts.map((lift, liftIdx) => {
                              const itemKey = `${wod.id}:::${section.id}:::lift-${liftIdx}`;
                              // Coach score-entry saves lift scores under content-0 key; fall back to it
                              const contentKey = `${wod.id}:::${section.id}:::content-0`;
                              const liftValues = sectionResults[itemKey] || sectionResults[contentKey] || {};
                              const scoringFields = section.scoring_fields || {};

                              return (
                                <div key={liftIdx} className='bg-blue-50 text-blue-900 rounded px-2 py-1'>
                                  <div className='flex items-center gap-2 flex-wrap'>
                                    {/* Lift Title */}
                                    <div className='font-semibold text-xs flex-shrink-0'>
                                      {lift.rep_type === 'variable' && lift.variable_sets && lift.variable_sets.length > 0 ? (
                                        <>
                                          <div>≡ {lift.name} {lift.variable_sets.map(s => s.reps).join('-')}</div>
                                          {(() => {
                                            const percentages = lift.variable_sets.map(s => s.percentage_1rm);
                                            const allHavePercentages = percentages.every(p => p !== undefined && p !== null);
                                            if (!allHavePercentages) return null;
                                            const athlete1RM = best1RMMap[lift.name];
                                            return (
                                              <div>
                                                @ {percentages.join('-')}%
                                                {athlete1RM ? (
                                                  <span className='text-blue-600 ml-1'>
                                                    ({percentages.map(p => roundToPlate((p as number) / 100 * athlete1RM)).join('-')} kg)
                                                  </span>
                                                ) : null}
                                              </div>
                                            );
                                          })()}
                                        </>
                                      ) : (
                                        <>
                                          ≡ {formatLift(lift)}
                                          {lift.percentage_1rm && best1RMMap[lift.name] ? (
                                            <span className='text-blue-600 ml-1 font-normal'>
                                              ({roundToPlate(lift.percentage_1rm / 100 * best1RMMap[lift.name])} kg)
                                            </span>
                                          ) : null}
                                        </>
                                      )}
                                    </div>

                                    {/* Configurable Scoring Inputs */}
                                    <ScoringFieldInputs
                                      scoringFields={scoringFields}
                                      values={liftValues}
                                      onChange={(updates) =>
                                        setSectionResults({
                                          ...sectionResults,
                                          [itemKey]: { ...liftValues, ...updates },
                                        })
                                      }
                                      variant='lift'
                                      showLabel={false}
                                      disabled={sectionLocked}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Benchmarks (Teal Badges) + Configurable Scoring Fields */}
                        {section.benchmarks && section.benchmarks.length > 0 && (
                          <div className='space-y-2 mb-2'>
                            {section.benchmarks.map((benchmark, bmIdx) => {
                              const formatted = formatBenchmark(benchmark);
                              const itemKey = `${wod.id}:::${section.id}:::benchmark-${bmIdx}`;
                              const scoringFields = section.scoring_fields || {};

                              return (
                                <div key={bmIdx} className='bg-teal-50 text-teal-900 rounded px-2 py-1'>
                                  <div className='space-y-1'>
                                    {/* Benchmark Title */}
                                    <div className='font-semibold text-xs'>≡ {formatted.name}</div>

                                    {/* Description/Exercises */}
                                    {formatted.description && (
                                      <div className='text-teal-800 text-xs whitespace-pre-wrap'>{formatted.description}</div>
                                    )}
                                    {!formatted.description && formatted.exercises && formatted.exercises.length > 0 && (
                                      <div className='text-teal-800 text-xs'>{formatted.exercises.join(' • ')}</div>
                                    )}

                                    {/* Configurable Scoring Inputs */}
                                    <ScoringFieldInputs
                                      scoringFields={scoringFields}
                                      values={sectionResults[itemKey] || {}}
                                      onChange={(updates) =>
                                        setSectionResults({
                                          ...sectionResults,
                                          [itemKey]: { ...(sectionResults[itemKey] || {}), ...updates },
                                        })
                                      }
                                      variant='benchmark'
                                      showLabel={false}
                                      disabled={sectionLocked}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Forge Benchmarks (Cyan Badges) + Configurable Scoring Fields */}
                        {section.forge_benchmarks && section.forge_benchmarks.length > 0 && (
                          <div className='space-y-2 mb-2'>
                            {section.forge_benchmarks.map((forge, forgeIdx) => {
                              const formatted = formatForgeBenchmark(forge);
                              const itemKey = `${wod.id}:::${section.id}:::forge-${forgeIdx}`;
                              const scoringFields = section.scoring_fields || {};

                              return (
                                <div key={forgeIdx} className='bg-cyan-50 text-cyan-900 rounded px-2 py-1'>
                                  <div className='space-y-1'>
                                    {/* Forge Benchmark Title */}
                                    <div className='font-semibold text-xs'>≡ {formatted.name}</div>

                                    {/* Description/Exercises */}
                                    {formatted.description && (
                                      <div className='text-cyan-800 text-xs whitespace-pre-wrap'>{formatted.description}</div>
                                    )}
                                    {!formatted.description && formatted.exercises && formatted.exercises.length > 0 && (
                                      <div className='text-cyan-800 text-xs'>{formatted.exercises.join(' • ')}</div>
                                    )}

                                    {/* Configurable Scoring Inputs */}
                                    <ScoringFieldInputs
                                      scoringFields={scoringFields}
                                      values={sectionResults[itemKey] || {}}
                                      onChange={(updates) =>
                                        setSectionResults({
                                          ...sectionResults,
                                          [itemKey]: { ...(sectionResults[itemKey] || {}), ...updates },
                                        })
                                      }
                                      variant='forge'
                                      showLabel={false}
                                      disabled={sectionLocked}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Section Content (Exercises and other free-form text) */}
                        {section.content && (() => {
                          // Only show scoring fields if section has NO structured items (lifts/benchmarks/forge)
                          // If it has structured items, content is just instructions/notes
                          const hasStructuredItems =
                            (section.lifts && section.lifts.length > 0) ||
                            (section.benchmarks && section.benchmarks.length > 0) ||
                            (section.forge_benchmarks && section.forge_benchmarks.length > 0);

                          if (hasStructuredItems) {
                            // Just display as instructions/notes (no scoring inputs)
                            return (
                              <div className='text-sm text-gray-700 whitespace-pre-wrap italic mt-2'>
                                {section.content}
                              </div>
                            );
                          }

                          // No structured items - check if scoring fields are enabled
                          const scoringFields = section.scoring_fields || {};
                          const hasAnyEnabledField = Object.values(scoringFields).some(v => v === true);

                          // If no scoring fields enabled, just show content as text
                          if (!hasAnyEnabledField) {
                            return (
                              <div className='text-sm text-gray-700 whitespace-pre-wrap mt-2'>
                                {section.content}
                              </div>
                            );
                          }

                          // Scoring fields enabled - show content only (scoring inputs now inline in header)
                          return (
                            <div className='text-sm text-gray-700 whitespace-pre-wrap mt-2'>
                              {section.content}
                            </div>
                          );
                        })()}
                      </div>
                      );
                    })}
                  </div>

                  {/* Workout Notes Section */}
                  <div className='mt-6 pt-6 border-t border-gray-200'>
                    <h4 className='font-semibold text-gray-900 mb-3'>My Notes</h4>

                    <div className='space-y-4'>
                      {/* Coach Instructions (Athlete Notes) */}
                      {(() => {
                        const allNotes: string[] = [];
                        const publishedSections = getPublishedSections(wod, userId);
                        publishedSections.forEach(section => {
                          // Collect lift athlete notes
                          section.lifts?.forEach(lift => {
                            if (lift.athlete_notes) {
                              allNotes.push(`${lift.name}: ${lift.athlete_notes}`);
                            }
                          });
                          // Collect benchmark athlete notes
                          section.benchmarks?.forEach(benchmark => {
                            if (benchmark.athlete_notes) {
                              allNotes.push(`${benchmark.name}: ${benchmark.athlete_notes}`);
                            }
                          });
                          // Collect forge benchmark athlete notes
                          section.forge_benchmarks?.forEach(forge => {
                            if (forge.athlete_notes) {
                              allNotes.push(`${forge.name}: ${forge.athlete_notes}`);
                            }
                          });
                        });

                        return allNotes.length > 0 ? (
                          <div className='mb-4'>
                            <label className='block text-sm font-semibold text-gray-700 mb-2'>Coach Instructions</label>
                            <div className='bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1'>
                              {allNotes.map((note, idx) => (
                                <div key={idx} className='text-sm text-blue-900'>
                                  • {note}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null;
                      })()}

                      <div>
                        <textarea
                          value={workoutLogs[wod.id]?.notes || ''}
                          onChange={e =>
                            setWorkoutLogs({
                              ...workoutLogs,
                              [wod.id]: {
                                result: '',
                                notes: e.target.value,
                                date: formatLocalDate(selectedDate),
                              },
                            })
                          }
                          placeholder='How did it feel? Any modifications?'
                          rows={4}
                          className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900 resize-none'
                        />
                      </div>

                      <div className='flex justify-end'>
                        <button
                          onClick={() => saveAllResults(formatLocalDate(selectedDate))}
                          disabled={isSaving}
                          className={`px-8 py-3 text-white font-semibold rounded-lg transition shadow-lg ${isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#178da6] hover:bg-[#14758c]'}`}
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div>
          <NavigationControls
            viewMode='week'
            selectedDate={selectedDate}
            onPrevious={previousWeek}
            onNext={nextWeek}
            onToday={goToToday}
          />
          <WeekView
            selectedDate={selectedDate}
            workouts={workouts}
            loading={loading}
            onDateSelect={setSelectedDate}
            onViewModeChange={setViewMode}
          />
        </div>
      )}

      {/* Month View */}
      {viewMode === 'month' && (
        <div>
          <NavigationControls
            viewMode='month'
            selectedDate={selectedDate}
            onPrevious={previousMonth}
            onNext={nextMonth}
            onToday={goToToday}
          />
          <MonthView
            selectedDate={selectedDate}
            workouts={workouts}
            loading={loading}
            onDateSelect={setSelectedDate}
            onViewModeChange={setViewMode}
          />
        </div>
      )}

      <WhiteboardSection
        photos={whiteboardPhotos}
        loading={photosLoading}
        weekNumber={getWeekNumber(selectedDate)}
        onPhotoClick={handleViewPhoto}
      />

      {showPhotoModal && selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          photos={whiteboardPhotos}
          onClose={handleClosePhotoModal}
          onPrevious={handlePreviousPhoto}
          onNext={handleNextPhoto}
        />
      )}
    </div>
  );
}
