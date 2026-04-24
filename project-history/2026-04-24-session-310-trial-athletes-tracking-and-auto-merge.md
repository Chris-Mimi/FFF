# Session 310 — Trial-Athlete Tracking + Auto-Merge on Registration

**Date:** 2026-04-24
**Model:** Opus 4.7

---

## The Problem

Coach had no formal way to mark trial athletes (people the gym knows are coming to try a class but haven't registered). Workaround: write "(trial)" in a workout-section text field. No structured surface for "how many trials onboarded last month", no count toward class capacity, no link to their score post-class.

## Design Iteration

**First proposal:** relax `bookings.member_id` to nullable + add `bookings.whiteboard_name` so trials become unregistered bookings.

**Why rejected:** Chris asked for the lowest-impact option that wouldn't risk breaking the working booking system. INNER JOINs on `bookings → members` would need an audit across 5–10 spots.

**Second proposal (shipped):** add `weekly_sessions.trial_names TEXT[]` — a per-session list of names, completely orthogonal to bookings. Counts toward capacity in UI/booking-decision logic. Surfaces in Score Entry via the existing `whiteboard_name` pathway. Zero impact on bookings/leaderboards/attendance schema.

**On auto-merge after registration:** picked Option 2 (convert trial_names entry into a `confirmed` booking but leave the original `trial_names` entry in place). Trade: data duplication once registered, but the duplication is append-only and gives Chris a permanent "we onboarded N people last month" metric in Admin Tools that doesn't disappear when a trial converts.

## Implementation

7 files (1 SQL + 6 application):

1. **`database/20260424_add_trial_names.sql`** — `ALTER TABLE weekly_sessions ADD COLUMN trial_names TEXT[] DEFAULT '{}' NOT NULL`. Run by Chris in Supabase.

2. **`hooks/coach/useSessionDetails.ts`** — `SessionDetails.trial_names: string[]` field. Existing `select('*')` brings it through automatically.

3. **`hooks/coach/useBookingManagement.ts`** — new `trialNames` prop. `handleManualBooking` now uses `confirmedCount + trialNames.length` for the capacity-vs-waitlist decision. Two new handlers:
   - `handleAddTrialAthlete` — `window.prompt` for name, dedup against existing trial names (case-insensitive), append to array via supabase update.
   - `handleRemoveTrialAthlete` — confirm, filter, update.

4. **`components/coach/ManualBookingPanel.tsx`** — new `+ Trial Athlete (enter name)` sentinel option at top of Add Member dropdown. Selecting it resets `selectedMemberId` to empty (so the regular Add Member button stays disabled) and immediately fires `onAddTrialAthlete`. Capacity copy now includes `(N trials included)` parenthetical when non-zero.

5. **`components/coach/SessionManagementModal.tsx`** — wired the new prop, added an amber chip section above Confirmed Bookings showing each trial name with × to remove. "Confirmed Bookings (X/Y)" header sums confirmed + trial counts so the chip reflects total people attending.

6. **`hooks/coach/useCoachData.ts`** — `weekly_sessions` select now pulls `trial_names`. The booking_info `confirmed_count` includes `trial_names.length`, so the calendar tile capacity badge naturally bumps up when trials are added.

7. **`app/api/score-entry/[sessionId]/route.ts`** — fetches `trial_names`, appends each as a whiteboard-style athlete (display name `Anna (trial)`, `whiteboardName: 'Anna'`). De-dupes against existing booked members + Whiteboard Intro section names so a name in both places doesn't double-render.

8. **`app/coach/admin/page.tsx`** (Admin Tools) — new `fetchTrialStats` queries `weekly_sessions` for the current attendance date range (mirrors fetch logic for pill-mode and month-mode), flattens trial_names, groups by name with `{name, count, dates[]}`. Renders an amber "Trial Athletes" panel above the rankings table on the Attendance tab. Header shows aggregate `X trial sessions · N unique athletes`. Each chip: name + ×N badge if multi-tried + tooltip with comma-joined dates.

9. **`app/api/members/approve/route.ts`** — after the existing whiteboard-score migration block, query `weekly_sessions` where `trial_names` array contains the new `whiteboard_name` → INSERT `status='confirmed'` bookings for each session (skipping any session the member is already booked in). `trial_names` array NOT modified — stays as the permanent record per Option 2 above.

## A UX Snag Caught Mid-Session

After ship, Chris reported the "Confirmed Bookings (4/10)" header inside the modal didn't bump up when he added a trial. He also wanted the calendar-tile badge to bump. Both were valid bugs because I'd only updated the `ManualBookingPanel` capacity-copy line — the heading + tile chip use different counters. Fixed in the same session: SessionManagementModal heading line and `useCoachData.ts` `confirmed_count`.

## Lessons

- **"Capacity count" lives in three places per session:** the inline ManualBookingPanel copy, the modal section heading, and the calendar-tile badge (sourced via useCoachData's `booking_info.confirmed_count`). When changing what counts as "taken", touch all three or expect a follow-up.
- **Window.prompt is fine for a one-field input** when the surrounding flow is a single entry point. No need to build a custom inline-input component for an edge-case action.
- **Schema relaxation is rarely the cleanest path** when the underlying table is at the heart of the working system. A side column on a parent table (`weekly_sessions.trial_names`) often beats relaxing a child table's NOT NULL.
