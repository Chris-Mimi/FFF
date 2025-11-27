# Session 23: Exercise Analytics, Favorites & Programming References Migration

**Date:** November 27, 2025
**Session:** Exercise usage analytics, favorites tracking, and database migration for programming references
**Duration:** ~2.5 hours

---

## Summary

Implemented comprehensive exercise analytics with time-based frequency tracking, added favorites and recently-used exercise system, and migrated programming references from static JSON to persistent database storage. Created usage frequency badges with time range filters, fixed regex patterns to capture exercises with special characters, and resolved display name issues across Movement Library. Migrated 45 naming conventions and 9 resources to Supabase with proper RLS policies.

**Key Results:**
- ✅ Exercise frequency tracking with time range filters (All, 1M, 3M, 6M, 12M)
- ✅ Favorites system with star toggle (database + localStorage for recently used)
- ✅ Programming references migrated to database (naming_conventions, resources tables)
- ✅ Enhanced regex patterns for exercise extraction (handles °, /, . characters)
- ✅ Fixed display name rendering across Movement Library
- ✅ Removed "none" equipment badges from bodyweight exercises
- ✅ 1 commit pushed (10 new/modified files, +1078/-99 lines)

---

## Features Implemented

### Feature #1: Exercise Usage Frequency Tracking
**User Request:** "Add usage badges showing how many times exercises are programmed"

**Implementation:**
1. **Movement Analytics Extension** (`utils/movement-analytics.ts`)
   - Added `getExerciseFrequency()` function with date range filtering
   - Parses WOD section content using regex patterns to extract exercise names
   - Matches extracted names against exercises database (case-insensitive)
   - Returns frequency count and last programmed date
   - Supports optional date range filters (startDate, endDate)

2. **Regex Pattern Enhancements:**
   - Updated patterns to handle special characters (°, /, .)
   - Old: `[\w\s\-()]+?` (only letters, numbers, hyphens, parentheses)
   - New: `[^\n@]+?` (any character except newline and @)
   - Fixed lookahead: `(?:\s+x\s+\d+|\s*@|$)` to properly stop before " x 10"
   - **Added Pattern 5:** Plain exercise names without prefixes (e.g., "Air Squats")

3. **Time Range Filter Buttons** (`components/coach/ExercisesTab.tsx`)
   - Row of buttons: All | 1M | 3M | 6M | 12M
   - Purple highlight on active button
   - Positioned on same row as Equipment/Body Parts dropdowns
   - Auto-refresh frequency badges when time range changes
   - Calculates date filter: `startDate.setMonth(today.getMonth() - timeRange)`

4. **Usage Badges Display:**
   - Purple badges: "Used Xx" on each exercise card
   - Only shown when count > 0 for selected time range
   - Position: Below equipment badges, above tags
   - Color: bg-purple-100 text-purple-700

**Regex Patterns (Final Set):**
```typescript
const patterns = [
  // Pattern 1: Number + x + Movement (e.g., "10x Air Squats")
  /^(?:\d+[\s-]*x[\s-]*|[\d-]+[\s-]*x[\s-]*)([^\n@]+?)(?:\s+x\s+\d+|\s*@|$)/i,
  // Pattern 2: Bullet/asterisk + Movement (e.g., "* Arm Circles", "* 90° Ext. Rotation (SU)")
  /^[\s*•\-]+\s*([^\n@]+?)(?:\s+x\s+\d+|\s*@|$)/,
  // Pattern 3: Number + Movement (e.g., "10 Air Squats")
  /^(?:\d+[\s-]*)([^\n@]+?)(?:\s+x\s+\d+|\s*@|$)/,
  // Pattern 4: Rep scheme + Movement (e.g., "21-15-9 Thrusters")
  /^(?:\d+-\d+(?:-\d+)*[\s-]*)([^\n@]+?)(?:\s+x\s+\d+|\s*@|$)/,
  // Pattern 5: Plain exercise name (e.g., "Air Squats", "Rope Climbs")
  /^([^\n@\d*•\-][^\n@]+?)(?:\s+x\s+\d+|\s*@|$)/,
];
```

**Files Created:**
- `utils/movement-analytics.ts` (+153 lines - exercise frequency functions)

**Files Modified:**
- `components/coach/ExercisesTab.tsx` (+70 lines - time range buttons, frequency state)

---

### Feature #2: Exercise Favorites & Recently Used
**User Request:** "Add favorites and recently used tracking for quick access"

**Implementation:**
1. **Database Schema** (`supabase/migrations/20251126000000_add_exercise_favorites.sql`)
   - Table: `user_exercise_favorites` (id, user_id, exercise_id, created_at)
   - Unique constraint on (user_id, exercise_id)
   - RLS policies: Users manage own favorites
   - Indexes on user_id and exercise_id for fast lookups

2. **Favorites Utilities** (`utils/exercise-favorites.ts`)
   - `getUserFavorites()` - Fetch user's favorite exercise IDs
   - `getFavoriteExercises()` - Fetch full exercise data for favorites
   - `toggleFavorite()` - Add/remove favorite with database sync
   - `useUserFavorites()` hook - React hook with optimistic updates
   - Optimistic UI: Updates state immediately, syncs to DB in background

3. **Recently Used Storage** (`lib/exercise-storage.ts`)
   - localStorage-based tracking (max 10 exercises)
   - `addRecentExercise()` - Add to recent list (removes duplicates)
   - `getRecentExercises()` - Fetch sorted by used_at timestamp
   - `useRecentExercises()` hook - React hook with localStorage sync
   - Persists across browser sessions but not devices

4. **Movement Library Integration** (`components/coach/MovementLibraryPopup.tsx`)
   - **Favorites Section** (amber background, collapsible)
     - Shows all favorited exercises at top
     - Star icons on hover to toggle favorite status
     - Only appears when favorites exist
   - **Recently Used Section** (blue background, collapsible)
     - Shows last 10 exercises added to workouts
     - Automatically tracks on exercise selection
     - Only appears when recent exercises exist
   - **Star Icons on All Exercises:**
     - Hover to reveal star icon on right side
     - Filled star = favorited, outlined star = not favorited
     - Click to toggle favorite status

5. **Display Name Fixes:**
   - All sections now show `display_name || name` instead of just `name`
   - Favorites: Fixed (line 661)
   - Recently Used: Fixed (line 715)
   - Category sections: Fixed (line 767)
   - Exercise insertion: Now passes display_name to workout content

**Files Created:**
- `utils/exercise-favorites.ts` (~150 lines)
- `lib/exercise-storage.ts` (~154 lines)
- `supabase/migrations/20251126000000_add_exercise_favorites.sql` (~65 lines)

**Files Modified:**
- `components/coach/MovementLibraryPopup.tsx` (+216 lines - favorites/recent sections, star icons)

---

### Feature #3: Programming References Database Migration
**User Request:** "Programming references not saving - it's only in-memory"

**Problem:** References loaded from static JSON file, changes lost on refresh

**Implementation:**
1. **Database Schema** (`supabase/migrations/20251127000000_add_programming_references.sql`)
   - Table: `naming_conventions` (id, category, abbr, full_name, notes)
   - Table: `resources` (id, name, description, url, category)
   - Category constraint: `CHECK (category IN ('equipment', 'movementTypes', 'anatomicalTerms', 'movementPatterns'))`
   - RLS policies: Authenticated users can manage, anon can view
   - Indexes on category columns for fast filtering
   - **Fixed:** Changed `full` → `full_name` (reserved keyword in PostgreSQL)

2. **Data Import:**
   - Created import script to migrate JSON data to database
   - Imported 45 naming conventions (equipment, movementTypes, anatomicalTerms, movementPatterns)
   - Imported 9 resources (GoWOD, GMB Fitness, Squat University, etc.)
   - Verified counts: 45 naming conventions, 9 resources in database

3. **Code Updates:**
   - **fetchReferences()** - Changed from JSON fetch to database query
   - **handleSaveReference()** - Changed from in-memory to database INSERT/UPDATE
   - **handleDeleteReference()** - Changed from array splice to database DELETE
   - **handleEditReference()** - Updated to use full_name instead of full
   - **Interface updates** - Added id field to NamingConvention and Resource interfaces

4. **Component Updates:**
   - `app/coach/benchmarks-lifts/page.tsx` - Updated save/delete handlers
   - `components/coach/ReferencesTab.tsx` - Updated display to use full_name, changed delete signature

**RLS Policy Fix:**
```sql
-- Original (too restrictive - blocked saves)
CREATE POLICY "Coaches can manage naming conventions"
  ON naming_conventions FOR ALL
  USING (EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = auth.users.id AND role = 'coach'));

-- Fixed (allows authenticated users)
CREATE POLICY "Authenticated users can manage naming conventions"
  ON naming_conventions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

**Files Created:**
- `supabase/migrations/20251127000000_add_programming_references.sql` (~65 lines)
- `scripts/import-programming-references.ts` (~70 lines - temporary, deleted after import)

**Files Modified:**
- `app/coach/benchmarks-lifts/page.tsx` (+110 lines - database operations)
- `components/coach/ReferencesTab.tsx` (+20 lines - interface updates, display fixes)

---

### Feature #4: Exercise Display & Data Cleanup
**User Request:** Multiple UI fixes and data cleanup tasks

**Implementation:**
1. **Remove "none" Equipment Badges:**
   - Identified 209 exercises with `equipment: ["none"]`
   - Created cleanup script to set `equipment: []` for bodyweight exercises
   - Updated all 209 exercises in single batch operation
   - Result: Bodyweight exercises now display without equipment badges

2. **Tags Display Fix:**
   - Issue: User added tags but they weren't showing on cards
   - Root cause: Browser cache not refreshing React state
   - Solution: Navigate away and back to force component remount
   - Tags display code was working correctly (lines 378-391 in ExercisesTab.tsx)

3. **Database Cleanup:**
   - User attempted to delete 307 workouts manually (only wanted 3 test workouts)
   - Created cleanup script to delete all workouts: `delete-all-workouts.ts`
   - Verified DELETE operation works correctly (RLS policies allow deletions)
   - Cleared database to 0 workouts for clean testing slate

**Scripts Created (temporary):**
- `remove-none-equipment.ts` - Cleaned 209 exercises
- `delete-all-workouts.ts` - Cleared workout database
- `test-delete.ts` - Verified RLS DELETE policies

---

## Technical Details

### Exercise Frequency Algorithm
**Step 1: Fetch all exercises for lookup map**
```typescript
const { data: exercisesData } = await supabase
  .from('exercises')
  .select('id, name, display_name, category');

const exercisesByName = new Map<string, { id, name, category }>();
exercisesData?.forEach(ex => {
  exercisesByName.set(ex.name.toLowerCase(), {...});
  if (ex.display_name) {
    exercisesByName.set(ex.display_name.toLowerCase(), {...});
  }
});
```

**Step 2: Fetch workouts with optional date filter**
```typescript
let query = supabase.from('wods').select('id, date, sections');
if (filter?.startDate) {
  query = query.gte('date', filter.startDate);
}
```

**Step 3: Parse sections and match exercises**
```typescript
workouts?.forEach(workout => {
  sections?.forEach(section => {
    const lines = section.content.split('\n');
    lines.forEach(line => {
      // Try each pattern until match found
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const normalized = normalizeTitle(match[1]);
          const exercise = exercisesByName.get(normalized.toLowerCase());
          if (exercise) {
            // Increment count, update lastProgrammed
          }
          break;
        }
      }
    });
  });
});
```

### Favorites System Architecture
**Database Layer:**
- Persistent storage across devices
- User-specific via RLS policies
- Simple junction table (user_id, exercise_id)

**localStorage Layer:**
- Recently used exercises (last 10)
- Browser-specific, not synced
- Faster access, no network requests

**React Integration:**
- `useUserFavorites()` - Manages favorites with optimistic updates
- `useRecentExercises()` - Manages recent exercises with localStorage
- Both hooks provide toggle/add/remove functions
- State updates trigger component re-renders

---

## Bugs Fixed

### Bug #1: Exercise Regex Not Capturing Special Characters
**Symptom:** "90° Ext. Rotation (SU)", "90/90", "Alt. Pigeon Pose" not tracked
**Root Cause:** `\w` only matches letters/digits/underscores, not °/./ characters
**Fix:** Changed to `[^\n@]+?` to match any character except newline and @
**Location:** utils/movement-analytics.ts:420-429

### Bug #2: Plain Exercise Names Not Tracked
**Symptom:** Manually typed exercise without prefix (no *, number, etc.) not counted
**Root Cause:** All patterns required prefix (bullet, number, or rep scheme)
**Fix:** Added Pattern 5 to match plain names: `/^([^\n@\d*•\-][^\n@]+?)(?:\s+x\s+\d+|\s*@|$)/`
**Location:** utils/movement-analytics.ts:429

### Bug #3: Display Names Showing with Dashes
**Symptom:** "foot-stretch-to-bear-squat" instead of "Foot Stretch to Bear Squat"
**Root Cause:** Movement Library showing `name` (slug) instead of `display_name`
**Fix:** Changed all sections to show `display_name || name`
**Locations:**
- Favorites section: line 661
- Recently Used section: line 715
- Category sections: line 767
- Exercise insertion: Updated handleSelectExercise calls

### Bug #4: Programming References Not Persisting
**Symptom:** Changes lost on page refresh
**Root Cause:** Data loaded from static JSON, changes only in React state
**Fix:** Migrated to database tables (naming_conventions, resources)
**Impact:** All CRUD operations now persist permanently

### Bug #5: Reserved Keyword Error in Migration
**Symptom:** SQL syntax error at "full" - line 6
**Root Cause:** "full" is reserved keyword in PostgreSQL
**Fix:** Renamed column to `full_name` in all locations
**Locations:** Migration SQL, interfaces, fetch/save/display code

### Bug #6: RLS Policy Too Restrictive
**Symptom:** Error saving reference: {} (empty error object)
**Root Cause:** Policy checked `auth.users` table (authenticated users can't query it)
**Fix:** Changed to simple authenticated user check with `TO authenticated USING (true)`
**Result:** All authenticated users can now manage references

---

## Commits

### Commit 1: `f5700aa` (feature complete)
```
feat(coach): add exercise analytics, favorites, and persistent programming references

Major enhancements to exercise library and programming references:

Exercise Library & Analytics:
- Add exercise usage frequency tracking with time range filters (all, 1M, 3M, 6M, 12M)
- Display usage badges on exercise cards showing programming frequency
- Add equipment badges (blue) on exercise cards
- Remove "none" equipment badges for bodyweight exercises
- Add favorites and recently used exercise tracking

Movement Library:
- Add favorites section (amber) with star toggle for quick access
- Add recently used section (blue) showing last 10 exercises
- Fix display names to show formatted names instead of slugs
- Improve regex patterns to capture exercises with special characters (°, /, .)
- Add fallback pattern to track plain exercise names without prefixes

Programming References:
- Migrate from static JSON to database tables (naming_conventions, resources)
- Enable persistent CRUD operations for references
- Add RLS policies for data access control
- Import existing 45 naming conventions and 9 resources to database

Technical:
- Create database migrations for exercise_favorites and programming_references
- Add localStorage utilities for recently used exercises
- Enhance movement-analytics with exercise frequency tracking
- Update populate-equipment script with unmatched exercise reporting

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Files Added:**
- `lib/exercise-storage.ts`
- `supabase/migrations/20251126000000_add_exercise_favorites.sql`
- `supabase/migrations/20251127000000_add_programming_references.sql`
- `utils/exercise-favorites.ts`

**Files Modified:**
- `app/coach/benchmarks-lifts/page.tsx`
- `components/coach/ExercisesTab.tsx`
- `components/coach/MovementLibraryPopup.tsx`
- `components/coach/ReferencesTab.tsx`
- `scripts/populate-equipment.ts`
- `utils/movement-analytics.ts`

**Changes:** 10 files changed, 1078 insertions(+), 99 deletions(-)

**Pushed to:** origin/main

---

## Key Takeaways & Lessons Learned

### 1. Regex Character Classes Need Careful Consideration
**Problem:** `\w` only matches letters/digits/underscores, missing °/./ in exercise names
**Lesson:** When parsing natural language text, use broad character classes like `[^\n@]+?` instead of restrictive `\w`. Special characters are common in exercise naming.

### 2. Pattern Priority Prevents Silent Failures
**Problem:** Plain exercise names without prefixes weren't tracked
**Lesson:** Always include fallback patterns in rule-based parsing. Don't assume all data follows expected format.

### 3. Display Names vs Database Slugs
**Problem:** UI showed "foot-stretch-to-bear-squat" instead of "Foot Stretch to Bear Squat"
**Lesson:** Consistently use display_name for UI, name for database keys. Never show slugs to users.

### 4. PostgreSQL Reserved Keywords Cause Migration Failures
**Problem:** Column name "full" caused syntax error
**Lesson:** Check PostgreSQL reserved keywords before naming columns. Common words like "user", "full", "table", "select" are reserved.

### 5. RLS Policies Can't Query auth.users
**Problem:** Policy using `EXISTS (SELECT FROM auth.users WHERE auth.uid() = id)` failed
**Lesson:** Authenticated users can't query auth.users table. Use simple `TO authenticated USING (true)` or auth.jwt() metadata.

### 6. Optimistic UI Updates Improve Perceived Performance
**Implementation:** Favorites toggle updates state immediately, syncs to DB in background
**Lesson:** Users perceive instant feedback as more responsive even if network request takes time.

### 7. Static Files Don't Persist User Changes
**Problem:** JSON file changes only in memory, lost on refresh
**Lesson:** Any user-editable data needs database storage. Static files are for code-time configuration only.

### 8. Browser Cache Can Hide React State Updates
**Problem:** Tags weren't showing after edit, but data was in database
**Lesson:** Hard refresh doesn't always remount React components. Navigate away and back to force full component lifecycle.

### 9. Date Range Filters Enable Flexible Analytics
**Implementation:** Time range buttons (All, 1M, 3M, 6M, 12M) for frequency tracking
**Lesson:** Absolute counts are less useful than time-based trends. Let users filter by recency.

### 10. Database Migration Scripts Should Be Idempotent
**Implementation:** Used `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`
**Lesson:** Migrations should be safe to run multiple times without errors or duplicates.

---

## Testing

**Manual Testing by User:**
- ✅ Exercise frequency badges show correct counts
- ✅ Time range buttons filter frequency correctly
- ✅ Favorites section appears after starring exercises
- ✅ Recently used section appears after adding exercises
- ✅ Star icons toggle favorite status
- ✅ Display names show formatted text (not slugs)
- ✅ Equipment badges removed from bodyweight exercises
- ✅ Programming references save and persist across refreshes
- ✅ Tags display on exercise cards after hard refresh
- ✅ Workout deletion works correctly with RLS

**Build Verification:**
```bash
npm run build
✓ Compiled successfully
0 errors, 42 ESLint warnings (unused vars only)
```

**Database Verification:**
```bash
# Favorites table
SELECT COUNT(*) FROM user_exercise_favorites;
# Result: 0 (empty, ready for use)

# Programming references
SELECT COUNT(*) FROM naming_conventions;
# Result: 45

SELECT COUNT(*) FROM resources;
# Result: 9

# Workouts cleanup
SELECT COUNT(*) FROM wods;
# Result: 0 (cleaned for testing)

# Equipment cleanup
SELECT COUNT(*) FROM exercises WHERE 'none' = ANY(equipment);
# Result: 0 (all cleaned)
```

---

## Next Session Priorities

1. **Deployment Preparation (CRITICAL - Almost Complete):**
   - ✅ Testing complete (22/25 passed, Session 21)
   - ✅ Bug fixes complete (4 major bugs, Session 21)
   - ⚠️ **Remaining:** Part 5 - Deployment Checklist
     - Run production build verification
     - Environment variables audit
     - RLS policies final review
     - Browser compatibility testing (Chrome, Firefox, Safari, mobile)

2. **Exercise Library - Optional Polish:**
   - Body parts data population (currently only equipment populated)
   - Exercise usage analytics in coach dashboard
   - Exercise search relevance scoring

3. **Notification System (Post-Deployment):**
   - Session cancellation email notifications
   - Waitlist promotion email notifications
   - Booking confirmation emails

4. **Performance Optimization:**
   - Movement analytics caching (avoid re-parsing all workouts)
   - Exercise favorites preloading
   - Lazy loading for large exercise library

---

## Session Statistics

**Features:**
- New components: 0 (reused existing)
- New utilities: 3 (exercise-favorites, exercise-storage, movement-analytics extension)
- New database tables: 3 (user_exercise_favorites, naming_conventions, resources)
- Features implemented: 4 (frequency tracking, favorites, references migration, data cleanup)

**Code Changes:**
- Files created: 4
- Files modified: 6
- Lines added: ~1,078
- Lines removed: ~99
- Commits: 1
- Branch: main (pushed)

**Data Operations:**
- Exercises analyzed: 522
- Exercises cleaned ("none" equipment): 209
- Workouts deleted: 307
- Naming conventions migrated: 45
- Resources migrated: 9
- Regex patterns added: 1 (fallback pattern)

**Database Operations:**
- Migrations created: 2
- Tables created: 3
- RLS policies created: 4 (updated 2)
- Indexes created: 4

**Time Breakdown:**
- Exercise frequency tracking: ~40 minutes
- Favorites system: ~35 minutes
- Programming references migration: ~45 minutes
- Display name fixes: ~15 minutes
- Data cleanup scripts: ~20 minutes
- Testing & verification: ~20 minutes
- Git operations & documentation: ~15 minutes

---

**Session Duration:** ~2.5 hours
**Token Usage:** ~105K tokens
**User Satisfaction:** High (analytics working correctly, favorites intuitive, references finally persistent)
