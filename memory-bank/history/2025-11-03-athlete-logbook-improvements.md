# Athlete Logbook Improvements & Bug Fixes

**Date:** November 3, 2025
**Session:** Bug fixes and UX enhancements for athlete experience

## Summary
Fixed multiple athlete-facing bugs and implemented accordion-style week/month views for better workout navigation. Completed Memory Bank optimization project.

## Features Implemented

### 1. Athlete Logbook Week/Month Views
**Status:** ✅ Complete

**Week View (Accordion-style):**
- Shows list of ALL attended workouts for selected week
- Click workout card → expands inline to show full details + log entry form
- Each card displays: Date, workout title, track color badge
- Only attended workouts shown (confirmed bookings only)

**Month View (Calendar Grid):**
- Calendar grid layout similar to Published Workouts tab
- Attended days highlighted with teal background + workout title
- Click day → expands workout details below calendar
- Full log entry form available for selected workout
- Empty days grayed out (non-clickable)

**Implementation:**
- Added `fetchAttendedWorkoutsForPeriod()` function to fetch workouts with confirmed bookings
- Added `expandedWorkoutId` state for accordion behavior
- Added month navigation functions (previousMonth, nextMonth)
- Updated useEffect to call appropriate fetch based on viewMode
- Added "Month" button to view toggle

**Files Modified:**
- `app/athlete/page.tsx` - LogbookTab component

**Technical Notes:**
- Fixed timezone offset bug in month view (used local date formatting instead of toISOString())
- Filters workouts by checking bookings table for confirmed status
- Reuses same log entry form across all three views

### 2. Click-to-Logbook from Published Workouts
**Status:** ✅ Complete

**Feature:**
- Click any workout card in Published Workouts tab → navigates to Logbook tab with that date selected
- Seamless navigation between viewing schedule and logging results

**Implementation:**
- Added `onNavigateToLogbook` prop to AthleteWorkoutsTab component
- Lifted `logbookDate` state to parent component
- Added onClick handler to workout cards (only when workout exists)
- Added hover effect (cursor-pointer + shadow)
- LogbookTab now accepts `initialDate` prop

**Files Modified:**
- `components/AthleteWorkoutsTab.tsx`
- `app/athlete/page.tsx`

### 3. "All Time" Attendance Bug Fix
**Status:** ✅ Complete

**Bug:** Member Management "All Time" attendance filter showed 0 for all members.

**Root Cause:** RPC function `get_member_attendance_count` didn't handle NULL parameter. When passed NULL for "All Time":
- `CURRENT_DATE - NULL::INTERVAL` = NULL
- `ws.date >= NULL` returns NULL (not TRUE), excluding all rows

**Solution:** Added conditional logic in RPC function:
- If `p_days_back IS NULL` → Count all confirmed bookings (no date filter)
- Otherwise → Apply date filter as before

**Files Created:**
- `database/fix-attendance-all-time.sql`

**Status:** SQL migration run in Supabase (verified working)

### 4. macOS Password Autofill Popup Investigation
**Status:** ✅ Identified (not a code bug)

**Issue:** "Enable Password Autofill" popup appears when clicking input fields (search boxes, date inputs, etc.)

**Root Cause:** macOS iCloud Keychain system-level feature, not browser autofill. macOS aggressively offers password autofill on ANY input field.

**Attempted Fixes:**
- Added `autoComplete='off'` - ignored by macOS
- Added `readOnly` + `onFocus` trick - ignored by macOS

**Conclusion:** This is macOS System Settings behavior. Users can disable in:
- System Settings → Passwords → Password Options → Uncheck "AutoFill Passwords"
- Safari → Settings → AutoFill → Uncheck "User names and passwords"

**Decision:** Accepted as OS-level behavior (not app bug). Won't affect most users.

---

## Memory Bank Optimization (Completed Earlier This Session)

**Status:** ✅ Complete

**Changes:**
- Reduced activeContext.md: 40,524 → 3,580 chars (91% reduction)
- Reduced workflow-protocols.md: 13,072 → 5,876 chars (55% reduction)
- Created lessons-learned.md: 7,544 chars (critical gotchas)
- Created 7 dated history files for past work (Oct 15-30)
- Total session load: 53KB → 17KB (68% savings)

**New Structure:**
```
memory-bank/
├── memory-bank-activeContext.md (3.6KB - current focus only)
├── workflow-protocols.md (5.9KB - essential rules)
├── lessons-learned.md (7.5KB - critical patterns)
└── history/
    ├── 2025-10-15-auth-implementation.md
    ├── 2025-10-18-wod-creation-ux.md
    ├── 2025-10-20-analysis-enhancements.md
    ├── 2025-10-22-calendar-navigation.md
    ├── 2025-10-25-publishing-system.md
    ├── 2025-10-28-booking-system.md
    ├── 2025-10-30-session-management.md
    └── 2025-11-03-memory-optimization.md
```

---

## Testing Results

**Week View:**
- ✅ Shows only attended workouts
- ✅ Accordion expand/collapse works
- ✅ Log entry form saves correctly
- ✅ Navigation arrows work correctly

**Month View:**
- ✅ Calendar grid displays correctly
- ✅ Attended days highlighted
- ✅ Click day shows details below
- ✅ Timezone bug fixed (dates match day/week views)

**Click-to-Logbook:**
- ✅ Navigation from Published Workouts works
- ✅ Logbook opens with correct date selected
- ✅ Day view shows selected workout

**All Time Attendance:**
- ✅ Shows correct counts across all time
- ✅ Other timeframes (7/30/365 days) still work

---

## Commits

- `99987f5` - feat: Implement accordion week view and calendar month view for Athlete Logbook

---

**Session Duration:** ~2.5 hours
**Token Usage:** ~125K tokens (62% of budget)
**Next Session Impact:** Estimated 30-35K token savings per session due to Memory Bank optimization
