# Sessions 130-132 — Push Notifications (Phases 1a + 1b + Bug Fix)

**Date:** 2026-02-16 to 2026-02-17
**Model:** Opus 4.6
**Status:** Phase 1a + 1b COMPLETE and WORKING

---

## What Was Done

Implemented the full infrastructure layer (Phase 1a) for Web Push Notifications — Feature #3 from Session 103 competitor analysis (High effort, Very High impact).

**Approach:** Web Push API with VAPID keys (browser-native, no Firebase/FCM). Zero external service dependencies.

### New Files Created (10)

| File | Purpose |
|------|---------|
| `database/supabase-push-notifications-schema.sql` | 3 tables: push_subscriptions, notification_preferences, notification_log — all with RLS |
| `public/sw.js` | Service worker — push event handler + notification click → opens target URL |
| `public/manifest.webmanifest` | PWA manifest (required for iOS Add to Home Screen push support) |
| `public/icon-192.png` | 192x192 notification icon (resized from Forge FB profile logo) |
| `lib/web-push.ts` | Server-side: `sendToUser()`, `sendToAllMembers()` with auto-cleanup of expired subs |
| `hooks/usePushNotifications.ts` | Client hook: subscribe/unsubscribe/preferences management |
| `app/api/notifications/subscribe/route.ts` | POST — upsert push subscription + create default preferences |
| `app/api/notifications/unsubscribe/route.ts` | POST — delete subscription by endpoint |
| `app/api/notifications/preferences/route.ts` | GET/PUT — read/update per-type notification preferences |
| `components/ui/NotificationPrompt.tsx` | Bell icon + opt-in banner + preferences dropdown with toggles |
| `components/ServiceWorkerRegistrar.tsx` | Client component that registers SW on mount |

### Files Modified (2)

| File | Change |
|------|--------|
| `app/layout.tsx` | Added manifest link to metadata + ServiceWorkerRegistrar component |
| `next.config.ts` | Added Service-Worker-Allowed header + no-cache for /sw.js |

### Database Migration (SQL executed in Supabase)

3 new tables with RLS:
- **push_subscriptions** — endpoint, p256dh, auth per user per device (UNIQUE endpoint)
- **notification_preferences** — 5 boolean toggles per user (all default true)
- **notification_log** — sent notification history for in-app display

### Prerequisites Completed

1. `npm install web-push @types/web-push` — installed
2. VAPID keys generated and added to `.env.local`
3. Icon created from existing logo at `public/icon-192.png`
4. SQL migration run in Supabase

---

## Detailed Plan for Remaining Phases

Full plan saved at: `.claude/plans/sunny-inventing-widget.md`

### Phase 1b: WOD Published Notifications (~1 session)
- Create `lib/notifications.ts` with `notifyWodPublished()`
- Modify `app/api/google/publish-workout/route.ts` — fire-and-forget notification after line 395
- Broadcast to all active subscribed members
- Notification: "New WOD: {name}" → clicks to `/member/book`

### Phase 1c: Booking Notifications (~1 session)
- Add `notifyBookingConfirmed()`, `notifyBookingWaitlisted()`, `notifyWaitlistPromoted()` to `lib/notifications.ts`
- Modify `app/api/bookings/create/route.ts` — after line 179 (replaces TODO at line 208)
- Modify `app/api/bookings/cancel/route.ts` — replaces TODO at line 201

### Phase 1d: PR Notifications (~1-2 sessions)
- Create `app/api/lift-records/route.ts` (new API route with PR detection)
- Add PR detection to `app/api/benchmark-results/route.ts`
- Migrate `components/athlete/AthletePageLiftsTab.tsx` from direct Supabase insert to API route
- PR logic: compare new value vs previous best per lift/benchmark type

### Key Design Decisions
- **Fire-and-forget** — notifications never block API responses
- **Auto-cleanup** — expired subs (HTTP 410) auto-deleted
- **Multi-device** — one user can subscribe from multiple browsers
- **Preferences respected** — sendToUser/sendToAllMembers check opt-out before sending

---

## Session 131 — Phase 1b Implementation

- Fixed middleware — added `.webmanifest` to excluded extensions so manifest loads correctly
- Added NotificationPrompt (bell icon) to athlete page and member/book page headers
- Created `lib/notifications.ts` — all 5 notification functions (wod_published, booking_confirmed, booking_waitlisted, waitlist_promoted, pr_achieved)
- Hooked `notifyWodPublished()` into `app/api/google/publish-workout/route.ts` (fire-and-forget)
- Created temporary test route for debugging

### Files Changed (Session 131)
| File | Change |
|------|--------|
| `middleware.ts` | Added webmanifest to matcher exclusion |
| `app/member/book/page.tsx` | Added NotificationPrompt component |
| `app/athlete/page.tsx` | Added NotificationPrompt component |
| `lib/notifications.ts` | NEW — all 5 notification functions |
| `lib/web-push.ts` | Debug logging added (later removed) |
| `app/api/google/publish-workout/route.ts` | Added notifyWodPublished call |

---

## Session 132 — FCM Delivery Bug Fix

### Bug: FCM returns 201 but notification never displays
- **Symptom:** web-push library sends to FCM → 201 accepted, but browser SW never receives push event
- **DevTools Push button worked** (sends directly to SW, bypasses FCM)
- **Root cause:** Chrome's persistent connection to FCM push servers was stale/broken
- **Fix:** Chrome update/restart reset the FCM connection — all queued notifications delivered immediately

### Debugging approach that worked:
1. Added fallback handling in SW for null `event.data` (prevents silent drops)
2. Built diagnostic endpoint comparing browser subscription keys vs DB keys
3. Discovered browser subscription was `null` while DB had stale entry
4. Clean-slate reset: unsubscribe browser + delete DB + fresh subscribe
5. Still didn't work → Chrome update/restart fixed FCM connection

### Cleanup (Session 132):
- Removed all `[PUSH DEBUG]` console.logs from `lib/web-push.ts`
- Removed debug logs from `public/sw.js` (kept null-data fallback — production improvement)
- Deleted temporary test route `app/api/notifications/test/`

---

## Next Session

1. **Phase 1c** — Booking notifications (hook into booking create/cancel routes, 3 files)
2. **Phase 1d** — PR notifications (new lift-records API route + 3 modified files)
