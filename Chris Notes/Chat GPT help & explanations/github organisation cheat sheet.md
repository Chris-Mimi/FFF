# Git Branch Management Cheat Sheet

## ✅ Branch Setup for Current Project

### 1. Save all current progress
```bash```
git add .
git commit -m "Save all current progress before branch reorg"
### 2. Rename current working branch

Copy code
git branch -m augment-refactor main-refactor
### 3. Rename old main branch as backup

Copy code
git branch -m main main-legacy
### 4. Switch to your new main working branch

Copy code
git checkout main-refactor
### 5. Push both branches to GitHub

Copy code
git push origin main-refactor
git push origin main-legacy

Tip: On GitHub, you can set main-refactor as your default branch in Settings → Branches → Default branch.

## ✅ General Branch Commands
- Check current branch & status
```bash```

git status
git branch
- Create a new branch

git checkout -b feature/new-component
- Switch branches

git checkout main-refactor
git checkout feature/new-component
- Save work temporarily (stash)

git stash
- restore later

git stash pop
- Push a branch to GitHub


git push origin branch-name
- Delete a branch





## 🌳 Branch Diagram (Visual Reference)

```text
GitHub Remote
├─ main-legacy       <- Backup of original 140kb AthletePage
├─ main-refactor     <- New stable working branch with refactored components
├─ feature/new-tab   <- Example feature branch for adding a tab
├─ bugfix/logbug     <- Example bugfix branch
└─ archive/old-refactor <- Archived old experimental branch

Local Workspace
├─ main-refactor      <- Current working branch
├─ main-legacy       <- Local copy of backup branch
├─ feature/new-tab   <- Checked out feature branch
└─ stash             <- Temporary saved changes
```
## Explanation
- main-legacy

Never edit this branch.
Pure backup of the original code.
Can restore files from here if needed.
- main-refactor

Your “default” branch going forward.
Contains the cleaned-up AthletePage components.

- feature/ & bugfix/ branches

Short-lived branches for new features or fixes.

Merge into main-refactor when done.

- archive/ branches

Keep any old branches you want for historical reference.

Do not edit; only reference.

Stash

Use git stash to temporarily save uncommitted changes without committing.

Restore with git stash pop.

Note: Each local branch can track a corresponding remote branch on GitHub, making switching and merging safe and predictable.



Git Workflow Cheat Sheet for Branch Management
1. Check current branch
bash
Copy code
git status
git branch
Confirms which branch you’re on before making changes.

2. Create a new branch
bash
Copy code
git checkout -b <branch-name>
Example:

bash
Copy code
git checkout -b augment-refactor
3. Switch branches
bash
Copy code
git checkout <branch-name>
Example:

bash
Copy code
git checkout main
4. Save uncommitted changes
bash
Copy code
git add .
git commit -m "Save progress"
Or temporarily stash changes if not ready to commit:

bash
Copy code
git stash
5. Apply stashed changes
bash
Copy code
git stash pop
Restores your stashed changes and removes them from the stash list.

If you want to keep them in stash:

bash
Copy code
git stash apply
6. Update local branch from remote
bash
Copy code
git pull origin <branch-name>
Makes sure your branch is up to date with GitHub.

7. Commit changes
bash
Copy code
git add <file-or-folder>
git commit -m "Descriptive message"
Example (per component file):

bash
Copy code
git add components/athlete/AthletePageWorkoutsTab.tsx
git commit -m "Augment TSX refactor: AthletePageWorkoutsTab"
8. Push changes to GitHub
bash
Copy code
git push origin <branch-name>
9. Merge branches
Switch to target branch:

bash
Copy code
git checkout main
Merge source branch:

bash
Copy code
git merge augment-refactor
If conflicts occur, Git will mark them. Resolve conflicts, then commit the merge.

# 10. Archiving a branch (safe cleanup) #

Once a feature or refactor is complete and merged, you can archive the branch to keep the repo clean.

Locally:

bash
Copy code
git branch -d <branch-name>      # Safely delete the branch locally if merged
git branch -D <branch-name>      # Force delete even if not merged (use with caution)
Remotely on GitHub:

bash
Copy code
git push origin --delete <branch-name>   # Removes the branch from the remote list
Important: Deleting/archiving a branch does not delete the commits. They remain in the repo’s history if merged or referenced elsewhere.

Tip: Keep a backup branch or tag if you want to preserve a snapshot for future reference:

bash
Copy code
git tag archive/<branch-name>
git push origin archive/<branch-name>

✅ Tips:
Do work → commit per component
Test locally → npm run dev
Push branch → git push origin augment-refactor
Review & fix → commit changes
Merge to main → test everything
Archive old branch → keep history safe
Always pull first to avoid conflicts.
Commit often with meaningful messages.
Stash if switching branches mid-work.
Keep main stable; do experimental work on feature branches.
Component files can be committed individually for safety.
