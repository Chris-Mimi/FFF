# Session 200 — Domain Verification + Booking Bug Fixes

**Date:** 2026-03-13
**Model:** Opus 4.6

## Accomplishments

### Resend Domain Verification
- Added SPF/DKIM/DMARC DNS records in Squarespace for `the-forge-functional-fitness.de`
- Updated `EMAIL_FROM` from `onboarding@resend.dev` to `noreply@the-forge-functional-fitness.de` in `.env.local` + Vercel
- Domain verified in Resend dashboard

### Full Flow Test (Live Site)
- Tested: register → approve → email → login → Start Free Trial → Stripe checkout with 30-day trial
- Fixed stale test-mode `stripe_customer_id` in Supabase (test customer created with `sk_test_` keys doesn't exist in live mode)
- Trial subscription running for test athlete — verify payment on April 13, 2026

### Bug Fix: Booking Hover Popup Z-Index
- **File:** `components/coach/CalendarGrid.tsx`
- **Issue:** Booked athletes popup appeared below the card underneath (hidden by next session card), especially on unpublished sessions
- **Fix:** Changed popup from `top-full mt-1` (below chip) to `bottom-full mb-1` (above chip)

### Bug Fix: Coach Re-Add Member After Removal
- **File:** `lib/coach/bookingHelpers.ts`
- **Issue:** After coach removed an athlete from a session, their name didn't appear in the member dropdown for re-adding. Status was `coach_cancelled` which passed the `!== 'cancelled'` filter.
- **Fix:** Changed `filterAvailableMembers` to only exclude `confirmed`/`waitlist` statuses (same pattern as Sessions 197/198 booking fixes)

## Key Decisions
- Let test athlete's trial run full 30 days to verify real payment processing end-to-end
- Stripe fees on €7.50 are ~€0.47, acceptable for live verification
