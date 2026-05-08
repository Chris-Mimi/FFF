# Session 343 — Trial-aware capacity in self-book + OG-toggle promotes waitlist + ConfigureLiftModal remembers last variable scheme

**Date:** 2026-05-08 (Opus 4.7)

**Trigger:** Chris reported today's Foundations 18:30 showing 13/12 on the attendance card. Investigating that surfaced a second class (Sunday 2026-05-10 Foundations 10:00) at 9/10 + 1 stuck on the waitlist after a confirmed athlete had been flipped to OG. Two related correctness bugs in the booking layer, plus a small UX persistence ask for the lift configuration modal landed in the same session.

Three work threads. Two committed (`2999956` for the bookings fixes, then `<close>` for the lift modal + memory bank).

---

## Thread 1 — Bug 1: athlete self-book ignored trial_names

**Diagnosis-first probe before claim.** Wrote `scripts/probe-foundations-overcap.ts` (service-role) listing every booking + trial on the session. DB showed exactly 12 confirmed (non-OG) + 1 trial Carla Courtois → 13 attendees on 12-cap. Card was honest; the question was how the class went over.

**Root cause** at [app/api/bookings/create/route.ts:288 (pre-fix)](app/api/bookings/create/route.ts#L288):

```ts
const confirmedCount = session.bookings?.filter(
  (b: any) => b.status === 'confirmed' && !b.is_og
).length || 0;
```

Capacity check counted only confirmed bookings (excluding OG). Trial names were ignored. The coach-side `useBookingManagement.ts:62` already had the right calc (`confirmedCount + trialNames.length`) — public API drifted.

**Reconstructed sequence:**
1. Class had 11 confirmed + Carla as trial = 12 attendees, at cap.
2. Tobias Baumstark self-booked at 2026-05-08 08:30 (last booking timestamp).
3. API saw `11 < 12` (ignoring trial), confirmed him.
4. Now 12 confirmed + 1 trial = 13/12.

**Fix** — one-line: include `(session.trial_names ?? []).length` in the capacity calc. Renamed for clarity: `confirmedBookingCount + trialCount = onCapacityCount`. The `select('*, bookings(*)')` already pulled `trial_names` so no schema change needed.

**Deferred** — coach-side `handleAddTrialAthlete` ([useBookingManagement.ts:137](hooks/coach/useBookingManagement.ts#L137)) still has no capacity guard. A coach can add a trial to an at-cap class. Lower priority since it's a deliberate coach action with the data visible. Logged as a landmine.

---

## Thread 2 — Bug 2: OG toggle skipped waitlist promotion

**Diagnosis.** Sunday 2026-05-10 Foundations 10:00 had 9 confirmed (non-OG) + 1 confirmed OG (Carole Schultz, pregnant, only does Open Gym) + 1 waitlisted (Daniel Steller). When Chris flipped Carole to OG, her slot freed up — but Daniel stayed waitlisted.

**Root cause** at [useBookingManagement.ts:399-415 (pre-fix)](hooks/coach/useBookingManagement.ts):

```ts
const handleToggleOg = async (bookingId, memberName, isOg) => {
  const { error } = await supabase.from('bookings').update({ is_og: isOg }).eq('id', bookingId);
  // … toast and refresh, no promotion logic
};
```

Direct client-side supabase write that bypassed `/api/bookings/cancel`'s 50-line waitlist-promote-with-10-card-cascade-and-notification block.

**Fix** — extracted the promotion block to [lib/coach/promoteFromWaitlist.ts](lib/coach/promoteFromWaitlist.ts): finds the longest-waiting waitlister, promotes to confirmed, cascades 10-card increment for ten_card payers (own card or shared parent card via `ten_card_holder_id`), fires `notifyWaitlistPromoted`. Helper takes a `SupabaseClient` parameter so it works with both user-authed (cancel route) and admin (toggle-og route) clients.

New [app/api/bookings/toggle-og/route.ts](app/api/bookings/toggle-og/route.ts) (`requireCoach`): flips `is_og`, then if the booking was confirmed AND `is_og` flipped non-OG → OG, calls the helper. Returns `{ promotedMemberId }` so the client can surface a "first waitlist athlete promoted" toast.

[useBookingManagement.ts](hooks/coach/useBookingManagement.ts) `handleToggleOg` now `authFetch`'s the new endpoint. Toast updated to mention promotion when one fired.

[app/api/bookings/cancel/route.ts](app/api/bookings/cancel/route.ts) refactored to call the same helper — same commit so both paths share testing surface and the helper proves itself in the original use case before being exposed to the new one.

**Live data heal.** The fix is forward-looking — Chris's Sunday class was still in the broken state after deploy. UI flow: toggle Carole's OG off, then back on. The second toggle (non-OG → OG) hit the new server route and promoted Daniel. Confirmed working on prod. Toast worked as expected.

**Today's 18:30 still over by 1.** Carla was added before the self-book guard existed, so she's still there. Chris's call: remove Carla (trial) or push Tobias (last self-book) to waitlist. New self-book guard prevents recurrence.

---

## Thread 3 — ConfigureLiftModal remembers last variable scheme

Chris asked: "When I configure a variable reps scheme for any lift I would like the modal to stay in the last state I left it."

**Implementation** at [components/coach/ConfigureLiftModal.tsx](components/coach/ConfigureLiftModal.tsx):

Two new localStorage keys: `configureLiftModal:lastVariableSets` and `configureLiftModal:lastRepType`. Initial state reads from localStorage with fallback to the existing hardcoded 7-row default (10@40, 6@50, 5@60, 5@70, 5@80, 5@85, 5@90). New `useEffect` writes both values whenever they change — but only when adding a new lift (`!editingLift`). Editing an existing lift loads from that lift's saved data, unchanged.

The reset branch in the existing `useEffect` (was hardcoded defaults) now also reads from localStorage.

**Scope decision.** Considered persisting all form state (`sets`, `reps`, `percentage`, `rmTest`) but kept it narrow — Chris's ask was specifically about the variable scheme. Constant-tab defaults (5×5, no percentage) and RM-test reset are fine to clear each time.

---

## Process moments worth remembering

- **Wrote the probe BEFORE the theory.** S338 lesson sticking. First reaction to "13/12 on Foundations" could have been "stale data" or "race condition" — instead, ran the probe, saw 12 confirmed + 1 trial, and the bug location followed from the data not from a guess.
- **Recognized two bugs from one report.** Chris flagged today's 13/12; while looking at it I asked him about Sunday's stuck waitlist (he'd mentioned it earlier in the chat). Both turned out to be capacity-state bugs rooted in places that mutate booking status without running the full waitlist-promotion flow. Single commit covered both.
- **Extracted to shared helper at exactly the right moment.** When the second use case appeared (toggle-og route), pulled the cancel route's promotion block into a helper rather than duplicating. Avoided the trap of "consolidate later" — second copy never gets cleaned up. Refactored cancel route in same commit so both paths share testing.
- **Called the API design separation deliberately.** The helper handles only the promotion step; the caller decides *when* to invoke it (after a confirmed→cancelled, or a confirmed-non-OG→OG). Avoided a more "general" helper that tries to detect whether a slot is free; that abstraction would have been wrong shape.
- **Live data heal via UI flow, not a script.** Could have written a one-shot promotion script but the new route + Chris's UI click was simpler and exercised the new code path end-to-end on real data — testing the fix WHILE healing the live state.
- **Asked one question before close.** The ConfigureLiftModal change was uncommitted because Chris had said "Not yet" earlier. At close time, asked once: include in close commit, hold back, or revert. Chris said include. No assumption.

---

## Files touched

| File | Change |
|:---|:---|
| `app/api/bookings/create/route.ts` | Capacity check now `confirmedBookingCount + trialCount`. |
| `lib/coach/promoteFromWaitlist.ts` | New shared helper — extracted from cancel route. |
| `app/api/bookings/cancel/route.ts` | Refactored to call helper. |
| `app/api/bookings/toggle-og/route.ts` | New `requireCoach` route. Flips `is_og`, promotes waitlister when slot frees. |
| `hooks/coach/useBookingManagement.ts` | `handleToggleOg` calls new endpoint via `authFetch`; toast surfaces promotion. |
| `components/coach/ConfigureLiftModal.tsx` | localStorage persistence for variable scheme + rep type. |
| `memory-bank/memory-bank-activeContext.md` | Version 206; S343 entry; 3 new landmines (trial-count rule, coach trial-add unguarded, capacity-mutation must run promotion); kickoff rewritten; S338 rotated to history. |

TS clean. Production build passes.
