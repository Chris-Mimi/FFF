# Session 12: Independent Workout Architecture & Delete Simplification

**Date:** November 18, 2025
**Branch:** `coach-page-refactor`
**Commits:** 4 (be92e8f, c4a4934, c5ff461, d7a9cd9)

---

## Summary

Refactored workout application system from shared references to independent copies, preventing cascading edits and fixing workout_logs multi-session issues. Removed unnecessary smart delete logic since app not yet deployed.

---

## Problems Addressed

### 1. Cascading Edits Across Sessions
**Issue:** Applying workout to multiple sessions created shared `workout_id` references
- Edit Monday 17:15 → All sessions with same workout_id changed
- User reported: "I edited one workout and all the applied sessions changed"
- Unintended mass updates

**Root Cause:** Lines 54-62 and 122-130 in useWODOperations.ts linked sessions to same workout record

### 2. workout_logs Can't Handle Same-Day Multi-Sessions
**Schema constraint:**
```sql
CREATE TABLE workout_logs (
  wod_id UUID,
  workout_date DATE,
  user_id UUID,
  ...
);
```
**Problem:** Athlete attends Monday 09:00 AND 17:15 (both same workout_id, same date)
- Can only log once
- Second log overwrites first (unique constraint on wod_id + workout_date + user_id)

### 3. Analysis Page Counting Already Correct
**Observation:** Analysis page counts `weekly_sessions` (not `wods` table)
- 5 sessions = 5 workouts counted correctly
- No changes needed after architecture shift

### 4. Empty Session Save Failure
**Issue:** After initial refactor, editing empty sessions didn't save
- Created workout but didn't link to session
- Orphaned workout records in database

---

## Solution Implemented

### Architecture Change: Shared → Independent

**Before:**
```
Session 09:00 → workout_id: 'abc-123'
Session 17:15 → workout_id: 'abc-123' ← shared reference
Session 18:30 → workout_id: 'abc-123' ← shared reference
```

**After:**
```
Session 09:00 → workout_id: 'abc-123'
Session 17:15 → workout_id: 'def-456' ← independent copy
Session 18:30 → workout_id: 'ghi-789' ← independent copy
```

### Code Changes

**1. Apply to Sessions - Edit Path (lines 54-89)**
```typescript
// OLD: Link all sessions to same workout
await supabase
  .from('weekly_sessions')
  .update({ workout_id: editingWOD.id })
  .in('id', wodData.selectedSessionIds);

// NEW: Create duplicate for each session
for (const sessionId of wodData.selectedSessionIds) {
  const { data: duplicateWOD } = await supabase
    .from('wods')
    .insert([{ ...workout data... }])
    .single();

  await supabase
    .from('weekly_sessions')
    .update({ workout_id: duplicateWOD.id })
    .eq('id', sessionId);
}
```

**2. Apply to Sessions - Create Path (lines 147-182)**
- Same pattern as edit path
- Creates independent copies instead of sharing

**3. Empty Session Fix (lines 183-192)**
```typescript
else if (editingWOD?.booking_info?.session_id && newWOD) {
  // Link new workout to this specific empty session
  await supabase
    .from('weekly_sessions')
    .update({
      workout_id: newWOD.id,
      capacity: wodData.maxCapacity,
      status: 'published'
    })
    .eq('id', editingWOD.booking_info.session_id);
}
```

**4. Simplified Delete (removed smart prompt)**

Since app not deployed, no legacy shared workouts exist.

**Removed:**
- Session count query (77 lines → 28 lines)
- Multi-session delete prompt
- "Delete from all vs this session" logic
- sessionId parameter

**Kept:**
- Simple confirmation dialog
- Set workout_id to NULL
- Delete workout record

---

## User Workflow Impact

### Before (Problematic)
1. Create Monday 10:00 workout
2. Apply to 17:15 and 18:30 → All share workout_id
3. Edit 17:15 → **All three sessions change** ❌

### After (Correct)
1. Create Monday 10:00 workout
2. Apply to 17:15 and 18:30 → Each gets independent copy
3. Edit 17:15 → **Only 17:15 changes** ✅
4. Edit one, copy, paste to others → Manual sync if needed

### Delete Behavior
- Delete workout → Only that session returns to empty
- Other sessions unaffected (independent workout_ids)
- Bookings preserved (tied to session_id, not workout_id)

---

## Files Modified

**hooks/coach/useWODOperations.ts** (83 lines changed)
- Line 22: Added `isEditingRealWorkout` check to distinguish real workouts from empty sessions
- Lines 54-89: Edit path creates independent copies for selectedSessionIds
- Lines 147-182: Create path creates independent copies for selectedSessionIds
- Lines 183-192: Empty session linking logic
- Lines 205-232: Simplified delete (removed smart prompt, 77 → 28 lines)

**components/coach/CalendarGrid.tsx** (2 lines changed)
- Line 36: Removed sessionId parameter from onDeleteWOD signature
- Line 215: Removed sessionId argument from delete call

**memory-bank/memory-bank-activeContext.md** (1 line changed)
- Line 102: Added workout title CRUD to Session 9 completed items

---

## Database Impact

**More Records:**
- Old: 1 workout shared by 3 sessions
- New: 3 independent workout records

**Analysis Unchanged:**
- Already counts `weekly_sessions` (not `wods` table)
- 5 sessions = 5 workouts counted (correct before and after)

**workout_logs Fixed:**
- Can now log multiple sessions per day
- Each session has unique workout_id

**Bookings Unchanged:**
- Tied to `session_id` (not `workout_id`)
- Independent of workout state (draft/published/empty)

---

## Testing Notes

**Apply to Sessions:**
✅ Creates independent copies (verified in database)
✅ Editing one session doesn't affect others
✅ Deleting one session doesn't affect others

**Empty Sessions:**
✅ Can add content and save
✅ Creates workout and links to session
✅ No orphaned records

**Delete Workflow:**
✅ Simple confirmation prompt
✅ Session returns to empty state
✅ Bookings preserved

---

## Commits

**Branch:** coach-page-refactor

1. **be92e8f** - feat(coach): add smart delete prompt for multi-session workouts
   - Initial smart delete implementation (later removed)

2. **c4a4934** - docs(memory-bank): mark workout title CRUD as completed
   - Removed duplicate from Next Steps

3. **c5ff461** - refactor(coach): change Apply to Sessions to create independent workout copies
   - Main architecture change (shared → independent)
   - Fixed empty session save bug

4. **d7a9cd9** - refactor(coach): simplify workout delete - remove smart prompt logic
   - Removed unnecessary complexity (no production data)
   - 64% code reduction in delete logic

---

## Lessons Learned

1. **Architecture decisions affect multiple systems:** workout_logs constraint revealed by architecture choice
2. **Pre-production simplicity:** No legacy data = simpler solutions (removed smart delete)
3. **Database is source of truth:** Analysis already correct because it queries sessions (not workouts)
4. **Independent copies match user mental model:** Copy/paste behavior users already understand
5. **Empty session IDs need special handling:** `session-{uuid}` vs real workout IDs require different code paths

---

**Session Time:** ~90 minutes
**Token Usage:** ~98K
**Status:** All commits pushed to coach-page-refactor branch
