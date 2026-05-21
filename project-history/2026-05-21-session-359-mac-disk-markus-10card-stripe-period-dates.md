# Session 359 — Mac disk + Markus 10-card rollover + Stripe period dates

**Date:** 2026-05-21 (Opus 4.7) — three threads same day, distinct from S358 morning Anfisa work.

---

## 1. Mac instability investigation (initial diagnosis)

Chris flagged a recurring Mac problem: after hours of work, apps refuse to launch ("not responding"), the logout dialog opens but its password field is unresponsive, switching users → black screen → only recoverable via long power-button hold.

**FUS theory ruled out.** First theory was a Fast User Switching leak in WindowServer / loginwindow. Chris ruled it out: he had worked 4 days continuous with no Mimi login and the problem still occurred.

**Disk pressure investigated.** `df -h` showed the data volume 98% full (885GB of 926GB used, 18GB literal free). Chris's Mac is a MacBook Pro M4, 48GB RAM. Saved hardware specs to memory.

**Real disk hog: Apple Photos Library at 382GB** — sandboxed from `du` (saw only 1.7GB on `~/Pictures`). Only visible via macOS Storage Settings, which Chris read for me. The Mac is signed into Mimi's Apple ID (shares her 2TB iCloud plan); Photos library is purely her iPhone backup. Chris uses a Samsung S22 Ultra synced to OneDrive — completely separate system.

**Two iCloud Photos modes explained:**
- "Download Originals to this Mac" (his current setting) — keeps every original locally
- "Optimize Mac Storage" — keeps full-res in iCloud, only thumbnails + recent locally; downloads on demand

Chris picked Optimize. Notable: the **flag-flip is instant** (Storage Settings jumped to 419GB free via the purgeable pool), but the **physical offload is lazy** — driven by disk pressure + idle + power state, takes hours to days. I had to walk this back after Chris correctly challenged how 30 minutes of flagging could solve a real disk-pressure problem.

**Disk theory eventually pulled back too.** Chris correctly pointed out 48GB free is tight but plenty of Macs run at 95-98% for years without these symptoms. The symptom pattern (app-launch failure + unresponsive auth fields + black screen on switch) is more consistent with **process-spawn exhaustion** — file descriptors, Mach ports, or process slots exhausted by a long-running leaker. My confidence dropped from 80% to ~20% on disk being the cause.

**Capture script created** at `~/mac-incident-data/capture.sh`. Baseline saved at `~/mac-incident-data/baseline-20260521-1248.txt` (40 min uptime, fresh boot). When next incident hits, Chris runs the script from an open Terminal **before** hard restart; we compare. Suspect leakers narrowed to: VS Code + Claude Code, Chrome (multi-profile: Coach + Athlete Test), Synology Drive client. Cline not running.

Memory: [[user-mac-hardware]] + [[project-mac-instability-investigation]].

## 2. Markus Fischer 10-card rollover-debt

Markus's card was full on 18/05 when he attended (soft-cap allows overflow per S347 — hard-block was removed for parents booking kids). Bought a new 10-card via app at **06:46** on 20/05, attended class at **18:30** same day (12-hour gap, not a same-day race). Coach saw `1/10` with `!` warning in the Payment Management modal.

**Diagnosis** via [scripts/check-markus-fischer.ts](scripts/check-markus-fischer.ts):
- New card `ten_card_purchase_date = 2026-05-20`
- 18/05 booking: `ten_card_consumed=true` (counted on old card)
- 20/05 booking: `ten_card_consumed=FALSE` ← bug. Should be true since he paid via 10-card.
- `recompute_ten_card_for_holder` from [database/20260515_session351_ten_card_consumed.sql](database/20260515_session351_ten_card_consumed.sql) filters `weekly_sessions.date >= ten_card_purchase_date` → 18/05 < 20/05, orphaned from new card.

**Fix sequence:**
1. Flipped 20/05 booking's `ten_card_consumed` from false to true via Supabase Table Editor. Trigger fired → counter went to 1.
2. Backdated `ten_card_purchase_date` from `2026-05-20` to `2026-05-18` to bring the overflow into the new card's window. Trigger had to be re-fired manually via Recalc button. Counter went to 2.
3. Chris added a note in `ten_card_notes` documenting the backdate.

**Stripe-safety verification.** Audited all code reading `ten_card_purchase_date`:
- `app/api/stripe/webhook/route.ts` — only WRITES on purchase, never reads back
- `app/api/coach/close-ten-card/route.ts` — internal snapshot
- `useMemberData.ts` / `useSessionDetails.ts` — internal display filtering
- Diagnostic scripts only

Nothing cross-references purchase_date against Stripe payment records. Stripe holds its own charge timestamp. Backdating affects only the local display window. Recipe saved to [[project-ten-card-rollover-debt]].

Magic link generated for Markus — Chris confirmed app shows 8 remaining (= 2 used).

**Open code question:** why did the booking-create API set `ten_card_consumed=false` for the 20/05 session despite Markus having an active 10-card 12 hours prior? Worth investigating in [app/api/bookings/create/route.ts](app/api/bookings/create/route.ts) if it's reproducible — not a same-day race.

## 3. Stripe webhook `current_period_end` bug

**Surfaced via Veronika Ebner** (one of the 5 S345 zombies). Chris reported her Stripe looked fine but local DB might be stale.

Local data showed `period_start = period_end = updated_at = 2026-05-20T04:14:13`. Stripe showed sub active, payment €10 succeeded 20/05 07:14, next invoice 20 Jun.

**Root cause.** Stripe moved `current_period_start/end` from `Subscription` to `SubscriptionItem` in newer API versions. Verified by grepping SDK v20.3.0 types:
```
node_modules/stripe/types/SubscriptionItems.d.ts:53:      current_period_end: number;
```
Not on `Subscriptions.d.ts`. Webhook handler had `const sub = subscription as any; sub.current_period_end` — `as any` hid the missing-property error. Field always undefined → "now" fallback fires for both periodStart and periodEnd → degenerate same-timestamp row written.

**3 spots fixed:**
- `app/api/stripe/webhook/route.ts` `handleSubscriptionUpdate`
- `app/api/stripe/webhook/route.ts` `handleCheckoutCompleted`
- `scripts/sync-subscriptions-from-stripe.ts`

All now read from `subscription.items.data[0].current_period_*` (typed, no `as any`). Comment added at each site referencing S358 (technically S359 but the close was done as S359; comment text was already written).

**Sync run.** Chris created a Stripe restricted live key (Subscriptions: Read only), ran:
```
STRIPE_SECRET_KEY=rk_live_xxx npx tsx scripts/sync-subscriptions-from-stripe.ts
```

**22 of 22 rows in drift.** Two patterns:
- **~30-day drift** (Veronika, Stefan G, Justine, Tobias, Thomas Graf, Kathrin, Zoran, Soledad, Claudia, Athlete Test 1) — the bug
- **1-year drift** (Thomas Spegele) — same bug on yearly billing
- **Seconds-level drift** on the rest — Stripe-side cycle micro-drift, harmless

`--apply` reconciled all 22. Key revoked after.

**Banner correctness.** [components/coach/SubscriptionsDueBanner.tsx](components/coach/SubscriptionsDueBanner.tsx) reads `subscriptions.current_period_end` AND `members.athlete_subscription_end`, both with `.gte(nowIso).lte(sevenIso)` — past dates filtered out. `autoExpireSubscriptions` at [useMemberData.ts:438](hooks/coach/useMemberData.ts#L438) skips members with active Stripe subs. So fixing the `subscriptions` table alone is enough; stale `members.athlete_subscription_end` values are harmless.

Lesson saved to [[feedback-stripe-as-any-smell]].

## 4. Side work

- **Audit scripts run from Calendar reminder** (note had two commands run-together as one line — error message was the giveaway). Both clean: `audit-sibling-wods.ts` → 7 clusters, 0 stale. `cleanup-orphan-wods.ts` → 0 orphans.
- **Veronika magic link** generated and used by Chris.
- **Wellpass clarification.** I conflated `subscription_tier=wellpass` with "correctly paying" — Chris corrected. Wellpass is just a label/differentiator in both DB and Stripe; billing happens externally via the gym's B2B Wellpass arrangement. Memory: [[project-wellpass-is-a-label-not-payment]].

## 5. Security catch

Chris pasted his full Stripe live restricted key into `Chris Notes/AA frequently used files/Notes for next session.md` (so he could remember the command). Caught before commit. Key was revoked immediately; fresh key used for the `--apply` run; revoked after. Rule reinforced in [[feedback-stripe-as-any-smell]]: paste live keys directly into the terminal prompt, never into a file or chat first.

---

## Files changed

| File | Change |
|:---|:---|
| `app/api/stripe/webhook/route.ts` | Two spots fixed — read period dates from SubscriptionItem |
| `scripts/sync-subscriptions-from-stripe.ts` | Same fix |
| `scripts/check-markus-fischer.ts` (new) | Diagnostic |
| `scripts/check-veronika-ebner.ts` (new) | Diagnostic |

## DB Changes (data, not schema)

| Action | Rows | Tables |
|:---|---:|:---|
| UPDATE bookings.ten_card_consumed false→true (Markus 20/05) | 1 | `bookings` |
| UPDATE members.ten_card_purchase_date 20/05→18/05 (Markus) | 1 | `members` |
| UPDATE subscriptions.current_period_end (sync from Stripe) | 22 | `subscriptions` |

## Open questions for next session

1. **S358 Phase-2 rollback** — still pending decision on the 13 WSR re-attributions.
2. **Mac instability** — wait for next incident, run capture script, then compare against baseline.
3. **Booking-create `ten_card_consumed=false` edge case** — why did Markus's 20/05 booking get the flag wrong despite a clean 12-hour gap from card purchase? Investigate if reproducible.

## Carry-overs

Unchanged from S358 except those marked ✅ above. See activeContext for the full carry-over list.
