# Session 331 — Planner patterns shared across Adults & Kids tracks

**Date:** 2026-05-01 (Opus 4.7)
**Trigger:** Chris confirmed S330 fixes work on the live Planner. Then asked: under the Adults / Kids & Teens toggle, the same Movement Patterns should be available to both tracks — a Snatch pattern shouldn't have to be set up twice. Currently the toggle filtered the *pattern list itself*, so each track had its own catalog.

---

## The decision: drop track scoping entirely

Two model options surfaced:

- **(A) Shared-only.** Drop `movement_patterns.track`. Patterns are global per user. The Adults/Kids toggle still scopes coverage/gap analysis WOD-side via `excludeSessionTypes`, but the pattern catalog is one list.
- **(B) Multi-track via array.** Switch `track` (single value) to `tracks text[]`. A pattern can belong to `{adults}`, `{kids}`, or `{adults,kids}`. Useful if a pattern needs to be exclusive to one track.

Chris picked (A): "There are some exercises I'll never do with kids, but as there is no limit to how many groups I can have and I can set the order it's fine." Translation: rather than DB-level scoping, just don't link Adults-only exercises to Kids-relevant patterns. Sort order + naming handles the rest.

This is the simpler model — one column gone, no array semantics, no migration headaches if Chris later changes his mind about a pattern's scope (he just edits its linked exercises).

---

## What changed

### Migration

```sql
ALTER TABLE movement_patterns DROP COLUMN IF EXISTS track;
```

Saved at [database/20260501_drop_movement_patterns_track.sql](../database/20260501_drop_movement_patterns_track.sql) (gitignored — the `database/` folder has `*.sql` in `.gitignore`, established project pattern). Chris ran it via Supabase Dashboard SQL Editor.

### Code

[components/coach/analysis/PlannerSection.tsx](../components/coach/analysis/PlannerSection.tsx):
- `fetchPatterns` no longer takes a `track` arg.
- The `.eq('track', track)` filter on the patterns SELECT removed.
- Pattern create no longer writes `track`.
- All call sites updated: `fetchPatterns(trackFilter)` → `fetchPatterns()`.
- `computeAnalysis(pats, trackFilter)` unchanged — `trackFilter` still drives `excludeSessionTypes`. That's the only thing the toggle controls now.

[types/planner.ts](../types/planner.ts): `MovementPattern.track` field removed.

No other reads or writes of `movement_patterns.track` existed in the codebase (verified via grep).

---

## Verification

Service-role probe after the migration:

```
Patterns (15):
  0. Upper Body Vertical Press - weighted
  1. Upper Body Horizontal Press - weighted
  2. Squats - weighted
  3. Deadlift
  4. Iso Holds - static
  5. Iso Holds - dynamic
  6. Strict Bodyweight Movements
  7. Olympic Lifts
  8. Running
  9. Jumping
  10. TEST 4
  11. TEST 5
  12. TEST 6
  13. TEST 7
  14. TEST 8

track column probe: gone (column movement_patterns.track does not exist)
```

TEST 4–8 are intentional placeholders Chris keeps in the table. Confirmed before close.

---

## Process moments worth remembering

- **Asked single vs. multi-track up front, before writing migration SQL.** Two valid models, very different blast radius. Skipping the question would've meant either over-engineering (array column for a use case Chris doesn't need) or under-engineering (rebuild later if he wanted scoped patterns). One short clarifying question saved either tax.

- **Backup before migration, even for a column drop.** CLAUDE.md DB-safety rule isn't conditional on perceived risk. Cheap insurance, and the rule's value is partially that it removes the "is this risky enough?" judgment call.

- **`database/*.sql` is gitignored.** Carrying-over from S324 — SQL files don't get committed, only their effects via the schema. The `.sql` artifact lives locally as a documentation breadcrumb. If a future agent looks for it via `git log`, they won't find it; check the file system.

---

## Files touched

| File | Change |
|:---|:---|
| `database/20260501_drop_movement_patterns_track.sql` | New migration (gitignored) — drops `movement_patterns.track` |
| `components/coach/analysis/PlannerSection.tsx` | `fetchPatterns` no longer track-scoped; create/update no longer write `track` |
| `types/planner.ts` | `MovementPattern.track` field removed |

Single commit per close-session checklist default.

---

## Carry-over

- Awaiting Chris's live confirmation that both Adults and Kids & Teens toggles now show the same 15 patterns and that coverage/gap analysis still differs between toggles (because the WOD-side filter is unchanged).
- S330 Clean & Jerk dot question still open; not pursued this session because Chris confirmed S330 changes work and didn't ask to dig further.
