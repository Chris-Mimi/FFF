# Claude Rules — durable conventions promoted from auto-memory

These are project-wide rules that survive account/machine switches because they're committed to the repo. Promoted here from `~/.claude/.../memory/` so they're not dependent on which Mac or Anthropic account a session runs on.

**Source of truth note:** if a rule below conflicts with auto-memory, this file wins (it's git-tracked, auto-memory may be stale or missing).

---

## 🚫 Hard Rules (past incidents — don't repeat)

### Never write to `Chris Notes/AA frequently used files/Notes for next session.md`
**Why:** S304 session-close rewrote this file with a structured handoff doc, silently overwriting Chris's persistent reminder bullets. Recovery required `git show` + manual merge.

**How to apply:** It's Chris's personal notepad — bullets there usually mean nothing to me. Reading is fine; writing/rewriting is not. If a session-close checklist or handoff protocol says to write next-session notes, put them somewhere else (`memory-bank/handoff.md`, activeContext, a dated handoff file). If Chris asks me to add something there, do it; otherwise leave it alone.

### Commit Chris's Notes file when it's modified, even though I never edit it
**Why:** S324 commit pass omitted the file because I conflated "don't edit" with "don't commit". Chris syncs Notes between two machines via git, so omitting it broke that sync.

**How to apply:** "Don't write" applies to the file *contents*, not git operations. If `git status` shows `Chris Notes/AA frequently used files/Notes for next session.md` modified, include it in the close-session commit (typically as `chore: sync Chris's session notes`).

### No silent bulk writes — only modify the row the user is editing
**Why:** S240 incident — bulk modifications without explicit approval damaged production data.

**How to apply:** Never modify DB records beyond the one the user is currently editing without explicit approval. If a fix appears to require touching multiple rows (e.g., a backfill, a bulk update), surface it to the user with the exact scope ("this would update N rows") and wait for explicit go-ahead. Read-only inspection of multiple rows is fine.

### Diagnostic scripts use `SUPABASE_SERVICE_ROLE_KEY`, not anon
**Why:** S323 incident — `scripts/list-wods-with-track.ts` returned an empty set with the anon key because RLS on `wod_section_results` silently blocks anon access. I told Chris there was no data; he pushed back; service-role re-run revealed 23 sessions.

**How to apply:** When writing or running a one-off inspection script that queries RLS-protected tables, use `SUPABASE_SERVICE_ROLE_KEY`. The existing scripts in `scripts/` (e.g. `check-ghost-scaling.ts`) use anon — don't trust their output for tables behind RLS without verifying with service role.

---

## 🤝 Communication

### Trust the user's statements exactly as given
When Chris says something doesn't appear in a workout, it means exactly that — don't invent explanations or assume he's mistaken. He will explicitly say when he's unsure.

### Don't assume when debugging — verify with data
Before asserting a cause, query the actual state (DB, file, logs). The script-anon-key blind spot (above) is a concrete example of why.

---

## 🪙 Context Efficiency Hard Rules (Session 285)

Past sessions burned 70%+ context on tasks that should cost 15%. The full rule list is in `Chris Notes/AA frequently used files/Claude open or close session.md`. Summary:

1. **No Explore agent for single-file lookups** — Grep/Read directly. Explore is for 3+ queries or genuinely unknown territory.
2. **No Plan Mode for diagnose-and-delete or single-file tasks** — EnterPlanMode loads heavy tool schemas + writes a plan file. Worth it only for 3+ file implementations.
3. **Targeted reads, not full reads** — Grep first, then `Read` with `offset`+`limit`. Never read 300+ line files when you need 20 lines.
4. **Short agent prompts** — 40 words, not 200.
5. **No TodoWrite for 1–3 step tasks** — TodoWrite is for 4+ step work with distinct phases.
6. **Ask before exploring** if the task is ambiguous — cheaper than guessing wrong.
7. **Never `Read` a utility file without `offset` + `limit`** if it's > 100 lines. `utils/leaderboard-utils.ts` is 638 lines — never read in full.
8. **For "X isn't working" bugs, find the caller before reading the implementation** — Grep the function name first to see every call site, then read only the relevant path.
9. **Don't multi-Read the same file in one session** — three Reads at different offsets means I should have used one Grep with `-A`/`-B` context.
10. **Project-history files: cap at ~150 lines / 5 KB** (matches neighbors in `project-history/`).
11. **activeContext session entries: cap at 6 bullets max** — ship-log, not dissertation.
12. **Don't narrate the diagnostic process** — state the root cause in one sentence and fix it.
13. **Session-start reads are ~20% fixed overhead** — working budget is ~60%, not ~80%.

---

## 🚧 Active state worth knowing across sessions

These aren't durable rules but they're load-bearing facts that should survive an account switch. Keep this section trimmed.

- **Push notification debug:** `sendToCoaches` may not match subscription user IDs to coach role; 6 subscriptions exist in DB at last check. Memory: `project_push_notification_debug.md` (if present).
- **Score-save monitoring:** scores were not persisted for 2 sessions on 2026-03-18 after Load 2 feature added. Remind Chris ~Session 226-227 to check for recurrence. Memory: `project_score_save_monitoring.md`.
- **Whiteboard-to-athlete migration:** at launch, run script to link all whiteboard scores to registered athletes using the name mapping in `Chris Notes/Forge app documentation/Athletes booking list`. One-time migration, not ongoing.

---

## When to update this file

- Promote a new auto-memory if it's been the cause of an incident, or it's referenced in 2+ sessions.
- Demote a rule (delete) if it's been baked into code or made obsolete.
- At session close: scan auto-memories saved this session, ask "should this graduate to here?" Catches drift before it accumulates.
