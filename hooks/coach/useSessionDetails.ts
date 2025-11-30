import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { filterAvailableMembers } from '@/lib/coach/bookingHelpers';
import { padTime } from '@/lib/coach/modalStateHelpers';

export interface SessionDetails {
  id: string;
  date: string;
  time: string;
  capacity: number;
  status: string;
  workout_id: string;
}

export interface Booking {
  id: string;
  status: 'confirmed' | 'waitlist' | 'cancelled' | 'no_show' | 'late_cancel';
  booked_at: string;
  member: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Member {
  id: string;
  name: string;
  email: string;
  membership_types: string[];
  ten_card_sessions_used: number;
}

interface UseSessionDetailsResult {
  session: SessionDetails | null;
  bookings: Booking[];
  availableMembers: Member[];
  loading: boolean;
  newCapacity: number;
  newTime: string;
  setNewCapacity: (capacity: number) => void;
  setNewTime: (time: string) => void;
  fetchSessionDetails: () => Promise<void>;
}

export function useSessionDetails(
  sessionId: string,
  isOpen: boolean
): UseSessionDetailsResult {
  const [session, setSession] = useState<SessionDetails | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availableMembers, setAvailableMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCapacity, setNewCapacity] = useState(0);
  const [newTime, setNewTime] = useState('12:00');

  const fetchSessionDetails = async () => {
    setLoading(true);
    try {
      // Fetch session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('weekly_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      setSession(sessionData);
      setNewCapacity(sessionData.capacity);
      setNewTime(padTime(sessionData.time));

      // Fetch bookings with member details
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          booked_at,
          members!bookings_member_id_fkey (
            id,
            name,
            email
          )
        `)
        .eq('session_id', sessionId)
        .order('booked_at', { ascending: true });

      if (bookingsError) throw bookingsError;

      // Transform data to rename members to member for consistency
      const transformedBookings = (bookingsData || []).map(booking => ({
        id: booking.id,
        status: booking.status as Booking['status'],
        booked_at: booking.booked_at,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        member: (booking as any).members, // Rename members field to member
      }));

      setBookings(transformedBookings);

      // Fetch all active members for manual booking
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('id, name, email, membership_types, ten_card_sessions_used')
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (membersError) throw membersError;

      // Filter out members who already have active bookings
      const available = filterAvailableMembers(
        membersData || [],
        transformedBookings
      );

      setAvailableMembers(available);
    } catch (error) {
      console.error('Error fetching session details:', error);
      alert('Failed to load session details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchSessionDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sessionId]);

  return {
    session,
    bookings,
    availableMembers,
    loading,
    newCapacity,
    newTime,
    setNewCapacity,
    setNewTime,
    fetchSessionDetails,
  };
}
