'use client';

import { WODFormData, WODSection } from '@/components/coach/WorkoutModal';
import type { ConfiguredLift, ConfiguredBenchmark, ConfiguredForgeBenchmark } from '@/types/movements';
import { supabase } from '@/lib/supabase';
import { extractMovements, extractMovementsFromWod } from '@/utils/movement-extraction';
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
  const [exerciseList, setExerciseList] = useState<Array<{ id: string; name: string; display_name: string | null; category: string }>>([]);
  const [members, setMembers] = useState<Array<{ id: string; name: string; booking_count: number; date_of_birth: string | null }>>([]);
  const [loading, setLoading] = useState(true);

  const fetchWODs = async () => {
    try {
      // Fetch all bookings
      const { data: allBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('session_id, status, members(name, display_name)');

      if (bookingsError) throw bookingsError;

      // Fetch wod IDs that have scores entered
      const { data: scoredWods } = await supabase
        .from('wod_section_results')
        .select('wod_id')
        .not('wod_id', 'is', null);
      const scoredWodIds = new Set((scoredWods || []).map(r => r.wod_id));

      // Fetch sessions with related WODs
      const { data, error } = await supabase
        .from('weekly_sessions')
        .select(`
          id,
          date,
          time,
          capacity,
          status,
          workout_id,
          workout_type,
          wods (
            id,
            title,
            session_type,
            workout_name,
            workout_week,
            track_id,
            workout_type_id,
            class_times,
            max_capacity,
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
        .order('time', { ascending: true });

      if (error) {
        console.error('Error fetching sessions:', error);
        throw error;
      }

      const grouped: Record<string, WODFormData[]> = {};
      data?.forEach((session) => {
        const dateKey = session.date;
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }

        const sessionBookings = allBookings?.filter(b => b.session_id === session.id) || [];
        const confirmedCount = sessionBookings.filter(b => b.status === 'confirmed').length;
        const waitlistCount = sessionBookings.filter(b => b.status === 'waitlist').length;

        const bookedMembers = sessionBookings
          .filter(b => b.status === 'confirmed' || b.status === 'waitlist')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((b: any) => {
            const m = b.members;
            return m?.display_name || m?.name || 'Unknown';
          })
          .sort((a: string, b: string) => a.localeCompare(b));

        const bookingInfo = {
          session_id: session.id,
          confirmed_count: confirmedCount,
          waitlist_count: waitlistCount,
          capacity: session.capacity,
          time: session.time,
          booked_members: bookedMembers as string[],
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
            maxCapacity: workout.max_capacity,
            date: session.date,
            sections: workout.sections,
            coach_notes: workout.coach_notes || undefined,
            is_published: workout.is_published || false,
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
            maxCapacity: session.capacity,
            is_published: false,
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
      !selectedMembers.length
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
            wods!inner (
              id,
              title,
              session_type,
              workout_name,
              workout_week,
              track_id,
              workout_type_id,
              class_times,
              max_capacity,
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

        // Filter by member bookings
        if (selectedMembers.length > 0) {
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

        const { data, error } = await query.order('date', { ascending: false }).limit(500);

        if (error) throw error;

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
              maxCapacity: wod.max_capacity,
              date: session.date,
              time: session.time,
              sections: wod.sections,
              coach_notes: wod.coach_notes || undefined,
              is_published: wod.is_published || false,
              google_event_id: wod.google_event_id || null,
            };
          }) || [];

        let filteredResults = results;

        if (searchQuery) {
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
                  }
                });

                // Extract benchmark name and description (description contains movements like "150 Wallball Shots")
                section.benchmarks?.forEach((benchmark: ConfiguredBenchmark) => {
                  if (benchmark.name) movements.push(benchmark.name);
                  if (benchmark.description) movements.push(benchmark.description);
                });

                // Extract forge benchmark name and description
                section.forge_benchmarks?.forEach((forge: ConfiguredForgeBenchmark) => {
                  if (forge.name) movements.push(forge.name);
                  if (forge.description) movements.push(forge.description);
                });

                return movements;
              }).join(' ');
            };

            if (includedSectionTypes.length === 0) {
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

            const escapedPhrase = searchPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // \b word boundary so "Ring" doesn't match "hamstring" or "during"
            return new RegExp(`\\b${escapedPhrase}`, 'i').test(combinedText);
          });
        }

        if (selectedMovements.length > 0) {
          const knownNames = exerciseNames.size > 0 ? exerciseNames : undefined;
          filteredResults = filteredResults.filter(wod => {
            const wodMovements = extractMovementsFromWod(wod, knownNames);
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

        setSearchResults(filteredResults);

        const allMovements = extractMovements(filteredResults, exerciseNames.size > 0 ? exerciseNames : undefined);
        setMovements(allMovements);
      } catch (error) {
        console.error('Error searching WODs:', error);
      }
    };

    const timeoutId = setTimeout(searchWODs, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedMovements, selectedWorkoutTypes, selectedTracks, selectedSessionTypes, includedSectionTypes, selectedSectionTypeFilter, selectedMembers, exerciseNames]);

  const fetchExerciseNames = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name, display_name, category');

      if (error) throw error;

      const names = new Set<string>();
      data?.forEach(ex => {
        if (ex.display_name) names.add(ex.display_name);
      });
      setExerciseNames(names);
      setExerciseList(data || []);
    } catch (error) {
      console.error('Error fetching exercise names:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('id, name, date_of_birth')
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (membersError) throw membersError;

      // Get session IDs with published wods
      const { data: publishedSessions, error: psError } = await supabase
        .from('weekly_sessions')
        .select('id, wods!inner(workout_publish_status)')
        .eq('wods.workout_publish_status', 'published');

      if (psError) throw psError;
      const publishedSessionIds = new Set(publishedSessions?.map(s => s.id) || []);

      // Get confirmed bookings
      const { data: bookingsData, error: bError } = await supabase
        .from('bookings')
        .select('member_id, session_id')
        .eq('status', 'confirmed');

      if (bError) throw bError;

      const memberCounts: Record<string, number> = {};
      bookingsData?.forEach(b => {
        if (publishedSessionIds.has(b.session_id)) {
          memberCounts[b.member_id] = (memberCounts[b.member_id] || 0) + 1;
        }
      });

      setMembers(
        (membersData || []).map(m => ({
          id: m.id,
          name: m.name,
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

      // Query from weekly_sessions to match search results (excludes orphaned wods)
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('weekly_sessions')
        .select(`
          wods!inner (
            track_id,
            title,
            sections,
            workout_publish_status
          )
        `)
        .eq('wods.workout_publish_status', 'published');

      if (sessionsError) throw sessionsError;

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
