# Session 354 — Benchmark Detail Surfaces, Kids-Class Parent Block, Schedule Confirm + Reset

**Date:** 2026-05-18 (Opus 4.7)

Three independent feature workstreams landed today plus one no-code diagnostic conversation about the Lenny 10-card chip. All in one chat. Commits ended up tagged 354/355/356 due to the same label-drift pattern S353 logged — actual calendar-day work is S354.

---

## 1. Benchmark Detail Surfaces (Athlete + Coach)

**Trigger.** Chris: "Athlete app: Benchmark detail doesn't show in Leaderboard just text area content." Then on a follow-up: "Will this also show in the results modal?" → coach-side Score Entry. Then after the first push: "It shows on the scores/results modal (coach-side) but not on the Leaderboard (Athlete app)" — turned out he was looking at the *WOD* subview of the athlete leaderboard, not the Benchmarks subview I'd patched first.

**Three rendering surfaces ultimately updated:**

1. **Athlete Leaderboard → Benchmarks subview** ([components/athlete/LeaderboardView.tsx](components/athlete/LeaderboardView.tsx) lines 214-220, 1385-1386, 1558-1568). The local `BenchmarkOption` type gained `exercises: string[] | null`. The SELECTs on `benchmark_workouts` + `forge_benchmarks` pull `exercises`. The detail box now renders exercises (semibold, `•`-joined) above the description.

2. **Athlete Leaderboard → WOD subview** (same file, lines 56-66, 1173-1207). The local `WodSection` interface only declared `{id, name, type}` for benchmarks — `description` + `exercises` were on the JSONB snapshot (per S340) but invisible to TypeScript. Widened the type, then enriched the "Section content preview" block: now renders benchmark exercises (semibold), description, then the section's content textarea below a faint separator. Hidden entirely if all three are empty.

3. **Coach Score Entry (modal + page)** ([components/coach/score-entry/ScoreEntryModal.tsx](components/coach/score-entry/ScoreEntryModal.tsx), [app/coach/score-entry/[sessionId]/page.tsx](app/coach/score-entry/[sessionId]/page.tsx)). Per the S339-followup landmine, both files share `useScoreEntry` but render JSX is duplicated — same change applied to both. Teal info block below the chip row showing per-benchmark name + exercises + description.

**Data already snapshotted.** No DB or API changes needed — both `ConfiguredBenchmark` and `ConfiguredForgeBenchmark` types in [types/movements.ts](types/movements.ts) already carry `exercises?: string[]` + `description?: string`, copied into the WOD JSONB at attach time per [components/coach/ConfigureBenchmarkModal.tsx:94-98](components/coach/ConfigureBenchmarkModal.tsx#L94-L98). The athlete Benchmarks subview was the only place that needed to fetch from the master tables (because it doesn't read a WOD JSONB).

**Commits:** `1771654` (first pass — athlete Benchmarks subview + coach score entry) and `d9be7f6` (second pass — athlete WOD subview, after Chris reported the gap).

---

## 2. Parent Block on Kids Classes

**Trigger.** Chris: "Any athlete (16+) with a card and kids should not be able to book a class under their own name." After a clarifying question that he pushed back on as obvious-from-context (scope was kids classes specifically, not all classes), implemented as two layers:

**Server-side guard** ([app/api/bookings/create/route.ts:180-208](app/api/bookings/create/route.ts)). After the existing guardian_only check and the session-published check, before payment/capacity logic. Conditions:
- `bookingMemberId === user.id` (booking for self)
- Session is a kids class (`startsWith` matcher: `kids`, `kids & teens`, `kids and teens`, `fitkids turnen`, `elternkind turnen` — matches age-suffixed names like "Kids & Teens 6-9")
- A query for `members where primary_member_id = user.id AND account_type = 'family_member'` returns ≥1 row

Returns 403 with `"Diese Klasse ist für Kinder/Jugendliche — bitte buche unter dem Namen deines Kindes (Familienmitglied), nicht unter deinem eigenen."`

**Client-side UI** ([app/member/book/page.tsx](app/member/book/page.tsx)). On a kids-class card, if the chip is set to self AND `familyMembers.some(fm => fm.account_type === 'family_member')`, the Book button is replaced with inline amber text `"Bitte unter dem Namen deines Kindes buchen"`. Switching the chip to a kid re-enables it.

**Bonus parallel fix.** The book page's own `KIDS_TYPES`/`FOUNDATIONS_TYPES` strict-equality arrays would have miscategorized age-suffixed names — same bug class S352 fixed in `utils/card-utils.ts`. Refactored to module-scope helpers using the matching `startsWith` pattern. The Kids filter button, the per-card color tier, and the parent-block all now agree.

**Commit:** `c018c0c`.

---

## 3. Coach Schedule — Confirm + Reset Week

**Trigger.** Chris: "When I click This Week or Next Week there is no warning it just populates the sessions. I would like an 'are you sure' with the Week Number and from and to-dates clearly labelled in case of user error. I would also like a delete all sessions for the week which only works if no sessions have been edited/published."

**Confirm dialog** on both generate buttons ([app/coach/schedule/page.tsx](app/coach/schedule/page.tsx)). Added module-scope helpers (`getMondayOfDate`, `getISOWeek`, `formatYMD`, `formatWeekRange`). Each click now opens a `confirm({...})` with:
- Title: "Generate sessions for this week?" / "...next week?"
- Body: `Week NN` newline `Mon DD MMM YYYY – Sun DD MMM YYYY` (en-GB locale for DD-first formatting matches German convention).
- [Cancel] / [Generate]

**New endpoint** [app/api/sessions/delete-week/route.ts](app/api/sessions/delete-week/route.ts). `requireCoach` + service role. Accepts `{ start_date: 'YYYY-MM-DD' }`. Refuses to delete unless three guards all pass:
1. **No bookings on any session in the week** — query joins `weekly_sessions(*, bookings(id))` and checks length.
2. **No linked WOD is published** — `workout_publish_status === 'published'` blocks.
3. **Every linked WOD's sections JSONB is in default-draft state** — local copy of `isDefaultDraft` (mirrors `utils/card-utils.ts`): every section has empty content AND no lifts/benchmarks/forge_benchmarks.

If all three pass, deletes `weekly_sessions` rows first (their `workout_id` FKs reference `wods`), then the linked `wods`. Failure to delete WODs after successful session deletion is logged but non-fatal — orphan WODs are harmless and can be cleaned later.

**UI strip** below the main button bar: small label + two red trash-icon buttons (`Delete This Week` / `Delete Next Week`). Same confirm-dialog pattern with week# + date range. Disabled while `generating`.

**Commit:** `cfd3633`.

---

## 4. No-Code Conversation — Lenny 10-Card Chip Discrepancy

Chris reported Lenny's chip showed 10/10 instead of his expected 10+1/10 (10 past + 1 upcoming today). After he set Katja's `purchase_date` + ran Recalc, the counter snapped to 10. Diagnosed in chat without DB writes:

- The chip displays `past+upcoming/total` only when the trigger-maintained counter equals past+upcoming. On mismatch it falls back to `counter/total` with a small ⚠ — that's the path he was seeing.
- Two contributing factors: (a) `purchase_date` was NULL during the period today's booking was made → trigger bailed at insert, counter never moved. Recalc snapped it forward but only over rows with `ten_card_consumed=true`. (b) Pre-S353 bookings on Lenny had `ten_card_consumed=false` because his family-member row had no `primary_payment_method` at insert time — those rows are fossils invisible to Recalc forever unless flipped.
- Resolution: on the next "Close & Issue New" (new card purchase), the fresh `purchase_date` bounds out all pre-renewal rows as belonging to the archived card. Counter starts from 0; trigger maintains it correctly going forward. Chris confirmed leaving it.

No code change. The chip math is doing exactly what it should given the data; the data is a two-strata fossil record.

---

## Landmines Worth Recording (added to activeContext)

- **Athlete Leaderboard has two subviews** (`WOD` and `Benchmarks`) — any benchmark-detail surface added on one MUST be added on the other. The WOD subview reads from JSONB snapshots; the Benchmarks subview reads from master tables. Different data sources, different field availability — the local `WodSection` type was stripping `description`/`exercises` even though the JSONB carried them.
- **Kids-class detection now uses `startsWith` in four surfaces** ([utils/card-utils.ts](utils/card-utils.ts), [app/member/book/page.tsx](app/member/book/page.tsx) helpers, [app/api/bookings/create/route.ts](app/api/bookings/create/route.ts) parent block). If you add a fifth, copy the pattern — strict equality silently fails on age-suffixed names like "Kids & Teens 6-9".
- **`/api/sessions/delete-week` carries its own local copy of `isDefaultDraft`** because endpoints can't import from a `'use client'`-flavored utility module without bringing in React. If you change `isDefaultDraft` semantics in `utils/card-utils.ts`, also update the route's local copy.

## Files Modified

| File | Change |
|:---|:---|
| `components/athlete/LeaderboardView.tsx` | Benchmark detail rendering on both Benchmarks + WOD subviews; widened local WodSection type |
| `components/coach/score-entry/ScoreEntryModal.tsx` | Teal benchmark-detail block under chip row |
| `app/coach/score-entry/[sessionId]/page.tsx` | Same teal block (mirror of modal) |
| `app/api/bookings/create/route.ts` | Kids-class parent self-booking 403 |
| `app/member/book/page.tsx` | Module-scope kids/foundations helpers, inline amber warning on kids-class card |
| `app/coach/schedule/page.tsx` | Week helpers, confirm dialog on generate, delete-week buttons + handler |
| `app/api/sessions/delete-week/route.ts` (new) | Coach-only delete-week endpoint with three safety guards |

## Commits

- `1771654 feat(session-354): show benchmark exercises + description on athlete leaderboard and coach score entry`
- `d9be7f6 fix(session-354): show benchmark detail on athlete WOD leaderboard subview too`
- `c018c0c feat(session-355): block parents from booking kids classes under their own name`
- `cfd3633 feat(session-356): confirm dialog + reset-week action on Coach Schedule`

(Note: 355/356 commit prefixes are label drift — single calendar-day session is S354.)

## Carry-overs

- Visual-verify all four pushes on prod after Vercel deploy: benchmark detail on three rendering surfaces, parent-self-block on kids classes, schedule confirm + delete-week.
- S352 paper-card sync: Katja Brückner now done (one of the ~10). Roughly 9 holders remain missing `purchase_date`.
