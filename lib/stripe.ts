import Stripe from 'stripe';

// Server-side Stripe client (for API routes)
// Lazy-initialized to avoid build-time errors when env vars aren't set
let _stripe: Stripe | null = null;

export function getStripeServer(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    });
  }
  return _stripe;
}

// For backwards compatibility - use getStripeServer() in new code
export const stripe = {
  get checkout() { return getStripeServer().checkout; },
  get customers() { return getStripeServer().customers; },
  get billingPortal() { return getStripeServer().billingPortal; },
  get webhooks() { return getStripeServer().webhooks; },
};

// Price IDs - configure these in Stripe Dashboard and add to .env.local
export const STRIPE_PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_MONTHLY_ID,
  yearly: process.env.STRIPE_PRICE_YEARLY_ID,
  tenCard: process.env.STRIPE_PRICE_10CARD_ID,
};

// Product types for checkout
export type ProductType = 'monthly' | 'yearly' | '10card';

// Helper to get the correct price ID
export function getPriceId(productType: ProductType): string | undefined {
  switch (productType) {
    case 'monthly':
      return STRIPE_PRICE_IDS.monthly;
    case 'yearly':
      return STRIPE_PRICE_IDS.yearly;
    case '10card':
      return STRIPE_PRICE_IDS.tenCard;
    default:
      return undefined;
  }
}

// Helper to determine if product is a subscription
export function isSubscription(productType: ProductType): boolean {
  return productType === 'monthly' || productType === 'yearly';
}
