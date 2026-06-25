# Session 389 — Kids 10-Card (€85) + expanded payment features, cash-grace verified

**Date:** 2026-06-25 · **Model:** Opus 4.8

## Summary

Three pieces of work, all on the Athlete App Payment tab + Stripe plumbing:
1. **Cash-grace reminder banner — verified on prod + styling polish** (S388 carry-over).
2. **Kids 10-Card (€85)** — new one-time purchase option mirroring the adult 10-card.
3. **"All plans include" feature list** — expanded 4 → 11 features.

`npx tsc --noEmit` and `npm run build` both clean. Backup taken at close.

---

## 1. Cash-grace banner — verified + polished

S388 shipped [`PaymentDueBanner.tsx`](../components/athlete/PaymentDueBanner.tsx) but it was never confirmed live. This session verified it via magic links:
- **Cash member** (lisa.paval@web.de) — saw the banner. ✅
- **Stripe payer** (marion.sontheimer@web.de) — no banner (excluded via the `subscriptions` active/trialing check). ✅
- **Trial** (pkpeterkroll0807@gmail.com) — no banner (only fires for `status==='active'`). ✅

**Testing trick:** the member had 3 days left, but the window starts at `end − 2` (`LEAD_DAYS=2`), so she was just outside it. Rather than fiddle with her Supabase date, temporarily bumped `LEAD_DAYS` to **4** (so `end − 3` lands safely inside, dodging the `Math.ceil` rounding edge at exactly 3 days), pushed, verified, then **reverted to 2**.

**Styling polish (Chris):** original banner was `bg-amber-500/15` faint translucent + small text — "wishy washy". Now solid `bg-amber-500`, larger bold text (`text-base sm:text-lg`), heavier border + shadow. Chris wanted a 🙂 added; the yellow emoji was lost on the amber, so it now sits in a **small white circular badge** (`w-7 h-7 rounded-full bg-white`) next to the text. (A text `:)` was tried first but Chris preferred the emoji.)

---

## 2. Kids 10-Card (€85)

**Ask:** a cheaper kids 10-card option in the Athlete App payment section. Confirmed with Chris: structurally identical to the adult card (10 sessions, 12-month validity), only the price differs (€85 vs €150 = €8.50/session).

**Stripe:** Chris created a new one-time EUR price in **live mode**. First paste was the *product* ID (`prod_…`) — flagged it; the checkout needs the *price* ID. Correct price: `price_1TmEWhRc17SxAgW5WHn0yu46`. Added to `.env.local` (gitignored) locally; Chris adds the same to **Vercel → Production** env as `STRIPE_PRICE_10CARD_KIDS_ID` (env change needs a redeploy — the feature commit's push covers it if the var is already saved).

**Code (4 files):**
- [`lib/stripe.ts`](../lib/stripe.ts) — added `tenCardKids` to `STRIPE_PRICE_IDS`, `'10card_kids'` to `ProductType`, a `getPriceId` case, and excluded it from `isSubscription` (so checkout runs in `payment` mode, not `subscription`).
- [`app/api/stripe/webhook/route.ts`](../app/api/stripe/webhook/route.ts) — the activation branch now matches `'10card' || '10card_kids'`; both activate an identical 10-session / 12-month card.
- [`app/api/stripe/create-checkout/route.ts`](../app/api/stripe/create-checkout/route.ts) — **no change needed**: `getTier` returns null for 10-cards so the tier-eligibility gate is skipped, and the trial logic already excludes non-subscriptions.
- [`components/athlete/AthletePagePaymentTab.tsx`](../components/athlete/AthletePagePaymentTab.tsx) — the single 10-card became a 2-up grid (`sm:grid-cols-2`, `max-w-3xl`); added the Kids card. `handlePurchase` union + the `wantsTrial` guard extended with `'10card_kids'`.

**Styling iterations on the kids card:** first a full pastel pink theme (bg, border, icons, button), then Chris asked for white card with only the **button** pink — final state: identical white card to the adult, purple icon/checks, pink "Buy Kids 10-Card" button.

**Deliberate non-gating:** the kids card is purchasable by any logged-in athlete (same as the adult card — no membership-type restriction). Not gated to kids accounts; Chris manages who buys what. Flagged but kept simple per the don't-add-friction rule.

---

## 3. "All plans include" feature list

Chris wanted the subscription feature list ("All plans include:") to advertise more of the app. Pulled candidates from the verified [`Forge-Feature-Overview.md`](../Chris%20Notes/Forge%20app%20documentation/Forge-Feature-Overview.md) (athlete section) so nothing is oversold.

Expanded 4 → 11:
- **Existing:** Workout logbook · Personal records & lifts · Benchmarks & progress tracking · Leaderboards & achievements
- **Added:** Workout timer (AMRAP, EMOM, Tabata…) · 1RM / rep-max calculator · Automatic PR detection · Whiteboard photo logging · Personal activity tracker (runs, swims & more) · Shareable result cards · Push notifications (PRs & new workouts)

New lucide icons imported: `Timer, Calculator, Camera, Activity, Share2, Bell, Sparkles`. Chris explicitly **excluded TV/gym-display mode** (coach-side, not an athlete plan feature).

---

## Next session

1. **Confirm Kids 10-Card on prod** — `STRIPE_PRICE_10CARD_KIDS_ID` live in Vercel (Production); Buy Kids 10-Card → Stripe shows €85.00.
2. S384 / S383 spot-checks (still pending from those sessions).
3. Optional: backup-gap whiteboard sweep for other RM weeks (2025-12-09 → 2026-03-19).
