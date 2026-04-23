# S304 Close → S305 Handoff

## Status
Clean close. S303 acronym search shipped + live-verified (tag `dl` present on Barbell Deadlift; search/tracking confirmed "seems good" by Chris). S304 added session-close infrastructure: `handoff-prompt.md` + rewritten `session-close-checklist.md` + CLAUDE.md pointer.

## Next concrete action (S305 start)
1. **Skim memory-bank activeContext v167.0** to reload context.
2. **Decide: extend acronym resolution to 3 other callers?**
   - `utils/pattern-analytics.ts:47, :162` — movement-pattern analysis
   - `hooks/coach/useMovementTracking.ts:46` — athlete-exercise matrix
   - `utils/movement-analytics.ts:456` — Analysis page
   - Pattern: add `acronymMap?: AcronymMap` param + plumb through from calling hook (already has `exerciseNames` from `useCoachData` — expose `acronymMap` the same way).
   - Low priority — these paths don't involve short acronyms typed as lift names in the same way the Workouts search does. But worth it for consistency.

## Pending live-tests (carry-over, still not done)
1. **S302** benchmark leaderboard tiebreakers — find a benchmark with tied scores, confirm shared rank + age/date ordering.
2. **S300** section leaderboard tiebreakers — find a tie scenario on a section-result view (weight/reps/time).
3. **S299** three checks: (a) reps+cals combined ranking + `"X reps + Y cal"` format, (b) Records page Barbell Lifts list sorts Olympic→Press→Pull→Squat alphabetically, (c) Intervals presets Delete button visible on iPhone.
4. **S296** Intervals timer mode itself on deployed app (presets already confirmed S298).
5. **S297** SPF/DKIM/DMARC in Resend → Domains + reset flow end-to-end on live app.

## Other open items
- **Mac Chrome hang** — dedicated session needed. Start with Activity Monitor (Memory Pressure, Chrome Helper processes), disk free %, `~/Library/Logs/DiagnosticReports/`. Fixes Mac push as a side effect.
- **Athlete subscription bug** — Stefan Glocker DB row + webhook ordering + `autoExpireSubscriptions` vs trialing.
- **Whiteboard duplicate entries** (Session 251 uncommitted work in `memory/project_whiteboard_duplicates.md`).
- **Score-entry API filter** (deferred S289) — `app/api/score-entry/[sessionId]/route.ts:48-56`.
- **Test endpoint 410 cleanup** (deferred S292) — `app/api/notifications/test/route.ts`.

## Files to open first
1. `memory-bank/memory-bank-activeContext.md` — v167.0 (just written)
2. If extending acronym resolution: `utils/movement-extraction.ts` (see exported `AcronymMap` type) + the 3 caller files above.

## Landmines
- Database migrations `20260422_session303_strip_acronym_suffixes.sql` + `20260423_add_acronym_tags.sql` are run. `*.sql` is `.gitignore`'d by pattern — migrations need `git add -f` per commit.
- `tsconfig.tsbuildinfo` is tracked (unusual but project convention); it gets committed with TS changes.

---

# Mobile URL #
http://192.168.178.75:3000
