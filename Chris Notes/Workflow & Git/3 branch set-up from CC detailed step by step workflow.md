Three-Branch Fail-Safe Workflow Setup

  Current State:
  - main at 055390d (docs updates after 9374e44 working code)
  - Working baseline: 9374e44 (3-state workout system - verified functional)
  - Current branch: refactor/athlete-page-split

  ---
  Step-by-Step Execution Plan

  Phase 1: Verify and Reset Main Branch

  # 1. Switch to main branch
  git checkout main

  # 2. Verify main is at stable commit (9374e44 or later docs commits)
  git log --oneline -5

  # 3. If main has diverged, reset to last known working commit
  # (Only if needed - main looks stable currently)
  # git reset --hard 9374e44

  # 4. Ensure main is synced with GitHub
  git pull origin main
  git push origin main

  Phase 2: Create Augment Refactor Branch

  # 5. Create augment-refactor branch from stable main
  git checkout -b augment-refactor main

  # 6. Push to GitHub to establish remote tracking
  git push -u origin augment-refactor

  # 7. Verify branch created successfully
  git branch -vv

  Phase 3: Augment Code Work (Execute in Augment)

  # 8. In Augment Code, open project and ensure on augment-refactor branch
  git status

  # 9. Augment performs structural refactor on athlete/page.tsx:
  #    - Split into component files
  #    - Remove unused imports
  #    - Clean up linting issues
  #    - Remove unused hooks

  # 10. After Augment completes, commit with specific format:
  git add app/athlete/
  git commit -m "[AUGMENT] Structural refactor app/athlete/page.tsx

  - Split into ProfileSection.tsx
  - Split into BenchmarkSection.tsx
  - Split into ForgeBenchmarkSection.tsx
  - Split into LiftRecordsSection.tsx
  - Split into WorkoutLogSection.tsx
  - Removed unused imports
  - Fixed linting issues

  Augment Code automated refactor"

  # 11. Push augment-refactor to GitHub
  git push origin augment-refactor

  Phase 4: Create Claude Review Branch

  # 12. Create claude-review branch from augment-refactor
  git checkout augment-refactor
  git checkout -b claude-review

  # 13. Push to GitHub
  git push -u origin claude-review

  # 14. Verify branch structure
  git log --oneline --graph --all --decorate -10

  Phase 5: Claude Review Work (Execute in Claude Code)

  # 15. In Claude Code, ensure on claude-review branch
  git status

  # 16. Claude reviews each extracted component:
  #     - ProfileSection.tsx: props, state, context flows
  #     - BenchmarkSection.tsx: hook usage, data fetching
  #     - ForgeBenchmarkSection.tsx: logic validation
  #     - LiftRecordsSection.tsx: semantic correctness
  #     - WorkoutLogSection.tsx: state management

  # 17. For each component reviewed, commit semantic fixes:
  git add components/ProfileSection.tsx
  git commit -m "[CLAUDE] Review ProfileSection.tsx - fix useState hook dependency"

  # 18. Run dev server to test
  npm run dev
  # Test in browser: http://localhost:3000/athlete

  # 19. Run TypeScript check
  npx tsc --noEmit

  # 20. After all components reviewed and working, push to GitHub
  git push origin claude-review

  Phase 6: Verification and Merge

  # 21. Create session log (in project root or docs/)
  # Document: Component | Issues Found | Fixes Applied | Status

  # 22. Test complete application flow (use REFACTOR-TESTING-CHECKLIST.md)
  # All 8 tabs, all features, no console errors

  # 23. After human approval, merge claude-review → main
  git checkout main
  git merge --no-ff claude-review -m "refactor: complete athlete page component extraction

  Augment: Structural refactor and component splitting
  Claude: Logic validation and semantic fixes
  Verified: All tabs functional, no errors

  Closes refactor/athlete-page-split"

  # 24. Push main to GitHub
  git push origin main

  # 25. Tag the successful refactor
  git tag -a v1.0-athlete-refactor -m "Stable athlete page component architecture"
  git push origin v1.0-athlete-refactor

  Phase 7: Cleanup (After Successful Merge)

  # 26. Delete working branches (optional, after verification)
  git branch -d augment-refactor
  git branch -d claude-review
  git branch -d refactor/athlete-page-split

  # 27. Delete remote branches (optional)
  git push origin --delete augment-refactor
  git push origin --delete claude-review
  git push origin --delete refactor/athlete-page-split

  ---
  Emergency Rollback (If Issues Arise)

  # If problems discovered after merge:
  git checkout main
  git reset --hard 9374e44
  git push --force-with-lease origin main

  # If problems during claude-review:
  git checkout claude-review
  git reset --hard augment-refactor  # Undo Claude changes
  # OR
  git checkout augment-refactor      # Abandon claude-review entirely

  # If problems during augment-refactor:
  git checkout main                  # Return to stable
  git branch -D augment-refactor    # Delete broken branch
  git checkout -b augment-refactor main  # Start fresh

  ---
  Quick Reference: Branch Roles

  | Branch           | Purpose           | Agent   | Allowed Changes                       |
  |------------------|-------------------|---------|---------------------------------------|
  | main             | Stable production | None    | Merge only                            |
  | augment-refactor | Structure         | Augment | Component splitting, imports, linting |
  | claude-review    | Logic             | Claude  | Props, hooks, state, semantic fixes   |
