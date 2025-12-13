# Session 50: Workout Naming System UI Implementation

**Date:** December 12, 2025
**Session:** UI implementation for workout naming + backup system fixes

## Summary
Completed UI implementation for workout naming system from Session 49. Added input fields, auto-calculation of workout_week, and updated database operations. Fixed critical backup script omissions and resolved duplicate workout issues caused by faulty deletion script.

## Work Completed

### 1. Workout Naming UI Implementation

**Files Modified:**
- `hooks/coach/useWorkoutModal.ts`
- `components/coach/WorkoutFormFields.tsx`
- `hooks/coach/useWODOperations.ts`
- `hooks/coach/useCoachData.ts`

**TypeScript Interface Updates** ([useWorkoutModal.ts](hooks/coach/useWorkoutModal.ts))
```typescript
export interface WODFormData {
  workout_name?: string;    // Optional workout name
  workout_week?: string;    // Auto-calculated ISO week (YYYY-Www)
  session_type?: string;    // Replaces 'title' field
  // ... other fields
}
```

**ISO Week Calculation** ([useWorkoutModal.ts:164-176](hooks/coach/useWorkoutModal.ts#L164-L176))
```typescript
const calculateWorkoutWeek = (date: Date): string => {
  const tempDate = new Date(date.getTime());
  tempDate.setHours(0, 0, 0, 0);
  tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
  const yearStart = new Date(tempDate.getFullYear(), 0, 4);
  const weekNo = Math.ceil((((tempDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const isoYear = tempDate.getFullYear();
  return `${isoYear}-W${String(weekNo).padStart(2, '0')}`;
};
```

**UI Changes** ([WorkoutFormFields.tsx](components/coach/WorkoutFormFields.tsx))
- Changed label: "Workout Title" → "Session Type"
- Added new input field: "Workout Name (Optional)"
- Helper text: "Use for repeated workouts to track frequency accurately"
- Auto-calculates workout_week when date changes

**Database Operations** ([useWODOperations.ts](hooks/coach/useWODOperations.ts))
- Added new fields to UPDATE operations (4 locations)
- Added new fields to INSERT operations (3 locations)
- Copy workout: Calculates workout_week for target date

**Data Fetching** ([useCoachData.ts](hooks/coach/useCoachData.ts))
- Added workout_name, workout_week, session_type to SELECT queries
- Added fields to object mappings

### 2. Backup System Critical Fix

**Problem:** Backup script missing critical tables
- weekly_sessions ❌ (session scheduling data)
- tracks ❌ (workout track definitions)

**Solution:** Updated [backup-critical-data.ts](scripts/backup-critical-data.ts#L78-L89)

```typescript
const criticalTables = [
  { name: 'barbell_lifts', desc: 'Lift definitions' },
  { name: 'benchmark_workouts', desc: 'CrossFit benchmarks' },
  { name: 'forge_benchmarks', desc: 'Custom gym benchmarks' },
  { name: 'lift_records', desc: 'Athlete lift results (CRITICAL USER DATA)' },
  { name: 'benchmark_results', desc: 'Athlete benchmark results (CRITICAL USER DATA)' },
  { name: 'wod_section_results', desc: 'WOD results (CRITICAL USER DATA)' },
  { name: 'wods', desc: 'Programmed workouts' },
  { name: 'weekly_sessions', desc: 'Scheduled sessions (CRITICAL)' },  // ← NEW
  { name: 'exercises', desc: 'Exercise library' },
  { name: 'tracks', desc: 'Workout tracks' },  // ← NEW
];
```

**Result:**
- Future backups now include 10 tables (was 8)
- Restore operations preserve calendar scheduling data

### 3. Database Investigation & Cleanup

**Issue:** User reported duplicate workouts and phantom sessions in calendar

**Investigation Tools Created:**
- `debug-workouts.js` - Query all workouts and sections
- `debug-movements.js` - Search for specific movements (OHS, Snatch)
- `find-duplicates.js` - Identify duplicate workouts (flawed - kept oldest)
- `find-duplicates-v2.js` - Corrected version (keeps most content)
- `check-all-workouts.js` - List all workouts with section counts
- `check-sessions.js` - **KEPT** - RLS-aware session debugging
- `check-remaining-sessions.js` - Check orphaned sessions
- `check-all-sessions.js` - Full database scan
- `cleanup-wods.js` - Generate cleanup SQL

**Root Cause #1: Faulty Duplicate Detection Script**
- First script kept oldest by created_at timestamp
- Problem: Oldest records were empty placeholders
- Actual workout data (with sections) was deleted
- Result: 57 workouts deleted, only Dec 3 published workout survived

**Root Cause #2: Backup Didn't Include weekly_sessions**
- Restore brought back 58 wods but 0 weekly_sessions
- Calendar lost all session scheduling data
- Orphaned weekly_sessions remained (Dec 8, 12)

**Root Cause #3: Row Level Security (RLS)**
- Anon key couldn't read weekly_sessions (RLS blocked)
- Scripts showed "0 sessions" but 2 existed in database
- Only authenticated coach session could see them

**Resolution:**
1. Database cleanup: Deleted 57 duplicate wods via SQL
2. User manually deleted 2 orphaned weekly_sessions via calendar UI
3. Created clean backup with all 10 tables
4. Updated check-sessions.js to use service role key (bypasses RLS)

**Final State:**
- 1 wod (Dec 3 published workout)
- 1 weekly_session (Dec 3 session)
- Clean baseline for development

### 4. Debug Script Management

**Created for investigation:**
- check-sessions.js (KEPT - uses service role key, bypasses RLS)
- 8 other debug scripts (DELETED after cleanup)

**check-sessions.js features:**
```javascript
// Use service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
```

Benefits:
- Accurate session counts (bypasses RLS)
- Identifies orphaned workouts
- Useful for production debugging

## Files Modified

1. **hooks/coach/useWorkoutModal.ts**
   - Added workout_name, workout_week, session_type to interface
   - Implemented calculateWorkoutWeek() function
   - Auto-calculate workout_week on date change

2. **components/coach/WorkoutFormFields.tsx**
   - Changed "Workout Title" label to "Session Type"
   - Added "Workout Name (Optional)" input field
   - Added helper text for tracking repeated workouts

3. **hooks/coach/useWODOperations.ts**
   - Added workout_name, workout_week, session_type to UPDATE operations
   - Added workout_name, workout_week, session_type to INSERT operations
   - Calculate workout_week in handleCopyWOD for target date

4. **hooks/coach/useCoachData.ts**
   - Added workout_name, workout_week, session_type to SELECT queries
   - Added fields to workout object mappings

5. **scripts/backup-critical-data.ts**
   - Added weekly_sessions table
   - Added tracks table
   - Now backs up 10 tables (was 8)

6. **check-sessions.js** (NEW - KEPT)
   - RLS-aware database debugging
   - Uses service role key for accurate counts
   - Shows orphaned workouts

## Testing Performed

### UI Testing
- ✓ "Session Type" label displays correctly
- ✓ "Workout Name" input field appears and is optional
- ✓ workout_week auto-calculates when date changes
- ✓ Fields save correctly to database

### Backup Testing
- ✓ Backup includes weekly_sessions table
- ✓ Backup includes tracks table
- ✓ Restore works with new table structure
- ✓ Manifest shows all 10 tables

### Database Cleanup
- ✓ Duplicate workouts identified correctly (v2 script)
- ✓ Orphaned sessions deleted successfully
- ✓ Final database state clean (1 wod, 1 session)
- ✓ Clean backup created (2025-12-12 21:45)

## Lessons Learned

### 1. Backup Script Completeness
**Issue:** Missing critical tables in backup
**Lesson:** Always include all tables with foreign key relationships
- wods → weekly_sessions (foreign key: workout_id)
- Deleting wods cascades to weekly_sessions
- Backup must include both to restore properly

### 2. RLS Impact on Scripts
**Issue:** Scripts showed 0 sessions but 2 existed
**Lesson:** Use service role key for admin scripts
- Anon key: Subject to RLS policies
- Service role key: Bypasses RLS (see actual data)
- Production debugging needs RLS bypass capability

### 3. Duplicate Detection Logic
**Issue:** Kept oldest records (empty), deleted actual content
**Lesson:** Sort by content quality, not timestamps
- Oldest ≠ Best
- Keep records with most sections/data
- Timestamp only as tiebreaker

### 4. Cascade Deletion Side Effects
**Issue:** Deleting wods cascade-deleted weekly_sessions
**Lesson:** Understand foreign key constraints before deletions
- Check foreign keys before bulk deletes
- Backup must include all related tables
- Test restore before relying on backups

### 5. localStorage Caching
**Issue:** Deleted sessions still showed in calendar
**Lesson:** Browser caching can hide database truth
- localStorage stores UI state (expanded sections, etc.)
- Clear localStorage when debugging missing data
- Hard refresh may not be enough

## Next Steps (Pending from Session 49)

### 1. Test Workout Naming System
**Test Cases:**
1. Create workout "Overhead Fest" on Dec 16 (Mon)
2. Repeat same workout Dec 17 (Tue) 9am
3. Repeat same workout Dec 17 (Tue) 6pm
4. Check Analysis page: Should show "Overhead Squat: 1x" (not 3x)
5. Create new workout "Overhead Fest" in January
6. Check Analysis page: Should show "Overhead Squat: 2x" (different weeks)

### 2. Migration Cleanup (Future)
**After full testing:**
```sql
-- Drop old title column (replaced by session_type)
ALTER TABLE wods DROP COLUMN title;
```

**Conditions:**
- ✓ UI fully using session_type
- ✓ All workouts migrated
- ✓ No remaining title column references

## User Feedback

- Confirmed backup system was working (had run before session)
- Confused about backup value due to missing tables
- Explained backup now includes all 10 critical tables
- Satisfied with clean database state
- Deleted old backup files (kept only latest)
- Ready to recreate test workout manually

## Commits

**Commit d50c9cb:** "fix(coach): workout naming system UI and backup improvements"
- 5 files modified
- 1 file created (check-sessions.js)
- Backup script now includes weekly_sessions and tracks

## Technical Notes

### ISO Week Calculation
**Implementation:** Pure JavaScript (no dependencies)
- Matches PostgreSQL TO_CHAR(date, 'IYYY-IW') output
- Monday = week start (ISO 8601)
- Week 1 = first week with Thursday in year
- Handles year boundaries correctly

### Service Role Key Usage
**Security:** Only for debugging scripts, never in UI
```javascript
// .env.local
SUPABASE_SERVICE_ROLE_KEY=eyJ...  // Bypasses RLS
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  // Subject to RLS
```

**Use Cases:**
- Admin scripts (check-sessions.js)
- Database migrations
- Backup/restore operations

**Never:**
- ❌ Client-side code
- ❌ Public API endpoints
- ❌ User-facing features

## Open Questions

1. Should we prevent workout deletion if weekly_sessions exist?
   - Currently: Cascade delete removes sessions
   - Alternative: Block deletion, show error message

2. Backup retention policy for production?
   - Current: Manual cleanup (kept latest only)
   - Suggestion: Last 7 days + monthly archives

3. Auto-name workouts based on dominant movement?
   - Example: "Overhead Squat Focus" if multiple OHS sections
   - Trade-off: May not match coach's intent
