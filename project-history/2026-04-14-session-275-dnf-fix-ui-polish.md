# Session 275 — DNF Fix + UI Polish (2026-04-14)

## Changes

### 1. Fixed Duplicate DNF Button (Bug)
- **Problem:** DNF button appeared twice in coach score entry — once next to athlete name (`AthleteScoreRow`) and once at end of row (`ScoringFieldInputs`).
- **Fix:** Added `hideDnf` prop to `ScoringFieldInputs`. `AthleteScoreRow` passes `hideDnf` to suppress the nested button.
- Files: `components/athlete/logbook/ScoringFieldInputs.tsx`, `components/coach/score-entry/AthleteScoreRow.tsx`

### 2. Widened Name Column in Score Entry
- **Problem:** Athlete names were half-covered by the DNF button in the coach score entry row.
- **Fix:** Increased name column width: `w-24 min-w-[6rem]` → `w-32 min-w-[8rem]` (without tracks), `w-36 min-w-[9rem]` → `w-44 min-w-[11rem]` (with tracks).
- File: `components/coach/score-entry/AthleteScoreRow.tsx`

### 3. Added Whiteboard Names
- Added `Moritz` (M) and `Bettina` (F) to `WHITEBOARD_GENDERS` map.
- File: `utils/leaderboard-utils.ts`

### 4. Leaderboard Workout Selector Dropdown Styling
- **Problem:** Dropdown was grey (`bg-gray-600`) — same as workout content blocks, hard to differentiate.
- **Fix:** Changed to dark teal (`bg-[#0b4f5c]`) with white divider lines (`divide-white/20`), hover state `bg-[#0e6270]`.
- File: `components/athlete/LeaderboardView.tsx`

### 5. Custom Benchmark Dropdown
- **Problem:** Native `<select>` for benchmark picker was too large on mobile (OS-rendered).
- **Fix:** Replaced with custom `BenchmarkDropdown` component matching `WodDropdown` pattern — dark teal, grouped Standard/Forge sections with headers, scrollable `max-h-60`.
- File: `components/athlete/LeaderboardView.tsx`

## Files Changed
- `components/athlete/logbook/ScoringFieldInputs.tsx` — added `hideDnf` prop
- `components/coach/score-entry/AthleteScoreRow.tsx` — pass `hideDnf`, wider name column
- `utils/leaderboard-utils.ts` — Moritz + Bettina whiteboard genders
- `components/athlete/LeaderboardView.tsx` — dropdown dark teal styling + custom benchmark dropdown
