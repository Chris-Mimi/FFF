# Sessions 144–148: Achievement System (Full Feature)

**Date:** 2026-02-19 to 2026-02-21
**Model:** Opus 4.6
**Focus:** Progressive achievement/skill tree system — DB, coach management, athlete view, coach award flow, theme polish

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

## Phase 3 (Session 147) — Coach Award Flow + Mobile Polish

### Coach Award Flow
- **Award Achievement modal** — coach selects athlete → sees their achievement progress → awards specific tier
- 4 new API routes:
  - `api/achievements/athletes` — list athletes for selection
  - `api/achievements/athlete-records` — get athlete's achievement progress
  - `api/achievements/definitions` — get all definitions
  - `api/achievements/award` — award achievement + optional push notification
- Push notification support: sends notification to athlete when coach awards achievement
- Added `achievement_awarded` preference to notification system

### UI Updates
- Ocean Teal theme applied to athlete Records page achievements section
- Trophy scroll-to-achievements shortcut on Records page
- Mobile polish on achievement cards

---

## Phase 4 (Session 148) — Theme Polish (Charcoal + Emerald/Gold)

### Theme Iteration
- Built A/B/C theme switcher to compare options with user
- **Locked in Theme C:** charcoal background + emerald/gold accents
  - Unlocked achievements: teal background, gold border-2, gold stars/checkmark
  - Locked achievements: charcoal/grey
- Applied final theme to both athlete `AthletePageAchievementsTab` and coach `AchievementsTab`

---

## Files Changed

| File | Action | Phase |
|------|--------|-------|
| `database/20260219_achievements.sql` | NEW — Schema migration | 1 |
| `database/20260219_achievements_seed.sql` | NEW — Starter data | 1 |
| `types/achievements.ts` | NEW — Types + category constants | 1 |
| `components/coach/AchievementsTab.tsx` | NEW — Coach management view | 1, 3, 4 |
| `components/coach/AchievementDefinitionModal.tsx` | NEW — Create/edit modal | 1 |
| `app/coach/benchmarks-lifts/page.tsx` | MODIFIED — Added achievements tab | 1 |
| `components/athlete/AthletePageAchievementsTab.tsx` | NEW — Athlete achievements view + self-log | 2, 3, 4 |
| `components/athlete/AthletePageRecordsTab.tsx` | MODIFIED — Embedded achievements section + trophy shortcut | 2, 3, 4 |
| `components/coach/AwardAchievementModal.tsx` | NEW — Coach award flow modal | 3 |
| `app/api/achievements/athletes/route.ts` | NEW — List athletes endpoint | 3 |
| `app/api/achievements/athlete-records/route.ts` | NEW — Athlete progress endpoint | 3 |
| `app/api/achievements/definitions/route.ts` | NEW — Definitions endpoint | 3 |
| `app/api/achievements/award/route.ts` | NEW — Award + notify endpoint | 3 |
| `app/api/notifications/preferences/route.ts` | MODIFIED — Added achievement_awarded pref | 3 |
| `lib/notifications.ts` | MODIFIED — Achievement notification type | 3 |
| `hooks/usePushNotifications.ts` | MODIFIED — Achievement pref support | 3 |
| `components/ui/NotificationPrompt.tsx` | MODIFIED — Achievement pref toggle | 3 |
| `app/athlete/page.tsx` | MODIFIED — Minor update | 3 |

---

## Migrations Applied
- `database/20260219_achievements.sql` — Achievement tables + RLS + indexes
- `database/20260219_achievements_seed.sql` — 39 starter achievements
- `database/20260221_achievement_notification_pref.sql` — Added `achievement_awarded` column to `notification_preferences`
