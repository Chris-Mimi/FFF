# Session 300 — Leaderboard Tiebreakers + Shared Ranks

**Date:** 2026-04-22
**Model:** Opus 4.7
**Persona:** Athlete
**Status:** Code shipped + migration applied; awaiting live test

---

## Origin

Chris asked: "What is the sort criteria for scores/lifts which are exactly the
same? 7 athletes lifted 80kg for 5x Front Squats over 4 workouts Mon/Tues —
how are they sorted?"

Diagnosis: tied athletes got **distinct sequential ranks** (1, 2, 3, …) and the
tied group's internal order was **whatever PostgreSQL returned** (the Supabase
query had no `.order()`, so it fell back to physical row order ≈ insertion
order). No deliberate tiebreaker existed.

Chris wanted:

1. Tied athletes share the same rank number.
2. Within a tied group: age DESC (older higher).
3. Then date ASC (earlier date higher).
4. Then class time ASC (17:15 before 18:30).
5. DOB exposure: integer age only, never raw date.

---

## What shipped

### Migration — DOB → age at the RPC boundary

**File:** [database/20260422_add_age_to_get_member_names.sql](database/20260422_add_age_to_get_member_names.sql)

Extended `get_member_names` to return integer `age` derived from
`date_of_birth`:

```sql
CASE
  WHEN m.date_of_birth IS NULL THEN NULL
  ELSE DATE_PART('year', AGE(m.date_of_birth))::INT
END AS age
```

- Raw DOB never leaves the DB — the RPC is `SECURITY DEFINER`, so athletes
  querying it only see the computed age, nothing else.
- Return type changed (added column) → required `DROP FUNCTION IF EXISTS` before
  `CREATE`. First dashboard attempt failed with `42P13: cannot change return
  type of existing function` until the DROP was added.
- Applied via dashboard SQL Editor, not CLI.

### `rankSectionResults` — two-phase sort + shared ranks

**File:** [utils/leaderboard-utils.ts](utils/leaderboard-utils.ts)

Split the sort into two conceptual phases:

**Phase 1 — `comparePrimary` (defines who is tied):**

1. DNF ranks last.
2. Aggregate scaling score ASC (Rx=0, Sc1=1, …, missing=4; sum of 3 levels).
3. Track ASC (1 < 2 < 3 < null).
4. Primary metric via `compareByScoringType` (e.g. weight DESC for lifts).

Two entries are "tied for the same rank" iff `comparePrimary` returns 0.

**Phase 2 — display-order tiebreakers (within a tied group):**

5. Age DESC — `memberAges[user_id]`, missing DOB → `-Infinity` (ranks
   below any known age).
6. `workout_date` ASC.
7. `session_time` ASC (parsed to minutes; missing → `Infinity`).

**Shared-rank assignment:**

```ts
const ranks: number[] = [];
for (let i = 0; i < sorted.length; i++) {
  if (i > 0 && comparePrimary(sorted[i - 1], sorted[i]) === 0) {
    ranks.push(ranks[i - 1]);          // inherit previous rank
  } else {
    ranks.push(i + 1);                 // new rank at array index
  }
}
```

Standard competition ranking: 1, 1, 1, 4, 5, … (not dense 1, 1, 1, 2, 3).

### `LeaderboardView` — wiring age + session time

**File:** [components/athlete/LeaderboardView.tsx](components/athlete/LeaderboardView.tsx)

- `fetchMemberNames` now returns `{ names, genders, ages }`.
- WOD section results query added `wod_id` to the select (needed for session
  lookup).
- After filtering, annotates `session_time` per row:
  1. Fetch `weekly_sessions` for all (wod_id, date) pairs in play.
  2. If only one session that day → use its time directly (no bookings query).
  3. If multiple sessions that day (17:15 + 18:30) → fetch `bookings` for those
     sessions × the involved `member_id`s, match each row's member to their
     booked session, use that session's time.
- Passes `fetchedAges` as the new 5th arg to `rankSectionResults`.

Cost: 1 extra query on single-session days, 2 extra queries on multi-session
days. Both are small, indexed, scoped by IDs.

---

## Design decisions

1. **Age exposed, not DOB.** RPC does the `AGE()` computation server-side.
   Client never sees a date. Chris's explicit call on Q1.
2. **Missing DOB = youngest.** Rationale: athletes who've taken the time to
   fill in their profile get the old-guard preference; those who haven't fall
   to the bottom of the tied group. Simplest mental model.
3. **Two-phase sort over a single comparator.** Needed anyway because the
   rank-sharing pass wants a clean "are these tied?" predicate — mashing
   age/date/time into the primary would make `1,1,1,4` impossible since those
   tiebreakers would silently break ties we want to keep tied.
4. **Session-time inferred, not stored.** `wod_section_results` has no
   `session_id` field. Rather than a schema change, resolve via the existing
   `bookings` → `weekly_sessions.time` path. Works because (post-launch) every
   score has a booking backing it. Chris confirmed whiteboard-only athletes
   are phasing out.
5. **Scope: `rankSectionResults` only.** Chris's example was a lift in a WOD,
   which is this code path. `rankBenchmarkResults` + `rankLiftResults` were
   not touched — noted as follow-up if parity is wanted.

---

## Files

- `database/20260422_add_age_to_get_member_names.sql` — new migration
- `utils/leaderboard-utils.ts` — RawSectionResult + rankSectionResults
- `components/athlete/LeaderboardView.tsx` — fetchMemberNames, query, session
  lookup

---

## Follow-ups

- Live-test with a real tie (two athletes, same weight, same Rx, one 17:15 +
  one 18:30, both DOBs filled in).
- Consider extending the same tiebreaker chain to `rankBenchmarkResults` and
  `rankLiftResults` for consistency across all three leaderboard types.
- S299 fixes still awaiting live verification (reps+cals scoring, Records
  lift sort, Intervals mobile layout).
