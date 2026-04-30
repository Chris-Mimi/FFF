# Session 326 — lift_records cascade, Apply-to-Sessions removed, 13 orphan WODs cleaned

**Date:** 2026-04-30 (Opus 4.7)
**Trigger:** Continuing S325 follow-ups. Two items from the "Next Immediate Steps" list landed: (1) extend the new cascade-delete dialog to also clean orphaned `lift_records`, then (2) audit + fix the sibling-WOD count bloat that S325 exposed.

---

## Fix 1 — `lift_records` cascade on WOD section removal

S325's confirm dialog in `handleSaveWOD` only deleted from `wod_section_results`. RM-test and non-RM lift sections also write to `lift_records` (auto-saved during score entry), and those rows stayed behind when a section was removed.

`lift_records` has no `section_id` — each row is identified by `(user_id, wod_id, lift_name, rep_max_type)` for RM tests or `(user_id, wod_id, lift_name, rep_scheme)` for non-RM. So the cascade can't filter by section_id. Approach:

1. Build tuple keys `(lift_name, RM:<rm_test>)` or `(lift_name, RS:<rep_scheme>)` from the lifts in **removed** sections.
2. Build the same tuple keys from **kept** sections.
3. `tuplesToDelete = removedTuples \ keptTuples` — preserves any lift that's still represented in a kept section (defensive: same lift can appear in multiple sections of one WOD).
4. Query `lift_records WHERE wod_id = X AND lift_name IN [...]`, filter to matching tuples, queue IDs for deletion.

Confirm dialog message and gating extended:
- Title: "Remove sections with saved data?" (was "...saved scores?")
- Message: "Saving will delete N scores from M athletes and K lift records on the section(s) you removed."
- Adapts wording when only one of the two has rows. Pure rename / reorder / drafting still no-op.

Live test on WOD `c2999101` (Front Squat 5RM, 5 lift_records from 5 users) — cancel-only, dialog showed correct counts. Defensive case on WOD `bccffaeb` (Deadlift in 3 sections including 3RM and 1RM) — removing the 3RM section preserved 1RM lift_records.

`scripts/find-wod-with-lifts.ts` (new) — service-role lookup that lists recent WODs with `lift_records` and their sections; used to pick test candidates.

Commit `d397005f`, mid-session.

---

## Fix 2 — "Apply to Sessions" feature removed

S325 surfaced 7 sibling WODs all named "WOD - Strict Movements..." for 2026-04-22. `scripts/audit-sibling-wods.ts` (new) confirmed this wasn't a one-off: 4 dates had clusters of 3+ siblings with stale orphan rows in them. The 2026-04-22 cluster alone had 5 orphans.

**Root cause** — the "Apply to Sessions" picker dropdown in WorkoutModal had two paths in `useWODOperations.ts handleSaveWOD`:
- UPDATE-existing-WOD branch (the `selectedSessionIds` block at line ~195) — for each ticked session, INSERT a new WOD and UPDATE `weekly_sessions.workout_id` to it. **The previously-linked WOD was never deleted.**
- INSERT-new-WOD branch (the `selectedSessionIds` block at line ~427) — same pattern.

Re-running the picker n times produced n orphans. The picker UI even showed "(has workout)" next to those sessions — but the save handler ignored that signal.

**Decision: remove the feature, not patch it.** Chris asked "is Apply to Sessions introducing unnecessary complexity?" — yes. The codebase had three fan-out paths:
- Apply to Sessions (buggy)
- Drag-and-drop (already orphan-safe via `handleCopyWOD` lines 768-798)
- Copy-and-paste (same)

Drag-and-drop covers the same use case visually. Removing the picker eliminates the entire bug class instead of patching it.

**Deletion scope** (4 files):
- `hooks/coach/useWODOperations.ts` — both `selectedSessionIds` branches; the `(!wodData.selectedSessionIds || wodData.selectedSessionIds.length === 0)` guard simplified.
- `hooks/coach/useWorkoutModal.ts` — `selectedSessionIds`/`otherSessions`/`applySessionsOpen` state, the `fetchOtherSessions` effect, `handleSessionSelectionToggle`, and the `selectedSessionIds` field on `WODFormData`.
- `components/coach/WorkoutFormFields.tsx` — picker UI, related props, restructured Max Capacity to standalone (no flex wrapper around two children).
- `components/coach/WorkoutModal.tsx` — inline picker UI in the non-panel form, prop-passes to `WorkoutFormFields`, `ChevronDown` import, both `dataToSave` builders simplified.

TS clean. Dev server hot-reloaded `/coach` and `/athlete` with no errors. Chris verified the picker is gone and saving still works on a normal edit.

---

## Audit — drag-and-drop / copy-paste

Both routes call `handleCopyWOD` (`useWODOperations.ts` line 599+). Lines 627-695 collect old workout IDs from the target session(s); lines 768-798 explicitly check after the link swap for any old WODs with zero remaining sessions and DELETE them (along with their scores via `/api/sessions/cleanup-results`). Already orphan-safe — no action needed.

---

## Cleanup — 13 orphan WODs deleted

`scripts/cleanup-orphan-wods.ts` rewritten as a generic orphan sweep (the old S113 one-shot was overwritten — only S113 history references it). Dry-run by default, `--apply` to delete, re-verifies sessions/scores/lifts at delete-time so the audit's snapshot can't bite us.

**Audit caught 9 cluster-resident orphans; full sweep found 13.** The 4 extras were lone orphans on dates with only 1-2 siblings — invisible to the cluster filter:

| Date | Orphans |
|:---|---:|
| 2026-04-29 | 2 |
| 2026-04-28 | 2 |
| 2026-04-27 | 3 |
| 2026-04-22 | 5 |
| 2026-04-20 | 1 |

Some had auto-generated names like `WOD 2026-04-29 18:30` (older fallback naming pattern), suggesting these accumulated over a longer window than just the past week.

Chris approved "all 13" → ran `--apply` → 13 deleted. Verification re-run shows 0 orphans remaining.

---

## Process moments worth remembering

- **Cluster filter hides solo orphans.** The audit's "3+ siblings" rule caught the obvious cases but missed 4 lone orphans. Always do an unfiltered sweep before deleting — what the cluster view shows isn't the whole picture. Saved as guidance for future orphan hunts.
- **Naming-conflict gotcha on Write.** Tried to write `scripts/cleanup-orphan-wods.ts` and Write blocked with "file not yet read". Read first revealed a pre-existing S113 one-shot. Lesson: even when you're confident a script name is "new", check the file system before writing.
- **Feature deletion > feature patch.** First instinct was to patch `selectedSessionIds` to overwrite-in-place. Chris's question — "is this introducing unnecessary complexity?" — flipped that. If a feature has a clean alternative already in place (drag-and-drop), removing it is simpler than fixing it. Three fan-out paths down to two.
- **Pushback caught one direction wrong.** I'd quoted "...a manually-customized sibling gets clobbered" as a caveat for the proposed fix, but Chris immediately said "if I use Apply to Sessions, drag-and-drop or copy-paste, it is definitely my intention that the target session gets overwritten." The caveat was real but didn't matter. Lesson: when surfacing a tradeoff, ask whether the tradeoff is meaningful before treating it as a constraint.

---

## Files touched

| File | Change |
|:---|:---|
| `hooks/coach/useWODOperations.ts` | lift_records cascade in `handleSaveWOD`; `selectedSessionIds` branches removed |
| `hooks/coach/useWorkoutModal.ts` | `selectedSessionIds`/`otherSessions`/`applySessionsOpen` state, handler, type field removed |
| `components/coach/WorkoutFormFields.tsx` | Apply-to-Sessions UI removed; Max Capacity restructured as standalone |
| `components/coach/WorkoutModal.tsx` | Inline picker UI removed; prop-passes simplified; `ChevronDown` import dropped |
| `scripts/find-wod-with-lifts.ts` (new) | Service-role lookup for WODs with lift_records (test-candidate finder) |
| `scripts/audit-sibling-wods.ts` (new) | Sibling-cluster audit; service-role |
| `scripts/cleanup-orphan-wods.ts` (rewritten) | Generic orphan WOD sweep, dry-run / `--apply` / re-verifies at delete-time |

Commits: `d397005f` (lift_records cascade) + session-close commit (Apply-to-Sessions removal + cleanup script + audit script + activeContext + this history file).
