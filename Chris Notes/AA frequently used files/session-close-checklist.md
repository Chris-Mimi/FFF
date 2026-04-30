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

### 3. Update Memory Bank
- [ ] Update `memory-bank/memory-bank-activeContext.md`:
  - Bump version + date.
  - **Rewrite the "⚡ Next Session Kickoff" section near the top** — first action, files to open first, open questions, landmines. This is the "first 5 minutes of tomorrow" doc; keep it short.
  - Add this session to "Current Status (Last 5 Sessions)" block.
  - Remove the 6th-oldest session entry (detailed history lives in `project-history/`).
  - Update "Next Immediate Steps" list.
  - Update "Known Open Issues" if new bugs discovered.
- [ ] **Keep it concise** — if an entry runs > 15 lines, move detail to `project-history/` and summarize.
- [ ] **Do NOT touch `Chris Notes/AA frequently used files/Notes for next session.md`** — that's Chris's personal notes file and is not read by Claude. (Changed in S321; was previously step #3.)

### 4. Create Project History File
- [ ] Create `project-history/YYYY-MM-DD-session-XXX-description.md`
  - Accomplishments, logic decisions, rejected alternatives, major learnings.
  - This is where the nuance that doesn't fit in activeContext goes.
  - **Size target: ~150 lines / 5 KB**, matching neighbors in `project-history/`. If you're writing a design doc, you've gone too far — trim.

### 5. Update Feature Overview (if applicable)
- [ ] If a new user-facing feature shipped: add an entry to `Chris Notes/Forge app documentation/Forge-Feature-Overview.md`. Written with launch-publicity / user-manual framing in mind.

### 6. Verify Production Build ⚠️ BEFORE BACKUP
- [ ] Execute: `npm run build 2>&1 | tail -15` — runs the same lint + type-check pass Vercel uses. Catches `prefer-const`, unused vars, type errors, etc. that `next dev` skips silently.
- If errors: fix them, re-run, **do not proceed** until clean. (Session 326 incident: an S325 `let`/`const` warning blocked Vercel deploy for two pushes because nobody ran `npm run build` before pushing.)
- Warnings are OK to defer (they don't block Vercel) but worth noting in activeContext if they accumulate.

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

- [ ] activeContext **Next Session Kickoff** section rewritten (points to tomorrow's first action)
- [ ] activeContext memory bank updated (version bumped, Last 5 Sessions, Next Immediate Steps)
- [ ] Project history file created
- [ ] Feature overview updated (if applicable)
- [ ] **Production build passes** (`npm run build` clean — no Vercel surprises)
- [ ] Backup completed successfully
- [ ] Commit message follows `type(session-XXX):` pattern
- [ ] All changes committed (including backups)
- [ ] Pushed to GitHub
- [ ] Both accounts synced (if working across Mimi/Chris accounts)

---

## Common Mistakes to Avoid

- ❌ **Pushing without `npm run build` first** — `next dev` skips the production lint pass; Vercel will fail on `prefer-const`, unused vars, etc. (Session 326 incident).
- ❌ **Committing before backup** — backup files won't be in the commit.
- ❌ **Skipping project history** — nuance gets lost in activeContext's 5-session window.
- ❌ **Generic commit messages** — no session number, no specifics.
- ❌ **Bloating activeContext.md** — keep only last 5 sessions; older detail → `project-history/`.
- ❌ **Reflex `git add .`** — review `git status` first; silent bulk stages have bitten before (Session 240 incident).
- ❌ **Force-adding gitignored directories** without checking scope first — `git add -f backups/` pulls in every untracked file under it, often hundreds (Session 304 incident).
- ❌ **Writing a design doc in `project-history/`** — target ~150 lines / 5 KB, match neighbors.
- ❌ **Multiple commits by default** — prefer one commit unless there's a clear reason to split. Each extra commit costs an extra status+stage round-trip.
- ❌ **Running this checklist at 70%+ context** — use `handoff-prompt.md` instead; the memory-bank update is too expensive in a bloated session.
