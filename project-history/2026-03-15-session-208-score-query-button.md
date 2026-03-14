# Session 208 — Score Query Button + Duplicate Guard UX Fix
**Date:** 2026-03-15
**Model:** Opus 4.6

---

## Accomplishments

### 1. Duplicate Guard UX Fix
- **Problem:** When athlete tries to save a score where coach already entered one, 3 toasts appeared: green "Successfully saved 0 results", blue info message, and red "Failed to save" error.
- **Root cause:** Error thrown in `savingLogic.ts` was caught twice — once in the file itself (showing red toast) and once in the caller. The caller's success path fired because coach-blocked items weren't tracked separately.
- **Fix:**
  - `savingLogic.ts`: Skip `toast.error` for coach-blocked errors (let caller handle).
  - `AthletePageLogbookTab.tsx`: Track `coachBlockedCount` separately. Only show success toast when `savedCount > 0`. Only show error toast when `errorCount > 0`.
- **Result:** Single blue info toast: "Your coach has already recorded your score..."

### 2. Score Query Button
- **Feature:** Athletes can query coach-entered scores they disagree with.
- **Flow:** Button on coach-entered result box → modal with text input → API call → push notification to all coaches.
- **Files created/modified:**
  - `lib/web-push.ts` — Added `sendToCoaches()`: finds coach users via `auth.admin.listUsers()` filtering by `user_metadata.role === 'coach'`, sends push + logs to `notification_log`.
  - `lib/notifications.ts` — Added `notifyScoreQuery()`: fire-and-forget, formats message with athlete name + workout name + query text.
  - `app/api/score-query/route.ts` — New POST endpoint using `requireAuth`, looks up athlete name from `members` table.
  - `components/athlete/AthletePageWorkoutsTab.tsx` — "Query Score" button in mobile expanded view (full-width) and desktop inline view (inside green result box, only for coach-entered). Modal with FocusTrap, textarea, Cancel/Send buttons with loading state.

### 3. Smart Click Testing (Verified by User)
- All smart click behaviors confirmed working on mobile + desktop.

---

## Files Modified
- `utils/logbook/savingLogic.ts` — Coach-blocked error handling
- `components/athlete/AthletePageLogbookTab.tsx` — coachBlockedCount tracking, toast logic
- `lib/web-push.ts` — sendToCoaches function
- `lib/notifications.ts` — notifyScoreQuery function
- `components/athlete/AthletePageWorkoutsTab.tsx` — Query Score button + modal

## Files Created
- `app/api/score-query/route.ts` — Score query API endpoint
