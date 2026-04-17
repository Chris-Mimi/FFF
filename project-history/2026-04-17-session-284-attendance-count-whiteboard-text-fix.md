# Session 284 — Attendance Count Fix (Whiteboard Text Mentions)

**Date:** 2026-04-17
**Model:** Claude Sonnet 4.6 (start) → Opus 4.7 (mid-session switch by Chris)
**Persona Focus:** Coach / Member Management
**Scope:** Bug fix — RPC + hook changes

---

## Problem

Members page `attendance_count` severely undercounting for pre-launch athletes vs. actual attendance (known by Chris independently):

| Member | Members card | True (Workouts tab search) |
|:---|:---|:---|
| ThomasG | 8 | 22 |
| Steven | 10 | 37 |
| DanielB | 8 | 20 |

Newly-registered athletes (those who registered after pre-launch period but attended during it) all showed badly undercounted attendance.

---

## Root Causes (Two)

### Root Cause #1 — `null` param stripped by Supabase JS client

`useMemberData.ts` and `useCoachData.ts` passed `p_days_back: null` to `get_all_members_attendance` RPC when the "all time" timeframe was selected. The Supabase JS client was dropping the null key from the POST body, so the RPC fell back to its `DEFAULT 30` → every "All" query was silently a 30-day query.

**Fix:** pass `36500` (100 years) instead of `null`. PostgreSQL sees an explicit value; the existing `p_days_back IS NULL OR ws.date >= CURRENT_DATE - (p_days_back || ' days')::INTERVAL` logic handles both NULL and large numbers correctly, but `36500` avoids the JS client gotcha entirely.

### Root Cause #2 — Whiteboard text mentions invisible to RPC

Pre-launch attendance is recorded by coaches typing member names as free text in the **Whiteboard Intro** section content (`wods.sections[].content`). For members who:
- Have **no** booking in `bookings` (never used the app's booking system — all attendance was pre-launch), AND
- Have **no** structured `wod_section_results` row (only the coach's whiteboard text, no structured score entry)

…the session was completely invisible to the RPC. The RPC only counted (1) bookings and (2) `wod_section_results` with `member_id` set.

Example — ThomasG diagnostic:
- 0 confirmed bookings
- 16 `wod_section_results` rows across 8 distinct sessions (all linked)
- 0 unlinked `wod_section_results` rows matching `whiteboard_name = 'ThomasG'`
- **22 sessions** where "ThomasG" appears as text in `wods.sections[].content` (Whiteboard Intro)

So 14 of his 22 attended sessions existed only as free text — no structured row at all.

---

## Fix

### SQL — `database/update-attendance-functions-include-whiteboard-text.sql` (new migration, applied)

Added a **third UNION source** to both attendance RPCs (`get_all_members_attendance` and `get_members_last_attendance`):

```sql
-- 3. Whiteboard Intro section text mentions the member's whiteboard_name
SELECT m.id AS member_id, ws.id AS session_id
FROM members m
JOIN wods w ON w.sections::text ~* ('\y' || m.whiteboard_name || '\y')
JOIN weekly_sessions ws ON ws.workout_id = w.id
WHERE m.id = ANY(p_member_ids)
  AND m.whiteboard_name IS NOT NULL
  AND m.whiteboard_name <> ''
  AND ws.date <= CURRENT_DATE
  AND (p_days_back IS NULL OR ws.date >= CURRENT_DATE - (p_days_back || ' days')::INTERVAL)
```

- Uses POSIX word boundaries (`\y`) to avoid false positives (e.g., "Paul" matching "Paula").
- Case-insensitive via `~*`.
- Only searches when `members.whiteboard_name` is non-null/non-empty.
- Serializes `wods.sections` JSONB → text for regex search. Acceptable perf trade-off given pre-launch data volume; revisit if wods table grows large.

### Code — `hooks/coach/useMemberData.ts` + `hooks/coach/useCoachData.ts`

- Replaced `daysParam = timeframe === 'all' ? null : timeframe` with `… ? 36500 : timeframe` in both `fetchAtRiskCount` and `fetchMembersWithAttendance`.
- Replaced the manual published-bookings count in `useCoachData.ts::fetchMembers` (lines 414–436) with a call to `get_all_members_attendance` (with `p_days_back: 36500`) so the Workouts-tab sidebar member counts use the same source as the Members page. Previously it counted only confirmed bookings on published sessions (excluding scores, excluding unpublished sessions).

---

## Verification

After SQL applied + hook changes deployed:
- ThomasG: 8 → 22 ✅
- DanielB: 8 → 20 ✅
- Other newly-registered athletes: correct ✅
- Steven: 10 → **39** ❌ (Workouts-tab search shows 37 — +2 discrepancy, flagged for next session)

---

## Carryover — Steven Off by +2

Members page shows 39, Workouts-tab text search returns 37. Hypotheses to test next session:

1. **Regex false positive** — `\ySteven\y` matches text outside the Whiteboard Intro section (Chris confirmed names only appear in Whiteboard Intro, so this shouldn't happen — but the regex scans the whole sections JSONB text).
2. **Workouts-tab 500-row limit** — `useCoachData.ts:245` limits query to 500 rows; if there are >500 published sessions total, some could be silently cut.
3. **Whiteboard_name substring collision** — "Steven" is a short name; maybe appearing in coach_notes or embedded in another field.

Query to debug next session:
```sql
SELECT ws.date, w.workout_name, w.sections::text
FROM weekly_sessions ws
JOIN wods w ON w.id = ws.workout_id
WHERE w.sections::text ~* '\ySteven\y'
ORDER BY ws.date DESC;
```

Compare result count + dates against what Chris sees when searching "Steven" in the Workouts tab.

---

## Files Changed

- `database/update-attendance-functions-include-whiteboard-text.sql` — new migration (applied in Supabase)
- `hooks/coach/useMemberData.ts` — `null` → `36500` in 2 spots
- `hooks/coach/useCoachData.ts` — replaced manual booking count with RPC call, `null` → `36500`
- `memory-bank/memory-bank-activeContext.md` — version 151.0, Session 284 added, Session 279 pruned
- `project-history/2026-04-17-session-284-attendance-count-whiteboard-text-fix.md` — this file

---

## Key Learnings

1. **Supabase JS strips null params** — when an RPC has a `DEFAULT`, passing explicit `null` from the JS client may get dropped, silently activating the default. Workaround: pass a sentinel value (e.g., `36500` for "all time" days).
2. **Two parallel attendance records exist in this app**: structured (`wod_section_results`) and free text (Whiteboard Intro content). Any cross-cutting query that needs "did X attend Y" must account for both.
3. **Trust Chris's stated facts** — "ThomasG attended 22 sessions" is a ground truth, not an estimate. When the database says 8, the database is incomplete, not Chris wrong.
