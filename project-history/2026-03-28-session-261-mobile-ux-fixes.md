# Session 261 — Mobile UX Fixes (2026-03-28)

**Model:** Claude Opus 4.6
**Duration:** Short session
**Focus:** Mobile UX polish — 3 bug fixes

---

## Changes Made

### 1. High-Res PWA Splash Logo
- **Problem:** PWA manifest only had 192x192 icon — looked blurry on mobile splash screen
- **Fix:** Created 512x512 icon from high-res source (`docs/The Forge Logo transparent 250824.png` — 4466x3742)
- **Files:** `public/icon-512.png` (new), `public/manifest.webmanifest`, `app/page.tsx`
- **Root page** now shows actual logo image instead of just text "The Forge / Functional Fitness"
- **Note:** iOS uses `apple-touch-startup-image` meta tags, not manifest — decided not to add (user OK with going straight to login)

### 2. Calendar Scroll-to-Day
- **Problem:** "Today" button on coach page set the date but didn't scroll to it on mobile. Closing workout modal jumped to top of week.
- **Fix:** Added `data-date` attributes to day cells in CalendarGrid, `scrollIntoView` on Today click, save/restore `window.scrollY` on modal open/close
- **Files:** `app/coach/page.tsx`, `components/coach/CalendarGrid.tsx`

### 3. Notification Banner False Alarm
- **Problem:** "Enable notifications" banner showed every time app opened, even when user was already subscribed
- **Root cause:** `isSubscribed` defaults to `false`, NotificationPrompt rendered before async check completed
- **Fix:**
  - Added `loading` guard to NotificationPrompt — don't render until check completes
  - Added 1.5s retry in usePushNotifications if `getSubscription()` returns null but permission is already granted (handles SW activation race)
- **Files:** `hooks/usePushNotifications.ts`, `components/ui/NotificationPrompt.tsx`

---

## Commits
1. `fix(session-261): high-res PWA splash logo + calendar scroll-to-day`
2. `fix(session-261): retry push subscription check to avoid false banner`
3. `fix(session-261): hide notification banner while subscription check loads`
