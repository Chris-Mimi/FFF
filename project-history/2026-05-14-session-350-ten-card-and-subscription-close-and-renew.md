# Session 350 — Ten-card and Subscription Close & Renew Lifecycle + Coach-side Warning Badges + Chip TZ Fix

**Date:** 2026-05-14 (Opus 4.7)

What started as "I want to close Aline's 10-card today and issue a new one" turned into a full lifecycle feature for both payment systems — archive tables, deferred-save UX, editable historical notes, and a coach-side warning badge on the Session Management modal. Plus a TZ bug fix in the chip that had been mis-rendering for any session that already happened today.

---

## 1. The trigger — Aline's last 10-card session

Aline finished her 10-card today at 10:00. Chris wanted to close out the old card cleanly, start a fresh one, AND keep the old one's history so he could trace back later. Two real-world cases to support:
- Pays-today-uses-today: new card starts today, today's session counts on it
- Pays-today-but-already-used-old-card-today (Aline): new card starts tomorrow, today stays on the old card

## 2. The lifecycle pattern (replicated for subscriptions)

**New tables.** `ten_card_archive` and `subscription_archive`. One row per closed card / sub. Stores frozen end-state (total, used, dates, status, tier, notes) plus a JSONB `bookings_snapshot` for cards. RLS: coach SELECT policy gated by `(auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'`.

**New endpoints** (`requireCoach` + service-role per the S344 rule):
- `POST /api/coach/close-ten-card` — snapshots current state + resets `members.ten_card_*` in one transaction. Accepts optional `newPurchaseDate` / `newExpiryDate` / `newTotal` / `newSessionsUsed` / `newNotes`.
- `POST /api/coach/close-subscription` — same pattern. Accepts `newStatus` / `newStartDate` / `newEndDate` / `newTier` / `newNotes`.
- `GET /api/coach/ten-card-archive?memberId=X` + matching subscription endpoint — list closed entries for one member.
- `PATCH /api/coach/{ten-card,subscription}-archive` — edit/delete a single archive row's notes. Empty notes string = clear.

**Deferred-save UX.** Click "Close & Issue New" (or "Close & Renew") → confirm dialog → form projects the new values for preview + sets `pendingClose=true` (or `pendingSubClose=true`). An amber banner shows "Close pending — not yet saved" with a **Revert** button. Save commits via the API; closing the modal or clicking Revert aborts cleanly.

**Critical bug caught on first Aline test.** First implementation called the API immediately on confirm-dialog OK — Cancel had nothing to roll back because the DB write had already happened. Aline's card got archived even though Chris clicked Cancel. Fix was to move the API call to handleSave, defer all DB writes to the existing Save path.

## 3. Notes — three new columns + editable history

`members.ten_card_notes TEXT`, `members.subscription_notes TEXT`, and existing `*_archive.notes`. Wired through:
- Active card/sub: textarea in modal, persists on Save, empty + Save = clear.
- Close & Issue New / Close & Renew: OLD notes carry into the archive row, NEW notes start blank.
- Archived rows: expand a closed-card/sub row → "Edit" or "Add note" link → inline textarea + Save/Cancel. Saves via PATCH endpoint.

## 4. Coach-side 10-card warning badges (Session Management modal)

[components/coach/BookingListItem.tsx](components/coach/BookingListItem.tsx) + new `tenCardRemaining` field on `Booking` (computed in `useSessionDetails`). Four tiers:

| Remaining | Visual | Badge |
|---|---|---|
| < 0 | Red bg + red border | `⚠ Over by N` |
| 0 | Red bg + red border | `⚠ Card full` |
| 1 | Red bg + red border | `⚠ 1 left` |
| 2 | Amber bg + amber border | `2 left` |

Fires on **confirmed and waitlist** rows (Chris explicitly wanted waitlist too — "it happens more than it should").

**Attribution rule (after one rollback).** First attempt looked at the active card AND fell back to archived cards when the session date was before the active card's purchase_date. That backfired: archive only stores the frozen final count (10/10), so labeling Aline's 10 historical sessions all as "Card full" was misleading. Final rule: badge fires only if `session.date >= active_card.purchase_date`. Sessions on a previous (closed) card show no badge — their history is preserved in the archive list, not surfaced as a per-row badge. For Aline's today-session AFTER she's been migrated to a new card starting tomorrow: no badge today (the today session sits on the closed card; the new card hasn't started).

Shared-card kids inherit the holder's remaining count. Holder lookup via `ten_card_holder_id`.

## 5. Chip past/upcoming TZ fix

[hooks/coach/useMemberData.ts](hooks/coach/useMemberData.ts) lines ~256-308. Was `ws.date >= todayIso` where `todayIso = new Date().toISOString().split('T')[0]` — both pieces are TZ bug classes per claude-rules. A session today at 10:00 stayed classified as "upcoming" until midnight UTC tomorrow.

Fix: use `sessionStartInstant(date, time)` (Berlin TZ-safe helper from `lib/bookingRules.ts`) compared against `Date.now()`. Needed to also extend the bookings query to `select('weekly_sessions!inner(date, time)')` (was date-only).

This was the *original* Aline complaint at the start of the session ("chip shows 9+1/10" when today's session was already done). She has a new card now so the chip naturally reads 0+0/10 for her, but the underlying bug class is fixed for every other athlete.

## 6. UI placement choices

Close & Issue New / Close & Renew at the **top** of their tab (Chris asked) so the lifecycle button is the first thing you see, with the form fields below acting as preview area when pending. Card/Subscription History at the **bottom** as the audit trail.

Notes textarea in the form, right after Sessions Used (cards) or End Date (subs), so it sits with the rest of the card/sub metadata.

## 7. Process moments

- **The misdiagnosis-then-correct pattern (again).** Aline's chip showing wrong twice; her past 10 sessions all labeled "Card full" once; Markus and Anna's badges disappearing after I'd narrowed the attribution rule. Each time, the fix was to step back and re-examine what "this booking is on this card" actually means.
- **The archive-attribution rollback.** Spent time building the archive fallback for past-session attribution, then deleted it after Chris's clarification ("now every one of Aline's past 10 sessions show Card Full"). The right model was simpler than I'd assumed: the badge reflects the athlete's CURRENT card state, and only fires when the booking belongs to that current card. No archive lookup needed.
- **Caught the Cancel-doesn't-cancel bug only because Chris tested.** First implementation looked correct in code review but silently wrote on confirm-dialog OK. The deferred-save fix matched the existing modal pattern but I'd missed it on the first pass.

## Files Modified

| File | Change |
|:---|:---|
| `components/coach/TenCardModal.tsx` | Close & Issue New + Close & Renew flows, deferred save, notes (active + archive editable), Card/Subscription History sections |
| `components/coach/BookingListItem.tsx` | 4-tier 10-card warning badge + red/amber border on confirmed and waitlist rows |
| `hooks/coach/useSessionDetails.ts` | Fetch member 10-card fields + shared holders; compute `tenCardRemaining` per booking gated by active card window |
| `hooks/coach/useMemberData.ts` | Chip past/upcoming uses `sessionStartInstant` (Berlin TZ-safe); fetches `ten_card_notes` + `subscription_notes` |
| `types/member.ts` | Added `ten_card_notes` + `subscription_notes` |
| `app/api/coach/close-ten-card/route.ts` | NEW — archive snapshot + member reset |
| `app/api/coach/close-subscription/route.ts` | NEW — same pattern for subscriptions |
| `app/api/coach/ten-card-archive/route.ts` | NEW — GET (list) + PATCH (note edit) |
| `app/api/coach/subscription-archive/route.ts` | NEW — same pattern |
| `database/20260514_session350_ten_card_archive.sql` | NEW (gitignored) |
| `database/20260514_session350_subscription_archive.sql` | NEW (gitignored) |

## SQL applied manually (gitignored convention)

1. `ten_card_archive` table + RLS
2. `subscription_archive` table + RLS
3. `ALTER TABLE members ADD COLUMN ten_card_notes TEXT`
4. `ALTER TABLE members ADD COLUMN subscription_notes TEXT`
5. Coach SELECT RLS policy on `ten_card_archive` (post-rollback this isn't strictly required anymore — the GET endpoint uses service-role — but doesn't hurt to leave in)

## Commit

Single commit covering all the file changes. SQL migrations applied manually before commit.
