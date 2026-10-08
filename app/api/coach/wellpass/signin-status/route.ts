import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';
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
    // Bounded: a session's bookers × their weeks. Newest first, keep 2 per identity.
    const { data: checkins, error: cErr } = await supabaseAdmin
      .from('wellpass_weekly_checkins')
      .select('wellpass_identity_id, year, week_number, week_start, checkin_count')
      .in('wellpass_identity_id', identityIds)
      .order('year', { ascending: false })
      .order('week_number', { ascending: false })
      .range(0, 999);
    if (cErr) {
      console.error('[wellpass-signin-status] checkins error:', cErr);
      return NextResponse.json({ error: 'Failed to load Wellpass status' }, { status: 500 });
    }

    const weeksByIdentity = new Map<string, WellpassSigninWeek[]>();
    for (const c of checkins ?? []) {
      const arr = weeksByIdentity.get(c.wellpass_identity_id) ?? [];
      if (arr.length < 2) arr.push({ week_number: c.week_number, week_start: c.week_start, checkin_count: c.checkin_count });
      weeksByIdentity.set(c.wellpass_identity_id, arr);
    }

    const status: Record<string, WellpassSigninStatus> = {};
    for (const [memberId, identity] of identityByMember) {
      const weeks = weeksByIdentity.get(identity.id) ?? [];
      if (weeks.length === 0) continue;
      const min = identity.min_checkins_required ?? 3;
      status[memberId] = {
        wellpass_name: identity.wellpass_name,
        min_required: min,
        weeks,
        low: weeks[0].checkin_count < min,
      };
    }

    return NextResponse.json({ status });
  } catch (e) {
    console.error('[wellpass-signin-status] unexpected error:', e);
    return NextResponse.json({ error: 'Failed to load Wellpass status' }, { status: 500 });
  }
}
