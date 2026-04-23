# Session Close Checklist

**Use this for:** clean session close with plenty of context remaining (< 50-60%) — you want to wrap up and start fresh tomorrow.

**Do NOT use this for:** emergency handoff at 70%+ context. For that, paste the prompt from [`handoff-prompt.md`](handoff-prompt.md) instead — it produces a structured handoff doc without the memory-bank/history ritual (which is expensive in a bloated session and should happen in the fresh one).

---

## Order of Operations (CRITICAL)

### 1. Pre-Check: Terminal Locks & Sync
- [ ] Check no background processes (`npm run dev`, `vite`, `nodemon`) are locking the DB or JSON files. Kill if needed — prevents corrupted backups.

### 2. Review Uncommitted State
- [ ] Run `git status`. Ask Claude: *"Should any of these files be excluded or split across separate commits?"*
- [ ] Decide: one commit vs. several logical commits (feature / bugfix / docs).
- [ ] Flag anything experimental that should NOT be committed yet.

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

### 6. Update Feature Overview (if applicable)
- [ ] If a new user-facing feature shipped: add an entry to `Chris Notes/Forge app documentation/Forge-Feature-Overview.md`. Written with launch-publicity / user-manual framing in mind.

### 7. Run Database Backup ⚠️ BEFORE GIT
- [ ] Execute: `npm run backup`
- Auto-discovers all public tables via `get_public_tables()` RPC (Session 95), so the schema list stays current automatically.
- **Why before git:** timestamped JSON files should be version-controlled alongside code changes.

### 8. Stage Changes (Deliberate, Not Blanket)
- [ ] Prefer named-file staging: `git add path/to/file1 path/to/file2 ...`
- [ ] `git add .` only after an explicit `git status` review — never as a reflex.
- [ ] Never stage `.env*`, credentials, large binaries, or anything in `/tmp`.

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
- ❌ **Running this checklist at 70%+ context** — use `handoff-prompt.md` instead; the memory-bank update is too expensive in a bloated session.
