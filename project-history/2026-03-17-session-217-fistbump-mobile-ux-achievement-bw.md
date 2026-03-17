# Session 217 — Fist Bump Mobile UX + Achievement Bodyweight Calculator (2026-03-17)

## Accomplishments

1. **Fist bump mobile UX reworked** — Three issues fixed:
   - Android: icon/count was clipped by `overflow-hidden` on table container → changed to `overflow-visible`
   - Android: tapping removed fist bump instead of showing reactors → reversed interaction: tap (not reacted) gives fist bump, tap (already reacted) shows who gave them, long-press (400ms) removes
   - iPhone: reactor popover went off-screen right → anchored `right-0` with `max-w-[80vw]`, `whitespace-normal`, dynamic repositioning, outside-tap dismissal

2. **Leaderboard table tightened for mobile** — Reduced padding on Scale column (`px-3 w-14` → `px-1 w-12`), Date column (`px-3 w-20` → `px-1 w-16`), Actions column (`px-3 w-16 gap-1` → `px-1 w-14 gap-0.5`). Applied to both WOD and Benchmark leaderboard tables.

3. **CAP score format fix** — Removed superfluous "+" sign after CAP in time-capped leaderboard results. `CAP +30 reps` → `CAP 30 reps`. The "+" between rounds and reps is kept as that's the standard separator.

4. **Achievement bodyweight calculator** — Achievements with "@ N% Bodyweight" in the name now show the calculated target weight in kg based on the athlete's profile weight. Displayed inline on the badge as a small `(42.5 kg)` tag. Also shown in tooltip on desktop. Fetches `weight_kg` from `athlete_profiles` table alongside existing achievement data.

5. **Feature overview updated** — Added fist bump UX details and bodyweight calculator to `Forge-Feature-Overview.md`.

## Files Modified
- `components/athlete/FistBumpButton.tsx` — Complete interaction rework (long-press, pointer events, popover positioning, outside-tap dismissal)
- `components/athlete/LeaderboardView.tsx` — `overflow-visible`, tighter padding on Scale/Date/Actions columns (both tables)
- `utils/leaderboard-utils.ts` — Removed "+" after CAP in `formatResult`
- `components/athlete/AthletePageAchievementsTab.tsx` — Added `parseBodyweightMultiplier()`, fetches `weight_kg`, shows calculated kg inline
- `Chris Notes/Forge app documentation/Forge-Feature-Overview.md` — Updated fist bump and achievement descriptions

## Key Decisions
- Long-press to remove fist bump (not tap) — prevents accidental removal, most users would not want to undo a fist bump
- Bodyweight calculation shown inline on badge (not just tooltip) — tooltips don't work on mobile tap
- Regex pattern `/@\s*(\d+)%\s*Bodyweight/i` matches achievement name format "@ 50% Bodyweight"
