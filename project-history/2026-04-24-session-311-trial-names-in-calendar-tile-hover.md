# Session 311 — Trial Names in Calendar-Tile Hover Tooltip

**Date:** 2026-04-24
**Model:** Opus 4.7

---

## Bug

S310 follow-up. Chris reported the booked-members hover tooltip on calendar tiles ([components/coach/CalendarGrid.tsx:292-296](components/coach/CalendarGrid.tsx#L292-L296)) showed booked member names but didn't include trial athletes. The capacity badge had been updated in S310 to bump for trials, but the tooltip's `booked_members` array hadn't.

## Fix

Single-line change in [hooks/coach/useCoachData.ts](hooks/coach/useCoachData.ts) where `bookedMembers` is built. Appended the session's `trial_names` (with `(trial)` suffix) to the array via `.concat()` before the alphabetical sort. Trial athletes now appear interleaved with booked members in the tooltip, visually marked.

## Lesson

S310's project-history called out that "capacity count lives in three places per session" (panel copy, modal heading, calendar tile badge) — but missed a fourth: the calendar tile's hover-tooltip member list. Same data path (`useCoachData.booking_info.booked_members`), different field. Worth remembering for any future "this concept counts toward capacity" feature: audit `booking_info` consumers in CalendarGrid, not just the badge counter.
