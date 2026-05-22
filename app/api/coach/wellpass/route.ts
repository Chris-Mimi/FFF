import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';
import type { WellpassIdentityRow, WellpassWeeklyCheckin, WellpassLinkedMember } from '@/types/wellpass';

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

    const rows: WellpassIdentityRow[] = identities.map((identity) => {
      const linked = linksByIdentity.get(identity.id) ?? [];
      const weekly = checkinsByIdentity.get(identity.id) ?? [];
      const latest = weekly[0] ?? null;

      let isExempt: boolean;
      if (identity.exemption_mode === 'always_exempt') isExempt = true;
      else if (identity.exemption_mode === 'always_enforce') isExempt = false;
      else isExempt = linked.some((m) => m.athlete_subscription_status === 'active');

      let status: WellpassIdentityRow['status'];
      if (!identity.tracked) status = 'untracked';
      else if (!latest) status = 'no_data';
      else if (latest.checkin_count < identity.min_checkins_required && !isExempt) status = 'below_threshold';
      else status = 'ok';

      return {
        ...identity,
        linked_members: linked,
        weekly_history: weekly,
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
