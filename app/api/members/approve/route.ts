import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const body = await request.json();
    const { memberId } = body;

    // Validate required fields
    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    // Fetch member to verify they exist and are pending
    const { data: member, error: fetchError } = await supabaseAdmin
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (fetchError || !member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    if (member.status !== 'pending') {
      return NextResponse.json(
        { error: 'Member is not in pending status' },
        { status: 400 }
      );
    }

    // Calculate trial period (30 days from now)
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days

    // Approve member and start athlete trial
    const { data: updatedMember, error: updateError } = await supabaseAdmin
      .from('members')
      .update({
        status: 'active',
        athlete_trial_start: now.toISOString(),
        athlete_subscription_status: 'trial',
        athlete_subscription_end: trialEnd.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('id', memberId)
      .select()
      .single();

    if (updateError) {
      console.error('Member approval error:', updateError);
      return NextResponse.json(
        { error: 'Failed to approve member' },
        { status: 500 }
      );
    }

    // TODO: Create in-app notification for member about approval
    // TODO: Send email notification (Phase 3)

    return NextResponse.json(
      {
        success: true,
        message: 'Member approved successfully',
        member: {
          id: updatedMember.id,
          email: updatedMember.email,
          name: updatedMember.name,
          status: updatedMember.status,
          athlete_trial_start: updatedMember.athlete_trial_start,
          athlete_subscription_end: updatedMember.athlete_subscription_end
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Approve member error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
