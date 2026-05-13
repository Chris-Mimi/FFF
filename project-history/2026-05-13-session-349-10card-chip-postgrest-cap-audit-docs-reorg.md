# Session 349 — 10-card chip fix + PostgREST 1000-row cap audit + scaling playbook + docs reorg

**Date:** 2026-05-13 (Opus 4.7)

What started as a 30-second one-line fix to the 10-card chip became the session that hardened the app's data-fetching foundations. The chip's `9/10 ⚠` symptom turned out to be the visible tip of a class of bug that was already silently misrendering data elsewhere in the app.

---

## 1. The visible bug — 10-card chip `9/10 ⚠` for Max & Ole Labudda

Chris reported the chip on the Members page showed `9/10 ⚠` instead of the expected split (`past+upcoming/10`). Counter = 9; chip read-side computed past+upcoming = 6; mismatch glyph fired.

Initial diagnosis via the carry-over note suggested the `membership_types?.[0]` filter was missing kids whose first membership type wasn't `ten_card`. Applied that, then walked back when I realised it could over-attribute Miriam's wellpass self-bookings. Refined to a kid-vs-self conditional. Chris reported no change.

A probe script (`scripts/probe-max-ole.ts`) using `SUPABASE_SERVICE_ROLE_KEY` returned 8 past + 1 upcoming = 9 for each kid. The browser hook returned 6 past + 0 upcoming = 6. **Three bookings were invisible to the browser**, including the most recent one (today's upcoming class).

Added a `count: 'exact'` to the hook's query: `fetched 1000 / total matching 2019`. **PostgREST's default response cap is 1000 rows** — the query was silently truncating to the first 1000 by insertion order.

Two root causes stacked:

1. **PostgREST 1000-row cap.** Fixed by narrowing the query to relevant members only: pre-fetch the set of 10-card holders + their card-sharing kids, then `.in('member_id', relevantMemberIds)`.
2. **`ten_card_purchase_date` string-compare bug.** Column comes back as ISO timestamp `'2026-04-20T00:00:00+00:00'`. The `weekly_sessions.date` is `'2026-04-20'`. JS comparison `'2026-04-20' < '2026-04-20T...'` is TRUE (prefix-shorter wins lexicographically). The boundary-date booking was being dropped silently. Fixed by `.split('T')[0]` before storing in the lookup Map.

Hard refresh confirmed `8+1/10` clean, no ⚠.

## 2. Audit + four preventive pagination fixes

The 1000-row cap is a class of bug. Audited 27 files for the same shape (`.from('growing_table').select()` without a narrowing filter or pagination):

- [hooks/coach/useMovementTracking.ts](hooks/coach/useMovementTracking.ts) `computeGlobal` — fetched ALL published weekly_sessions. Almost certainly already truncating, producing stale Movement Tracking dots. Paginated.
- [hooks/coach/useCoachData.ts](hooks/coach/useCoachData.ts) `fetchTracksAndCounts` — same shape. Search-panel count badges were undercounting silently. Paginated.
- [app/coach/analysis/page.tsx](app/coach/analysis/page.tsx) `fetchMonthlyWODs` — has a date range filter but would exceed 1000 at 1-year+ timeframes. Defensive pagination.
- [app/coach/admin/page.tsx](app/coach/admin/page.tsx) `fetchIncidentStats` — accumulates forever; would hit cap in 12-24 months. Paginated.

All four use the same pagination pattern already present in `useCoachData.ts:fetchWODs` (lines ~55-80) — a `for` loop with `.range(from, from + 999)`.

## 3. Workout search safety patch

Separate ceiling: [hooks/coach/useCoachData.ts](hooks/coach/useCoachData.ts) `searchWODs` had a deliberate `.limit(500)` for search responsiveness. Bumped to 2000 (~18 months of headroom at current data growth) and added `[search-limit-tripwire]` `console.warn` at ≥90% of the limit. Surfaces the need to revisit before older WODs start disappearing from unfiltered searches.

Four UX options for the eventual real fix (when the tripwire fires) documented in `database-and-growth.md`: (A) no cap, (B) Load more button, (C) require filter, (D) default date window.

## 4. Durable references

### `claude-rules.md` hard rule #1
"Never `.from(growing_table).select()` without a narrowing filter or pagination." Includes:
- Growing-tables list (bookings, weekly_sessions, wods, wod_section_results, lift_records, benchmark_results, reactions, athlete_achievements, programming_plan_items)
- Decision tree (filter → paginate → SQL aggregation)
- Pagination-vs-SQL-aggregation guidance
- User-facing explanation for when proposing a SQL view to Chris
- Proactive-check reminder for new features

### NEW `memory-bank/database-and-growth.md`
Chris-readable + Claude-readable playbook. The "kitchen vs dining room" analogy for what "move aggregations to SQL" actually means. S349 snapshot, decision tree, search-UX options, and a 7-category map of other scaling traps (missing indexes, N+1 queries, bundle size, image storage, cron drift, push deliverability, Stripe webhook race conditions).

Originally written as `scaling-and-foundations.md`. Chris flagged that "Foundations" (a class type at his gym) and "Scaling" (workout movement scaling) are both daily-use terms — the name was confusing. Renamed.

## 5. Post-close docs reorg

Chris pushed back on the doc landscape: 21 `.md` files at the project root, inconsistent naming in `memory-bank/` (three files had a redundant `memory-bank-` prefix; three didn't), no map of where things lived.

Three reorg passes:

1. **`memory-bank/` filename cleanup.** Renamed via `git mv`:
   - `memory-bank-activeContext.md` → `activeContext.md`
   - `memory-bank-techContext.md` → `techContext.md`
   - `memory-bank-systemPatterns.md` → `systemPatterns.md`
   - `scaling-and-foundations.md` → `database-and-growth.md`

   Live references updated in: `memory-bank/{claude-rules,workflow-protocols,systemPatterns,activeContext}.md`, `Chris Notes/AA frequently used files/{Claude open or close session, 1-mid-session-checkpoint-checklist, 2-session-close-checklist, github organisation cheat sheet}.md`, `Chris Notes/Workflow & Git/{Work flow & hints for Chris, Work flow - Claude to Cline to Claude}.md`, `Chris Notes/Forge app documentation/login-recovery-runbook.md`, `hooks/coach/useCoachData.ts`. Project-history files left as-is (immutable historical records — they correctly described the file as it was at the time).

2. **Root cleanup.** 19 stale `.md` files moved to `Chris Notes/Archive/historical root docs/`. Root now contains only `README.md`, `CLAUDE.md`, `LICENSE`, plus the new navigation map.

3. **New `WHERE-IS-EVERYTHING.md` at the project root.** Navigation map answering "I want to find X, where do I look?" with a quick-reference table, descriptions of the four documentation locations, and an ASCII diagram.

### `claude-rules.md` hard rule #2
Documentation filing discipline:
- Root is for the 4 essentials only
- Decision tree for where new docs go by audience + lifetime
- Archival pattern (move, don't delete)
- WHERE-IS-EVERYTHING.md must be updated in the same commit as any rename or move

## Files Modified

| File | Change |
|:---|:---|
| `hooks/coach/useMemberData.ts` | Paginated bookings fetch via `.in('member_id', relevantMemberIds)`; normalized `ten_card_purchase_date` with `.split('T')[0]` |
| `hooks/coach/useMovementTracking.ts` | Paginated `computeGlobal` weekly_sessions fetch |
| `hooks/coach/useCoachData.ts` | Paginated `fetchTracksAndCounts`; bumped `searchWODs` limit 500→2000 with tripwire warning |
| `app/coach/analysis/page.tsx` | Paginated `fetchMonthlyWODs` |
| `app/coach/admin/page.tsx` | Paginated `fetchIncidentStats` |
| `memory-bank/activeContext.md` | Renamed from `memory-bank-activeContext.md`; S349 entry; S344 rotated out; S347 chip carry retired |
| `memory-bank/techContext.md` | Renamed from `memory-bank-techContext.md` |
| `memory-bank/systemPatterns.md` | Renamed from `memory-bank-systemPatterns.md`; updated internal cross-ref |
| `memory-bank/database-and-growth.md` | NEW — scaling playbook (renamed from `scaling-and-foundations.md`) |
| `memory-bank/claude-rules.md` | Two new hard rules: 1000-row cap, docs filing |
| `memory-bank/workflow-protocols.md` | Updated memory-bank file references |
| `WHERE-IS-EVERYTHING.md` | NEW — navigation map at project root |
| 19 root `.md` files | Moved to `Chris Notes/Archive/historical root docs/` |
| 8 Chris Notes files | Updated to reference new memory-bank filenames |

## Process moments

- **The misdiagnosis-then-pause pattern.** The S347 carry-over suggested a specific fix that turned out to be based on a wrong model of the data. After applying it and Chris reporting no change, instead of trying more semantic refinements I wrote a probe script and looked at the actual data. The truth (1000-row cap + string-compare) was completely different from the assumed bug. Lesson: when a "small" fix doesn't work, **stop guessing and inspect data**.
- **Educational pause when Chris asked "what am I missing?"** Chris asked at the broadest level: was this a sign the app's foundation was unsound? Took ~15 minutes to explain the kitchen/dining-room analogy, the scaling categories, and what "professional" apps do at scale. Then turned that into the durable playbook so it's not lost.
- **Naming clash caught by the user.** I named the playbook `scaling-and-foundations.md` — pure engineer-vocabulary thinking. Chris pointed out both words are everyday gym terms in the app. Renamed to `database-and-growth.md`. Reminder to test names against user vocabulary, not just technical correctness.

## Commits

1. `f46cbcf` — fix: 10-card chip — purchase-date string-compare + 1000-row cap
2. `744f46e` — fix: paginate four unbounded queries to dodge PostgREST 1000-row cap
3. `7071f64` — docs: scaling playbook + search-limit safety patch + tripwire
4. `1acf209` — docs: durable rule for the PostgREST 1000-row cap
5. `ddb5f54` — chore: close — activeContext bump + S347 chip carry retired + S349 entry
6. `e8287f5` — chore: docs reorg — clean root, rename memory-bank/, new navigation map
7. `7ca9a2d` — docs: durable rule for documentation filing
