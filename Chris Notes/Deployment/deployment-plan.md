# Deployment Plan — Forge Functional Fitness

## Context
Feature-complete after 156 sessions. Deploying to Vercel at `app.the-forge-functional-fitness.de`. Before deploying, we need to restructure the payment model and add beta tester support. Squarespace main site stays untouched.

---

## Business Model (3 layers)

### Layer 1: Gym Attendance (how you physically attend)
| Type | Cost | How it works |
|------|------|-------------|
| Member | Paid outside app | Gym membership, books freely |
| 10-Card | €150 (10 sessions) | €15/session, purchased in-app via Stripe, deducted on booking |
| Drop-in | €20/session | Visitors, pay per session |

### Layer 2: App Access (free for everyone)
- All active members can: sign up, log in, book classes, view schedule

### Layer 3: Athlete App Subscription (optional add-on)
| Plan | Launch Price | Post-Launch Price |
|------|------------|------------------|
| Monthly | €7.50/mo + 1 month free trial | €10/mo |
| Yearly | €75/yr + 1 month free trial | €100/yr |

**Features unlocked:** Logbook, Records, Lifts, Benchmarks, Leaderboards, Achievements, Push Notifications, Community reactions, Timer, Photos

**Price change:** After 1 month, update prices in Stripe Dashboard. Existing subscribers keep original price.

---

## Phase 1: Code Changes ✅ DONE (Session 157)

- ✅ Free booking — all active members book freely, 10-card still deducted
- ✅ Payment UI split into "Athlete App Subscription" + "Gym Session Passes"
- ✅ Locked tabs with upgrade preview for non-subscribers
- ✅ Beta tester flag (`is_beta_tester` on members table)
- ✅ WorkoutModal race condition fix
- ✅ .env.example updated with production domain + VAPID keys
- ✅ Build passes, committed, pushed

**Open question:** Chris asked "Can't I just activate beta testers on the member page?" — revisit in next session.

---

## Phase 2: Vercel Setup (Chris with guidance)

1. Create Vercel account at vercel.com/signup (sign up with GitHub)
2. Import `forge-functional-fitness` repo
3. Add ALL environment variables from `.env.local`
4. Set `NEXT_PUBLIC_APP_URL` = `https://app.the-forge-functional-fitness.de`
5. Deploy

---

## Phase 3: Domain Setup (Chris with guidance)

1. In Vercel: Add domain `app.the-forge-functional-fitness.de`
2. In Squarespace: Add CNAME record `app` → `cname.vercel-dns.com`
3. Wait 5-30 min for DNS propagation
4. Verify HTTPS works at `https://app.the-forge-functional-fitness.de`

---

## Phase 4: Supabase Config (Chris with guidance)

1. Authentication → URL Configuration:
   - Site URL: `https://app.the-forge-functional-fitness.de`
   - Add redirect URL: `https://app.the-forge-functional-fitness.de/**`
2. Verify RLS policies enabled on all tables

---

## Phase 5: Stripe Live Mode (Chris with guidance)

1. Complete Stripe onboarding (business details, German bank)
2. Toggle to Live mode
3. Create products:
   - **Athlete Monthly:** €7.50/mo with 1-month free trial
   - **Athlete Yearly:** €75/yr with 1-month free trial
   - **10-Card:** €150 one-time payment
4. Copy live API keys (`sk_live_...`, `pk_live_...`)
5. Create webhook: `https://app.the-forge-functional-fitness.de/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
6. Update all Stripe env vars in Vercel → Redeploy

---

## Phase 6: Beta Testing

1. Mark 4-5 testers: `UPDATE members SET is_beta_tester = true WHERE email IN (...)`
2. Beta checklist:
   - [ ] Free booking works for all active members
   - [ ] 10-card purchase + session deduction works
   - [ ] Athlete subscription checkout works
   - [ ] Beta testers see all Athlete features without paying
   - [ ] Non-subscribers see locked tabs with upgrade prompt
   - [ ] Coach dashboard fully functional
   - [ ] Workout create/edit/save/reopen (bug fix verified)
   - [ ] Push notifications, leaderboards, achievements work
   - [ ] Mobile PWA install works
3. End beta: `UPDATE members SET is_beta_tester = false WHERE is_beta_tester = true`

---

## Phase 7: Launch

1. After 1 month: update Stripe prices to €10/mo and €100/yr
2. Existing subscribers keep launch pricing automatically

---

## Phase 8: Commercialization (When Ready to Sell)

**Before selling/licensing the app to other coaches:**
1. **Make repo private:** GitHub → Chris-Mimi/FFF → Settings → Visibility → Make private
2. **Upgrade Vercel to Pro ($20/mo)** so auto-deploy continues working with a private repo
3. Alternatively, skip Vercel Pro and use manual redeploy (free but requires a click after each push)
4. The `LICENSE` file (All Rights Reserved) is already in place — protects against code copying

---

## Migrations Pending (run in Supabase SQL Editor)

```sql
-- 1. Coach cancelled status (from session 152)
-- File: supabase/migrations/20260223_add_coach_cancelled_status.sql

-- 2. Beta tester flag (from session 157)
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_beta_tester BOOLEAN DEFAULT false;
```

---

## What Chris Needs Ready

1. **GitHub account** (to connect Vercel)
2. **Stripe account** with completed onboarding
3. **Squarespace domain admin access**
4. **`.env.local` contents** (to paste into Vercel)
5. **4-5 beta tester email addresses**
