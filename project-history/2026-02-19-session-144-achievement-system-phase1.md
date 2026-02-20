# Sessions 144–145: Achievement System Phases 1 & 2

**Date:** 2026-02-19 / 2026-02-20
**Model:** Opus 4.6
**Focus:** Progressive achievement/skill tree system for athletes

---

## Phase 1 (Session 144) — DB + Coach Management

### Database (2 new tables)
- `achievement_definitions` — Coach-managed skill tree. Each row = one tier of one branch (e.g. Push-Up Tier 1, Tier 2). RLS: everyone reads, authenticated writes.
- `athlete_achievements` — Records which athlete unlocked which achievement. RLS: athletes see/log own, coaches see/award all. Unique constraint prevents duplicate unlocks.

### Coach UI
- **Achievements tab** added to Toolkit page (`/coach/benchmarks-lifts`) — amber color theme
- Self-contained component with own data fetching (like ProgrammingNotesTab)
- Achievements grouped by category → branch → tier with collapsible categories
- Tier badges show stars (★, ★★, ★★★) with hover edit/delete
- Add/edit modal with branch autocomplete from existing branches + auto-tier increment
- Delete uses project's `confirm()` pattern (promise-based global ConfirmDialog)
- Branches sorted alphabetically within categories (no reliance on display_order)

### Seed Data
- 39 starter achievements across 4 categories: Bodyweight, Gymnastics, Olympic Lifting, Skills
- 14 branches covering core CrossFit movements

---

## Phase 2 (Session 145) — Athlete Achievements View + Self-Log

### Athlete UI
- **Achievements section** embedded as collapsible section in Records tab (not a separate top-level tab — avoids crowding the nav)
- Visual grid grouped by category → branch → tiers with progress bar (X/total unlocked)
- Three tier states:
  - **Unlocked** (amber highlight + checkmark) — tap for details modal (date, notes, awarded by)
  - **Next claimable** (dashed amber border) — tap to claim with date picker + notes
  - **Locked** (greyed + lock icon) — disabled, "complete previous tiers first"
- **Sequential progression enforced** — can only claim tier N+1 after tier N is unlocked
- Claim modal with date picker (defaults today) + optional notes
- Detail modal for unlocked achievements with Remove option (confirm dialog)
- Dark Ocean Teal background theme to match Records page style
- Category expand/collapse with per-category unlock counts

### Design Decision
- Initially built as separate top-level "Achievements" tab, then moved to Records tab as a collapsible section per user feedback — better UX with fewer top-level tabs

---

## Files Changed

| File | Action | Phase |
|------|--------|-------|
| `database/20260219_achievements.sql` | NEW — Schema migration | 1 |
| `database/20260219_achievements_seed.sql` | NEW — Starter data | 1 |
| `types/achievements.ts` | NEW — Types + category constants | 1 |
| `components/coach/AchievementsTab.tsx` | NEW — Coach management view | 1 |
| `components/coach/AchievementDefinitionModal.tsx` | NEW — Create/edit modal | 1 |
| `app/coach/benchmarks-lifts/page.tsx` | MODIFIED — Added achievements tab | 1 |
| `components/athlete/AthletePageAchievementsTab.tsx` | NEW — Athlete achievements view + self-log | 2 |
| `components/athlete/AthletePageRecordsTab.tsx` | MODIFIED — Embedded achievements section | 2 |

---

## Next Steps (Phase 3)
- Coach award flow: select athlete → select achievement → award with optional note
- Optional push notification when coach awards achievement
- Color tweaking on athlete achievement cards (currently functional, polish later)
