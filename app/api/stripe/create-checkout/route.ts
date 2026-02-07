import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe, getPriceId, isSubscription, ProductType } from '@/lib/stripe';
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
    const { productType, memberId } = body as { productType: ProductType; memberId: string };

    // Validate required fields
    if (!productType || !memberId) {
      return NextResponse.json(
        { error: 'Product type and member ID are required' },
        { status: 400 }
      );
    }

    // Get price ID for the product
    const priceId = getPriceId(productType);
    if (!priceId) {
      return NextResponse.json(
        { error: `Price ID not configured for ${productType}. Please set up Stripe products.` },
        { status: 400 }
      );
    }

    // Fetch member to get email and check existing customer
    const { data: member, error: fetchError } = await supabaseAdmin
      .from('members')
      .select('id, email, name, stripe_customer_id')
      .eq('id', memberId)
      .single();

    if (fetchError || !member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    if (!member.email) {
      return NextResponse.json(
        { error: 'Member email is required for payment' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    let customerId = member.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: member.email,
        name: member.name || undefined,
        metadata: {
          member_id: memberId
        }
      });
      customerId = customer.id;

      // Save customer ID to member record
      await supabaseAdmin
        .from('members')
        .update({ stripe_customer_id: customerId })
        .eq('id', memberId);
    }

    // Build checkout session params
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      throw new Error('NEXT_PUBLIC_APP_URL environment variable is required');
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: isSubscription(productType) ? 'subscription' : 'payment',
      success_url: `${appUrl}/athlete?payment=success&type=${productType}`,
      cancel_url: `${appUrl}/athlete?payment=cancelled`,
      metadata: {
        member_id: memberId,
        product_type: productType,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });

  } catch (error) {
    console.error('Stripe checkout creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
