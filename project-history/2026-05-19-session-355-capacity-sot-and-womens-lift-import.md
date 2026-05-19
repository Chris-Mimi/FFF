# Session 355 — Capacity SoT + Women's Lift Import + S315 Follow-ups

**Date:** 2026-05-19 (Opus 4.7)

Three independent workstreams: a code bug fix (Workout Modal / Session Management Modal capacity drift), a large data import (18 women's historical lifts via the S315 pipeline), and two S315 follow-ups (Power Jerk relabel + Peter Kroll late-import).

---

## 1. Capacity Bug Fix — Single Source of Truth

**Symptom.** Coach noticed the Workout Modal's "Max Capacity" field and the Session Management Modal's "Capacity" field didn't correlate for the same session.

**Root cause.** Two DB columns held the same conceptual value with asymmetric write rules:
- `weekly_sessions.capacity` — seeded by the schedule generator from `class_schedule_templates.default_capacity` ([app/api/sessions/generate-weekly/route.ts:158](app/api/sessions/generate-weekly/route.ts#L158)).
- `wods.max_capacity` — written by the Workout Modal.
- Session Management Modal ([hooks/coach/useSessionEditing.ts:48-67](hooks/coach/useSessionEditing.ts#L48)) already wrote BOTH on save.
- Workout Modal save ([hooks/coach/useWODOperations.ts:30-32](hooks/coach/useWODOperations.ts#L30)) had a `capacityChanged` guard — only propagated to `weekly_sessions.capacity` if the Max Capacity field's value differed from `editingWOD.maxCapacity`. So a save that didn't touch the field left `weekly_sessions.capacity` at whatever the generator originally wrote.

**Decision.** `weekly_sessions.capacity` is canonical. It's the column the booking/capacity logic reads everywhere. `wods.max_capacity` is effectively legacy. Confirmed with Chris via question (4 options: session-only, WOD-only, dual-sync, backfill-only). He picked session-only + session.capacity wins on backfill.

**Fix (commit `21a39af`).**
- Removed the Max Capacity input from [components/coach/WorkoutModal.tsx](components/coach/WorkoutModal.tsx) + [components/coach/WorkoutFormFields.tsx](components/coach/WorkoutFormFields.tsx).
- Dropped the `maxCapacity` validation in [hooks/coach/useWorkoutModal.ts](hooks/coach/useWorkoutModal.ts).
- Stripped every `weekly_sessions.update({ capacity: ... })` call from [hooks/coach/useWODOperations.ts](hooks/coach/useWODOperations.ts) (5 spots). Removed the now-unused `promoteWaitlistForSession` / `promoteWaitlistForWorkout` imports.
- `wods.max_capacity` is still written on WOD insert/update (hydrated from `WODFormData.maxCapacity` which comes from `useCoachData.ts:172` for existing WODs or 192 for empty sessions). Just no longer authoritative.

**Backfill SQL pending** for Chris to paste in Supabase:
```sql
UPDATE wods SET max_capacity = ws.capacity FROM weekly_sessions ws
WHERE ws.workout_id = wods.id AND wods.max_capacity IS DISTINCT FROM ws.capacity;
```

Idempotent. Future writes are drift-proof by construction; this is one-shot cleanup for historical rows.

---

## 2. Women's Historical Lift Import (18 athletes, 667 records)

**Source.** Chris pasted a master JSON keyed by 18 short names (Mimi, Anneke, Claudia, Sole, Sandra, Anja, Carole, Irene, SabrinaN, Annerose, Miriam, Madi, SusiG, Dinny, Petra, Katharina, AnneS, Kathrin). Different schema than S315 — used `weight`/`current` instead of `weight_kg`, and nested `lifts: [{lift, records[]}]` instead of `results: {liftName: []}`.

**Pre-import DB hygiene.**
- Two members.name rows had trailing whitespace: `'Anneke Spegele '` + `'Sandra Lederle '`. The importer's `.eq('name', full_name)` is byte-exact, so trailing spaces silently fail-match. Fixed via [scripts/fix-trailing-space-names.ts](scripts/fix-trailing-space-names.ts).
- Deleted 8 stale loose JSON files in `data/athletes/` left over from S315 — they were earlier-draft versions; the canonical applied copies sit in `data/athletes/processed/`.

**Name mappings clarified.** Chris answered 4 ambiguity questions:
- `Anja` → Anja Götte (not Anja Biechele)
- `Miriam` → Miriam Jacht (not Miriam Böck)
- `SabrinaN` → Sabrina Lucas (only Sabrina in DB)
- Trailing spaces → fix DB rather than carry the typo into JSON

**Conversion.** [scripts/convert-girls-import.ts](scripts/convert-girls-import.ts) reads the master JSON and emits 18 per-athlete files in the S315 importer's expected schema (`{athlete, full_name, gender: 'F', results: {liftKey: [{weight_kg, date}]}}`).

**Run.** [scripts/import-athlete-lift-records.ts](scripts/import-athlete-lift-records.ts) `--apply` → **667 inserted, 0 errors, 8 skipped** (existing real-app entries deduped by user+lift+date+rep_max_type).

---

## 3. S315 Follow-up #1 — Power Jerk → Push Jerk Relabel

**Discovered during the dry-run.** Two warnings: `Unknown lift name fragment: "Push Jerk (PJ)"` for Anneke + Claudia's `5RM Push Jerk (PJ)` keys.

**Deeper cause.** The importer's `LIFT_NAME_MAP` had `'pj' → 'Power Jerk'`. But `barbell_lifts` (the Forge catalog) only contains "Push Jerk" — there is no "Power Jerk" row. The athlete-app Lifts tab joins `lift_records.lift_name` against `barbell_lifts.name` to group records by lift; rows with `lift_name='Power Jerk'` find no match and render nowhere.

**Scope of orphans.** [scripts/find-power-jerk-rows.ts](scripts/find-power-jerk-rows.ts) found 5 orphaned rows from S315 imports:
- Chris Hiles ×2 (2022-08-26 62.5kg×5, 2021-11-08 55kg×5)
- Michael Städele (2022-08-26 45kg×5)
- Tobias Götte (2022-08-26 70kg×5)
- Thomas Spegele (2021-11-08 50kg×5)

**Fix.** Updated `LIFT_NAME_MAP`: `'pj' → 'Push Jerk'` + added explicit `'push jerk (pj)'` / `'push jerk'` entries. Relabeled the 5 orphaned rows via [scripts/fix-power-jerk-rows.ts](scripts/fix-power-jerk-rows.ts).

**Chris's clarifying question.** He asked twice where these records "live" — explained the `lift_records` ↔ `barbell_lifts` relationship (free-text column + master catalog) and showed the literal rows in chat before running the UPDATE. Good signal: don't assume Chris knows the schema; show the data.

---

## 4. S315 Follow-up #2 — Peter Kroll Late-Import

**Background.** S315 carry-over noted "Peter | Peter Kroll | Not yet registered — skipped". His JSON file was generated but his `members.name` didn't exist at import time.

**Status check via [scripts/check-peter-kroll.ts](scripts/check-peter-kroll.ts).** Now registered (active, primary). 2 existing `lift_records` rows from app usage (both Front Squat 110kg×1 on 2026-05-09).

**Run.** Moved `peter-kroll.json` from `processed/` → `data/athletes/`, ran importer with `--athlete peter-kroll --apply`. **10 records inserted, 0 conflicts** (his existing 2 Front Squat rows are on a different date so dedup didn't collapse them).

---

## Landmines Added to activeContext

- Session capacity has one source of truth (`weekly_sessions.capacity`); `wods.max_capacity` is legacy mirror. If you add a new capacity-edit surface, hook it through `useSessionEditing.handleUpdateCapacity` or write both columns.
- Importer `LIFT_NAME_MAP` had `'pj' → 'Power Jerk'`. If you add a new lift mapping, verify the target name exists in `barbell_lifts` (run `scripts/list-barbell-lifts.ts`). Map entries are not auto-validated.
- members.name trailing whitespace silently breaks the lift importer's `.eq()` match. Petr Bezdek's double-space is now the only known surviving typo case.

## Files Changed

| File | Change |
|:---|:---|
| `components/coach/WorkoutModal.tsx` | Removed Max Capacity input (capacity bug) |
| `components/coach/WorkoutFormFields.tsx` | Removed Max Capacity input |
| `hooks/coach/useWorkoutModal.ts` | Removed maxCapacity validation |
| `hooks/coach/useWODOperations.ts` | Removed 5 capacity-propagation calls + unused imports |
| `scripts/import-athlete-lift-records.ts` | Fixed `pj` mapping + added Push Jerk entries |
| `data/athletes/` | Deleted 8 stale loose JSONs; added 18 women's JSONs (then moved to processed/) |
| `data/athletes/processed/peter-kroll.json` | Round-tripped for import (no content change) |
| `scripts/list-female-members.ts` (new) | Lookup helper |
| `scripts/list-barbell-lifts.ts` (new) | Lookup helper |
| `scripts/fix-trailing-space-names.ts` (new) | One-shot DB fix |
| `scripts/convert-girls-import.ts` (new) | One-shot transform |
| `scripts/find-power-jerk-rows.ts` (new) | One-shot diagnostic |
| `scripts/fix-power-jerk-rows.ts` (new) | One-shot DB fix |
| `scripts/check-peter-kroll.ts` (new) | One-shot diagnostic |

## Commits

- `21a39af fix(session-355): single source of truth for session capacity` (early in session)

(Other work to be bundled into a single close-session commit.)

## Carry-overs

- **Run the capacity backfill SQL** in Supabase (one-liner above).
- Verify women's lift records visible on athlete app (Mimi / Sandra / Claudia / Anneke).
- Verify Peter Kroll's records visible.
- S354 visual-verify the five surfaces on prod still pending.
