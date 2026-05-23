import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const memberId = request.nextUrl.searchParams.get('memberId');
    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('subscription_archive')
      .select('id, status, tier, start_date, end_date, notes, closed_at')
      .eq('member_id', memberId)
      .order('closed_at', { ascending: false });

    if (error) {
      console.error('subscription-archive fetch error:', error);
      return NextResponse.json({ error: 'Failed to load history' }, { status: 500 });
    }

    return NextResponse.json({ archive: data || [] });
  } catch (error) {
    console.error('subscription-archive error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// DELETE: remove a specific subscription archive row. Coach-only. Used to clean up
// accidental Activate / Renew clicks. Does NOT touch the member's current active
// subscription — purely an audit-trail cleanup.
export async function DELETE(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const { id } = (await request.json()) as { id?: string };
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('subscription_archive')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('subscription-archive DELETE error:', error);
      return NextResponse.json({ error: 'Failed to delete archive row' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('subscription-archive DELETE error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const { id, notes } = (await request.json()) as { id?: string; notes?: string | null };
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('subscription_archive')
      .update({ notes: notes && notes.length > 0 ? notes : null })
      .eq('id', id);

    if (error) {
      console.error('subscription-archive PATCH error:', error);
      return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('subscription-archive PATCH error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
