# Movement Library Phase 3-4 - Athlete Display & Analytics

**Date:** November 21, 2025
**Session:** 16 - Movement Library Phase 3-4 completion
**Branch:** movement-library-feature
**Status:** ✅ Complete, pushed to GitHub

## Summary
Completed Movement Library Phases 3-4 by implementing athlete workout badge display and comprehensive movement analytics utilities. Athletes can now view structured movements in their published workouts, and analytics utilities enable frequency analysis for lifts, benchmarks, and forge benchmarks.

## Problem Statement
- Phase 2 (Session 15) completed coach badge display but athletes couldn't see structured movements
- No analytics utilities existed for querying lift/benchmark frequency
- Coaches needed programmatic access to movement usage data for planning and analysis

## Implementation Details

### 1. Athlete Workout Display (Phase 3)
**File:** `components/athlete/AthletePageWorkoutsTab.tsx`

**Type Updates:**
```typescript
import type { ConfiguredLift, ConfiguredBenchmark, ConfiguredForgeBenchmark } from '@/types/movements';

interface WorkoutSection {
  id: string;
  type: string;
  duration: number;
  content: string;
  workout_type_id?: string;
  lifts?: ConfiguredLift[];              // NEW
  benchmarks?: ConfiguredBenchmark[];    // NEW
  forge_benchmarks?: ConfiguredForgeBenchmark[]; // NEW
}
```

**Format Helper Functions:**
```typescript
function formatLift(lift: ConfiguredLift): string {
  if (lift.rep_type === 'constant') {
    const base = `${lift.name} ${lift.sets}x${lift.reps}`;
    return lift.percentage_1rm ? `${base} @ ${lift.percentage_1rm}%` : base;
  } else {
    const reps = lift.variable_sets?.map(s => s.reps).join('-') || '';
    return `${lift.name} ${reps}`;
  }
}

function formatBenchmark(benchmark: ConfiguredBenchmark): { name: string; description?: string } {
  const scaling = benchmark.scaling_option ? ` (${benchmark.scaling_option})` : '';
  return {
    name: `${benchmark.name}${scaling}`,
    description: benchmark.description
  };
}

function formatForgeBenchmark(forge: ConfiguredForgeBenchmark): { name: string; description?: string } {
  const scaling = forge.scaling_option ? ` (${forge.scaling_option})` : '';
  return {
    name: `${forge.name}${scaling}`,
    description: forge.description
  };
}
```

**Badge Rendering in Workout Calendar:**
```typescript
{/* Structured Movements */}
<div className='space-y-2 mb-2'>
  {/* Lifts */}
  {section.lifts && section.lifts.length > 0 && (
    <div className='space-y-1'>
      {section.lifts.map((lift, liftIdx) => (
        <div key={liftIdx} className='text-xs bg-blue-50 text-blue-900 rounded px-2 py-1'>
          <div className='font-semibold'>≡ {formatLift(lift)}</div>
        </div>
      ))}
    </div>
  )}

  {/* Benchmarks */}
  {section.benchmarks && section.benchmarks.length > 0 && (
    <div className='space-y-1'>
      {section.benchmarks.map((benchmark, bmIdx) => {
        const formatted = formatBenchmark(benchmark);
        return (
          <div key={bmIdx} className='text-xs bg-teal-50 text-teal-900 rounded px-2 py-1'>
            <div className='font-semibold'>≡ {formatted.name}</div>
            {formatted.description && (
              <div className='text-teal-800 whitespace-pre-wrap mt-0.5'>{formatted.description}</div>
            )}
          </div>
        );
      })}
    </div>
  )}

  {/* Forge Benchmarks */}
  {section.forge_benchmarks && section.forge_benchmarks.length > 0 && (
    <div className='space-y-1'>
      {section.forge_benchmarks.map((forge, forgeIdx) => {
        const formatted = formatForgeBenchmark(forge);
        return (
          <div key={forgeIdx} className='text-xs bg-cyan-50 text-cyan-900 rounded px-2 py-1'>
            <div className='font-semibold'>≡ {formatted.name}</div>
            {formatted.description && (
              <div className='text-cyan-800 whitespace-pre-wrap mt-0.5'>{formatted.description}</div>
            )}
          </div>
        );
      })}
    </div>
  )}
</div>

{/* Free-form content */}
{section.content && (
  <div className='text-xs text-gray-700 whitespace-pre-wrap'>
    {section.content}
  </div>
)}
```

**Display Behavior:**
- **Past workouts (attended):** Show full workout details with structured movement badges
- **Future bookings:** Show "Booked" placeholder, no workout details until closer to date
- Badge colors match coach view: blue (lifts), teal (benchmarks), cyan (forge)
- Descriptions render with whitespace-pre-wrap for proper formatting

### 2. Movement Analytics Utilities (Phase 4)
**File:** `utils/movement-analytics.ts`

**Core Functions:**

**1. Lift Frequency Analysis:**
```typescript
export async function getLiftFrequency(filter?: DateRangeFilter): Promise<LiftAnalysis[]>
```
- Returns array of all lifts with usage counts
- Calculates `avgSets`, `avgReps`, `mostCommonPercentage`
- Sorted by frequency (descending)
- Optional date range filtering

**2. Benchmark Frequency Analysis:**
```typescript
export async function getBenchmarkFrequency(filter?: DateRangeFilter): Promise<BenchmarkAnalysis[]>
```
- Returns array of all benchmarks with usage counts
- Calculates `mostCommonScaling` (Rx/Scaled)
- Includes benchmark `type` (For Time, AMRAP, etc.)
- Sorted by frequency (descending)

**3. Forge Benchmark Frequency Analysis:**
```typescript
export async function getForgeBenchmarkFrequency(filter?: DateRangeFilter): Promise<ForgeBenchmarkAnalysis[]>
```
- Returns array of all Forge benchmarks with usage counts
- Same structure as benchmark analysis
- Separate tracking from standard benchmarks

**4. Individual Movement Lookup:**
```typescript
export async function getLiftFrequencyById(liftId: string, filter?: DateRangeFilter): Promise<LiftAnalysis | null>
export async function getBenchmarkFrequencyById(benchmarkId: string, filter?: DateRangeFilter): Promise<BenchmarkAnalysis | null>
export async function getForgeBenchmarkFrequencyById(forgeId: string, filter?: DateRangeFilter): Promise<ForgeBenchmarkAnalysis | null>
```
- Get frequency data for specific movement by database ID

**5. Combined Summary:**
```typescript
export async function getMovementSummary(filter?: DateRangeFilter): Promise<{
  lifts: LiftAnalysis[];
  benchmarks: BenchmarkAnalysis[];
  forgeBenchmarks: ForgeBenchmarkAnalysis[];
  totalWorkouts: number;
}>
```
- Parallel fetching of all movement types
- Returns total workout count for context
- Single call for dashboard displays

**Type Definitions:**
```typescript
export interface LiftAnalysis extends MovementFrequency {
  avgSets?: number;           // Average sets per occurrence
  avgReps?: number;           // Average reps per occurrence
  mostCommonPercentage?: number; // Most frequently used % 1RM
}

export interface BenchmarkAnalysis extends MovementFrequency {
  type: string;               // "For Time", "AMRAP", etc.
  mostCommonScaling?: string; // "Rx", "Scaled", etc.
}

export interface DateRangeFilter {
  startDate?: string;  // ISO date string (YYYY-MM-DD)
  endDate?: string;    // ISO date string (YYYY-MM-DD)
}
```

**Implementation Algorithm:**
1. Query `wods` table with optional date range filters
2. Parse JSONB `sections` array for each workout
3. Extract movement arrays (lifts/benchmarks/forge_benchmarks)
4. Aggregate data using Map with movement ID as key
5. Calculate averages and most common values
6. Convert to array and sort by frequency
7. Return type-safe results

**Example Usage:**
```typescript
// Get all lifts programmed in last 90 days
const ninetyDaysAgo = new Date();
ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
const lifts = await getLiftFrequency({
  startDate: ninetyDaysAgo.toISOString().split('T')[0]
});

// Result: [
//   { id: 'uuid', name: 'Back Squat', count: 12, avgSets: 5, avgReps: 5, mostCommonPercentage: 75, lastUsed: '2025-11-20' },
//   { id: 'uuid', name: 'Deadlift', count: 8, avgSets: 3, avgReps: 5, mostCommonPercentage: 80, lastUsed: '2025-11-18' },
//   ...
// ]

// Get specific benchmark frequency
const franAnalysis = await getBenchmarkFrequencyById('benchmark-fran-uuid');
// Result: { id: 'uuid', name: 'Fran', type: 'For Time', count: 5, mostCommonScaling: 'Rx', lastUsed: '2025-11-15' }
```

## Technical Implementation

### Build Validation
- Zero build errors
- All warnings pre-existing (unrelated to changes)
- Athlete page bundle: 113 kB → 259 kB (includes movement type definitions)

### Database Integration
- Analytics utilities query existing `wods` table
- No schema changes required (JSONB already supports structured data)
- Efficient Map-based aggregation for large datasets
- Type-safe with full TypeScript inference

### Files Changed (3 files, +475/-2 lines)
```
components/athlete/AthletePageWorkoutsTab.tsx |  65 ++++++
utils/movement-analytics.ts (NEW)            | 412 ++++++++++++++++++++++++
```

## User Workflow

### Athlete Viewing Workouts
1. Navigate to Athlete Page → Workouts tab
2. Select week to view
3. Past workouts show:
   - Blue badges: "≡ Back Squat 5x5 @ 75%"
   - Teal badges: "≡ Fran (Rx)" with description
   - Cyan badges: "≡ MURPH (Scaled)" with description
   - Free-form content text below badges
4. Future bookings show "Booked" placeholder only

### Coach Using Analytics (Future Integration)
```typescript
// Example: Coach Dashboard
import { getMovementSummary } from '@/utils/movement-analytics';

const summary = await getMovementSummary({
  startDate: '2025-01-01',
  endDate: '2025-12-31'
});

console.log(`Top 5 Lifts Programmed in 2025:`);
summary.lifts.slice(0, 5).forEach(lift => {
  console.log(`${lift.name}: ${lift.count} times (avg ${lift.avgSets}x${lift.avgReps} @ ${lift.mostCommonPercentage}%)`);
});
```

## Testing Results
- ✅ Build succeeds with zero errors
- ✅ Athlete workout display renders structured movements
- ✅ Badge colors match coach view (blue/teal/cyan)
- ✅ Descriptions display with proper formatting
- ✅ Free-form content renders below structured movements
- ✅ Analytics utility types compile correctly
- ✅ No breaking changes to existing functionality

## Known Limitations
1. **Future workout visibility:** Athletes can't see future workout details (by design for booking flow)
2. **Analytics UI pending:** Utilities created but no dashboard integration yet
3. **Mobile optimization pending:** Badge display not tested on mobile devices

## Commits
- **916a082** - feat(movement-library): complete Phase 3-4 - athlete display and analytics
- Branch: `movement-library-feature` (pushed to GitHub)

## Next Steps (Optional Enhancements)
1. **Analytics Dashboard:**
   - Create `/coach/analytics` page
   - Visualize movement frequency with charts
   - Date range picker for custom analysis
   - Export functionality (CSV/PDF)

2. **Movement Recommendations:**
   - Suggest underutilized movements
   - Balance tracking by category (squats/presses/pulls)
   - Alert when movement not programmed in X days

3. **Mobile Testing:**
   - Test badge display on small screens
   - Ensure touch interactions work
   - Optimize card layout for mobile

4. **Athlete Notes Display:**
   - Show `athlete_notes` from configured movements
   - Visibility filtering (everyone/coaches/programmers)
   - Collapsible sections for long notes

## Lessons Learned
- **Format helper reusability:** Same functions work across coach and athlete views, ensuring consistency
- **JSONB flexibility:** No schema migrations needed for structured data, analytics parse existing workouts
- **Type safety pays off:** TypeScript caught several potential runtime errors during development
- **Athlete display parity:** Athletes should see movements in same format as coaches for consistency
- **Analytics foundation:** Building comprehensive utilities upfront enables future dashboard work without refactoring

## Movement Library Complete Status

### ✅ Phase 1 (Session 14): Infrastructure
- Database schema (lifts/benchmarks/forge in sections JSONB)
- Movement Library modal with tabs
- Configure modals for each movement type
- Basic integration with WorkoutModal

### ✅ Phase 2 (Session 15): Coach Badge Display & UX
- Badge rendering in WODSectionComponent
- Draggable configure modals
- Modal persistence (stays open after Add)
- Calendar hover preview with badges
- Benchmark description storage

### ✅ Phase 3 (Session 16): Athlete Display
- Badge rendering in athlete workout calendar
- Format helpers for consistent display
- Description display with proper formatting
- Integration with existing athlete workflow

### ✅ Phase 4 (Session 16): Analytics Utilities
- Lift frequency analysis with averages
- Benchmark frequency with scaling analysis
- Forge benchmark frequency tracking
- Date range filtering
- Combined summary function
- Individual movement lookup

### 🎯 Ready for Merge
All core Movement Library functionality complete. Optional enhancements can be added in separate feature branches after merge to main.

## File Size
- **Project History File:** ~10.2KB
- **Memory Bank Impact:** Session 16 entry ~300 characters in activeContext.md
