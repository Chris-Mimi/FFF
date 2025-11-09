# Rollback Procedure - Athlete Page Refactor

**Purpose:** Emergency recovery if refactoring breaks the application

---

## 🆘 Quick Recovery (If Something Breaks)

### Option 1: Revert Last Commit (Safest)

If you just made a change that broke something:

```bash
# Go back one commit (keeps changes as uncommitted)
git reset HEAD~1

# OR completely discard the last commit
git reset --hard HEAD~1
```

### Option 2: Return to Working Code

Go back to the last known working state:

```bash
# Switch back to main branch
git checkout main

# Verify you're on working commit
git log --oneline -1
# Should show: 9374e44 feat: implement 3-state workout system and UI improvements

# Restart dev server
pkill -f "next dev"
rm -rf .next
npm run dev
```

### Option 3: Restart From Scratch

If the feature branch is completely broken:

```bash
# Go to main branch
git checkout main

# Delete broken feature branch
git branch -D refactor/athlete-page-split

# Create fresh feature branch
git checkout -b refactor/athlete-page-split

# Start refactor again from working code
```

---

## 🔍 Diagnosis Steps

Before rolling back, identify the problem:

1. **Check browser console:**
   - Open Dev Tools (F12)
   - Look for red errors in Console tab
   - Note the exact error message

2. **Check terminal output:**
   - Look for compilation errors
   - Note any failed module imports

3. **Check git diff:**
   ```bash
   git diff
   ```
   - Shows exactly what changed
   - Helps identify the breaking change

4. **Run TypeScript check:**
   ```bash
   npx tsc --noEmit
   ```
   - Shows type errors that might not appear in browser

---

## 🔧 Partial Rollback (Surgical Fix)

If only one file is broken:

```bash
# Restore single file from last commit
git checkout HEAD -- path/to/broken/file.tsx

# OR restore from main branch
git checkout main -- path/to/broken/file.tsx
```

---

## 📸 Verify Recovery

After rollback:

1. **Refresh browser** (hard refresh: Cmd+Shift+R or Ctrl+Shift+R)
2. **Check all tabs** work in athlete page
3. **Verify no console errors**
4. **Confirm data loads correctly**

---

## 🎯 Prevention for Next Attempt

Before making changes:

1. **Commit current working state:**
   ```bash
   git add .
   git commit -m "checkpoint: working state before [change]"
   ```

2. **Test immediately after each change:**
   - Don't make multiple changes without testing
   - One component extraction = one test cycle

3. **Keep changes small:**
   - Extract one component at a time
   - Commit after each successful extraction

---

## 📞 Get Help

If stuck:

1. Check this file first
2. Review `REFACTOR-TESTING-CHECKLIST.md`
3. Ask in chat with exact error message
4. Include:
   - What you changed
   - What error you're seeing
   - Output of `git status`

---

## 🔐 Safety Net Reminder

**Your working code is safe on GitHub at commit 9374e44**

No matter what happens locally, you can always get back to working code:

```bash
git fetch origin
git reset --hard origin/main
```

---

**Last Updated:** 2025-11-09
