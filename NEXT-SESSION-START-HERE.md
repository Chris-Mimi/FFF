# 🚀 Next Session: Start Phase 3 Refactoring

**Date Created:** 2026-01-31 (Session 85)
**For:** Chris (when opening project on his user profile)

---

## ⚡ IMMEDIATE ACTION: Start Phase 3

**Context:** We're refactoring AthletePageLogbookTab.tsx to reduce from 1,900 → 300-350 lines

**Progress So Far:**
- ✅ Phase 1 Complete: ScoringFieldInputs component (293 lines removed)
- ✅ Phase 2 Complete: Custom hooks extraction (340 lines removed)
- **Current:** 1,267 lines (33% reduction complete)
- **Target:** 300-350 lines (82% total reduction)

---

## 📋 Phase 3 Tasks

**Goal:** Extract utility functions to `utils/logbook/` directory
**Target:** Remove ~180 lines from main component

**Create 5 Utility Files:**

1. **utils/logbook/dateNavigation.ts** (40 lines)
   - Pure date arithmetic functions
   - calculatePreviousDay, calculateNextDay, calculatePreviousWeek, etc.
   - Used by useAthleteNavigation hook

2. **utils/logbook/photoHandlers.ts** (50 lines)
   - getWeekNumber (ISO week calculation)
   - Photo navigation logic
   - Used by usePhotoHandling hook

3. **utils/logbook/formatters.ts** (40 lines)
   - formatLift (reps, percentages)
   - formatBenchmark (with scaling)
   - formatForgeBenchmark (with scaling)
   - Consolidate existing format helpers

4. **utils/logbook/savingLogic.ts** (30 lines)
   - saveSectionResult (upsert logic)
   - saveAllResults (unified dispatcher)

5. **utils/logbook/loadingLogic.ts** (20 lines)
   - loadSectionResults
   - loadLiftResultsToSection

**After Creating Files:**
- Update hooks from Phase 2 to import these utilities
- Remove utility functions from main component
- Test all functionality
- Goal: Main component → ~1,100 lines (from 1,267)

---

## 📖 Reference Documents

**Full Refactoring Plan:**
- Location: `~/.claude/plans/graceful-squishing-kitten.md`
- Contains detailed implementation steps for all 4 phases

**Previous Session:**
- `project-history/2026-01-31-session-85-logbook-phase-2-refactoring.md`
- Details of Phase 2 custom hooks extraction

**Active Context:**
- `memory-bank/memory-bank-activeContext.md`
- Updated with Phase 3 as next priority

---

## 🎯 Success Criteria

- [ ] 5 utility files created in utils/logbook/
- [ ] Hooks updated to import utilities
- [ ] Main component utilities removed
- [ ] Build successful (npm run build)
- [ ] All functionality tested and working
- [ ] Line count: ~1,100 lines (from 1,267)

---

## 💡 Notes for Chris

**Setup Reminder:**
You'll need to set up the `restart` alias on your profile:
```bash
echo "alias restart='kill -9 \$(lsof -t -i :3000-3009) 2>/dev/null; npm run dev'" >> ~/.zshrc
source ~/.zshrc
```

Then you can use:
```bash
restart
```

To kill dev server and restart in one command.

**Instructions saved in:**
`Chris Notes/AA frequently used files/free-ports info & help`

---

**DELETE THIS FILE** after starting Phase 3 work.
