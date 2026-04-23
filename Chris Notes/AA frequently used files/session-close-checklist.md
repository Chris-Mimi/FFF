# Session Close Checklist

**Use this for:** clean session close with plenty of context remaining (< 50-60%) — you want to wrap up and start fresh tomorrow.

**Do NOT use this for:** emergency handoff at 70%+ context. For that, paste the prompt from [`handoff-prompt.md`](handoff-prompt.md) instead — it produces a structured handoff doc without the memory-bank/history ritual (which is expensive in a bloated session and should happen in the fresh one).

---

## Order of Operations (CRITICAL)

### 1. Pre-Check: Terminal Locks & Sync
- [ ] Check no background processes (`npm run dev`, `vite`, `nodemon`) are locking the DB or JSON files. Kill if needed — prevents corrupted backups.

### 2. Review Uncommitted State (plan BEFORE staging)
- [ ] Run `git status` **once** at the start. Plan the entire commit split before touching `git add`.
- [ ] Default: **single commit**. Split only if there's a clear reason (e.g. unrelated workstreams, one should land without the other).
- [ ] Flag anything experimental that should NOT be committed yet.
- [ ] Before using `git add -f <dir>/`: check `.gitignore` + `git status <dir>/` to see what's actually inside. Force-adding a gitignored directory can pull in hundreds of untracked historical files.

### 3. Update Notes for Next Session
- [ ] Overwrite `Chris Notes/AA frequently used files/Notes for next session.md` with:
  - Next concrete action (the very first thing next-session-Claude should do).
  - Files to open first, ranked.
  - Any open questions from this session still unanswered.
  - Landmines (migrations not run, tests pending, manual dashboard steps).
- [ ] Keep it short — this is the "first 5 minutes of tomorrow" doc, not a history record.

### 4. Update Memory Bank
- [ ] Update `memory-bank/memory-bank-activeContext.md`:
  - Bump version + date.
  - Add this session to "Current Status (Last 5 Sessions)" block.
  - Remove the 6th-oldest session entry (detailed history lives in `project-history/`).
  - Update "Next Immediate Steps" list.
  - Update "Known Open Issues" if new bugs discovered.
- [ ] **Keep it concise** — if an entry runs > 15 lines, move detail to `project-history/` and summarize.

### 5. Create Project History File
- [ ] Create `project-history/YYYY-MM-DD-session-XXX-description.md`
  - Accomplishments, logic decisions, rejected alternatives, major learnings.
  - This is where the nuance that doesn't fit in activeContext goes.
  - **Size target: ~150 lines / 5 KB**, matching neighbors in `project-history/`. If you're writing a design doc, you've gone too far — trim.

### 6. Update Feature Overview (if applicable)
- [ ] If a new user-facing feature shipped: add an entry to `Chris Notes/Forge app documentation/Forge-Feature-Overview.md`. Written with launch-publicity / user-manual framing in mind.

### 7. Run Database Backup ⚠️ BEFORE GIT
- [ ] Execute: `npm run backup 2>&1 | tail -3` — verbose per-table logs aren't useful; tail just shows success/failure.
- Auto-discovers all public tables via `get_public_tables()` RPC (Session 95), so the schema list stays current automatically.
- **Backups are local-only restore points.** `backups/` is in `.gitignore` — do NOT force-add it. The JSON files exist on disk as a safety net; restore via `scripts/restore-from-backup.ts` if needed.

### 8. Stage Changes (Deliberate, Not Blanket)
- [ ] Prefer named-file staging: `git add path/to/file1 path/to/file2 ...`
- [ ] `git add .` only after an explicit `git status` review — never as a reflex.
- [ ] Never stage `.env*`, credentials, large binaries, or anything in `/tmp`.
- [ ] **If splitting commits:** stage + commit each group back-to-back in a single message's tool calls when possible, instead of `status → stage → commit → status → stage → commit`. Each `git status` between commits re-dumps the file list — adds up fast.

### 9. Commit
Use the session-prefix pattern from recent git log:

```
<type>(session-XXX): <short subject>

<optional body>

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

- `<type>`: `feat` | `fix` | `refactor` | `docs` | `chore` | `test`
- `XXX`: current session number (check activeContext version or last commit).
- Subject: imperative mood, specific (*what* changed and *why*, briefly).

### 10. Push
```bash
git push
```

---

## Verification Checklist

- [ ] Notes for next session updated (points to tomorrow's first action)
- [ ] Memory bank updated (version bumped, 5 sessions only)
- [ ] Project history file created
- [ ] Feature overview updated (if applicable)
- [ ] Backup completed successfully
- [ ] Commit message follows `type(session-XXX):` pattern
- [ ] All changes committed (including backups)
- [ ] Pushed to GitHub
- [ ] Both accounts synced (if working across Mimi/Chris accounts)

---

## Common Mistakes to Avoid

- ❌ **Committing before backup** — backup files won't be in the commit.
- ❌ **Skipping project history** — nuance gets lost in activeContext's 5-session window.
- ❌ **Generic commit messages** — no session number, no specifics.
- ❌ **Bloating activeContext.md** — keep only last 5 sessions; older detail → `project-history/`.
- ❌ **Reflex `git add .`** — review `git status` first; silent bulk stages have bitten before (Session 240 incident).
- ❌ **Force-adding gitignored directories** without checking scope first — `git add -f backups/` pulls in every untracked file under it, often hundreds (Session 304 incident).
- ❌ **Writing a design doc in `project-history/`** — target ~150 lines / 5 KB, match neighbors.
- ❌ **Multiple commits by default** — prefer one commit unless there's a clear reason to split. Each extra commit costs an extra status+stage round-trip.
- ❌ **Running this checklist at 70%+ context** — use `handoff-prompt.md` instead; the memory-bank update is too expensive in a bloated session.
