# Session 192 — Mobile Fixes + Google Calendar Timezone

**Date:** 2026-03-10
**AI:** Claude Opus 4.6

---

## Changes

### components/athlete/LeaderboardView.tsx
- Replaced native `<select>` workout picker with custom `WodDropdown` component
- Custom dropdown uses `text-xs` for options, `max-h-60` with scroll, click-outside-to-close
- Selected item shown with truncated text + ChevronDown icon
- Added `useRef` and `ChevronDown` imports

### app/coach/members/page.tsx
- Added `overflow-x-auto scrollbar-hide` to tab container for horizontal scroll on mobile
- Added `whitespace-nowrap flex-shrink-0` to all 5 tab buttons to prevent wrapping/shrinking
- Fixes: Subscriptions and At-Risk tabs were clipped off-screen on mobile

### app/api/google/publish-workout/route.ts
- **Root cause:** `new Date()` on Vercel (UTC) + `.toISOString()` sent UTC times to Google Calendar, which shifted them +1h when displaying in Europe/Berlin
- **Fix:** Send datetime as timezone-naive strings (e.g., `2026-03-10T17:15:00`) with explicit `timeZone: 'Europe/Berlin'` — Google Calendar handles the offset correctly
- Removed `Date` object construction for start/end times, replaced with string arithmetic
- Ghost event cleanup query changed from precise minute window to full-day query (avoids DST offset issues)

---

## Status
- TypeScript compiles clean
- All 3 fixes ready for commit + push
