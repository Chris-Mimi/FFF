import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';
import type { WellpassIdentityRow, WellpassWeeklyCheckin, WellpassLinkedMember, WellpassWeeklyBookings } from '@/types/wellpass';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const { data: identities, error: idErr } = await supabaseAdmin
      .from('wellpass_identities')
      .select('*')
      .order('tracked', { ascending: false })
      .order('wellpass_name', { ascending: true });

    if (idErr) {
      console.error('[wellpass-list] identities error:', idErr);
      return NextResponse.json({ error: 'Failed to load identities' }, { status: 500 });
    }

    if (!identities || identities.length === 0) {
      return NextResponse.json({ rows: [] });
    }

    const identityIds = identities.map((i) => i.id);

    const { data: links } = await supabaseAdmin
      .from('wellpass_identity_members')
      .select('wellpass_identity_id, members!inner(id, name, athlete_subscription_status, wellpass_booking_restricted)')
      .in('wellpass_identity_id', identityIds);

    const linksByIdentity = new Map<string, WellpassLinkedMember[]>();
    for (const link of links ?? []) {
      const rawMembers = (link as { members: unknown }).members;
      const m = Array.isArray(rawMembers) ? rawMembers[0] : rawMembers;
      if (!m) continue;
      const member = m as {
        id: string;
        name: string;
        athlete_subscription_status: 'trial' | 'active' | 'past_due' | 'expired';
        wellpass_booking_restricted: boolean;
      };
      const arr = linksByIdentity.get(link.wellpass_identity_id) ?? [];
      arr.push({
        member_id: member.id,
        name: member.name,
        athlete_subscription_status: member.athlete_subscription_status,
        wellpass_booking_restricted: member.wellpass_booking_restricted,
      });
      linksByIdentity.set(link.wellpass_identity_id, arr);
    }

    const { data: checkins } = await supabaseAdmin
      .from('wellpass_weekly_checkins')
      .select('*')
      .in('wellpass_identity_id', identityIds)
      .order('year', { ascending: false })
      .order('week_number', { ascending: false });

    const checkinsByIdentity = new Map<string, WellpassWeeklyCheckin[]>();
    for (const c of checkins ?? []) {
      const arr = checkinsByIdentity.get(c.wellpass_identity_id) ?? [];
      arr.push(c);
      checkinsByIdentity.set(c.wellpass_identity_id, arr);
    }

    // Bookings-per-household-per-week. Only count for tracked identities (untracked
    // rows don't render weekly cells in the UI). Build a date→week-bucket map from
    // the 6 most recent checkin weeks present in the DB, fetch confirmed bookings
    // for every linked member in that date span (paginated — `bookings` is a
    // growing table per claude-rules), then bucket per (identity, week).
    const weekBucketsByDate = new Map<string, { year: number; week_number: number }>();
    const weekStarts: string[] = [];
    {
      const seen = new Map<string, { year: number; week_number: number; week_start: string; week_end: string }>();
      for (const c of checkins ?? []) {
        const k = `${c.year}-${String(c.week_number).padStart(2, '0')}`;
        if (!seen.has(k)) seen.set(k, c);
      }
      const recent = Array.from(seen.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 6)
        .map(([, v]) => v);
      for (const w of recent) {
        weekStarts.push(w.week_start);
        const start = new Date(w.week_start);
        for (let i = 0; i < 7; i++) {
          const d = new Date(start);
          d.setUTCDate(start.getUTCDate() + i);
          const key = d.toISOString().slice(0, 10);
          weekBucketsByDate.set(key, { year: w.year, week_number: w.week_number });
        }
      }
    }

    const trackedIdentityIds = identities.filter((i) => i.tracked).map((i) => i.id);
    const memberToIdentityIds = new Map<string, string[]>();
    for (const [identityId, members] of linksByIdentity.entries()) {
      if (!trackedIdentityIds.includes(identityId)) continue;
      for (const m of members) {
        const arr = memberToIdentityIds.get(m.member_id) ?? [];
        arr.push(identityId);
        memberToIdentityIds.set(m.member_id, arr);
      }
    }
    const allMemberIds = Array.from(memberToIdentityIds.keys());

    // bucketKey = `${identityId}|${year}-${weekNumber}`
    const bookingsByIdentityWeek = new Map<string, number>();
    if (allMemberIds.length > 0 && weekStarts.length > 0) {
      const sortedStarts = [...weekStarts].sort();
      const minDate = sortedStarts[0];
      const lastStart = new Date(sortedStarts[sortedStarts.length - 1]);
      lastStart.setUTCDate(lastStart.getUTCDate() + 6);
      const maxDate = lastStart.toISOString().slice(0, 10);

      let from = 0;
      while (true) {
        const { data: page, error: bookingsErr } = await supabaseAdmin
          .from('bookings')
          .select('member_id, weekly_sessions!inner(date)')
          .in('member_id', allMemberIds)
          .eq('status', 'confirmed')
          .gte('weekly_sessions.date', minDate)
          .lte('weekly_sessions.date', maxDate)
          .range(from, from + 999);
        if (bookingsErr) {
          console.error('[wellpass-list] bookings paginate error:', bookingsErr);
          break;
        }
        const rows = (page ?? []) as Array<{
          member_id: string;
          weekly_sessions: { date: string } | { date: string }[] | null;
        }>;
        for (const row of rows) {
          const ws = Array.isArray(row.weekly_sessions) ? row.weekly_sessions[0] : row.weekly_sessions;
          if (!ws) continue;
          const bucket = weekBucketsByDate.get(ws.date);
          if (!bucket) continue;
          const identityIds = memberToIdentityIds.get(row.member_id) ?? [];
          for (const idId of identityIds) {
            const key = `${idId}|${bucket.year}-${String(bucket.week_number).padStart(2, '0')}`;
            bookingsByIdentityWeek.set(key, (bookingsByIdentityWeek.get(key) ?? 0) + 1);
          }
        }
        if (rows.length < 1000) break;
        from += 1000;
      }
    }

    const rows: WellpassIdentityRow[] = identities.map((identity) => {
      const linked = linksByIdentity.get(identity.id) ?? [];
      const weekly = checkinsByIdentity.get(identity.id) ?? [];
      const latest = weekly[0] ?? null;
      const weeklyBookings: WellpassWeeklyBookings[] = weekly.map((w) => ({
        year: w.year,
        week_number: w.week_number,
        booking_count:
          bookingsByIdentityWeek.get(
            `${identity.id}|${w.year}-${String(w.week_number).padStart(2, '0')}`
          ) ?? 0,
      }));

      let isExempt: boolean;
      if (identity.exemption_mode === 'always_exempt') isExempt = true;
      else if (identity.exemption_mode === 'always_enforce') isExempt = false;
      else isExempt = linked.some((m) => m.athlete_subscription_status === 'active');

      let status: WellpassIdentityRow['status'];
      if (!identity.tracked) status = 'untracked';
      else if (identity.paused_at) status = 'paused';
      else if (!latest) status = 'no_data';
      else if (latest.checkin_count < identity.min_checkins_required && !isExempt) status = 'below_threshold';
      else status = 'ok';

      return {
        ...identity,
        linked_members: linked,
        weekly_history: weekly,
        weekly_bookings: weeklyBookings,
        is_exempt: isExempt,
        latest_week: latest,
        status,
      };
    });

    return NextResponse.json({ rows });
  } catch (e) {
    console.error('[wellpass-list] unexpected error:', e);
    return NextResponse.json({ error: 'Failed to load Wellpass data' }, { status: 500 });
  }
}
