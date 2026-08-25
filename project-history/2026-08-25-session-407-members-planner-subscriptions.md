# Session 407 — Members / Planner / Subscriptions batch

**Date:** 2026-08-25 · **Model:** Opus 4.8
**Status:** 8 commits + 2 migrations, all pushed to `main`, tsc+build clean, tested live by Chris.

---

## 1. Subscriptions Due banner overhaul (`5dcd440`)

Three linked changes to how lapsed/expiring subscriptions behave:

- **Lapsed warnings persist until acted on.** [SubscriptionsDueBanner.tsx](../components/coach/SubscriptionsDueBanner.tsx)
  had a 14-day floor (`fourteenBackIso`) on both the cash and Stripe lapsed queries, so a
  still-unrenewed member silently dropped off the banner after two weeks. Removed the floor on
  both — a lapsed row now stays until the coach **Renews** (cash) or **✕ dismisses** it.
- **Cash grace 4 → 7 days.** The coach-side auto-expire in [useMemberData.ts](../hooks/coach/useMemberData.ts)
  (`cashGraceCutoff`) now waits a full week past a cash `active` sub's end date before flipping it
  to `expired`. Trials still expire on their end date; Stripe is never auto-expired.
- **Athlete app reminder covers the week.** [PaymentDueBanner.tsx](../components/athlete/PaymentDueBanner.tsx)
  `GRACE_DAYS` 4 → 7 so the "Mitgliedschaft fällig … noch X Tage" reminder spans the whole grace.

**Data check before shipping the persistence change:** ran a service-role count of what would surface
with no time floor — only 4 non-parked lapsed members (2 from the prior day, 2 ~4 months old). Not a
flood. The 2 old ones (Torben Stoffer, David Montgomery) were **beta testers**; dismissed them via
`members.lapsed_banner_dismissed_at = now()` so they don't reappear.

**Behaviour note for future:** the coach banner now shows a cash member as red "lapsed X days ago"
from day 1, while the athlete still has access + their own pay-reminder for 7 days. Access is cut on
day 8 if still unpaid. That split (coach nudged to collect, athlete nudged to pay, access preserved)
is intended.

## 2. Planner usage-recency dots in the Movement Library (`b266eb4` + `3bf5716`)

Chris wanted the Planner's "how long since I programmed this" colours available while picking
exercises in the workout create/edit modal, without switching to the Planner.

- New [utils/exercise-recency.ts](../utils/exercise-recency.ts) is the **single source of truth** for
  the recency bands (≤14 green / ≤28 yellow / ≤60 orange / ≤90 red / 90+ grey / never). Planner
  `PatternExerciseChips` now imports the band + label helpers from it (removed its duplicate copies —
  the two surfaces can't drift).
- A `makeRecencyMapLoader` cache factory produces one **session-cached** full-history map per library
  type (exercise / lift / benchmark / forge), each keyed by that type's own id. `getExerciseFrequency`
  et al. scan the whole published-workout history, so this runs once per session per tab and is free
  on every reopen (the Planner pays the same cost on mount).
- [MovementLibraryPopup.tsx](../components/coach/MovementLibraryPopup.tsx): a leading dot + "last
  programmed" tooltip on every row across all four tabs (Exercises incl. Favorites/Recently Used,
  Lifts, Benchmarks, Forge) + a shared legend gated on the active tab's map.

**Design choice:** a dot (not a full row tint) because the library is a dense column list and a tint
would fight the hover state and read as noise. Honest caveat surfaced to Chris: the library shows the
*whole* catalogue, so un-programmed exercises are a sea of grey "never" — colour pops only on what he
actually uses (arguably a retire cue).

## 3. Wellpass — Lani Neumann linked to mum Katja (`3c9ffd9`, DB-only)

Katja Neumann (primary, pays Wellpass) was linked to her Wellpass identity; her child **Lani**
(family_member, also `wellpass`) was not, so Lani's bookings didn't count toward the household. The
Excel sync only auto-links **one** member per Wellpass name (exact / reversed word order) — there is
**no UI** to attach a second household member. Inserted the `wellpass_identity_members` row directly
([scripts/link-lani-to-katja-wellpass.ts](../scripts/link-lani-to-katja-wellpass.ts), idempotent).

**Process learning (re-learned):** a Supabase `.or()`/`.ilike` query that errors returns `data: null`,
which I initially misread as "no such member" — the `.error` trap from claude-rules. Checking `.error`
revealed the members existed; the column names (`primary_member_id`, no `wellpass_name` on members)
were the actual issue.

## 4. Park / Block reason feature (`2c7b29a` + `95bc2e0` + `2734a6a`)

Coach wanted to record **why** a member is parked/blocked.

- **Capture (`2c7b29a`, migration `20260824000000`).** The shared confirm dialog
  ([lib/confirm.ts](../lib/confirm.ts) + [ConfirmDialog.tsx](../components/ui/ConfirmDialog.tsx))
  gained an optional text field + a `confirmWithReason()` helper — chosen over a native `prompt()` so
  Block keeps its red danger styling. Reason is optional, coach-only, cleared on Restart/Unblock.
- **Inline edit (`95bc2e0`).** The 23 members parked *before* the feature had no way to get a reason
  without Restart→re-Park. Added a `ReasonEditor` on Parked/Blocked rows ("+ add reason" / pencil to
  edit) + a service-role [status-reason route](../app/api/members/status-reason/route.ts).
- **Privacy hardening (`2734a6a`, migration `20260825000000`) — the important part.** The reasons were
  columns on `members`, and the members SELECT policy is `auth.uid() = id OR auth.uid() = primary_member_id`.
  So an athlete can read **their own** row, every column — and a **parked** athlete keeps full access,
  so could fetch their own reason via the API. Column-level hiding is impossible here: coaches and
  athletes share the Postgres `authenticated` role (distinguished only by a JWT `role=coach` flag).
  **Fix:** moved both reasons to a dedicated **`coach_member_notes`** table whose RLS grants access to
  coaches only (`(auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'`, the app's standard coach check)
  — no athlete policy means athletes can't read it at all. Writes go through the service-role park/
  block/unblock/status-reason routes (best-effort via `lib/coach/memberNotes.ts` so a note write never
  fails the action); [useMemberData.ts](../hooks/coach/useMemberData.ts) merges the notes in for the
  Parked/Blocked tabs only; the `members` columns were dropped.

**Verified the guarantee** with a script: dropped columns confirmed gone; inserted a test note via
service role; **anon (non-coach) read returned 0 rows though the row exists**; service role saw it;
cleaned up. Security holds regardless of the coach policy being subtly wrong — worst case is the coach
doesn't see notes (a functional bug, immediately visible), never a leak, because no athlete-permitting
policy exists.

**Deploy ordering** (told Chris explicitly): push code first (stops reading the columns from `members`),
then run the migration after the deploy is live (it drops the columns). The reason feature is the only
thing briefly inert in the gap; note reads/writes are best-effort so nothing else breaks.

## 5. Parked-athlete rebook notification (`aec03be`)

A parked athlete still has booking access, so a parked athlete self-booking is a signal they're
returning. The athlete self-book route ([bookings/create](../app/api/bookings/create/route.ts)) now
does a service-role read of the booker's `parked` flag (RLS-safe — the booker may be a parent) and, if
parked, fires `notifyParkedMemberBooked` → coach push + `notification_log` entry ("Parked athlete is
back — Restart them?", links to Members). Fire-and-forget; never blocks the booking. Fires on **each**
booking while parked until the coach Restarts them (self-limiting; dedupe-to-once deferred unless it
proves noisy).

---

## Carry-overs into S408

- **S405 prod verifications still pending** (not revisited this session): attendee-list fix (Michael
  Städele), mobile Planner UX.
- **S407 functional check:** coach-only read of `coach_member_notes` via the UI (park with a reason →
  shows on Parked tab). Automated test covered only the non-coach-blocked half.
