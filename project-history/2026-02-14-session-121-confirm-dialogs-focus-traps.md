# Session 121 — Styled Confirm Dialogs + Focus Traps

**Date:** 2026-02-14
**AI:** Claude Opus 4.6
**Focus:** Code quality items #8 and #9 from session 103 review

---

## Changes Made

### #8: Replace browser confirm() with styled modal dialogs

**Problem:** 33 `window.confirm()` calls across 20 files produced ugly, unstyled browser-native dialogs that broke the app's visual consistency.

**Solution:** Created a module-level confirm system (sonner-style pattern — no React context/provider needed):

- **`lib/confirm.ts`** — Module-level API with `confirm()` function returning `Promise<boolean>`, plus `subscribe()`/`resolveConfirm()` for component binding
- **`components/ui/ConfirmDialog.tsx`** — Styled modal with two variants:
  - **Danger** (red button + AlertTriangle icon): deletes, blocks, cancellations
  - **Default** (teal button, no icon): trials, extensions, resets, undos
- **`app/layout.tsx`** — Added `<ConfirmDialog />` alongside `<Toaster />`

Each call site changed from:
```tsx
if (!confirm('Are you sure?')) return;
```
To:
```tsx
import { confirm } from '@/lib/confirm';
if (!(await confirm({ title: 'Delete?', message: '...', confirmText: 'Delete', variant: 'danger' }))) return;
```

**Features:** Escape key dismiss, backdrop click dismiss, 44px min-height buttons, z-index 9999, contextual titles and button labels.

### #9: Focus traps in modals

**Problem:** Users could Tab outside of open modals, reaching background page elements.

**Solution:** Created `components/ui/FocusTrap.tsx` — a wrapper component using `display: contents` (no layout impact) that:
- Traps Tab/Shift+Tab within the modal
- Auto-focuses first focusable element on mount
- Restores previous focus on unmount

Applied to 33 modal instances across 28 files, covering all modal components, inline conditional modals, lightboxes, and overlay panels.

---

## Files Changed

### New Files (3)
- `lib/confirm.ts` — confirm dialog API
- `components/ui/ConfirmDialog.tsx` — styled confirm modal
- `components/ui/FocusTrap.tsx` — focus trap wrapper

### Modified Files (29)
**Layout:** `app/layout.tsx`

**Athlete components (3):** AthletePageForgeBenchmarksTab, AthletePageLiftsTab, AthletePageBenchmarksTab

**Coach components (4):** WhiteboardGallery, TenCardModal, ProgrammingNotesTab, athletes/PaymentsSection

**Coach hooks (10):** useMemberActions, useWorkoutModal, useLiftsCrud, useReferencesCrud, useSessionEditing, useTracksCrud, useForgeBenchmarksCrud, useBookingManagement, useBenchmarksCrud, useWODOperations, useExercisesCrud

**Page files (2):** coach/schedule/page, member/book/page

**Focus trap only (10):** WorkoutModal, SessionManagementModal, DeleteWorkoutModal, PublishModal, ExerciseFormModal, ExerciseVideoModal, AddBenchmarkModal, AddLiftModal, TrackModal, PhotoModal, AthletePagePhotosTab, AthletePageWorkoutsTab, BenchmarksTab, ForgeBenchmarksTab, LiftsTab, ReferencesTab, TracksTab, MovementLibraryPopup, DateRangePicker, ExerciseLibraryPanel

---

## Key Decisions

- **Sonner-style pattern** over React Context: No provider wrapping needed, simpler integration, matches existing toast pattern
- **Wrapper component** over hook for FocusTrap: Works cleanly with both modal components (isOpen prop) and inline conditional modals
- **`display: contents`** on FocusTrap wrapper: Zero layout impact, transparent to CSS
- **Danger vs default categorization**: Destructive actions (delete, block, cancel) get red styling; neutral confirmations (trial, extend, undo) get teal

---

## Next Priorities
- #10 Color contrast audit
- Workout intent/stimulus notes (feature)
