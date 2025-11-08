# Workout Workflow Refactor Plan - 2025-11-09

## Overview
Major refactor to separate "booking sessions" from "workout logging" and improve visual clarity on coach calendar.

## Current Problems
1. **Confusing terminology** - "Publishing" means both making sessions bookable AND enabling athlete logging
2. **Manual session publishing** - Coach must manually publish each session after weekly generation
3. **No visual distinction** - Can't tell if session has workout content or not
4. **Time display issues** - Sessions don't show times until workout is added
5. **Workflow unclear** - When dragging workouts, unclear if they're published for logging

## Proposed Solution

### A. Separate Two Concepts

**1. Session Status (for booking):**
- `draft` - Not bookable by members
- `published` - Bookable by members
- `completed` - Past, no longer bookable
- `cancelled` - Cancelled session

**2. Workout Publishing Status (for athlete logging):**
- `null` - No workout content
- `draft` - Workout created but not published for logging
- `published` - Athletes can log scores

### B. Three Visual States on Calendar

**State 1: Empty Session (Light Grey)**
- Shows: Time (10:00)
- Shows: Session Type (WOD / Foundations / Kids) - from template
- Shows: Capacity (3/12 booked)
- Means: Members can book, no workout content yet

**State 2: Draft Workout (Dark Grey)**
- Shows: Time + Workout Title (Fran, Murph, etc.)
- Shows: Capacity (5/12 booked)
- Means: Workout added but not published for logging

**State 3: Published Workout (Green/Teal)**
- Shows: Time + Workout Title + 📊 icon
- Shows: Capacity (8/12 booked)
- Means: Athletes can book AND log scores

### C. Updated Workflows

**1. Generate Weekly Sessions**
- Current: Creates sessions with `status='draft'`
- **New: Auto-set `status='published'` → Immediately bookable**
- No workout content yet
- Sessions appear as light grey cards with times and session types

**2. Add Workout Content (3 methods)**

**Method A: Via Workout Library (drag & drop)**
- Drag past workout from library
- Drop on session card
- **Creates workout in draft state** (dark grey)
- Coach can edit before publishing for logging

**Method B: Via "+" Button (Create New)**
- Click "+" above calendar
- Creates standalone workout (hidden until published)
- Open Publish Modal
- **Set time → Assigns to session at that time**
- Save as draft (dark grey) or publish (green/teal)

**Method C: Click Session Card**
- Opens Workout Editor modal
- Create/edit workout content
- Saves as draft to that session (dark grey)

**3. Publish for Logging**
- Separate action from creating workout
- Button in Workout Editor or Publish Modal
- **Changes workout status to `published`**
- Card turns green/teal with 📊 icon
- Athletes can now log scores

**4. Apply to Multiple Sessions (Duplicate)**
- When editing workout, show "Apply to other sessions"
- Select checkboxes for other sessions same day
- **Creates separate workout copies** (not links)
- Each session has independent workout
- Each can be published independently

## Implementation Tasks

### Phase 1: Database Changes
**File:** New migration SQL file

```sql
-- Add workout_publish_status column to wods table
ALTER TABLE wods ADD COLUMN IF NOT EXISTS workout_publish_status TEXT DEFAULT 'draft'
  CHECK (workout_publish_status IN ('draft', 'published'));

-- Update existing published workouts
UPDATE wods SET workout_publish_status = 'published' WHERE is_published = true;

-- Note: Keep is_published for backward compatibility during transition
```

**Estimated effort:** 15 minutes

### Phase 2: Session Generation Auto-Publish
**File:** `app/api/sessions/generate-weekly/route.ts`

**Changes:**
- Change default status from `'draft'` to `'published'`
- Sessions immediately bookable after generation

**Code change:**
```typescript
status: 'published', // Changed from 'draft'
```

**Estimated effort:** 5 minutes

### Phase 3: Visual Card System
**File:** `app/coach/page.tsx` - Calendar rendering section

**Changes:**
1. Update card rendering logic to check workout status
2. Add 3 CSS classes for states:
   - `session-empty` (light grey bg)
   - `session-draft` (dark grey bg)
   - `session-published` (teal bg)
3. Always show time on cards
4. Show session type (from template) for empty sessions
5. Show workout title for sessions with workouts
6. Add 📊 icon for published workouts

**Logic:**
```typescript
const getCardState = (session, workout) => {
  if (!workout) return 'empty'; // Light grey
  if (workout.workout_publish_status === 'draft') return 'draft'; // Dark grey
  return 'published'; // Teal with icon
};
```

**Estimated effort:** 2 hours

### Phase 4: Publish Modal Updates
**File:** `components/PublishModal.tsx` (or create if doesn't exist)

**Changes:**
1. For standalone workouts ("+" button):
   - Add time selector
   - Find session at selected time
   - Assign workout to that session
2. Add "Publish for Logging" checkbox
   - Controls `workout_publish_status`
   - Default: checked (publish immediately)
   - Uncheck to save as draft

**Estimated effort:** 1 hour

### Phase 5: Drag & Drop Updates
**File:** `app/coach/page.tsx` - handleDrop function

**Changes:**
- When dropping workout from library onto session
- **Create workout with `workout_publish_status='draft'`**
- Don't auto-publish for logging
- Coach can edit/publish manually

**Code change:**
```typescript
const { data: newWOD } = await supabase.from('wods').insert({
  ...workoutData,
  workout_publish_status: 'draft', // Add this field
  is_published: false // Keep for compatibility
});
```

**Estimated effort:** 30 minutes

### Phase 6: Duplicate Workout Logic
**File:** `app/coach/page.tsx` - handleSaveWOD function

**Changes:**
- Instead of linking sessions to one workout
- **Create separate workout records**
- Copy all workout data for each selected session
- Each gets independent `workout_publish_status`

**Current code:**
```typescript
// Links sessions to same workout
await supabase
  .from('weekly_sessions')
  .update({ workout_id: newWOD.id })
  .in('id', selectedSessionIds);
```

**New code:**
```typescript
// Create separate workouts for each session
for (const sessionId of selectedSessionIds) {
  const { data: duplicateWOD } = await supabase.from('wods').insert({
    title: wodData.title,
    track_id: wodData.track_id,
    sections: wodData.sections,
    // ... all other fields
    workout_publish_status: 'draft',
  }).select().single();

  await supabase
    .from('weekly_sessions')
    .update({ workout_id: duplicateWOD.id })
    .eq('id', sessionId);
}
```

**Estimated effort:** 45 minutes

### Phase 7: Workout Editor Modal
**File:** `components/WODModal.tsx`

**Changes:**
1. Add "Publish for Logging" button
2. Updates `workout_publish_status` field
3. Shows current publish status
4. Separate from "Save" button

**Estimated effort:** 30 minutes

### Phase 8: Testing & Refinement
**Test cases:**
1. Generate weekly sessions → All immediately bookable (light grey)
2. Drag workout from library → Saves as draft (dark grey)
3. Click "+ Create" → Publish modal assigns to session
4. Edit workout → Publish for logging → Card turns teal
5. Apply to multiple sessions → Creates separate workouts
6. Each duplicate can be published independently

**Estimated effort:** 1 hour

## Total Estimated Effort
- Phase 1 (DB): 15 min
- Phase 2 (Auto-publish): 5 min
- Phase 3 (Visual cards): 2 hours
- Phase 4 (Publish modal): 1 hour
- Phase 5 (Drag & drop): 30 min
- Phase 6 (Duplicate logic): 45 min
- Phase 7 (Editor modal): 30 min
- Phase 8 (Testing): 1 hour

**Total: ~6.5 hours**

## Benefits After Refactor

**For Coach:**
1. Generate once → All sessions bookable immediately
2. Visual at-a-glance: Empty / Draft / Published states
3. Add workouts anytime (before/after booking opens)
4. Control athlete logging separately from booking
5. Fast duplication to other sessions

**For Members:**
- Sessions available for booking immediately after generation
- Clear workflow: Book session → Attend → Log scores (if workout published)

**For Athletes:**
- Only see workouts published for logging
- No confusion about what's "ready"

## Migration Notes

**Backward Compatibility:**
- Keep `is_published` field during transition
- Sync: `workout_publish_status='published'` ↔ `is_published=true`
- Can remove `is_published` in future cleanup

**Data Migration:**
```sql
-- One-time: Set all existing published workouts
UPDATE wods
SET workout_publish_status = 'published'
WHERE is_published = true;

-- Set all existing sessions to published
UPDATE weekly_sessions
SET status = 'published'
WHERE status = 'draft' AND date <= CURRENT_DATE + INTERVAL '7 days';
```

## Open Questions
1. What happens to sessions with bookings if workout is unpublished for logging?
   - Answer: Bookings remain valid, athletes just can't log scores
2. Should "Publish for logging" have a confirmation if session already has bookings?
   - Recommendation: No, it's a separate action
3. Icon for published workouts - 📊 or different?
   - User preference needed

## Next Steps
1. Review this plan with user
2. Get approval on approach
3. Start with Phase 1 (DB changes)
4. Implement phases sequentially
5. Test thoroughly at each phase
