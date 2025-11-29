# Git Workflow - Simplified for Mimi & Chris

## 🎯 Your Current Workflow (Main Branch Only)

### Every Session - Start
Type in terminal: git pull

**What it does:** Gets the other person's latest changes
**When:** Start of every session (Mimi gets Chris's work, Chris gets Mimi's work)

### Every Session - End
Type in terminal: git push

**What it does:** Sends your changes to GitHub for the other person
**When:** After Claude has committed your changes

### Check What Changed
Type in terminal: git status

**What it does:** Shows what files you've modified
**When:** Anytime you want to see what's different

---

## 🌿 When You Need Branches (For Big Refactoring)

### Why Use Branches?
- Test big changes safely without breaking main code
- You've done this before for refactoring work
- Merge back to main when everything works

### Create a New Branch
Type in terminal: git checkout -b branch-name

**Example:** git checkout -b refactor-athlete-page

**What it does:** Creates a new branch and switches to it

### Switch Back to Main
Type in terminal: git checkout main

**What it does:** Switches back to the main branch

### See All Branches
Type in terminal: git branch

**What it does:** Shows all your branches (* marks current one)

### Merge Branch Back to Main (When Done)
Type in terminal:
git checkout main
git pull
git merge branch-name

**What it does:** Brings your branch changes into main

### Delete Branch After Merging
Type in terminal: git branch -d branch-name

**What it does:** Removes the branch (work is saved in main)

---

## 📋 Typical Refactoring Workflow (What You've Done Before)

1. **Start:** git pull
2. **Create branch:** git checkout -b refactor-something
3. **Work:** Claude makes changes, commits
4. **Test:** Make sure everything works
5. **Switch to main:** git checkout main
6. **Get latest:** git pull
7. **Merge:** git merge refactor-something
8. **Push:** git push
9. **Cleanup:** git branch -d refactor-something

---

## ⚠️ Important Rules

**DON'T:**
- Type backticks (```) or quotes
- Work on different branches at the same time as Chris (causes conflicts)
- Delete branches before merging (you'll lose work)

**DO:**
- Always git pull before starting work
- Always git push when done
- Ask Claude to handle merges if you get errors
- Use branches for big experimental changes
- Keep main stable and working

---

## 💡 When to Use Branches

**Use a branch when:**
- Big refactoring (like you did before)
- Testing new features that might break things
- Experimenting with code you might not keep

**DON'T use a branch when:**
- Small fixes or tweaks
- Regular daily work
- Working on different files than Chris

**Current setup:** You and Chris both work on main, never working simultaneously = No conflicts!

---

## 🆘 If You Get Errors

**"Your branch is behind 'origin/main'"**
- Type: git pull
- This means Chris pushed changes you don't have yet

**"Merge conflict"**
- Tell Claude: "I have a merge conflict, here's the error: [paste error]"
- Claude will help resolve it

**"Working tree not clean"**
- You have uncommitted changes
- Tell Claude: "Need to commit my changes before pulling"

---

**Last Updated:** 2025-11-29 (Session 25)
**Your workflow:** Main branch only, branches for big refactoring only
