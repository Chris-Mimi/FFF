# S305 Close → S306 Handoff

## Status
Clean close. S305 shipped one-shot whiteboard-name backfill: 1083 bookings inserted retroactively + 3 historical orphan scores re-attributed. Sonja Hujo's conflicting score was deleted manually (Chris will re-input via UI). S299/S300 leaderboard items live-verified OK; S302 benchmark tiebreakers pinned as edge case.

## Next concrete action (S306 start)
1. **Re-input Sonja Hujo's deleted score** via Score Entry UI — she now has a booking from the S305 backfill, so the entry will land with `member_id` set cleanly. (Chris: just normal flow, nothing special.)
2. **Sanity-check the backfill in production:** open Session Management for any past WOD that previously had whiteboard-only attendees (e.g. one of the early December 2025 dates from the dry-run sample) and confirm the names now show as booked members. Spot-check 2-3 sessions.

## Pending live-tests (carry-over, still not done)
1. **S296** Intervals timer mode itself on deployed app (presets already confirmed S298).
2. **S297** SPF/DKIM/DMARC in Resend → Domains + reset flow end-to-end on live app.

## Other open items
- **Decide: extend acronym resolution to 3 other callers?** (S303 follow-up, low priority)
  - `utils/pattern-analytics.ts:47, :162` — movement-pattern analysis
  - `hooks/coach/useMovementTracking.ts:46` — athlete-exercise matrix
  - `utils/movement-analytics.ts:456` — Analysis page
  - Pattern: add `acronymMap?: AcronymMap` param + plumb through from calling hook.
- **Mac Chrome hang** — dedicated session needed. Activity Monitor (Memory Pressure, Chrome Helper), disk free %, `~/Library/Logs/DiagnosticReports/`. Fixes Mac push as a side effect.
- **Athlete subscription bug** — Stefan Glocker DB row + webhook ordering + `autoExpireSubscriptions` vs trialing.
- **Whiteboard duplicate entries** (Session 251 uncommitted in `memory/project_whiteboard_duplicates.md`). **Note:** S305 backfill may have largely resolved this — re-evaluate before doing the S251 work.
- **Score-entry API filter** (deferred S289) — `app/api/score-entry/[sessionId]/route.ts:48-56`.
- **Test endpoint 410 cleanup** (deferred S292) — `app/api/notifications/test/route.ts`.

## Files to open first
1. `memory-bank/memory-bank-activeContext.md` — v168.0 (just written)
2. If revisiting whiteboard duplicates: `memory/project_whiteboard_duplicates.md` + check whether S305 already covers it
3. If extending acronym resolution: `utils/movement-extraction.ts` (exported `AcronymMap` type) + the 3 caller files above

## Landmines
- `scripts/backfill-whiteboard-bookings.ts` is a **one-shot** — don't re-run unless retroactively backfilling a fresh batch of historical Whiteboard Intro entries. It's idempotent (dedupes on existing bookings), but no reason to re-run.
- **Supabase JS `.select()` caps at 1000 rows by default.** Any future script that builds in-memory state from a large table (`bookings`, `wod_section_results` if it grows) needs `.range(from, from+999)` pagination loop. See [scripts/backfill-whiteboard-bookings.ts:122-135](scripts/backfill-whiteboard-bookings.ts#L122-L135) for the pattern.
- `*.sql` is `.gitignore`'d by pattern — DB migrations need `git add -f` per commit.
- `tsconfig.tsbuildinfo` is tracked (project convention); commits with TS changes.

---

# Mobile URL #
http://192.168.178.75:3000
