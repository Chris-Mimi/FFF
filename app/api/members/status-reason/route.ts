import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';

// Update just the coach-only park/block reason note on a member, without changing
// their parked/blocked state. Lets the coach annotate members that were already
// parked/blocked (the park/block actions capture the reason at the time; this is
// the edit-in-place path). Coach-only, service role.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const ALLOWED_FIELDS = ['park_reason', 'block_reason'] as const;

export async function POST(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const { memberId, field, reason } = await request.json();

    if (!memberId || !ALLOWED_FIELDS.includes(field)) {
      return NextResponse.json(
        { error: 'memberId and a valid field (park_reason | block_reason) are required' },
        { status: 400 }
      );
    }

    const value = typeof reason === 'string' && reason.trim() ? reason.trim() : null;

    const { error: updateError } = await supabaseAdmin
      .from('members')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', memberId);

    if (updateError) {
      console.error('status-reason update error:', updateError);
      return NextResponse.json({ error: 'Failed to save reason' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: value ? 'Reason saved' : 'Reason cleared' });
  } catch (error) {
    console.error('status-reason error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
