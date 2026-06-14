# Session 379 — Mobile UX fixes + Wellpass blocked-tier booking + kids-class child-only booking

**Date:** 2026-06-12 → 2026-06-14 · **Model:** Opus 4.8 · **Commits:** 9 (pushed to `main`)

Driven by Chris testing the app on mobile (and Mimi reporting iPhone bugs). Several mobile-only rendering issues plus two booking-policy changes.

## Mobile UX

### Athlete Profile — DOB picker
`components/athlete/AthletePageProfileTab.tsx`. Native `<input type=date>` forced Android users to scroll the calendar month-by-month to a birth year. Desktop (`sm+`) keeps the native input; mobile (`<sm`) gets Day/Month/Year dropdowns (year list current→1930) that compose back into the same `YYYY-MM-DD` string. Stays empty until all 3 parts chosen → saves `null`, not a malformed date.

### Coach manual-booking — A–Z member rail
`components/coach/ManualBookingPanel.tsx`. Android's native `<select>` has no type-to-jump. Desktop keeps the native select; mobile gets a custom picker — members grouped by first letter with a vertical A–Z rail (tap a letter → `scrollIntoView`; missing letters dimmed; `#` for non-alpha). Trial-athlete option pinned on top. Same `onMemberSelect`/`onAddMember` API, parent unchanged.

### Movement-demo video modal — iPhone fix
`components/coach/ExerciseVideoModal.tsx`. Mimi had to close the WOD editor to see a demo video; fine on Chris's Android. Root cause = iOS Safari mis-pins `position:fixed` descendants inside an overflow-scrolling container (the WOD panel), so the `fixed inset-0` video landed inside the scrolled panel. (Secondary: the panel's explicit `zIndex` makes it a stacking context that traps `z-[110]`.) Fix: `createPortal(..., document.body)`. Desktop/Android unchanged.

### Movement Library popup — four fixes
`components/coach/MovementLibraryPopup.tsx`:
1. **First-paint.** `isMobile` started `false`, flipped in a `useEffect` → first paint on a phone was the desktop 950×850 box at `left:770` (off-screen), then swapped. Android hid the swap; iOS lagged → "doesn't load" + stuck scroll. Lazy-init `isMobile` from `window.innerWidth`.
2. **Search box scrolled away.** Results container lacked `min-h-0`, so `flex-1 overflow-y-auto` grew to full content height and the whole popup scrolled. Added `min-h-0` + `flex-shrink-0` on header/tabs/search/filter → list is the only scroll region.
3. **Filters collapsed by default.** Equipment & Body-Parts now behind a "Filters" toggle (default closed) with an active-count badge.
4. **Keyboard.** `fixed inset-0` sizes to the LAYOUT viewport, which the on-screen keyboard doesn't shrink → header scrolled off with the keyboard up. Now tracks `window.visualViewport` (height/offsetTop) so the popup fits above the keyboard.

## Booking logic

### Wellpass blocked-tier — release-day cap replaces weekly cap
`app/api/bookings/create/route.ts`. Reviewed the 2-tier release with Chris: unblocked athletes book at the base release (Sun 16:00), `wellpass_booking_restricted` members at +offset (18:00). The flag is the SAME one the S377 blocking system sets; currently 0 members blocked, so the tier is dormant — confirmed intentional ("only blocked Wellpass").

Chris reworked the blocked-athlete penalty: **removed** the household 1-booking-per-week hard cap; **added** a release-day cap — a blocked member may make only **1 booking on the release day (Sunday)**, then from the day after they book the rest of the week freely (if spots remain). Per-individual-member (old cap was household). Pause override retained. The later-window offset is unchanged — that's what preserves priority for unblocked athletes. (Window opens 16:00 but last Sunday class is 11:00, so blocked athletes only ever book NEXT week's classes when their window opens.) Exported `berlinWallClock` + `berlinWallTimeToUTC` from `lib/bookingRules.ts` for the TZ-safe Berlin-day boundary count over `bookings.created_at`.

### Kids classes — child-only booking, all spellings
Three matchers shared the same `startsWith` kids keyword list; the hyphenated `"Eltern-Kind-Turnen (2-6J)"` escaped all three (the no-hyphen `"ElternKind Turnen"` was caught). Normalized keywords + input (strip spaces/hyphens/punctuation) in `app/api/bookings/create/route.ts`, `app/member/book/page.tsx` (`isKidsClass`/`isFoundationsClass`), and `utils/card-utils.ts` (`getSessionTier`) → every variant matches. Side effect (correct): the hyphenated class now shows in the Kids tab + gets the kids color tier.

Per Chris, kids-class self-bookings are now blocked for **ALL** adults, not just those with a registered family member (removed the `primaryHasFamilyKids`/`family.length>0` gate in both surfaces). Parents must register a child and book under their name. No-child message (German): *"Diese Klasse ist für Kinder/Jugendliche — bitte registriere zuerst dein Kind über den Button „+ Familie" oben."* Renamed the booking-page `+ Family` button → `+ Familie`. Diapers & Dumbbells stays foundations tier → parents still self-book it.

## Landmines added (see activeContext)
- Full-screen mobile modals with a text input must size to `visualViewport`, not `fixed inset-0`.
- Full-screen / `fixed inset-0` modals must `createPortal` to `document.body`.
- `wellpass_booking_restricted` drives the later window AND a release-day-only 1-booking cap (weekly cap gone) — per-member.

## Pending
- Mimi iPhone re-tests: video modal + library scroll/keyboard (couldn't reproduce on Mac).
- Prod spot-checks: kids-class block; Wellpass release-day cap (needs a blocked member to test).
- Optional: finish translating the `/member/book` "who you're booking for" panel (modal titles + header still English).

## Rejected / decided
- Later tier = "all Wellpass always" → **rejected**; kept "only blocked Wellpass."
- Daily-pacing as a rolling 1/day → **replaced** by Chris with "1 on release day, rest from Monday."
- Per-household daily cap → **per-member** chosen.
