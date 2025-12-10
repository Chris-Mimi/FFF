# Git Commands Cheat Sheet (Idiot-Proof Edition)

## 🚨 CRITICAL: Files with Spaces in Names

**ALWAYS use quotes around file paths that contain spaces!**

```bash
# ❌ WRONG - This will fail
git add Chris Notes/AA frequently used files/Claude open or close session.md

# ✅ CORRECT - Use quotes
git add "Chris Notes/AA frequently used files/Claude open or close session.md"
```

**Rule of Thumb:** If the file path has ANY spaces, wrap the ENTIRE path in quotes.

---

## 📋 Daily Workflow (Most Common Tasks)

### 1. Check What Changed
```bash
git status
```
**Use this:** Before doing anything else. Shows what files changed.

### 2. Save All Changes
```bash
git add .
git commit -m "Your message here"
```
**Use this:** To save all your work with a message.

### 3. Save Specific Files
```bash
# For files WITHOUT spaces
git add path/to/file.ts

# For files WITH spaces (use quotes!)
git add "Chris Notes/AA frequently used files/my file.md"
```
**Use this:** When you only want to save specific files.

### 4. Push to GitHub
```bash
git push
```
**Use this:** After committing, to backup your work to GitHub.

---

## 🔄 Complete Daily Workflow (Start to Finish)

```bash
# 1. Check what changed
git status

# 2. Add all changes (or use quotes for specific files with spaces)
git add .

# 3. Commit with message
git commit -m "describe what you changed"

# 4. Push to GitHub
git push
```

**Example with session notes:**
```bash
git status
git add "Chris Notes/AA frequently used files/Claude open or close session.md"
git commit -m "Updated session notes"
git push
```

---

## 🆘 Common Problems

### Problem: "git add" Failed
**Cause:** File path has spaces and you didn't use quotes.

**Fix:**
```bash
# Add quotes around the entire path
git add "Chris Notes/AA frequently used files/your file.md"
```

### Problem: "git push" Failed
**Cause:** You haven't committed your changes yet.

**Fix:**
```bash
# Commit first, then push
git add .
git commit -m "your message"
git push
```

### Problem: Forgot What You Changed
**Solution:**
```bash
# See what changed
git status

# See detailed changes in files
git diff
```

---

## 💾 Save Work Temporarily (Stash)

**Use when:** You need to switch tasks but aren't ready to commit.

```bash
# Save current work temporarily
git stash

# Do other work...

# Restore your saved work
git stash pop
```

---

## 🌿 Branch Commands (Less Common)

### Check Which Branch You're On
```bash
git branch
```
Current branch shows with `*` next to it.

### Create New Branch
```bash
git checkout -b feature/my-new-feature
```

### Switch Branches
```bash
git checkout main
```

### Update from GitHub
```bash
git pull
```

---

## 📝 Quick Reference Card

| Task | Command |
|------|---------|
| Check status | `git status` |
| Add all files | `git add .` |
| Add file with spaces | `git add "path with spaces/file.md"` |
| Commit | `git commit -m "message"` |
| Push | `git push` |
| Pull updates | `git pull` |
| Stash work | `git stash` |
| Restore stash | `git stash pop` |

---

## ⚡ Most Used Commands (In Order)

1. `git status` - Always check first
2. `git add .` - Add all changes (or use quotes for specific files)
3. `git commit -m "message"` - Save with description
4. `git push` - Backup to GitHub

**Remember:** If a file path has spaces → use quotes!

---

## 🎯 Project-Specific Paths (Common Files)

```bash
# Session notes (HAS SPACES - needs quotes!)
git add "Chris Notes/AA frequently used files/Claude open or close session.md"

# Memory bank files (NO spaces - quotes optional)
git add memory-bank/memory-bank-activeContext.md

# Project history (NO spaces - quotes optional)
git add project-history/2025-12-10-session-44-workout-library-search.md

# Multiple files at once
git add "Chris Notes/AA frequently used files/Claude open or close session.md" memory-bank/memory-bank-activeContext.md
```

---

## ✅ Current Project Structure

**Main Branch:** `main` (this is your working branch)

**Workflow:**
- All work happens on `main` branch
- Commit often
- Push to GitHub regularly
- No feature branches needed for solo work

---

## 🚀 Full Session Close Example

```bash
# 1. Check status
git status

# 2. Add all changes
git add .

# 3. Commit with descriptive message
git commit -m "Session 44: Enhanced workout library search"

# 4. Push to GitHub
git push
```

**For specific files with spaces:**
```bash
git status
git add "Chris Notes/AA frequently used files/Claude open or close session.md"
git add memory-bank/memory-bank-activeContext.md
git commit -m "Updated session documentation"
git push
```
