# Session 415 — 10-card overhaul, push leak, Week 40 whiteboard (2026-10-02 → 10-04, Opus 5.5)

## Shipped
| Commit | What |
|:---|:---|
| `a01f158` | Coach-add, waitlist-promote, whiteboard `book:true` set `ten_card_consumed` |
| `8b397f4` | `lib/tenCardRenewal.ts` — overflow carry-over on Close & Issue New + Stripe webhook; "+N over" chip |
| `c8fcfcf` | Auto-recalc when a card's start date is set/changed |
| `f94291c` | Logout detaches the browser's push registration from that account |
| `76b024e` | "Share a card…" between any two members; recount on link/unlink; stale Pay-with cleared on type removal |
| `4d69246` `590cfc0` `bea8cff` | Week 40 boards (`boards/2026-W40*.json`) |

## 1. Aline von Rüden — why her card showed 9/10
Card bought 06.07; 17 in-window bookings; 8 had `ten_card_consumed=false`. Two causes:
- **DB CHECK `ten_card_sessions_used >= 0 AND <= 10`** from `database/add-ten-card-tracking.sql`. The app's design (S347 soft cap, "Over by N" badge) assumed the counter could pass 10 — it never could. Athlete self-bookings past 10 errored inside the trigger, so coaches added them, and…
- **Coach paths never set the flag.** `useBookingManagement.handleManualBooking` inserted without `ten_card_consumed` and bumped the counter by hand; the S351 trigger recomputes from flags, so the bump was overwritten. Same for `promoteWaitlistMembers` and the whiteboard writer's `book:true` (S413 wrongly claimed "the trigger counts it").
Chris ran the SQL dropping the upper bound. Recalc ("Failed to backfill flags") was the same constraint.

Data fixes: Aline (17 → after Chris waived 2 late cancels and removed a 29.07 parallel-session duplicate, 14/10) then renewed: old card archived at 10 (ended 18.08), new card starts 04.09 carrying 4. Jan Huelbig 22.09 flagged (5→6). 9 more undercounted holders flagged after a dry run (all unflagged bookings pre-dated the fix). Skipped: Franziska, Silvia, Emilia, Anna Hohenadl (counter ≥ bookings), Emily Reichle (manual offset).

## 2. Carry-over design
`renewTenCard(db, memberId, {paidOn, …})`: consumed bookings since purchase, sorted; `slots = total − offset`; the rest are carried. Archive gets the first `slots` (sessions_used capped at total, note listing carried dates). New card `purchase_date = first carried date`, `expiry = paidOn + 12 mo`, `offset = sessionsUsed − bookingsInNewWindow` (handles the last old-card session sharing a date with the first carried one → offset −1). Auto note on the new card. The close route has a `preview` mode the modal uses for the confirm text + amber box; the modal only sends `newSessionsUsed` when the coach edits it.
Stripe webhook: existing card + not a sharer → `renewTenCard` (before: reset counter to 0, no archive, overflow lost). Idempotent: Stripe session id stored in the new card's notes, checked first.
**Rejected:** offset-only carry (keeps real payment date) — Recalc resets offset to 0 and would silently drop the carry.

## 3. Gloria Stoffer — chip 0 after entering a card bought 2 days earlier
Bookings made before the card was recorded aren't flagged. Saving a new/changed purchase date now runs Recalc, unless the coach typed Sessions Used by hand.

## 4. Card sharing (Gloria + Torben)
Old toggle only for `family_member` → primary. New `ShareCardPicker` lists active members with a card who aren't sharers themselves (no chains). Link/unlink calls `recalc-ten-card` with new `keepOffset` on old + new holder; the route now always ends with `rpc('recompute_ten_card_for_holder')` (before, Recalc with nothing to flag never recounted). Torben had `primary_payment_method=wellpass` with types `[ten_card]` (invisible: Pay-with row hides below 2 types) — cleared. 5 more mismatches: Athlete Test 1 + Marina (leave), Alois/Magnus/Michael (Chris checking).

## 5. Push leak
Chris got "You're in! Fr 9 Okt 17:15" — Anfisa's booking. One Chrome endpoint was registered to info@, chrishiles777, Anfisa, chiltel, michaelaeder (Chris logged in as them in May). By design (`user_id,endpoint` unique — family phones share a device). Deleted the 4 athlete rows on Chris's endpoints; `signOut()` now posts the endpoint to the existing per-user `/api/notifications/unsubscribe` (2s cap) without unsubscribing the browser. Re-login re-registers via the hook's auto-refresh.

## 6. Week 40 whiteboard (~110 rows)
- 40.1 left: DL 10RM + 13-min AMRAP across 28.09 17:15/18:30 + 29.09 17:15/18:30 (29 names, 1:1). Booked Anfisa, Jana; Chris first guessed 18:30, moved to 17:15 (booking + 2 WSR re-pointed to the 17:15 wod). Magdalena (trial) linked as `is_trial` booking. Paul's self-entered rows updated (24 kg; Snatch 35→910).
- 40.2: Snatch total = Σ reps × kg, weight carries forward (Amelie 510, Lukas 1360); "Sc: Depth" = Sc1. Top block = 30.09 09:30 doing the 23.09 DB Man Maker WOD — Chris re-attached the right workout, then entered.
- 40.1 right: Filthy Fifty / Dirty Thirty 02.10 — track from 30/50 column; TC-N → no time + reps 500−N (`time_with_cap` ranks finishers then reps); DNF → `dnf` + reps to the stop point. Robert = whiteboard-only. Chris correcting the uncertain cells himself.
- Protocol additions: girls-then-boys order, Snatch totals, TC/DNF storage.

## 7. Auto mode
VS Code ext 2.1.281 sends auto-mode actions to a server classifier; allow rules don't apply. Set `claudeCode.initialPermissionMode: "acceptEdits"` in Mac VS Code user settings. Windows PC still to do (reminder in activeContext).

## Open
Live checks in Next Steps S415; Chris's answers on Alois/Magnus/Michael, Marina/Max/Ole, 28.09 10:00 board.
