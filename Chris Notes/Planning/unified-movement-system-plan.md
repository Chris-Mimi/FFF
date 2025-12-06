# Unified Movement Tracking System - Implementation Plan

## Problem Statement

**Current Issues:**
- 4 separate tracking systems (lifts, benchmarks, forge benchmarks, exercises) create fragmented UX
- Foundational movements like "Max Push-Ups" cannot be tracked (exercises aren't trackable)
- Your EMOM example (Max Push-Ups, Pull-Ups, L-Sit Holds) requires creating 3+ separate benchmarks to track
- Athletes have fragmented Records tab (3 separate sections with duplicate logic)
- Code duplication across 3 configure modals, 3 result input flows, 3 PR calculation functions

**User Requirements:**
- Programming: Both library option AND inline "make trackable" toggle
- Athlete UI: Multi-field support (time, reps, weight, duration, distance, rounds+reps, scaling)
- Data Model: Unified system preferred (single movements table)
- Library: Pre-populate common max efforts, holds, cardio benchmarks

---

## Recommended Solution: Unified Movements Architecture

### Core Design

**Single `movements` table** consolidates:
- ✓ barbell_lifts (11 lifts)
- ✓ benchmark_workouts (21 benchmarks)
- ✓ forge_benchmarks (gym-specific)
- ✓ New trackable exercises (max efforts, holds, cardio)

**Single `movement_results` table** consolidates:
- ✓ lift_records (weight, reps, rep schemes)
- ✓ benchmark_results (time, reps, weight, scaling)
- ✓ wod_section_results (flexible multi-field)

**Key Innovation:** Dynamic result fields via JSONB
```json
{
  "Fran": {"time": true, "scaling": true},
  "Max Push-Ups": {"reps": true},
  "L-Sit Hold": {"duration_seconds": true},
  "Max SkiErg": {"distance_meters": true}
}
```

Athlete UI renders only the relevant inputs based on `movement.result_fields`.

---

## Database Schema

### `movements` Table (NEW)
```sql
CREATE TABLE movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,                    -- "Max Strict Push-Ups", "Fran", "Back Squat"
  category TEXT NOT NULL,                       -- 'lift' | 'benchmark' | 'forge_benchmark' | 'max_effort' | 'hold' | 'cardio'
  movement_type TEXT NOT NULL,                  -- 'for_time' | 'amrap' | 'max_weight' | 'max_reps' | 'max_hold' | 'max_distance'
  result_fields JSONB NOT NULL,                 -- {"time": true, "reps": true, "scaling": true}
  description TEXT,                             -- Full workout description
  has_scaling BOOLEAN DEFAULT FALSE,            -- Rx/Sc1/Sc2/Sc3 support
  is_barbell_lift BOOLEAN DEFAULT FALSE,        -- Special handling for lifts
  display_order INTEGER,                        -- Sort order in library
  source_exercise_id UUID REFERENCES exercises(id),  -- Link to exercises table (optional)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_movements_category ON movements(category);
CREATE INDEX idx_movements_name ON movements(name);
```

### `movement_results` Table (NEW)
```sql
CREATE TABLE movement_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id UUID NOT NULL REFERENCES movements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Multi-field results (null if not applicable)
  time_result TEXT,                             -- "5:23" (mm:ss)
  reps_result INTEGER,                          -- 156 reps
  weight_result NUMERIC(6,2),                   -- 80.5 kg
  distance_result NUMERIC(8,2),                 -- 245 meters
  duration_seconds INTEGER,                     -- 45 seconds (hold time)
  scaling_level TEXT CHECK (scaling_level IN ('Rx', 'Sc1', 'Sc2', 'Sc3')),

  -- Lift-specific fields
  rep_scheme TEXT,                              -- '5x5' | '1RM' | '3RM' | '5RM' | '10RM'
  calculated_1rm NUMERIC(6,2),                  -- Epley formula result

  notes TEXT,
  result_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one result per user per movement per date per rep_scheme
  UNIQUE(user_id, movement_id, result_date, rep_scheme)
);

CREATE INDEX idx_movement_results_user ON movement_results(user_id);
CREATE INDEX idx_movement_results_movement ON movement_results(movement_id);
CREATE INDEX idx_movement_results_date ON movement_results(result_date DESC);
CREATE INDEX idx_movement_results_user_movement ON movement_results(user_id, movement_id, result_date DESC);
```

---

## Migration Strategy (Clean Cutover - Beta Mode)

**Since you're the only test athlete, we can do a clean schema change:**

### Single Migration (Week 1)
1. Execute migration: `20251207_create_movements_table.sql`
2. Execute migration: `20251207_create_movement_results_table.sql`
3. Execute migration: `20251207_migrate_existing_data.sql`:
   - Migrate `barbell_lifts` → `movements`
   - Migrate `benchmark_workouts` → `movements`
   - Migrate `forge_benchmarks` → `movements`
   - Migrate your test `lift_records` → `movement_results`
   - Migrate your test `benchmark_results` → `movement_results`
4. Execute migration: `20251207_seed_trackable_exercises.sql` (28 movements)
5. DROP old tables (clean slate)

**Rollback:** If issues, restore from backup and fix before re-running

**No Dual-Write Needed:** Straight to new schema, update all code at once

---

## TypeScript Interface Changes

### Before (Fragmented)
```typescript
// 3 separate interfaces
interface ConfiguredLift { ... }
interface ConfiguredBenchmark { ... }
interface ConfiguredForgeBenchmark { ... }
```

### After (Unified)
```typescript
interface Movement {
  id: string;
  name: string;
  category: 'lift' | 'benchmark' | 'forge_benchmark' | 'max_effort' | 'hold' | 'cardio';
  movement_type: 'for_time' | 'amrap' | 'max_weight' | 'max_reps' | 'max_hold' | 'max_distance';
  result_fields: ResultFields;  // Dynamic input schema
  description?: string;
  has_scaling: boolean;
  is_barbell_lift: boolean;
}

interface ResultFields {
  time?: boolean;              // Show time input (mm:ss)
  reps?: boolean;              // Show reps input
  weight?: boolean;            // Show weight input (kg)
  distance_meters?: boolean;   // Show distance input
  duration_seconds?: boolean;  // Show duration input (holds)
  scaling?: boolean;           // Show scaling dropdown
  rounds_reps?: boolean;       // Show rounds+reps inputs (AMRAP)
}

interface MovementResult {
  id: string;
  movement_id: string;
  user_id: string;
  time_result?: string;
  reps_result?: number;
  weight_result?: number;
  distance_result?: number;
  duration_seconds?: number;
  scaling_level?: 'Rx' | 'Sc1' | 'Sc2' | 'Sc3';
  rep_scheme?: string;
  result_date: string;
}

interface ConfiguredMovement extends Movement {
  // Used in WOD sections
  visibility: 'everyone' | 'coaches' | 'programmers';
  coach_notes?: string;
  athlete_notes?: string;
  // Lift-specific fields (if is_barbell_lift=true)
  rep_type?: 'constant' | 'variable';
  sets?: number;
  reps?: number;
  percentage_1rm?: number;
  variable_sets?: VariableSet[];
}
```

---

## Coach Programming UX

### Movement Library (Updated)
**Component:** `/components/coach/MovementLibraryPopup.tsx`

**Changes:**
- Keep 6 tabs: `[Exercises] [Lifts] [Benchmarks] [Forge] [Max Efforts] [Holds] [Cardio]`
- All tabs (except Exercises) query `movements` table filtered by `category`
- Exercises tab unchanged (still from `exercises` table, not trackable)

**NEW Tab Examples:**
```
Max Efforts Tab:
- Max Strict Push-Ups
- Max Strict Pull-Ups
- Max HSPU
- Max Burpees (1 min)
- Max Air Squats (1 min)
[+ Create Max Effort]

Holds Tab:
- Parallettes L-Sit Hold
- Plank Hold
- Dead Hang
- Handstand Hold
[+ Create Hold]

Cardio Tab:
- Max SkiErg Metres (1 min)
- Max Row Metres (1 min)
- 500m Row (For Time)
- 2k Row (For Time)
[+ Create Cardio Benchmark]
```

---

### "Make Trackable" Feature (NEW)
**Location:** Inside WOD section text editor

**User Flow:**
1. Coach types: `"Max Strict Push-Ups"`
2. Highlights text, clicks **[⭐ Make Trackable]** button
3. Modal opens:
   ```
   ┌──────────────────────────────────┐
   │ Create Trackable Movement        │
   ├──────────────────────────────────┤
   │ Name: Max Strict Push-Ups        │
   │                                  │
   │ Category:                        │
   │ ○ Max Effort  ●                  │
   │ ○ Hold                           │
   │ ○ Cardio Benchmark               │
   │                                  │
   │ Result Type:                     │
   │ ○ Max Reps  ●                    │
   │ ○ Max Weight                     │
   │ ○ For Time                       │
   │ ○ Max Distance                   │
   │                                  │
   │ [Cancel]  [Create & Track]       │
   └──────────────────────────────────┘
   ```
4. On save:
   - Insert into `movements` table with `result_fields = {"reps": true}`
   - Replace text with trackable badge in WOD section
   - Athletes now see input field when logging

**Implementation:** New component `/components/coach/CreateTrackableModal.tsx`

---

### Configure Movement Modal (Unified)
**Component:** `/components/coach/ConfigureMovementModal.tsx` (NEW, replaces 3 modals)

**Dynamic Form Based on Movement Type:**

**For Lifts:**
```
Back Squat
Rep Type: ○ Constant (5x5)  ● Variable
Sets/Reps: [5_] x [5_] @ [75_]%
Section: [WOD ▼]
Athlete Notes: Record your heaviest set
[Add to Workout]
```

**For Benchmarks:**
```
Fran
Description: 21-15-9 Thrusters/Pull-Ups
Scaling: ☑ Enable (Rx/Sc1/Sc2/Sc3)
Section: [WOD ▼]
[Add to Workout]
```

**For Max Efforts:**
```
Max Strict Push-Ups
Result Type: Max Reps (auto-detected)
Section: [WOD ▼]
[Add to Workout]
```

---

## Athlete Result Input UX

### Logbook Tab (Updated)
**Component:** `/components/athlete/AthletePageLogbookTab.tsx`

**Before (Fragmented):**
```tsx
// 3 separate state objects
const [liftRecords, setLiftRecords] = useState({});
const [benchmarkResults, setBenchmarkResults] = useState({});
const [sectionResults, setSectionResults] = useState({});

// 3 separate save functions
saveLiftRecord();
saveBenchmarkResult();
saveSectionResult();
```

**After (Unified):**
```tsx
// Single state object
const [movementResults, setMovementResults] = useState<Record<string, MovementResult>>({});

// Single save function
const saveMovementResult = async (movementId: string, result: MovementResult) => {
  await fetch('/api/movement-results', {
    method: 'POST',
    body: JSON.stringify(result)
  });
};
```

**Dynamic Input Rendering:**
```tsx
const renderResultInputs = (movement: Movement) => {
  const fields = movement.result_fields;
  return (
    <div className="result-inputs">
      {fields.time && <TimeInput placeholder="mm:ss" />}
      {fields.reps && <RepsInput placeholder="Total reps" />}
      {fields.weight && <WeightInput placeholder="kg" />}
      {fields.duration_seconds && <DurationInput placeholder="seconds" />}
      {fields.distance_meters && <DistanceInput placeholder="meters" />}
      {movement.has_scaling && <ScalingDropdown options={['Rx', 'Sc1', 'Sc2', 'Sc3']} />}
      {fields.rounds_reps && (
        <>
          <RoundsInput placeholder="Complete rounds" />
          <RepsInput placeholder="+ reps" />
        </>
      )}
    </div>
  );
};
```

**Examples:**

| Movement | Result Fields | Rendered Inputs |
|----------|---------------|-----------------|
| Fran | `{time: true, scaling: true}` | Time: [__:__] Scaling: [Rx ▼] |
| Max Push-Ups | `{reps: true}` | Reps: [___] |
| L-Sit Hold | `{duration_seconds: true}` | Duration: [0] min [__] sec |
| Max SkiErg (1 min) | `{distance_meters: true}` | Distance: [___] meters |
| Cindy (AMRAP) | `{rounds_reps: true}` | Rounds: [__] + Reps: [__] |

---

### Records Tab (Unified)
**Component:** `/components/athlete/AthletePageRecordsTab.tsx`

**Before (3 separate fetches):**
```tsx
// Fetch benchmarks
const benchmarks = await supabase.from('benchmark_workouts').select();
const benchmarkResults = await supabase.from('benchmark_results').select();

// Fetch forge benchmarks
const forgeNames = await supabase.from('forge_benchmarks').select();
const forgeResults = await supabase.from('benchmark_results').select();

// Fetch lifts
const lifts = await supabase.from('barbell_lifts').select();
const liftRecords = await supabase.from('lift_records').select();
```

**After (1 unified query):**
```tsx
const { data: results } = await supabase
  .from('movement_results')
  .select(`
    *,
    movement:movements(*)
  `)
  .eq('user_id', userId)
  .order('result_date', { ascending: false });

// Group by category
const grouped = {
  lifts: results.filter(r => r.movement.category === 'lift'),
  benchmarks: results.filter(r => r.movement.category === 'benchmark'),
  forge_benchmarks: results.filter(r => r.movement.category === 'forge_benchmark'),
  max_efforts: results.filter(r => r.movement.category === 'max_effort'),
  holds: results.filter(r => r.movement.category === 'hold'),
  cardio: results.filter(r => r.movement.category === 'cardio'),
};
```

**Display (Grouped by Category):**
```
┌─────────────────────────────────┐
│ Personal Records                │
├─────────────────────────────────┤
│ Total PRs: 47                   │
│                                 │
│ ▼ Lifts (8)                    │
│   Back Squat 1RM: 120kg        │
│   Snatch 1RM: 65kg             │
│                                 │
│ ▼ Benchmarks (12)              │
│   Fran (Rx): 5:23              │
│   Helen (Sc1): 12:45           │
│                                 │
│ ▼ Max Efforts (15)             │
│   Max Strict Push-Ups: 42      │
│   Max Strict Pull-Ups: 18      │
│                                 │
│ ▼ Holds (5)                    │
│   L-Sit Hold: 45s              │
│   Plank: 3:15                  │
│                                 │
│ ▼ Cardio Benchmarks (7)        │
│   Max SkiErg (1 min): 245m     │
│   500m Row: 1:38               │
└─────────────────────────────────┘
```

**PR Calculation (Smart):**
```tsx
const calculatePR = (results: MovementResult[], movement: Movement) => {
  if (movement.movement_type === 'for_time') {
    // Lower time = better
    return results.reduce((best, curr) => {
      const bestTime = parseTime(best.time_result);
      const currTime = parseTime(curr.time_result);
      return currTime < bestTime ? curr : best;
    });
  } else if (['max_reps', 'max_distance', 'max_hold'].includes(movement.movement_type)) {
    // Higher value = better
    return results.reduce((best, curr) => {
      const bestValue = getNumericValue(best);
      const currValue = getNumericValue(curr);
      return currValue > bestValue ? curr : best;
    });
  }
  // Max weight: highest weight
  return results.reduce((best, curr) => curr.weight_result > best.weight_result ? curr : best);
};
```

---

## API Route

### `/app/api/movement-results/route.ts` (NEW)

**POST /api/movement-results:**
```typescript
export async function POST(request: Request) {
  const {
    movementId,
    userId,
    timeResult,
    repsResult,
    weightResult,
    distanceResult,
    durationSeconds,
    scalingLevel,
    repScheme,
    notes,
    resultDate
  } = await request.json();

  // Validate: at least one result field required
  if (!timeResult && !repsResult && !weightResult && !distanceResult && !durationSeconds) {
    return Response.json({ error: 'At least one result field required' }, { status: 400 });
  }

  // Upsert logic
  const { data: existing } = await supabase
    .from('movement_results')
    .select('id')
    .eq('user_id', userId)
    .eq('movement_id', movementId)
    .eq('result_date', resultDate)
    .eq('rep_scheme', repScheme || null)
    .maybeSingle();

  if (existing) {
    // Update
    await supabase
      .from('movement_results')
      .update({
        time_result: timeResult || null,
        reps_result: repsResult || null,
        weight_result: weightResult || null,
        distance_result: distanceResult || null,
        duration_seconds: durationSeconds || null,
        scaling_level: scalingLevel || null,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);
  } else {
    // Insert
    await supabase.from('movement_results').insert({
      movement_id: movementId,
      user_id: userId,
      time_result: timeResult || null,
      reps_result: repsResult || null,
      weight_result: weightResult || null,
      distance_result: distanceResult || null,
      duration_seconds: durationSeconds || null,
      scaling_level: scalingLevel || null,
      rep_scheme: repScheme || null,
      notes: notes || null,
      result_date: resultDate
    });
  }

  return Response.json({ success: true });
}
```

---

## Pre-Populated Movements (28 Total)

### Max Efforts (15)
- Max Strict Push-Ups
- Max Strict Pull-Ups
- Max HSPU
- Max Dips
- Max Air Squats
- Max Lunges (1 min)
- Max Burpees (1 min)
- Max Calories Assault Bike (1 min)
- Max Calories Rower (1 min)
- Max Wall Ball Shots (1 min)
- Max Box Jumps (1 min)
- Max Double Unders (1 min)
- Max Sit-Ups (1 min)
- Max Toes to Bar (1 min)
- Max Chest to Bar Pull-Ups

### Holds (5)
- Parallettes L-Sit Hold
- Plank Hold
- Dead Hang
- Handstand Hold
- Hollow Hold

### Cardio Benchmarks (8)
- Max SkiErg Metres (1 min)
- Max Row Metres (1 min)
- Max Assault Bike Cals (1 min)
- 500m Row (For Time)
- 2k Row (For Time)
- 1 Mile Run (For Time)
- 5k Run (For Time)
- 400m Run (For Time)

---

## How This Solves Your EMOM Example

**Your Workout:**
```
2 x EMOM 20 mins total:
Min 1: Max Strict Push-Ups
Min 2: Max Strict Pull-Ups
Min 3: Max secs Parallettes L-Sit Hold
Min 4: Max SkiErg Metres
Min 5: Max metres KB OH Carry
Min 6: Max Rower Metres
```

**Current System (BROKEN):**
- Push-Ups = plain text in exercises, no tracking
- Pull-Ups = plain text, no tracking
- L-Sit = not in any library, no tracking
- SkiErg = not in any library, no tracking
- KB Carry = not trackable
- Rower = not trackable

**NEW System (WORKS):**

1. **Coach Programming:** Open Movement Library → "Max Efforts" tab
   - Click "Max Strict Push-Ups" → Add to section
   - Click "Max Strict Pull-Ups" → Add to section
   - Click "Max Parallettes L-Sit Hold" (from Holds tab) → Add
   - Click "Max SkiErg Metres (1 min)" (from Cardio tab) → Add
   - Type "Max metres KB OH Carry" → [⭐ Make Trackable] → Select "Max Distance" → Add
   - Click "Max Row Metres (1 min)" (from Cardio tab) → Add

2. **Athlete Sees (Logbook Tab):**
   ```
   Min 1: Max Strict Push-Ups
   Reps: [42___]  ← Simple input

   Min 2: Max Strict Pull-Ups
   Reps: [18___]

   Min 3: Max Parallettes L-Sit Hold
   Duration: [0_] min [45_] sec

   Min 4: Max SkiErg Metres
   Distance: [245___] meters

   Min 5: Max KB OH Carry
   Distance: [25___] meters

   Min 6: Max Row Metres
   Distance: [312___] meters
   ```

3. **Results Tracked:**
   - All 6 movements show as PRs in Records tab
   - Grouped under "Max Efforts", "Holds", "Cardio"
   - Charts available for all movements with 2+ scores
   - Compare progress over time

**The Key:** `result_fields` tells the UI what to show. No more guessing!

---

## Implementation Timeline (Simplified - 4 Weeks)

### Week 1: Database + Types
- [ ] Create 4 migration files (movements, movement_results, migrate data, seed)
- [ ] Execute all migrations → DROP old tables (clean slate)
- [ ] Update `/types/movements.ts` with unified interfaces
- [ ] Verify test data migrated correctly

### Week 2: Coach UI
- [ ] Update `/components/coach/MovementLibraryPopup.tsx` (6 tabs from `movements`)
- [ ] Create `/components/coach/ConfigureMovementModal.tsx` (unified)
- [ ] Create `/components/coach/CreateTrackableModal.tsx` (inline trackable)
- [ ] Test: Program your EMOM example with all 6 movements

### Week 3: Athlete UI + API
- [ ] Create `/app/api/movement-results/route.ts`
- [ ] Update `/components/athlete/AthletePageLogbookTab.tsx` (dynamic inputs)
- [ ] Create `/components/athlete/MovementResultInput.tsx` (reusable)
- [ ] Test: Log results for all 6 EMOM movements

### Week 4: Records Tab + Polish
- [ ] Update `/components/athlete/AthletePageRecordsTab.tsx` (unified query)
- [ ] Add category grouping (Lifts, Benchmarks, Max Efforts, Holds, Cardio)
- [ ] Test: Verify PRs show correctly for all movement types
- [ ] Fix bugs, polish UX

---

## Risk Assessment & Mitigation

### High Risk: Data Loss During Migration
**Mitigation:**
- Shadow mode: Old tables untouched during Week 1
- Dual-write: Both tables updated during Weeks 2-4
- Verification scripts: Daily comparison of row counts
- Rollback plan: Revert to old tables at any phase

### Medium Risk: Breaking Existing Tracking
**Mitigation:**
- Preserve backward compatibility during dual-write phase
- Athletes continue using existing UI until Week 5
- Gradual rollout: Coach UI first, then Athlete UI

### Low Risk: Performance Degradation
**Mitigation:**
- Indexes on `movement_results` (user_id, movement_id, result_date)
- Single JOIN query vs 3 separate queries (should be faster)
- Monitor query performance before/after cutover

### Low Risk: Athlete Confusion
**Mitigation:**
- UI is SIMPLIFIED (not identical) - fewer inputs, smarter detection
- Example: Max Push-Ups just shows "Reps: [__]" instead of complex multi-field form
- Records tab groups PRs by category for easier scanning

---

## Critical Files to Modify

### Database Migrations (4 files)
1. `/supabase/migrations/20251207_create_movements_table.sql`
2. `/supabase/migrations/20251207_create_movement_results_table.sql`
3. `/supabase/migrations/20251207_migrate_existing_data.sql`
4. `/supabase/migrations/20251207_seed_trackable_exercises.sql`

### TypeScript Types (1 file)
5. `/types/movements.ts`

### API Routes (1 file)
6. `/app/api/movement-results/route.ts` (NEW)

### Coach Components (4 files)
7. `/components/coach/MovementLibraryPopup.tsx`
8. `/components/coach/ConfigureMovementModal.tsx` (NEW, replaces 3 modals)
9. `/components/coach/CreateTrackableModal.tsx` (NEW)
10. `/hooks/coach/useMovementConfiguration.ts`

### Athlete Components (4 files)
11. `/components/athlete/AthletePageLogbookTab.tsx`
12. `/components/athlete/AthletePageRecordsTab.tsx`
13. `/components/athlete/MovementResultInput.tsx` (NEW)
14. `/hooks/athlete/useLogbookData.ts`

---

## Success Metrics

- ✅ All 11 barbell lifts migrated
- ✅ All 21 benchmarks migrated
- ✅ All your test results preserved (0 data loss)
- ✅ **Coach can program your EMOM example in <2 minutes** (6 movements)
- ✅ **Athlete sees simple, appropriate inputs** (reps for push-ups, duration for L-sit, distance for SkiErg)
- ✅ PRs show in Records tab grouped by category
- ✅ Logbook loads fast (<1s)
- ✅ No regressions in existing lift/benchmark tracking

---

## Next Steps

1. **Review this plan** - Confirm unified approach vs simpler alternatives
2. **Approve phased migration** - Zero downtime, rollback at any phase
3. **Execute Week 1** - Database migrations + data migration
4. **Verify migration** - Confirm row counts match before proceeding
5. **Begin Week 2** - TypeScript types + API development
