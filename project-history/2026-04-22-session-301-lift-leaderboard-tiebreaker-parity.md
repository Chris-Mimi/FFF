# Session 301 — Lift Leaderboard Tiebreaker Parity

**Date:** 2026-04-22
**Model:** Opus 4.7
**Persona:** Athlete
**Status:** Code shipped; awaiting live test

---

## Origin

Chris tested S300 on the "Front Squat 5RM" leaderboard under a Mon WOD —
seven athletes tied at 80 kg, ranks still showed 2, 3, 4, 5, 6, 7, 8 (distinct)
instead of a shared rank 2. Chris is the oldest athlete in the box with DOB
set and expected to lead the 80 kg group.

Root cause: the "Front Squat 5RM" chip is a `type: 'lift'` item, sourced from
`lift_records`, routed through `rankLiftResults`. S300 only patched
`rankSectionResults` (wod_section_results path). S300's own close-log flagged
this explicitly as a follow-up:

> Scope: `rankSectionResults` only (WOD section leaderboards).
> `rankBenchmarkResults` (benchmarks) + `rankLiftResults` (lift PRs) unchanged
> — noted as potential follow-up if Chris wants parity.

---

## What shipped

### `rankLiftResults` — tiebreaker chain + shared ranks

**File:** [utils/leaderboard-utils.ts](utils/leaderboard-utils.ts)

Replaced the old "sort by weight, assign `i + 1` sequentially" implementation.
New behavior:

1. Build `LeaderboardEntry[]` from real lift records (with `age` +
   `sessionTime` populated from `memberAges` + `r.session_time`), then push
   whiteboard entries (which get `age: null`).
2. Sort by:
   1. `weightResult` DESC (primary — and the equality predicate for
      shared-rank assignment).
   2. Age DESC, missing age (`null`) → `-Infinity` (youngest).
   3. `resultDate` ASC (earlier first).
   4. `sessionTime` ASC (17:15 before 18:30; missing → `Infinity`).
3. Shared-rank loop: if adjacent entries have equal `weightResult`, inherit
   the previous rank; otherwise rank = index + 1. Standard competition
   ranking (1, 1, 1, 4, …).

### Schema additions

`LeaderboardEntry`:

- `age?: number | null`
- `sessionTime?: string`

`RawLiftResult`:

- `wod_id?: string | null`
- `session_time?: string | null` (annotated by caller)

`rankLiftResults` signature: new optional 5th arg `memberAges`.

### `LeaderboardView` lift path — wiring

**File:** [components/athlete/LeaderboardView.tsx](components/athlete/LeaderboardView.tsx)

- Added `wod_id` to the `lift_records` select.
- Destructures `ages` from `fetchMemberNames(userIds)` (already returned
  since S300).
- After the grouping + best-per-user pass, annotates `session_time` on each
  record:
  1. Collects unique `(wod_id, lift_date)` pairs from filtered lifts.
  2. Fetches `weekly_sessions` for those pairs.
  3. If only one session that day → use its time.
  4. If multiple sessions that day → fetch `bookings` scoped to
     `session_id IN (...)` AND `member_id IN (lift_records.user_id[])`, match
     member's booking to the session, use that session's time. Valid because
     `members.id === auth.users.id` in this codebase, so
     `lift_records.user_id` doubles as `bookings.member_id` for registered
     athletes.
- Whiteboard lift entries now include `age: null` so the sort has a defined
  value.
- Passes `fetchedAges` as the 5th arg to `rankLiftResults`.

Cost: +1 query (weekly_sessions) on single-session days, +2 queries
(weekly_sessions + bookings) on multi-session days. Both are indexed and
scoped by IDs.

---

## Design decisions

1. **Mirror S300 exactly.** Same tiebreaker order, same age-sourcing path,
   same shared-rank algorithm. No reason to diverge between section-result
   and lift-record leaderboards.
2. **LeaderboardEntry carries age + sessionTime.** For the section path
   these fields live on the raw result; for the lift path we also need to
   carry them through merged whiteboard entries. Putting them on
   `LeaderboardEntry` kept the sort logic uniform across both groups.
3. **Whiteboard athletes → `age: null`.** Consistent with "missing DOB ranks
   below any known age." Whiteboard entries have no DB row to look up DOB
   from.
4. **`lift_records.user_id` as `bookings.member_id`.** Confirmed by the
   existing section-path wiring + S297 incident note — the
   auth.users.id / members.id / booking.member_id chain is unified.
5. **`rankBenchmarkResults` deferred.** Same follow-up pattern S300 took.
   Flagged in `Next Immediate Steps` #5.

---

## Files

- `utils/leaderboard-utils.ts` — `LeaderboardEntry` interface,
  `RawLiftResult` interface, `rankLiftResults` function
- `components/athlete/LeaderboardView.tsx` — lift branch (select, ages,
  session_time annotation, whiteboard mapping)

---

## Follow-ups

- Live-test on the same Mon WOD "Front Squat 5RM" view. Expected: all 80 kg
  entries share rank 2, Chris at top of that group (oldest with DOB set).
- Consider extending the same chain to `rankBenchmarkResults` for parity
  across all three leaderboard functions.
- S300 section-path tiebreakers still awaiting their own live test.
