import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';
import type { WellpassExemptionMode } from '@/types/wellpass';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const VALID_EXEMPTION: WellpassExemptionMode[] = ['auto', 'always_exempt', 'always_enforce'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const { id } = await params;
    const body = (await request.json()) as {
      tracked?: boolean;
      exemption_mode?: WellpassExemptionMode;
      min_checkins_required?: number;
      notes?: string | null;
      add_member_id?: string;
      remove_member_id?: string;
      paused?: boolean;
      pause_reason?: string | null;
      review_cleared?: boolean;
    };

    const update: Record<string, unknown> = {};
    if (typeof body.tracked === 'boolean') update.tracked = body.tracked;
    if (body.exemption_mode && VALID_EXEMPTION.includes(body.exemption_mode)) {
      update.exemption_mode = body.exemption_mode;
    }
    if (typeof body.min_checkins_required === 'number' && body.min_checkins_required >= 1) {
      update.min_checkins_required = Math.trunc(body.min_checkins_required);
    }
    if (body.notes !== undefined) update.notes = body.notes;
    if (typeof body.paused === 'boolean') {
      update.paused_at = body.paused ? new Date().toISOString() : null;
      if (!body.paused) update.pause_reason = null;
    }
    if (body.pause_reason !== undefined) update.pause_reason = body.pause_reason;
    if (typeof body.review_cleared === 'boolean') update.review_cleared = body.review_cleared;

    if (Object.keys(update).length > 0) {
      const { error } = await supabaseAdmin
        .from('wellpass_identities')
        .update(update)
        .eq('id', id);
      if (error) {
        console.error('[wellpass-patch] update error:', error);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
      }
    }

    if (body.add_member_id) {
      const { error } = await supabaseAdmin
        .from('wellpass_identity_members')
        .insert({ wellpass_identity_id: id, member_id: body.add_member_id });
      if (error && !error.message.includes('duplicate')) {
        console.error('[wellpass-patch] add link error:', error);
        return NextResponse.json({ error: 'Failed to link member' }, { status: 500 });
      }
    }

    if (body.remove_member_id) {
      const { error } = await supabaseAdmin
        .from('wellpass_identity_members')
        .delete()
        .eq('wellpass_identity_id', id)
        .eq('member_id', body.remove_member_id);
      if (error) {
        console.error('[wellpass-patch] remove link error:', error);
        return NextResponse.json({ error: 'Failed to unlink member' }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[wellpass-patch] unexpected error:', e);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;
    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('wellpass_identities')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('[wellpass-delete] error:', error);
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[wellpass-delete] unexpected error:', e);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
