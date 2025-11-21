# Movement Library Phase 2 - Badge Display & UX Improvements

**Date:** November 21, 2025
**Session:** 15 - Movement Library Phase 2 completion
**Branch:** movement-library-feature
**Status:** ✅ Complete, pushed to GitHub

## Summary
Completed Movement Library Phase 2 by implementing badge display in WODSectionComponent, calendar hover integration with descriptions, and comprehensive UX improvements for configure modals. Verified database persistence and fixed benchmark description display.

## Problem Statement
- Phase 1 (Session 14) created infrastructure but movements weren't visible
- Configure modals opened centered, blocking workflow
- Modals closed after adding each item (inefficient)
- Calendar hover preview only showed free-form text, not structured movements
- Benchmark descriptions not stored or displayed (only names)

## Implementation Details

### 1. Badge Display in WODSectionComponent
**File:** `components/coach/WODSectionComponent.tsx`

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

function formatBenchmark(benchmark: ConfiguredBenchmark): string {
  const scaling = benchmark.scaling_option ? ` (${benchmark.scaling_option})` : '';
  return `${benchmark.name}${scaling}`;
}

function formatForgeBenchmark(forge: ConfiguredForgeBenchmark): string {
  const scaling = forge.scaling_option ? ` (${forge.scaling_option})` : '';
  return `${forge.name}${scaling}`;
}
```

**Badge Rendering:**
- **Lifts:** Blue badges (bg-blue-100, text-blue-900, border-blue-300)
- **Benchmarks:** Teal badges (bg-teal-100, text-teal-900, border-teal-300)
- **Forge Benchmarks:** Cyan badges (bg-cyan-100, text-cyan-900, border-cyan-300)
- Each badge includes GripVertical icon and remove button [×]
- Displays above textarea when section is expanded

### 2. Configure Modal UX Improvements
**Files:**
- `components/coach/ConfigureLiftModal.tsx`
- `components/coach/ConfigureBenchmarkModal.tsx`
- `components/coach/ConfigureForgeBenchmarkModal.tsx`

**Draggable Positioning:**
- Added position state: `useState({ x: 0, y: 0 })`
- Auto-position to right of WorkoutModal: `x: 820px, y: 100px`
- Drag handlers with `onMouseDown` on header
- `useEffect` for mousemove/mouseup listeners
- Absolute positioning with inline styles

**Modal Persistence:**
- Removed `onClose()` from `handleAdd()` functions in modals
- Removed `setLiftModalOpen(false)` etc. from `useWorkoutModal.ts` handlers
- Added "Done" button in header (replaces back arrow + X)
- `onClose` handler reopens Movement Library (`hook.openLibrary()`)

**Files Modified:**
- `hooks/coach/useWorkoutModal.ts` (lines 958, 973, 988)
- `components/coach/WorkoutModal.tsx` (lines 537-540, 548-551, 559-562)

### 3. Calendar Hover Integration
**File:** `components/coach/CalendarGrid.tsx`

**Added Type Imports:**
```typescript
import type { ConfiguredLift, ConfiguredBenchmark, ConfiguredForgeBenchmark } from '@/types/movements';
```

**Updated Filter Logic:**
```typescript
.filter((section) =>
  section.content?.trim() ||
  section.lifts?.length ||
  section.benchmarks?.length ||
  section.forge_benchmarks?.length
)
```

**Enhanced Popover Rendering:**
- Displays structured movements before free-form content
- Blue badges for lifts, teal for benchmarks, cyan for forge
- Format helper functions reused
- Preserves whitespace with `whitespace-pre-wrap`

### 4. Benchmark Description Storage
**Problem:** Only benchmark name displayed on hover, not full workout description

**Type Updates:**
```typescript
// types/movements.ts
export interface ConfiguredBenchmark {
  id: string;
  name: string;
  type: string;
  description?: string;  // NEW - Full workout description
  scaling_option?: string;
  visibility: 'everyone' | 'coaches' | 'programmers';
  coach_notes?: string;
  athlete_notes?: string;
}

// Same for ConfiguredForgeBenchmark
```

**Modal Updates:**
```typescript
// ConfigureBenchmarkModal.tsx, ConfigureForgeBenchmarkModal.tsx
const configuredBenchmark: ConfiguredBenchmark = {
  id: benchmark.id,
  name: benchmark.name,
  type: benchmark.type,
  description: benchmark.description || undefined,  // NEW
  scaling_option: scalingOption !== 'None' ? scalingOption : undefined,
  visibility,
  coach_notes: coachNotes || undefined,
  athlete_notes: athleteNotes || undefined,
};
```

**Display Updates:**
```typescript
// CalendarGrid.tsx
const formatted = formatBenchmark(benchmark);
return (
  <div key={bmIdx} className='text-xs text-teal-900 bg-teal-50 rounded px-2 py-1'>
    <div className='font-semibold'>≡ {formatted.name}</div>
    {formatted.description && (
      <div className='text-teal-800 whitespace-pre-wrap mt-0.5'>{formatted.description}</div>
    )}
  </div>
);
```

### 5. Movement Library Positioning
**File:** `components/coach/MovementLibraryPopup.tsx`

**Changed Initial Position:**
```typescript
const [libraryPos, setLibraryPos] = useState({ bottom: 100, left: 820 }); // Was: left: 300
```

**Result:** Movement Library now opens to right of WorkoutModal, matching configure modal position

## Technical Implementation

### State Management
- No changes to database schema (JSONB already supports new fields)
- Badge persistence verified through user testing
- Remove handlers properly update section arrays in formData

### Build & Validation
- Zero build errors
- All ESLint warnings pre-existing (unrelated)
- Bundle size: `/coach` page 32.4 kB (slight increase from badge display logic)

### Files Changed (9 files, +438/-69 lines)
```
components/coach/CalendarGrid.tsx                 |  79 ++++++++++++-
components/coach/ConfigureBenchmarkModal.tsx      |  83 +++++++++++---
components/coach/ConfigureForgeBenchmarkModal.tsx |  83 +++++++++++---
components/coach/ConfigureLiftModal.tsx           |  84 +++++++++++---
components/coach/MovementLibraryPopup.tsx         |   2 +-
components/coach/WODSectionComponent.tsx          | 129 ++++++++++++++++++++--
components/coach/WorkoutModal.tsx                 |  36 +++++-
hooks/coach/useWorkoutModal.ts                    |   9 +-
types/movements.ts                                |   2 +
```

## User Workflow

### Adding Movements
1. Click "Library" button → Movement Library opens (right side, 820px)
2. Switch to "Lifts" tab → Click "Back Squat"
3. Configure modal opens (right side, draggable)
4. Configure: 5 sets × 5 reps @ 75%
5. Select target section from dropdown
6. Click "Add" → Badge appears immediately in section, modal stays open
7. Add more movements or click "Done" → Returns to Movement Library
8. Close Library or add more movements
9. Click main "Save" → Persists to database

### Viewing Movements
**In WorkoutModal (expanded section):**
- Blue badges: "≡ Back Squat 5x5 @ 75% [×]"
- Teal badges: "≡ Fran (Rx) [×]"
- Cyan badges: "≡ MURPH (Scaled) [×]"

**In Calendar (hover preview):**
```
WOD (20 min)
≡ Fran (Rx)
21-15-9 For Time:
95/65# Thrusters
Pull-ups
```

## Testing Results
- ✅ Badge persistence: Add → Save → Reload → Badges persist
- ✅ Remove buttons: Click [×] removes badge from section
- ✅ Calendar hover: Shows formatted movements with descriptions
- ✅ Draggable modals: Can reposition to access Add Section button
- ✅ Modal persistence: Stays open after Add, closes on Done
- ✅ Movement Library: Reopens after Done clicked

## Known Limitations
1. **Existing benchmarks need re-adding:** Description field only applies to newly added benchmarks (existing ones don't have descriptions)
2. **Athlete display pending:** Athletes can't see configured movements yet (Phase 3)
3. **Analytics pending:** No query utilities for lift frequency analysis yet (Phase 4)

## Commits
- **5c0dd28** - feat(coach): complete Movement Library Phase 2 - badge display and UX improvements
- Branch: `movement-library-feature` (pushed to GitHub)

## Next Steps (Phase 3-4)
1. **Athlete Workout Display:**
   - Update athlete workout view to render structured movements
   - Show lifts/benchmarks/forge when workout is published
   - Format display matching coach view

2. **Movement Analytics:**
   - Create `utils/movement-analytics.ts`
   - Query functions: "How often is Back Squat programmed?"
   - Frequency reports, average sets/reps analysis

3. **Testing & Merge:**
   - Comprehensive workflow testing
   - Mobile testing (button-based insertion)
   - Merge to main branch

## Lessons Learned
- **Modal positioning matters for workflow:** Centered modals block UI interaction, right-side positioning enables side-by-side work
- **Modal persistence improves efficiency:** Keeping configure modals open after Add allows rapid multi-item addition without reopen overhead
- **Description storage enables better UX:** Storing full benchmark descriptions from database makes hover previews much more informative
- **Format helper reusability:** Same format functions used in both badge display and hover preview ensures consistency
- **Existing data migration considerations:** New optional fields don't break existing workouts, but users need to re-add items to get new features

## File Size
- **Project History File:** ~8.5KB
- **Memory Bank Impact:** Session 14-15 entries ~500 characters total in activeContext.md
