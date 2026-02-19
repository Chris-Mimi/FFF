# Session 138 — Push Notification Fix + TV Display Planning

**Date:** 2026-02-18
**Model:** Opus 4.6
**Status:** Push fix COMPLETE, TV display feature PLANNING

---

## Push Notification Stale FCM Fix

### Problem
Push notifications not delivering on Mimi profile (FCM returns 201 but Chrome never shows notification). Same issue as Session 132.

### Diagnostic Approach
1. Built `/api/notifications/test` with full diagnostics — returns VAPID config, subscription count, and per-subscription FCM response
2. Confirmed: VAPID configured, 1 subscription found, FCM returned HTTP 201
3. Diagnosis: stale Chrome FCM persistent connection (identical to Session 132)

### Fix Applied
- `public/sw.js` — `pushsubscriptionchange` handler now auto-re-subscribes (was no-op)
- `hooks/usePushNotifications.ts` — auto-refresh: re-POSTs current subscription to server on every page load
- `app/api/notifications/test/route.ts` — NEW diagnostic endpoint
- `components/ui/NotificationPrompt.tsx` — "Send test" button + "Disable" button side by side, console diagnostics

### How to Fix (Step-by-Step)

**When push notifications stop delivering (FCM 201 but no Chrome notification):**

1. Open Chrome DevTools on the app (F12)
2. Go to **Application** tab → **Service Workers** in left sidebar
3. Click **Unregister** on the existing service worker
4. **Quit Chrome completely** (Cmd+Q on Mac, not just close the tab)
5. Reopen Chrome and navigate back to the app
6. The app will auto-register a fresh SW and create a new FCM subscription
7. Test: publish a workout or use the "Send test" button in the notification prompt

**Why this happens:** Chrome's persistent FCM connection goes stale. The server sends successfully (201) but Chrome's push channel is dead. This is a **localhost/dev environment issue** — after deployment on a real HTTPS domain, Chrome maintains FCM connections much more reliably.

### Resolution
User unregistered SW at `chrome://serviceworker-internals/`, restarted Chrome, re-subscribed. Notifications now working.

### Files Changed
| File | Change |
|------|--------|
| `public/sw.js` | pushsubscriptionchange auto-re-subscribe |
| `hooks/usePushNotifications.ts` | Auto-refresh subscription on mount |
| `app/api/notifications/test/route.ts` | NEW — diagnostic test endpoint |
| `components/ui/NotificationPrompt.tsx` | Send test + Disable buttons |
| `memory-bank/memory-bank-activeContext.md` | Updated to v23 |
| `Chris Notes/session-103-code-review-findings.md` | Ticked #4 intent notes |

---

## TV Display Page (Planning)

Feature request: Coach clicks a chip on a workout card → opens a full-page display optimized for a large TV screen showing workout sections. Replaces current Google Calendar scroll workflow.
