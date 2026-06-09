# Session 375 — Planner RM exercise-row view + grid drag-reorder, Lifts filter chips, Reject orphan-profile fix, approved-only Athletes list

**Date:** 2026-06-09 (Opus 4.8). One checkpoint commit mid-session (`a8f8c57`) + the close commit. All coach-side. Continued same calendar day as S374.

---

## 1. Planner RM-testing exercise-row view (the main feature)

**Starting complaint:** the "RM Testing only" toggle's recency was wrong — a Back Squat exercise chip showed "15–28 days" when the last actual rep-max test was 10+ weeks ago. Root cause: `computePatternGaps` used the plain Set extractor (`extractMovementsFromWod`), so it counted ANY appearance of Back Squat, never checking whether the slot was flagged `rm_test`.

**What Chris actually wanted** (clarified over two rounds — I initially mis-scoped it): when "RM Testing only" is on, the grid should stop collapsing each pattern into one row and instead show **one row per exercise** in the strength-testing group, where a coverage dot fills only on weeks that exercise was tested at 1/3/5/10RM, and clicking a dot reveals the date(s) + RM type.

**Implementation (3 files):**
- [types/planner.ts](../types/planner.ts) — `CoveredExercise` gained `occurrences: ExerciseOccurrence[]` (date + rmType per dated appearance within the week).
- [utils/pattern-analytics.ts](../utils/pattern-analytics.ts) — `detectWeeklyCoverage` populates `occurrences` (one per exercise per workout date, deduped).
- [components/coach/analysis/PlanningGrid.tsx](../components/coach/analysis/PlanningGrid.tsx) — `rmOnly` branch renders a pattern header row (group label + future-week planning circles) followed by one row per exercise. Coverage dot fills only when `occurrences.some(o => o.rmType)`; click → bottom detail panel listing RM dates + type. 'all' mode (pattern rows + expandable chips) left untouched. No PlannerSection recompute on toggle — the grid derives the RM view from existing `coverage`.

**Key decision — RM group is identified by NAME, not contents.** First attempt detected "RM patterns" by whether any exercise had an rmType occurrence. That failed: a movement like Back Squat belongs to several patterns, so its RM occurrence marked all of them, and Chris saw every group. Fix: `rmPatternIds` matches the pattern *name* against `/\d\s*RM\b/i` (rep-max notation, e.g. "Barbell Strength Testing 1,3,5 & 10RM"). Only that group shows; an empty-state message appears if no group is named that way. **Landmine:** rename the group to drop the rep-max notation and it vanishes from RM mode.

## 2. Grid drag-reorder

Chris wanted to reorder directly in the grid (previously only Pattern Manager could reorder).
- **'all' mode** = drag pattern-group rows (reuses `movement_patterns.sort_order` + existing `handleReorderPatterns`).
- **rm mode** = drag exercise rows within a group. Needed a NEW column.

**Migration (run in Supabase by Chris):**
```sql
ALTER TABLE movement_pattern_exercises ADD COLUMN IF NOT EXISTS sort_order integer;
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY pattern_id ORDER BY ctid) - 1 AS rn
  FROM movement_pattern_exercises
)
UPDATE movement_pattern_exercises m SET sort_order = o.rn
FROM ordered o WHERE m.id = o.id AND m.sort_order IS NULL;
```
- [components/coach/analysis/PlannerSection.tsx](../components/coach/analysis/PlannerSection.tsx) — `fetchPatterns` selects `sort_order` + `.order('sort_order', { nullsFirst: false })`; `handleReorderExercises` persists; both insert sites append `sort_order`.
- Native HTML5 DnD + grip handle, matching PatternManager (touch polyfill auto-attaches).

**Gotcha that bit us:** after I added the `sort_order` SELECT but before Chris ran the migration, the exercise query errored and the fetch swallowed it (`const { data: peData }`, no error check) → ALL patterns rendered with zero exercises. Symptom "all groups devoid of exercises", no console error. Resolved once the migration ran. Logged as a landmine.

## 3. Athletes → Lifts acronym filter chips

[components/coach/athletes/LiftsSection.tsx](../components/coach/athletes/LiftsSection.tsx) — filter chips above the rep-max list (shown only when ≥2 distinct lifts). Acronyms from `barbell_lifts.acronym` (DL, BP…), fallback to initials (multi-word) or first-2-letters. Click to filter, hover = full name, "All" resets, auto-clears when switching athletes or deleting the last record of the selected lift.

## 4. Reject orphan-profile bug + approved-only Athletes list

**Chris's report:** a bot registration he rejected yesterday still showed in the Athletes list, despite me saying earlier it was "all clean" (I was wrong).

**Root cause:** registration ([app/api/members/register/route.ts](../app/api/members/register/route.ts)) creates THREE things — auth user, `members` row (status pending), and an `athlete_profiles` row "so member appears in Athletes tab". The Athletes page ([app/coach/athletes/page.tsx](../app/coach/athletes/page.tsx)) reads `athlete_profiles`, not `members`. But Reject ([app/api/members/reject/route.ts](../app/api/members/reject/route.ts)) only deleted `members` + the auth user — never the profile. So a rejected registration left an orphan profile = ghost athlete.

**Fixes:**
- Reject now also `delete()`s `athlete_profiles` by `user_id` (non-fatal if it errors, so we don't leave a half-rejected state).
- Athletes list switched to an **approved-only allowlist**: profile shows only if its member exists AND status is `active`/`blocked` AND not guardian_only. This hides pending registrations (profile created before approval) AND orphan profiles. (Approve sets `active`, Block sets `blocked`, register/unapprove set `pending` — those are the only three statuses.)

**Data cleanup:** new [scripts/find-orphan-athlete-profiles.ts](../scripts/find-orphan-athlete-profiles.ts) (service-role, dry-run default, `--id=<profileId>` targeted or `--delete` all). Dry run found **3** orphans: the bot `zIyKqEOYPzELmqVzA`, **Alex Terbrack**, **Carla Rydval**. Per Chris's call, deleted **only the bot**; the two real-looking orphans are parked for next-session triage (could be earlier rejections, or members rows that vanished unexpectedly — don't assume).

## 5. Also this session
- **Mid-session checkpoint** ran (commit `a8f8c57`): planner RM view + reorder + feature-overview + activeContext touch.
- **S321 late-cancel TZ verification CLOSED** — gate-check query returned 5 `late_cancel` rows since 2026-04-24 → the gate fires in production. Reminder retired from Chris's notes.

## Outstanding (carried to S376 — Chris asked for the full list)
1. Alex Terbrack & Carla Rydval orphan triage.
2. Decide whether to also hide `blocked` athletes from the Athletes list.
3. Karen 26/01 missing-scores manual re-entry (8 names) + add scaling to the other 2 Karen wods.
4. Spot-check S375 once deployed.
5. Recurring: Sunday Wellpass sync; paper-card sync. Open ⏳: S342, S341, S338, S336.

## Left untracked on purpose
`scripts/probe-kb-oh-carry*.ts` (unrelated leftovers), `.claude/scheduled_tasks.lock`.
