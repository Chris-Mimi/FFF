'use client';

import { WODFormData } from '@/components/coach/WorkoutModal';
import { supabase } from '@/lib/supabase';
import { extractMovements } from '@/utils/movement-extraction';
import { useEffect, useState } from 'react';

interface UseCoachDataProps {
  searchQuery: string;
  selectedMovements: string[];
  selectedWorkoutTypes: string[];
  selectedTracks: string[];
  excludedSectionTypes: string[];
}

export const useCoachData = ({
  searchQuery,
  selectedMovements,
  selectedWorkoutTypes,
  selectedTracks,
  excludedSectionTypes,
}: UseCoachDataProps) => {
  const [wods, setWods] = useState<Record<string, WODFormData[]>>({});
  const [tracks, setTracks] = useState<Array<{ id: string; name: string }>>([]);
  const [trackCounts, setTrackCounts] = useState<Record<string, number>>({});
  const [workoutTypes, setWorkoutTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [sectionTypes, setSectionTypes] = useState<Array<{ id: string; name: string; display_order: number }>>([]);
  const [searchResults, setSearchResults] = useState<WODFormData[]>([]);
  const [movements, setMovements] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchWODs = async () => {
    try {
      // Fetch all bookings
      const { data: allBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('session_id, status');

      if (bookingsError) throw bookingsError;

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
          wods (
            id,
            title,
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

        const bookingInfo = {
          session_id: session.id,
          confirmed_count: confirmedCount,
          waitlist_count: waitlistCount,
          capacity: session.capacity,
          time: session.time
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const workout = session.wods as any;
        if (workout) {
          const hasContent = workout.sections && workout.sections.length > 0;
          const publishStatus = hasContent ? (workout.workout_publish_status || 'draft') : null;

          grouped[dateKey].push({
            id: workout.id,
            title: workout.title,
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
            booking_info: bookingInfo,
          });
        } else {
          grouped[dateKey].push({
            id: `session-${session.id}`,
            title: 'Session',
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
      !selectedTracks.length
    ) {
      setSearchResults([]);
      setMovements(new Map());
      return;
    }

    const searchWODs = async () => {
      try {
        let query = supabase.from('wods').select('*');

        if (selectedTracks.length > 0) {
          query = query.in('track_id', selectedTracks);
        }

        const { data, error } = await query.order('date', { ascending: false }).limit(500);

        if (error) throw error;

        const results: WODFormData[] =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data?.map((wod: any) => ({
            id: wod.id,
            title: wod.title,
            track_id: wod.track_id || undefined,
            workout_type_id: wod.workout_type_id || undefined,
            classTimes: wod.class_times,
            maxCapacity: wod.max_capacity,
            date: wod.date,
            sections: wod.sections,
            coach_notes: wod.coach_notes || undefined,
            is_published: wod.is_published || false,
            google_event_id: wod.google_event_id || null,
          })) || [];

        let filteredResults = results;

        if (searchQuery) {
          const searchTerms = searchQuery.trim().toLowerCase().split(/\s+/);
          filteredResults = filteredResults.filter(wod => {
            const sectionsToSearch = excludedSectionTypes.length > 0
              ? wod.sections.filter(s => !excludedSectionTypes.includes(s.type))
              : wod.sections;

            const combinedText =
              `${wod.title} ${wod.coach_notes || ''} ${sectionsToSearch.map(s => s.content).join(' ')}`.toLowerCase();
            return searchTerms.some(term => combinedText.includes(term));
          });
        }

        if (selectedMovements.length > 0) {
          filteredResults = filteredResults.filter(wod => {
            const combinedContent = wod.sections.map(s => s.content.toLowerCase()).join(' ');
            return selectedMovements.every(movement =>
              new RegExp(`\\b${movement.toLowerCase()}\\b`, 'i').test(combinedContent)
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

        setSearchResults(filteredResults);

        const allMovements = extractMovements(filteredResults);
        setMovements(allMovements);
      } catch (error) {
        console.error('Error searching WODs:', error);
      }
    };

    const timeoutId = setTimeout(searchWODs, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedMovements, selectedWorkoutTypes, selectedTracks, excludedSectionTypes]);

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

      const { data: wodsData, error: wodsError } = await supabase.from('wods').select('track_id');

      if (wodsError) throw wodsError;

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

  return {
    wods,
    setWods,
    tracks,
    trackCounts,
    workoutTypes,
    sectionTypes,
    searchResults,
    setSearchResults,
    movements,
    setMovements,
    loading,
    setLoading,
    fetchWODs,
    fetchTracksAndCounts,
  };
};
