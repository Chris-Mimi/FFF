# Session 292 — Coach Push Notification on New Member Registration + Mac Push Diagnostic

**Date:** 2026-04-19
**Model:** Opus 4.7

---

## Context

Main booking day of the week. Athletes had started registering for Chris's newly launched athlete app, but Chris was not receiving any notification — he had to keep manually checking `/coach/members` to approve them. Over half the gym still hadn't registered, so responsiveness mattered.

## What shipped — commit `782d8ad`

### Root cause

`app/api/members/register/route.ts:148-149` had an open `TODO: Create in-app notification for coaches about new pending member` from Phase 3. Every other coach-only push path (score query, payment failed, subscription expiring) was wired via `sendToCoaches()` in `lib/web-push.ts` — registration just never was.

### Fix

1. Added `notifyNewMemberRegistered(memberName, memberEmail)` to `lib/notifications.ts`. Follows existing pattern: fire-and-forget, `sendToCoaches` with type `new_registration`, URL `/coach/members`. Title "New Member Registration", body `{name} ({email}) is awaiting approval`.
2. Imported into `app/api/members/register/route.ts` and called at the TODO site with `memberData.name`/`memberData.email`.

TypeScript clean. Deployed to Vercel.

## Mac push diagnostic — not fixed

Chris clicked "Send test" from the notification bell and got nothing on his Macbook (Android works fine). Full diagnostic path:

1. **DB check** — `/api/notifications/test` response showed 4 `push_subscriptions` rows for `user_id=fc32bb41-8821-4efd-af28-8d3e2f60578d`. One returned 410 (`push subscription has unsubscribed or expired`), three returned 201. Backend was sending fine; FCM was accepting.
2. **Cleanup** — deleted all 4 rows in Supabase. Disable → Enable on both Mac + Android via the bell UI rebuilt 2 fresh rows. Send Test now returned 2×201, phone still received, Mac still silent.
3. **SW isolation tests:**
   - Direct `showNotification` from DevTools Console → works on Mac ✅
   - DevTools → Application → Service Workers → **Push** button with manual payload → works on Mac ✅
   - SW status "activated and is running" ✅
   - Console silent when Send Test clicked (no push event fires) ❌
4. **Authoritative source** — `chrome://gcm-internals/` → Connection State: **"Connecting"** (stuck, never reaches CONNECTED). No row appeared in "Receive Message Log" when Send Test was clicked.

**Conclusion:** Chrome on Mac cannot establish its persistent connection to `mtalk.google.com:5228` (the GCM XMPP port). Until that flips to CONNECTED, no FCM push will ever arrive on Mac — regardless of DB state, VAPID config, or SW health.

**Related:** Chris reports recurring Chrome-hang issue on Mac (see next section) — Chrome in a half-dead state cannot complete the FCM handshake, so this diagnostic is likely a downstream symptom.

## Minor bug found — deferred

`app/api/notifications/test/route.ts` calls `webpush.sendNotification` **directly** (not via `sendToSubscription` in `lib/web-push.ts`), so the 410/404 auto-cleanup that real notification flows perform does not run for the Send Test endpoint. This is why the 410 row from step 1 above persisted even after being hit. Low priority — production flows do clean up 410s via `sendToSubscription`.

## Outstanding issue documented — Mac Chrome hang (recurring)

Chris reports: after a period of working, Mac apps bounce in the dock but won't launch, showing *"You can't open the application 'Google Chrome' because it is not responding."* Only a full Mac restart fixes it. Happens increasingly often.

This is a macOS/hardware issue, not a Forge code issue, but it directly explains why Mac push is unreliable (stuck GCM "Connecting" state = Chrome process in a half-dead state). Not investigated this session — Chris wants to address in a dedicated session.

**Diagnostic starting points for next session:**
- Activity Monitor → Memory Pressure graph while working
- Disk usage (<10% free causes swap failures)
- Chrome Helper processes leaking memory (sort by Memory in Activity Monitor)
- Chrome + macOS update status
- `~/Library/Logs/DiagnosticReports/` for hang/spindump reports

## Today's operational workaround

Rely on Android for coach notifications — it's already reliable. Mac push will only work when Chrome is healthy AND the tab is loaded. Pinning the tab + excluding from Memory Saver (`chrome://settings/performance`) helps, but won't overcome the deeper macOS hang issue.

## Carryover — still open

- **Mac Chrome recurring hang** — dedicated session needed (system-level, not app code).
- **Test endpoint doesn't cleanup 410s** — `app/api/notifications/test/route.ts` should route through `sendToSubscription` instead of `webpush.sendNotification` directly.
- **Athlete subscription bug** — Stefan Glocker DB row fix + investigate webhook ordering + `autoExpireSubscriptions` vs trialing (from activeContext).
- **Whiteboard duplicate entries** — uncommitted S251 changes still pending review.
- **Score-entry API filter** (deferred S289) — `app/api/score-entry/[sessionId]/route.ts:48-56` only checks `bookings.status`, ignores `members.status`.

## Lessons

- **Coach-only push wiring is a one-liner** once `sendToCoaches` exists — the hardest part of "why didn't I get a notification" was *we never wrote the code*, not infrastructure. Grep for `TODO` in notification-adjacent paths before any future deploy of notification features.
- **`chrome://gcm-internals/` is the authoritative source** for FCM push failures. Connection State + Receive Message Log beats VAPID / subscription / SW hypothesis chasing. Use it first next time.
- **FCM 201 really ≠ delivered** (confirmed again, now with direct evidence — accepted by Google but Chrome never received). MEMORY.md note on this stays relevant.
- **Diagnostic pyramid for push:** DB sub count → FCM status code → `gcm-internals` Connection State → SW status → Console errors → direct `showNotification` test → DevTools manual Push. Each layer isolates one link.
