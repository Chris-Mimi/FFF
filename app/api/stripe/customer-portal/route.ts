import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';
import { requireAuth, isAuthError } from '@/lib/auth-api';

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
    const user = await requireAuth(request);
    if (isAuthError(user)) return user;

    const body = await request.json();
    const { memberId } = body;

    // Validate required fields
    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    // Fetch member to get Stripe customer ID
    const { data: member, error: fetchError } = await supabaseAdmin
      .from('members')
      .select('id, stripe_customer_id')
      .eq('id', memberId)
      .single();

    if (fetchError || !member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    if (!member.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer found for this member. Please make a purchase first.' },
        { status: 400 }
      );
    }

    // Create billing portal session
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      throw new Error('NEXT_PUBLIC_APP_URL environment variable is required');
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: member.stripe_customer_id,
      return_url: `${appUrl}/athlete`,
    });

    return NextResponse.json({
      url: portalSession.url,
    });

  } catch (error) {
    console.error('Customer portal creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create customer portal session' },
      { status: 500 }
    );
  }
}
