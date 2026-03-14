# Coach Score Entry — Implementation Plan

**Created:** 2026-03-14
**Estimated Sessions:** 3-4

---

## Problem

Beta testers say they don't have time to input scores. Coach already spends
5 minutes writing scores on the physical whiteboard. Redirect that effort to a
digital version that auto-populates each athlete's app data.

## Solution Overview

1. **Coach Score Entry page** — Grid view per session. Athletes as rows, scoring
   fields as columns. Coach selects which sections to score.
2. **Bulk save** — All scores written to `wod_section_results` in one operation.
   Leaderboard, progress charts, and records work automatically.
3. **Score Query** — Simple popup in athlete app to dispute a score (text
   message sent as notification to coach).

## Key Design Decisions

| Decision | Choice | Reason |
|:---------|:-------|:-------|
| Entry timing | Post-session (after everyone finishes) | Coach confirmed |
| Leaderboard display | Existing athlete app leaderboard | No new page needed; coach laptop → HDMI to TV |
| Score editability | Coach entries are final | Eliminates user error; query button for disputes |
| Who appears | All confirmed bookings for the session | Matches physical whiteboard |
| Non-app members | Scores saved via `member_id`; visible only after sign-up | Incentivises sign-up: "your scores are already tracked" |
| Section selection | Coach picks which sections to score | Usually WOD/Strength, not Warm-up |
| Athlete self-entry | Still available for home/travel/open gym workouts | App remains versatile |

## Architecture

### Data Flow

```
Coach selects session
  → Fetch WOD (sections + scoring_fields)
  → Fetch bookings (confirmed members)
  → Fetch existing wod_section_results (pre-fill if any)
  → Coach enters scores in grid
  → Bulk save → wod_section_results (upsert per athlete+section)
  → Athletes see scores in app immediately
  → Leaderboard auto-updates (existing logic)
```

### Member → User ID Mapping

- `bookings` use `member_id` (from `members` table)
- `wod_section_results` currently uses `user_id` (from `auth.users`)
- **New:** Add `member_id` column to `wod_section_results` (nullable)
- Coach score entry saves with `member_id` always + `user_id` when available
- When member signs up later, backfill `user_id` via email match
- Athlete app queries by `user_id` — scores only visible once they have an account
- All scores are persisted regardless of account status (no data lost)

### Key Files to Reuse

| What | File |
|:-----|:-----|
| Scoring inputs | `components/athlete/logbook/ScoringFieldInputs.tsx` |
| Save logic + validation | `utils/logbook/savingLogic.ts` |
| Leaderboard sorting | `utils/leaderboard-utils.ts` |
| Booking fetch | `hooks/coach/useSessionDetails.ts` |
| Coach auth | `lib/auth-api.ts` (`requireCoach`) |
| Coach-on-behalf pattern | `app/api/achievements/award/route.ts` |
| Notifications | `lib/notifications.ts` |

---

## Session 203 — Core Score Entry Page

### 203a: API Route + Hook

**New files:**
- `app/api/score-entry/save/route.ts` — Bulk save endpoint
- `app/api/score-entry/[sessionId]/route.ts` — GET session data for scoring
- `hooks/coach/useScoreEntry.ts` — State management hook

**API: GET /api/score-entry/[sessionId]**
Returns:
```json
{
  "session": { "id", "date", "time", "workout_id" },
  "wod": { "id", "sections": [...], "workout_name" },
  "athletes": [
    { "memberId", "userId" (or null), "name" }
  ],
  "existingResults": [
    { "memberId", "sectionId", "time_result", "reps_result", ... }
  ]
}
```

Logic:
1. `requireCoach` auth check
2. Fetch session from `weekly_sessions`
3. Fetch WOD via `session.workout_id`
4. Fetch confirmed bookings with member names
5. Map `members.email → auth.users.id` for user_id lookup (where accounts exist)
6. Fetch existing `wod_section_results` for this WOD (by member_id or user_id)
7. Return combined payload

**API: POST /api/score-entry/save**
Body:
```json
{
  "wodId": "uuid",
  "workoutDate": "2026-03-14",
  "scores": [
    {
      "memberId": "uuid",
      "sectionId": "section-id",
      "scaling_level": "Rx",
      "time_result": "4:23",
      "reps_result": null,
      "weight_result": null,
      ...
    }
  ]
}
```

Logic:
1. `requireCoach` auth check
2. Validate all scores (same ranges as `savingLogic.ts`)
3. Look up `user_id` for each `member_id` (via email match) — null if no account
4. Upsert each score to `wod_section_results` with `member_id` + `user_id` (if available)
5. Return success + count

### 203b: Score Entry UI

**New files:**
- `app/coach/score-entry/[sessionId]/page.tsx` — Main page
- `components/coach/score-entry/ScoreEntryGrid.tsx` — Grid component
- `components/coach/score-entry/AthleteScoreRow.tsx` — Per-athlete row

**Page layout:**
```
┌─────────────────────────────────────────────────┐
│ ← Back    Score Entry    [Session: Fri 14 Mar]  │
│                          [10:00 - WOD Name]     │
├─────────────────────────────────────────────────┤
│ Section: [WOD ▼]  (dropdown of scorable sections)│
├─────────────────────────────────────────────────┤
│ Athlete      │ Scaling │ Time  │ Reps │ Weight  │
│──────────────┼─────────┼───────┼──────┼─────────│
│ Max Musterman│ [Rx ▼]  │ [4:23]│      │         │
│ Anna Schmidt │ [Sc1 ▼] │ [5:01]│      │         │
│ Tom Weber    │ [Rx ▼]  │ [3:58]│      │         │
│ Lisa Braun   │ [Rx ▼]  │ [4:45]│      │         │
├─────────────────────────────────────────────────┤
│              [Save All Scores]                   │
│              [Next Section →]                    │
└─────────────────────────────────────────────────┘
```

**UI details:**
- Section dropdown shows only sections WITH scoring_fields enabled
- Columns shown depend on scoring_fields of selected section
- Reuse `ScoringFieldInputs` per row (compact variant) OR build inline inputs
- All members shown equally — scores saved for everyone via `member_id`
- Pre-filled if existing results found
- "Next Section" button switches to next scorable section
- Tab key moves between input fields for fast entry

### 203c: Navigation

**Access point:** Button on session card in Coach Calendar view
- Add "Enter Scores" button/icon to session cards (next to existing Edit/Delete)
- Only visible for sessions with a linked WOD that has scorable sections
- Links to `/coach/score-entry/[sessionId]`

---

## Session 204 — Polish + Score Query

### 204a: Score Query System (Athlete Side)

**New files:**
- `components/athlete/ScoreQueryButton.tsx` — Button in athlete logbook
- `app/api/score-query/route.ts` — POST endpoint

**Athlete UI:**
- Small "Report Issue" or "Query Score" button in the logbook section
  (not per-score, one button per workout)
- Opens simple modal/popup:
  ```
  ┌────────────────────────────┐
  │ Query Score                │
  │                            │
  │ Which score is incorrect?  │
  │ ┌────────────────────────┐ │
  │ │ Free text input...     │ │
  │ │                        │ │
  │ └────────────────────────┘ │
  │                            │
  │    [Cancel]  [Send Query]  │
  └────────────────────────────┘
  ```
- On submit: sends push notification to coach with athlete name + message
- Toast: "Query sent to coach"

**API: POST /api/score-query**
Body: `{ wodId, message }`
- `requireAuth` (athlete)
- Look up athlete name from members table
- Send push notification to coach: "Score query from [Name]: [message]"
- Optional: store in a `score_queries` table for history (or skip if edge case)

### 204b: Notification on Score Entry

- After bulk save, send push notification to each athlete whose score was saved:
  "Your coach recorded your score for [workout name]"
- Uses existing notification pattern (fire-and-forget)
- New preference key: `score_recorded` (default true)
- Batch: one notification per athlete, not per section

### 204c: Polish & Edge Cases

- Handle sessions with no WOD linked (show message: "No workout assigned")
- Handle sessions with no bookings (show message: "No athletes booked")
- Handle duplicate saves (upsert = safe, just overwrites)
- Mobile-responsive grid (stack columns on narrow screens)
- Loading states + error handling
- Coach can re-visit and edit previously entered scores

---

## Session 205 (Optional) — Enhancements

### 205a: Quick Entry Mode
- Keyboard-optimized: Tab between fields, Enter to save row
- Auto-advance to next athlete after entering last field

### 205b: Batch Section Entry
- Enter scores for multiple sections at once (tabs along top)
- Save all sections in single operation

### 205c: PR Detection
- After bulk save, check if any score is a PR (lift record or benchmark)
- Show coach a summary: "2 new PRs detected"
- Fire PR notifications to those athletes

---

## Migration Required

### Session 203: Add member_id column
```sql
-- Add member_id to wod_section_results for coach score entry
ALTER TABLE wod_section_results
ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES members(id) ON DELETE SET NULL;

-- Index for lookups by member_id
CREATE INDEX IF NOT EXISTS idx_wod_section_results_member_id
ON wod_section_results(member_id);

-- Make user_id nullable (coach may enter scores for non-app members)
ALTER TABLE wod_section_results
ALTER COLUMN user_id DROP NOT NULL;

-- Ensure at least one of user_id or member_id is present
ALTER TABLE wod_section_results
ADD CONSTRAINT chk_user_or_member
CHECK (user_id IS NOT NULL OR member_id IS NOT NULL);
```
Coach writes using service role key (bypasses RLS).

**Backfill:** When a member creates an account, a one-time query updates
`user_id` on existing `wod_section_results` rows matching by `member_id`.

### Session 204: Score Query (if storing history)
```sql
CREATE TABLE IF NOT EXISTS score_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wod_id UUID NOT NULL REFERENCES wods(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, resolved
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE score_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes can create their own queries"
  ON score_queries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Athletes can view their own queries"
  ON score_queries FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON score_queries FOR ALL TO service_role
  USING (true);
```

### Session 204: Notification Preference
```sql
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS score_recorded BOOLEAN NOT NULL DEFAULT true;
```

---

## Risk Assessment

| Risk | Mitigation |
|:-----|:-----------|
| member_id ↔ user_id mismatch | Lookup via email; save with member_id always, user_id when available |
| Overwriting athlete self-entered scores | Upsert is last-write-wins; coach entry is authoritative |
| Large sessions (20+ athletes) | Grid is just rows; no performance concern |
| Multiple sections per workout | One section at a time with "Next Section" navigation |
| Non-app members | Scores saved via member_id; backfilled with user_id on sign-up |

---

## Files Created/Modified Summary

### New Files (estimated)
| File | Purpose |
|:-----|:--------|
| `app/api/score-entry/[sessionId]/route.ts` | GET session data |
| `app/api/score-entry/save/route.ts` | POST bulk save |
| `app/api/score-query/route.ts` | POST score dispute |
| `app/coach/score-entry/[sessionId]/page.tsx` | Score entry page |
| `components/coach/score-entry/ScoreEntryGrid.tsx` | Grid component |
| `components/coach/score-entry/AthleteScoreRow.tsx` | Per-athlete row |
| `hooks/coach/useScoreEntry.ts` | State + data hook |
| `components/athlete/ScoreQueryButton.tsx` | Query button + modal |
| `database/20260314_score_queries.sql` | Query table migration |

### Modified Files (estimated)
| File | Change |
|:-----|:-------|
| Coach calendar/session card | Add "Enter Scores" button |
| `lib/notifications.ts` | Add `notifyScoreRecorded()` |
| `components/athlete/logbook/*` | Add query button |
| `hooks/usePushNotifications.ts` | Add `score_recorded` preference |
