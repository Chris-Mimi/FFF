# Session 356 — WOD Score-Loss Root-Cause Fix + Late-Cancel Cleanup + Wider Audit

**Date:** 2026-05-19 (Opus 4.7)

Three workstreams: root-causing and fixing the S355 score-loss bug, closing the S344-class late-cancel cleanup gap, and running a 60-day audit to surface silent losses Chris can re-enter.

---

## 1. Score-Loss Root Cause + Rename-Detection Fix

**Symptom (carried from S355).** Two classes showed empty Score Entry modals despite Leaderboard rendering all scores: 2026-05-06 17:15 (44 athletes) and 2026-05-05 18:30 (~16 athletes). S355 carry-over framed this as cascade-delete data loss and queued a wide audit.

**Misdiagnosis path I went down first.** I queried the DB and saw 44 fresh WSRs on the 17:15 wod, all `created_at=2026-05-19` (today, Chris's re-entry). No WSRs older than today. I concluded "the modal was empty because no scores ever existed for this wod_id; Leaderboard must have been showing the 18:30 class's scores by accident." Chris pushed back three times: the scores WERE there before re-entry. I was using survivor-bias — `created_at` only reveals rows that survived, not rows that got deleted. Saved feedback memory `feedback_trust_user_over_survivor_bias.md` (claude-rules already had "Trust user statements exactly" + "Don't assume when debugging — verify with data"; this one captures the specific failure mode of treating absence as disproof).

**Actual root cause.** The cascade-delete block at [hooks/coach/useWODOperations.ts:36-160](hooks/coach/useWODOperations.ts#L36) computes `removedSections = oldSections.filter(s => !newSectionIds.has(s.id))` and offers to delete matching WSRs. Section IDs use `section-${Date.now()}` and are NOT stable across edits — 5 generators in the codebase: drag-drop in `useWorkoutModal.ts:357`+`:495`, new-WOD template at `:404-422`, "Add Section" button in `useSectionManagement.ts:142`, drag-drop in `useQuickEdit.ts:57`. Whenever Chris drag-replaced a WOD or removed-and-re-added a section, every section got a new ID, the cascade saw "everything removed", the confirm dialog said "Delete N scores" — and at scale (44 rows for one class), the dialog reads as routine. Per S355's carry-over Chris had restructured multiple classes that shared a workout_name with the 1km Rower/SkiErg component, so the cascade fired.

**Why Leaderboard kept showing them.** Leaderboard joins WSRs by name/type-aware logic that's resilient to the section_id change, OR was reading from a different aggregation that didn't filter by wod_id strictly. Either way, it surfaced scores from sibling wod_ids on the same date. Didn't dig further; not the bug to fix.

**Fix shape.** Insert a rename-detection step before the cascade kicks in. For each removed-old section, group `(allRemoved, unmatchedNew)` by `type`. Match positionally within each type bucket. UPDATE WSR `section_id` from `${oldId}-content-0` to `${newId}-content-0` for matched pairs. Filter `removedSections` to genuinely-removed (no matching type+position). Only the genuinely-removed cascade through to the confirm dialog.

**Subtleties handled.**
- The scoring-fields-flip loop (lines 167-199) used to look up `newS = newSectionsById.get(oldS.id)`. After migration, WSRs are at the new section_id, so the loop now resolves `newId = migrations.get(oldS.id) ?? oldS.id` and UPDATEs against the new section_id consistently.
- The lift_records branch already uses content-based tuple matching (`${lift_name}|RM:${rm_test}` or `${lift_name}|RS:${rep_scheme}`) and isn't section_id-keyed, so it's unaffected by migration. A migrated section's lifts are still in `keptLiftTuples` and won't be deleted.
- The lookup uses `type` only, not `(type, primary_lift_name)` or `(type, benchmark_name)`. False-positive migrations (Chris removes one WOD section and adds a totally different WOD section in the same save) are possible but preferable to data loss — that's the explicit trade-off. Documented as a landmine.

**Why not stabilize section.id upstream instead.** Considered. Would require finding every `section-${Date.now()}` and either using a stable hash or moving to UUIDs. Riskier change — touches the editor, the drag-drop pipeline, the JSONB shape, and would still leave existing wods with timestamp IDs to migrate. Rename detection in the cascade is the surgical fix and complementary to any future stabilization.

---

## 2. Late-Cancel WSR Cleanup Endpoint (S344 incident class)

**Symptom.** Chris reported Jürgen Bizjak's accidentally-entered score (via copy-down feature) persisted on the Leaderboard after marking Jürgen as late-cancel via Session Management Modal.

**Root cause.** `handleLateCancel` at [hooks/coach/useBookingManagement.ts:260](hooks/coach/useBookingManagement.ts#L260) just flipped `bookings.status` to `'late_cancel'`. No WSR/lift_records cleanup. Also ran browser-side with the coach's auth token — the same S344 RLS class problem that hid the athlete's rows from the cleanup query.

**Fix.** Built [app/api/coach/mark-late-cancel/route.ts](app/api/coach/mark-late-cancel/route.ts) mirroring `/api/coach/cancel-member-booking`:
- `requireCoach` gate.
- `supabaseAdmin` (service-role) bypasses RLS.
- Resolves auth user id via `getUserById` so the OR-filter catches both `member_id` and `user_id` matches on WSRs (self-entered scores save with user_id).
- Deletes WSRs + lift_records for `(wod_id, memberOrUser)`.
- Does NOT flip `ten_card_consumed` — late-cancel still consumes the card per existing UX copy.

[hooks/coach/useBookingManagement.ts](hooks/coach/useBookingManagement.ts) `handleLateCancel` now calls the endpoint via `authFetch`. Confirm dialog message extended: "Any scores already entered for X on this class will be removed."

**For Jürgen specifically:** undo his late-cancel via the Undo button, then re-mark him as late-cancel — the new endpoint fires the cleanup. No one-shot SQL needed.

---

## 3. Wider Audit Script

[scripts/audit-missing-scores-s356.ts](scripts/audit-missing-scores-s356.ts) scans the last 60 days for two patterns:

**(A) High-confidence loss** — session has confirmed bookings AND its WOD has scorable sections (scoring_fields=true OR rm_test lifts) AND zero WSRs exist for that wod_id. Binary signal — class happened, athletes attended, no scores recorded.

**(B) Partial loss** — actual count is less than half of (confirmed × scorable). Noisier; meant to catch sessions where some scores survived but most were swept.

**Result.** 8 sessions in (A), 0 in (B). The all-or-nothing distribution is itself a fingerprint of cascade-delete events (one save wipes all WSRs for a wod_id; partial wipes would only happen if sections were partly preserved by ID match, which is unlikely once IDs regenerate).

Sessions surfaced:

| Date | Time | Confirmed × Sections | Workout |
|------|------|----------------------|---------|
| 2026-03-30 | 17:15 | 8 × 4 | Deadlift Testing 3 & 1RM, AKBS, HS Hold, Pull-Up Hold |
| 2026-04-02 | 18:30 | 10 × 1 | Open Gym / Filthy Fifty (likely intentional) |
| 2026-04-12 | 11:00 | 4 × 2 | TGU, MetCon review |
| 2026-04-17 | 09:00 | 5 × 2 | Barbell GM, KB C&PP, KB Row, Push-up, Sit-up |
| 2026-04-24 | 17:15 | 14 × 1 | Weekend WOD #26.11 |
| 2026-04-24 | 18:30 | 10 × 1 | Weekend WOD #26.11 |
| 2026-05-01 | 09:00 | 18 × 1 | Labour Day Partner Bash (likely intentional) |
| 2026-05-01 | 17:15 | 8 × 1 | Labour Day Partner Bash (likely intentional) |

Chris reviews and re-enters real losses. Re-entries are safe now that the cascade is fixed.

---

## Landmines Added to activeContext

- Cascade-delete rename detection matches by `type` only, positionally. False-positive migration is the trade-off vs data loss; refine to `(type, primary_lift/benchmark name)` if it ever bites.
- Late-cancel cleanup is permanent — undo only flips status, doesn't restore scores. Confirm dialog warns. Same shape as the S344 coach-cancel pattern.

## Files Changed

| File | Change |
|:---|:---|
| `hooks/coach/useWODOperations.ts` | Rename detection before cascade-delete; scoring-flip loop updated for migrated pairs |
| `hooks/coach/useBookingManagement.ts` | `handleLateCancel` calls new endpoint; dialog warns about deletion |
| `app/api/coach/mark-late-cancel/route.ts` (new) | Service-role endpoint with WSR/lift_records cleanup |
| `scripts/audit-missing-scores-s356.ts` (new) | 60-day audit |
| `scripts/check-wsr-duplicates-s356.ts` (new) | Diagnostic |
| `scripts/check-section-id-drift-s356.ts` (new) | Diagnostic |
| `scripts/check-session-wod-mapping-s356.ts` (new) | Diagnostic |

## Commits

(Single close-session commit — see `git log`.)

## Carry-overs

- Visual-test cascade rename detection + late-cancel cleanup on prod.
- Re-enter scores for real losses among the 8 audit candidates.
- S355 capacity backfill SQL still pending.
- S355 visual-verify women's lift records + Peter Kroll + S354 surfaces.
