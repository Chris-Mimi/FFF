# Session 358 — Anfisa Whiteboard Backfill + Intro Cleanup

**Date:** 2026-05-21 (Opus 4.7)

Anfisa Bornemann registered the day before; her name appeared as a free-text mention in 16 Whiteboard Intro sections but she had only 1 booking (the upcoming Foundations). Backfilled the historical bookings, re-attributed 13 unrelated orphan score rows as a Phase-2 byproduct, then cleaned her name out of the 16 Whiteboard Intros now that they're redundant.

---

## 1. Diagnosis — why "16 attended" didn't drill in

`member.booking_count` on the SearchPanel's Athletes section comes from the `get_all_members_attendance` RPC ([database/update-attendance-functions-include-whiteboard-text.sql](database/update-attendance-functions-include-whiteboard-text.sql)) which UNIONs three sources:
1. Confirmed bookings
2. Linked `wod_section_results` (member_id)
3. Free-text "Anfisa" inside `wods.sections` Whiteboard Intro `content`, matched via POSIX word boundary

But the click filter at [hooks/coach/useCoachData.ts:256-270](hooks/coach/useCoachData.ts#L256) only checks **source #1** — so any athlete whose attendance came via #2 or #3 shows a high count but a click-filtered empty workout list. Anfisa surfaced it because her 16 attendances live almost entirely in source #3.

**Established pattern (per Chris):** rather than fix the filter, backfill the bookings — same approach used for previous newly-registered whiteboard athletes. [scripts/backfill-whiteboard-bookings.ts](scripts/backfill-whiteboard-bookings.ts) already exists for this.

## 2. Apply (Phase 1)

Dry-run identified 16 sessions where "Anfisa" appears in the Whiteboard Intro and her registered profile has no existing booking. All matched via her `members.whiteboard_name = "Anfisa"`. Multi-session days = 0 (clean). Inserted 16 `bookings` rows, `status='confirmed'`, dates 2025-12-02 → 2026-03-31.

## 3. Phase 2 byproduct + scope flag

Same script also did Phase 2: 13 orphan `wod_section_results` rows (`whiteboard_name` set, `member_id` null) got `member_id` + `user_id` filled by matching on `whiteboard_name` (with first-name / full-name fallback). Affected: Anne Schaber (1, first-name fallback), Madeleine Gehring (4), Fenster Martina (3), Senol Özdilek (2), Carla Courtois (2, full-name match), Petr Bezdek (1).

Chris flagged Carla as off — "Carla Courtois doesn't appear in any Whiteboard Intro, which is the only criteria for these replacements." Correct observation: Phase 2 operates on `wod_section_results.whiteboard_name`, a different mechanism than Whiteboard Intro text. Decision on rollback deferred to next session.

## 4. Cleanup — remove "Anfisa" from the 16 Whiteboard Intros

Now redundant since she's properly booked. [scripts/remove-anfisa-from-whiteboard-intros.ts](scripts/remove-anfisa-from-whiteboard-intros.ts) — finds all WODs where "Anfisa" appears as a name in the Whiteboard Intro section (case-insensitive word boundary), removes the token, collapses stranded comma / slash / whitespace delimiters. 4 intros became empty strings (days where she was the only whiteboard mention) — left as empty, not nulled.

Dry-run showed clean before/after on all 16. Applied 16/16 successfully.

---

## Files Changed

| File | Change |
|:---|:---|
| `scripts/remove-anfisa-from-whiteboard-intros.ts` (new) | Targeted intro-text cleanup, dry-run by default. |

## DB Changes (data, not schema)

| Action | Rows | Tables |
|:---|---:|:---|
| INSERT bookings (Phase 1) | 16 | `bookings` |
| UPDATE WSR member_id+user_id (Phase 2) | 13 | `wod_section_results` |
| UPDATE wods.sections (intro cleanup) | 16 | `wods` |

## Open Questions for Next Session

1. **Carla Courtois Phase-2 rollback?** Plus the others (Anne / Madeleine / Martina / Senol / Petr) — Chris questioned Phase-2 scope. Decide: roll back all 13 score-row updates, keep them all, or split (e.g. only rollback Carla since she has no Whiteboard Intro mention).
2. **MacBook Pro problem (unrelated to app).** Chris flagged; details to come.

## Carry-overs (unchanged from S357 unless noted)

- S356 audit re-entry pass (8 high-confidence loss sessions for Chris's review).
- S355 capacity backfill SQL.
- S355 women's lift records visual-verify (Mimi / Sandra / Claudia / Anneke).
- S354 five-surfaces visual-verify on prod.
- S351/S352 paper-card sync (~9 holders missing `purchase_date`).
- S346 gym memberships live test.
- S345 Nico Enzmann whiteboard backfill.
- Long tail per activeContext carry-over list.
