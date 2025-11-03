# Calendar Navigation & Panel Layout (v2.11, 2.12, 2.16, 2.17)

**Date:** October 22, 2025
**Versions:** 2.11, 2.12, 2.16, 2.17

## Summary
Redesigned calendar navigation with focused date system, improved workout preview, and refined panel layout architecture.

## Key Features Completed

### v2.11 - Calendar Navigation
- Redesigned Add Workout button (top-right, large teal "+", no text)
- Workout hover popover with filtered sections (excludes Whiteboard Intro, Warm-up, WOD prep, Cool Down)
- Monthly view expansion (no 2-workout limit, vertical expansion)
- Focused date system (blue ring) separate from selected date (week navigation)
- Click-to-select navigation (empty space highlights, day number switches to weekly view)
- Today button (teal) jumps to current date

### v2.16 - Button & Panel Refinements
- Search panel shows year in workout dates
- Add/Paste buttons moved to bottom right of day cards
- Single focused-date "+" button in nav bar with date tooltip
- Fixed exercise insertion cursor position gap bug
- Calendar hides when WOD and Search panels both open
- WOD panel aligns with Search panel below header

### v2.17 - Layout Architecture
- Header moved outside content container (always full width)
- Panels positioned at top-[72px] below header
- Gray-400 top borders on all three panels
- Separate content container for calendar (hides when panels open)

## Files Modified
- `app/coach/page.tsx`
- `components/WODModal.tsx`

## Technical Notes
- Focused date (blue ring) vs today (teal ring) visual distinction
- Panel layout supports 3 independent overlays
- Calendar visibility controlled by panel state
