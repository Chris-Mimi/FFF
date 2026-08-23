import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { notifyBookingConfirmed, notifyBookingWaitlisted } from '@/lib/notifications';
import { getBookingRules, getLockLeadMinutesForSessionType, getMaxVisibleSessionDate, sessionAutoLockInstant, berlinWallClock, berlinWallTimeToUTC } from '@/lib/bookingRules';

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

    if (session.status !== 'published' || session.is_private) {
      // Private events are never bookable by athletes, whatever their status. (S399)
      return NextResponse.json(
        { error: 'This session is not available for booking' },
        { status: 400 }
      );
    }

    // Kids / Eltern-Kind-Turnen / Teens classes can only be booked under a CHILD's
    // name (a registered family_member, via the primary→family path), never under the
    // adult's own name — regardless of whether they've registered a child yet. To book
    // one, a parent must first register their child as a family member. Non-kids classes
    // (WOD, Foundations, Diapers & Dumbbells, etc.) are unaffected and bookable for self.
    // Mirrors the inline UI guard in app/member/book/page.tsx. Normalize (strip
    // spaces/hyphens/punctuation) so every spelling matches — e.g.
    // "Eltern-Kind-Turnen (2-6J)" and "ElternKind Turnen" both → "elternkindturnen"
    // (hyphenated variants previously slipped past the startsWith match).
    if (bookingMemberId === user.id) {
      const kidsKeywords = ['kids', 'kidsteens', 'kidsandteens', 'fitkidsturnen', 'elternkindturnen'];
      const sessionTypeNorm = (session.workout_type || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const isKidsClass = sessionTypeNorm !== '' && kidsKeywords.some(k => sessionTypeNorm.startsWith(k));
      if (isKidsClass) {
        return NextResponse.json(
          { error: 'Diese Klasse ist für Kinder/Jugendliche — bitte registriere dein Kind als Familienmitglied und buche unter seinem Namen, nicht unter deinem eigenen.' },
          { status: 403 }
        );
      }
    }

    // Load coach-configurable booking rules
    const rules = await getBookingRules();

    // Check if session is locked (manually or auto-locked by lead time before start).
    // Per-session-type override wins over the global booking_rules value.
    // (weekly_sessions.workout_type is legacy-named but holds the session_type value.)
    const leadMinutes = await getLockLeadMinutesForSessionType(session.workout_type);
    const lockThreshold = sessionAutoLockInstant(session.date, session.time, leadMinutes, rules);
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

    // Wellpass under-attendance restriction (release-day cap).
    // Blocked members (members.wellpass_booking_restricted=true) get their booking
    // window opened later via the offset above. On top of that, on the RELEASE DAY
    // itself they may make only ONE booking — so when their (later) window opens they
    // grab a single class and leave the rest of that day's release for priority
    // athletes. From the day AFTER release onward there is no special cap; they book
    // the rest of the week freely (subject to the normal everyone-limits below).
    // Per-member (not household). Paused identities are fully exempt.
    // Hoisted so the post-insert reconciliation (after the booking is created) can
    // re-check atomicity: the count check below is check-then-act, so two requests
    // fired in quick succession can both read "0 bookings today" before either inserts.
    let releaseDayCapApplies = false;
    let releaseDayStart: Date | null = null;
    const releaseDayCapMessage =
      'Als eingeschränktes Wellpass-Mitglied kannst du am Veröffentlichungstag (Sonntag) nur einen Kurs buchen. Ab morgen kannst du den Rest der Woche buchen. Bitte sprich mit Coach Chris, wenn das ein Fehler ist.';
    if (member.wellpass_booking_restricted) {
      const nowBerlin = berlinWallClock(new Date());
      if (nowBerlin.dow === rules.next_week_release_day_of_week) {
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Pause override: if ANY linked identity is paused (injury/vacation), lift
        // the restriction entirely. Service-role — RLS hides cross-member rows.
        const { data: ownIdentityRows } = await supabaseAdmin
          .from('wellpass_identity_members')
          .select('wellpass_identity_id')
          .eq('member_id', bookingMemberId);
        const identityIds = Array.from(
          new Set((ownIdentityRows ?? []).map((r) => r.wellpass_identity_id))
        );
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
          // Berlin-day boundaries for "today" → filter bookings.created_at.
          releaseDayStart = berlinWallTimeToUTC(nowBerlin.year, nowBerlin.month, nowBerlin.day, 0, 0, 0);
          releaseDayCapApplies = true;
          const dayEnd = new Date(releaseDayStart.getTime() + 24 * 60 * 60 * 1000);

          const { count: todaysBookings } = await supabaseAdmin
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('member_id', bookingMemberId)
            .eq('status', 'confirmed')
            .gte('created_at', releaseDayStart.toISOString())
            .lt('created_at', dayEnd.toISOString());

          if ((todaysBookings ?? 0) >= 1) {
            return NextResponse.json({ error: releaseDayCapMessage }, { status: 403 });
          }
        }
      }
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

    // Release-day cap — concurrency reconciliation. The pre-check above is check-then-act,
    // so two rapid requests can both pass it before either inserts (observed: a restricted
    // member booked 2 sessions ~9s apart on release day). Now that this booking is committed,
    // re-check: if another CONFIRMED release-day booking by this member was created earlier,
    // this request lost the race — roll it back. Earliest created_at wins, deterministically.
    // (Deleting the booking also auto-corrects the ten-card counter via the S351 trigger.)
    if (releaseDayCapApplies && releaseDayStart && bookingStatus === 'confirmed') {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { count: earlierBookings } = await supabaseAdmin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('member_id', bookingMemberId)
        .eq('status', 'confirmed')
        .gte('created_at', releaseDayStart.toISOString())
        .lt('created_at', booking.created_at)
        .neq('id', booking.id);
      if ((earlierBookings ?? 0) >= 1) {
        await supabaseAdmin.from('bookings').delete().eq('id', booking.id);
        return NextResponse.json({ error: releaseDayCapMessage }, { status: 403 });
      }
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
