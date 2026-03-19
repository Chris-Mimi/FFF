# Session 223 — Load 2 Labels + Score Save Investigation

**Date:** 2026-03-19
**Model:** Opus 4.6

---

## Accomplishments

### 1. Load 2 Visible Labels
- **Problem:** Coach score entry showed two identical "Load" input boxes when both Load and Load 2 were enabled.
- **Fix:** Added visible "L1" and "L2" labels before each input in `ScoringFieldInputs.tsx`. "L1" only appears when Load 2 is also enabled; otherwise the single load input has no prefix label.
- **File changed:** `components/athlete/logbook/ScoringFieldInputs.tsx`

### 2. Score Save Investigation
- **Problem:** Scores entered for 2 sessions on 2026-03-18 (17:15 and 18:30, workout "Ring Muscle-Up drills #26.1, TGU, T2R, V-Up, AKBS") were not persisted in the database.
- **Investigation:** Added temporary debug logging to `useScoreEntry.ts`. Confirmed:
  - The 9:30 session (CrossFit Open #26.3) scores were saved and load correctly.
  - The 17:15/18:30 sessions returned `existingResults: 0` from the API.
  - No scores exist in `wod_section_results` for that workout on that date.
- **Conclusion:** Save failed silently or was never triggered. Root cause unknown. Possibly related to Load 2 feature being introduced the same morning, but other workouts with Load 2 added worked correctly.
- **Action:** Monitoring for recurrence. Reminder set for ~Session 226-227.
- **Debug logging removed** after investigation.

---

## Next Steps
- Monitor score saves for recurrence of missing data
- Continue testing Load 2 on athlete page
