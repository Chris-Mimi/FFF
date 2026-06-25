import Stripe from 'stripe';

// Server-side Stripe client (for API routes)
// Lazy-initialized to avoid build-time errors when env vars aren't set
let _stripe: Stripe | null = null;

export function getStripeServer(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
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
  member_monthly: process.env.STRIPE_PRICE_MEMBER_MONTHLY_ID,
  member_yearly: process.env.STRIPE_PRICE_MEMBER_YEARLY_ID,
  wellpass_monthly: process.env.STRIPE_PRICE_WELLPASS_MONTHLY_ID,
  wellpass_yearly: process.env.STRIPE_PRICE_WELLPASS_YEARLY_ID,
  tenCard: process.env.STRIPE_PRICE_10CARD_ID,
  tenCardKids: process.env.STRIPE_PRICE_10CARD_KIDS_ID,
};

// Subscription tiers
export type SubscriptionTier = 'member' | 'wellpass';

// Product types for checkout
export type ProductType = 'member_monthly' | 'member_yearly' | 'wellpass_monthly' | 'wellpass_yearly' | '10card' | '10card_kids';

// Helper to get the correct price ID
export function getPriceId(productType: ProductType): string | undefined {
  switch (productType) {
    case 'member_monthly':
      return STRIPE_PRICE_IDS.member_monthly;
    case 'member_yearly':
      return STRIPE_PRICE_IDS.member_yearly;
    case 'wellpass_monthly':
      return STRIPE_PRICE_IDS.wellpass_monthly;
    case 'wellpass_yearly':
      return STRIPE_PRICE_IDS.wellpass_yearly;
    case '10card':
      return STRIPE_PRICE_IDS.tenCard;
    case '10card_kids':
      return STRIPE_PRICE_IDS.tenCardKids;
    default:
      return undefined;
  }
}

// Helper to determine if product is a subscription
export function isSubscription(productType: ProductType): boolean {
  return productType !== '10card' && productType !== '10card_kids';
}

// Helper to extract tier from product type
export function getTier(productType: ProductType): SubscriptionTier | null {
  if (productType.startsWith('member_')) return 'member';
  if (productType.startsWith('wellpass_')) return 'wellpass';
  return null;
}

// Helper to extract billing period from product type
export function getBillingPeriod(productType: ProductType): 'monthly' | 'yearly' | null {
  if (productType.endsWith('_monthly')) return 'monthly';
  if (productType.endsWith('_yearly')) return 'yearly';
  return null;
}

// Reverse lookup: price ID → tier
export function getTierFromPriceId(priceId: string): SubscriptionTier | null {
  if (priceId === STRIPE_PRICE_IDS.member_monthly || priceId === STRIPE_PRICE_IDS.member_yearly) return 'member';
  if (priceId === STRIPE_PRICE_IDS.wellpass_monthly || priceId === STRIPE_PRICE_IDS.wellpass_yearly) return 'wellpass';
  return null;
}

// Reverse lookup: price ID → billing period
export function getPlanTypeFromPriceId(priceId: string): 'monthly' | 'yearly' | null {
  if (priceId === STRIPE_PRICE_IDS.member_monthly || priceId === STRIPE_PRICE_IDS.wellpass_monthly) return 'monthly';
  if (priceId === STRIPE_PRICE_IDS.member_yearly || priceId === STRIPE_PRICE_IDS.wellpass_yearly) return 'yearly';
  return null;
}
