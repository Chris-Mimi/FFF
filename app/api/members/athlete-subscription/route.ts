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
    const { memberId, action, days } = body;

    // Validate required fields
    if (!memberId || !action) {
      return NextResponse.json(
        { error: 'Member ID and action are required' },
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

    const now = new Date();
    let updateData: {
      athlete_subscription_status?: 'trial' | 'active' | 'expired';
      athlete_subscription_end?: string | null;
      athlete_trial_start?: string | null;
      updated_at: string;
    } = {
      updated_at: now.toISOString()
    };

    switch (action) {
      case 'start_trial': {
        // Start a new trial (for members with no current athlete access)
        const trialDays = days || 30;
        const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

        updateData = {
          athlete_subscription_status: 'trial',
          athlete_subscription_end: trialEnd.toISOString(),
          athlete_trial_start: now.toISOString(),
          updated_at: now.toISOString()
        };
        break;
      }

      case 'extend_trial': {
        // Extend trial by adding days to current end date (or from now if expired)
        const daysToAdd = days || 30; // Default 30 days
        const currentEnd = member.athlete_subscription_end
          ? new Date(member.athlete_subscription_end)
          : now;

        // If trial expired, start from now; otherwise extend from current end
        const baseDate = currentEnd > now ? currentEnd : now;
        const newEnd = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

        updateData = {
          athlete_subscription_status: 'trial',
          athlete_subscription_end: newEnd.toISOString(),
          athlete_trial_start: member.athlete_trial_start || now.toISOString(),
          updated_at: now.toISOString()
        };
        break;
      }

      case 'activate': {
        // Activate full subscription (no end date)
        updateData = {
          athlete_subscription_status: 'active',
          athlete_subscription_end: null, // No end date for active subscription
          updated_at: now.toISOString()
        };
        break;
      }

      case 'expire': {
        // Manually expire subscription
        updateData = {
          athlete_subscription_status: 'expired',
          athlete_subscription_end: now.toISOString(),
          updated_at: now.toISOString()
        };
        break;
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start_trial, extend_trial, activate, or expire' },
          { status: 400 }
        );
    }

    // Update member
    const { data: updatedMember, error: updateError } = await supabaseAdmin
      .from('members')
      .update(updateData)
      .eq('id', memberId)
      .select()
      .single();

    if (updateError) {
      console.error('Subscription update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Subscription ${action.replace('_', ' ')} successful`,
        member: {
          id: updatedMember.id,
          email: updatedMember.email,
          name: updatedMember.name,
          athlete_subscription_status: updatedMember.athlete_subscription_status,
          athlete_subscription_end: updatedMember.athlete_subscription_end,
          athlete_trial_start: updatedMember.athlete_trial_start
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Athlete subscription management error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
