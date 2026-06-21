# Session 385 — 2026-06-21 (Opus 4.8)

RM-test lift weight-loss incident: diagnosed two distinct code bugs, fixed both,
and recovered the lost data across three testing series. Chris filled remaining
post-backup gaps manually.

## Symptom
Back Squat Testing 3 & 1RM (Wk13: 23.03, 24.03, 01.04) showed only ~9 lift
results on the leaderboard though the WOD had 28 athletes; lift weights had
vanished from the coach results modal. Same on Pendlay Row 5RM (25/27.03) and
Front Squat Testing 5RM (20-21.04).

## Root causes (TWO separate bugs)

**Bug 1 — weight_result nulled on edit.** RM-test lift sections store the lifted
weight as their score, so they need `scoring_fields.load = true`. The score-entry
grid only synthesised that *in memory* ([useScoreEntry.ts:153](../hooks/coach/useScoreEntry.ts#L153))
and never persisted it, so the stored WOD sat with `load:false`. The S338
edit-cleanup ([useWODOperations.ts:232](../hooks/coach/useWODOperations.ts#L232))
nulls `weight_result` when `load` flips true→false on save — so re-opening these
WODs to rename/drop "Barbell" wiped every athlete's weight. **Fix `866bba3`:** on
save, force `load:true` for any section with an `rm_test` lift → the flip can't
happen and the leaderboard safeguard stops hiding the weight. Sweep of all 98
RM-test sections: only the 14 Chris had edited carried `load:false`; the other 84
were `load:true`/`undefined` and healthy.

**Bug 2 — lift_records deleted on booking removal.** [scoreCleanup.ts](../lib/coach/scoreCleanup.ts)
`cleanupAthleteScoresForWod` ran on every booking-deletion path (athlete/coach
cancel, late-cancel, delete-incident, delete-session) and deleted the athlete's
`lift_records` for the WOD alongside their session score. Per Chris: the only
people whose bookings get removed are no-shows — who never posted a score — so
the lift delete was a no-op in normal use. It only ever fired destructively when
a booking was pulled from an athlete who DID lift: **moving people between
parallel sessions** (the app does that as a silent cancel + re-add), or
**deleting/recreating a session**. That silently wiped real PRs. **Fix `f5a3d58`:**
scoreCleanup now clears only the session-scoped `wod_section_results` (+ its
reactions); `lift_records` are date-keyed PR history and persist. Bad records are
removed by hand via the athlete page (delete-lift).

## Forensic timeline (from per-date backups)
- weights intact: Back Squat 74 rows (01.04→17.04), Front Squat 21 rows (24.04→05.05)
- `lift_records` trimmed: **24.04** (per-athlete, via booking removal) and **11.05**
- `weight_result` nulled: **05.07** (both series at once, via the load-flip)

## Recovery (fresh backup taken first; dry-run before each write)
- WSR weights restored by-id from `2026-04-17` (Back Squat, 54 updates + 20 re-inserts)
  and `2026-05-05` (Front Squat, 15 + 6). Updates touched `weight_result` only.
- `scoring_fields.load → true` on the 14 sections.
- Rebuilt `lift_records` from the now-correct WSR weights (no backup, no dup risk):
  42 Back Squat + 8 Front Squat + 20 Pendlay. `user_id = members.id = WSR.member_id`
  (verified); Epley 1RM matches the app.
- Deleted 10 whiteboard duplicates (SvenH→Sven Hujo, SonjaH→Sonja Hujo,
  MichaelM→Michael Maier, SusanneG, Madeleine) created because the 04-17 backup
  predated their registration; **kept Nils** (genuinely whiteboard-only).
- Chris manually added the few scores entered after the backup date (not in source).

Post-recovery sweep: 0 damaged sections, 0 registered athletes missing a record.

## Lessons / landmines
- **Restoring an old backup re-creates whiteboard rows for athletes who registered
  later** → whiteboard-vs-registered duplicates on the leaderboard; and a backup
  predates any score entered after its date (manual fill needed). Check both after
  any historical restore.
- **`load:false` on an `rm_test` lift section = corruption signature.** RM sections
  should always be `load:true`.
- **scoreCleanup must never delete `lift_records`** — they are cross-session PR
  history, not session-scoped data.

## Parked feature (not a bug)
Parallel-session "move" still loses the athlete's **whiteboard score** for that
day — the cancel+re-add re-adds them blank. Only their PR is now protected. A
proper one-click "move booking that carries the score" is the real cure.

## Scripts (committed)
`sweep-rm-lift-weight-loss`, `find-weight-backups`, `restore-w13-lift-weights`,
`rebuild-w13-lift-records`, `rebuild-pendlay-lift-records`,
`diagnose-w13-lift-mismatch(2)`.

Commits: `866bba3` (load fix), `6afc589` (recovery tooling), `f5a3d58` (scoreCleanup).
