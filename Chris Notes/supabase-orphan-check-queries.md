# Supabase Orphan & Stray Record Checks

**Created:** 2026-02-16 (after Session 126-127 stray records incident)
**Purpose:** Run these in Supabase SQL Editor to find orphan/stray records across all tables.

---

## Quick Health Check (Run This First)

Shows a one-row summary of orphan counts across all key tables:

```sql
SELECT
  (SELECT COUNT(*) FROM wod_section_results r LEFT JOIN weekly_sessions ws ON ws.workout_id = r.wod_id WHERE ws.id IS NULL) AS stray_section_results,
  (SELECT COUNT(*) FROM wod_section_results r JOIN weekly_sessions ws ON ws.workout_id = r.wod_id LEFT JOIN bookings b ON b.session_id = ws.id AND (b.member_id = r.user_id OR b.member_id IN (SELECT m.id FROM members m WHERE m.email = (SELECT email FROM auth.users WHERE id = r.user_id) OR m.primary_member_id IN (SELECT m2.id FROM members m2 WHERE m2.email = (SELECT email FROM auth.users WHERE id = r.user_id)))) WHERE b.id IS NULL) AS unbooked_section_results,
  (SELECT COUNT(*) FROM workout_logs wl LEFT JOIN wods w ON w.id = wl.wod_id WHERE w.id IS NULL) AS orphan_workout_logs,
  (SELECT COUNT(*) FROM bookings b LEFT JOIN weekly_sessions ws ON ws.id = b.session_id WHERE ws.id IS NULL) AS orphan_bookings,
  (SELECT COUNT(*) FROM reactions r LEFT JOIN wod_section_results wsr ON wsr.id = r.target_id WHERE r.target_type = 'wod_section_result' AND wsr.id IS NULL) AS orphan_reactions_section,
  (SELECT COUNT(*) FROM reactions r LEFT JOIN benchmark_results br ON br.id = r.target_id WHERE r.target_type = 'benchmark_result' AND br.id IS NULL) AS orphan_reactions_benchmark,
  (SELECT COUNT(*) FROM reactions r LEFT JOIN lift_records lr ON lr.id = r.target_id WHERE r.target_type = 'lift_record' AND lr.id IS NULL) AS orphan_reactions_lift;
```

**Expected result:** All zeros = healthy database.

---

## 1. WOD Section Results (Most Important)

### 1a. Results under WODs with no session scheduled

This is what caused the Session 125-127 leaderboard bug.

```sql
SELECT r.id, r.wod_id, r.section_id, r.workout_date, r.user_id,
       r.scaling_level, r.time_result, r.reps_result, r.weight_result,
       r.rounds_result, r.calories_result, r.metres_result
FROM wod_section_results r
LEFT JOIN weekly_sessions ws ON ws.workout_id = r.wod_id
WHERE ws.id IS NULL
ORDER BY r.workout_date;
```

### 1b. Results where user (or their family members) has no booking for that session

```sql
SELECT r.id, r.wod_id, r.section_id, r.workout_date, r.user_id,
       r.scaling_level, ws.date AS session_date, ws.time AS session_time
FROM wod_section_results r
JOIN weekly_sessions ws ON ws.workout_id = r.wod_id
LEFT JOIN bookings b ON b.session_id = ws.id
  AND (
    b.member_id = r.user_id  -- Direct match (family members where user_id = member_id)
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
ORDER BY r.workout_date;
```

### 1c. Results pointing to non-existent WODs

```sql
SELECT r.id, r.wod_id, r.section_id, r.workout_date
FROM wod_section_results r
LEFT JOIN wods w ON w.id = r.wod_id
WHERE w.id IS NULL;
```

### 1d. Duplicate results (same user, same section, same WOD)

```sql
SELECT user_id, wod_id, section_id, COUNT(*) AS dupes
FROM wod_section_results
GROUP BY user_id, wod_id, section_id
HAVING COUNT(*) > 1;
```

---

## 2. WODs

### 2a. WODs with no session (not necessarily a problem — could be drafts)

```sql
SELECT w.id, w.date, w.session_type, w.workout_name, w.is_published
FROM wods w
LEFT JOIN weekly_sessions ws ON ws.workout_id = w.id
WHERE ws.id IS NULL
ORDER BY w.date;
```

### 2b. WODs referenced by sessions but WOD doesn't exist

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
WHERE br.benchmark_id IS NOT NULL AND bw.id IS NULL
   OR br.forge_benchmark_id IS NOT NULL AND fb.id IS NULL;
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

### 8a. Family members pointing to non-existent primary member

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

## How to Delete Orphans

**Always backup first:** Run `npm run backup` from terminal before deleting anything.

Example — delete stray section results with no session:
```sql
DELETE FROM wod_section_results
WHERE id IN (
  SELECT r.id
  FROM wod_section_results r
  LEFT JOIN weekly_sessions ws ON ws.workout_id = r.wod_id
  WHERE ws.id IS NULL
);
```

Replace the inner SELECT with any query from above to target specific orphans.
