# Session 347 — 10-card soft-limit + Members "10-Card" tab + coach impersonation flow

**Date:** 2026-05-11 (Opus 4.7)

**Trigger:** A mum tried to book her two kids (Max & Ole Labudda) and was hard-blocked because their 10-card counter said full. When Mimi opened the modal after the mum complained, "Sessions Used" actually showed **7**, not 10. Recalc kept it at 7. The mum then booked 2 sessions; the chip now reads `9/10` (no `7+2` split) and the bug Chris pointed out is that the chip should have shown the split.

Three asks: (1) remove the athlete-side hard-block, (2) add a proactive "10-card running low" tab so coaches can see this early, (3) fix the chip-vs-modal sync. Plus a fourth thread that came up later: athletes can't find the cancel-subscription button, including one named complaint (Kathrin Mühlen).

---

## 1. 10-card soft-limit

[app/api/bookings/create/route.ts](app/api/bookings/create/route.ts).

- Deleted the `tenCardRemaining <= 0` 402-return. Card-full no longer hard-blocks.
- Kept the `expired` block (different concept — card date has passed, not a count thing).
- Removed `Math.min(used + 1, total)` cap on the counter increment. Now `used + 1` so overage is visible (counter can read 11/10, 12/10, etc.).
- Updated the success-message branch: when `newTenCardRemaining < 0`, toast reads "Session booked, but your 10-card is over its limit by N. Please purchase a new 10-card." Dropped "soon" at Chris's request.

Other increment paths checked: `useBookingManagement.handleManualBooking`, `promoteFromWaitlist` — neither caps at total, so they already allow overage. No change needed.

---

## 2. Members "10-Card" tab

[app/coach/members/page.tsx](app/coach/members/page.tsx) + [hooks/coach/useMemberData.ts](hooks/coach/useMemberData.ts) + [types/member.ts](types/member.ts).

- New `MemberStatus` value `'low-ten-card'`.
- Filter: `members WHERE membership_types contains 'ten_card' AND (ten_card_total ?? 10) - ten_card_sessions_used <= 1`. Includes overage (negatives), which sort to the top.
- New `fetchLowTenCardCount` runs alongside `fetchAtRiskCount` for the badge.
- `refreshData` now `async`/`Promise.all` so the count badge stays in sync after modal saves. Required because `useMemberActions` types `refreshData: () => Promise<void>`.
- Tab styling mirrors At-Risk (purple variant). AlertTriangle icon. Empty state: "No 10-card members are running low."

---

## 3. Stale-chip refresh

[app/coach/members/page.tsx](app/coach/members/page.tsx).

`onOpenTenCard` now calls `refreshData()` before opening the modal. Cheap safety net for the case Mimi hit (chip showed 10/10 red while modal opened with 7). The chip and modal read the same prop (`member.ten_card_sessions_used`); the drift came from page state being stale relative to the DB.

---

## 4. Coach impersonation flow

The actual time-sink of the session — Chris needed to log in as Kathrin to verify whether the "Manage Subscription" button was rendering for her (an athlete who'd complained she couldn't cancel).

### Attempt 1: admin-magic-link via Supabase verify endpoint

Wrote [scripts/admin-magic-link.ts](scripts/admin-magic-link.ts) using `supabase.auth.admin.generateLink({ type: 'magiclink' })`. The returned `action_link` points at Supabase's verify endpoint with `redirect_to=<Site URL>`.

**Problem:** Supabase's admin API silently ignores `options.redirectTo` and uses Site URL (bare root) instead. Even after Chris added `https://app.the-forge-functional-fitness.de/**` to the Redirect URLs allowlist, manually rewriting `redirect_to` in the URL didn't help — the token signature appears to be bound to the original redirect_to, so Supabase rejected the rewritten version and fell back to Site URL.

The bare root landed Chris on `/login` because [app/page.tsx](app/page.tsx) auto-signs-out any session that arrives at `/` (defensive code for old email-confirmation flows).

### Attempt 2: hashed_token + custom /auth/impersonate page

`admin.generateLink` also returns a `hashed_token`. That can be exchanged client-side via `supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })` — bypassing Supabase's verify endpoint entirely.

New [app/auth/impersonate/page.tsx](app/auth/impersonate/page.tsx):
- Reads `?token=` from URL
- Calls `verifyOtp({ token_hash, type: 'magiclink' })`
- Sets Supabase auth cookies on our domain
- Reads `user_metadata.role` and redirects to `/coach` or `/athlete`

Page lives under `/auth/*` so middleware treats it as public (no allowlist work needed).

Script updated to print `${appUrl}/auth/impersonate?token=<hashed_token>` instead of the Supabase verify URL. Works first try.

**Security note recorded as landmine:** anyone with the URL signs in as the matching user. Tokens are single-use + ~1h TTL. Service role required to mint. Don't paste into chat logs.

---

## 5. "Manage or Cancel Subscription" button restyle

[components/athlete/AthletePagePaymentTab.tsx](components/athlete/AthletePagePaymentTab.tsx).

After Chris impersonated Kathrin: button WAS there, but visually so weak (gray text, only visible on hover) that athletes mistook it for body copy. Restyled:
- Outlined teal button (border-2 + padding + fill-on-hover)
- Full-width on mobile, auto-width on desktop
- Renamed "Manage Subscription & Payment Methods" → "Manage or Cancel Subscription" so the cancel intent is visible without hovering

---

## 6. Stripe zombie walkthrough (no code change)

5 athletes stuck in `trialing` from before the S345 `payment_method_collection: 'always'` fix: Tobias, Zoran, Veronika, Soledad, Claudia.

Coached Chris through:
1. WhatsApp message in German (Du form): "bei deinem Abo gab's einen technischen Fehler — es wurde nicht richtig gestartet. Ich storniere es jetzt, damit du dich nochmal anmelden kannst…"
2. Stripe Dashboard → Customer → Subscriptions → click sub → Actions → **Cancel subscription → Cancel immediately**
3. **Do NOT delete the customer** — `stripe_customer_id` stays valid for the re-subscribe path
4. Webhook fires `customer.subscription.deleted` → [route.ts:325](app/api/stripe/webhook/route.ts#L325) flips local `subscriptions.status=cancelled` + `members.athlete_subscription_status=expired`
5. Athlete re-subscribes via the S345-fixed checkout (card now required)

Confirmed for Chris: athlete data is **not** lost in this cycle. No FK cascades from `subscriptions` to lift records / benchmarks / achievements / bookings. Subscription state is purely an app-access gate.

---

## What's NOT shipped (deferred)

- **Chip `7+2` split for family-member kids.** If Max/Ole still render `9/10 ⚠` instead of `7+2/10` after this session's deploy, the cause is [hooks/coach/useMemberData.ts:244-245](hooks/coach/useMemberData.ts#L244-L245): `effectiveMethod = booker.primary_payment_method || booker.membership_types?.[0]`. For family-member kids where `primary_payment_method` is NULL and `membership_types[0]` isn't `'ten_card'`, the booking silently isn't attributed. Forward fix is one-liner: switch to `booker.membership_types?.includes('ten_card')`. Deferred pending Chris's prod verification.
- **The two booking-deletion paths still skip wsr/lift_records/reactions cleanup** (S344 carry). Forward fix shape documented in S344 history; still open.
- **Stripe zombie cancellations themselves** — walkthrough done, Chris executes in Dashboard. Not a code change.

---

## Process moments

- **Trusting Chris's data.** When he said modal showed 7 before Recalc, I initially over-interpreted (suspected the bookings list rather than the Sessions Used input). Chris corrected with "re-read it" — Sessions Used input showed 7 in the DB before Recalc, chip showed 10/10 red on the Members page. The bug was a stale chip, not counter drift.
- **Wasted detour: trying to verify Kathrin's stripe_customer_id with a probe script after Chris had already confirmed the diagnosis verbally.** Got interrupted. Don't re-check things the user just confirmed.
- **Supabase admin API quirks.** Spent meaningful time debugging why `options.redirectTo` isn't honored by `admin.generateLink`. The hashed_token path is documented now; future impersonation work uses [app/auth/impersonate](app/auth/impersonate) directly.
