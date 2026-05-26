# Session 367 — Mac instability root-caused (Cloud Station Drive 7.0.1) + Stripe subscription UX overhaul

**Date:** 2026-05-26 (Opus 4.7) — 3 work commits + close.

---

## 1. Mac instability investigation — root cause identified

**Symptom (this morning):** Chris opened VS Code, app bounced in dock then refused to launch. To verify Mimi wasn't logged in, he clicked the user-switch icon and selected Mimi — instant black screen, mouse cursor only, hard restart required (Ctrl+Cmd+Power held). Capture script was NOT run before restart.

**Recovery from logs (`log show` post-reboot):**
- `~/mac-incident-data/incident-20260526-1033-errors.txt` — 315k error/fault entries in the 13-min window before restart
- `ecosystemanalyticsd` 107k errors, `ecosystemd` 40k, `runningboardd` 13k, `WindowServer` 3k
- Smoking gun: `RosettaCoordinator: getCodeSignatureInfo: SecStaticCodeCreate Failed` + `no containing bundle for: <private>`
- `runningboardd` errors (`memorystatus_control: Invalid argument`, `Kernel call to get coalition roles for PID X failed: errno 2`) directly explained VS Code's bounce-and-disappear (kernel couldn't hand new processes to runningboardd cleanly)
- `WindowServer` errors (`_CGXPackagesSetWindowConstraints: Invalid window`) explained the user-switch black screen (window tree corrupt, couldn't reparent for session swap)

**Unredact attempt + live storm:** installed `Enable-Private-Data.mobileconfig` profile. Storm restarted immediately on fresh boot (load 4 → 9 → 13 within 30 min), now from PID 520. Logs revealed `responsiblePath: /Users/chrishiles/.SynologyDrive/SynologyDrive.app/Contents/MacOS/cloud-drive-ui` repeatedly invoking `osascript` — each invocation triggered RosettaCoordinator which then tried to ask `com.apple.bird` (iCloud Drive daemon) whether the file is in an iCloud container. The bird XPC lookup failed with `xpc_error 159: Unknown error 159` ("no such bootstrap service") on every call — infinite retry loop.

**Final identification:** `codesign -dvv /Applications/Synology\ Drive\ Client.app`:
- `Identifier=com.synology.CloudStation` — legacy bundle ID (Synology renamed product line in 2019, kept old ID)
- `Mach-O thin (x86_64)` — Intel-only, runs through Rosetta on M4
- Code-signed 2021-06-23 — Apple Developer ID cert ~5-year validity → expired around now
- File modified 2021-08-10 — never updated in nearly 5 years

The installed app is the **discontinued Cloud Station Drive 7.0.1**, masquerading under the "Synology Drive Client" display name from the rebrand transition. The actual current Synology Drive Client is at 4.0.3-17892 (released 2026-05-12) — entirely separate product line that was never installed on this Mac.

**Symptoms that resolved when `cloud-drive-eventd` + `FinderSync` were force-killed (sudo killall):** Load average dropped 13 → 4.7 within 2 minutes. ecosystemanalyticsd error rate from 450/sec → 0. Confirms Synology Drive was the trigger.

**SIP gotcha:** `sudo killall ecosystemanalyticsd` returned silently (no error) but the process kept running. Modern macOS SIP protects core system daemons from killall even as root. `launchctl kickstart -k system/com.apple.ecosystemanalyticsd` failed with `150: Operation not permitted while System Integrity Protection is engaged` — same protection class. The fix is to stop the trigger source (Synology), not to restart the victim daemon.

**Next-session plan (left for tomorrow because Chris's NAS DSM update was running):** install Synology Drive Client 4.0.3-17892, retire the legacy Cloud Station Drive, verify no error storm on fresh boot.

**Capture script + memory updated:** `~/mac-incident-data/capture.sh` now also dumps per-process error tallies + ecosystem* + runningboardd + WindowServer error samples for the last 30 min. The "leaked fd / Mach port" theory from S358 was wrong — signal lives in the log subsystem, not in resource counters. Project memory `project_mac_instability_investigation.md` rewritten with confirmed signature + 2026-05-26 timeline.

---

## 2. Subscriptions Due banner — show lapsed for 14 days post-due

**Why:** Chris's pain — Sandra Lederle (Stripe monthly) cancelled her trial; the banner showed her as "due today" then she disappeared the moment her period ended. No way to tell from the app whether she renewed or actively cancelled. He'd been opening Stripe manually for each one.

**Shipped:** [components/coach/SubscriptionsDueBanner.tsx](components/coach/SubscriptionsDueBanner.tsx) extended.
- New `LAPSED_STRIPE_STATUSES = ['cancelled', 'past_due', 'unpaid', 'incomplete_expired']`
- Lapsed Stripe query: `current_period_end` in (now − 14d, now), status in lapsed set → red row, "Cancelled · monthly" or "Payment failed · monthly" badge
- Lapsed cash query: `athlete_subscription_end` in (now − 14d, now), status in (active/trial/expired/past_due) → red row with same Renew 1 Month / 1 Year buttons inline
- `daysLeft` is now signed (negative = days since lapsed); sort puts lapsed first, most-recent first
- Header shows "Subscriptions Due (N, M lapsed)" when any are lapsed

**Discussed and rejected:**
- *Adding archive-on-renew to Stripe webhook* (would let us show "Renewed" confirmation for Stripe too) — touches billing webhook code which is the fragile zone per S345/S358 history. Deferred.
- *Linking each Stripe-lapsed row to the Stripe customer page* — Chris said he already has Stripe open while working, link wouldn't add value.

Commit `5a3e50b`.

---

## 3. Banner false positives — Stripe-active members showing as cash-lapsed

**Surfaced first deploy:** Chris reported 5+ phantom red rows for Veronika Ebner, Kathrin Mühlen, Justine Baumstark, Stefan G, Thomas Graf. All monthly Stripe payers with active subs.

**Diagnosis (`scripts/debug-banner-lapsed.ts`):** every phantom had:
- Active Stripe sub renewing 25-30 days out (e.g. Justine's renewed on 2026-05-16, next charge 2026-06-16)
- `members.athlete_subscription_end` frozen at the trial-end date (2026-05-16) since signup

The Stripe webhook updates `subscriptions.current_period_end` on every renewal but **does not touch `members.athlete_subscription_end`** — so the members-table column is months stale for any Stripe-paying athlete. The cash-lapsed query naively read it.

**Fix:** dedupe cash-lapsed/upcoming against ALL members with ANY Stripe sub row, not just those in the current banner window. Added a third small query at the top of `fetchDueRows` (`select member_id from subscriptions`) producing `anyStripeMemberIds`, swapped both cash filters from `!stripeMemberIds.has(m.id)` (limited) to `!anyStripeMemberIds.has(m.id)` (everyone with a Stripe row).

After fix: banner shows 3 Stripe-lapsed (Tobias Baumstark, Zoran Vrbanic, Sandra Lederle) + 1 cash-lapsed (Lisa Vrbanic, status `expired`, no Stripe sub). 5+ phantoms gone, including aged-out Athlete Test 1.

Commit `073e41e`.

---

## 4. Coach member card — "Actively cancelled" display

**Why:** Same Sandra trigger. Her coach-side card needed to call out the cancellation clearly, with a date stamp Chris could act on.

**Shipped:** [components/coach/athletes/PaymentsSection.tsx](components/coach/athletes/PaymentsSection.tsx) (later moved — see §6):
- Added `updated_at` to the Subscription type + select
- Cancelled subs: red border, "Actively cancelled" badge in red, subtitle "Cancelled May 26, 2026 · today" (uses `cancelledDaysAgo` computed from `updated_at`)
- `past_due`/`unpaid` get "Payment failed — check Stripe"
- `cancel_at_period_end=true` (scheduled) stays amber as before

Differentiation between "scheduled cancellation that completed" vs "actively cancelled mid-period" wasn't possible from data alone (both end up status='cancelled' with `cancel_at_period_end` reset). Acceptable — labelling everything cancelled as "Actively cancelled" gives the visual warning Chris needs.

Commit `5a3e50b` (same as §2).

---

## 5. Athlete-app trial gate — one trial per member, server enforced

**Why:** Sandra cancelled her trial; if she signed up again under the same email, the existing client-side check (`!hasActiveSubscription && !hasTrial`) would let her get **another** 30-day free trial because her status was now `'expired'`, not active and not trialing.

**Shipped:**
- **Server ([app/api/stripe/create-checkout/route.ts](app/api/stripe/create-checkout/route.ts)):** source of truth. SELECT now includes `athlete_subscription_start`. If `start != null` (any prior subscription, Stripe or cash), the `trial: true` flag from the client is silently ignored. Logs the denial for visibility.
- **Client ([components/athlete/AthletePagePaymentTab.tsx](components/athlete/AthletePagePaymentTab.tsx)):** matches. New `hasUsedTrial` derived from `athlete_subscription_start`. New `isTrialEligible = !hasActiveSubscription && !hasTrial && !hasUsedTrial`. UI changes: the "1 month free" badges + "Start Free Trial" button labels are gated on `isTrialEligible`. Repeat customers see "Subscribe" instead.

**Verified via magic link:** Chris opened the impersonation link in Incognito → Sandra's pricing page showed no "1 month free" badge, monthly button said "Subscribe" (not "Start Free Trial"). Confirmed.

Commit `5a3e50b`.

---

## 6. Athletes/Pay tab → Members modal migration

**Why:** Chris's UX complaint — the Athletes page is per-athlete training data (lifts, benchmarks, log). Payment info living there meant he had to exit Members to check Stripe state. He wanted everything subscription-related in one place: the Members modal.

**Shipped:**
- New shared component [components/coach/members/StripeSubscriptionsPanel.tsx](components/coach/members/StripeSubscriptionsPanel.tsx): extracted the Stripe-subs display from PaymentsSection. Self-contained — queries `subscriptions` by `member_id` and derives `stripe_customer_id` from the rows it fetches.
- TenCardModal subscription tab: panel embedded at top, above the coach-managed status controls. Sandra-class members now show Stripe state + coach-managed state in one place.
- Athletes page: 'payments' removed from tab union, button + content branch deleted. Tabs are now Benchmarks / Lifts / Log only.
- `components/coach/athletes/PaymentsSection.tsx` deleted (no remaining references).

Commit `6909a8d`.

---

## 7. Open data-quality issue (flagged, not fixed)

**`members.athlete_subscription_end` goes stale for Stripe-paying members.** Stripe webhook updates `subscriptions.current_period_end` on every renewal but doesn't sync the corresponding column on `members`. So:
- Athlete-side payment status shows "Active — Wellpass (monthly), ends [stale date]" — the date is wrong (usually 1 month behind for monthly subscribers)
- Banner cash-lapsed query has to use the new `anyStripeMemberIds` dedupe to avoid false positives

**Fix paths (deferred):**
1. Teach the Stripe webhook to also sync `members.athlete_subscription_end` on every `customer.subscription.updated` event
2. Or stop reading `athlete_subscription_end` for Stripe-paying members anywhere, deriving the display from `subscriptions.current_period_end` instead

Either is non-trivial. The webhook is in the fragile zone (S345/S358 incident history). Worth a separate session.

---

## 8. Auxiliary

- **`Enable-Private-Data.mobileconfig`** installed on Mac. Toggles macOS log redaction of `<private>` placeholders. Apple-published debug profile; one-click removal via System Settings → Profiles when done.
- **Magic links generated:** `sandralederle@gmx.de` (verified the trial-gate fix from the athlete side).
- **New diagnostic scripts:** `scripts/inspect-member.ts` (dumps member row + subscriptions + archive for an email), `scripts/debug-banner-lapsed.ts` (replays banner queries with cross-checks).

---

## 9. Commits

1. `5a3e50b` — `feat(session-367): surface lapsed subs + actively-cancelled status + gate repeat trials`
2. `073e41e` — `fix(session-367): banner dedupes cash-lapsed against ALL Stripe sub members`
3. `6909a8d` — `refactor(session-367): move Stripe subscription UI from Athletes/Pay tab into Members modal`
4. Close-session commit (this file + activeContext + Notes sync).
