# 3-State Workout System Fixes & Athlete Booking Display

**Date:** November 14, 2025
**Session:** Claude Code Session 6
**Branch:** augment-refactor
**Commits:** 8 commits (15f87b8 → 5b9461c)

---

## Summary

Fixed critical bugs in 3-state workout system (draft/published transitions) and implemented booking status display across all athlete calendar views. Improved UX for future booked sessions showing "Booked" status instead of "No workout".

---

## Problems Addressed

### 1. 3-State Workout Transitions Broken
- **Auto-publish on save:** Adding content to workout immediately published it (should stay draft)
- **Edit published workouts:** Editing published workout changed it to draft
- **Copy published workouts:** Copying published workout created draft copy
- **Missing is_published flag:** Copy didn't preserve is_published for modal button state

### 2. Athlete Booking Display Missing
- **Workouts Tab:** Only showed published workouts with bookings, missed unpublished booked sessions
- **Time display bug:** Showed "at null" instead of session time
- **Logbook views:** Future bookings showed "No workouts" instead of "Booked"
- **User request:** Athletes need weekly/monthly overview of booked classes

### 3. Exercise Library UX Issue
- **Section not expanded:** Clicking library button on collapsed section failed silently
- **Root cause:** handleSelectExercise required textarea element (only exists when expanded)

### 4. UI Inconsistencies
- **Benchmarks & Lifts page:** Teal color scheme needed update
- **Forge tab:** Changed teal → cyan
- **Lifts tab:** Changed teal → blue/sky theme
- **Modals:** Updated to dark theme (gray-500 background)

---

## Solutions Implemented

### 1. 3-State Workout System Fixes (3 commits)

**Fixed save behavior** (`app/coach/page.tsx:637, 683`)
```typescript
// Before: hasContent ? 'published' : 'draft'
// After:  hasContent ? (editingWOD.workout_publish_status || 'draft') : null

// New saves with content → 'draft'
// Edit preserves existing status
// Empty removes status → null
```

**Fixed copy behavior** (`app/coach/page.tsx:850-851`)
```typescript
workout_publish_status: wod.workout_publish_status || 'draft'
is_published: wod.is_published || false
```
- Preserves both publish status and is_published flag
- Modal correctly shows "Unpublish" for copied published workouts

**Fixed publish/unpublish API** (`app/api/google/publish-workout/route.ts:156, 276`)
```typescript
// Publish action sets: workout_publish_status: 'published'
// Unpublish action sets: workout_publish_status: 'draft'
```

**State Flow (now correct):**
```
Empty (NULL) → gray-200 dashed
  ↓ [Add content + Save]
Draft ('draft') → gray-400 solid
  ↓ [Click Publish button]
Published ('published') → teal + 📊 icon
  ↓ [Click Unpublish]
Draft ('draft') → back to gray-400
```

### 2. Exercise Library Auto-Expand (1 commit)

**Fixed library button** (`components/coach/WODModal.tsx:1127`)
```typescript
const openLibraryForSection = (sectionIndex: number) => {
  const section = formData.sections[sectionIndex];
  if (!section) return;

  // Auto-expand section before opening library
  setExpandedSections(prev => new Set(prev).add(section.id));
  setActiveSection(sectionIndex);
  setLibraryOpen(true);
};
```
- Clicking Library button now expands section automatically
- Ensures textarea exists in DOM for exercise insertion

### 3. Athlete Booking Display (2 commits)

**Workouts Tab - Fetch Refactor** (`components/athlete/AthletePageWorkoutsTab.tsx`)

**Before (broken):**
```typescript
// Fetched published workouts, then checked bookings
// Only showed workouts where is_published = true
// Used workout.publish_time (null for unpublished)
```

**After (fixed):**
```typescript
// Fetch user's bookings first (not published workouts)
// Get time from session.time (not workout.publish_time)
// Show all confirmed bookings regardless of workout status

const { data: bookings } = await supabase
  .from('bookings')
  .select(`
    weekly_sessions!inner (time, date, wods (...))
  `)
  .eq('member_id', userId)
  .eq('status', 'confirmed');
```

**Display Logic:**
```typescript
if (isPastDate) {
  attended = true;  // Past booking
} else {
  booked = true;    // Future booking
}

// Future bookings show "Booked" placeholder
// Past attended show full workout details
```

**Visual States:**
- **Booked (future):** Light teal header (#7dd3c0) + "Booked" text
- **Attended (past):** Dark teal header (#208479) + full details

**Logbook Tab Updates** (`components/athlete/AthletePageLogbookTab.tsx`)

**Day View:**
- Future bookings: "Booked" placeholder (no workout details)
- Past attended: Full details + logging form

**Week View:**
- Booked cards: Light teal background (#7dd3c0) with "Booked"
- Attended cards: White background with workout title

**Month View:**
- Booked badges: Light teal with "Booked" text
- Attended badges: Dark teal with workout title

**Fetch Updates (all 3 views):**
- Removed `if (workoutDate >= today) return null` filter
- Added `attended` and `booked` flags to WOD interface
- Conditional UI rendering based on status

### 4. UI Color Scheme Updates (1 commit)

**Benchmarks & Lifts Page** (`app/coach/benchmarks-lifts/page.tsx`)
- Forge Benchmarks: Teal → Cyan theme
  - Tab button: `bg-cyan-500`
  - Cards: `bg-cyan-200/300`
  - Add button: `bg-cyan-500 hover:bg-cyan-300`
- Barbell Lifts: Teal → Blue/Sky theme
  - Tab button: `bg-blue-300`
  - Cards: `bg-blue-300 hover:bg-sky-200`
  - Add button: `bg-sky-200 hover:bg-blue-300`
- All Modals: Dark theme
  - Background: `bg-gray-500`
  - Text: `text-gray-100`

---

## Files Modified

| File | Changes | Lines |
|:---|:---|:---|
| `app/coach/page.tsx` | 3-state save/copy fixes | 637, 683, 850-851 |
| `app/api/google/publish-workout/route.ts` | Publish/unpublish status updates | 156, 276 |
| `components/coach/WODModal.tsx` | Library auto-expand | 1127 |
| `app/coach/benchmarks-lifts/page.tsx` | Color scheme updates | 543-552, modals |
| `components/athlete/AthletePageWorkoutsTab.tsx` | Booking fetch refactor, booked UI | 63-148, 266-306 |
| `components/athlete/AthletePageLogbookTab.tsx` | Booking display (day/week/month) | 81-121, 191-231, 296-336, 591-697, 751-784, 858-876 |

---

## Commits

```
15f87b8 style(benchmarks-lifts): update color schemes for Forge and Lifts tabs
6f51921 fix(3-state): correct workout state transitions to draft on save
71bbcde fix(copy): preserve workout publish status when copying
77221d9 fix(copy): preserve is_published flag for modal button state
17773c6 fix(library): auto-expand section when opening exercise library
e9186aa fix(save): preserve publish status when editing workouts
3cad9be feat(athlete): show 'Booked' status for future bookings in calendar
40b1d03 fix(athlete): show all bookings regardless of workout publish status
5b9461c feat(athlete-logbook): show future bookings in all calendar views
```

---

## Testing Notes

**3-State Workflow:**
1. Empty workout → Add content → Save → Should be gray-400 (draft), not teal
2. Draft workout → Edit → Save → Should stay draft (not revert to empty)
3. Published workout → Edit → Save → Should stay published (not change to draft)
4. Copy published workout → Should create published copy (teal + Unpublish button)
5. Click Library on collapsed section → Should expand and add exercise

**Athlete Booking Display:**
1. Book 3 future sessions → All 3 should show "Booked" in Workouts tab with times
2. Check Logbook Week View → Booked sessions show light teal cards
3. Check Logbook Month View → Booked sessions show light teal badges
4. Click booked day in Day View → Shows "Booked" placeholder
5. Cancel booking → Should disappear from all views
6. Attend past session → Should show full details + logging form

---

## Known Issues & Future Work

### Identified During Session

1. **Workout Title Management:**
   - Need ability to add/edit workout titles from Schedule Tab
   - Currently only managed in separate admin area

2. **"Apply to Other Sessions" Modal:**
   - Takes up significant space in Edit Workout Modal
   - Consider button dropdown to collapse/expand
   - Question: Is this feature necessary? Need to test in actual workflow

3. **Code Organization:**
   - `app/coach/page.tsx` is very large (~2000+ lines)
   - Should consider refactoring into smaller components
   - Similar to athlete page refactor (Nov 12)

4. **Potential Workflow Improvements:**
   - Review session management UX
   - Consider bulk operations for common tasks
   - Evaluate if all current features are being used

---

## Lessons Learned

1. **State Preservation:** Always preserve existing status on edit operations unless explicitly changing
2. **Data Source Priority:** Fetch from the source of truth (bookings table, not published workouts)
3. **Silent Failures:** UI actions that require specific DOM state should ensure that state exists first
4. **User Expectations:** Athletes need overview of ALL bookings (future and past), not just attended classes
5. **Component Size:** Large files (2000+ lines) become difficult to maintain and navigate

---

## Branch Status

- **Branch:** augment-refactor
- **Status:** 26 commits ahead of main
- **Last Push:** 5b9461c
- **Next:** Continue testing before replacing main branch

---

**Session Duration:** ~2.5 hours
**Files Changed:** 6 files
**Lines Changed:** ~350 additions, ~200 deletions
