# Plan: Progressive Achievement System (Skill Tree)

## Context
Athletes need motivation beyond raw numbers. A progressive achievement system celebrates "firsts" at every level — a first push-up is just as valuable as a first muscle-up. Coaches define achievement branches with unlockable tiers (e.g. Push-Up → 1st → 5 unbroken → 10 unbroken). Both coaches and athletes can award/log achievements.

## Design Decisions
- **Coach UI:** New "Achievements" tab in existing Toolkit page (`/coach/benchmarks-lifts`)
- **Athlete UI:** New "Achievements" tab on athlete page
- **Award flow:** Both coach and athlete can award
- **Scope:** Movement firsts/skill tree only (no attendance streaks)

---

## Database Schema (2 tables)

### Table: `achievement_definitions`
Coach-managed achievement tree. Each row is one tier of one branch.

```sql
CREATE TABLE achievement_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- e.g. "First Strict Push-Up"
  category TEXT NOT NULL,                -- e.g. "Bodyweight", "Gymnastics", "Olympic Lifting", "Skills"
  branch TEXT NOT NULL,                  -- groups tiers, e.g. "Push-Up", "Muscle-Up", "Wall Ball"
  tier INTEGER NOT NULL DEFAULT 1,       -- 1, 2, 3... (sequential within branch)
  description TEXT,                      -- optional detail, e.g. "5 unbroken strict push-ups"
  display_order INTEGER DEFAULT 0,       -- ordering within category
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch, tier)                   -- one definition per branch+tier
);

-- RLS: everyone reads, coach writes (via service role or open for now)
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view definitions" ON achievement_definitions FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage definitions" ON achievement_definitions FOR ALL USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_achievement_defs_category ON achievement_definitions(category);
CREATE INDEX idx_achievement_defs_branch ON achievement_definitions(branch, tier);
```

### Table: `athlete_achievements`
Records which athlete unlocked which achievement and when.

```sql
CREATE TABLE athlete_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,
  achieved_date DATE NOT NULL DEFAULT CURRENT_DATE,
  awarded_by UUID REFERENCES members(id),  -- NULL = self-logged, otherwise coach who awarded
  notes TEXT,                               -- optional context
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)           -- can only unlock each achievement once
);

ALTER TABLE athlete_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Athletes view own achievements" ON athlete_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Athletes can log own achievements" ON athlete_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Athletes can delete own achievements" ON athlete_achievements FOR DELETE USING (auth.uid() = user_id);
-- Coach policies: coach can insert/view for any athlete (needs coach role check or open authenticated)
CREATE POLICY "Coach can view all achievements" ON athlete_achievements FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Coach can award achievements" ON athlete_achievements FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_athlete_achievements_user ON athlete_achievements(user_id);
CREATE INDEX idx_athlete_achievements_achievement ON athlete_achievements(achievement_id);
```

---

## Implementation Plan (3 phases across sessions)

### Phase 1: Database + Coach Management (Session 144)

**Step 1: Create migration SQL**
- Create `database/20260219_achievements.sql` with both tables + RLS + indexes
- Run in Supabase SQL Editor (after `npm run backup`)

**Step 2: Add types**
- File: `types/achievements.ts` (NEW)
```typescript
export interface AchievementDefinition {
  id: string;
  name: string;
  category: string;
  branch: string;
  tier: number;
  description?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface AthleteAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  achieved_date: string;
  awarded_by?: string;
  notes?: string;
  created_at: string;
  achievement?: AchievementDefinition; // joined
}
```

**Step 3: Coach "Achievements" tab in Toolkit**
- File: `app/coach/benchmarks-lifts/page.tsx` — add "Achievements" tab to existing tab system
- File: `components/coach/AchievementsTab.tsx` (NEW) — main coach management view
  - List achievements grouped by category → branch → tier
  - Add/edit/delete definitions
  - Visual tree: branch name with tier badges (⭐ ⭐⭐ ⭐⭐⭐)
- File: `components/coach/AchievementDefinitionModal.tsx` (NEW) — create/edit modal
  - Fields: name, category (dropdown), branch (text/autocomplete from existing), tier (auto-increment), description
  - Category presets: "Bodyweight", "Gymnastics", "Olympic Lifting", "Skills", "Endurance"

**Step 4: Seed starter data**
- Provide a sensible default set of ~20-30 achievements across categories
- Coach can add/edit/delete freely

### Phase 2: Athlete Achievement Tab (Session 145)

**Step 5: Athlete "Achievements" tab**
- File: `app/athlete/page.tsx` — add 'achievements' to TabName + tabs array
- File: `components/athlete/AthletePageAchievementsTab.tsx` (NEW)
  - Visual grid grouped by category
  - Each branch shows tiers: unlocked (highlighted + date) vs locked (greyed out)
  - Next unlockable tier highlighted differently (available to claim)
  - Tap unlocked achievement → shows date, who awarded, notes

**Step 6: Athlete self-log flow**
- Athlete taps a locked (but next-in-sequence) tier → confirm modal → logs achievement
- Can only unlock tier N+1 if tier N is already unlocked (sequential progression)
- Date defaults to today, can edit

### Phase 3: Coach Award Flow (Session 145 or 146)

**Step 7: Coach awards achievement to athlete**
- From coach's Members page or a dedicated view
- Select athlete → select achievement → award with optional note
- Could also be accessible from within the Achievements tab (select athlete dropdown)

**Step 8: Push notification (optional)**
- When coach awards achievement → push notification to athlete
- Reuse existing push notification infrastructure (Sessions 130-134)

---

## Files Summary

| File | Action | Phase |
|------|--------|-------|
| `database/20260219_achievements.sql` | CREATE | 1 |
| `types/achievements.ts` | CREATE | 1 |
| `app/coach/benchmarks-lifts/page.tsx` | MODIFY (add tab) | 1 |
| `components/coach/AchievementsTab.tsx` | CREATE | 1 |
| `components/coach/AchievementDefinitionModal.tsx` | CREATE | 1 |
| `app/athlete/page.tsx` | MODIFY (add tab) | 2 |
| `components/athlete/AthletePageAchievementsTab.tsx` | CREATE | 2 |

## Patterns to Reuse
- **Toolkit tab system:** `app/coach/benchmarks-lifts/page.tsx` — existing tab pattern
- **Coach definition modal:** `components/coach/ConfigureForgeBenchmarkModal.tsx` — form modal pattern
- **Athlete tab component:** `components/athlete/AthletePageForgeBenchmarksTab.tsx` — tab structure
- **Athlete page tabs:** `app/athlete/page.tsx` lines 191-258 — tab definitions + rendering

## Verification
1. Coach: Create achievement branch "Push-Up" with 3 tiers in Toolkit
2. Coach: Verify branches display grouped by category with tier progression
3. Athlete: See "Achievements" tab with all defined achievements
4. Athlete: Self-log tier 1 of Push-Up → verify it shows as unlocked with date
5. Athlete: Verify tier 2 is now available but tier 3 is still locked
6. Coach: Award tier 2 to athlete → verify it appears on athlete's tab
7. Verify sequential unlock enforcement (can't skip tiers)

## Starter Achievement Data (Seed)

**Bodyweight:**
- Push-Up: 1st Strict → 5 Unbroken → 10 Unbroken → 20 Unbroken
- Pull-Up: 1st Strict → 5 Unbroken → 10 Unbroken
- Dip: 1st Ring Dip → 5 Unbroken → 10 Unbroken
- Rope Climb: 1st Rope Climb → Legless Rope Climb

**Gymnastics:**
- Kipping Pull-Up: 1st Kipping → 10 Unbroken
- Toes-to-Bar: 1st T2B → 10 Unbroken
- Muscle-Up: 1st Ring MU → 3 Unbroken → 1st Bar MU
- Handstand: 1st HS Hold (wall) → Freestanding HS → 1st HS Walk → 15m HS Walk
- Pistol Squat: 1st Pistol → 5 Alternating

**Olympic Lifting:**
- Snatch: 1st Power Snatch → 1st Squat Snatch → Bodyweight Snatch
- Clean & Jerk: 1st Power Clean → 1st Squat Clean → 1st Clean & Jerk

**Skills:**
- Double-Under: 1st DU → 10 Unbroken → 50 Unbroken
- Wall Ball (Rx): 1st Rx → 10 Unbroken → Karen (150 Rx)
- Box Jump: 1st 24"/20" → 30"/24"
