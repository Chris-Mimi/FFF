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

    // Fetch member to verify they exist
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

    if (member.status === 'blocked') {
      return NextResponse.json(
        { error: 'Member is already blocked' },
        { status: 400 }
      );
    }

    // Block member and revoke athlete access
    const { data: updatedMember, error: updateError } = await supabaseAdmin
      .from('members')
      .update({
        status: 'blocked',
        athlete_subscription_status: 'expired', // Revoke athlete access
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .select()
      .single();

    if (updateError) {
      console.error('Member block error:', updateError);
      return NextResponse.json(
        { error: 'Failed to block member' },
        { status: 500 }
      );
    }

    // TODO: Cancel any active bookings for this member
    // TODO: Create in-app notification for member about account status
    // TODO: Send email notification (Phase 3)

    return NextResponse.json(
      {
        success: true,
        message: 'Member blocked successfully',
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
    console.error('Block member error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
