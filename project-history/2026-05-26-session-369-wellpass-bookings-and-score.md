# Session 369 — Wellpass tab gets per-week bookings + lifetime Score

**Date:** 2026-05-26 (Opus 4.7) — 1 work commit + close.

The Wellpass tab grew from "did the household hit the WP sign-in minimum?" to "and how does their actual gym usage compare to what they paid for?" — two new pieces of data in the existing table, no new screen.

---

## 1. The ask, in three rounds

Chris asked first for "another column showing how many times each athlete has booked sessions for that week … next to the Minimum WP login … green if equal or under the WP amount or red if they are over the WP minimum."

The wording was ambiguous on what the color rule compared bookings against: the per-identity Min, or the actual sign-ins for that week. I asked once with previews — Chris picked Min initially, then immediately corrected after seeing it on the page ("green should signify good/ok … they should be ok unless they book more times than they sign-in"). The right rule is **bookings vs sign-ins for that same week**: ≤ means they paid via WP for what they used, > means they used the gym without checking in.

Then he asked for a "running total column" with +1 / -1 logic, which evolved into the Score column.

The second rule wording was also ambiguous: "+1 every time they went over their quota" could mean per-week or per-excess-sign-in. After my first implementation gave +1 per week, Chris pushed back ("How is that correct? If someone signs in 6 times per week and their minimum is 3..."). Asked once with previews showing symmetric vs asymmetric variants; he picked **symmetric: +1 per sign-in OVER Min, −1 per sign-in UNDER Min**.

The two "ask, ship, refine" rounds each cost one tiny re-edit. The clarification-before-coding pattern (preview-style options) saved a full retry on the second one.

---

## 2. Data plumbing

The booking count per (household, week) didn't exist anywhere. The Wellpass tab API ([app/api/coach/wellpass/route.ts](app/api/coach/wellpass/route.ts)) already had everything else — identities, linked members, weekly check-ins. The booking join was the only net-new query.

Approach: for tracked identities only, walk through each linked member, fetch confirmed bookings whose joined `weekly_sessions.date` falls in the date span covering the 6 most recent imported weeks, then bucket per (identity, year, week_number) via a pre-built date→week lookup.

```ts
// Build date → {year, week_number} from existing checkin weeks.
const weekBucketsByDate = new Map<string, {year, week_number}>();
for (const w of recent6Weeks) {
  for (let i = 0; i < 7; i++) {
    const d = new Date(w.week_start);
    d.setUTCDate(d.getUTCDate() + i);
    weekBucketsByDate.set(d.toISOString().slice(0, 10), {year: w.year, week_number: w.week_number});
  }
}
```

Then a paginated bookings fetch:
```ts
.from('bookings')
.select('member_id, weekly_sessions!inner(date)')
.in('member_id', allMemberIds)
.eq('status', 'confirmed')
.gte('weekly_sessions.date', minDate)
.lte('weekly_sessions.date', maxDate)
.range(from, from + 999);
```

The pagination matters: per [memory-bank/claude-rules.md](../memory-bank/claude-rules.md), `bookings` is on the growing-table list. With ~50 tracked households × ~2 members × 6 weeks × N sessions/week, the result set can exceed PostgREST's 1000-row default cap. The narrowing filter (`member_id IN (...)` + date range) makes it safe-ish but not safe-enough — the loop drains until a page returns < 1000.

Why JS bucketing instead of a SQL view? The week boundaries are stored as concrete date ranges in `wellpass_weekly_checkins`. Doing ISO-week math in SQL would have re-derived what's already in the table; using the existing rows as the boundary source keeps a single source of truth. The cost is shipping booking rows to the server function — acceptable at current scale.

---

## 3. UI

Cell rendering before (`{count}`) → after (`{count} / {bookings}`) with two distinct color rules:

- **Sign-ins (left):** red if `< Min` (unchanged from existing).
- **Bookings (right):** green if `≤ sign-ins`, red if `> sign-ins`, gray if no sign-in data for that week.

The Score column sits between "App?" and the week list — placed there so it's read after the Min context but before the per-week breakdown. Score formula:

```ts
const score = row.weekly_history.reduce((acc, w) => {
  const bookings = bookingByWeek.get(weekKey(w)) ?? 0;
  const diff = w.checkin_count - row.min_checkins_required;
  if (diff < 0) return acc + diff;                              // -|diff|
  if (diff > 0 && bookings <= w.checkin_count) return acc + diff; // +diff
  return acc;
}, 0);
```

The "+ excess only when bookings ≤ sign-ins" gate is the non-obvious piece: signing in 6× while booking 8× shouldn't reward the household — they're still under-paying.

A one-line legend under the tab title (`Each week shows sign-ins / bookings · sign-ins red when below Min · bookings green when ≤ sign-ins, red when > sign-ins · Score = lifetime +1 per sign-in over Min (when bookings ≤ sign-ins), −1 per sign-in under Min`) is the only documentation. Tooltip on the column header mirrors it.

---

## 4. Time scope — Score is lifetime since W1/2026

The first weekly row in `wellpass_weekly_checkins` is W1/2026 (Mon 29-Dec-2025). Through W21 = 21 weeks of history, 1019 rows total. The Score sums across the entire `weekly_history` array as returned by the API (no slicing), so it really is lifetime.

If/when Chris wants a rolling window (last 8 weeks, last quarter), it's a one-line change in `score = row.weekly_history.slice(0, N).reduce(...)`. Not asked for; not built.

---

## 5. Zoran / Sabrina / Dimitar are not exempt — they have higher Min

Mid-session Chris corrected my Reading of "exceptions": those identities cover a spouse, so they have `min_checkins_required = 6` on their `wellpass_identities` row (not the default 3). The score logic uses each identity's own Min, so the rule applies naturally — they need 6+ sign-ins per week to break even.

No special-case code needed. If their Min is set wrong in the DB, the input in the table can be bumped inline — refetch on next page load.

---

## 6. Side question — 18:30 + 18:31 as parallel WODs

Chris asked at close-time whether posting two sessions one minute apart is safe. Spent ~5 minutes grepping the constraints.

Findings:
- `weekly_sessions` uniqueness is `(date, time)` enforced via maybeSingle checks at [app/api/sessions/generate-weekly/route.ts:91](app/api/sessions/generate-weekly/route.ts#L91) and the dupe-cleanup loop at [hooks/coach/useWODOperations.ts:650](hooks/coach/useWODOperations.ts#L650). 18:30 ≠ 18:31 → distinct rows.
- Each row gets its own capacity, bookings, score-entry, locks. Athletes see two cards labeled 18:30 and 18:31 on `/member/book`. Mechanically fine.
- Wellpass household 1-booking-per-week rule still counts both — a restricted household trying to book both will be rejected on the second.

Told Chris: works, only watch-out is athlete confusion if both cards look identical. Clear per-session titles disambiguate.

---

## 7. Process moments

**Two ambiguity rounds, one preview question each.** The wording "green if equal or under the WP amount or red if over the WP minimum" really does work both ways, and so does "+1 every time they went over their quota". I asked with previews on both — both clarifications resolved in a single round. The preview format ("show me the math examples side-by-side") made the choice instant.

**Reading the file before changing it caught a redundant edit.** When Chris asked for the bookings rule, my first reflex was to compare against Min because that's what he said. Implemented it, he immediately corrected. Future hint: when a UX color rule sounds operationally weird, ask for the *purpose* (what's it flagging?) before locking in the comparison, not after.

**Growing-table pagination wasn't an afterthought.** Claude-rules nudged me into checking the bookings query against the table list before writing it. The 1000-row cap doesn't bite at today's scale but the symptom would have been silent (wrong booking counts for some households, no error) — exactly the bug class the rule exists to prevent.

---

## Files Modified

| File | Change |
|:---|:---|
| [types/wellpass.ts](../types/wellpass.ts) | Added `WellpassWeeklyBookings` interface + `weekly_bookings` field on `WellpassIdentityRow` |
| [app/api/coach/wellpass/route.ts](../app/api/coach/wellpass/route.ts) | Paginated bookings fetch + (identity, year, week_number) bucketing |
| [components/coach/members/WellpassTab.tsx](../components/coach/members/WellpassTab.tsx) | Side-by-side `sign-ins / bookings` cell rendering + Score column + legend |
| [memory-bank/activeContext.md](../memory-bank/activeContext.md) | S369 close: version 237, S369 entry added, S364 rotated out, Next Session Kickoff rewritten |

## Commits

1. `feat(session-369): wellpass tab — per-week bookings column + lifetime score`
2. Close-session commit (this file + activeContext + Notes sync).
