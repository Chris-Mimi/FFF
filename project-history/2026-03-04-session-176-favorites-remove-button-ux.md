# Session 176 — Favorites Remove Button UX (2026-03-04)

**Model:** Claude Opus 4.6
**Focus:** Make favorites removal discoverable in Exercise Library modal

## Accomplishments

1. **Favorites Remove Button** (`components/coach/MovementLibraryPopup.tsx`)
   - **Problem:** The favorites section had a tiny filled amber star (12px) as the remove button — users couldn't find it
   - **Fix:** Replaced with a red X button that appears on hover (`opacity-0 group-hover:opacity-100`), with `hover:bg-red-100` background highlight
   - Uses `X` icon (already imported) instead of `Star` — universally understood as "remove"

## Files Modified

- `components/coach/MovementLibraryPopup.tsx` — Favorites section remove button: Star → X icon with hover-reveal red styling
