# At the START of every Claude session give this prompt:

**Read in ONE parallel call (COPY EXACTLY!!!):**
memory-bank/activeContext.md
memory-bank/claude-rules.md

Plus the most recent file in `project-history/` (run `ls -t project-history | head -1` to find it).

_(Paths are relative to the project root — works on both Macbook and Windows PC. Claude Code opens with the project as cwd.)_

Only read `memory-bank/workflow-protocols.md`, `memory-bank/techContext.md`, or `memory-bank/systemPatterns.md` if the task actually needs them.

`claude-rules.md` is the source of truth for hard rules (past incidents) + communication + context efficiency. Survives account/machine switches because it's git-tracked, unlike auto-memory in `~/.claude/`.

Then suggest next steps directly based on activeContext + latest session. **Do not enter Plan Mode unless the task is a genuine 3+ file implementation.**

---

## 🪙 CONTEXT EFFICIENCY RULES (mandatory — Session 285)

Past sessions burned 70%+ context on tasks that should cost 15%. Follow these:

1. **No Explore agent for single-file lookups.** Use Grep/Read directly. Explore is for 3+ queries or genuinely unknown territory.
2. **No Plan Mode for diagnose-and-delete or single-file tasks.** EnterPlanMode loads heavy tool schemas + writes a plan file. Worth it only for 3+ file implementations.
3. **Targeted reads, not full reads.** Grep for the section, then `Read` with `offset`+`limit`. Never read 300+ line files when you need 20 lines.
4. **Short agent prompts.** 40 words, not 200.
5. **No TodoWrite for 1–3 step tasks.** TodoWrite is for 4+ step work with distinct phases.
6. **Ask before exploring** if the task is ambiguous — cheaper than guessing wrong.


# Note for Chris #

# Supabase Backup Info #
Not quite - adjust the timing: Start of every session:

git pull
✅ Get latest code changes BEFORE making risky changes:

⚠️ **On Windows PC:** if `git pull` fails with "local changes would be overwritten" and you haven't actually made changes in this session, those are Synology Drive sync artifacts (Macbook is the primary dev machine and pushes to GitHub). Run `git fetch origin && git reset --hard origin/main && git clean -fd` to match remote. See activeContext.md → "DEV ENVIRONMENT" section.

npm run backup
✅ Create safety checkpoint
# Don't need to backup:
After every git pull ❌
If just reading/testing code ❌
Multiple times in same session ❌
# DO backup before:
Database migrations ✅
Bulk deletions ✅
Testing new database features ✅
Major refactors ✅
# Mimi's current status:
✅ Already has baseline backup
✅ Protected for next risky change
✅ Good to go
# Workflow:
Start session → git pull
About to do risky work → npm run backup
Make changes
If breaks → npm run restore 2025-12-13

# If Claude Code is not in side bar #
* Open Command Pallete (Cmd+Shift+P)
* Type "Claude Code: Open in side bar"

Manual backups going forward:
Manual backups: Exclude node_modules, .next, .git folders
Synology sync will remain stable with exclusions
To restore backup: Copy files + run npm install


