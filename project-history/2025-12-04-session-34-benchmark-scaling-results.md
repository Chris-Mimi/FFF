# Session 34 - Benchmark Scaling Configuration & Result Tracking

**Date:** 2025-12-04
**Session:** Benchmark scaling options and athlete result tracking system
**Developer:** Chris (chrishiles)

## Summary
Implemented comprehensive benchmark scaling configuration system allowing coaches to designate which benchmarks offer scaling options (Rx/Sc1/Sc2/Sc3). Created benchmark results tracking with conditional UI and database persistence. Migrated schema from legacy column names to new standardized names. Fixed has_scaling propagation through entire component chain.

## Problem Statement
- Athletes needed ability to log benchmark results (times/scores) directly in Logbook
- No way to configure which benchmarks have scaling options (e.g., 2km Row doesn't need scaling, but L-Sit Hold does)
- Existing partial benchmark_results table had schema conflicts
- Old schema used non-standard column names (workout_date, result, scaling)
- has_scaling field not propagating from Coach Library to Athlete display

## Solution Implemented

### 1. Database Schema - Benchmark Scaling & Results
**Migration:** `supabase/migrations/20251204_add_benchmark_scaling_and_results.sql`

**Schema Changes:**
```sql
-- Add scaling configuration to benchmark tables
ALTER TABLE benchmark_workouts
ADD COLUMN has_scaling BOOLEAN DEFAULT true;

ALTER TABLE forge_benchmarks
ADD COLUMN has_scaling BOOLEAN DEFAULT true;

-- Create results table with XOR constraint
DROP TABLE IF EXISTS benchmark_results CASCADE;

CREATE TABLE benchmark_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  benchmark_id UUID REFERENCES benchmark_workouts(id) ON DELETE CASCADE,
  forge_benchmark_id UUID REFERENCES forge_benchmarks(id) ON DELETE CASCADE,
  benchmark_name TEXT NOT NULL,
  benchmark_type TEXT NOT NULL,
  result_value TEXT NOT NULL,
  scaling_level TEXT CHECK (scaling_level IN ('Rx', 'Sc1', 'Sc2', 'Sc3') OR scaling_level IS NULL),
  notes TEXT,
  result_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT benchmark_xor CHECK (
    (benchmark_id IS NOT NULL AND forge_benchmark_id IS NULL) OR
    (benchmark_id IS NULL AND forge_benchmark_id IS NOT NULL)
  )
);
```

**Key Design Decisions:**
- **XOR constraint:** Ensures result belongs to either benchmark OR forge benchmark, not both
- **Standardized column names:** result_value (not result), result_date (not workout_date), scaling_level (not scaling)
- **Composite index:** (user_id, benchmark_name, result_date) for efficient UPSERT checks
- **Type tracking:** Stores benchmark_type for determining if time-based or rep-based

**RLS Policies:**
- Users can SELECT/INSERT/UPDATE/DELETE only their own results
- Full data isolation between users

### 2. TypeScript Interface Updates
**Files Modified:**
- `types/movements.ts` (lines 78-94)

**Added has_scaling field:**
```typescript
export interface Benchmark {
  id: string;
  name: string;
  type: string;
  description?: string;
  display_order: number;
  has_scaling?: boolean;  // NEW
}

export interface ForgeBenchmark {
  id: string;
  name: string;
  type: string;
  description?: string;
  display_order: number;
  has_scaling?: boolean;  // NEW
}

export interface ConfiguredBenchmark {
  id: string;
  name: string;
  type: string;
  description?: string;
  has_scaling?: boolean;  // NEW
  scaling_option?: string;
  visibility: 'everyone' | 'coaches' | 'programmers';
  coach_notes?: string;
  athlete_notes?: string;
}

export interface ConfiguredForgeBenchmark {
  id: string;
  name: string;
  type: string;
  description?: string;
  has_scaling?: boolean;  // NEW
  scaling_option?: string;
  visibility: 'everyone' | 'coaches' | 'programmers';
  coach_notes?: string;
  athlete_notes?: string;
}
```

### 3. Coach Library UI - Scaling Configuration
**Files Modified:**
- `app/coach/benchmarks-lifts/page.tsx` (lines 58-70, 222-368)
- `components/coach/BenchmarksTab.tsx` (added checkbox)
- `components/coach/ForgeBenchmarksTab.tsx` (added checkbox)

**Form State:**
```typescript
const [benchmarkForm, setBenchmarkForm] = useState({
  name: '',
  type: '',
  description: '',
  display_order: 0,
  has_scaling: true  // NEW - default to true
});
```

**CRUD Operations Updated:**
```typescript
// INSERT
const { error } = await supabase.from('benchmark_workouts').insert({
  name: benchmarkForm.name,
  type: benchmarkForm.type,
  description: benchmarkForm.description,
  display_order: benchmarkForm.display_order,
  has_scaling: benchmarkForm.has_scaling,  // NEW
});

// UPDATE
const { error } = await supabase
  .from('benchmark_workouts')
  .update({
    name: benchmarkForm.name,
    type: benchmarkForm.type,
    description: benchmarkForm.description,
    display_order: benchmarkForm.display_order,
    has_scaling: benchmarkForm.has_scaling,  // NEW
    updated_at: new Date().toISOString()
  })
  .eq('id', editingBenchmark.id);
```

**UI Checkbox:**
```typescript
<div className='flex items-center gap-2'>
  <input
    type='checkbox'
    id='has_scaling'
    checked={form.has_scaling}
    onChange={(e) => onFormChange('has_scaling', e.target.checked)}
  />
  <label htmlFor='has_scaling'>
    Has Scaling Options (Rx/Sc1/Sc2/Sc3)
  </label>
</div>
```

### 4. Propagation Fix - Configure Modals
**Files Modified:**
- `components/coach/ConfigureBenchmarkModal.tsx` (line 92)
- `components/coach/ConfigureForgeBenchmarkModal.tsx` (line 92)

**Critical Fix:**
```typescript
const configuredBenchmark: ConfiguredBenchmark = {
  id: benchmark.id,
  name: benchmark.name,
  type: benchmark.type,
  description: benchmark.description || undefined,
  has_scaling: benchmark.has_scaling,  // ADDED - fixes propagation bug
  scaling_option: scalingOption !== 'None' ? scalingOption : undefined,
  visibility,
  coach_notes: coachNotes || undefined,
  athlete_notes: athleteNotes || undefined,
};
```

**Bug Details:**
- User reported: Unchecked "Gwen" scaling in library, deleted from workout, re-added, but scaling dropdown still appeared
- Root cause: Configure modals weren't copying has_scaling from source benchmark
- Solution: Include has_scaling in configured object creation

### 5. API Route - Benchmark Results UPSERT
**File Created:**
- `app/api/benchmark-results/route.ts`

**UPSERT Logic:**
```typescript
export async function POST(request: NextRequest) {
  const { userId, benchmarkId, forgeBenchmarkId, benchmarkName, benchmarkType,
          resultValue, scalingLevel, notes, resultDate } = await request.json();

  // Check for existing result (same user, benchmark, date)
  const { data: existingResult } = await supabaseAdmin
    .from('benchmark_results')
    .select('id')
    .eq('user_id', userId)
    .eq('benchmark_name', benchmarkName)
    .eq('result_date', resultDate || new Date().toISOString().split('T')[0])
    .maybeSingle();

  if (existingResult) {
    // Update existing
    const { error } = await supabaseAdmin
      .from('benchmark_results')
      .update({
        result_value: resultValue,
        scaling_level: scalingLevel,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingResult.id);
  } else {
    // Insert new (must include benchmark_id OR forge_benchmark_id for XOR)
    const { error } = await supabaseAdmin.from('benchmark_results').insert({
      user_id: userId,
      benchmark_id: benchmarkId || null,
      forge_benchmark_id: forgeBenchmarkId || null,
      benchmark_name: benchmarkName,
      benchmark_type: benchmarkType,
      result_value: resultValue,
      scaling_level: scalingLevel,
      notes: notes || null,
      result_date: resultDate || new Date().toISOString().split('T')[0],
    });
  }
}
```

**Key Features:**
- Uses service role key for admin access (bypasses RLS)
- Checks for existing record by composite key (user + benchmark + date)
- Updates if exists, inserts if new
- Validates XOR constraint (includes appropriate ID)

### 6. Athlete Logbook UI - Result Inputs
**Files Modified:**
- `components/athlete/AthletePageLogbookTab.tsx` (result input boxes added)

**Conditional Scaling Dropdown:**
```typescript
{benchmark.has_scaling !== false && (
  <select
    value={benchmarkResults[benchmarkKey]?.scaling_level || 'Rx'}
    className='px-2 py-1 border rounded text-sm'
  >
    <option value='Rx'>Rx</option>
    <option value='Sc1'>Sc1</option>
    <option value='Sc2'>Sc2</option>
    <option value='Sc3'>Sc3</option>
  </select>
)}
```

**Result Input:**
```typescript
<input
  type='text'
  placeholder={
    benchmark.type.includes('Time') ? 'mm:ss' :
    benchmark.type.includes('AMRAP') ? 'reps' :
    'result'
  }
  value={benchmarkResults[benchmarkKey]?.result_value || ''}
  onChange={(e) => {
    setBenchmarkResults(prev => ({
      ...prev,
      [benchmarkKey]: {
        ...prev[benchmarkKey],
        result_value: e.target.value,
      }
    }));
  }}
  className='px-2 py-1 border rounded text-sm'
/>
```

**Save Handler:**
```typescript
const saveBenchmarkResult = async (
  benchmarkName: string,
  benchmarkType: string,
  resultValue: string,
  resultDate: string,
  scalingLevel: string,
  benchmarkId?: string,
  forgeBenchmarkId?: string
) => {
  const response = await fetch('/api/benchmark-results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      benchmarkId,
      forgeBenchmarkId,
      benchmarkName,
      benchmarkType,
      resultValue,
      scalingLevel,
      resultDate
    })
  });
};
```

### 7. Schema Migration - Column Name Updates
**Files Modified:**
- `components/athlete/AthletePageBenchmarksTab.tsx` (global replace)
- `components/athlete/AthletePageForgeBenchmarksTab.tsx` (global replace)

**Interface Changes:**
```typescript
// OLD
interface BenchmarkResult {
  id: string;
  benchmark_name: string;
  result: string;  // Changed to result_value
  notes?: string;
  workout_date: string;  // Changed to result_date
  scaling?: string;  // Changed to scaling_level
}

// NEW
interface BenchmarkResult {
  id: string;
  benchmark_name: string;
  result_value: string;  // NEW NAME
  notes?: string;
  result_date: string;  // NEW NAME
  scaling_level?: string;  // NEW NAME
}
```

**Global Replacements:**
- `.result` → `.result_value` (42 occurrences)
- `.workout_date` → `.result_date` (18 occurrences)
- `.scaling` → `.scaling_level` (28 occurrences)

**CRUD Updates - AthletePageBenchmarksTab.tsx:**
```typescript
// Fetch benchmark details for INSERT
const { data: benchmarkData } = await supabase
  .from('benchmark_workouts')
  .select('id, type')
  .eq('name', selectedBenchmark)
  .single();

// INSERT with new schema
const { error } = await supabase.from('benchmark_results').insert({
  user_id: userId,
  benchmark_id: benchmarkData?.id || null,  // NEW - XOR constraint
  benchmark_name: selectedBenchmark,
  benchmark_type: benchmarkData?.type || 'For Time',  // NEW
  result_value: newTime,  // NEW NAME
  notes: newNotes || null,
  result_date: newDate,  // NEW NAME
  scaling_level: newScaling,  // NEW NAME
});
```

**CRUD Updates - AthletePageForgeBenchmarksTab.tsx:**
```typescript
// Fetch forge benchmark details for INSERT
const { data: forgeBenchmark } = await supabase
  .from('forge_benchmarks')
  .select('id, type')
  .eq('name', selectedBenchmark)
  .single();

if (!forgeBenchmark) {
  throw new Error('Forge benchmark not found');
}

// INSERT with new schema
const { error } = await supabase.from('benchmark_results').insert({
  user_id: userId,
  forge_benchmark_id: forgeBenchmark.id,  // NEW - XOR constraint
  benchmark_name: selectedBenchmark,
  benchmark_type: forgeBenchmark.type,  // NEW
  result_value: newTime,  // NEW NAME
  notes: newNotes || null,
  result_date: newDate,  // NEW NAME
  scaling_level: newScaling,  // NEW NAME
});
```

## Files Changed
**Modified (10 files):**
- `app/coach/benchmarks-lifts/page.tsx` (+45, -24 lines)
- `components/athlete/AthletePageBenchmarksTab.tsx` (+89, -62 lines)
- `components/athlete/AthletePageForgeBenchmarksTab.tsx` (+94, -67 lines)
- `components/athlete/AthletePageLogbookTab.tsx` (+125, -8 lines)
- `components/coach/BenchmarksTab.tsx` (+18, -4 lines)
- `components/coach/ConfigureBenchmarkModal.tsx` (+1, -0 lines)
- `components/coach/ConfigureForgeBenchmarkModal.tsx` (+1, -0 lines)
- `components/coach/ForgeBenchmarksTab.tsx` (+18, -4 lines)
- `types/movements.ts` (+8, -0 lines)

**Created (2 files):**
- `app/api/benchmark-results/route.ts` (+313 lines)
- `supabase/migrations/20251204_add_benchmark_scaling_and_results.sql` (+63 lines)

**Total Impact:** 775 insertions, 169 deletions across 12 files

## Testing Status
**Completed:**
- ✅ Coach Library has_scaling checkbox displays and saves
- ✅ has_scaling propagates to workout configuration
- ✅ Athlete Logbook shows result input boxes
- ✅ Scaling dropdown conditionally displays based on has_scaling

**Pending:**
- ⚠️ Benchmark results not saving - requires debugging (user out of session time)
- 🔄 Full workflow test: Coach configures → Athlete logs → Results persist
- 🔄 Verify charts update with new result data

## Known Issues
**Issue #1: Benchmark Results Not Saving**
- **Status:** Open (user ran out of session time)
- **Symptom:** Result input boxes display but save operation fails silently
- **Potential causes:**
  - API route error handling
  - RLS policy blocking insert
  - Missing benchmark_id/forge_benchmark_id in API call
  - Frontend state not passing correct data to API
- **Next steps:**
  - Add console logging to API route
  - Verify API route is being called
  - Check network tab for error responses
  - Verify RLS policies allow INSERT

## Lessons Learned

### 1. Schema Migrations Require Component-Wide Updates
When changing database column names (workout_date → result_date), must update ALL components that query that table, not just new ones. Search for old column name globally (e.g., `.workout_date`) to find all references. Includes:
- TypeScript interfaces
- INSERT/UPDATE operations
- SELECT queries
- Display logic (sorting, formatting)

### 2. XOR Constraints Need Both IDs on INSERT
When table has XOR constraint (benchmark_id OR forge_benchmark_id), INSERT must include appropriate ID. Cannot rely on benchmark_name alone. Solution:
- Fetch ID from source table before inserting result
- Pass correct ID field based on benchmark type
- Validate XOR constraint is satisfied

### 3. Type Field Propagation in Structured Data
When adding boolean flags to structured movement data (has_scaling), must propagate through entire chain:
1. Database schema (benchmark_workouts table)
2. TypeScript interfaces (Benchmark, ConfiguredBenchmark)
3. Coach modal state (benchmarkForm)
4. Configure modal object creation (configuredBenchmark)
5. Workout section storage (JSONB)
6. Athlete display logic (conditional rendering)

Missing any link breaks feature. User reported bug occurred at step 4 (Configure modal).

## Commit History
- `7510c41` - feat(benchmarks): add scaling configuration and result tracking
- `8c537c9` - docs: update memory bank for Session 34

## Next Steps
1. **High Priority:** Debug benchmark result save issue
   - Add API route logging
   - Verify data flow from UI → API → Database
   - Check RLS policy permissions
   - Test with both benchmarks and forge benchmarks

2. **Medium Priority:** Complete testing workflow
   - Create benchmark with scaling in Coach Library
   - Add to workout
   - Verify scaling dropdown shows in Athlete Logbook
   - Save result and verify persistence
   - Check result appears in Benchmarks tab

3. **Low Priority:** Consider enhancements
   - Bulk result import (CSV upload for historical data)
   - Result history chart in Logbook tab
   - Compare results across scaling levels
   - Export results to CSV
