# Session 342 — Coach-dashboard Subscriptions Due banner + Members Subscriptions sort

**Date:** 2026-05-08 (Opus 4.7)

**Trigger:** Chris pays two athletes (Nikolina Vlasalija + Lisa Vrbanic) in cash for their app subscription and asked for "a warning/reminder when they are due to pay each month." Mid-session he also flagged that the Members → Subscriptions tab sort was unhelpful (sorted by when the member account was created, not by when they actually subscribed).

Two work threads, two commits — checkpoint and close.

---

## Thread 1 — Subscriptions Due banner (checkpoint commit `ea21f50`)

**The data model already existed.** `members.athlete_subscription_end` is the source of truth for when cash-managed app access expires; the `/api/members/athlete-subscription` endpoint had `activate_monthly` (+30d), `activate` (+365d), and `activate_permanent` (no end) actions already wired up. An auto-expire pass on coach data load already flips status to `expired`. A push notification already fires once per session at the 14-day mark, pinging both the athlete AND the coach.

The missing piece was a passive visual reminder for the coach — something he sees when he opens the dashboard, even if he missed the push.

**The build.** [components/coach/SubscriptionsDueBanner.tsx](components/coach/SubscriptionsDueBanner.tsx) — fetches in parallel:
- Cash-managed: `members` rows with `athlete_subscription_status` in `(active, trial)`, not `family_member`, `athlete_subscription_end` between now and +7 days.
- Stripe-managed: `subscriptions` rows with `status='active'`, `current_period_end` between now and +7 days, joined to `members` by id (two queries because Supabase embedded selects via FK can be brittle).

Stripe-managed members are excluded from the cash list via a `stripeMemberIds` set so a member with both a stale `athlete_subscription_end` and an active Stripe sub doesn't appear twice. Rows are sorted ascending by days-left, color-coded red ≤3d / amber 4–7d.

Cash rows render `Renew 1 Month` / `Renew 1 Year` buttons calling the existing API. Stripe rows render an informational `Auto-renew · monthly|yearly` badge (or red `Cancelling at period end` if `cancel_at_period_end=true`). The banner auto-hides when there's nothing to show — zero noise on quiet days.

Mounted in [app/coach/page.tsx](app/coach/page.tsx) inside the existing `!(isModalOpen && searchPanelOpen)` conditional, just above `<CalendarNav>`. This means it follows the same hide-on-mobile-when-modal-open behavior as the calendar.

**Threshold choice (7d, not 14d).** Chris specifically asked for 7d. The push notification at 14d is the early heads-up; the banner at 7d is the action window. This is a deliberate divergence — landed as a landmine in activeContext so a future reader doesn't "fix" the inconsistency. If a coach reports "I got a push but the banner was empty," that's the 8–14d window, expected.

**Renew is reset, not extend.** `activate_monthly` overwrites `athlete_subscription_start = now` AND `athlete_subscription_end = now + 30d`. This is pre-existing API behavior, not introduced here. If Nikolina pays 3 days before her current end, she "loses" those 3 days. Worth knowing if it ever becomes a complaint — would need a new `extend_monthly` action that adds 30d to `current end`, not `now`.

---

## Thread 2 — Members tab Subscriptions sort by first-subscription date (close commit)

**The bug.** The DB query at [hooks/coach/useMemberData.ts](hooks/coach/useMemberData.ts) `fetchMembersWithAttendance` ends with `.order('created_at', { ascending: false })`. This is "newest member account first" — useful for Active/Pending/Blocked tabs, less useful for Subscriptions where Chris wants to see athletes ordered by when they actually started using the app.

**Field-choice trap.** `athlete_subscription_start` would be the obvious sort key, but the API resets it to `now` on every `activate_monthly` / `activate` call. So for cash payers, every renewal would shuffle them to the top of the list. That's exactly what Chris doesn't want.

**The right key.** Tiered fallback per athlete:
1. Stripe sub `created_at` (own row from `subscriptions`)
2. For family members: primary's Stripe sub `created_at`
3. `athlete_trial_start` (set once on `start_trial`, preserved by `extend_trial`, never reset by paid actions)
4. `members.created_at` (final fallback)

Direction: descending (newest first), matching Chris's preference and the existing tab convention.

**The implementation.** Two edits:
- The existing `subscriptions` query selects `member_id, plan_type` — extended to also pull `created_at`. Built `subCreatedAtMap` parallel to `planTypeMap`.
- After all the data merging (family-member inheritance, attendance counts, ten-card splits), a Subscriptions-tab-only post-fetch sort applies the tiered key. Other tabs untouched.

Other tabs (Active / Pending / Blocked / At-Risk) keep the DB-level `created_at desc` order.

---

## Process moments worth remembering

- **Recognized the data path was already 80% built before scoping the work.** First step after Chris's question was to grep for `athlete_subscription_end` — found 11 hits across types/api/components/hooks, including an existing `/api/notifications/subscription-expiring` that already pushes to coach AND athlete at 14d. Surfaced this to Chris BEFORE proposing new build, so he knew the actual gap was just the visual widget — not the entire data model. Saved an explanation cycle.
- **Asked direction question before assuming.** "Place it on /coach top banner, /admin, or /members sidebar?" — Chris asked back "what would you advise?" — gave one-paragraph reasoning for top-banner (passive reminder, auto-hides, same-screen-as-daily-work) and proceeded. The asking step would have been wasted if I'd just picked one, but the asking-then-recommending pattern was right per `feedback_ask_when_unsure.md`.
- **Surfaced the field-choice trap before coding.** When Chris asked for "subscribed date" sort, the obvious `athlete_subscription_start` is wrong because of the API reset. Asked the 3-option question (`athlete_trial_start` / `athlete_subscription_start` / best-of-both) with the trap explained in each description. Chris picked best-of-both. If I'd just picked one and shipped, the cash-renewal-shuffle bug would have surfaced when Nikolina renewed.
- **One landmine logged for future readers.** The 7d-banner-vs-14d-push divergence is not a bug — it's deliberate, but a future reader could easily "fix" it. Logged in activeContext landmines block to prevent that.
- **Mid-session checkpoint shipped at the right boundary.** Banner = standalone feature, sort = different scope (different file, different reasoning). Splitting into checkpoint + close kept each commit's body coherent.

---

## Files touched

| File | Change |
|:---|:---|
| `components/coach/SubscriptionsDueBanner.tsx` | New. Top-of-`/coach` banner. 7d window. Cash + Stripe rows, color-coded, Renew buttons. |
| `app/coach/page.tsx` | Mounted banner inside the `!(isModalOpen && searchPanelOpen)` conditional, just above `<CalendarNav>`. |
| `hooks/coach/useMemberData.ts` | New `subCreatedAtMap` from `subscriptions.created_at`. Subscriptions-tab post-fetch sort: Stripe sub created → primary's Stripe sub created → `athlete_trial_start` → `members.created_at`, descending. |
| `Chris Notes/Forge app documentation/Forge-Feature-Overview.md` | Subscriptions section bullet extended with banner mention. |
| `memory-bank/memory-bank-activeContext.md` | Version 205; S342 entry combining banner + sort; kickoff rewritten for tomorrow's first action; new threshold-divergence landmine; S337 rotated to history. |

TS clean. Production build passes (twice — checkpoint + close).
