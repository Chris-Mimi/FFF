# Session 11: Workout Operations & Copy/Paste Fixes

**Date:** November 17, 2025
**Branch:** `coach-page-refactor`
**Commits:** 4 (f0ae640, a21e8d8, 06a763d, 490b978)

---

## Summary

Fixed critical bugs in workout copy/paste/create operations and delete workflow. Added collapsible Thursday column for calendar views. All fixes address user-reported issues with workout management workflows.

---

## Problems Identified

### 1. Delete Workflow Created Orphaned Sessions
**Issue:** Deleting workout left sessions in invisible/orphaned state
- Can't create new workout on days with orphaned sessions (unique constraint on date+time)
- Can't drag/drop or copy/paste to occupied days
- Members could lose bookings when workouts deleted

**Root Cause:** `handleDeleteWOD` deleted workout but left `weekly_sessions.workout_id` pointing to deleted workout ID

### 2. Copy/Paste Used Wrong Time
**Issue:** Copying 15:00 workout created it at 09:00, copying 20:00 workout created at 17:15
- User reported: "If I copy a Workout which starts at 20:00 to Friday... it doesn't work"
- Inconsistent behavior: sometimes worked, sometimes not

**Root Cause:** `handleCopyWOD` trusted stale `classTimes` field in WOD object instead of fetching actual session times from database

**Evidence:**
```
Console log showed:
wodId: 'bdf69b48-2009-4a54-92b9-c24b1d9747b0'
classTimes: ['09:00']  // Stale, should be ['15:00']
```

### 3. Create Workout Failed on Populated Days
**Issue:** Creating new workout on days with existing sessions silently failed
- Worked on empty days
- Failed on days with 1+ existing workouts

**Root Cause:** Condition checked `otherSessions.length === 0` instead of `selectedSessionIds.size === 0`
- When sessions exist, `otherSessions.length > 0` always true
- `classTimes` remained empty, no session created

### 4. Edit Time Not Working on Some Days
**Issue:** Changing workout time worked on Friday, failed on Saturday/Sunday
- Session Management modal worked correctly (as reference)

**Root Cause:** Same as Problem #3 - fixed by same commit

---

## Solutions Implemented

### 1. Two-Step Delete Workflow
**Implementation:** `hooks/coach/useWODOperations.ts`

**Changes:**
```typescript
// handleDeleteWOD: Set workout_id to NULL before deleting
await supabase
  .from('weekly_sessions')
  .update({ workout_id: null })
  .eq('workout_id', wodId);

// Then delete the workout
await supabase.from('wods').delete().eq('id', wodId);
```

**New Function:** `handleDeleteSession`
```typescript
const handleDeleteSession = async (sessionId: string) => {
  if (!confirm('Delete this session entirely? This will cancel all member bookings...')) return;

  await supabase
    .from('weekly_sessions')
    .delete()
    .eq('id', sessionId);

  await fetchWODs();
  await fetchTracksAndCounts();
};
```

**UI Changes:** `components/coach/CalendarGrid.tsx`
- Added delete button to empty session cards
- Shows on hover with Trash2 icon
- Positioned with other action buttons

**Workflow:**
1. Delete Draft/Published workout → Returns to empty session (preserves bookings)
2. Delete empty session → Removes session + all bookings

**Commit:** f0ae640

### 2. Fetch Session Times from Database
**Implementation:** `hooks/coach/useWODOperations.ts`

**Old Logic:**
```typescript
// Trusted classTimes first (WRONG - could be stale)
let timesToCreate = wod.classTimes && wod.classTimes.length > 0 ? wod.classTimes : [];

if (timesToCreate.length === 0 && wod.id && !wod.id.startsWith('session-')) {
  // Only fetched from DB if classTimes empty
  const { data: sourceSessions } = await supabase...
}
```

**New Logic:**
```typescript
// ALWAYS fetch from database first
let timesToCreate: string[] = [];

if (wod.id && !wod.id.startsWith('session-')) {
  const { data: sourceSessions } = await supabase
    .from('weekly_sessions')
    .select('time')
    .eq('workout_id', wod.id)
    .order('time', { ascending: true });

  if (!sessionsFetchError && sourceSessions && sourceSessions.length > 0) {
    timesToCreate = sourceSessions.map(s => s.time);
  }
}

// Fallback to classTimes only if DB fetch returned nothing
if (timesToCreate.length === 0 && wod.classTimes && wod.classTimes.length > 0) {
  timesToCreate = wod.classTimes;
}
```

**Result:** Copy/paste now creates workouts at correct times

**Commit:** a21e8d8

### 3. Fix New Workout Creation Logic
**Implementation:** `components/coach/WorkoutModal.tsx`

**Change:** Line 1597 (appears twice in save buttons)
```typescript
// Before
classTimes: (!editingWOD && otherSessions.length === 0)
  ? [newSessionTime]
  : formData.classTimes,

// After
classTimes: (!editingWOD && selectedSessionIds.size === 0)
  ? [newSessionTime]
  : formData.classTimes,
```

**Logic:**
- Check if user SELECTED any existing sessions
- Not if sessions merely EXIST
- If no selections, use `newSessionTime` for standalone workout

**Commit:** 06a763d

### 4. Collapsible Thursday Column
**Implementation:** `components/coach/CalendarGrid.tsx`

**Features:**
- Thursday collapsed by default (rarely used day)
- Toggle button in week banner (weekly view)
- Clickable "Thu" header (monthly view)
- Grid adjusts: 7 columns → 6 columns
- ChevronRight/ChevronLeft icons indicate state

**State Management:**
```typescript
const [thursdayCollapsed, setThursdayCollapsed] = useState(true);
```

**Filtering:**
```typescript
const filteredWeekDates = thursdayCollapsed
  ? weekDates.filter((date) => date.getDay() !== 4) // Thursday is day 4
  : weekDates;
```

**UI Controls:**
- **Weekly view:** Button in teal banner with chevron + "Thu" text
- **Monthly view:** Clickable "Thu" header or "> Thu" expand button

**Commit:** 490b978

---

## Technical Details

### Files Modified

**hooks/coach/useWODOperations.ts** (55 lines changed)
- Updated `handleDeleteWOD`: Set workout_id NULL before delete
- Added `handleDeleteSession`: Delete session + cascade bookings
- Updated `handleCopyWOD`: Fetch times from DB first
- Exported `handleDeleteSession`

**components/coach/CalendarGrid.tsx** (62 lines changed)
- Added `useState` for `thursdayCollapsed`
- Added imports: `ChevronLeft`, `ChevronRight`
- Added `onDeleteSession` prop to interface
- Added delete button to empty session cards
- Implemented collapsible Thursday in both views
- Dynamic grid columns: `grid-cols-6` or `grid-cols-7`

**components/coach/WorkoutModal.tsx** (2 lines changed)
- Changed condition: `otherSessions.length === 0` → `selectedSessionIds.size === 0`
- Applied to both save button handlers

**app/coach/page.tsx** (2 lines changed)
- Destructured `handleDeleteSession` from `useWODOperations`
- Passed `onDeleteSession` prop to CalendarGrid

### Database Operations

**Delete Workflow:**
```sql
-- Step 1: Return session to empty state
UPDATE weekly_sessions
SET workout_id = NULL
WHERE workout_id = 'workout-uuid';

-- Step 2: Delete workout
DELETE FROM wods WHERE id = 'workout-uuid';

-- Step 3 (optional): Delete empty session
DELETE FROM weekly_sessions WHERE id = 'session-uuid';
-- Bookings cascade delete if FK configured
```

**Copy Workflow:**
```sql
-- Fetch source session times
SELECT time
FROM weekly_sessions
WHERE workout_id = 'source-workout-uuid'
ORDER BY time ASC;

-- Create new workout with correct times
INSERT INTO wods (...) VALUES (...);

-- Create/update sessions at source times
INSERT INTO weekly_sessions (date, time, workout_id, ...)
VALUES ('2025-11-17', '15:00', 'new-workout-uuid', ...)
ON CONFLICT (date, time) DO UPDATE ...;
```

### Testing Notes

**Copy/Paste:** Verified 15:00 workout copies to 15:00 (not 09:00)

**Delete Workflow:**
1. Delete Draft workout → Empty session remains, bookings preserved
2. Delete empty session → Session + bookings removed

**Create on Populated Days:** Creates standalone workout at specified time

**Thursday Toggle:** Works in both weekly and monthly views

---

## Lessons Learned

### 1. Database is Source of Truth
**Problem:** Trusted in-memory object field (`classTimes`) over database state
**Solution:** Always fetch critical data from database, use object fields as fallback only
**Pattern:**
```typescript
// ✅ Good: DB first, object fallback
const times = await fetchFromDB() || object.field;

// ❌ Bad: Object first
const times = object.field || await fetchFromDB();
```

### 2. Check User Intent, Not Data Existence
**Problem:** `otherSessions.length === 0` checked if data exists, not if user selected it
**Solution:** Check user action state (`selectedSessionIds.size === 0`)
**Principle:** Distinguish between "available" vs "chosen"

### 3. Cascade Deletes Need Planning
**Problem:** Deleting workouts orphaned sessions
**Solution:** Two-step delete with explicit state transitions
**Pattern:**
1. Preserve parent (set foreign key NULL)
2. Delete child
3. Optionally delete parent later

### 4. Stale State in Objects
**Problem:** Objects passed between functions can have outdated fields
**Cause:** Object created once, passed around, fields not updated when database changes
**Solution:** Re-fetch data or track modification timestamps

---

## Branch Status

**Branch:** coach-page-refactor
**Status:** Pushed to origin
**Commits:** 4 total
- f0ae640: Two-step delete workflow
- a21e8d8: Fetch session times from DB
- 06a763d: Fix selectedSessionIds logic
- 490b978: Collapsible Thursday column

**Next Steps:**
- Merge to augment-refactor or continue on coach-page-refactor?
- Consider memory bank update
- Test all workflows comprehensively

---

**Session Time:** ~90 minutes
**Token Usage:** ~87K (87,312 at end)
**Files Modified:** 4
**Lines Changed:** ~121
