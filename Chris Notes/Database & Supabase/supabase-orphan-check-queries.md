# Data Integrity & Orphan / Duplicate Diagnostics

**Created:** 2026-02-16 (after the Session 126-127 stray-records incident). **Purpose:** find orphan / stray / duplicate records across all tables in the Supabase SQL Editor.

**How to use this file:**
1. Run the **Master Query** below for a one-row health summary. This is the only thing you run for a routine check.
2. If a column comes back nonzero, jump to the matching **drill-down query** further down to see the actual offending rows.

> **How to read the result:** most columns should be **0** — a nonzero value means investigate (see "Hard errors"). But three columns are **informational** and can be nonzero in normal operation — don't panic over them (see "Expected-nonzero").

---

## Master Query (run this first)

```sql
SELECT
  (SELECT COUNT(*) FROM wod_section_results r LEFT JOIN weekly_sessions ws ON ws.workout_id = r.wod_id WHERE ws.id IS NULL) AS stray_section_results,
  (SELECT COUNT(*) FROM wod_section_results r
     JOIN weekly_sessions ws ON ws.workout_id = r.wod_id
     LEFT JOIN bookings b ON b.session_id = ws.id
       AND (
         b.member_id = r.member_id
         OR b.member_id = r.user_id
         OR b.member_id IN (
           SELECT m.id FROM members m
           WHERE m.email = (SELECT email FROM auth.users WHERE id = r.user_id)
              OR m.primary_member_id IN (SELECT m2.id FROM members m2 WHERE m2.email = (SELECT email FROM auth.users WHERE id = r.user_id))
         )
       )
     WHERE b.id IS NULL
       AND r.whiteboard_name IS NULL) AS unbooked_section_results,
  (SELECT COUNT(*) FROM workout_logs wl LEFT JOIN wods w ON w.id = wl.wod_id WHERE w.id IS NULL) AS orphan_workout_logs,
  (SELECT COUNT(*) FROM bookings b LEFT JOIN weekly_sessions ws ON ws.id = b.session_id WHERE ws.id IS NULL) AS orphan_bookings,
  (SELECT COUNT(*) FROM reactions r LEFT JOIN wod_section_results wsr ON wsr.id = r.target_id WHERE r.target_type = 'wod_section_result' AND wsr.id IS NULL) AS orphan_reactions_section,
  (SELECT COUNT(*) FROM reactions r LEFT JOIN benchmark_results br ON br.id = r.target_id WHERE r.target_type = 'benchmark_result' AND br.id IS NULL) AS orphan_reactions_benchmark,
  (SELECT COUNT(*) FROM reactions r LEFT JOIN lift_records lr ON lr.id = r.target_id WHERE r.target_type = 'lift_record' AND lr.id IS NULL) AS orphan_reactions_lift,
  (SELECT COUNT(*) FROM wods w LEFT JOIN weekly_sessions ws ON ws.workout_id = w.id WHERE ws.id IS NULL AND w.google_event_id IS NOT NULL) AS gcal_orphan_wods,
  (SELECT COUNT(*) FROM wod_section_results r LEFT JOIN wods w ON w.id = r.wod_id WHERE w.id IS NULL) AS results_deleted_wods,
  (SELECT COUNT(*) FROM bookings b LEFT JOIN members m ON m.id = b.member_id WHERE m.id IS NULL) AS orphan_bookings_no_member,
  (SELECT COUNT(*) FROM (SELECT COALESCE(user_id::text, 'wb:' || whiteboard_name, 'mb:' || member_id::text), wod_id, section_id FROM wod_section_results GROUP BY COALESCE(user_id::text, 'wb:' || whiteboard_name, 'mb:' || member_id::text), wod_id, section_id HAVING COUNT(*) > 1) d) AS duplicate_section_results,
  (SELECT COUNT(*) FROM (SELECT user_id, benchmark_name, result_date FROM benchmark_results GROUP BY user_id, benchmark_name, result_date HAVING COUNT(*) > 1) d) AS duplicate_benchmarks,
  (SELECT COUNT(*) FROM (SELECT user_id, lift_name, lift_date, rep_max_type, rep_scheme FROM lift_records GROUP BY user_id, lift_name, lift_date, rep_max_type, rep_scheme HAVING COUNT(*) > 1) d) AS duplicate_lifts,
  (SELECT COUNT(*) FROM wods WHERE workout_publish_status = 'published' AND (workout_name IS NULL OR workout_name = '')) AS published_wods_no_name,
  (SELECT COUNT(*) FROM athlete_achievements aa LEFT JOIN achievement_definitions ad ON ad.id = aa.achievement_id LEFT JOIN auth.users u ON u.id = aa.user_id WHERE ad.id IS NULL OR u.id IS NULL) AS orphan_athlete_achievements,
  (SELECT COUNT(*) FROM benchmark_results br LEFT JOIN benchmark_workouts bw ON bw.id = br.benchmark_id LEFT JOIN forge_benchmarks fb ON fb.id = br.forge_benchmark_id WHERE (br.benchmark_id IS NOT NULL AND bw.id IS NULL) OR (br.forge_benchmark_id IS NOT NULL AND fb.id IS NULL)) AS orphan_benchmark_results,
  (SELECT COUNT(*) FROM members m WHERE m.account_type = 'family_member' AND m.primary_member_id IS NOT NULL AND m.primary_member_id NOT IN (SELECT id FROM members)) AS orphan_family_members,
  (SELECT COUNT(*) FROM wod_section_results r LEFT JOIN members m ON m.id = r.member_id WHERE r.member_id IS NOT NULL AND m.id IS NULL) AS orphan_section_results_member_id,
  (SELECT COUNT(*) FROM programming_plan_items ppi LEFT JOIN movement_patterns mp ON mp.id = ppi.pattern_id WHERE mp.id IS NULL) AS orphan_programming_plan_items,
  (SELECT COUNT(*) FROM movement_pattern_exercises mpe LEFT JOIN movement_patterns mp ON mp.id = mpe.pattern_id LEFT JOIN exercises e ON e.id = mpe.exercise_id WHERE mp.id IS NULL OR e.id IS NULL) AS orphan_pattern_exercises,
  (SELECT COUNT(*) FROM user_exercise_favorites uef LEFT JOIN exercises e ON e.id = uef.exercise_id LEFT JOIN auth.users u ON u.id = uef.user_id WHERE e.id IS NULL OR u.id IS NULL) AS orphan_favorites,
  (SELECT COUNT(*) FROM coach_tracked_exercises cte LEFT JOIN exercises e ON e.id = cte.exercise_id LEFT JOIN auth.users u ON u.id = cte.user_id WHERE e.id IS NULL OR u.id IS NULL) AS orphan_coach_tracked,
  (SELECT COUNT(*) FROM athlete_profiles ap LEFT JOIN auth.users u ON u.id = ap.user_id WHERE u.id IS NULL AND ap.user_id NOT IN (SELECT id FROM members)) AS orphan_athlete_profiles,
  (SELECT COUNT(*) FROM wellpass_identity_members wim LEFT JOIN members m ON m.id = wim.member_id LEFT JOIN wellpass_identities wi ON wi.id = wim.wellpass_identity_id WHERE m.id IS NULL OR wi.id IS NULL) AS orphan_wellpass_identity_members,
  (SELECT COUNT(*) FROM subscriptions s LEFT JOIN members m ON m.id = s.member_id WHERE m.id IS NULL) AS orphan_subscriptions,
  (SELECT COUNT(*) FROM push_subscriptions ps LEFT JOIN auth.users u ON u.id = ps.user_id WHERE u.id IS NULL) AS orphan_push_subscriptions,
  (SELECT COUNT(*) FROM weekly_sessions ws LEFT JOIN bookings b ON b.session_id = ws.id WHERE ws.workout_id IS NULL AND b.id IS NULL) AS empty_sessions_no_bookings,
  (SELECT COUNT(*) FROM wods w LEFT JOIN weekly_sessions ws ON ws.workout_id = w.id WHERE ws.id IS NULL) AS orphan_wods;
```

---

## How to read the results

### Hard errors — should be 0; investigate any nonzero

| Column | What a nonzero means | Drill-down |
|:---|:---|:---|
| `stray_section_results` | Scores under a WOD with no scheduled session (the S125-127 leaderboard bug). | §1a |
| `orphan_workout_logs` | Workout logs pointing to a deleted WOD. | §4a |
| `orphan_bookings` | Bookings for a deleted session. | §3a |
| `orphan_reactions_section/_benchmark/_lift` | Fist-bumps pointing to a deleted score/benchmark/lift. Safe to delete. | §7 |
| `gcal_orphan_wods` | WOD published to Google Calendar but its session is gone. | §2a (filter `google_event_id`) |
| `results_deleted_wods` | Scores whose WOD row was deleted. | §1c |
| `orphan_bookings_no_member` | Bookings for a deleted member. | §3b |
| `duplicate_section_results` | Same person + WOD + section scored twice (keyed by user_id / whiteboard name / member_id). | §1d |
| `duplicate_benchmarks` | Same user + benchmark + date logged twice. | §11c |
| `duplicate_lifts` | Same user + lift + date + rep-max-type + scheme twice (usually a double-tap save). | §11a / §11b |
| `published_wods_no_name` | A published WOD with no `workout_name` — breaks leaderboard grouping (S380). | — |
| `orphan_athlete_achievements` | Achievement row for a deleted definition or deleted user. | — |
| `orphan_benchmark_results` | Benchmark result pointing to a deleted benchmark/forge-benchmark. | §5a |
| `orphan_family_members` | Family member pointing to a deleted primary member. | §8a |
| `orphan_section_results_member_id` | Score whose `member_id` points to a deleted member. | — |
| `orphan_programming_plan_items` | Planner item pointing to a deleted movement pattern. | — |
| `orphan_pattern_exercises` | Pattern↔exercise link pointing to a deleted pattern or exercise. | — |
| `orphan_favorites` | Exercise favorite pointing to a deleted exercise or user. | §9a |
| `orphan_coach_tracked` | Coach-tracked exercise pointing to a deleted exercise or user. | — |
| `orphan_athlete_profiles` | Profile with no `auth.users` row **and** no `members` row — a true ghost (S375/S376). Family-member children (member row, no auth login) are correctly excluded. | §12a |
| `orphan_wellpass_identity_members` | Wellpass household link pointing to a deleted member or identity — corrupts household counts. | §12b |
| `orphan_subscriptions` | Stripe subscription row pointing to a deleted member. | §12c |
| `orphan_push_subscriptions` | Push subscription for a deleted user. | §12c |

### Expected-nonzero — informational, not errors

| Column | Why it can be nonzero in normal operation |
|:---|:---|
| `unbooked_section_results` | A **registered** athlete has a score but no booking — a walk-in, or a coach-entered score for someone who didn't book (coach-scores-primary). Whiteboard-name scores are excluded and bookings under `member_id` are matched, so this only flags genuine "scored-without-booking" cases. Usually benign; glance if it spikes. (§1b) |
| `orphan_wods` | WODs with no session are **drafts / templates** — normal. `gcal_orphan_wods` is the real-error version. (§2a) |
| `empty_sessions_no_bookings` | A session with no workout assigned and no bookings — usually a future "Generate Weekly Sessions" slot not yet programmed. Normal unless it persists on past dates. |

---

# Drill-down queries

## 1. WOD Section Results

### 1a. Results under WODs with no session scheduled (the S125-127 bug)

```sql
SELECT r.id, r.wod_id, r.section_id, r.workout_date, r.user_id,
       r.scaling_level, r.time_result, r.reps_result, r.weight_result,
       r.rounds_result, r.calories_result, r.metres_result
FROM wod_section_results r
LEFT JOIN weekly_sessions ws ON ws.workout_id = r.wod_id
WHERE ws.id IS NULL
ORDER BY r.workout_date;
```

### 1b. Results where a REGISTERED athlete has no booking for that session

> **Informational, not an error.** A nonzero count is usually a walk-in or a coach-entered score for someone who didn't book (coach-scores-primary). Whiteboard-name scores are excluded, and bookings made under `member_id` (not just `user_id`) are matched — without those two fixes this query cried wolf on ~90 rows that were all benign.

```sql
SELECT r.id, r.wod_id, r.section_id, r.workout_date, r.user_id, r.member_id,
       r.whiteboard_name, r.scaling_level, ws.date AS session_date, ws.time AS session_time
FROM wod_section_results r
JOIN weekly_sessions ws ON ws.workout_id = r.wod_id
LEFT JOIN bookings b ON b.session_id = ws.id
  AND (
    b.member_id = r.member_id  -- score keyed by member_id (coach entry / family member)
    OR b.member_id = r.user_id  -- score keyed by user_id
    OR b.member_id IN (
      SELECT m.id FROM members m
      WHERE m.email = (SELECT email FROM auth.users WHERE id = r.user_id)
         OR m.primary_member_id IN (
           SELECT m2.id FROM members m2
           WHERE m2.email = (SELECT email FROM auth.users WHERE id = r.user_id)
         )
    )
  )
WHERE b.id IS NULL
  AND r.whiteboard_name IS NULL  -- exclude non-registered whiteboard names (by design have no booking)
ORDER BY r.workout_date;
```

### 1c. Results pointing to non-existent WODs

```sql
SELECT r.id, r.wod_id, r.section_id, r.workout_date
FROM wod_section_results r
LEFT JOIN wods w ON w.id = r.wod_id
WHERE w.id IS NULL;
```

### 1d. Duplicate results (same person, same section, same WOD)

```sql
SELECT COALESCE(user_id::text, 'wb:' || whiteboard_name, 'mb:' || member_id::text) AS who,
       wod_id, section_id, COUNT(*) AS dupes
FROM wod_section_results
GROUP BY COALESCE(user_id::text, 'wb:' || whiteboard_name, 'mb:' || member_id::text), wod_id, section_id
HAVING COUNT(*) > 1;
```

---

## 2. WODs

### 2a. WODs with no session (drafts are normal; filter `google_event_id` for real orphans)

```sql
SELECT w.id, w.date, w.session_type, w.workout_name, w.workout_publish_status, w.google_event_id
FROM wods w
LEFT JOIN weekly_sessions ws ON ws.workout_id = w.id
WHERE ws.id IS NULL
ORDER BY w.date;
```

### 2b. Sessions referencing a WOD that doesn't exist

```sql
SELECT ws.id, ws.date, ws.time, ws.workout_id
FROM weekly_sessions ws
LEFT JOIN wods w ON w.id = ws.workout_id
WHERE ws.workout_id IS NOT NULL AND w.id IS NULL;
```

---

## 3. Bookings

### 3a. Bookings for non-existent sessions

```sql
SELECT b.id, b.session_id, b.member_id, b.status
FROM bookings b
LEFT JOIN weekly_sessions ws ON ws.id = b.session_id
WHERE ws.id IS NULL;
```

### 3b. Bookings for non-existent members

```sql
SELECT b.id, b.session_id, b.member_id, b.status
FROM bookings b
LEFT JOIN members m ON m.id = b.member_id
WHERE m.id IS NULL;
```

---

## 4. Workout Logs

### 4a. Logs pointing to non-existent WODs

```sql
SELECT wl.id, wl.wod_id, wl.user_id, wl.result
FROM workout_logs wl
LEFT JOIN wods w ON w.id = wl.wod_id
WHERE w.id IS NULL;
```

### 4b. Logs by non-existent users

```sql
SELECT wl.id, wl.wod_id, wl.user_id
FROM workout_logs wl
LEFT JOIN auth.users u ON u.id = wl.user_id
WHERE u.id IS NULL;
```

---

## 5. Benchmark Results

### 5a. Results pointing to non-existent benchmarks

```sql
SELECT br.id, br.benchmark_id, br.forge_benchmark_id, br.benchmark_name, br.result_date
FROM benchmark_results br
LEFT JOIN benchmark_workouts bw ON bw.id = br.benchmark_id
LEFT JOIN forge_benchmarks fb ON fb.id = br.forge_benchmark_id
WHERE (br.benchmark_id IS NOT NULL AND bw.id IS NULL)
   OR (br.forge_benchmark_id IS NOT NULL AND fb.id IS NULL);
```

### 5b. Results by non-existent users

```sql
SELECT br.id, br.user_id, br.benchmark_name, br.result_date
FROM benchmark_results br
LEFT JOIN auth.users u ON u.id = br.user_id
WHERE u.id IS NULL;
```

---

## 6. Lift Records

### 6a. Lifts by non-existent users

```sql
SELECT lr.id, lr.user_id, lr.lift_name, lr.lift_date
FROM lift_records lr
LEFT JOIN auth.users u ON u.id = lr.user_id
WHERE u.id IS NULL;
```

---

## 7. Reactions (Fist Bumps)

### 7a. Reactions pointing to deleted targets

```sql
-- Section result reactions
SELECT r.id, r.target_type, r.target_id
FROM reactions r
LEFT JOIN wod_section_results wsr ON wsr.id = r.target_id
WHERE r.target_type = 'wod_section_result' AND wsr.id IS NULL;

-- Benchmark result reactions
SELECT r.id, r.target_type, r.target_id
FROM reactions r
LEFT JOIN benchmark_results br ON br.id = r.target_id
WHERE r.target_type = 'benchmark_result' AND br.id IS NULL;

-- Lift record reactions
SELECT r.id, r.target_type, r.target_id
FROM reactions r
LEFT JOIN lift_records lr ON lr.id = r.target_id
WHERE r.target_type = 'lift_record' AND lr.id IS NULL;
```

---

## 8. Members

### 8a. Family members pointing to a non-existent primary member

```sql
SELECT m.id, m.name, m.email, m.primary_member_id
FROM members m
WHERE m.account_type = 'family_member'
  AND m.primary_member_id IS NOT NULL
  AND m.primary_member_id NOT IN (SELECT id FROM members);
```

---

## 9. User Exercise Favorites

### 9a. Favorites for non-existent exercises

```sql
SELECT uef.id, uef.user_id, uef.exercise_id
FROM user_exercise_favorites uef
LEFT JOIN exercises e ON e.id = uef.exercise_id
WHERE e.id IS NULL;
```

---

## 10. Programming Notes

### 10a. Notes in non-existent folders

```sql
SELECT pn.id, pn.title, pn.folder_id
FROM programming_notes pn
LEFT JOIN note_folders nf ON nf.id = pn.folder_id
WHERE pn.folder_id IS NOT NULL AND nf.id IS NULL;
```

---

## 11. Duplicate Records

### 11a. Duplicate lift records (same user, lift, date, scheme)

```sql
SELECT user_id, lift_name, lift_date, rep_max_type, rep_scheme, COUNT(*) AS dupes
FROM lift_records
GROUP BY user_id, lift_name, lift_date, rep_max_type, rep_scheme
HAVING COUNT(*) > 1;
```

### 11b. Duplicate lift records — full detail (to pick which to delete)

```sql
SELECT lr.*
FROM lift_records lr
JOIN (
  SELECT user_id, lift_name, lift_date, rep_max_type, rep_scheme
  FROM lift_records
  GROUP BY user_id, lift_name, lift_date, rep_max_type, rep_scheme
  HAVING COUNT(*) > 1
) dupes ON lr.user_id = dupes.user_id
  AND lr.lift_name = dupes.lift_name
  AND lr.lift_date = dupes.lift_date
  AND lr.rep_max_type IS NOT DISTINCT FROM dupes.rep_max_type
  AND lr.rep_scheme IS NOT DISTINCT FROM dupes.rep_scheme
ORDER BY lr.lift_name, lr.lift_date, lr.created_at;
```

### 11c. Duplicate benchmark results (same user, benchmark, date)

```sql
SELECT user_id, benchmark_name, result_date, COUNT(*) AS dupes
FROM benchmark_results
GROUP BY user_id, benchmark_name, result_date
HAVING COUNT(*) > 1;
```

### 11d. Auto-delete duplicate lifts (keeps newest, deletes older)

```sql
-- PREVIEW first (shows what would be deleted):
SELECT id, user_id, lift_name, lift_date, rep_max_type, rep_scheme, weight_kg, created_at
FROM lift_records
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, lift_name, lift_date, COALESCE(rep_max_type, ''), COALESCE(rep_scheme, '')) id
  FROM lift_records
  ORDER BY user_id, lift_name, lift_date, COALESCE(rep_max_type, ''), COALESCE(rep_scheme, ''), created_at DESC
)
AND (user_id, lift_name, lift_date, COALESCE(rep_max_type, ''), COALESCE(rep_scheme, '')) IN (
  SELECT user_id, lift_name, lift_date, COALESCE(rep_max_type, ''), COALESCE(rep_scheme, '')
  FROM lift_records
  GROUP BY user_id, lift_name, lift_date, COALESCE(rep_max_type, ''), COALESCE(rep_scheme, '')
  HAVING COUNT(*) > 1
);

-- DELETE (run after verifying preview):
-- DELETE FROM lift_records WHERE id IN (SELECT id FROM above query);
```

---

## 12. Newer orphan checks (added after schema growth)

### 12a. Athlete profiles that are true ghosts (no auth user AND no member — S375/S376)

```sql
SELECT ap.id, ap.user_id, ap.full_name, ap.email, ap.created_at
FROM athlete_profiles ap
LEFT JOIN auth.users u ON u.id = ap.user_id
WHERE u.id IS NULL
  AND ap.user_id NOT IN (SELECT id FROM members)  -- exclude family-member children (member row, no auth login)
ORDER BY ap.created_at;
```
Cleanup helper: `scripts/find-orphan-athlete-profiles.ts`. A profile row is created at signup and is separate from `members`; if the auth user is deleted without removing the profile, it lingers as a ghost on the Athletes page. **Note:** family-member children (e.g. kids booked under a parent) legitimately have a profile + a `members` row but **no `auth.users` login** — the `NOT IN (SELECT id FROM members)` clause keeps them from being flagged.

### 12b. Wellpass household links pointing to a deleted member or identity

```sql
SELECT wim.wellpass_identity_id, wim.member_id
FROM wellpass_identity_members wim
LEFT JOIN members m ON m.id = wim.member_id
LEFT JOIN wellpass_identities wi ON wi.id = wim.wellpass_identity_id
WHERE m.id IS NULL OR wi.id IS NULL;
```
A dangling link silently corrupts household booking/score counts (the household-cap and Wellpass-scoring logic walk these rows).

### 12c. Subscriptions / push subscriptions for a deleted member or user

```sql
-- Stripe subscriptions pointing to a deleted member
SELECT s.id, s.member_id, s.stripe_subscription_id, s.status
FROM subscriptions s
LEFT JOIN members m ON m.id = s.member_id
WHERE m.id IS NULL;

-- Push subscriptions for a deleted user
SELECT ps.id, ps.user_id, ps.endpoint
FROM push_subscriptions ps
LEFT JOIN auth.users u ON u.id = ps.user_id
WHERE u.id IS NULL;
```

---

## How to delete orphans

**Always `npm run backup` from terminal first.** Then use a drill-down query above to confirm the exact rows and delete by `id`. Example (stray section results):

```sql
DELETE FROM wod_section_results
WHERE id IN (
  SELECT r.id FROM wod_section_results r
  LEFT JOIN weekly_sessions ws ON ws.workout_id = r.wod_id
  WHERE ws.id IS NULL
);
```

Replace the inner SELECT with any drill-down query to target specific orphans.
