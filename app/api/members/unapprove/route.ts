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

export async function POST(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const body = await request.json();
    const { memberId } = body;

    // Validate required fields
    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    // Fetch member to verify they exist and are active
    const { data: member, error: fetchError } = await supabaseAdmin
      .from('members')
      .select('id, status')
      .eq('id', memberId)
      .single();

    if (fetchError || !member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    if (member.status !== 'active') {
      return NextResponse.json(
        { error: 'Member is not in active status' },
        { status: 400 }
      );
    }

    // Reset member to pending status and clear trial data
    const { data: updatedMember, error: updateError } = await supabaseAdmin
      .from('members')
      .update({
        status: 'pending',
        athlete_trial_start: null,
        athlete_subscription_status: 'expired',
        athlete_subscription_end: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .select()
      .single();

    if (updateError) {
      console.error('Member unapproval error:', updateError);
      return NextResponse.json(
        { error: 'Failed to unapprove member' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Member moved back to pending status',
        member: {
          id: updatedMember.id,
          email: updatedMember.email,
          name: updatedMember.name,
          status: updatedMember.status
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Unapprove member error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
