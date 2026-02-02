import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';
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
        console.log(`Unhandled event type: ${event.type}`);
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

  const now = new Date();

  if (productType === '10card') {
    // Activate 10-card
    const expiryDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days from now

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

    console.log(`10-card activated for member ${memberId}`);
  } else if (session.subscription) {
    // Subscription is handled by subscription.created event
    console.log(`Subscription ${session.subscription} created for member ${memberId}`);
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
  // Access period timestamps from subscription object (Stripe v20+)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subData = subscription as any;
  const periodEndTimestamp = subData.current_period_end || 0;
  const periodStartTimestamp = subData.current_period_start || 0;
  const periodEnd = new Date(periodEndTimestamp * 1000);
  const periodStart = new Date(periodStartTimestamp * 1000);

  // Determine plan type from price
  let planType: 'monthly' | 'yearly' = 'monthly';
  const priceId = subscription.items.data[0]?.price.id;
  if (priceId === process.env.STRIPE_PRICE_YEARLY_ID) {
    planType = 'yearly';
  }

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
      cancel_at_period_end: subData.cancel_at_period_end || false,
      updated_at: now.toISOString(),
    }, {
      onConflict: 'stripe_subscription_id'
    });

  // Update member's athlete subscription status
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    await supabaseAdmin
      .from('members')
      .update({
        athlete_subscription_status: 'active',
        athlete_subscription_end: periodEnd.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', member.id);
  }

  console.log(`Subscription ${subscription.id} updated for member ${member.id}`);
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

  console.log(`Subscription ${subscription.id} cancelled for member ${member.id}`);
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

  // Log the failed payment (could also send notification email here)
  console.log(`Payment failed for member ${member.id} (${member.email})`);

  // Update subscription status to past_due if it's a subscription invoice
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoiceData = invoice as any;
  if (invoiceData.subscription) {
    await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', invoiceData.subscription as string);
  }
}
