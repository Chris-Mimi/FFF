# Session 61: Benchmark RLS Fix & Publish Modal Improvements

**Date:** 2025-12-25
**Agent:** Sonnet 4.5
**Session Type:** Bug Fixes & UX Improvements

---

## Summary

Fixed critical RLS policy blocking benchmark creation and improved Publish Modal to properly display structured content (benchmarks, lifts, forge benchmarks) in preview. Also resolved section auto-selection issue when adding new sections to previously published workouts.

---

## Work Completed

### 1. Benchmark RLS Policy Fix (CRITICAL) ✅

**Problem:**
- User unable to create benchmarks in Benchmarks & Lifts management page
- Error: "new row violates row-level security policy for table 'benchmark_workouts'"
- Error showed empty object `{}` making debugging difficult

**Root Cause Analysis:**
1. **Initial hypothesis:** JWT token missing coach role
   - Verified user_metadata in database: `{"role":"coach","full_name":"Coach Chris"}` ✅
   - Added debug logging to check JWT token
   - JWT payload confirmed: `user_metadata.role = 'coach'` ✅

2. **Second hypothesis:** RLS policies not applied
   - Checked existing policies on benchmark_workouts table
   - Only found: "Public can view benchmark workouts" (SELECT policy)
   - Missing: INSERT, UPDATE, DELETE policies for coaches

3. **Root cause identified:**
   - Migration file `20251105_add_coach_permissions_benchmarks_lifts.sql` exists locally
   - But policies were never applied to production database
   - File contains correct policies but wasn't run

**Solution Applied:**
Applied missing RLS policies directly via Supabase SQL Editor:

```sql
-- Add INSERT policy for coaches
CREATE POLICY "Coaches can insert benchmark workouts"
  ON benchmark_workouts FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

-- Add UPDATE policy for coaches
CREATE POLICY "Coaches can update benchmark workouts"
  ON benchmark_workouts FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

-- Add DELETE policy for coaches
CREATE POLICY "Coaches can delete benchmark workouts"
  ON benchmark_workouts FOR DELETE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );
```

**Forge Benchmarks:**
- Checked forge_benchmarks table
- Policies already existed (applied in previous session)
- No action needed

**Diagnostic Artifacts Created:**
- `supabase/migrations/20251225_fix_coach_user_metadata.sql` - User metadata verification
- `supabase/migrations/20251225_debug_benchmark_policies.sql` - Policy diagnostics
- `supabase/migrations/20251225_verify_and_fix_auth.sql` - Auth troubleshooting
- `supabase/migrations/20251225_add_user_id_benchmark_policy.sql` - Workaround approach (not used)

These files document the debugging process but weren't needed for the fix.

**Files Changed:**
- `app/coach/benchmarks-lifts/page.tsx` - Added comprehensive error logging, later cleaned up

**Result:**
✅ Benchmarks can now be created successfully
✅ forge_benchmarks already working
✅ Proper error messages for future RLS issues

---

### 2. Publish Modal Preview Improvements ✅

**Problem:**
- Publish Modal preview only showed `section.content` (free-form text)
- Structured content (benchmarks, lifts, forge benchmarks) not visible
- User couldn't verify what athletes would see before publishing
- Google Calendar events showed benchmarks but modal didn't

**Analysis:**
- Preview rendering logic at lines 173-192 was too simple
- Only displayed: section type, duration, and content text
- Didn't check for `section.benchmarks`, `section.lifts`, `section.forge_benchmarks`
- Google Calendar API route (app/api/google/publish-workout/route.ts) had proper formatting

**Solution:**
Updated `components/coach/PublishModal.tsx` to match API route formatting:

**Section Selection Area (Lines 134-176):**
```typescript
// Build preview text showing what's in this section
const previewParts: string[] = [];

if (section.lifts && section.lifts.length > 0) {
  previewParts.push(`${section.lifts.length} lift${section.lifts.length > 1 ? 's' : ''}`);
}
if (section.benchmarks && section.benchmarks.length > 0) {
  previewParts.push(`${section.benchmarks.length} benchmark${section.benchmarks.length > 1 ? 's' : ''}`);
}
if (section.forge_benchmarks && section.forge_benchmarks.length > 0) {
  previewParts.push(`${section.forge_benchmarks.length} forge benchmark${section.forge_benchmarks.length > 1 ? 's' : ''}`);
}

const preview = previewParts.length > 0
  ? previewParts.join(', ')
  : section.content;
```

**Athlete Preview Area (Lines 178-259):**
```typescript
// Format helpers (match API route logic)
const formatLift = (lift: any): string => {
  if (lift.rep_type === 'constant') {
    const base = `${lift.name} ${lift.sets}x${lift.reps}`;
    return lift.percentage_1rm ? `${base} @ ${lift.percentage_1rm}%` : base;
  } else {
    const reps = lift.variable_sets?.map((s: any) => s.reps).join('-') || '';
    return `${lift.name} ${reps}`;
  }
};

const formatBenchmark = (benchmark: any): string => {
  const scaling = benchmark.scaling_option ? ` (${benchmark.scaling_option})` : '';
  return `${benchmark.name}${scaling}`;
};

const formatForgeBenchmark = (forge: any): string => {
  const scaling = forge.scaling_option ? ` (${forge.scaling_option})` : '';
  return `${forge.name}${scaling}`;
};

// Conditional rendering for each type
{section.lifts && section.lifts.length > 0 && (
  <div>
    {section.lifts.map((lift: any, idx: number) => (
      <div key={idx}>• {formatLift(lift)}</div>
    ))}
  </div>
)}

{section.benchmarks && section.benchmarks.length > 0 && (
  <div className='space-y-1'>
    {section.benchmarks.map((benchmark: any, idx: number) => (
      <div key={idx}>
        <div className='font-semibold'>{formatBenchmark(benchmark)}</div>
        {benchmark.description && (
          <div className='text-xs text-gray-600 whitespace-pre-wrap mt-0.5'>
            {benchmark.description}
          </div>
        )}
      </div>
    ))}
  </div>
)}

{section.forge_benchmarks && section.forge_benchmarks.length > 0 && (
  <div className='space-y-1'>
    {section.forge_benchmarks.map((forge: any, idx: number) => (
      <div key={idx}>
        <div className='font-semibold'>{formatForgeBenchmark(forge)}</div>
        {forge.description && (
          <div className='text-xs text-gray-600 whitespace-pre-wrap mt-0.5'>
            {forge.description}
          </div>
        )}
      </div>
    ))}
  </div>
)}
```

**Files Changed:**
- `components/coach/PublishModal.tsx` (lines 134-176, 178-259)

**Result:**
✅ Preview shows lifts with sets/reps/percentages
✅ Preview shows benchmarks with descriptions
✅ Preview shows forge benchmarks with descriptions
✅ Section checkboxes show summary ("1 benchmark, 2 lifts")
✅ Matches Google Calendar formatting exactly

---

### 3. Publish Modal Section Auto-Selection Fix ✅

**Problem:**
- User added Forge Benchmark to tomorrow's workout (previously published)
- Opened Publish Modal → new section NOT pre-selected
- Yesterday's workout (never published) → all sections pre-selected correctly
- User had to manually check the new section every time

**Root Cause:**
```typescript
// Lines 44-46 (original)
const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>(
  currentPublishConfig?.selectedSectionIds || sections.map(s => s.id)
);

// Lines 68 (in useEffect)
setSelectedSectionIds(currentPublishConfig?.selectedSectionIds || sections.map(s => s.id));
```

If `currentPublishConfig` exists (workout was previously published):
- Uses `currentPublishConfig.selectedSectionIds` (old section IDs only)
- New sections added after publishing aren't in this array
- They don't get pre-selected

**Solution:**
Updated useEffect to merge old selection + new sections:

```typescript
// Calculate initial section selection
// If previously published, merge old selection with any new sections
let initialSelection: string[];
if (currentPublishConfig?.selectedSectionIds) {
  const allSectionIds = sections.map(s => s.id);
  const oldSelection = currentPublishConfig.selectedSectionIds;
  // Include all previously selected sections that still exist
  const validOldSelection = oldSelection.filter(id => allSectionIds.includes(id));
  // Add any new sections that weren't in the old config
  const newSections = allSectionIds.filter(id => !oldSelection.includes(id));
  initialSelection = [...validOldSelection, ...newSections];
} else {
  // First time publishing - select all sections
  initialSelection = sections.map(s => s.id);
}

setSelectedSectionIds(initialSelection);
```

**Files Changed:**
- `components/coach/PublishModal.tsx` (lines 54-79)

**Result:**
✅ First-time publish: All sections pre-selected
✅ Re-publish with no changes: Previous selection preserved
✅ Re-publish after adding new sections: Old selection + new sections pre-selected
✅ Re-publish after manually deselecting: Deselections preserved, new sections added

---

### 4. Code Cleanup ✅

**Debug Code Removal:**
Removed temporary diagnostic logging added during troubleshooting:

**app/coach/benchmarks-lifts/page.tsx:**
- Removed JWT token debug useEffect (lines 174-189 deleted)
- Simplified `saveBenchmark()` error handling (removed verbose logging)
- Simplified `saveForge()` error handling (removed verbose logging)

**components/coach/PublishModal.tsx:**
- Removed section data debug logging from useEffect (lines 57-66 deleted)

**Files Changed:**
- `app/coach/benchmarks-lifts/page.tsx`

---

## Technical Details

### RLS Policy Structure

**Policy Format:**
```sql
CREATE POLICY "policy_name"
  ON table_name FOR {SELECT|INSERT|UPDATE|DELETE}
  {USING (condition) | WITH CHECK (condition)};
```

**Coach Role Check:**
```sql
(auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
```

**Why USING vs WITH CHECK:**
- `USING`: Check condition for SELECT, UPDATE, DELETE (which rows can be accessed)
- `WITH CHECK`: Check condition for INSERT, UPDATE (whether new/modified row passes)
- INSERT policies use `WITH CHECK` only
- UPDATE policies can use both: `USING` (can I edit this row?) + `WITH CHECK` (is new value valid?)

### JWT Token Structure

**User Metadata in JWT:**
```json
{
  "user_metadata": {
    "role": "coach",
    "full_name": "Coach Chris"
  },
  "app_metadata": {
    "role": "coach"
  }
}
```

RLS policies check `auth.jwt() -> 'user_metadata' ->> 'role'`

### Section Selection Logic

**Key Insight:**
When workout is republished, `currentPublishConfig` contains snapshot of previous state.
Must merge with current state to handle:
1. Sections added after last publish → auto-include
2. Sections removed after last publish → filter out
3. Sections manually deselected → preserve deselection

**Array Operations:**
```typescript
validOldSelection = oldSelection.filter(id => allSectionIds.includes(id))  // Keep only sections that still exist
newSections = allSectionIds.filter(id => !oldSelection.includes(id))        // Find sections added since last publish
merged = [...validOldSelection, ...newSections]                             // Combine both
```

---

## Debugging Journey

### Challenge 1: Empty Error Object

**Issue:** Error showed `{}` instead of useful message

**Investigation:**
1. Added comprehensive logging to `saveBenchmark()` function
2. Logged user object, JWT payload, database response
3. Error object didn't serialize properly with `JSON.stringify()`
4. Changed to extract specific properties: `message`, `code`, `hint`

**Resolution:**
```typescript
const supabaseError = error as { message?: string; code?: string; hint?: string };
errorMessage = supabaseError.message || supabaseError.hint || 'Database error';
```

This revealed: "new row violates row-level security policy"

### Challenge 2: Finding the Right File

**Initial Confusion:**
User reported: "Forge Benchmarks don't show in Publish Modal preview"

**Debugging Steps:**
1. Added debug logging to see section data
2. Console showed `forge_benchmarks: 1` but nothing rendered
3. Realized rendering code existed for lifts/benchmarks but NOT forge benchmarks
4. User clarified: "Why not copy the same format you used in Lifts & Benchmarks modals?"
5. Reviewed `ConfigureForgeBenchmarkModal.tsx` and `WODSectionComponent.tsx`
6. Found exact same pattern: `formatForgeBenchmark()` helper function
7. Applied identical pattern to PublishModal

### Challenge 3: Mysterious Pre-Selection Bug

**User Observation:**
"Yesterday's workout selects all sections, tomorrow's doesn't - why?"

**Investigation:**
1. Only difference: Tomorrow was previously published, yesterday wasn't
2. Console showed all sections present in both
3. Checked state initialization logic
4. Found: `currentPublishConfig?.selectedSectionIds || sections.map(s => s.id)`
5. If config exists → uses old IDs, if not → uses all current IDs

**Key Insight:**
The `||` fallback never triggered when config existed, even if it was outdated.

---

## User Feedback

**On RLS Fix:**
- User: "Signout/in didn't work" (after first attempt to refresh JWT)
- User: "SQL run, sign out/in didn't work" (after updating metadata)
- User: "Working" (after applying correct RLS policies)

**On Publish Modal:**
- User: "Benchmarks & Lifts show, but Forge Benchmarks don't"
- User: "Why not copy the same format you used in Lifts & Benchmarks modals?"
- User: "It's working. For some reason the new sections weren't preselected in the modal, but only on the workout for tomorrow."

---

## Lessons Learned

### 1. RLS Policy Application Gap
**Problem:** Migration files in repo ≠ policies in database

**Lesson:**
- Always verify policies exist with: `SELECT * FROM pg_policies WHERE tablename = 'table_name'`
- Don't assume migration files were run just because they exist
- Consider adding migration verification script

**Future Prevention:**
- Document which migrations were applied manually vs via migration tool
- Create checklist for new table creation: schema, RLS enable, policies, indexes

### 2. Empty Error Objects from Supabase
**Problem:** `console.error('Error:', error)` showed `{}`

**Lesson:**
- Supabase errors don't serialize well with default JSON.stringify
- Must extract specific properties: `message`, `code`, `hint`, `details`
- Better error handling:
```typescript
if (error && typeof error === 'object') {
  const { message, code, hint } = error as SupabaseError;
  console.error('Error details:', { message, code, hint });
}
```

### 3. State Initialization with Stale Config
**Problem:** Using old config as default prevents seeing new data

**Lesson:**
- When config represents historical state, must merge with current state
- Array operations pattern: filter valid old items, find new items, combine
- Apply in useEffect when modal opens, not just in initial useState

### 4. Debugging with Targeted Logging
**Success Pattern:**
```typescript
console.log('=== DEBUG SECTION ===');
items.forEach((item, idx) => {
  console.log(`Item ${idx}:`, {
    summary: item.property,
    full: item
  });
});
console.log('====================');
```

This made it easy to find in console and see both summary and details.

---

## Files Changed

**Modified:**
1. `components/coach/PublishModal.tsx` - Section selection logic, preview rendering
2. `app/coach/benchmarks-lifts/page.tsx` - Error handling cleanup

**Created (diagnostic, not used):**
1. `supabase/migrations/20251225_fix_coach_user_metadata.sql`
2. `supabase/migrations/20251225_debug_benchmark_policies.sql`
3. `supabase/migrations/20251225_verify_and_fix_auth.sql`
4. `supabase/migrations/20251225_add_user_id_benchmark_policy.sql`
5. `scripts/verify-jwt-role.ts`

**Total:** 7 files

---

## Next Steps

**Immediate:**
- No blocking issues
- System ready for Week 2 Testing Phase

**Future Enhancements:**
- Consider migration verification script to detect unapplied migrations
- Add RLS policy existence check to dev startup
- Create reusable error display component for Supabase errors

---

## Key Takeaways

1. **RLS Debugging:** Always check `pg_policies` table, don't assume migrations ran
2. **Error Handling:** Extract specific error properties, don't rely on default serialization
3. **State Management:** When using historical config, merge with current state
4. **Code Reuse:** Look for existing patterns in similar components before reinventing
5. **User Observation:** "It works here but not there" → check what's different about the environment/state

---

**Session Complete** ✅
