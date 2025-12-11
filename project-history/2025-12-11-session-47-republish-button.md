# Session 47: Re-publish Button with Backwards Compatibility

**Date:** 2025-12-11
**Session:** Added re-publish button to Edit Workout modal with backwards compatibility for legacy workouts
**Assistant:** Sonnet 4.5
**Context Continuation:** Following Session 46 (Google Calendar Fix & UI Improvements)

---

## Summary

Implemented "Re-publish" button in Edit Workout modal to allow coaches to re-send workouts to Google Calendar. Includes backwards compatibility for workouts published before `publish_sections`, `publish_time`, and `publish_duration` fields were added to the database.

---

## Completed Tasks

### 1. Add Re-publish Button to WorkoutModalHeader

**Problem:** No way to re-publish workouts to Google Calendar after initial publish (for errors or workouts published before Google Calendar integration).

**Solution:** Added "Re-publish" button that appears alongside "Unpublish" for published workouts.

**File Modified:** `components/coach/WorkoutModalHeader.tsx`

**Implementation:**

```typescript
// Added RefreshCw icon import
import { Check, FileText, RefreshCw, Send, X } from 'lucide-react';

// Changed published state UI from single button to two buttons
{editingWOD.is_published ? (
  <>
    <button onClick={onPublishClick} title='Re-publish to Google Calendar'>
      <RefreshCw size={20} />
      <span className='text-sm'>Re-publish</span>
    </button>
    <button onClick={onUnpublish} title='Unpublish Workout'>
      <X size={20} />
      <span className='text-sm'>Unpublish</span>
    </button>
  </>
) : (
  <button onClick={onPublishClick} title='Publish Workout'>
    <Send size={20} />
    <span className='text-sm'>Publish</span>
  </button>
)}
```

**Status:** ✅ Implemented

---

### 2. Pass Publish Config to PublishModal with Backwards Compatibility

**Problem:** PublishModal wasn't receiving previously published configuration, so sections weren't pre-selected.

**Root Cause:** Workouts published before database schema update have `publish_sections`, `publish_time`, `publish_duration` as `undefined`.

**Solution:** Pass `currentPublishConfig` with backwards compatibility fallbacks.

**Files Modified:**
- `components/coach/WorkoutModal.tsx` (both panel and modal modes)
- `hooks/coach/useWorkoutModal.ts` (added fields to type)
- `hooks/coach/useCoachData.ts` (fetch fields from database)

**Implementation:**

```typescript
// WorkoutModal.tsx - Backwards compatible config
currentPublishConfig={
  editingWOD?.is_published
    ? {
        // Use stored sections OR all sections (backwards compat)
        selectedSectionIds: editingWOD.publish_sections || hook.formData.sections.map(s => s.id),
        // Use stored time OR session time OR default
        eventTime: editingWOD.publish_time || publishSessionTime || '09:00',
        // Use stored duration OR calculate from all sections
        eventDurationMinutes: editingWOD.publish_duration || hook.formData.sections.reduce((sum, s) => sum + (s.duration || 0), 0),
      }
    : null
}

// useWorkoutModal.ts - Added fields to type
export interface WODFormData {
  // ... existing fields ...
  publish_sections?: string[];   // Section IDs that are published
  publish_duration?: number;      // Duration in minutes
}

// useCoachData.ts - Fetch new fields from database
.select(`
  // ... existing fields ...
  publish_sections,
  publish_duration
`)
```

**Backwards Compatibility Logic:**
- **New workouts:** Uses stored `publish_sections`, `publish_time`, `publish_duration`
- **Legacy workouts:** Defaults to all sections, session time, and calculated duration
- **On re-publish:** Saves new fields to database for future re-publishes

**Status:** ✅ Implemented

---

### 3. Fix PublishModal State Reset

**Problem:** Modal state wasn't resetting when re-opened, so previous selections persisted incorrectly.

**Solution:** Added `useEffect` that resets state when modal opens.

**File Modified:** `components/coach/PublishModal.tsx`

**Implementation:**

```typescript
// Reset state when modal opens or currentPublishConfig changes
useEffect(() => {
  if (isOpen) {
    setSelectedSectionIds(currentPublishConfig?.selectedSectionIds || []);
    const time = sessionTime
      ? formatTime(sessionTime)
      : (currentPublishConfig?.eventTime || '09:00');
    setEventTime(time);
    setEventDurationMinutes(currentPublishConfig?.eventDurationMinutes || 60);
  }
}, [isOpen, currentPublishConfig, sessionTime]);
```

**Dependencies:** `isOpen`, `currentPublishConfig`, `sessionTime`

**Status:** ✅ Implemented

---

### 4. Update Workflow Protocols for 2-User Setup

**Problem:** Session start protocol didn't account for 2 users working on separate Mac profiles.

**Solution:** Updated workflow-protocols.md to include git sync for multi-user setup and project history reading.

**File Modified:** `memory-bank/workflow-protocols.md`

**Changes:**
- Added "Project Context: 2 users working on separate Mac profiles"
- Clarified when to `git pull` vs `git reset --hard`
- Added STEP 4: Read Latest Project History
- Removed redundant file path instructions (now in session start prompt)
- Version bumped to 3.0

**Status:** ✅ Implemented

---

## Technical Decisions

### Why Backwards Compatibility?

**Problem:** Database has workouts published before `publish_sections`, `publish_time`, `publish_duration` fields existed.

**Options Considered:**
1. **Migration:** Run SQL to populate missing fields for old workouts
2. **Require re-publish:** Force coaches to re-publish all old workouts
3. **Backwards compatibility:** Default to sensible values for missing fields

**Decision:** Backwards compatibility (#3)

**Reasoning:**
- No database migration required
- Seamless user experience (no forced re-publishing)
- Old workouts work immediately with re-publish button
- Fields get populated on first re-publish

### Why useEffect for Modal State Reset?

**Problem:** React state persists across modal open/close cycles.

**Options Considered:**
1. **Reset on close:** Clear state when modal closes
2. **Reset on open:** Refresh state when modal opens
3. **Key-based reset:** Use `key` prop to force remount

**Decision:** Reset on open (#2)

**Reasoning:**
- Simpler logic (single useEffect vs multiple cleanup functions)
- Handles all cases (new publish, re-publish, edit existing config)
- Dependencies clearly define when state should refresh

---

## Files Changed

| File | Lines Changed | Type |
|:---|:---|:---|
| `components/coach/WorkoutModalHeader.tsx` | +17/-4 | Modified |
| `components/coach/WorkoutModal.tsx` | +18/-0 | Modified |
| `components/coach/PublishModal.tsx` | +8/-6 | Modified |
| `hooks/coach/useWorkoutModal.ts` | +2/-0 | Modified |
| `hooks/coach/useCoachData.ts` | +4/-0 | Modified |
| `memory-bank/workflow-protocols.md` | +52/-52 | Modified |

**Commit:** `66fabb5` - "feat(coach): add re-publish button with backwards compatibility"

---

## Testing Instructions

### Re-publish Legacy Workout (No publish_sections)
1. Open a workout published before this session
2. **Verify:** "Re-publish" and "Unpublish" buttons both appear
3. Click "Re-publish"
4. **Verify:** All sections are pre-selected (backwards compatibility)
5. **Verify:** Time is pre-filled from session or default
6. **Verify:** Duration is auto-calculated from all sections
7. Modify section selection if desired
8. Click "Publish"
9. **Verify:** Google Calendar event is updated (not duplicated)
10. **Verify:** Database now has `publish_sections`, `publish_time`, `publish_duration`

### Re-publish New Workout (Has publish_sections)
1. Publish a new workout (after this session)
2. Close and re-open Edit Workout modal
3. Click "Re-publish"
4. **Verify:** Previously selected sections are pre-checked
5. **Verify:** Previous time is pre-filled
6. **Verify:** Duration matches previous selection
7. Modify selections
8. Click "Publish"
9. **Verify:** Changes are reflected in Google Calendar

### Athlete Safety
1. Re-publish a workout with different section selection
2. Check Athlete Dashboard → Workouts tab
3. **Verify:** Athletes only see newly selected sections
4. **Verify:** No duplicate workouts appear
5. **Verify:** Workout metadata (time, duration) is updated

---

## Lessons Learned

### Database Schema Evolution

**Issue:** New fields added to database don't exist in old records.

**Pattern:** Always provide backwards compatibility fallbacks when adding optional fields:

```typescript
const value = newField || calculateDefault();
```

**Prevention:**
- Use optional fields (`field?: type`) for gradual rollouts
- Provide sensible defaults in UI layer
- Document which fields are optional and why

### Modal State Management

**Issue:** React state persists across modal open/close cycles.

**Pattern:** Use `useEffect` with `isOpen` dependency to reset state:

```typescript
useEffect(() => {
  if (isOpen) {
    // Reset all state to initial values
  }
}, [isOpen, ...otherDeps]);
```

**Alternative:** Use `key` prop on modal to force remount (heavier, but simpler).

---

## Next Session Priorities

1. **Test Re-publish Feature**
   - Test with legacy workout (no publish_sections)
   - Test with new workout (has publish_sections)
   - Verify athlete view updates correctly
   - Verify Google Calendar updates (not duplicates)

2. **Continue with January Launch Plan**
   - See Week 1 priorities in activeContext.md

---

**Session Time:** ~60 minutes
**Token Usage:** ~130K
**Status:** Feature complete, ready for testing
