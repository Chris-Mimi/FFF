import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';
import { sendApprovalEmail } from '@/lib/email';

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
    const { memberId, whiteboardName } = body;

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
      .select('id, email, name, status')
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

    // Approve member (booking access only - no athlete page trial)
    const now = new Date();

    const updatePayload: Record<string, unknown> = {
      status: 'active',
      updated_at: now.toISOString(),
    };
    if (whiteboardName) {
      updatePayload.whiteboard_name = whiteboardName;
    }

    const { data: updatedMember, error: updateError } = await supabaseAdmin
      .from('members')
      .update(updatePayload)
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

    // Migrate whiteboard scores: link old whiteboard_name results to this member
    let linkedScores = 0;
    if (whiteboardName) {
      const { data: wbResults, error: wbError } = await supabaseAdmin
        .from('wod_section_results')
        .update({
          member_id: memberId,
          user_id: memberId,
          whiteboard_name: null,
          updated_at: now.toISOString(),
        })
        .eq('whiteboard_name', whiteboardName)
        .is('member_id', null)
        .select('id');

      if (wbError) {
        console.error('Whiteboard score migration error:', wbError);
      } else {
        linkedScores = wbResults?.length || 0;
        console.log(`Linked ${linkedScores} whiteboard scores ("${whiteboardName}") to member ${memberId}`);
      }
    }

    // Auto-merge trial-athlete sessions: any weekly_sessions.trial_names containing the
    // whiteboard_name gets a confirmed booking row for this member. Trial entries stay
    // in the array as a permanent onboarding record (Admin Tools Trial Athletes panel).
    if (whiteboardName) {
      const { data: trialSessions, error: trialError } = await supabaseAdmin
        .from('weekly_sessions')
        .select('id')
        .contains('trial_names', [whiteboardName]);

      if (trialError) {
        console.error('Trial-session lookup error:', trialError);
      } else if (trialSessions && trialSessions.length > 0) {
        const sessionIds = trialSessions.map(s => s.id);

        // Skip sessions where this member is already booked
        const { data: existing } = await supabaseAdmin
          .from('bookings')
          .select('session_id')
          .eq('member_id', memberId)
          .in('session_id', sessionIds);
        const existingIds = new Set((existing || []).map(b => b.session_id));

        const newBookings = sessionIds
          .filter(id => !existingIds.has(id))
          .map(session_id => ({
            session_id,
            member_id: memberId,
            status: 'confirmed',
            booked_at: now.toISOString(),
          }));

        if (newBookings.length > 0) {
          const { error: insertError } = await supabaseAdmin.from('bookings').insert(newBookings);
          if (insertError) {
            console.error('Trial-merge booking insert error:', insertError);
          } else {
            console.log(`Auto-merged ${newBookings.length} trial bookings for member ${memberId} ("${whiteboardName}")`);
          }
        }
      }
    }

    // Send approval email (non-blocking — don't fail the approval if email fails)
    if (updatedMember.email) {
      const emailResult = await sendApprovalEmail(
        updatedMember.email,
        updatedMember.name || 'Athlete'
      );
      if (!emailResult.success) {
        console.error('Approval email failed:', emailResult.error);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Member approved - can now book classes',
        linkedScores,
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
    console.error('Approve member error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
