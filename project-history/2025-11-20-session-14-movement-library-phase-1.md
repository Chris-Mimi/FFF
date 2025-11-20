# Session 14: Movement Library Feature - Phase 1 (Lifts, Benchmarks, Forge)

**Date:** November 20, 2025
**Branch:** movement-library-feature (pushed)
**Status:** Phase 1 complete (10/18 todos) - Phase 2 pending

## Summary
Implemented core infrastructure for Movement Library feature enabling coaches to add structured Lifts, Benchmarks, and Forge Benchmarks to workout sections. Built tabbed library UI, three configuration modals with variable reps support, and integrated with existing WorkoutModal. Data stored as structured JSONB for future analytics.

## Planning Phase

**User Request:** "I need a way to get the Benchmarks, Forge Benchmarks & Barbell Lifts into the workouts"

**Requirements Gathered:**
1. Analytics needed (track programming frequency)
2. Mobile support required
3. Variable reps per-set (5@70%, 3@85%, 1@95%)
4. Constant reps with single percentage (5x5 @ 75%)
5. Button-based insertion (not drag-and-drop for mobile reliability)

**Planning Approach:**
- Created detailed 18-step implementation plan
- User saved plan to `Chris Notes/movement-library-feature Detailed Plan.md` for reference
- Decided on staged implementation (Phase 1: Infrastructure, Phase 2: Display/Testing)

## Changes Made

### 1. TypeScript Type System

**File:** `/types/movements.ts` (new, 98 lines)

**Interfaces Created:**
```typescript
// Core types
- VariableSet { set_number, reps, percentage_1rm? }
- ConfiguredLift (constant OR variable reps)
- ConfiguredBenchmark
- ConfiguredForgeBenchmark

// Database source types
- BarbellLift
- Benchmark
- ForgeBenchmark

// Extended WODSection
- Added: lifts?, benchmarks?, forge_benchmarks?
```

**Key Design Decision:**
- Structured JSONB arrays (not plain text) to enable analytics queries
- Discriminated union: `rep_type: 'constant' | 'variable'` determines which fields are present

### 2. Movement Library UI Component

**File:** `/components/coach/MovementLibraryPopup.tsx` (650 lines, renamed from ExerciseLibraryPopup)

**Features:**
- **4 Tabs:** Exercises | Lifts | Benchmarks | Forge
- **Data Fetching:** Conditional fetch based on active tab (lazy loading)
  - `exercises` table
  - `barbell_lifts` table (grouped by category: Squats, Presses, etc.)
  - `benchmark_workouts` table
  - `forge_benchmarks` table
- **Search:** Works across all tabs with tab-specific placeholders
- **UI:** Draggable/resizable popup, category headers, responsive grid
- **Arrows:** Lifts/Benchmarks/Forge show → arrow indicating "click to configure"

**Callbacks:**
```typescript
onSelectExercise(exercise: string)       // Insert as text (existing)
onSelectLift(lift: BarbellLift)         // Open ConfigureLiftModal
onSelectBenchmark(benchmark: Benchmark) // Open ConfigureBenchmarkModal
onSelectForgeBenchmark(forge: ForgeBenchmark) // Open ConfigureForgeBenchmarkModal
```

### 3. Configure Lift Modal

**File:** `/components/coach/ConfigureLiftModal.tsx` (440 lines)

**UI Layout:**
```
┌─────────────────────────────────────────┐
│ ← Configure Sets/Reps               ×  │
├─────────────────────────────────────────┤
│ Add to [WOD Section ▼]   [Add Button]  │
│                                         │
│ ≡ Back Squat 5x5                       │ ← Preview
│                                         │
│ [Constant Reps] [Variable Reps]         │ ← Tabs
│                                         │
│ CONSTANT:                               │
│   SETS  ×  REPS                         │
│    5       5                            │
│   [−][+]  [−][+]                        │
│                                         │
│   Percentage of 1RM: [75] %             │
│                                         │
│ VARIABLE:                               │
│  ┌────┬──────┬────────────┐             │
│  │Set │ Reps │ Percentage │             │
│  ├────┼──────┼────────────┤             │
│  │ #1 │  5   │    70      │             │
│  │ #2 │  3   │    85      │             │
│  │ #3 │  1   │    95      │             │
│  └────┴──────┴────────────┘             │
│  [+ Add Set] [- Remove Set]             │
│                                         │
│ Scaling Options: [None ▼]               │
│ Visible to: ⦿ Everyone ○ Coaches ○ Prog │
│ ▸ Coach notes...                        │
│ ▸ Athlete notes...                      │
└─────────────────────────────────────────┘
```

**Features:**
- Section dropdown pre-populated with active section
- Live preview with GripVertical icon
- +/− buttons for sets/reps
- Variable reps: Editable table with add/remove rows
- Per-set percentage inputs
- Expandable notes sections

**Props:**
```typescript
lift: BarbellLift | null
activeSection: WODSection | null
availableSections: WODSection[]
onAddToSection: (sectionId, configuredLift) => void
```

### 4. Configure Benchmark/Forge Modals

**Files:**
- `/components/coach/ConfigureBenchmarkModal.tsx` (165 lines)
- `/components/coach/ConfigureForgeBenchmarkModal.tsx` (165 lines)

**Simplified UI (no sets/reps):**
- Section selector + Add button
- Preview with name and type
- Description display (if available)
- Scaling Options dropdown
- Visibility radio buttons
- Coach/Athlete notes (expandable)

**Note:** Nearly identical components - could be refactored to single generic modal with type prop

### 5. Hook Integration

**File:** `/hooks/coach/useWorkoutModal.ts` (modified, +140 lines)

**Added State (6 variables):**
```typescript
const [liftModalOpen, setLiftModalOpen] = useState(false);
const [benchmarkModalOpen, setBenchmarkModalOpen] = useState(false);
const [forgeModalOpen, setForgeModalOpen] = useState(false);
const [selectedLift, setSelectedLift] = useState<BarbellLift | null>(null);
const [selectedBenchmark, setSelectedBenchmark] = useState<Benchmark | null>(null);
const [selectedForgeBenchmark, setSelectedForgeBenchmark] = useState<ForgeBenchmark | null>(null);
```

**Added Handlers (9 functions):**
```typescript
// Selection handlers (open config modals)
handleSelectLift(lift)
handleSelectBenchmark(benchmark)
handleSelectForgeBenchmark(forge)

// Add handlers (update formData.sections)
handleAddLiftToSection(sectionId, configuredLift)
handleAddBenchmarkToSection(sectionId, configuredBenchmark)
handleAddForgeBenchmarkToSection(sectionId, configuredForgeBenchmark)

// Remove handlers (filter arrays)
handleRemoveLift(sectionId, liftIndex)
handleRemoveBenchmark(sectionId, benchmarkIndex)
handleRemoveForgeBenchmark(sectionId, forgeIndex)
```

**Add Logic:**
```typescript
setFormData(prev => ({
  ...prev,
  sections: prev.sections.map(section =>
    section.id === sectionId
      ? {
          ...section,
          lifts: [...(section.lifts || []), configuredLift],
        }
      : section
  ),
}));
```

**Updated Interface:**
```typescript
export interface WODSection {
  id: string;
  type: string;
  duration: number;
  content: string;
  workout_type_id?: string;

  // NEW: Structured movements
  lifts?: ConfiguredLift[];
  benchmarks?: ConfiguredBenchmark[];
  forge_benchmarks?: ConfiguredForgeBenchmark[];
}
```

### 6. WorkoutModal Component Updates

**File:** `/components/coach/WorkoutModal.tsx` (modified, +64 lines)

**Imports Added:**
```typescript
import MovementLibraryPopup from '@/components/coach/MovementLibraryPopup';
import ConfigureLiftModal from '@/components/coach/ConfigureLiftModal';
import ConfigureBenchmarkModal from '@/components/coach/ConfigureBenchmarkModal';
import ConfigureForgeBenchmarkModal from '@/components/coach/ConfigureForgeBenchmarkModal';
```

**Component Instances (2 locations: panel mode & modal mode):**
```tsx
<MovementLibraryPopup
  isOpen={hook.libraryOpen}
  onSelectExercise={hook.handleSelectExercise}
  onSelectLift={hook.handleSelectLift}
  onSelectBenchmark={hook.handleSelectBenchmark}
  onSelectForgeBenchmark={hook.handleSelectForgeBenchmark}
/>

<ConfigureLiftModal
  isOpen={hook.liftModalOpen}
  lift={hook.selectedLift}
  activeSection={hook.activeSection !== null ? hook.formData.sections[hook.activeSection] : null}
  availableSections={hook.formData.sections}
  onClose={() => hook.setLiftModalOpen(false)}
  onAddToSection={hook.handleAddLiftToSection}
/>

{/* + ConfigureBenchmarkModal + ConfigureForgeBenchmarkModal */}
```

## Commits

**Single Commit:**
- `b169c7e` - feat(coach): add Movement Library with Lifts/Benchmarks/Forge integration (Phase 1)

**Files Changed:** 7 files, +1854 insertions, -5 deletions
- Created: `types/movements.ts`
- Created: `components/coach/MovementLibraryPopup.tsx`
- Created: `components/coach/ConfigureLiftModal.tsx`
- Created: `components/coach/ConfigureBenchmarkModal.tsx`
- Created: `components/coach/ConfigureForgeBenchmarkModal.tsx`
- Modified: `components/coach/WorkoutModal.tsx`
- Modified: `hooks/coach/useWorkoutModal.ts`

**Branch:** movement-library-feature (pushed to origin)

## Technical Details

### Data Flow

**Selection Flow:**
```
1. User clicks "Library" button
2. MovementLibraryPopup opens
3. User switches to "Lifts" tab
4. Component fetches barbell_lifts from database
5. User clicks "Back Squat" → onSelectLift(lift) fires
6. handleSelectLift sets selectedLift state
7. setLiftModalOpen(true)
8. ConfigureLiftModal renders with lift data
```

**Configuration Flow:**
```
1. User configures: 5 sets, 5 reps, 75%
2. User selects target section from dropdown
3. User clicks "Add" button
4. handleAddLiftToSection creates ConfiguredLift object:
   {
     id: "lift-uuid",
     name: "Back Squat",
     rep_type: "constant",
     sets: 5,
     reps: 5,
     percentage_1rm: 75,
     visibility: "everyone"
   }
5. Updates formData.sections[targetSection].lifts array
6. Closes modal
7. (Phase 2: Will display badge in section)
```

**Save Flow:**
```
1. User clicks main Save button
2. handleSubmit validates form
3. Sends formData (including sections with lifts[]) to Supabase
4. JSONB field stores structured arrays
5. Database persists:
   sections: [
     {
       id: "section-123",
       type: "WOD",
       content: "21-15-9 For Time:",
       lifts: [{ name: "Back Squat", sets: 5, reps: 5, ... }],
       benchmarks: [...],
       forge_benchmarks: [...]
     }
   ]
```

### JSONB Schema Example

**Database Storage:**
```json
{
  "sections": [
    {
      "id": "section-1234567890",
      "type": "WOD",
      "duration": 20,
      "content": "21-15-9 For Time:\n* Thrusters\n* Pull-ups",
      "lifts": [
        {
          "id": "lift-abc123",
          "name": "Back Squat",
          "rep_type": "constant",
          "sets": 5,
          "reps": 5,
          "percentage_1rm": 75,
          "visibility": "everyone"
        },
        {
          "id": "lift-def456",
          "name": "Strict Press",
          "rep_type": "variable",
          "variable_sets": [
            { "set_number": 1, "reps": 5, "percentage_1rm": 70 },
            { "set_number": 2, "reps": 3, "percentage_1rm": 85 },
            { "set_number": 3, "reps": 1, "percentage_1rm": 95 }
          ],
          "visibility": "everyone"
        }
      ],
      "benchmarks": [
        {
          "id": "benchmark-xyz789",
          "name": "Fran",
          "type": "For Time",
          "scaling_option": "Rx",
          "visibility": "everyone"
        }
      ],
      "forge_benchmarks": []
    }
  ]
}
```

### Future Analytics Queries

**Example: How often is Back Squat programmed?**
```sql
SELECT
  COUNT(*) as times_programmed,
  AVG((lift->>'sets')::int) as avg_sets,
  AVG((lift->>'reps')::int) as avg_reps
FROM wods,
  jsonb_array_elements(sections) as section,
  jsonb_array_elements(section->'lifts') as lift
WHERE lift->>'name' = 'Back Squat'
  AND wods.date >= '2025-01-01';
```

**Example: Which benchmarks are most common?**
```sql
SELECT
  benchmark->>'name' as benchmark_name,
  COUNT(*) as frequency
FROM wods,
  jsonb_array_elements(sections) as section,
  jsonb_array_elements(section->'benchmarks') as benchmark
GROUP BY benchmark->>'name'
ORDER BY frequency DESC;
```

## Testing Status

### ✅ Completed
- TypeScript compilation (zero errors)
- ESLint checks (warnings only, no errors)
- Build process (next build passes)
- Component rendering (no runtime errors)

### ❌ Not Yet Tested (Phase 2)
- **Visual Display:** Configured movements not yet shown in sections (badges pending)
- **Persistence:** Save → Reload workflow not tested
- **User Workflows:**
  - Lifts: Select → Configure → Add → Display → Save → Reload
  - Benchmarks: Full workflow
  - Forge: Full workflow
- **Mobile:** Button-based insertion on touch devices
- **Edge Cases:**
  - Empty percentage fields
  - Minimum 1 set for variable reps
  - Section deletion with configured movements

## Known Limitations (Phase 1)

1. **No Visual Feedback:** Configured movements added to state but not displayed in UI
2. **No Removal UI:** Remove handlers exist but no [×] buttons rendered yet
3. **No Format Helpers:** Display functions for "5x5 @ 75%" vs "5-3-1" not implemented
4. **No Analytics:** Utility functions for querying programmed movements not created
5. **Duplicate Code:** ConfigureBenchmarkModal and ConfigureForgeBenchmarkModal are nearly identical
6. **Old Component:** ExerciseLibraryPopup.tsx still exists (not deleted, replaced by MovementLibraryPopup)

## Phase 2 Remaining Work

**Priority 1: Display (Critical for UX)**
- Update WODSectionComponent to render configured movements
- Add badge display: "≡ Back Squat 5x5 @ 75% [×]"
- Add remove button handlers
- Format functions: formatLift(), formatBenchmark()

**Priority 2: Testing**
- Full workflow testing (Lifts, Benchmarks, Forge)
- Save → Reload persistence verification
- Mobile button insertion testing

**Priority 3: Analytics**
- Create `/utils/movement-analytics.ts`
- Implement getLiftProgrammingFrequency()
- Implement getBenchmarkFrequency()
- Add to Analysis page

**Priority 4: Cleanup**
- Delete ExerciseLibraryPopup.tsx
- Refactor ConfigureBenchmark + ConfigureForge into generic modal
- Fix ESLint warnings

**Estimated Effort:** 4-6 hours

## Lessons Learned

1. **Upfront Planning Pays Off:**
   - Created detailed 18-step plan before coding
   - User saved plan externally for reference
   - Prevented scope creep and kept session focused

2. **Structured Data Enables Analytics:**
   - JSONB arrays (not plain text) allow querying "how often is X programmed?"
   - Discriminated unions (`rep_type`) make data parsing type-safe
   - Future-proof design for reporting features

3. **Button > Drag for Mobile:**
   - Native mobile drag-and-drop is unreliable
   - Button-based insertion ("Add to [Section]") works everywhere
   - No platform-specific workarounds needed

4. **Variable Reps Need Table UI:**
   - 5-3-1 schemes can't be comma-separated input
   - Per-set configuration requires table (Set #, Reps, Percentage)
   - Users need to see set-by-set breakdown

5. **Phase Implementation Reduces Risk:**
   - Phase 1: Infrastructure (types, modals, handlers)
   - Phase 2: Display & testing
   - Allows user review before visual implementation

## Next Session Start Point

**Branch:** movement-library-feature
**Status:** Phase 1 complete, build passing
**Next Task:** Implement badge display in WODSectionComponent

**Start with:**
```typescript
// In WODSectionComponent.tsx
const formatLift = (lift: ConfiguredLift): string => {
  if (lift.rep_type === 'constant') {
    const base = `${lift.name} ${lift.sets}x${lift.reps}`;
    return lift.percentage_1rm ? `${base} @ ${lift.percentage_1rm}%` : base;
  } else {
    const reps = lift.variable_sets?.map(s => s.reps).join('-') || '';
    return `${lift.name} ${reps}`;
  }
};

// Render in section:
{section.lifts && section.lifts.length > 0 && (
  <div className="mt-2">
    {section.lifts.map((lift, idx) => (
      <div key={idx} className="flex items-center gap-2 bg-blue-100 rounded px-2 py-1">
        <GripVertical size={16} />
        <span>{formatLift(lift)}</span>
        <button onClick={() => hook.handleRemoveLift(section.id, idx)}>×</button>
      </div>
    ))}
  </div>
)}
```

**Reference:** User has detailed plan saved at `Chris Notes/movement-library-feature Detailed Plan.md`

---

**Session Duration:** ~2.5 hours
**Context Usage:** 57% (115K / 200K tokens)
**Files Created:** 5 new, 2 modified
**Lines Changed:** +1854 insertions, -5 deletions
