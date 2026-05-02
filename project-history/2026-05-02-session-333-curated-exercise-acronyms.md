# Session 333 — Curated exercise acronyms + cross-surface search

**Date:** 2026-05-02 (Opus 4.7)
**Trigger:** Coach-side Workouts page acronyms were collision-heavy because they were auto-generated from initials. Push-up family alone had 3× PUD, 2× PUH, 3× PUS, 3× PUT, 2× SPU. Chris asked for a curated system that would work across the Library popup, Workouts search, Planning + Statistics tabs, AND the Movement Tracking panel.

---

## The decision: dedicated `acronym` column on 4 movement tables

S303 had previously wired acronyms-via-tags (`'dl' → 'Barbell Deadlift'`). That was right when there was one acronym; it's wrong as a system. A dedicated column wins because:

1. **Conceptually distinct.** Tags = descriptive labels (anatomy, equipment, difficulty). Acronym = a search/display alias.
2. **Display affordance.** `Push-up Diamond (DPU)` becomes a first-class thing — you can render it as a pill in the Library card, learn the code in context, and type it later.
3. **Uniqueness enforcement.** `CREATE UNIQUE INDEX … ON exercises (LOWER(acronym)) WHERE acronym IS NOT NULL` rejects collisions at write-time. Tags can't.
4. **Edge cases stay clean.** Nullable column. Most exercises render exactly as before.

Schema added to all 4 movement-source tables in `database/20260502_session333_acronyms.sql` (gitignored, ran by Chris). The S303 `'dl'` tag was promoted to `acronym='DL'` on Barbell Deadlift (tag still exists, harmless — column is now authoritative).

---

## Search-time expansion, not content rewrites

WOD section content is plain text. When you inserted "Push-up Diamond" three weeks ago, that literal string landed in the content field — there's no link to an exercise row. So acronym search has to translate to text and search.

The expansion lives in `useCoachData` `combinedText` matcher. Type `DPU` → look up `DPU` → expand the regex test to `\b(DPU|Push-up Diamond)\b`. Every historical WOD with either string lights up. No migration, no content rewrite, no risk.

The probe (`scripts/probe-wod-naming-variants.ts`) confirmed Mimi's free-typing was clean enough that this works for ~99% of past WODs — only false-positive substring matches surfaced (e.g. "Fran" matching "Franziskah" member names). Cheap insurance, immediate confidence.

---

## Cross-surface scope

The 4 movement tables (`exercises`, `barbell_lifts`, `benchmark_workouts`, `forge_benchmarks`) each got the column + index. For movements that exist in two tables (Clean & Jerk in `barbell_lifts` + Barbell Clean & Jerk in `exercises`), the coach curates the same acronym on both rows — there's no auto-sync. We rejected the "canonical table + name-mapping to others" pattern because it's exactly the brittle approach already burning us in the S330 planner extractor. Two writes per duplicate is cheap; brittle name fuzzy-matches aren't.

| Surface | Display pill | Searchable by acronym |
|:---|:---:|:---:|
| MovementLibraryPopup (4 tabs) | ✓ | ✓ |
| Workouts page exercise dropdown (SearchPanel) | ✓ | ✓ |
| Workouts page WOD-content search | n/a | ✓ (via `combinedText` expansion) |
| Movement Tracking Panel column headers | ✓ (replaces `getCode` initials) | n/a |
| Athlete-facing views | ✗ — coach-curation tool | ✗ |
| WOD section content (rendered text) | ✗ — stays as typed | n/a |

Form input lives only on `ExerciseFormModal` for now — auto-uppercase, letters/digits, max 6. Lift / benchmark / forge edit modals deferred (Chris can use Dashboard SQL until they're added; ~15 min each in a follow-up session).

---

## Push-up backfill mapping (22 entries)

Chris ratified the final list. Key collisions caught during review:
- **SCAPU vs SCRPU** (Scapular vs Scorpion) — kept both, distinct enough.
- **RPU collision** — Rings Push-Up vs Rings Pull-Up. Settled on RPSU + reserved RPLU for the future pull-up family.
- He also customised some codes himself in the SQL (SPSU instead of SPU, etc.) before running.

CrossFit-standard codes preserved where they exist: HRPU, DPU, CLPU, HSPU.

---

## Two pre-existing bugs surfaced + fixed

**Custom Movements dropdown silently hid tracked exercises.** Typing HSPU returned nothing because `if (trackedIds.has(ex.id)) return false` excluded already-tracked rows. Fixed: tracked rows now show with a `✓ tracked` badge, click is a no-op. Presence at-a-glance, "already added" affordance is clear.

**"Show Unique" mode used a bi-weekly bucket.** Same workout repeated across weeks created N "unique" entries — W13 → bucket W12, W14 → bucket W14, W19 → bucket W18. The probe (`scripts/probe-wods-for-acronym.ts`) confirmed the pattern. Switched to dedupe-by-`workout_name` only; one row per uniquely-named workout, ever. Most-recent occurrence shown, with a small `×N` chip when N > 1. Initially hypothesized the cause might be S326's "Apply to Sessions" removal; probe ruled that out — pre-existing logic.

---

## Group-assignment popover (UX enhancement)

After Chris reported "I added HSPUK to tracking but it's not in my Push-up group", the answer was "tracking and grouping are independent steps". But that's a real workflow gap — you have to track first, then enter group edit mode, find it in the list, toggle the checkbox.

New flow: when you add an exercise from the Custom Movements dropdown and any groups exist, an amber-bordered popover appears with chips for each group + a Skip button. Click a chip → `updateGroupExercises(g.id, [...g.exercise_ids, newId])`. One click instead of five. Unrelated to S333's core scope but emerged naturally from the conversation.

---

## Process moments worth remembering

- **Conversation alignment before code.** ~10 design messages before any code. Each one reframed scope: single-table vs multi-table, parens vs pill display, search-time expansion vs structured references, edge cases for two-table duplicates. Building wrong would have been more expensive than the conversation.
- **Probe before backfill.** Read-only scan of all WOD content gave confidence that search-time expansion would work without a bulk content rewrite. Cheap insurance.
- **"It's not a bug, it's a workflow gap" → enhancement.** The HSPUK-not-in-group report wasn't a bug, but it pointed at a real friction point. Fix the friction.
- **One movement, two tables: no auto-sync.** Same-acronym-on-both-rows curation is the user's work, but it's a clean decision (avoids the S330 brittle name-mapping pattern).
- **Don't over-engineer Stats/Planning visible changes.** Honest answer to "what should I observe?" was "nothing visible — the wiring is correct, no regression on the S303 path". Avoiding false-promise of a visible change keeps trust.

---

## Files touched

| File | Change |
|:---|:---|
| `database/20260502_session333_acronyms.sql` | New migration (gitignored) — column + 4 unique partial indexes + push-up backfill + dl→DL promotion |
| `app/coach/analysis/page.tsx` | Add `acronym` to Exercise type + select |
| `components/coach/ExerciseFormModal.tsx` | New Acronym input next to Display Name |
| `components/coach/ExercisesTab.tsx` | Add `acronym` to Exercise type |
| `components/coach/MovementLibraryPopup.tsx` | Pill display in 4 tabs + acronym OR-match in 4 search filters |
| `components/coach/MovementTrackingPanel.tsx` | `getCode()` reads curated acronym via new `acronymByName` prop; deleted `ACRONYM_OVERRIDES` map |
| `components/coach/SearchPanel.tsx` | Tracked badge in dropdown + dedupe-by-name + count chip + group-assignment popover + acronymByName build |
| `hooks/coach/useCoachData.ts` | `fetchExerciseNames` pulls acronym from all 4 tables; search-time acronym→name expansion in `combinedText` matcher |
| `utils/movement-analytics.ts` | `fetchAcronymMap` reads from acronym column across all 4 tables |
| `scripts/probe-wod-naming-variants.ts` | New — WOD content vs canonical names |
| `scripts/probe-find-strings.ts` | New — locate text fragments by date+id |
| `scripts/probe-wods-for-acronym.ts` | New — diagnose dedup behavior per acronym |
| `Chris Notes/Forge app documentation/Forge-Feature-Overview.md` | Coach Workouts → acronym system entry |

TS clean. Production build clean. Single commit per close-session checklist.

---

## Carry-over

- Acronym form fields on Lifts / Benchmarks / Forge edit modals — schema + search + display all wired; only in-app curation UI is missing. Use Dashboard SQL until then.
- Pull-up family acronyms (RPLU reserved for Rings Pull-Up) — curate when next encountering them.
- Statistics-tab unification by acronym (collapse "Sumo Deadlift" + "Barbell Sumo Deadlift" tallies under one acronym) — discussed, deferred until acronym coverage broadens enough to matter.
