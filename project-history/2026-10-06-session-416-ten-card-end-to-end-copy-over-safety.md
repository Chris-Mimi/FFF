# Session 416 — 10-card end to end, copy-over score safety, notifications (2026-10-05 → 10-06, Opus 5.5)

## Shipped
| Commit | What |
|:---|:---|
| `ab14bf1` `9566836` `f25027a` `fa7a727` `de7a274` | Athlete/parent 10-card chip on Book a Class (`TenCardBalance`, `/api/bookings/ten-card-status`, `lib/tenCardStatus.ts`); German copy; coach-chip format `past+upcoming/total` |
| `4de8183` `20c00ad` `38c42fc` | Buy links → direct Stripe checkout for the card's holder (self or own child); Kids card iff every card user < 18 (guardian-only holder excluded); checkout falls back to parent email |
| `5e93673` | Card size any number 1–50 (was 5/10/20) |
| `bd693fb` | Renewal: no double count; unused sessions → new card size (valid cards only) |
| `b776305` | Window hints + docs: Total Sessions gives, Sessions Used records |
| `d785d53` `5115648` `a4a29fb` | Cancel Session refunds 10-card sessions (Restore re-debits); cancel push only to affected; 1-over booking cap (open waitlist counted); 1-month expiry grace; German confirmations |
| `94cd5e5` | No-show push (German); `sendToUser` redirects family members without devices to the parent |
| `065555b` | Copy-over moves results to the new copy (`/api/sessions/move-results`); 21.09 restore script |
| `b145cfe` `3bcefaf` | `scripts/audit-ten-cards.ts` (+ type fix that unblocked Vercel) |
| `8a9b80b` | Week 40.3 board (`boards/2026-W40-4.json`) |

## 1. Athlete-side 10-card
Gap: athletes/parents could only see their own row via the old banners; kids on a parent's card or a shared card saw nothing. RLS hides another member's row (Torben → Gloria), so the endpoint is service-role and scoped to the logged-in household (`id = user OR primary_member_id = user`). Holder rule mirrors the coach chip: `ten_card_holder_id` wins, else own card if `membership_types` has `ten_card`.
Iterations driven by Chris: segment bar → too big → pill → plain coach-chip format, no icon. Warnings German, approved wording ("Inklusive der bereits gebuchten Sessions wird … voll sein – bitte kaufe eine neue.").
In-app purchase used to buy only for the logged-in member → a parent's Kids-card purchase landed on the parent. Now every buy button posts `memberId = holder`; the existing create-checkout ownership guard already allowed own family members. **Rejected:** "buy and allocate to anyone" — a card bought for a sharer (Viktoria) would create a second, unused card; the button lives on the card that needs renewing.

## 2. Renewal
Markus: card bought 20.05 (start set 18.05) reached 9/10; app purchase 01.07 21:11 overwrote it (pre-S415, no archive) and his 01.07 18:30 class counted on the new card → 11/10. Today's code still double-counted: the archived 01.07 session also fell in the new window (`sessionsUsed = inNewWindow`). Fix: `sessionsUsed = carried.length`, offset absorbs the overlap. Leftover: `slots − consumed`; new size = total + leftover unless the old card is expired (Chris: flexible expiry, long-expired case by case → flagged in the archive note). Known edge: cancelling a future booking that was archived on the old card shows `-1/10` (correct maths, odd display).

## 3. Explaining Sessions Used vs adjustment (communication failure)
I explained the offset with invented terms ("ticked", "written by hand") and wrong mechanisms (claimed saving the window re-breaks Raffael's card — it set offset 4→5 correctly). Chris: "be PRECISE". Rule saved: check the row/code first, use on-screen names. Real facts: modal Save sets `offset = typed − (counter − offset)`; **Recalc and a start-date change reset offset to 0** — so compensation belongs in Total Sessions.

## 4. Booking rules (Chris)
- Full card: may go 1 over, then 402 with German text ("…oder schreib uns, dann schalten wir dich wieder frei"). Coach adds bypass the route. Waitlist joined while full would promote to +2 → open waitlist spots (debit set: holder + ten_card sharers, future dates, service role) count toward the cap.
- Expired: bookable until expiry + 1 month, warning appended; then blocked.
- Cancel Session left `ten_card_consumed = true` (trigger counts by flag, not status) → athletes charged for a cancelled class. Never hit yet (only 01.02 pre-S351). Now cleared; Restore re-debits by effective method.

## 5. Copy-over data loss (21.09)
Chris pasted the same workout over 21.09 17:15/18:30. `handleCopyWOD` finalize → cleanup-results + `wods.delete` → **lift_records cascade on the wod FK**. Restored from `backups/2026-10-04` (newest score 27.09) onto the new wods (identical section ids): 24 WSR + 12 lift records, parity OK. Fix: after the Undo window, move WSR whose base section exists on the copy, merge `publish_sections`, move lift_records/workout_logs only if everything moved; otherwise keep the old wod.

## 6. Notifications
No-show had no push. Added German `notifyNoShow`. Found every kid notification (cancel, removal…) went nowhere — push subscriptions are per login. `sendToUser`: no devices + `family_member` → parent, title prefixed with the child's first name; prefs read for the actual recipient.

## 7. Audit + data
`audit-ten-cards.ts` found 7 pre-start, 6 unflagged, 4 drift, 19 no-start, 2 pay-with. Chris fixed most himself; Emily moved to 11 sessions/offset 0 (her −1 was a paid-trial compensation). Stefanie Neumann: my first "count Sept sessions" advice was wrong — an archived card (25.06–02.10, 10/10) covered them.

## 8. Build lesson
`scripts/` is type-checked by `next build`. `b145cfe` had a type error; two Vercel deploys failed while `npm run build | grep` looked fine. Now: check the exit code.

## Open
Live checks in Next Steps S416; Lenny Kleinert parent-name; German for older pushes (offered).
