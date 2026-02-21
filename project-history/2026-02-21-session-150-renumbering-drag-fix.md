# Session 150 — Session Renumbering + Drag-and-Drop Fix

**Date:** 2026-02-21
**Model:** Opus 4.6

---

## Accomplishments

1. **Session history renumbering**
   - Project history files jumped from session-144 to session-151 (skipped 146 internally)
   - Fixed internal numbering in session-144 file: 147→146, 148→147 (now "Sessions 144–147")
   - Renamed session-151 file → session-148, updated internal references
   - Updated activeContext.md and MEMORY.md to reflect new sequential numbering

2. **Drag-and-drop fix on coach calendar**
   - **Symptom:** Clicking drag handle opened workout edit modal instead of initiating drag
   - **Root cause:** Browser update changed how `e.target` resolves for clicks on `draggable` elements — `closest('[draggable]')` check in card click handler no longer caught it
   - **Fix:** Added `onClick` + `onMouseDown` with `stopPropagation` directly on the drag handle div
   - Also improved UX: `cursor-grab`/`active:cursor-grabbing` (was `cursor-move`), `p-1.5` hit target (was `p-0.5`)

---

## Files Changed

- `components/coach/CalendarGrid.tsx` — Drag handle stopPropagation + cursor + hit target
- `project-history/2026-02-19-session-144-achievement-system-phase1.md` — Internal renumbering
- `project-history/2026-02-21-session-148-memory-bank-update-lift-duplicate-fix.md` — Renamed from session-151, internal refs updated
- `memory-bank/memory-bank-activeContext.md` — Session 150 entry + renumbered refs
- `MEMORY.md` — Updated session references
