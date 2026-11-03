# Session 431 — Kids-only booking, full 10-card blocked in release window (2026-11-03, Opus 5.5, Mac)

## Shipped
| Commit | What |
|:---|:---|
| `81cfae0` | Kids never need Foundations clearance (first version, under 18) |
| `aa059bd` | Kids book kids classes only (server 403 + booking-page lock) |
| `d72a67a` | Kid threshold 18 → 16 (`isKidAge`) |
| `79b31e3` | Full 10-card can't book anything in the Sunday release window |
| `95475a2` | "No more bookings" note moved to the last-session message |

Session start: no leftover `claude/*` branches, local = origin.

## 1. Kids and Foundations / kids-only booking
- Chris: "Foundations clearance is not necessary for kids." Kids *classes* were already skipped in S430, but a kid booking an adult class went through the clearance check, and new kids would have shown the Members chip.
- First fix: under-18 counted as cleared everywhere. Chris: "They also shouldn't be able to book any class" → kids book **kids classes only**; anything else via a coach booking ("my son Neo was booked into yesterday's WOD").
- Then Chris: "Make it under 16" — matches the Members page Kids filter. 16–17 follow adult rules (Foundations clearance, adult classes).
- Implementation:
  - `lib/bookingRules.ts`: `isKidAge(dob)` (<16) alongside `isMinor` (<18), both on a shared `isUnderAge`. `getClearedMemberIds` adds kids.
  - `/api/bookings/create`: non-kids class + `isKidAge` → 403 "Kinder/Jugendliche können nur Kinderklassen buchen – für andere Klassen bitte mit Chris oder Mimi sprechen." Placed before the Foundations check.
  - `/member/book`: lock "Nur Kinderklassen – …" for the selected profile.
  - `/api/coach/foundations` + `MemberCard`: kids left out, no chip/link.
- `isMinor` (<18) still governs the S414 rule: a teen with their own login may book kids classes under their own name.
- Data at the time: only Magdalena + Lena Rothe (signed up 31.10) uncleared; all 86 family members have a DOB.

## 2. Full 10-card in the Sunday release window
- Chris: athletes whose 10-cards are full must not book anything in the Sunday opening window; message = buy a card or contact Chris or Mimi.
- Window = release day (`next_week_release_day_of_week`) from `next_week_release_time` to midnight. **Chris's setting is 15:00** — I first quoted the code default 14:00; the code reads the setting.
- Full = `tenCardRemaining − openWaitlist ≤ 0` (waitlist spots count, same as the existing over-limit check). `openWaitlist` hoisted out of the 10-card block; `berlinWallClock` now returns `minute`.
- Blocks all classes in that window, current week included. One-over allowance unchanged the rest of the week. Coach bookings bypass.
- Error shows as toast (402 path in `handleBook`). No booking-page lock — server-only.

## 3. 10-card message wording
- Chris: the over-1 message "Weitere Buchungen sind erst mit einer neuen 10er-Karte möglich" made the overbooked session look allowed without a card; that note belongs on the last session.
- Last session: "🎫 Session gebucht – das war die letzte Session auf deiner 10er-Karte! Weitere Buchungen sind erst mit einer neuen 10er-Karte möglich."
- Over 1: "⚠️ Session gebucht – deine 10er-Karte ist jetzt um 1 Session überzogen. Bitte kaufe eine neue 10er-Karte in der App – oder sprich mit Chris oder Mimi."
- The one-over grace is now silent (not announced in advance).
- Open: the two older refused messages still say "schreib uns, dann schalten wir dich wieder frei" — offered to align, no answer.

## Lessons
- **Quote the live setting, not the code default** (release time 15:00 vs DEFAULT 14:00).
- **"Kid" has two ages in this app:** `isKidAge` <16 for booking restrictions + Foundations; `isMinor` <18 for self-booking kids classes. Don't merge them.
