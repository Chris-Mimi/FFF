'use client';

import { WODFormData, WODSection } from '@/components/coach/WorkoutModal';
import type { ConfiguredLift, ConfiguredBenchmark, ConfiguredForgeBenchmark } from '@/types/movements';
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/auth-fetch';
import { extractMovements, extractMovementsFromWod, type AcronymMap, type LiftExerciseMap } from '@/utils/movement-extraction';
import { fetchLiftExerciseMap } from '@/utils/movement-analytics';
import { useEffect, useState } from 'react';

interface UseCoachDataProps {
  searchQuery: string;
  selectedMovements: string[];
  selectedWorkoutTypes: string[];
  selectedTracks: string[];
  selectedSessionTypes: string[];
  includedSectionTypes: string[];
  selectedSectionTypeFilter: string[];
  selectedMembers: string[];
  notDoneBySelected: boolean;
  privateOnly: boolean;
}

export const useCoachData = ({
  searchQuery,
  selectedMovements,
  selectedWorkoutTypes,
  selectedTracks,
  selectedSessionTypes,
  includedSectionTypes,
  selectedSectionTypeFilter,
  selectedMembers,
  notDoneBySelected,
  privateOnly,
}: UseCoachDataProps) => {
  const [wods, setWods] = useState<Record<string, WODFormData[]>>({});
  const [tracks, setTracks] = useState<Array<{ id: string; name: string }>>([]);
  const [trackCounts, setTrackCounts] = useState<Record<string, number>>({});
  const [workoutTypes, setWorkoutTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [workoutTypeCounts, setWorkoutTypeCounts] = useState<Record<string, number>>({});
  const [sessionTypes, setSessionTypes] = useState<string[]>([]);
  const [sessionTypeCounts, setSessionTypeCounts] = useState<Record<string, number>>({});
  const [sectionTypes, setSectionTypes] = useState<Array<{ id: string; name: string; display_order: number }>>([]);
  const [sectionTypeCounts, setSectionTypeCounts] = useState<Record<string, number>>({});
  const [searchResults, setSearchResults] = useState<WODFormData[]>([]);
  const [movements, setMovements] = useState<Map<string, number>>(new Map());
  const [exerciseNames, setExerciseNames] = useState<Set<string>>(new Set());
  const [exerciseList, setExerciseList] = useState<Array<{ id: string; name: string; display_name: string | null; category: string; acronym: string | null }>>([]);
  const [acronymMap, setAcronymMap] = useState<AcronymMap>(new Map());
  const [liftExerciseMap, setLiftExerciseMap] = useState<LiftExerciseMap>(new Map());
  const [displayNameToAcronyms, setDisplayNameToAcronyms] = useState<Map<string, string[]>>(new Map());
  const [members, setMembers] = useState<Array<{ id: string; name: string; booking_count: number; date_of_birth: string | null }>>([]);
  const [loading, setLoading] = useState(true);

  const fetchWODs = async () => {
    try {
      // Fetch all bookings — paginated to bypass Supabase 1000-row select cap
      // (without this, count chips lag behind once total bookings > 1000).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allBookings: any[] = [];
      const PAGE = 1000;
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('bookings')
          .select('session_id, status, is_og, is_trial, members(name, display_name)')
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allBookings.push(...data);
        if (data.length < PAGE) break;
      }

      // Fetch wod IDs that have scores entered — paginated for the same reason
      const scoredWodIds = new Set<string>();
      for (let from = 0; ; from += PAGE) {
        const { data } = await supabase
          .from('wod_section_results')
          .select('wod_id')
          .not('wod_id', 'is', null)
          .range(from, from + PAGE - 1);
        if (!data || data.length === 0) break;
        for (const r of data) scoredWodIds.add(r.wod_id);
        if (data.length < PAGE) break;
      }

      // Fetch sessions with related WODs — paginated to bypass the 1000-row cap
      // so the newest sessions can't silently drop off the calendar (S349).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allSessions: any[] = [];
      for (let sFrom = 0; ; sFrom += PAGE) {
      const { data, error } = await supabase
        .from('weekly_sessions')
        .select(`
          id,
          date,
          time,
          capacity,
          status,
          is_private,
          workout_id,
          workout_type,
          trial_names,
          drop_in_names,
          wods (
            id,
            title,
            session_type,
            workout_name,
            workout_week,
            track_id,
            workout_type_id,
            class_times,
            sections,
            coach_notes,
            is_published,
            workout_publish_status,
            google_event_id,
            publish_time,
            publish_sections,
            publish_duration
          )
        `)
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .range(sFrom, sFrom + PAGE - 1);

      if (error) {
        console.error('Error fetching sessions:', error);
        throw error;
      }
      if (!data || data.length === 0) break;
      allSessions.push(...data);
      if (data.length < PAGE) break;
      }

      const grouped: Record<string, WODFormData[]> = {};
      allSessions.forEach((session) => {
        const dateKey = session.date;
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }

        const sessionBookings = allBookings?.filter(b => b.session_id === session.id) || [];
        const trialCount = (session.trial_names as string[] | null)?.length || 0;
        const dropInCount = (session.drop_in_names as string[] | null)?.length || 0;
        // OG bookings are off-capacity — surfaced as a separate count for the second chip.
        // is_trial bookings are also excluded — their seat is already counted via trial_names.
        // Drop-ins take a real seat too (no booking row), so add them like trials.
        const confirmedCount = sessionBookings.filter(b => b.status === 'confirmed' && !b.is_og && !b.is_trial).length + trialCount + dropInCount;
        const ogCount = sessionBookings.filter(b => b.status === 'confirmed' && b.is_og).length;
        const waitlistCount = sessionBookings.filter(b => b.status === 'waitlist').length;

        const trialNamesArr = (session.trial_names as string[] | null) || [];
        const dropInNamesArr = (session.drop_in_names as string[] | null) || [];
        const bookedMembers = sessionBookings
          .filter(b => (b.status === 'confirmed' || b.status === 'waitlist') && !b.is_trial)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((b: any) => {
            const m = b.members;
            const label = m?.display_name || m?.name || 'Unknown';
            return b.is_og ? `${label} (OG)` : label;
          })
          .concat(trialNamesArr.map(n => `${n} (trial)`))
          .concat(dropInNamesArr.map(n => `${n} (drop-in)`))
          .sort((a: string, b: string) => a.localeCompare(b));

        const bookingInfo = {
          session_id: session.id,
          confirmed_count: confirmedCount,
          og_count: ogCount,
          waitlist_count: waitlistCount,
          capacity: session.capacity,
          time: session.time,
          booked_members: bookedMembers as string[],
          status: session.status,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const workout = session.wods as any;
        if (workout) {
          const hasContent = workout.sections && workout.sections.length > 0;
          const publishStatus = hasContent ? (workout.workout_publish_status || 'draft') : null;

          grouped[dateKey].push({
            id: workout.id,
            title: workout.title,
            session_type: workout.session_type || undefined,
            workout_name: workout.workout_name || undefined,
            workout_week: workout.workout_week || undefined,
            track_id: workout.track_id || undefined,
            workout_type_id: workout.workout_type_id || undefined,
            classTimes: workout.class_times,
            date: session.date,
            sections: workout.sections,
            coach_notes: workout.coach_notes || undefined,
            is_published: workout.is_published || false,
            is_private: session.is_private || false,
            workout_publish_status: publishStatus,
            google_event_id: workout.google_event_id || null,
            publish_time: workout.publish_time || undefined,
            publish_sections: workout.publish_sections || undefined,
            publish_duration: workout.publish_duration || undefined,
            booking_info: bookingInfo,
            has_scores: scoredWodIds.has(workout.id),
          });
        } else {
          grouped[dateKey].push({
            id: `session-${session.id}`,
            title: session.workout_type || 'Session',
            date: session.date,
            sections: [],
            classTimes: [],
            is_published: false,
            is_private: session.is_private || false,
            workout_publish_status: null,
            booking_info: bookingInfo,
          });
        }
      });

      setWods(grouped);
    } catch (error) {
      console.error('Error fetching WODs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search WODs with debounce
  useEffect(() => {
    if (
      !searchQuery &&
      !selectedMovements.length &&
      !selectedWorkoutTypes.length &&
      !selectedTracks.length &&
      !selectedSessionTypes.length &&
      !selectedSectionTypeFilter.length &&
      !selectedMembers.length &&
      !privateOnly
    ) {
      setSearchResults([]);
      setMovements(new Map());
      return;
    }

    const searchWODs = async () => {
      try {
        let query = supabase
          .from('weekly_sessions')
          .select(`
            id,
            date,
            time,
            is_private,
            wods!inner (
              id,
              title,
              session_type,
              workout_name,
              workout_week,
              track_id,
              workout_type_id,
              class_times,
              sections,
              coach_notes,
              is_published,
              workout_publish_status,
              google_event_id
            )
          `)
          .eq('wods.workout_publish_status', 'published');

        if (selectedTracks.length > 0) {
          query = query.in('wods.track_id', selectedTracks);
        }

        // Filter by member bookings. Normally selecting athletes restricts the
        // search to workouts they DID attend. When notDoneBySelected is on we want
        // the inverse, so we skip this restriction here (search all workouts) and
        // instead EXCLUDE attended workout names after the other filters run.
        if (selectedMembers.length > 0 && !notDoneBySelected) {
          const { data: memberBookings } = await supabase
            .from('bookings')
            .select('session_id')
            .in('member_id', selectedMembers)
            .eq('status', 'confirmed');

          if (!memberBookings || memberBookings.length === 0) {
            setSearchResults([]);
            setMovements(new Map());
            return;
          }
          const sessionIds = [...new Set(memberBookings.map(b => b.session_id))];
          query = query.in('id', sessionIds);
        }

        // Hard limit: protects search responsiveness on slow connections. Bumped from
        // 500 → 2000 at S349 to give ~18 months of headroom at current data growth.
        // Tripwire below warns when we approach the limit so we can revisit before it
        // silently truncates older WODs out of search results. See
        // memory-bank/database-and-growth.md for the full reasoning + UX options.
        const SEARCH_LIMIT = 2000;
        const { data, error } = await query.order('date', { ascending: false }).limit(SEARCH_LIMIT);

        if (error) throw error;
        if (data && data.length >= SEARCH_LIMIT * 0.9) {
          console.warn(
            `[search-limit-tripwire] WOD search returned ${data.length}/${SEARCH_LIMIT} rows — approaching the limit. ` +
            `Older WODs may start disappearing from unfiltered searches soon. Revisit the limit / paginate / add default date window. ` +
            `See memory-bank/database-and-growth.md.`
          );
        }

        const results: WODFormData[] =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data?.map((session: any) => {
            const wod = session.wods;
            return {
              id: wod.id,
              title: wod.title,
              session_type: wod.session_type || undefined,
              workout_name: wod.workout_name || undefined,
              workout_week: wod.workout_week || undefined,
              track_id: wod.track_id || undefined,
              workout_type_id: wod.workout_type_id || undefined,
              classTimes: wod.class_times,
              date: session.date,
              time: session.time,
              sections: wod.sections,
              coach_notes: wod.coach_notes || undefined,
              is_published: wod.is_published || false,
              is_private: session.is_private || false,
              google_event_id: wod.google_event_id || null,
            };
          }) || [];

        let filteredResults = results;

        if (searchQuery) {
          const endAnchor = /\s$/.test(searchQuery);
          const searchPhrase = searchQuery.trim();

          filteredResults = filteredResults.filter(wod => {
            let combinedText = '';

            // Helper function to extract structured movement data from sections
            const getStructuredMovements = (sections: WODSection[]) => {
              return sections.flatMap(section => {
                const movements: string[] = [];

                // Extract lift names (include equipment for search: "Barbell Back Squat")
                section.lifts?.forEach((lift: ConfiguredLift) => {
                  if (lift.name) {
                    movements.push(lift.name);
                    // Add equipment prefix if available (from barbell_lifts.equipment)
                    const liftEquipment = 'Barbell'; // Default for now, can be fetched from DB if needed
                    movements.push(`${liftEquipment} ${lift.name}`);
                    // Include exercise tags (acronyms) so searching "dl" finds "Barbell Deadlift" lifts (S303)
                    const liftLower = lift.name.toLowerCase();
                    const formsToTry = [
                      liftLower,
                      `barbell ${liftLower}`,
                      `kb ${liftLower}`,
                      `jump rope ${liftLower}`,
                    ];
                    for (const form of formsToTry) {
                      const tags = displayNameToAcronyms.get(form);
                      if (tags) { tags.forEach(t => movements.push(t)); break; }
                    }
                  }
                });

                // Extract benchmark name + description (description carries movements like "150 Wallball Shots")
                section.benchmarks?.forEach((benchmark: ConfiguredBenchmark) => {
                  if (benchmark.name) {
                    movements.push(benchmark.name);
                    const acrs = displayNameToAcronyms.get(benchmark.name.toLowerCase());
                    if (acrs) acrs.forEach(a => movements.push(a));
                  }
                  if (benchmark.description) movements.push(benchmark.description);
                });

                // Extract forge benchmark name + description
                section.forge_benchmarks?.forEach((forge: ConfiguredForgeBenchmark) => {
                  if (forge.name) {
                    movements.push(forge.name);
                    const acrs = displayNameToAcronyms.get(forge.name.toLowerCase());
                    if (acrs) acrs.forEach(a => movements.push(a));
                  }
                  if (forge.description) movements.push(forge.description);
                });

                return movements;
              }).join(' ');
            };

            if (wod.is_private) {
              // Private events: the workout stays findable by NAME/title only — its
              // exercises (section content, movements, notes) must NOT be searchable,
              // so typing an exercise never surfaces a private event. (S399)
              combinedText = `${wod.title} ${wod.workout_name || ''}`;
            } else if (includedSectionTypes.length === 0) {
              // "All" selected - search everything
              const sectionsContent = wod.sections.map(s => s.content).join(' ');
              const structuredMovements = getStructuredMovements(wod.sections);
              combinedText = `${wod.title} ${wod.workout_name || ''} ${wod.coach_notes || ''} ${sectionsContent} ${structuredMovements}`;
            } else {
              // Specific filters selected
              const includeNotes = includedSectionTypes.includes('Notes');
              const includeWorkoutName = includedSectionTypes.includes('Workout Name');
              const sectionTypesToInclude = includedSectionTypes.filter(t => t !== 'Notes' && t !== 'Workout Name');

              const sectionsToSearch = sectionTypesToInclude.length > 0
                ? wod.sections.filter(s => sectionTypesToInclude.includes(s.type))
                : [];

              const workoutNameText = includeWorkoutName ? (wod.workout_name || '') : '';
              const notesText = includeNotes ? (wod.coach_notes || '') : '';
              const sectionsText = sectionsToSearch.map(s => s.content).join(' ');
              const structuredMovements = getStructuredMovements(sectionsToSearch);

              combinedText = `${workoutNameText} ${notesText} ${sectionsText} ${structuredMovements}`;
            }

            // Build pattern set: raw query + any acronym expansion (S333).
            // If user types "DL", also search for "Barbell Deadlift" in content text.
            const phrases = [searchPhrase];
            const acrLookup = acronymMap.get(searchPhrase.toLowerCase());
            if (acrLookup && !phrases.includes(acrLookup)) phrases.push(acrLookup);

            const matchesAny = phrases.some(phrase => {
              const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              // \b word boundary so "Ring" doesn't match "hamstring" or "during".
              // Trailing space in the raw query → require end-of-word too (exact match).
              const pattern = endAnchor ? `\\b${escaped}\\b` : `\\b${escaped}`;
              return new RegExp(pattern, 'i').test(combinedText);
            });
            return matchesAny;
          });
        }

        if (selectedMovements.length > 0) {
          const knownNames = exerciseNames.size > 0 ? exerciseNames : undefined;
          filteredResults = filteredResults.filter(wod => {
            // Private events are excluded from movement-based discovery — their
            // exercises must not be retrievable via the Movements filter. (S399)
            if (wod.is_private) return false;
            const wodMovements = extractMovementsFromWod(wod, knownNames, acronymMap, liftExerciseMap);
            return selectedMovements.every(movement =>
              wodMovements.has(movement)
            );
          });
        }

        if (selectedWorkoutTypes.length > 0) {
          filteredResults = filteredResults.filter(wod =>
            wod.sections.some(section =>
              section.workout_type_id && selectedWorkoutTypes.includes(section.workout_type_id)
            )
          );
        }

        if (selectedSessionTypes.length > 0) {
          filteredResults = filteredResults.filter(wod =>
            wod.title && selectedSessionTypes.includes(wod.title)
          );
        }

        if (selectedSectionTypeFilter.length > 0) {
          filteredResults = filteredResults.filter(wod =>
            wod.sections.some(section =>
              selectedSectionTypeFilter.includes(section.type)
            )
          );
        }

        // "Not done by selected": drop workouts whose name ANY selected athlete
        // has attended (confirmed booking). Server-side via the coach API so RLS
        // doesn't hide other members' bookings. Unnamed workouts can't be matched
        // to attendance, so they're kept.
        if (notDoneBySelected && selectedMembers.length > 0) {
          try {
            const res = await authFetch(`/api/coach/attended-workouts?memberIds=${selectedMembers.join(',')}`);
            const { workoutNames } = await res.json();
            const attended = new Set<string>(workoutNames || []);
            filteredResults = filteredResults.filter(wod => !wod.workout_name || !attended.has(wod.workout_name));
          } catch (e) {
            console.error('Failed to load attended workouts:', e);
          }
        }

        // "Private events only" — lets the coach list all private sessions without
        // remembering dates (special events, non-WOD sessions). (S399)
        if (privateOnly) {
          filteredResults = filteredResults.filter(wod => wod.is_private);
        }

        setSearchResults(filteredResults);

        // Build the searchable Movements list from NON-private results only, so a
        // private event's exercises never appear as filter options. (S399)
        const allMovements = extractMovements(filteredResults.filter(w => !w.is_private), exerciseNames.size > 0 ? exerciseNames : undefined, acronymMap, liftExerciseMap);
        setMovements(allMovements);
      } catch (error) {
        console.error('Error searching WODs:', error);
      }
    };

    const timeoutId = setTimeout(searchWODs, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedMovements, selectedWorkoutTypes, selectedTracks, selectedSessionTypes, includedSectionTypes, selectedSectionTypeFilter, selectedMembers, notDoneBySelected, privateOnly, exerciseNames, acronymMap, liftExerciseMap, displayNameToAcronyms]);

  const fetchExerciseNames = async () => {
    try {
      // Pull exercise rows + acronyms from all four movement-source tables
      // so the WOD-search and movement-extraction paths can resolve any code
      // (S333 — replaces the S303 tags-as-acronym pattern with a curated column).
      const [exRes, liftRes, bmRes, fbRes] = await Promise.all([
        supabase.from('exercises').select('id, name, display_name, category, acronym'),
        // S335 — when a lift is linked to an exercise, the exercise's acronym wins; use it as fallback below.
        supabase.from('barbell_lifts').select('name, acronym, exercises:exercise_id(acronym)'),
        supabase.from('benchmark_workouts').select('name, acronym'),
        supabase.from('forge_benchmarks').select('name, acronym'),
      ]);
      if (exRes.error) throw exRes.error;

      const names = new Set<string>();
      const acronyms: AcronymMap = new Map();
      const reverse = new Map<string, string[]>();

      exRes.data?.forEach(ex => {
        if (!ex.display_name) return;
        names.add(ex.display_name);
        if (ex.acronym && typeof ex.acronym === 'string') {
          const dnLower = ex.display_name.toLowerCase();
          const acrLower = ex.acronym.toLowerCase();
          acronyms.set(acrLower, dnLower);
          reverse.set(dnLower, [acrLower]);
        }
      });
      const addCrossSource = (rows?: Array<{ name: string | null; acronym: string | null }>) => {
        rows?.forEach(r => {
          if (!r.name || !r.acronym) return;
          const nameLower = r.name.toLowerCase();
          const acrLower = r.acronym.toLowerCase();
          acronyms.set(acrLower, nameLower);
          // Reverse-map populated for search expansion (combinedText in WOD search)
          const existing = reverse.get(nameLower) ?? [];
          if (!existing.includes(acrLower)) reverse.set(nameLower, [...existing, acrLower]);
        });
      };
      // For barbell_lifts: use the lift's own acronym if set, else inherit from the linked exercise.
      // Supabase types the embedded `exercises` join as an array; for a 1:1 FK it's at most one row.
      const liftRows = ((liftRes.data ?? []) as unknown as Array<{ name: string | null; acronym: string | null; exercises: { acronym: string | null } | { acronym: string | null }[] | null }>)
        .map(r => {
          const linked = Array.isArray(r.exercises) ? r.exercises[0] : r.exercises;
          return { name: r.name, acronym: r.acronym ?? linked?.acronym ?? null };
        });
      addCrossSource(liftRows);
      addCrossSource(bmRes.data ?? undefined);
      addCrossSource(fbRes.data ?? undefined);

      setExerciseNames(names);
      setExerciseList(exRes.data || []);
      setAcronymMap(acronyms);
      setDisplayNameToAcronyms(reverse);
      // S348 — load the lift→exercise link map so extractor can resolve catalogued
      // lifts (e.g. "Strict Overhead Shoulder Press") to their linked exercise
      // ("Strict OHP") regardless of name differences.
      setLiftExerciseMap(await fetchLiftExerciseMap());
    } catch (error) {
      console.error('Error fetching exercise names:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('id, name, display_name, date_of_birth')
        .eq('status', 'active')
        .eq('guardian_only', false)
        .neq('parked', true)
        .order('name', { ascending: true });

      if (membersError) throw membersError;

      const memberIds = (membersData || []).map(m => m.id);
      const { data: attendanceData, error: attError } = await supabase.rpc(
        'get_all_members_attendance',
        { p_member_ids: memberIds, p_days_back: 36500 }
      );

      if (attError) throw attError;

      const memberCounts: Record<string, number> = {};
      (attendanceData || []).forEach((row: { member_id: string; attendance_count: number }) => {
        memberCounts[row.member_id] = Number(row.attendance_count);
      });

      setMembers(
        (membersData || []).map(m => ({
          id: m.id,
          name: m.display_name || m.name || '',
          booking_count: memberCounts[m.id] || 0,
          date_of_birth: m.date_of_birth,
        }))
      );
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchTracksAndCounts = async () => {
    try {
      const { data: tracksData, error: tracksError } = await supabase
        .from('tracks')
        .select('*')
        .order('name', { ascending: true });

      if (tracksError) throw tracksError;
      setTracks(tracksData || []);

      const { data: typesData, error: typesError } = await supabase
        .from('workout_types')
        .select('*')
        .order('name', { ascending: true });

      if (typesError) throw typesError;
      setWorkoutTypes(typesData || []);

      const { data: sectionTypesData, error: sectionTypesError } = await supabase
        .from('section_types')
        .select('*')
        .order('display_order', { ascending: true });

      if (sectionTypesError) throw sectionTypesError;
      setSectionTypes(sectionTypesData || []);

      // Query from weekly_sessions to match search results (excludes orphaned wods).
      // Paginated — PostgREST caps a single response at 1000 rows and silently truncates;
      // these counts feed search-panel badges, so an undercount is hard to notice.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sessionsData: any[] = [];
      const PAGE = 1000;
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('weekly_sessions')
          .select(`
            wods!inner (
              track_id,
              title,
              sections,
              workout_publish_status
            )
          `)
          .eq('wods.workout_publish_status', 'published')
          .neq('is_private', true) // Private events don't pad the filter facet counts (S399)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        sessionsData.push(...data);
        if (data.length < PAGE) break;
      }

      const trackCountsMap: Record<string, number> = {};
      const workoutTypeCountsMap: Record<string, number> = {};
      const sessionTypeCountsMap: Record<string, number> = {};
      const sectionTypeCountsMap: Record<string, number> = {};
      const uniqueSessionTypes = new Set<string>();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sessionsData?.forEach((session: any) => {
        const wod = session.wods;
        if (!wod) return;

        // Count tracks
        if (wod.track_id) {
          trackCountsMap[wod.track_id] = (trackCountsMap[wod.track_id] || 0) + 1;
        }

        // Count session types (stored in title field)
        if (wod.title) {
          uniqueSessionTypes.add(wod.title);
          sessionTypeCountsMap[wod.title] = (sessionTypeCountsMap[wod.title] || 0) + 1;
        }

        // Count workout types and section types from sections
        const wodSectionTypes = new Set<string>();
        wod.sections?.forEach((section: WODSection) => {
          if (section.workout_type_id) {
            workoutTypeCountsMap[section.workout_type_id] = (workoutTypeCountsMap[section.workout_type_id] || 0) + 1;
          }
          if (section.type) {
            wodSectionTypes.add(section.type);
          }
        });
        // Count each section type once per workout (not per section)
        wodSectionTypes.forEach(st => {
          sectionTypeCountsMap[st] = (sectionTypeCountsMap[st] || 0) + 1;
        });
      });

      setTrackCounts(trackCountsMap);
      setWorkoutTypeCounts(workoutTypeCountsMap);
      setSectionTypeCounts(sectionTypeCountsMap);
      setSessionTypes(Array.from(uniqueSessionTypes).sort());
      setSessionTypeCounts(sessionTypeCountsMap);
    } catch (error) {
      console.error('Error fetching tracks and counts:', error);
    }
  };

  return {
    wods,
    setWods,
    tracks,
    trackCounts,
    workoutTypes,
    workoutTypeCounts,
    sessionTypes,
    sessionTypeCounts,
    sectionTypes,
    sectionTypeCounts,
    searchResults,
    setSearchResults,
    movements,
    setMovements,
    loading,
    setLoading,
    members,
    exerciseList,
    fetchWODs,
    fetchTracksAndCounts,
    fetchExerciseNames,
    fetchMembers,
  };
};
