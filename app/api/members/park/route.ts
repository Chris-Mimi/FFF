import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';

// Use service role for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Park / un-park a member. Parking only hides them from the coach's lists
// (Active / At-Risk / Subscriptions / 10-Card) — it does NOT touch their real
// `status`, so booking and login access are unaffected. "Restart" = parked:false.
export async function POST(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const body = await request.json();
    const { memberId, parked, reason } = body;

    if (!memberId || typeof parked !== 'boolean') {
      return NextResponse.json(
        { error: 'memberId and parked (boolean) are required' },
        { status: 400 }
      );
    }

    const { data: member, error: fetchError } = await supabaseAdmin
      .from('members')
      .select('id')
      .eq('id', memberId)
      .single();

    if (fetchError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('members')
      .update({
        parked,
        // Store the reason on park; clear it on restart (parked:false).
        park_reason: parked && typeof reason === 'string' && reason.trim() ? reason.trim() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId);

    if (updateError) {
      console.error('Member park error:', updateError);
      return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, message: parked ? 'Member parked' : 'Member restarted' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Park member error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
