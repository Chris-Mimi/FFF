# Session 36: WOD Section Tracking & Configure Modal Cleanup

**Date:** December 4, 2025
**Session Focus:** Athlete workout scoring, modal cleanup, benchmark improvements

## Summary
Implemented comprehensive WOD section score tracking system, cleaned up configure modals, fixed benchmark PR logic, and added exercise library template copying.

---

## Major Features Implemented

### 1. WOD Section Score Tracking
**Problem:** Athletes had no way to record scores for exercise-based workouts (time, rounds, reps, etc.)

**Solution:**
- Created `wod_section_results` table with fields:
  - `time_result` (text: "12:34", "DNF")
  - `reps_result` (integer: total reps)
  - `weight_result` (decimal: total kg)
  - `scaling_level` (Rx, Sc1, Sc2, Sc3)
- Added score inputs under WOD/WOD Pt.1/Pt.2/Pt.3 sections
- New "Save WOD Scores" button (purple) in athlete logbook
- Auto-loads previous scores when viewing workout

**Database:**
- File: `database/create-wod-section-results.sql`
- RLS policies for athletes and coaches
- Unique constraint: user_id + wod_id + section_id + workout_date

**Key Implementation:**
- Fixed UUID separator issue (changed from `-` to `:::`)
- Explicit update/insert logic instead of upsert
- Section results keyed by `${wodId}:::${sectionId}`

### 2. Configure Modal Cleanup
**Changes Applied to All Three Modals:**
- ConfigureLiftModal
- ConfigureBenchmarkModal
- ConfigureForgeBenchmarkModal

**Removed:**
- ❌ Visibility controls (everyone/coaches/programmers)
- ❌ "Coach Notes Info" gray box
- ❌ Coach notes expandable section
- ❌ Scaling options dropdown
- ❌ "Edit Track Default" button

**Kept:**
- ✅ Athlete notes (with localStorage persistence)
- ✅ Movement-specific configuration (sets/reps/percentage)

**localStorage Implementation:**
- Keys: `athlete_notes_lift_{name}`, `athlete_notes_benchmark_{name}`, `athlete_notes_forge_{name}`
- Auto-loads saved notes when reopening configure modal
- Persists across browser sessions

### 3. Exercise Library Template Copying
**Feature:** Create new exercises from existing templates

**Implementation:**
- Added "Start from template (optional)" dropdown in ExerciseFormModal
- Lists all exercises alphabetically
- Copies all fields EXCEPT name (user must provide new name)
- Fields copied: category, subcategory, description, video URL, tags, equipment, body parts, difficulty, warmup/stretch flags
- Confirmation message when template loaded

**Benefit:** Maintains naming conventions, saves typing metadata

### 4. Athlete Logbook Simplification
**Removed:**
- ❌ Date input box (always uses current selected date)
- ❌ Result/Time input box (replaced by WOD section scores)

**Added:**
- ✅ "Coach Instructions" section showing athlete notes from lifts/benchmarks/forge benchmarks
- ✅ Structured WOD scoring per section (time/reps/weight/scaling)

**Section Title Updated:** "My Notes" → "My Notes/Scores"

---

## Bug Fixes

### 1. Benchmark PR Badge Logic
**Problem:** Multiple scores showing PR badge when only one should

**Root Cause:**
- Field name mismatches in chart data
- Inconsistent null/undefined handling for scaling levels
- Empty string vs "Rx" default inconsistency

**Fixes:**
- Changed chart data fields: `resultDisplay` → `result_valueDisplay`, `scaling` → `scaling_level`
- Consistent default: `result.scaling_level || 'Rx'` everywhere
- Fixed handleEditBenchmark typos: `result_value_value` → `result_value`

### 2. Hold/Hang Benchmark Scoring
**Problem:** L-Sit Hold, Plank Hold, Handstand Hold, Bar Hang tracked incorrectly (lower time = better)

**Solution:** Detection logic checks if name contains "hold" or "hang"
```typescript
const isHoldBenchmark = benchmarkName.toLowerCase().includes('hold') ||
                       benchmarkName.toLowerCase().includes('hang');
```

**Applied to 3 functions per tab:**
- `getBestTimes()` - Summary card display
- `getBenchmarkChartData()` - PR badge assignment
- Overall best comparison - Scaling hierarchy

**Logic:**
- Hold/Hang: Higher time = better (more seconds held)
- Regular: Lower time = better (faster completion)

### 3. Exercise Counting with Appended Text
**Problem:** "Push-Up Strict 5 seconds down, 5 seconds up" not counted as "Push-Up Strict"

**Root Cause:** Exact name matching in movement-analytics.ts

**Fix:** Prefix matching with fallback
```typescript
// First try exact match
let exercise = exercisesByName.get(normalized.toLowerCase());

// If no exact match, try prefix match
if (!exercise) {
  for (const [dbName, dbExercise] of exercisesByName.entries()) {
    if (normalizedLower.startsWith(dbName)) {
      exercise = dbExercise;
      break;
    }
  }
}
```

### 4. Progress Charts Display
**Problem:** Only first 6 benchmarks shown in Progress Charts section

**Fix:** Removed `.slice(0, 6)` limit
- Now shows ALL benchmarks with 2+ recorded scores
- Both Benchmarks and Forge Benchmarks tabs updated

### 5. WOD Type Dropdown Visibility
**Problem:** Type dropdown only showed for "WOD" section, not "WOD Pt.1/2/3"

**Fix:**
```typescript
{(section.type === 'WOD' || section.type === 'WOD Pt.1' ||
  section.type === 'WOD Pt.2' || section.type === 'WOD Pt.3') && (
  // Workout type dropdown
)}
```

### 6. Athlete Notes Display in Logbook
**Feature:** Athlete notes now appear in dedicated "Coach Instructions" section

**Implementation:**
- Collects all athlete notes from lifts, benchmarks, forge benchmarks
- Displays in blue box with bullet points
- Format: `{movementName}: {athleteNote}`
- Appears above Notes textarea

---

## Files Modified

### Components (9 files)
1. `components/athlete/AthletePageBenchmarksTab.tsx`
   - Hold/hang detection
   - PR badge field name fixes
   - Progress charts limit removed

2. `components/athlete/AthletePageForgeBenchmarksTab.tsx`
   - Hold/hang detection
   - PR badge field name fixes
   - Progress charts limit removed
   - Scaling level pills with default

3. `components/athlete/AthletePageLogbookTab.tsx`
   - WOD section results state and functions
   - Score input UI (time/reps/weight/scaling)
   - Removed date/result boxes
   - Added Coach Instructions section
   - Save WOD Scores button

4. `components/coach/ConfigureLiftModal.tsx`
   - Removed visibility, coach notes
   - localStorage for athlete notes
   - Hardcoded visibility to 'everyone'

5. `components/coach/ConfigureBenchmarkModal.tsx`
   - Removed scaling options, visibility, coach notes
   - localStorage for athlete notes

6. `components/coach/ConfigureForgeBenchmarkModal.tsx`
   - Removed scaling options, visibility, coach notes
   - localStorage for athlete notes

7. `components/coach/ExerciseFormModal.tsx`
   - Template selector dropdown
   - Template data loading logic
   - Fetch all exercises on modal open

8. `components/coach/WODSectionComponent.tsx`
   - WOD type dropdown for Pt.1/2/3

### Utils (1 file)
9. `utils/movement-analytics.ts`
   - Prefix matching for exercise names

### Database (1 file)
10. `database/create-wod-section-results.sql`
    - New table schema
    - RLS policies

---

## Database Schema

### wod_section_results
```sql
CREATE TABLE wod_section_results (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  wod_id UUID REFERENCES wods(id) ON DELETE CASCADE NOT NULL,
  section_id TEXT NOT NULL,
  workout_date DATE NOT NULL,
  time_result TEXT,
  reps_result INTEGER,
  weight_result DECIMAL(6,2),
  scaling_level TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, wod_id, section_id, workout_date)
);
```

---

## Technical Decisions

### Why Not Supabase upsert()?
- Composite unique constraint caused issues
- Explicit check-then-update/insert more reliable
- Better error handling and debugging

### Why localStorage for Athlete Notes?
- Simple persistence across sessions
- No database bloat for temporary coaching hints
- Easy to implement, works immediately
- Notes saved per movement name (globally accessible)

### Why Hold/Hang Detection vs Database Field?
- Quick fix for 4 specific cases
- No database migration required
- Name-based detection sufficient for current needs
- Can migrate to proper `scoring_direction` field later if needed

---

## Testing Completed

### WOD Section Scores
- ✅ Create new section results
- ✅ Update existing section results
- ✅ Load previous scores on page load
- ✅ Multiple sections per workout
- ✅ All scaling levels (Rx, Sc1, Sc2, Sc3)

### Configure Modals
- ✅ localStorage saves athlete notes
- ✅ Notes persist across browser sessions
- ✅ Notes auto-load when reopening modal
- ✅ All unwanted fields removed

### Benchmark PR Logic
- ✅ Only one PR per scaling level
- ✅ Hold benchmarks: higher time gets PR
- ✅ Regular benchmarks: lower time gets PR
- ✅ Scaling level pills show correctly

### Exercise Library
- ✅ Template dropdown lists all exercises
- ✅ Template selection populates fields
- ✅ Name field remains empty
- ✅ Save creates new exercise

---

## User Experience Improvements

1. **Streamlined Modal UX:** Removed clutter, focused on essential fields
2. **Persistent Coaching:** Athlete notes saved and reused automatically
3. **Comprehensive Scoring:** Athletes can now track all workout types
4. **Visual Clarity:** Scaling pills always visible with proper defaults
5. **Template Workflow:** Faster exercise creation with consistent naming
6. **Accurate PRs:** Only true personal records highlighted

---

## Known Limitations

1. **Hold/Hang Detection:** Name-based only, could miss variations
2. **localStorage Scope:** Per-browser only, not synced across devices
3. **No Score History View:** Can save scores but no historical view yet
4. **Manual Scaling Selection:** Coaches must manually select default scaling

---

## Next Steps (Not Implemented)

- Historical score tracking UI for athletes
- Leaderboard for WOD section results
- Auto-detect workout type from movements
- Proper `scoring_direction` database field for benchmarks
- Cross-device sync for athlete notes (move to database?)

---

**Commit:** c5d1ff5
**Files Changed:** 10 files, +607/-326 lines
**Session Duration:** ~2.5 hours
**Status:** ✅ Complete, tested, committed
