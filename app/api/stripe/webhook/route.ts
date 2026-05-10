import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe, getStripeServer, getTierFromPriceId, getPlanTypeFromPriceId } from '@/lib/stripe';
import { notifyPaymentFailed } from '@/lib/notifications';
import Stripe from 'stripe';

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

// Disable body parsing - Stripe needs raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        // Unhandled event type - no action needed
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// Handle successful checkout
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const memberId = session.metadata?.member_id;
  const productType = session.metadata?.product_type;

  if (!memberId) {
    console.error('No member_id in checkout session metadata');
    return;
  }

  // Grant access if payment was collected OR trial started (no_payment_required)
  if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
    console.error(`Checkout session ${session.id} for member ${memberId} has payment_status: ${session.payment_status} — skipping activation`);
    return;
  }

  const now = new Date();

  if (productType === '10card') {
    // Activate 10-card
    const expiryDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 12 months from now

    await supabaseAdmin
      .from('members')
      .update({
        ten_card_purchase_date: now.toISOString(),
        ten_card_sessions_used: 0,
        ten_card_total: 10,
        ten_card_expiry_date: expiryDate.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', memberId);

  } else if (session.subscription) {
    // Extract tier and billing period from metadata
    const tier = session.metadata?.subscription_tier || null;
    const billingPeriod = session.metadata?.billing_period || null;

    // Set initial subscription dates (subscription.created event will update with exact dates)
    const subscriptionEndDate = billingPeriod === 'yearly'
      ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) // 365 days from now
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    // Update member status with tier
    const { error: memberUpdateError } = await supabaseAdmin
      .from('members')
      .update({
        athlete_subscription_status: 'active',
        athlete_subscription_start: now.toISOString(),
        athlete_subscription_end: subscriptionEndDate.toISOString(),
        subscription_tier: tier,
        updated_at: now.toISOString(),
      })
      .eq('id', memberId);

    if (memberUpdateError) {
      console.error(`Failed to update member ${memberId} on checkout.completed:`, memberUpdateError);
    }

    // Get member data for athlete profile creation
    const { data: memberData } = await supabaseAdmin
      .from('members')
      .select('stripe_customer_id, email, name')
      .eq('id', memberId)
      .single();

    // Create athlete_profiles record if doesn't exist (makes member visible in Athletes tab)
    if (memberData) {
      await supabaseAdmin
        .from('athlete_profiles')
        .upsert({
          user_id: memberId,
          full_name: memberData.name,
          email: memberData.email,
        }, {
          onConflict: 'user_id'
        });

    }

    // Create subscription record from Stripe ground-truth.
    //
    // We can't rely on the subsequent customer.subscription.* webhook to
    // correct status: it may arrive before checkout.completed (and get
    // clobbered) or fail to fire entirely. So we fetch from Stripe directly
    // and write the real status (trialing/active/etc) up-front.
    if (memberData?.stripe_customer_id && session.subscription) {
      try {
        const stripeSub = await getStripeServer().subscriptions.retrieve(session.subscription as string);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub = stripeSub as any;
        const periodEndIso = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : subscriptionEndDate.toISOString();
        const periodStartIso = sub.current_period_start
          ? new Date(sub.current_period_start * 1000).toISOString()
          : now.toISOString();
        const mappedStatus =
          stripeSub.status === 'active' ? 'active' :
          stripeSub.status === 'trialing' ? 'trialing' :
          stripeSub.status === 'past_due' ? 'past_due' : 'cancelled';

        await supabaseAdmin
          .from('subscriptions')
          .upsert({
            member_id: memberId,
            stripe_subscription_id: session.subscription as string,
            stripe_customer_id: memberData.stripe_customer_id,
            plan_type: billingPeriod || 'monthly',
            status: mappedStatus,
            current_period_start: periodStartIso,
            current_period_end: periodEndIso,
            cancel_at_period_end: stripeSub.cancel_at_period_end || false,
            updated_at: now.toISOString(),
          }, {
            onConflict: 'stripe_subscription_id'
          });
      } catch (err) {
        // Don't fail the webhook — member access is already granted via
        // members.athlete_subscription_status above. The customer.subscription.*
        // webhook will create the row when it fires.
        console.error(`Failed to fetch/store subscription ${session.subscription} for member ${memberId}:`, err);
      }
    }

  }
}

// Handle subscription updates
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find member by Stripe customer ID
  const { data: member } = await supabaseAdmin
    .from('members')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!member) {
    console.error(`No member found for customer ${customerId}`);
    return;
  }

  const now = new Date();

  // Stripe timestamps are in seconds, need to convert to milliseconds
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub = subscription as any;
  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000)
    : now;
  const periodStart = sub.current_period_start
    ? new Date(sub.current_period_start * 1000)
    : now;

  // Determine plan type and tier from price ID
  const priceId = subscription.items.data[0]?.price.id;
  const planType = (priceId ? getPlanTypeFromPriceId(priceId) : null) || 'monthly';
  const tier = priceId ? getTierFromPriceId(priceId) : null;

  // Upsert subscription record
  await supabaseAdmin
    .from('subscriptions')
    .upsert({
      member_id: member.id,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      plan_type: planType,
      status: subscription.status === 'active' ? 'active' :
              subscription.status === 'past_due' ? 'past_due' :
              subscription.status === 'trialing' ? 'trialing' : 'cancelled',
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      updated_at: now.toISOString(),
    }, {
      onConflict: 'stripe_subscription_id'
    });

  // Update member's athlete subscription status and tier
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    // For trialing subs, don't overwrite athlete_subscription_end if checkout already set it
    // Stripe's current_period_end for trials = trial end date (not subscription end),
    // which can cause autoExpire to immediately expire the member
    const memberUpdate: Record<string, string | null> = {
      athlete_subscription_status: 'active',
      ...(tier && { subscription_tier: tier }),
      updated_at: now.toISOString(),
    };

    // Only set end date for active (non-trialing) subscriptions
    if (subscription.status === 'active') {
      memberUpdate.athlete_subscription_end = periodEnd.toISOString();
    }

    const { error: memberUpdateError } = await supabaseAdmin
      .from('members')
      .update(memberUpdate)
      .eq('id', member.id);

    if (memberUpdateError) {
      console.error(`Failed to update member ${member.id} on subscription.${subscription.status}:`, memberUpdateError);
    }
  }

}

// Handle subscription cancellation
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find member by Stripe customer ID
  const { data: member } = await supabaseAdmin
    .from('members')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!member) {
    console.error(`No member found for customer ${customerId}`);
    return;
  }

  const now = new Date();

  // Update subscription record
  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'cancelled',
      updated_at: now.toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  // Check if member has any other active subscriptions
  const { data: activeSubscriptions } = await supabaseAdmin
    .from('subscriptions')
    .select('id')
    .eq('member_id', member.id)
    .eq('status', 'active');

  // If no other active subscriptions, expire the member's access
  if (!activeSubscriptions || activeSubscriptions.length === 0) {
    await supabaseAdmin
      .from('members')
      .update({
        athlete_subscription_status: 'expired',
        athlete_subscription_end: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', member.id);
  }

}

// Handle failed payment
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Find member by Stripe customer ID
  const { data: member } = await supabaseAdmin
    .from('members')
    .select('id, email, name')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!member) {
    console.error(`No member found for customer ${customerId}`);
    return;
  }

  const now = new Date();

  // Update subscription status to past_due if it's a subscription invoice
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inv = invoice as any;
  if (inv.subscription) {
    await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'past_due',
        updated_at: now.toISOString(),
      })
      .eq('stripe_subscription_id', inv.subscription as string);

    // Also update member status so athlete app access reflects the failed payment
    await supabaseAdmin
      .from('members')
      .update({
        athlete_subscription_status: 'past_due',
        updated_at: now.toISOString(),
      })
      .eq('id', member.id);

    // Notify coaches about the failed payment
    notifyPaymentFailed(member.name);
  }
}
