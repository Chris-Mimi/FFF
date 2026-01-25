# Session 73 - Whiteboard Cross-Browser Fix & Add Section

**Date:** 2026-01-25
**AI:** Claude Opus 4.5
**Duration:** Short session

---

## Summary

Fixed whiteboard photo upload button not working on Mimi's Chrome profile, improved photo ordering, and addressed intermittent Add Section bug.

---

## Changes Made

### 1. Whiteboard Upload Cross-Browser Fix

**Problem:**
- "Choose Photo Files" button did nothing on Mimi's Chrome profile
- Same code worked fine on Chris's profile
- Console showed programmatic `.click()` was being called but file dialog didn't open

**Investigation:**
- Confirmed changes were reaching the browser (red TEST header appeared)
- Native file input worked when clicked directly
- Programmatic `.click()` blocked by browser security

**Solution:**
- Changed from hidden input + button click handler
- To overlay approach: invisible input positioned over styled button
- User clicks directly on the invisible input (not programmatic)
- Added `group-hover` for visual feedback on hover

**File:** `components/coach/WhiteboardUploadPanel.tsx`

```tsx
<div className='relative overflow-hidden rounded-lg group'>
  <input
    type='file'
    accept='image/*'
    multiple
    onChange={handleFileSelect}
    className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
    style={{ fontSize: '100px' }}
  />
  <div className='... pointer-events-none group-hover:bg-teal-700 transition'>
    ...
  </div>
</div>
```

### 2. Whiteboard Photos Ordering

**Problem:** Photos displayed in upload order, not date order

**Solution:** Changed API ordering from `display_order, created_at` to `photo_label`

**File:** `app/api/whiteboard-photos/route.ts`

### 3. Add Section Reliability

**Problem:**
- "Add Section" sometimes failed on first click
- Worked if you expanded a section first, but not if you just clicked into content

**Root Cause:**
- `lastExpandedSectionId` only updated when toggling section expansion
- Clicking inside a section's textarea didn't update this reference

**Solution:**
- Added `setLastExpandedSectionId(sectionId)` in `handleTextareaInteraction`

**File:** `hooks/coach/useWorkoutModal.ts`

**Note:** Issue is still intermittent. May need to add similar updates to other input handlers (dropdowns, duration input, etc.) in WODSectionComponent.

---

## Lessons Learned

1. **Cross-browser file inputs:** Programmatic `.click()` can be blocked by browser security policies. Overlay approach (invisible input over styled button) is more reliable.

2. **Two-profile development:** When code works on one profile but not another, suspect browser-level differences (extensions, security settings, cached state).

3. **HMR issues:** After git pull, may need to delete `.next` folder and restart dev server for changes to appear.

---

## Files Changed

1. `components/coach/WhiteboardUploadPanel.tsx` - Overlay file input approach
2. `app/api/whiteboard-photos/route.ts` - Order by photo_label
3. `hooks/coach/useWorkoutModal.ts` - Update lastExpandedSectionId on textarea interaction

---

## Commit

`d339d80e` - fix(coach): whiteboard upload cross-browser fix and add section reliability
