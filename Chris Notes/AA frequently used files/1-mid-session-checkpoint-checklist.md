# Mid-Session Checkpoint Checklist

**Use this for:** safely shipping a chunk of work mid-chat — clean state on disk, deploy kicks in on Vercel, nothing forgotten — and then **continuing in the same chat**.

**Do NOT use this for:** ending the session for the day. For that use [`2-session-close-checklist.md`](2-session-close-checklist.md) — it bumps the session number, rewrites the Next Session Kickoff section, and creates a `project-history/` entry. Running the full close mid-chat fragments the log (you end up with two project-history files for what's really one session).

**Cue phrase:** Chris says "**checkpoint**" → run this. Chris says "**close session**" → run [`2-session-close-checklist.md`](2-session-close-checklist.md) instead.

---

## Order of Operations

### 1. Pre-Check
- [ ] No stuck dev servers (`npm run dev`, `vite`) holding files. Kill if needed — backup needs a quiet disk.

### 2. Light Memory-Bank Touch (NOT the full close ritual)
- [ ] If today's work **extends an existing session entry** in `memory-bank/memory-bank-activeContext.md`'s "Current Status" block: append a 1-line bullet under it. Don't rewrite the whole entry.
- [ ] If today's work is **new scope** with no entry yet: add a short entry (3-5 bullets) at the top of "Current Status". Use the **next** session number — that's the session we're now actively in. The full write-up happens at close.
- [ ] If a **landmine** was introduced or removed (TZ bug, subtle invariant, anything that would bite a future reader): add it to the Landmines block now. These rot fast if deferred.
- [ ] **Skip** the "⚡ Next Session Kickoff" rewrite. Kickoff is the "first 5 minutes of tomorrow" doc — it's still today.
- [ ] **Skip** the "Last 5 Sessions" rotation. We're not done with the current session yet.
- [ ] **Skip** project-history file creation. The session-close handles that, with the full nuance.

### 3. Feature Overview (if applicable)
- [ ] User-facing feature shipped? Add an entry to `Chris Notes/Forge app documentation/Forge-Feature-Overview.md`. Same rule as close — written for end-users.

### 4. Verify Production Build ⚠️ BEFORE BACKUP
- [ ] `npm run build 2>&1 | tail -15` — same lint + type-check pass Vercel uses. Do NOT skip; `next dev` is more lenient.
- If errors: fix and re-run before proceeding.

### 5. Run Database Backup ⚠️ BEFORE GIT
- [ ] `npm run backup 2>&1 | tail -3` — local-only restore point. `backups/` is gitignored.

### 6. Stage + Commit + Push
- [ ] `git status` once, plan the stage, prefer named-file staging.
- [ ] Commit with the same `<type>(session-XXX): <subject>` pattern as the full close. XXX = current active session.
- [ ] `git push` → Vercel deploy kicks in.

### 7. Resume Work
- [ ] No memory-bank ritual yet. Just keep coding. The full close happens later when Chris is actually done.

---

## Verification Checklist

- [ ] activeContext touched **only** as needed (1-line append, new short entry, or landmine) — full ritual deferred to close
- [ ] Feature overview updated (if applicable)
- [ ] **Production build passes** (`npm run build` clean)
- [ ] Backup completed
- [ ] Commit message follows `type(session-XXX):` pattern
- [ ] Pushed to GitHub
- [ ] Chat continues — no "session is now closed" framing

---

## Common Mistakes to Avoid

- ❌ **Running the full close checklist mid-chat** — duplicates work, fragments project-history into two files for one session. Use this lighter checklist instead.
- ❌ **Bumping the session number twice** — checkpoint and close in the same chat should be the same session number. The close-checklist's "next session" framing only fires when we're actually ending the day.
- ❌ **Skipping `npm run build`** — even small changes can break Vercel (S326).
- ❌ **Skipping the backup** — backups are cheap; restore is expensive when you need one.
- ❌ **Skipping the landmine** — if you introduced a new subtle invariant or removed one, log it now. Mid-session is exactly when the context is freshest.
