# Git Commands - Quick Reference for Mimi

## ⚡ Save Time & Tokens - Do These Yourself!

### Start of Session

**Type this in the terminal:**
git pull

**What it does:** Gets Chris's latest changes from GitHub
**When:** Beginning of every session, before asking Claude to do anything
**Why do it yourself:** Saves ~2 minutes, 500 tokens

---

### End of Session (After Claude Commits)

**Type this in the terminal:**
git push

**What it does:** Sends your changes to GitHub
**When:** After Claude has made commits and you're ready to end session
**Why do it yourself:** Saves ~3 minutes, 800 tokens

---

### Check Status Anytime

**Type this in the terminal:**
git status

**What it does:** Shows what files have changed
**When:** Anytime you want to see what's modified
**Why do it yourself:** Instant feedback, saves asking Claude

---

## 🤖 When You DO Need Claude

- **Creating commits** (Claude writes good commit messages)
- **Resolving merge conflicts** (if you and Chris both edited same file)
- **Complex git operations** (branching, reverting, etc.)

---

## 📋 Recommended Workflow

1. **You:** Open VS Code → Terminal → type: git pull
2. **Claude:** Make code changes, create commits
3. **You:** Terminal → type: git push
4. **Done!** Session complete

**Time saved per session:** ~5 minutes, ~1000+ tokens

---

## ⚠️ If Git Commands Fail

**If "git pull" gives an error:**
- Tell Claude: "Git pull failed, here's the error: [paste error]"

**If "git push" asks for credentials:**
- Use your GitHub token (the one with no expiration)
- Username: Mimi-Hiles
- Password: [your token starting with ghp_...]

---

## 💡 Important Notes

**DON'T type:**
- ``` (these are just formatting marks in documentation)
- Quotation marks around commands
- The word "bash" before commands

**DO type:**
- Exactly: git pull
- Or: git push
- Or: git status

**Where to type:**
- VS Code: Menu → View → Terminal (bottom panel appears)
- Mac: Applications → Terminal

---

**Last Updated:** 2025-11-29 (Session 25)
