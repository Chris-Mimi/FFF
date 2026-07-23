import { useState, useEffect } from 'react';
import { toast } from 'sonner';
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
  is_locked: boolean | null;
  is_private: boolean;
  pre_cancel_status: string | null;
  trial_names: string[];
  drop_in_names: string[];
}

export interface Booking {
  id: string;
  status: 'confirmed' | 'waitlist' | 'cancelled' | 'no_show' | 'late_cancel' | 'coach_cancelled';
  booked_at: string;
  updated_at: string;
  is_og: boolean;
  is_trial: boolean;
  linked_trial_name: string | null;
  // null if athlete isn't paying with a 10-card on this booking. Otherwise the
  // holder's remaining sessions (counter delta, can be negative for overage per S347).
  tenCardRemaining: number | null;
  member: {
    id: string;
    name: string | null;
    email: string;
    display_name: string | null;
    account_type: 'primary' | 'family_member' | null;
  };
}

export interface Member {
  id: string;
  name: string;
  email: string;
  membership_types: string[];
  ten_card_sessions_used: number;
  primary_payment_method: string | null;
  ten_card_holder_id: string | null;
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

      // Fetch bookings with member details + 10-card fields so the booking row can
      // surface a "Last session!" / "2 left" badge for athletes paying via 10-card.
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          booked_at,
          updated_at,
          is_og,
          is_trial,
          linked_trial_name,
          members!bookings_member_id_fkey (
            id,
            name,
            email,
            display_name,
            account_type,
            membership_types,
            primary_payment_method,
            ten_card_holder_id,
            ten_card_total,
            ten_card_sessions_used,
            ten_card_purchase_date
          )
        `)
        .eq('session_id', sessionId)
        .order('booked_at', { ascending: true });

      if (bookingsError) throw bookingsError;

      // For each 10-card booker, surface the holder's ACTIVE card state — but
      // only if this session falls within the active card's window (date >=
      // active card's purchase_date). Bookings on a previous card (now archived)
      // get no badge, because the archive only stores the frozen final count and
      // can't tell us what the running counter looked like at booking time —
      // labelling 10 past sessions as "Card full" is misleading.
      //
      // Concrete cases:
      //   - Markus on his current card (9/10): all his bookings within this card's
      //     window show "1 left" — the actionable reminder to sell him a new card.
      //   - Aline after coach closed her old card today and issued a new one
      //     starting tomorrow: today's session falls BEFORE the new card's start,
      //     so no badge fires (her old card is closed; her new card is fresh).
      //   - Anyone with a fresh card (remaining > 2): no badge.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bookersRaw = (bookingsData || []).map(b => (b as any).members);

      type HolderCard = {
        total: number;
        used: number;
        purchaseDate: string | null;
      };
      const holderMap = new Map<string, HolderCard>();

      // Seed with booker's own row when they're their own holder; collect shared
      // holder IDs for a separate fetch.
      const sharedHolderIds = new Set<string>();
      for (const m of bookersRaw) {
        if (!m) continue;
        const effective = m.primary_payment_method || m.membership_types?.[0] || null;
        if (effective !== 'ten_card') continue;
        if (m.ten_card_holder_id) {
          sharedHolderIds.add(m.ten_card_holder_id as string);
        } else {
          const pd = m.ten_card_purchase_date
            ? (m.ten_card_purchase_date as string).split('T')[0]
            : null;
          holderMap.set(m.id, {
            total: m.ten_card_total ?? 10,
            used: m.ten_card_sessions_used ?? 0,
            purchaseDate: pd,
          });
        }
      }

      if (sharedHolderIds.size > 0) {
        const { data: holders } = await supabase
          .from('members')
          .select('id, ten_card_total, ten_card_sessions_used, ten_card_purchase_date')
          .in('id', Array.from(sharedHolderIds));
        (holders || []).forEach(h => {
          const pd = h.ten_card_purchase_date
            ? (h.ten_card_purchase_date as string).split('T')[0]
            : null;
          holderMap.set(h.id, {
            total: h.ten_card_total ?? 10,
            used: h.ten_card_sessions_used ?? 0,
            purchaseDate: pd,
          });
        });
      }

      const sessionDateForBooking = (sessionData?.date ?? '').includes('T')
        ? (sessionData?.date ?? '').split('T')[0]
        : (sessionData?.date ?? '');

      // Transform data to rename members to member for consistency + compute tenCardRemaining.
      const transformedBookings = (bookingsData || []).map(booking => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = (booking as any).members;
        const effective = raw?.primary_payment_method || raw?.membership_types?.[0] || null;
        let tenCardRemaining: number | null = null;
        if (effective === 'ten_card' && raw) {
          const holderId = (raw.ten_card_holder_id as string | null) || raw.id;
          const card = holderMap.get(holderId);
          // Only attribute if the session falls within the active card's window.
          if (card?.purchaseDate && sessionDateForBooking >= card.purchaseDate) {
            tenCardRemaining = card.total - card.used;
          }
        }
        return {
          id: booking.id,
          status: booking.status as Booking['status'],
          booked_at: booking.booked_at,
          updated_at: booking.updated_at,
          is_og: booking.is_og ?? false,
          is_trial: booking.is_trial ?? false,
          linked_trial_name: (booking as { linked_trial_name?: string | null }).linked_trial_name ?? null,
          tenCardRemaining,
          // Strip the 10-card fields from the public member shape; downstream only
          // needs the original five.
          member: {
            id: raw?.id,
            name: raw?.name ?? null,
            email: raw?.email,
            display_name: raw?.display_name ?? null,
            account_type: raw?.account_type ?? null,
          },
        };
      });

      setBookings(transformedBookings);

      // Fetch all active members for manual booking
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('id, name, display_name, email, membership_types, ten_card_sessions_used, primary_payment_method, ten_card_holder_id')
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (membersError) throw membersError;

      // Resolve display_name → name (family-member kids only have display_name set).
      const normalizedMembers = (membersData || []).map(m => ({
        ...m,
        name: m.display_name || m.name || '',
      }));

      // Filter out members who already have active bookings
      const available = filterAvailableMembers(
        normalizedMembers,
        transformedBookings
      );

      setAvailableMembers(available);
    } catch (error) {
      console.error('Error fetching session details:', error);
      toast.error('Failed to load session details');
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
