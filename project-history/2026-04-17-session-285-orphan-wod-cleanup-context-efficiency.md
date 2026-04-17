# Session 285 — Orphan WOD Cleanup + Context Efficiency Rules

**Date:** 2026-04-17
**Model:** Claude Opus 4.7
**Persona Focus:** Coach / Data integrity + meta (workflow)
**Scope:** Data cleanup (DB) + documentation (memory bank, session-start protocol)

---

## Problem

Two separate issues:

### 1. Orphan WODs
Chris ran the Data Integrity diagnostic SQL in Supabase SQL Editor. The one-row health check reported **8 orphan WODs** — rows in `wods` table with no linked `weekly_sessions`.

Background: `weekly_sessions.workout_id` FK → `wods.id`. An orphan WOD = a WOD record not referenced by any session. The doc comment says "could be drafts," but code review showed the current WOD-creation paths (`hooks/coach/useWODOperations.ts`, `app/api/sessions/generate-weekly/route.ts`) always link a session — there's even a self-delete guard in `useWODOperations.ts:264-268` if no session is linked. So orphans = bugs, not drafts.

### 2. Context burn
This very session initially spent 74% context on what should have been a ~15% task. Chris flagged the expense.

---

## Fix — Part 1: Orphan WOD Cleanup

### Diagnostic query (extended from `Chris Notes/supabase-orphan-check-queries.md` §2a)

```sql
SELECT
  w.id, w.date, w.session_type, w.workout_name,
  w.is_published, w.google_event_id, w.created_at,
  jsonb_array_length(COALESCE(w.sections, '[]'::jsonb)) AS section_count,
  (SELECT COUNT(*) FROM wod_section_results WHERE wod_id = w.id) AS section_results,
  (SELECT COUNT(*) FROM workout_logs WHERE wod_id = w.id)        AS workout_logs,
  (SELECT COUNT(*) FROM lift_records WHERE wod_id = w.id)        AS lift_records
FROM wods w
LEFT JOIN weekly_sessions ws ON ws.workout_id = w.id
WHERE ws.id IS NULL
ORDER BY w.date;
```

All 8 rows came back with `section_results = 0`, `workout_logs = 0`, `lift_records = 0`, `google_event_id = null`, `is_published = false`. Pure shells. Safe to delete.

### Creation patterns identified (not pre-Session 214 cruft — recent!)

All 8 created 2026-03-24 through 2026-04-14 (last 3 weeks). Two distinct patterns:

1. **Duplicate-save (3 rows)** — On 2026-04-14 at 11:13, 11:14, 11:18 (~5 min apart), three identical `"CrossFit Open #15.2, OHS, C2B Pull-up"` WODs for date 2026-04-13. Classic rapid re-save or copy/drag where each click creates a new row instead of updating.
2. **Bulk-generate artifacts (5 rows)** — Default-named WODs (`YYYY-MM-DD HH:MM` format) for dates 2026-04-01, 2026-04-08, 2026-04-13, 2026-04-14, 2026-04-15. Three of these (04-13/14/15) created within 2 seconds of each other on 2026-04-13 05:45. Smells like `app/api/sessions/generate-weekly/route.ts` creating a WOD but failing to link a `weekly_session` row, with no rollback.

### Action

1. Ran `npm run backup` (37 tables, pre-delete snapshot preserved).
2. Deleted 8 rows via Supabase SQL Editor:
   ```sql
   DELETE FROM wods WHERE id IN (
     'a0bfd0bc-816e-4516-aae6-f5f3be3e311a',
     'dcf455c7-d626-40c9-abe5-34471daf8c0e',
     '8ae5c855-bae7-4e97-9a7c-bba3ad6e945f',
     '66ce91c5-f766-4acf-9e03-77831d2f6d0b',
     '70b51b71-05f7-4753-839a-6baeb4d12bb1',
     '2d07cdcc-b54f-44c9-ad97-bb27511dfaf6',
     '69755f19-3cfb-4391-a283-4472e96b8a57',
     '792dd801-86ae-49ae-b6c9-03e39981397b'
   );
   ```
3. Chris confirmed deletion. No impact on any downstream table.

### Carryover

- **Audit `app/api/sessions/generate-weekly/route.ts`** next session — does it have the self-delete guard that `useWODOperations.ts:264-268` has? If not, add one so a WOD without a session auto-deletes.
- **Audit rapid-save path** in WOD modal — why did three identical "CrossFit Open #15.2" WODs get inserted instead of upserted? Likely debounce/disable-on-submit is missing.

---

## Fix — Part 2: Context Efficiency Rules

Session 285 initially spent 74% context on an 8-row classify/delete task. Breakdown (honest):

- ~15% session-start reads (4 memory-bank files + workflow-protocols eagerly loaded)
- ~20% two Explore agents that should have been direct Grep calls
- ~10% two full reference-file reads (340 + 134 lines) when ~20 lines were needed
- ~10% Plan Mode ceremony (ToolSearch for EnterPlanMode/AskUserQuestion/ExitPlanMode + plan file + system reminders)
- ~5% `npm run backup` output (37-line echo)
- Rest: accumulating turns

### Changes committed this session

1. **`Chris Notes/AA frequently used files/Claude open or close session.md`** — session-start doc now reads only **activeContext + latest project-history** instead of all 4 memory-bank files. Added 6 efficiency rules + an explicit "no Plan Mode unless 3+ files" gate.

2. **`memory-bank/memory-bank-activeContext.md`** — trimmed from ~273 lines to ~140. Removed the 20-line "Migrations Pending" list (all ✅ applied, redundant — git history is authoritative). Cut session summaries 280-282 (kept 283-285). Kept data model reference, critical rules, open issues, next steps, business model. Updated schema to include recently-added columns (members subscription fields, wod_section_results member_id/whiteboard_name/track, lift_records wod_id, achievement_definitions difficulty).

3. **Auto-memory (`~/.claude/projects/.../memory/`)** — created `feedback_context_efficiency.md`; linked from `MEMORY.md`. Rules persist across sessions independent of the project's session-start doc.

---

## Files Changed

- `memory-bank/memory-bank-activeContext.md` — trim + session 285 entry
- `Chris Notes/AA frequently used files/Claude open or close session.md` — session-start protocol update
- `project-history/2026-04-17-session-285-orphan-wod-cleanup-context-efficiency.md` — this file
- `~/.claude/projects/.../memory/feedback_context_efficiency.md` (outside repo)
- `~/.claude/projects/.../memory/MEMORY.md` (outside repo)
- Supabase DB: 8 rows deleted from `wods` table

---

## Key Learnings

1. **"Orphan WOD" doc comment was stale.** The `Chris Notes/supabase-orphan-check-queries.md` §2a comment ("could be drafts") is wrong for the current codebase — orphans = bugs. Updated thinking, not the comment (separate cleanup).
2. **Code fixed in Session 214 doesn't prevent new orphans from a different path.** Session 214 patched the copy/drag flow in `useWODOperations.ts`. The bulk-generate-weekly path wasn't touched. Verify similar guards on every WOD-creating path.
3. **Context-efficiency is a first-class concern.** Chris pays per token; every turn re-processes all prior reads. Memory-bank files, Explore agents, full-file reads, and Plan Mode ceremony compound. Small tasks need small toolchains.
4. **Memory-bank bloat kills speed.** `activeContext.md` at 273 lines was 2–3× its useful size. The "Migrations Pending" list of ✅ applied items is pure cruft — database is authoritative, git history has context.
