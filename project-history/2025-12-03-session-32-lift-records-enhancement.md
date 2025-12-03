# Session 32 - Lift Records Enhancement & Database Schema Fix

**Date:** 2025-12-03
**Session:** Lift weight tracking improvements and constraint error resolution
**Developer:** Chris (chrishiles)

## Summary
Extended lift tracking functionality in Athlete Logbook with database-driven weight recording. Fixed critical database constraint violation by creating proper lift_records table schema separating workout rep schemes from PR testing rep max types. Added comprehensive edit, delete, and display functionality for lift records across multiple views.

## Problem Statement
- Athletes couldn't track lift weights from workouts in Logbook
- No database persistence for lift performance records
- Missing edit functionality for lift configurations after creation
- Database constraint error: "new row for relation 'lift_records' violates check constraint 'valid_rep_max_type'"
- Rep schemes from workouts (e.g., "5x5") conflicting with RM test values ('1RM', '3RM', '5RM', '10RM')
- Workout visibility timing showing "Booked" instead of workout details

## Solution Implemented

### 1. Database Schema - lift_records Table
**Migration:** `supabase/migrations/20251203_create_lift_records.sql`

**Schema Design:**
```sql
CREATE TABLE lift_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lift_name TEXT NOT NULL,
  weight_kg NUMERIC(6,2) NOT NULL CHECK (weight_kg > 0),
  reps INTEGER NOT NULL CHECK (reps > 0),
  calculated_1rm NUMERIC(6,2),
  rep_max_type TEXT CHECK (rep_max_type IN ('1RM', '3RM', '5RM', '10RM') OR rep_max_type IS NULL),
  rep_scheme TEXT,
  notes TEXT,
  lift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT rep_type_xor CHECK (
    (rep_max_type IS NOT NULL AND rep_scheme IS NULL) OR
    (rep_max_type IS NULL AND rep_scheme IS NOT NULL) OR
    (rep_max_type IS NULL AND rep_scheme IS NULL)
  )
);
```

**Key Design Decisions:**
- **Separated rep_max_type and rep_scheme:** RM tests vs workout patterns use different fields
- **XOR constraint:** Ensures only one type is set per record
- **User isolation:** user_id foreign key with CASCADE delete
- **Performance:** Composite index on (user_id, lift_name, lift_date DESC) for fast queries

**RLS Policies:**
- Users can SELECT/INSERT/UPDATE/DELETE only their own records
- Full data isolation between users

### 2. Athlete Logbook Weight Tracking
**Files Modified:**
- `components/athlete/AthletePageLogbookTab.tsx` (lines 80-160, 190-195)

**Implementation:**

**UPSERT Pattern:**
```typescript
const saveLiftRecord = async (
  liftName: string,
  weightKg: string,
  reps: number,
  liftDate: string,
  repScheme?: string
) => {
  if (!weightKg || parseFloat(weightKg) <= 0) return;

  const weight = parseFloat(weightKg);

  // Check for existing record (same user, lift, date)
  const { data: existingRecord } = await supabase
    .from('lift_records')
    .select('id')
    .eq('user_id', userId)
    .eq('lift_name', liftName)
    .eq('lift_date', liftDate)
    .maybeSingle();

  if (existingRecord) {
    // Update existing
    await supabase
      .from('lift_records')
      .update({ weight_kg: weight, reps, rep_scheme: repScheme || null })
      .eq('id', existingRecord.id);
  } else {
    // Insert new
    await supabase
      .from('lift_records')
      .insert({
        user_id: userId,
        lift_name: liftName,
        weight_kg: weight,
        reps,
        rep_scheme: repScheme || null,
        lift_date: liftDate
      });
  }
};
```

**Rep Scheme Calculation:**
```typescript
const repScheme = lift.rep_type === 'constant'
  ? `${lift.sets || 1}x${lift.reps || 1}`
  : lift.variable_sets?.map(s => s.reps).join('-') || '1';
```

**UI Changes:**
- Single-line layout: Lift title, athlete notes (parentheses), weight input (right-aligned)
- Default athlete notes: "Record your heaviest set"
- Weight input saves to database on "Save Lift Records" button
- Input boxes pre-populated from existing records on page load

### 3. Lift Edit Functionality
**Files Modified:**
- `hooks/coach/useMovementConfiguration.ts` (new handlers)
- `components/coach/WODSectionComponent.tsx` (clickable badges)
- `components/coach/ConfigureLiftModal.tsx` (edit mode support)

**Implementation:**

**Edit State Management:**
```typescript
const [editingLift, setEditingLift] = useState<{
  sectionId: string;
  liftIndex: number;
  lift: ConfiguredLift;
} | null>(null);

const handleEditLift = (sectionId: string, liftIndex: number) => {
  const section = sections.find(s => s.id === sectionId);
  if (!section?.lifts?.[liftIndex]) return;

  const liftToEdit = section.lifts[liftIndex];
  const barbellLift: BarbellLift = {
    id: liftToEdit.id,
    name: liftToEdit.name,
    category: '',
    display_order: 0,
  };

  setSelectedLift(barbellLift);
  setEditingLift({ sectionId, liftIndex, lift: liftToEdit });
  setLiftModalOpen(true);
};
```

**Form Pre-population:**
```typescript
useEffect(() => {
  if (editingLift) {
    const { lift: existingLift, sectionId } = editingLift;
    setSelectedSectionId(sectionId);
    setRepType(existingLift.rep_type);

    if (existingLift.rep_type === 'constant') {
      setSets(existingLift.sets || 5);
      setReps(existingLift.reps || 5);
      setPercentage(existingLift.percentage_1rm);
    } else {
      setVariableSets(existingLift.variable_sets || defaultVariableSet);
    }

    setVisibility(existingLift.visibility);
    setAthleteNotes(existingLift.athlete_notes || '');
  }
}, [editingLift]);
```

**Update vs Add Logic:**
```typescript
const handleAddLiftToSection = (sectionId: string, configuredLift: ConfiguredLift) => {
  if (editingLift) {
    // Update mode
    const updatedSections = sections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            lifts: section.lifts?.map((lift, idx) =>
              idx === editingLift.liftIndex ? configuredLift : lift
            )
          }
        : section
    );
    onSectionsChange(updatedSections);
    setEditingLift(null);
  } else {
    // Add mode (existing logic)
  }
};
```

### 4. Recent Lifts Display & Delete
**Files Modified:**
- `components/athlete/AthletePageLiftsTab.tsx` (lines 18-27, 406-412)

**Badge Display Logic:**
```typescript
{(lift.rep_max_type || lift.rep_scheme) && (
  <span className='text-xs px-2 py-1 rounded bg-[#AFEEEE] text-gray-900 whitespace-nowrap'>
    {lift.rep_max_type || lift.rep_scheme}
  </span>
)}
```

**Delete Functionality:**
```typescript
<button
  onClick={(e) => {
    e.stopPropagation();
    handleDeleteLift(lift.id);
  }}
  className='p-1 text-gray-600 hover:text-red-600 hover:bg-white/50 rounded transition opacity-0 group-hover:opacity-100'
  title='Delete lift record'
>
  <Trash2 size={14} />
</button>
```

**Design:** Delete button positioned right side, shows only on card hover, prevents accidental clicks

### 5. Workout Visibility Timing Fix
**Files Modified:**
- `components/athlete/AthletePageWorkoutsTab.tsx`
- `hooks/athlete/useLogbookData.ts`

**Implementation:**
```typescript
const sessionDateTime = new Date(`${session.date}T${session.time}`);
const oneHourBeforeSession = new Date(sessionDateTime.getTime() - 60 * 60 * 1000);
const now = new Date();
const shouldShowDetails = now >= oneHourBeforeSession;
```

**Logic:** Changed from date-only comparison to datetime with 1-hour buffer BEFORE session start

### 6. ConfigureLiftModal UX Improvements
**Files Modified:**
- `components/coach/ConfigureLiftModal.tsx`

**Changes:**
- ✅ Removed coach notes section entirely
- ✅ Set default athlete notes: "Record your heaviest set"
- ✅ Removed scaling options UI and state
- ✅ Athlete notes field expanded by default

### 7. Data Cleanup Script
**File Created:** `database/cleanup-faulty-lift-records.sql`

```sql
-- Delete records with UUID-like names (bug from earlier implementation)
DELETE FROM lift_records
WHERE lift_name LIKE '%-%-%-%-%-%';

-- Verify cleanup
SELECT COUNT(*) as remaining_faulty_records
FROM lift_records
WHERE lift_name LIKE '%-%-%-%-%-%';
```

**Purpose:** Clean up lift records saved with full UUID keys instead of lift names

## Technical Details

### Database Operations
**Insert Performance:**
- Indexed on (user_id, lift_name, lift_date) for fast UPSERT checks
- Single query per save operation
- Batch saving with error handling per record

**Query Patterns:**
```typescript
// Load existing records for date
const { data } = await supabase
  .from('lift_records')
  .select('*')
  .eq('user_id', userId)
  .eq('lift_date', workoutDate)
  .order('created_at', { ascending: false });

// Fetch recent lifts for Lifts tab
const { data } = await supabase
  .from('lift_records')
  .select('*')
  .eq('user_id', userId)
  .order('lift_date', { ascending: false })
  .limit(10);
```

### Error Handling
**Comprehensive Error Messages:**
```typescript
if (error) {
  console.error('Error inserting lift record:', error);
  alert(`Failed to insert lift record: ${error.message || JSON.stringify(error)}`);
  return;
}
```

**Error States Handled:**
- Constraint violations (shows actual error message)
- Network failures
- Permission errors (RLS)
- Empty weight values (silent skip)
- Duplicate records (UPSERT instead of error)

### Type Safety
**TypeScript Interfaces:**
```typescript
interface LiftRecord {
  id: string;
  lift_name: string;
  weight_kg: number;
  reps: number;
  calculated_1rm?: number;
  rep_max_type?: string;
  rep_scheme?: string;
  notes?: string;
  lift_date: string;
}
```

## Results

### Code Changes Summary
**Files Changed:** 11 files
**Lines Added:** 464
**Lines Removed:** 102
**Net Change:** +362 lines

**New Files:**
- `supabase/migrations/20251203_create_lift_records.sql` (67 lines)
- `database/cleanup-faulty-lift-records.sql` (18 lines)

### Features Delivered
1. ✅ Lift weight tracking in Athlete Logbook
2. ✅ Database persistence with UPSERT logic
3. ✅ Edit functionality for lift badges
4. ✅ Delete functionality in Recent Lifts
5. ✅ Rep scheme display (e.g., "5x5") in badges
6. ✅ Fixed workout visibility timing (1 hour before session)
7. ✅ Default athlete notes with single-line layout
8. ✅ Removed unnecessary scaling options
9. ✅ Comprehensive error handling

### Known Issues
⚠️ **CRITICAL - For Mimi's Next Session:**

**Database Migration Not Applied:**
- Error: "Could not find the 'rep_scheme' column of 'lift_records' in the schema cache"
- Root Cause: Migration file created but not executed
- Impact: Lift records cannot be saved until migration runs
- Solution Required: Open Supabase SQL Editor → Run `supabase/migrations/20251203_create_lift_records.sql`

**Steps to Fix:**
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20251203_create_lift_records.sql`
3. Execute the migration
4. Verify table exists: `SELECT * FROM lift_records LIMIT 1;`
5. Test lift recording in Athlete Logbook

**Migration applies:**
- Creates lift_records table with proper schema
- Sets up RLS policies for user data isolation
- Creates indexes for query performance
- Adds CHECK constraints for data integrity

## Benefits

### User Experience
- Athletes can now track lift progress over time from workouts
- Edit capability allows fixing mistakes without re-creating
- Single-line layout maximizes space efficiency
- Rep schemes provide clear context ("5x5" vs "1RM")
- Delete functionality enables data cleanup

### Data Quality
- Proper separation of workout lifts vs PR tests
- Database constraints enforce valid data
- User isolation via RLS policies
- UPSERT prevents duplicate records

### Maintainability
- Clear schema documentation
- Comprehensive error messages for debugging
- Type-safe interfaces
- Reusable query patterns

## Lessons Learned

### Database Schema Design
- Separate columns for distinct data semantics (rep_scheme vs rep_max_type)
- XOR constraints enforce business logic at database level
- Proper indexing critical for UPSERT performance

### UPSERT Pattern
- Always check for existing records before INSERT when unique constraints apply
- Use `.maybeSingle()` instead of `.single()` to handle 0 results gracefully
- Error handling must show actual constraint violation messages

### Component State Management
- Edit mode requires separate state tracking (editingLift)
- Form pre-population needs useEffect with proper dependencies
- Button text should reflect mode ("Add" vs "Update")

### Error Debugging
- Generic error objects need `.message` extraction for user display
- Database constraint names should be descriptive for debugging
- Always log full error object for developer context

## Testing Checklist (For Mimi)

**Before Testing:**
- [ ] Run migration in Supabase SQL Editor
- [ ] Verify lift_records table exists
- [ ] Check RLS policies are enabled

**Workout Type Dropdowns (Session 31):**
- [ ] Test Benchmarks tab dropdown shows database types
- [ ] Test Forge tab dropdown shows database types
- [ ] Verify types load from `workout_types` table

**Tracks Tab CRUD (Session 31):**
- [ ] Create new track with name, description, color
- [ ] Edit existing track
- [ ] Delete track
- [ ] Verify Analysis page no longer has Track management

**Athlete Logbook Badges (Session 31):**
- [ ] Verify lift badges display (blue)
- [ ] Verify benchmark badges display (teal)
- [ ] Verify forge benchmark badges display (cyan)
- [ ] Check badge formatting with rep schemes

**Lift Records (Session 32):**
- [ ] Enter weight for lift in Logbook → Save → Verify in Recent Lifts
- [ ] Click lift badge in Coach page → Edit rep scheme → Verify update
- [ ] Hover over Recent Lift card → Click delete → Verify removal
- [ ] Check rep scheme displays correctly ("5x5" not "1RM")
- [ ] Verify workout details show 1 hour before session start

## Next Steps

### Week 1: Security & Infrastructure (Continuing)
1. **IMMEDIATE:** Apply lift_records migration (Mimi)
2. **RLS Policies Migration** (CRITICAL - Security Risk)
   - Locate `remove-public-rls-policies.sql` migration
   - Execute RLS migration
   - Test with isolated accounts
3. **Production Build**
   - Run `npm run build` - verify zero errors
   - Run `/code-cleanup` for ESLint warnings
4. **Documentation**
   - Create `.env.example` template
   - Update `workflow-protocols.md` for dual-user paths

---

**Session Duration:** ~2 hours
**Commit:** 741ffd4
**Branch:** main (pushed to GitHub)
**Status:** Migration pending execution, code complete and pushed
