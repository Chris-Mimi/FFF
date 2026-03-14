# Session 209 — Debug Cleanup (2026-03-15)

**Model:** Claude Opus 4.6

## Accomplishments

1. **Removed debug code from score-query API** — Removed debug array, `listUsers` call, `push_subscriptions` query, and `debug` field from response in `app/api/score-query/route.ts` (-20 lines).
2. **Removed debug toast from athlete workouts tab** — Removed temporary debug toast and unused `data` variable in `components/athlete/AthletePageWorkoutsTab.tsx` (-5 lines).
3. **Committed and pushed** — Vercel auto-redeploy triggered.

## Issue Discovered

**Coach push notifications not working:**
- Bell icon appears on coach app (browser `pushManager` has subscription)
- But `push_subscriptions` DB table has 0 rows for coach users
- "Send test" returns `NO_SUBSCRIPTIONS`
- Root cause: `usePushNotifications.ts` line 72-78 auto-refresh POST to `/api/notifications/subscribe` fails silently (`.catch(() => {})`)
- The browser thinks it's subscribed but the server has no record

**Decision pending for next session:**
- (A) Remove `NotificationPrompt` from coach entirely — low-value feature
- (B) Debug the subscribe endpoint failure in Vercel logs

## Files Changed
- `app/api/score-query/route.ts` — removed debug tracing
- `components/athlete/AthletePageWorkoutsTab.tsx` — removed debug toast + unused variable
- `memory-bank/memory-bank-activeContext.md` — updated
