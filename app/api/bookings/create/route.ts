import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { notifyBookingConfirmed, notifyBookingWaitlisted } from '@/lib/notifications';
import { getBookingRules, getLockLeadMinutesForSessionType, getMaxVisibleSessionDate, sessionStartInstant } from '@/lib/bookingRules';

export async function POST(request: NextRequest) {
  try {
    // Get auth token from Authorization header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.replace('Bearer ', '');

    // Create Supabase client with auth token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sessionId, memberId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Determine which member to book for (default to authenticated user)
    const bookingMemberId = memberId || user.id;

    // If booking for someone else, verify they're a family member
    if (bookingMemberId !== user.id) {
      const { data: familyMember, error: familyError } = await supabase
        .from('members')
        .select('id, primary_member_id, account_type')
        .eq('id', bookingMemberId)
        .single();

      if (familyError || !familyMember) {
        return NextResponse.json(
          { error: 'Family member not found' },
          { status: 404 }
        );
      }

      // Verify the authenticated user is the primary member
      if (familyMember.account_type !== 'family_member' || familyMember.primary_member_id !== user.id) {
        return NextResponse.json(
          { error: 'You can only book for your own family members' },
          { status: 403 }
        );
      }
    }

    // Check if member is active and get payment/subscription info
    const { data: member } = await supabase
      .from('members')
      .select(`
        id, status, membership_types, primary_payment_method, ten_card_holder_id,
        guardian_only, wellpass_booking_restricted,
        ten_card_sessions_used, ten_card_total, ten_card_expiry_date,
        athlete_subscription_status, athlete_subscription_end
      `)
      .eq('id', bookingMemberId)
      .single();

    if (!member || member.status !== 'active') {
      return NextResponse.json(
        { error: 'Only active members can book sessions' },
        { status: 403 }
      );
    }

    // Guardian-only accounts (parents who don't train, only manage kids) cannot book sessions
    // for themselves. Their family-member kids can still book via the primary→family path.
    if (member.guardian_only) {
      return NextResponse.json(
        { error: 'Dein Konto ist nur für Erziehungsberechtigte eingerichtet — du trainierst nicht selbst. Füge zuerst ein Familienmitglied (z.B. dein Kind) hinzu, um einen Kurs zu buchen.' },
        { status: 403 }
      );
    }

    // Wellpass under-attendance restriction: cap at 1 confirmed booking per Mon–Sun
    // calendar week PER HOUSEHOLD when their household has fallen below the WP
    // check-in threshold. "Household" = all members linked to the same wellpass
    // identity (spouse + kids). Set by the Wellpass import in /api/coach/wellpass/import;
    // cleared by next import showing recovery, or manually by the coach via the Wellpass tab.
    if (member.wellpass_booking_restricted) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Need session.date for the week calculation — fetch a slim version up front.
      const { data: sessionForWeek } = await supabase
        .from('weekly_sessions')
        .select('date')
        .eq('id', sessionId)
        .single();
      if (sessionForWeek?.date) {
        const [yy, mm, dd] = sessionForWeek.date.split('-').map(Number);
        const dt = new Date(Date.UTC(yy, mm - 1, dd));
        const dow = dt.getUTCDay();
        const offsetToMon = dow === 0 ? -6 : 1 - dow;
        const mon = new Date(dt);
        mon.setUTCDate(dt.getUTCDate() + offsetToMon);
        const sun = new Date(mon);
        sun.setUTCDate(mon.getUTCDate() + 6);
        const fmt = (x: Date) =>
          `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`;
        const monStr = fmt(mon);
        const sunStr = fmt(sun);

        const { data: weekSessions } = await supabase
          .from('weekly_sessions')
          .select('id')
          .gte('date', monStr)
          .lte('date', sunStr);
        const sessionIds = (weekSessions ?? []).map((s) => s.id);

        if (sessionIds.length > 0) {
          // Resolve household: all members linked to the same WP identity (or
          // identities) as the booking member. Service-role required — RLS hides
          // cross-member household rows from an athlete's own auth context.
          const { data: ownIdentityRows } = await supabaseAdmin
            .from('wellpass_identity_members')
            .select('wellpass_identity_id')
            .eq('member_id', bookingMemberId);
          const identityIds = Array.from(
            new Set((ownIdentityRows ?? []).map((r) => r.wellpass_identity_id))
          );

          // If ANY linked identity is paused (injury/vacation/etc.), lift the
          // 1/week restriction entirely. Pause is a hard override.
          let isPaused = false;
          if (identityIds.length > 0) {
            const { data: pausedRows } = await supabaseAdmin
              .from('wellpass_identities')
              .select('id')
              .in('id', identityIds)
              .not('paused_at', 'is', null)
              .limit(1);
            isPaused = !!(pausedRows && pausedRows.length > 0);
          }

          if (!isPaused) {
            let householdMemberIds: string[] = [bookingMemberId];
            if (identityIds.length > 0) {
              const { data: householdRows } = await supabaseAdmin
                .from('wellpass_identity_members')
                .select('member_id')
                .in('wellpass_identity_id', identityIds);
              const ids = new Set((householdRows ?? []).map((r) => r.member_id));
              ids.add(bookingMemberId); // defensive
              householdMemberIds = Array.from(ids);
            }

            const { count: weekBookings } = await supabaseAdmin
              .from('bookings')
              .select('id', { count: 'exact', head: true })
              .in('member_id', householdMemberIds)
              .eq('status', 'confirmed')
              .in('session_id', sessionIds);

            if ((weekBookings ?? 0) >= 1) {
              return NextResponse.json(
                {
                  error:
                    'Dein Wellpass-Haushalt hat in dieser Woche bereits einen Kurs gebucht. Wellpass-Haushalte werden auf 1 Buchung pro Woche begrenzt, wenn die Mindestanzahl an Check-ins in der Vorwoche nicht erreicht wurde. Bitte sprich mit Coach Chris, wenn das ein Fehler ist.',
                },
                { status: 403 }
              );
            }
          }
        }
      }
    }

    // Resolve effective payment method: explicit primary_payment_method wins, else first
    // membership type. This disambiguates multi-membership members (e.g. Miriam =
    // wellpass + ten_card; her self-bookings should not burn her kids' card).
    const effectiveMethod = member.primary_payment_method || member.membership_types?.[0] || null;
    const usesTenCard = effectiveMethod === 'ten_card';
    const now = new Date();

    // Resolve 10-card holder. NULL = debit own card; otherwise debit a different member's
    // card (kid sharing parent's card, e.g. Miriam's three kids).
    const holderId = usesTenCard ? (member.ten_card_holder_id || member.id) : null;

    let holderCard: { id: string; ten_card_sessions_used: number; ten_card_total: number | null; ten_card_expiry_date: string | null } | null = null;
    if (usesTenCard) {
      if (holderId === member.id) {
        holderCard = {
          id: member.id,
          ten_card_sessions_used: member.ten_card_sessions_used || 0,
          ten_card_total: member.ten_card_total,
          ten_card_expiry_date: member.ten_card_expiry_date,
        };
      } else {
        const { data: holder } = await supabase
          .from('members')
          .select('id, ten_card_sessions_used, ten_card_total, ten_card_expiry_date')
          .eq('id', holderId)
          .single();
        holderCard = holder;
      }
    }

    // Validate 10-card balance and expiry on the holder's card.
    let tenCardRemaining = 0;
    if (usesTenCard) {
      if (!holderCard) {
        return NextResponse.json(
          { error: '10-card holder not found' },
          { status: 400 }
        );
      }
      const total = holderCard.ten_card_total || 10;
      const used = holderCard.ten_card_sessions_used || 0;
      tenCardRemaining = total - used;
      const expired = holderCard.ten_card_expiry_date && new Date(holderCard.ten_card_expiry_date) < now;
      if (expired) {
        return NextResponse.json(
          { error: 'The 10-card has expired. Please purchase a new 10-card to book classes.' },
          { status: 402 } // Payment Required
        );
      }
      // Card-full is NOT a hard block — booking proceeds; counter increments past total.
      // Coach reviews via Members → 10-Card tab and decides how to resolve.
    }

    // Check if session exists and is published
    const { data: session, error: sessionError } = await supabase
      .from('weekly_sessions')
      .select('*, bookings(*)')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.status !== 'published') {
      return NextResponse.json(
        { error: 'This session is not available for booking' },
        { status: 400 }
      );
    }

    // Block parents (primary accounts with at least one registered family member) from
    // booking Kids / Eltern-Kind-Turnen / Teens classes under their own name. They must
    // book those classes via the primary→family path. They can still book non-kids
    // classes (WOD, Foundations, etc.) for themselves. Mirrors the inline UI guard in
    // app/member/book/page.tsx. Uses startsWith to match age-suffixed names like
    // "Kids & Teens 6-9", "FitKids Turnen 4-6" (matcher source: utils/card-utils.ts).
    if (bookingMemberId === user.id) {
      const kidsKeywords = ['kids', 'kids & teens', 'kids and teens', 'fitkids turnen', 'elternkind turnen'];
      const sessionTypeLower = (session.workout_type || '').toLowerCase();
      const isKidsClass = kidsKeywords.some(k => sessionTypeLower === k || sessionTypeLower.startsWith(k));
      if (isKidsClass) {
        const { data: family } = await supabase
          .from('members')
          .select('id')
          .eq('primary_member_id', user.id)
          .eq('account_type', 'family_member')
          .limit(1);
        if (family && family.length > 0) {
          return NextResponse.json(
            { error: 'Diese Klasse ist für Kinder/Jugendliche — bitte buche unter dem Namen deines Kindes (Familienmitglied), nicht unter deinem eigenen.' },
            { status: 403 }
          );
        }
      }
    }

    // Load coach-configurable booking rules
    const rules = await getBookingRules();

    // Check if session is locked (manually or auto-locked by lead time before start).
    // Per-session-type override wins over the global booking_rules value.
    // (weekly_sessions.workout_type is legacy-named but holds the session_type value.)
    const leadMinutes = await getLockLeadMinutesForSessionType(session.workout_type);
    const sessionDateTime = sessionStartInstant(session.date, session.time);
    const lockThreshold = new Date(sessionDateTime.getTime() - leadMinutes * 60 * 1000);
    const isEffectivelyLocked =
      session.is_locked === true ||
      (session.is_locked === null && lockThreshold < new Date());

    if (isEffectivelyLocked) {
      return NextResponse.json(
        { error: 'This session is locked and no longer accepting bookings' },
        { status: 403 }
      );
    }

    // Next-week release gate: reject sessions whose date is past the visibility cutoff.
    // Mirrors the athlete-side query filter so determined replays of /api/bookings/create
    // can't bypass the gate (see getMaxVisibleSessionDate for the cutoff logic).
    // Wellpass-restricted members get the release shifted later — matches the page-side
    // gating in /member/book.
    const maxVisibleDate = getMaxVisibleSessionDate(rules, undefined, member.wellpass_booking_restricted === true);
    const sessionDayDate = new Date(`${session.date}T00:00:00`);
    if (sessionDayDate > maxVisibleDate) {
      return NextResponse.json(
        { error: 'This session is not yet open for booking' },
        { status: 403 }
      );
    }

    // Advance-booking horizon cap
    if (rules.advance_booking_days !== null) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const maxDate = new Date(today);
      maxDate.setDate(today.getDate() + rules.advance_booking_days);
      const sessionDayOnly = new Date(session.date);
      if (sessionDayOnly > maxDate) {
        return NextResponse.json(
          { error: `You can only book up to ${rules.advance_booking_days} days in advance` },
          { status: 403 }
        );
      }
    }

    // Per-day cap
    if (rules.max_bookings_per_day !== null) {
      const { data: dayBookings } = await supabase
        .from('bookings')
        .select('id, weekly_sessions!inner(date)')
        .eq('member_id', bookingMemberId)
        .in('status', ['confirmed', 'waitlist'])
        .eq('weekly_sessions.date', session.date);

      if ((dayBookings?.length || 0) >= rules.max_bookings_per_day) {
        return NextResponse.json(
          { error: `Daily booking limit reached (${rules.max_bookings_per_day} per day)` },
          { status: 403 }
        );
      }
    }

    // Per-week cap (Monday–Sunday containing session.date)
    if (rules.max_bookings_per_week !== null) {
      const sessionDay = new Date(session.date);
      const dayOfWeek = sessionDay.getDay(); // 0 = Sunday
      const monday = new Date(sessionDay);
      monday.setDate(sessionDay.getDate() - ((dayOfWeek + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const fmt = (d: Date) => d.toISOString().split('T')[0];

      const { data: weekBookings } = await supabase
        .from('bookings')
        .select('id, weekly_sessions!inner(date)')
        .eq('member_id', bookingMemberId)
        .in('status', ['confirmed', 'waitlist'])
        .gte('weekly_sessions.date', fmt(monday))
        .lte('weekly_sessions.date', fmt(sunday));

      if ((weekBookings?.length || 0) >= rules.max_bookings_per_week) {
        return NextResponse.json(
          { error: `Weekly booking limit reached (${rules.max_bookings_per_week} per week)` },
          { status: 403 }
        );
      }
    }

    // Check if member already has a booking for this session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingBooking = session.bookings?.find((b: any) => b.member_id === bookingMemberId && (b.status === 'confirmed' || b.status === 'waitlist'));
    if (existingBooking) {
      return NextResponse.json(
        { error: 'This member has already booked this session' },
        { status: 400 }
      );
    }

    // Count confirmed bookings + trial athletes toward capacity. OG bookings (is_og=true)
    // are off-capacity — OG athletes are admitted alongside the class but don't do the WOD,
    // so they don't consume a slot. Trial names live in weekly_sessions.trial_names (string[])
    // and DO consume capacity (matches the coach-side useBookingManagement check).
    // is_trial bookings are also off-capacity (S351) — they shadow a trial_names entry which
    // already counts; including them would double-book the slot.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const confirmedBookingCount = session.bookings?.filter((b: any) => b.status === 'confirmed' && !b.is_og && !b.is_trial).length || 0;
    const trialCount = (session.trial_names as string[] | null)?.length ?? 0;
    const onCapacityCount = confirmedBookingCount + trialCount;

    // Determine booking status (confirmed or waitlist). capacity === 0 means unlimited.
    const bookingStatus = session.capacity === 0 || onCapacityCount < session.capacity ? 'confirmed' : 'waitlist';

    // Create booking. ten_card_consumed=true if this booking eats a session from the
    // holder's card. The DB trigger (S351 Path B) recomputes members.ten_card_sessions_used
    // from the sum of consumed=true bookings — we no longer manually +1 the counter.
    const consumesCard = bookingStatus === 'confirmed' && usesTenCard;
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        session_id: sessionId,
        member_id: bookingMemberId,
        status: bookingStatus,
        booked_at: new Date().toISOString(),
        ten_card_consumed: consumesCard,
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Booking creation error:', bookingError);
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      );
    }

    // For the response, re-read the holder's now-trigger-maintained counter so the UI
    // gets accurate remaining.
    let newTenCardRemaining = tenCardRemaining;
    if (consumesCard && holderCard) {
      const { data: refreshedHolder } = await supabase
        .from('members')
        .select('ten_card_total, ten_card_sessions_used')
        .eq('id', holderCard.id)
        .single();
      if (refreshedHolder) {
        newTenCardRemaining = (refreshedHolder.ten_card_total || 10) - (refreshedHolder.ten_card_sessions_used || 0);
      }
    }

    // Fire-and-forget push notification
    if (bookingStatus === 'confirmed') {
      notifyBookingConfirmed(bookingMemberId, session.date, session.time);
    } else {
      notifyBookingWaitlisted(bookingMemberId, session.date, session.time);
    }

    // Build response with payment info for UI warnings
    const response: {
      success: boolean;
      message: string;
      booking: { id: string; status: string };
      paymentInfo?: {
        type: 'subscription' | '10card';
        sessionsRemaining?: number;
        lowSessionsWarning?: boolean;
      };
    } = {
      success: true,
      message: bookingStatus === 'confirmed'
        ? 'Session booked successfully'
        : 'Added to waitlist. Coach will be notified.',
      booking: {
        id: booking.id,
        status: booking.status
      }
    };

    // Add 10-card warning if applicable
    if (usesTenCard && booking.status === 'confirmed') {
      response.paymentInfo = {
        type: '10card',
        sessionsRemaining: newTenCardRemaining,
        lowSessionsWarning: newTenCardRemaining <= 3
      };

      if (newTenCardRemaining < 0) {
        const over = -newTenCardRemaining;
        response.message = `⚠️ Session booked, but your 10-card is over its limit by ${over}. Please purchase a new 10-card.`;
      } else if (newTenCardRemaining === 0) {
        response.message = '🎫 This was your FINAL 10-card session! Session booked successfully.';
      } else if (newTenCardRemaining === 1) {
        response.message = '⚠️ LAST SESSION REMAINING on your 10-card! Session booked successfully.';
      } else if (newTenCardRemaining <= 3) {
        response.message += ` ⚠️ (${newTenCardRemaining} sessions remaining on your 10-card)`;
      }
    }

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Book session error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
