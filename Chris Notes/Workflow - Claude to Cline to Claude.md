# Workflow Guide: Claude → Cline → Claude

Quick reference for switching between Claude Code and Cline with free models.

---

## 📋 STEP 1: Finishing Work with Claude

### When to Switch:
- Claude API limit reached (80%+ weekly usage)
- Session about to expire
- Want to continue but Claude unavailable

### What to Do:

1. **Ensure everything is committed:**
   ```bash
   git status  # Check for uncommitted changes
   ```
   - If changes exist, tell Claude: "Commit all changes"

2. **Update Memory Bank (if significant work done):**

   Tell Claude:
   ```
   Review our session and update the Memory Bank.

   1. memory-bank/memory-bank-activeContext.md (CONCISE)
   2. project-history/session_history.md (VERBOSE)
   3. Use general-purpose agent
   ```

3. **Switch to cline-dev branch:**
   ```bash
   git checkout cline-dev
   ```

4. **Verify you're on correct branch:**
   ```bash
   git branch  # Should show * cline-dev
   ```

✅ **You're ready for Cline!**

---

## 🔧 STEP 2: Starting Work with Cline

### Setup (First Time Only):

1. **Open Cline panel in VS Code**
2. **Select FREE model:**
   - Click "Model" dropdown
   - Choose: `x-ai/grok-code-fast-1` (FREE)
   - Or: `cline/code-supernova-1-million` (FREE)

### First Prompt to Cline:

```
Read the following files for context:
- memory-bank/memory-bank-activeContext.md
- Chris Notes/cline-member-management-tasks.md

IMPORTANT: You CAN update memory-bank-activeContext.md as you complete features.
DO NOT modify project-history/session_history.md or other memory bank files.

Start with [Feature Name from task list].
```

### As Work Progresses:

**After completing each feature, tell Cline:**
```
Update memory-bank/memory-bank-activeContext.md with what you just completed.
Add a concise entry following the existing table format.
Then commit your changes.
```

### Switching Between Cline Models:

**If switching from Grok to Supernova mid-work:**

1. **Tell current model (Grok):**
   ```
   Update memory-bank-activeContext.md with your progress.
   Commit all changes.
   ```

2. **Switch model** in Cline dropdown

3. **Tell new model (Supernova):**
   ```
   Read memory-bank/memory-bank-activeContext.md for current status.
   Continue with [next feature].
   ```

---

## 🔄 STEP 3: Finishing with Cline, Returning to Claude

### Before Closing Cline:

1. **Tell Cline:**
   ```
   Commit all remaining changes with clear commit message.
   Update memory-bank-activeContext.md with final status.
   ```

2. **Verify everything committed:**
   ```bash
   git status  # Should show "working tree clean"
   ```

3. **Push to GitHub:**
   ```bash
   git push
   ```

### Returning to Claude:

1. **Switch to main branch:**
   ```bash
   git checkout main
   ```

2. **Merge Cline's work:**
   ```bash
   git merge cline-dev
   ```
   - If merge conflicts: Tell Claude to help resolve them

3. **First message to Claude:**
   ```
   I merged cline-dev into main.
   Review the changes and update the Memory Bank with Cline's work.
   ```

4. **Claude will:**
   - Review commits from cline-dev
   - Check activeContext.md updates
   - Consolidate and refine memory bank
   - Update project-history/session_history.md
   - Ensure quality and consistency

5. **Once Claude finishes:**
   ```bash
   git push  # Push consolidated changes to GitHub
   ```

---

## 🚨 Emergency: Lost or Confused?

### How to Check Which Branch You're On:

**Method 1: Git Command**
```bash
git branch  # * shows current branch
```
Example output:
```
  cline-dev
* main        ← You're here
```

**Method 2: VS Code Visual Indicator**
- Look at **bottom-left corner** of VS Code
- Shows current branch name (e.g., `main` or `cline-dev`)
- Click it to switch branches visually

**Method 3: Git Status**
```bash
git status
```
First line shows: `On branch main` or `On branch cline-dev`

**💡 Pro tip:** Always check your branch before starting work!

### If you need to start fresh from safe version:
```bash
git checkout main  # Go to safe version
git status  # Check state
```

### If Cline made bad changes:
```bash
git checkout main  # Safe version
git branch -D cline-dev  # Delete bad branch
git checkout -b cline-dev  # Create fresh cline-dev from main
git push -f origin cline-dev  # Force push clean version
```

### If everything is broken:
- You have backups on Desktop: `AI-Development-backup-20251028/`
- Copy the backup over your project folder
- Or ask Claude to help restore from Git

---

## 📊 Quick Reference

| Action | Command/Prompt |
|--------|----------------|
| Check branch | `git branch` |
| Switch to Cline branch | `git checkout cline-dev` |
| Switch to safe branch | `git checkout main` |
| Check for uncommitted changes | `git status` |
| Push changes | `git push` |
| Merge Cline's work | `git checkout main && git merge cline-dev` |

---

## 💡 Tips

- **Always commit before switching branches**
- **Cline updates activeContext.md** = Next model knows what was done
- **Claude consolidates** = Quality control on main branch
- **Main branch** = Always your safe, working version
- **cline-dev branch** = Experimental playground

---

## 🎯 The Big Picture

```
main branch (safe) ──┐
                     │
                     ├──> cline-dev (experiments)
                     │       │
                     │    [Cline works here]
                     │       │
                     │    [Multiple models can take turns]
                     │       │
                     │    [Updates activeContext.md]
                     │       │
                     ├──< merge back
                     │
                     ├──> [Claude reviews & refines]
                     │
main branch (updated) ─┘
```

**You're always safe. Git tracks everything. Backups exist. Nothing is lost.**
