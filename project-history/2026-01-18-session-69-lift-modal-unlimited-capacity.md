# Session 69: Lift Modal UX Improvements & Unlimited Capacity

**Date:** 2026-01-18
**Focus:** Configure Lift Modal defaults/UX, unlimited capacity implementation

---

## Summary

Improved Configure Lift Modal UX with better defaults and per-row deletion, then implemented comprehensive unlimited capacity (0) support across the entire booking system.

---

## Changes Made

### 1. Configure Lift Modal - Variable Reps Defaults

**Problem:**
- Variable reps defaulted to 1 set with 5 reps (not useful for typical strength programs)
- User had to manually configure 7 sets every time

**Solution:**
- Changed default to 7 sets with progressive loading pattern
- Default reps: 10, 6, 5, 5, 5, 5, 5
- Default percentages: 40, 50, 60, 70, 80, 85, 90%
- Applied to both initial state and reset-to-defaults logic

**Files Changed:**
- `components/coach/ConfigureLiftModal.tsx` (lines 37-45, 100-108)

**Code:**
```typescript
const [variableSets, setVariableSets] = useState<VariableSet[]>([
  { set_number: 1, reps: 10, percentage_1rm: 40 },
  { set_number: 2, reps: 6, percentage_1rm: 50 },
  { set_number: 3, reps: 5, percentage_1rm: 60 },
  { set_number: 4, reps: 5, percentage_1rm: 70 },
  { set_number: 5, reps: 5, percentage_1rm: 80 },
  { set_number: 6, reps: 5, percentage_1rm: 85 },
  { set_number: 7, reps: 5, percentage_1rm: 90 },
]);
```

---

### 2. Configure Lift Modal - Per-Row Delete Buttons

**Problem:**
- "Remove Set" button only deleted the last row
- No way to delete specific rows in the middle

**Solution:**
- Added X icon delete button on each row
- Delete function filters out specific row and re-numbers remaining sets
- Removed "Remove Set" button (now obsolete)
- Delete button disabled when only 1 set remains

**Files Changed:**
- `components/coach/ConfigureLiftModal.tsx` (lines 4, 146-154, 405-414, 421-428)

**Code:**
```typescript
// Import X icon
import { GripVertical, ChevronDown, X } from 'lucide-react';

// Delete function
const handleDeleteSet = (indexToDelete: number) => {
  if (variableSets.length > 1) {
    setVariableSets(prev => {
      const newSets = prev.filter((_, idx) => idx !== indexToDelete);
      // Re-number the sets
      return newSets.map((set, idx) => ({ ...set, set_number: idx + 1 }));
    });
  }
};

// Button in table cell
<button
  onClick={() => handleDeleteSet(idx)}
  disabled={variableSets.length <= 1}
  className='p-1 text-red-600 hover:bg-red-50 rounded transition disabled:text-gray-300 disabled:cursor-not-allowed'
  title='Delete this set'
>
  <X size={18} />
</button>
```

---

### 3. Configure Lift Modal - "Add to Section" Text Color Fix

**Problem:**
- Dropdown text appeared greyed out (hard to read)

**Solution:**
- Added `text-gray-900` class to select element

**Files Changed:**
- `components/coach/ConfigureLiftModal.tsx` (line 235)

---

### 4. Unlimited Capacity (0) Implementation (CRITICAL)

**Problem:**
- User tried to copy workout with maxCapacity=0 → failed
- Database CHECK constraint required capacity >= 1
- Session Management Modal showed "8" instead of respecting unlimited capacity
- Booking badge showed red for capacity=0

**Root Cause:**
- Database constraint: `CHECK (capacity >= 1)` blocked 0 values
- Validation function: `validateCapacity()` rejected capacity < 1
- UI components had no special handling for 0 (unlimited)

**Solution - 4 Parts:**

#### Part A: Database Migration

Created migration to change CHECK constraints from `>= 1` to `>= 0`:

**Files Changed:**
- `supabase/migrations/20260118_allow_unlimited_capacity.sql` (NEW)

**SQL:**
```sql
-- Drop existing constraint on weekly_sessions
ALTER TABLE weekly_sessions DROP CONSTRAINT weekly_sessions_capacity_check;
ALTER TABLE weekly_sessions ADD CONSTRAINT weekly_sessions_capacity_check CHECK (capacity >= 0);

-- Drop existing constraint on wods
ALTER TABLE wods DROP CONSTRAINT wods_max_capacity_check;
ALTER TABLE wods ADD CONSTRAINT wods_max_capacity_check CHECK (max_capacity >= 0);
```

#### Part B: Validation Logic

Updated `validateCapacity()` to accept 0 as unlimited:

**Files Changed:**
- `lib/coach/sessionCapacityHelpers.ts` (lines 19-26)

**Code:**
```typescript
export function validateCapacity(
  newCapacity: number,
  confirmedCount: number
): { valid: boolean; message?: string } {
  if (newCapacity < 0) {
    return { valid: false, message: 'Capacity cannot be negative' };
  }

  // 0 = unlimited capacity, skip confirmed count check
  if (newCapacity === 0) {
    return { valid: true };
  }

  if (newCapacity < confirmedCount) {
    return {
      valid: false,
      message: `Cannot reduce capacity below confirmed bookings (${confirmedCount})`,
    };
  }

  return { valid: true };
}
```

#### Part C: Session Management UI

**SessionInfoPanel.tsx:**
- Changed input min from '1' to '0'
- Display shows "Unlimited" when capacity is 0
- Added helper text "0 = unlimited" under edit input

**Files Changed:**
- `components/coach/SessionInfoPanel.tsx` (lines 115-145)

**Code:**
```typescript
// Edit mode
<input type='number' min='0' value={newCapacity} />
<p className='text-xs text-gray-500'>0 = unlimited</p>

// Display mode
<span>{session.capacity === 0 ? 'Unlimited' : `${session.capacity} spots`}</span>
```

**SessionManagementModal.tsx:**
- Confirmed bookings header shows "∞" when capacity is 0

**Files Changed:**
- `components/coach/SessionManagementModal.tsx` (line 252)

**Code:**
```typescript
<h3>Confirmed Bookings ({confirmedBookings.length}/{sessionDetails.session.capacity === 0 ? '∞' : sessionDetails.session.capacity})</h3>
```

**ManualBookingPanel.tsx:**
- Shows "Unlimited spots available" when capacity is 0

**Files Changed:**
- `components/coach/ManualBookingPanel.tsx` (lines 55-59)

**Code:**
```typescript
<p>
  {capacity === 0
    ? 'Unlimited spots available'
    : confirmedCount >= capacity
      ? '⚠️ Session is full - member will be added to waitlist'
      : `${capacity - confirmedCount} spot(s) available`}
</p>
```

#### Part D: Calendar Booking Badge

**Problem:**
- Capacity 0 evaluated as `confirmedCount >= 0` → always true → red badge

**Solution:**
- Check for capacity === 0 FIRST → always green
- Display "X/∞" instead of "X/0"
- Tooltip shows "unlimited" instead of "0 capacity"

**Files Changed:**
- `components/coach/CalendarGrid.tsx` (lines 218-233)

**Code:**
```typescript
className={`flex-shrink-0 text-[10px] font-bold text-white rounded px-1 py-0.5 hover:opacity-80 transition cursor-pointer ${
  wod.booking_info.capacity === 0
    ? 'bg-green-600'  // ALWAYS green for unlimited
    : wod.booking_info.waitlist_count > 0
      ? 'bg-purple-600'
      : wod.booking_info.confirmed_count >= wod.booking_info.capacity
        ? 'bg-red-600'
        : wod.booking_info.confirmed_count >= wod.booking_info.capacity * 0.8
          ? 'bg-yellow-600'
          : 'bg-green-600'
}`}
title={`Click to manage session - ${wod.booking_info.confirmed_count} confirmed / ${wod.booking_info.capacity === 0 ? 'unlimited' : wod.booking_info.capacity} capacity`}
>
  {wod.booking_info.confirmed_count}/{wod.booking_info.capacity === 0 ? '∞' : wod.booking_info.capacity}
</button>
```

---

## Testing Notes

**User confirmed working:**
- ✅ Variable reps default to 7 sets with progressive loading
- ✅ Delete button works on each row
- ✅ "Add to section" dropdown text readable
- ✅ Workout copy with capacity=0 works after migration
- ✅ Session Management Modal shows "Unlimited" for capacity=0
- ✅ Booking badge shows green for unlimited capacity
- ✅ Display shows "X/∞" instead of "X/0"

---

## Key Learnings

1. **Database Constraints Are Real:**
   - Even with client-side validation fixes, database CHECK constraints block operations
   - Always check database schema when encountering insert/update errors
   - Use browser console (F12) to see actual Supabase error messages

2. **Conditional Logic Order Matters:**
   - Check for capacity === 0 BEFORE comparing confirmed_count >= capacity
   - Otherwise 0 >= 0 evaluates to true and shows wrong color/state

3. **Consistent UX for Edge Cases:**
   - Use "∞" symbol consistently across UI for unlimited
   - Use "Unlimited" text where appropriate
   - Green color = good/available (even when 0)

4. **Default Values Should Match Common Use Cases:**
   - 7-set progressive loading is typical for strength programs
   - Better UX to start with useful defaults than empty/minimal state

---

## Files Modified

**Components (5 files):**
- components/coach/ConfigureLiftModal.tsx
- components/coach/SessionInfoPanel.tsx
- components/coach/SessionManagementModal.tsx
- components/coach/ManualBookingPanel.tsx
- components/coach/CalendarGrid.tsx

**Utilities (1 file):**
- lib/coach/sessionCapacityHelpers.ts

**Migrations (1 file):**
- supabase/migrations/20260118_allow_unlimited_capacity.sql

**Total:** 7 files changed + 1 migration created

---

## Migration Applied

**Migration:** `20260118_allow_unlimited_capacity.sql`
**Status:** ✅ Applied successfully via Supabase Dashboard SQL Editor
**Impact:**
- `weekly_sessions.capacity` can now be 0 (unlimited)
- `wods.max_capacity` can now be 0 (unlimited)
- Workouts with unlimited capacity can be copied successfully

---

## Next Session Priorities

Continue with Week 2 Testing Phase for January Beta Launch.
