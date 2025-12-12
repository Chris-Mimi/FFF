# Session 49: Workout Naming System Implementation

**Date:** December 12, 2025
**Session:** Database schema enhancement for accurate workout frequency tracking

## Summary
Implemented comprehensive workout naming system to solve movement frequency counting inaccuracies. Fixed orphaned workout logs deletion and Save button validation. System now distinguishes between repeated workouts within the same week (same workout) vs across different weeks (different workouts).

## Problems Solved

### 1. Orphaned Workout Logs Deletion
**Issue:** Session 48 left logs for deleted workouts showing as "Deleted Workout"
**User Decision:** Delete orphaned logs permanently (Option B from Session 48)

**Implementation:**
```typescript
// app/coach/athletes/page.tsx:186-201
// Identify orphaned logs (no matching workout)
const orphanedLogIds = enrichedLogs
  .filter(log => log.wod_id && !log.workout)
  .map(log => log.id);

// Delete orphaned logs from database
if (orphanedLogIds.length > 0) {
  const { error: deleteError } = await supabase
    .from('workout_logs')
    .delete()
    .in('id', orphanedLogIds);

  if (deleteError) {
    console.error('Error deleting orphaned logs:', deleteError);
  } else {
    console.log(`Deleted ${orphanedLogIds.length} orphaned workout logs`);
  }
}

// Only show logs with valid workouts
const validLogs = enrichedLogs.filter(log => log.workout);
```

**Result:** Orphaned logs automatically deleted when coach views athlete logbook tab

### 2. Save Button Validation Fix
**Issue:** Save button showed error "No results to save" even when athlete entered notes without scoring data

**Root Cause:**
```typescript
// BEFORE - Required scoring results
if (resultsToSave.length === 0) {
  alert('No results to save');
  return;
}
```

**Fix:**
```typescript
// AFTER - Allow notes OR scoring results
// components/athlete/AthletePageLogbookTab.tsx:1112-1119
const hasNotes = workoutLogs[currentWorkout.id]?.notes?.trim();

// If no results AND no notes, show error
if (resultsToSave.length === 0 && !hasNotes) {
  alert('No results or notes to save');
  return;
}
```

**Also Changed:** Button text "Save All Results" → "Save" (line 1222)

**Result:** Athletes can save notes-only, scoring-only, or both

### 3. Movement Frequency Counting (Core Issue)

**Problem Discovery Timeline:**

1. **Initial Report:** Overhead Squat showed "24x"
2. **First Fix (Session 48):** Changed to count unique workout IDs → showed "12x"
3. **Investigation (This Session):**
   - Created debug script: Found 12 unique workout IDs with Overhead Squat
   - These 12 IDs represented only 3 dates (Dec 8, 9, 10)
   - Multiple sessions per day (9am, 6pm) created separate database entries
   - User expected: ~5x (based on unique programming, not database entries)

**Root Cause Analysis:**

The app was counting database workout entries, but user defines "workout" as unique programming:

| Interpretation | What counts as "unique" | Dec 8-10 count |
|:---|:---|:---|
| Database IDs | Each `wods.id` | 12x ✗ |
| Dates | Each unique date | 3x ✗ |
| **Programming** | Unique workout content + temporal context | 5x ✓ |

**Real-World Programming Pattern:**
- Same workout repeated multiple times in one day (9am, 6pm sessions)
- Same workout repeated across days (Tuesday → Wednesday morning for different athletes)
- Same workout name programmed again later should count separately (temporal uniqueness)

**Solution Implemented:** Workout Naming System with Temporal Uniqueness

## Solution: Workout Naming System

### Concept

**Unique Workout Identifier:** `workout_name + workout_week`

| Scenario | workout_name | workout_week | Counts as |
|:---|:---|:---|:---|
| Same workout, same week, different times | "Overhead Fest" | "2025-W50" | **1 workout** |
| Same workout, same week, different days | "Overhead Fest" | "2025-W50" | **1 workout** |
| Same workout, different weeks | "Overhead Fest" | "2025-W51" | **Different workout** |
| Same workout, different years | "Overhead Fest" | "2026-W10" | **Different workout** |
| No workout name (legacy) | NULL | "2025-W50" | Fallback to date counting |

### Database Schema Changes

**Migration:** `20251212_add_workout_naming_system.sql`

```sql
-- Add new columns to wods table
ALTER TABLE wods ADD COLUMN IF NOT EXISTS session_type TEXT;
ALTER TABLE wods ADD COLUMN IF NOT EXISTS workout_name TEXT;
ALTER TABLE wods ADD COLUMN IF NOT EXISTS workout_week TEXT;

-- Migrate existing data: copy title to session_type
UPDATE wods SET session_type = title WHERE session_type IS NULL;

-- Calculate and populate workout_week for all existing records
-- Format: YYYY-Www (e.g., "2025-W50")
UPDATE wods
SET workout_week = TO_CHAR(date, 'IYYY') || '-W' || TO_CHAR(date, 'IW')
WHERE workout_week IS NULL;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_wods_workout_name_week ON wods(workout_name, workout_week);

-- Add comments
COMMENT ON COLUMN wods.session_type IS 'Type of session (WOD, Foundations, Kids & Teens, etc.) - formerly "title"';
COMMENT ON COLUMN wods.workout_name IS 'Optional name for the workout (e.g., "Overhead Fest", "Fran") - used for tracking repeated workouts';
COMMENT ON COLUMN wods.workout_week IS 'ISO week format YYYY-Www (e.g., "2025-W50") - automatically calculated from date';
```

**Execution:** Applied via Supabase Dashboard SQL Editor on 2025-12-12
**Backed Up:** Before migration execution

**Schema Evolution:**
- **Before:** `title` (session type like "WOD", "Foundations")
- **Now:** `session_type` (replaces title), `workout_name` (optional), `workout_week` (auto-calculated)
- **Future:** `title` column will be dropped after UI migration complete

### Analytics Code Changes

Updated all four frequency counting functions in `utils/movement-analytics.ts`:

**Pattern Applied:**

```typescript
// BEFORE (Session 48) - Count by workout ID
const workoutIds = new Set<string>();
workouts?.forEach(workout => {
  sections?.forEach(section => {
    section.lifts?.forEach(lift => {
      workoutIds.add(workout.id);  // ✗ Counts database entries
    });
  });
});
count = workoutIds.size;

// AFTER (Session 49) - Count by workout_name + workout_week
const uniqueWorkouts = new Set<string>();
workouts?.forEach(workout => {
  // Create unique workout key
  const workoutKey = workout.workout_name && workout.workout_week
    ? `${workout.workout_name}_${workout.workout_week}`
    : workout.date;  // Fallback for legacy workouts

  sections?.forEach(section => {
    section.lifts?.forEach(lift => {
      uniqueWorkouts.add(workoutKey);  // ✓ Counts unique programming
    });
  });
});
count = uniqueWorkouts.size;
```

**Functions Updated:**

1. **getLiftFrequency** (lines 42-143)
   - Query: Added `workout_name, workout_week` to SELECT
   - Logic: Changed `workoutIds: Set<string>` → `uniqueWorkouts: Set<string>`
   - Key: `${workout_name}_${workout_week}` or date fallback

2. **getBenchmarkFrequency** (lines 145-225)
   - Same pattern as lifts
   - Handles both `benchmark_workouts` and user-defined benchmarks

3. **getForgeBenchmarkFrequency** (lines 227-296)
   - Same pattern as lifts
   - Tracks Forge-specific benchmark usage

4. **getExerciseFrequency** (lines 298-385)
   - Same pattern as lifts
   - Handles content parsing for exercise mentions

**Backwards Compatibility:**
- NULL `workout_name` → falls back to date-based counting
- Existing workouts: `workout_week` auto-calculated in migration
- Legacy queries still work (new columns optional)

## Files Modified

1. **app/coach/athletes/page.tsx**
   - Lines 186-201: Orphaned log deletion logic
   - Line 205: Filter to show only valid logs

2. **components/athlete/AthletePageLogbookTab.tsx**
   - Lines 1112-1119: Save validation with notes check
   - Line 1222: Button text "Save All Results" → "Save"

3. **utils/movement-analytics.ts**
   - Lines 42-143: getLiftFrequency (workout naming logic)
   - Lines 145-225: getBenchmarkFrequency (workout naming logic)
   - Lines 227-296: getForgeBenchmarkFrequency (workout naming logic)
   - Lines 298-385: getExerciseFrequency (workout naming logic)
   - Summary: +94 lines, -41 lines

4. **supabase/migrations/20251212_add_workout_naming_system.sql** (NEW)
   - Created migration file (gitignored, executed via Dashboard)

5. **scripts/debug-overhead-squat.js** (NEW)
   - Debug script to investigate frequency counting
   - Revealed 12 workout IDs across 3 dates
   - Not committed (temporary debugging tool)

## Testing Results

All fixes verified working:

1. **✓ Orphaned Logs Deletion:**
   - Logs for deleted workouts no longer appear
   - Athletes Logbook tab shows only valid workout logs

2. **✓ Save Button Fix:**
   - Can save notes without scoring results
   - Can save scoring results without notes
   - Can save both together
   - Shows error only when both are empty

3. **✓ Movement Analytics Backend:**
   - Database schema updated successfully
   - All frequency functions use new workout naming logic
   - Backwards compatible with existing data

4. **⏳ UI Implementation (Pending):**
   - Coach workout creation interface needs `workout_name` input field
   - Auto-calculation of `workout_week` from selected date
   - Testing with actual named workouts to verify counts

## Pending Work (Next Session)

### 1. UI Implementation for Workout Naming

**Coach Workout Creation Interface:**
```typescript
// Add to coach/page.tsx EditWorkoutModal
<input
  type="text"
  placeholder="Workout Name (optional)"
  value={workoutName}
  onChange={(e) => setWorkoutName(e.target.value)}
  className="..."
/>
```

**Auto-calculate workout_week:**
```typescript
const calculateWorkoutWeek = (date: Date): string => {
  const year = date.getFullYear();
  const week = getISOWeek(date);  // Need ISO week calculation
  return `${year}-W${week.toString().padStart(2, '0')}`;
};
```

### 2. Testing with Named Workouts

**Test Cases:**
1. Create workout "Overhead Fest" on Dec 16 (Mon)
2. Repeat same workout Dec 17 (Tue) 9am
3. Repeat same workout Dec 17 (Tue) 6pm
4. Check Analysis page: Should show "Overhead Squat: 1x" (not 3x)
5. Create new workout "Overhead Fest" in January
6. Check Analysis page: Should show "Overhead Squat: 2x" (different weeks)

### 3. Migration Cleanup (Future)

**After UI implementation and testing:**
```sql
-- Drop old title column (replaced by session_type)
ALTER TABLE wods DROP COLUMN title;
```

**Condition:** Only drop after:
- ✓ UI fully updated to use session_type
- ✓ All workouts migrated
- ✓ No references to title column remain

## Technical Details

### ISO Week Format

**PostgreSQL Function:**
```sql
TO_CHAR(date, 'IYYY') || '-W' || TO_CHAR(date, 'IW')
```

**Output:** `YYYY-Www` (e.g., "2025-W50")

**Week Numbering:**
- ISO 8601 standard (Monday = week start)
- Week 1 = first week with Thursday in new year
- Weeks span year boundaries correctly

### Database Index

**Purpose:** Optimize queries for workout_name + workout_week lookups

```sql
CREATE INDEX IF NOT EXISTS idx_wods_workout_name_week
ON wods(workout_name, workout_week);
```

**Benefit:** Fast lookups when filtering by workout name or week

## Commits

**Commit a7344faa:** "feat(coach/athlete): implement workout naming system for accurate frequency tracking"
- 3 files modified (+94/-41 lines)
- Migration executed separately (gitignored)

## Key Learnings

1. **Definition Alignment:** Always clarify user terminology vs system terminology
   - User "workout" ≠ Database "workout ID"
   - User "workout" = Unique programming (content + temporal context)

2. **Temporal Uniqueness:** Same content at different times can be same or different:
   - Same week = same workout (repeated sessions)
   - Different weeks = different workouts (same name, different programming cycle)

3. **Backwards Compatibility:** New fields should be optional with fallback logic:
   - NULL workout_name → use date counting
   - Existing data → auto-calculate workout_week

4. **Migration Safety:** Always backup before schema changes:
   - `npm run backup` before migration
   - Execute via Supabase Dashboard (not git migrations)
   - Verify data after execution

5. **Set<string> for Uniqueness:** More flexible than Set<UUID>:
   - Composite keys: `${name}_${week}`
   - Fallback logic: date when name unavailable
   - Easy to debug (readable strings vs UUIDs)

## User Feedback

- "Working" (orphaned logs deletion)
- "Working" (Save button fix)
- Explained programming patterns clearly (repeated workouts)
- Confirmed temporal uniqueness requirement (same name, different weeks = different workouts)
- Approved Option 3 (workout naming system) after discussion

## Open Questions for Next Session

1. Should workout_name be optional or required for new workouts?
   - Current: Optional (legacy workouts have NULL)
   - Recommendation: Optional (allows quick programming without naming)

2. Should we add a "Copy Workout Name" button when repeating workouts?
   - Benefit: Ensures consistent naming across repeated sessions
   - Trade-off: Extra UI complexity

3. How to handle bulk naming of existing workouts?
   - Many legacy workouts have NULL workout_name
   - Option A: Leave as NULL (uses date fallback)
   - Option B: Bulk naming UI for coach to retroactively name workouts
