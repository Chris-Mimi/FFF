import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe, getPriceId, isSubscription, getTier, getBillingPeriod, ProductType } from '@/lib/stripe';
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
    const { productType, memberId, trial } = body as { productType: ProductType; memberId: string; trial?: boolean };

    // Validate required fields
    if (!productType || !memberId) {
      return NextResponse.json(
        { error: 'Product type and member ID are required' },
        { status: 400 }
      );
    }

    // Ownership guard: a member may only check out for themselves or for a
    // family member they own (parents paying for their kids). Without this, any
    // logged-in athlete could start a checkout tied to an arbitrary memberId
    // and expose that member's email on the Stripe checkout page.
    if (memberId !== user.id) {
      const { data: familyMember } = await supabaseAdmin
        .from('members')
        .select('id, primary_member_id, account_type')
        .eq('id', memberId)
        .single();

      if (
        !familyMember ||
        familyMember.account_type !== 'family_member' ||
        familyMember.primary_member_id !== user.id
      ) {
        return NextResponse.json(
          { error: 'You can only pay for your own account or your family members' },
          { status: 403 }
        );
      }
    }

    // Get price ID for the product
    const priceId = getPriceId(productType);
    if (!priceId) {
      return NextResponse.json(
        { error: `Price ID not configured for ${productType}. Please set up Stripe products.` },
        { status: 400 }
      );
    }

    // Fetch member to get email, membership types, and check existing customer.
    // athlete_subscription_start is included to gate the free-trial flag: any member
    // with a non-null start has already used (or is currently using) a trial period,
    // whether Stripe-driven or coach-granted, so they're not eligible for another.
    const { data: member, error: fetchError } = await supabaseAdmin
      .from('members')
      .select('id, email, name, stripe_customer_id, membership_types, athlete_subscription_start')
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

    // Validate that the requested tier matches the member's pricing eligibility.
    // Only `member` (regular gym members) gets the Member discount price; everyone
    // else (Wellpass, 10-card, Hansefit, Drop-in) pays the Wellpass tier.
    const requestedTier = getTier(productType);
    if (requestedTier) {
      const memberTypes: string[] = member.membership_types || [];
      const allowedTier = memberTypes.includes('member') ? 'member' : 'wellpass';

      if (requestedTier !== allowedTier) {
        return NextResponse.json(
          { error: 'Selected plan does not match your membership type' },
          { status: 403 }
        );
      }
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

    // Build checkout session config
    const isSubMode = isSubscription(productType);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const checkoutParams: any = {
      customer: customerId,
      billing_address_collection: 'required',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: isSubMode ? 'subscription' : 'payment',
      success_url: `${appUrl}/athlete?payment=success&type=${productType}`,
      cancel_url: `${appUrl}/athlete?payment=cancelled`,
      metadata: {
        member_id: memberId,
        product_type: productType,
        subscription_tier: getTier(productType) || '',
        billing_period: getBillingPeriod(productType) || '',
      },
    };

    // Always require a payment method on subscription signups, including trials.
    // Stripe's default for trials is `if_required` which lets users start a trial
    // with no card on file — those subs then get stuck in `trialing` at trial-end
    // because Stripe can't bill anyone (S345 incident: 5 zombie subs).
    if (isSubMode) {
      checkoutParams.payment_method_collection = 'always';
    }

    // Add 30-day free trial for monthly subscriptions only (yearly already discounted).
    // Gate: server enforces one-trial-per-member regardless of client request.
    // athlete_subscription_start is set on every prior subscription (Stripe or cash),
    // so a non-null value means this member has already had a free month.
    const hasUsedTrial = member.athlete_subscription_start != null;
    const shouldGrantTrial = trial && isSubMode && getBillingPeriod(productType) === 'monthly' && !hasUsedTrial;
    if (trial && hasUsedTrial) {
      console.log(`[checkout] Trial denied for member ${memberId}: already used (athlete_subscription_start=${member.athlete_subscription_start})`);
    }
    if (shouldGrantTrial) {
      checkoutParams.subscription_data = {
        trial_period_days: 30,
        // Backstop: if a sub somehow ends up trialing without a payment method,
        // cancel it at trial-end instead of leaving it as a zombie.
        trial_settings: {
          end_behavior: {
            missing_payment_method: 'cancel',
          },
        },
      };
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create(checkoutParams);

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
