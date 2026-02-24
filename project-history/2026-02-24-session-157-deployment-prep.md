# Session 157 — Deployment Prep (Phase 1: Code Changes)

**Date:** 2026-02-24
**Model:** Opus 4.6

---

## Accomplishments

1. **Free booking model:**
   - Removed subscription gate from `app/member/book/page.tsx` — all active members book freely
   - 10-card members still get sessions deducted (API already handled this correctly)
   - Updated warning banner: now only shows for 10-card members with no sessions/expired

2. **Payment UI restructured (`AthletePagePaymentTab.tsx`):**
   - Split into two clear sections: "Athlete App Subscription" + "Gym Session Passes"
   - Athlete Monthly: €7.50/mo with "1 month free trial" badge
   - Athlete Yearly: €75/yr with "Save €15" badge
   - 10-Card: €150 one-time, shown separately
   - Added actual pricing (was "Contact for pricing")
   - Feature list updated with specific icons (Dumbbell, Trophy, BarChart3, Users)

3. **Beta tester flag:**
   - Migration: `is_beta_tester BOOLEAN DEFAULT false` on members table
   - `app/athlete/page.tsx` — beta testers bypass subscription check
   - **Chris questioned if this is needed** — revisit in next session

4. **WorkoutModal race condition fix:**
   - Added `await` before `onSave(dataToSave)` in both instances (lines 120, 341)
   - Root cause: save fired without await, then onClose() ran immediately
   - Modal closed before DB write + fetchWODs completed → stale data on reopen

5. **UpgradePrompt updated:**
   - Added "Leaderboards & achievements" to benefits
   - Updated pricing text: "From €7.50/month with 1 month free trial"

6. **.env.example updated:**
   - Added VAPID keys section (was missing)
   - Changed APP_URL to production domain

---

## Files Changed

**Modified:**
- `app/member/book/page.tsx` — Free booking, 10-card-only gating
- `app/athlete/page.tsx` — Beta tester bypass in access check
- `components/athlete/AthletePagePaymentTab.tsx` — Two-section payment UI with pricing
- `components/athlete/UpgradePrompt.tsx` — Launch pricing, updated benefits
- `components/coach/WorkoutModal.tsx` — await onSave race condition fix
- `.env.example` — VAPID keys + production domain

**Created:**
- `supabase/migrations/20260224_add_beta_tester_flag.sql` (gitignored, run in SQL Editor)
- `project-history/2026-02-24-session-157-deployment-prep.md`

---

## Key Decisions

- **Free booking for all** — Booking benefits the gym (capacity management). Athlete app features are the upsell.
- **10-card stays separate** — It's for gym attendance (drop-in), not app features. €15/session × 10 = €150.
- **Launch pricing** — €7.50/mo or €75/yr, rising to €10/€100 after 1 month. Change prices in Stripe Dashboard only.
- **Subdomain** — `app.the-forge-functional-fitness.de` (Squarespace main site untouched)
- **Vercel** — Chosen for deployment (free hobby tier, built for Next.js)

## Business Model (3 layers)

1. **Gym attendance:** Member (free booking), 10-card (€150/10 sessions), Drop-in (€20/session)
2. **App access:** Free for all active members (sign up, log in, book)
3. **Athlete subscription:** €7.50/mo or €75/yr (logbook, records, leaderboards, achievements)

---

## Open Questions for Next Session

1. **Beta tester flag vs coach activation** — Chris asked "Can't I just activate them on the member page?" May be simpler to let coach set subscription status directly.
2. **Drop-in payment flow** — Not yet implemented. €20/session for visitors. Defer post-launch?
3. **Scoring boxes styling** — From Chris Notes: "Make the scoring boxes look more appealing!" (deferred)
