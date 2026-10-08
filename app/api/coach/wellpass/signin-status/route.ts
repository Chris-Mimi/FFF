import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';
import { RATIO_THRESHOLD } from '@/lib/coach/wellpassScoring';
import type { WellpassSigninWeek, WellpassSigninStatus } from '@/types/wellpass';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * POST { memberIds: string[] } → { status: { [memberId]: WellpassSigninStatus } }
 *
 * Session Management modal reminder (S418): Wellpass members must sign in to
 * Wellpass at least `min_checkins_required` (3) times a week, training or not.
 * Also reports credit = all synced sign-ins minus classes attended in those weeks;
 * below zero = flag until they catch up (Chris: Carmine 60 sign-ins / 64 classes).
 * Only tracked, un-paused identities are reported. Data is as fresh as the last
 * Sync from Excel.
 */
export async function POST(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const body = await request.json().catch(() => ({}));
    const memberIds: string[] = Array.isArray(body.memberIds)
      ? body.memberIds.filter((x: unknown): x is string => typeof x === 'string').slice(0, 200)
      : [];
    if (memberIds.length === 0) return NextResponse.json({ status: {} });

    const { data: links, error: linkErr } = await supabaseAdmin
      .from('wellpass_identity_members')
      .select('member_id, wellpass_identities!inner(id, wellpass_name, min_checkins_required, tracked, paused_at)')
      .in('member_id', memberIds);
    if (linkErr) {
      console.error('[wellpass-signin-status] links error:', linkErr);
      return NextResponse.json({ error: 'Failed to load Wellpass status' }, { status: 500 });
    }

    type Identity = { id: string; wellpass_name: string; min_checkins_required: number | null; tracked: boolean; paused_at: string | null };
    const identityByMember = new Map<string, Identity>();
    for (const link of links ?? []) {
      const raw = (link as { wellpass_identities: unknown }).wellpass_identities;
      const identity = (Array.isArray(raw) ? raw[0] : raw) as Identity | undefined;
      if (!identity || !identity.tracked || identity.paused_at) continue;
      identityByMember.set(link.member_id, identity);
    }
    if (identityByMember.size === 0) return NextResponse.json({ status: {} });

    const identityIds = [...new Set([...identityByMember.values()].map(i => i.id))];

    // Full sign-in history for these passes (paginated — ~40 weeks × bookers can
    // pass the 1000-row cap). Newest first.
    type CheckinRow = { wellpass_identity_id: string; week_number: number; week_start: string; checkin_count: number };
    const checkins: CheckinRow[] = [];
    for (let from = 0; ; from += 1000) {
      const { data: page, error: cErr } = await supabaseAdmin
        .from('wellpass_weekly_checkins')
        .select('wellpass_identity_id, year, week_number, week_start, checkin_count')
        .in('wellpass_identity_id', identityIds)
        .order('year', { ascending: false })
        .order('week_number', { ascending: false })
        .range(from, from + 999);
      if (cErr) {
        console.error('[wellpass-signin-status] checkins error:', cErr);
        return NextResponse.json({ error: 'Failed to load Wellpass status' }, { status: 500 });
      }
      checkins.push(...((page ?? []) as CheckinRow[]));
      if (!page || page.length < 1000) break;
    }

    const weeksByIdentity = new Map<string, CheckinRow[]>();
    for (const c of checkins) {
      const arr = weeksByIdentity.get(c.wellpass_identity_id) ?? [];
      arr.push(c);
      weeksByIdentity.set(c.wellpass_identity_id, arr);
    }

    // Credit = sign-ins minus classes attended, over the SAME weeks: from the
    // first synced week to the end of the last one. Classes after the last sync
    // wait until their sign-ins arrive. Shared passes count every linked member.
    const addDays = (ymd: string, days: number) => {
      const d = new Date(`${ymd}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10);
    };
    const spanByIdentity = new Map<string, { from: string; to: string }>();
    for (const [id, weeks] of weeksByIdentity) {
      spanByIdentity.set(id, { from: weeks[weeks.length - 1].week_start, to: addDays(weeks[0].week_start, 6) });
    }

    const { data: allLinks, error: allLinkErr } = await supabaseAdmin
      .from('wellpass_identity_members')
      .select('member_id, wellpass_identity_id')
      .in('wellpass_identity_id', identityIds);
    if (allLinkErr) {
      console.error('[wellpass-signin-status] household links error:', allLinkErr);
      return NextResponse.json({ error: 'Failed to load Wellpass status' }, { status: 500 });
    }
    const identitiesByMember = new Map<string, string[]>();
    for (const l of allLinks ?? []) {
      identitiesByMember.set(l.member_id, [...(identitiesByMember.get(l.member_id) ?? []), l.wellpass_identity_id]);
    }

    const attendedByIdentity = new Map<string, number>();
    const spans = [...spanByIdentity.values()];
    if (identitiesByMember.size > 0 && spans.length > 0) {
      const minDate = spans.reduce((m, s) => (s.from < m ? s.from : m), spans[0].from);
      const maxDate = spans.reduce((m, s) => (s.to > m ? s.to : m), spans[0].to);
      for (let from = 0; ; from += 1000) {
        const { data: page, error: bErr } = await supabaseAdmin
          .from('bookings')
          .select('member_id, weekly_sessions!inner(date)')
          .in('member_id', [...identitiesByMember.keys()])
          .eq('status', 'confirmed')
          // Classes paid with a 10-card aren't on the Wellpass pass.
          .eq('ten_card_consumed', false)
          .gte('weekly_sessions.date', minDate)
          .lte('weekly_sessions.date', maxDate)
          .range(from, from + 999);
        if (bErr) {
          console.error('[wellpass-signin-status] bookings error:', bErr);
          return NextResponse.json({ error: 'Failed to load Wellpass status' }, { status: 500 });
        }
        const rows = (page ?? []) as { member_id: string; weekly_sessions: { date: string } | { date: string }[] | null }[];
        for (const r of rows) {
          const ws = Array.isArray(r.weekly_sessions) ? r.weekly_sessions[0] : r.weekly_sessions;
          if (!ws) continue;
          for (const id of identitiesByMember.get(r.member_id) ?? []) {
            const span = spanByIdentity.get(id);
            if (span && ws.date >= span.from && ws.date <= span.to) {
              attendedByIdentity.set(id, (attendedByIdentity.get(id) ?? 0) + 1);
            }
          }
        }
        if (rows.length < 1000) break;
      }
    }

    const status: Record<string, WellpassSigninStatus> = {};
    for (const [memberId, identity] of identityByMember) {
      const all = weeksByIdentity.get(identity.id) ?? [];
      if (all.length === 0) continue;
      const min = identity.min_checkins_required ?? 3;
      const weeks: WellpassSigninWeek[] = all.slice(0, 2).map(w => ({
        week_number: w.week_number, week_start: w.week_start, checkin_count: w.checkin_count,
      }));
      const signins = all.reduce((sum, w) => sum + w.checkin_count, 0);
      const attended = attendedByIdentity.get(identity.id) ?? 0;
      // Shared passes owe 1.5 sign-ins per class (Wellpass tab rule). "Shared" =
      // more than one linked member AND a weekly minimum above the solo 3 — Chris
      // sets couples to 6; a pass he left at 3 (e.g. a kid linked, rarely trains)
      // is treated as solo.
      const shared =
        (allLinks ?? []).filter(l => l.wellpass_identity_id === identity.id).length > 1 && min > 3;
      const required = shared ? Math.ceil(attended * RATIO_THRESHOLD) : attended;
      status[memberId] = {
        wellpass_name: identity.wellpass_name,
        min_required: min,
        weeks,
        low: weeks[0].checkin_count < min,
        signins_total: signins,
        attended_total: attended,
        since: spanByIdentity.get(identity.id)!.from,
        shared,
        required_total: required,
        credit: signins - required,
      };
    }

    return NextResponse.json({ status });
  } catch (e) {
    console.error('[wellpass-signin-status] unexpected error:', e);
    return NextResponse.json({ error: 'Failed to load Wellpass status' }, { status: 500 });
  }
}
