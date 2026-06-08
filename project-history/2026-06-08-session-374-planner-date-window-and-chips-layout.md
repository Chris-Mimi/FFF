# Session 374 — Planner date-window UX + expanded-chips layout fix

**Date:** 2026-06-08 (Opus 4.8) — 1 commit (`b31c2f9`) + close. Same calendar day as S373; Chris kept working after the S373 close. Both changes are in the coach Planner (`/coach/analysis` → Planner).

---

## 1. Expanded-chips fit-to-viewport (the harder one)

**Symptom:** at 6/12-month scale, expanding a pattern (the chevron) made its exercise chips stretch across the entire *scrolled* table width instead of staying in the visible window.

**Why:** the inline-expanded chips render in a `<td colSpan={weeks.length + 1}>` ([PlanningGrid.tsx](../components/coach/analysis/PlanningGrid.tsx) ~240) that spans the whole table, and [PatternExerciseChips](../components/coach/analysis/PatternExerciseChips.tsx) is a `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4` whose `fr` columns fill their container. The table is far wider than the viewport (`overflow-x-auto`), so the chips filled that full width.

**Fix:** measure the scroll container's *visible* width and pin the chips to it:
- The `overflow-x-auto` div gets a **callback ref** that, on mount, reads `clientWidth` and attaches a `ResizeObserver` to keep it current.
- The chips are wrapped in a `sticky left-0` div with `style={{ width: viewportWidth }}`, so they stay pinned to the visible window and wrap inside it.

**The trap that cost a round-trip:** the first attempt used `useEffect(() => {...}, [])` with a `useRef`. It silently measured nothing — the Planner renders an **empty-state early return** (no scroll div) while patterns load async, so on first mount `ref.current` was null, the effect bailed, and with empty deps it never re-ran once the real grid appeared → `viewportWidth` stayed 0 → no width applied → "no change" (Chris caught this on the dev server). A **callback ref** fixes it because it fires whenever the node actually mounts/unmounts, regardless of async data timing. Lesson: for "measure a DOM node that may mount later," prefer a callback ref over `useEffect([])`.

---

## 2. Start-anchored date window

**Before:** `deriveWindow(viewMonths, anchorOffsetWeeks)` centered the grid on today — `pastWeeks = floor((total-1)/2)`, future = rest. Each timescale split differently, so the left edge "jumped randomly" when switching 1/3/6/12mo.

**After (Chris's request):** the grid's **left edge is a start week** and the view runs **forward** from it.
- New `startMonday` state (a `YYYY-MM-DD` Monday) replaces `anchorOffsetWeeks`. `deriveWindow` → `pastWeeks:0, futureWeeks:totalWeeks-1, anchorDate=startMonday`. So switching timescale keeps the same start.
- **Click a week's date header** ([PlanningGrid.tsx](../components/coach/analysis/PlanningGrid.tsx) `<th>` → button, new `onSetStart` prop) sets that week as the start. Forward-only grid → clicking moves the start *forward*; Prev/Today move earlier.
- **Prev/Next** nudge `startMonday` by `STEP_WEEKS = 4` (~1 month) via `shiftMonday`.
- **Default load = 6 months, today centered.** `centeredStart(view) = thisWeekMonday − floor((weeks−1)/2)`. Initial state uses `centeredStart(6)`; the localStorage view-restore effect ALSO calls `centeredStart(restoredView)`, so the very first render is always today-centered regardless of the persisted view. **Today** button re-centers (`centeredNow = centeredStart(viewMonths)`), disabled when already centered.

**Model summary:** initial load + "Today" = today-centered; clicking a date / Prev / Next / changing the timescale = start-anchored (forward from the start week). The two coexist cleanly — only the entry points differ.

**Parked for Chris to judge after real use:** whether the ~1-month Prev/Next step feels right, and whether `startMonday` should persist between visits (currently resets to today-centered each load; `viewMonths` still persists via `planner-view-months`).

---

## 3. Files

| File | Change |
|:---|:---|
| [components/coach/analysis/PlannerSection.tsx](../components/coach/analysis/PlannerSection.tsx) | `startMonday` model, `centeredStart`/`shiftMonday`/`STEP_WEEKS`, Prev/Next/Today rewired, default 6mo, localStorage recentre, `onSetStart` passthrough |
| [components/coach/analysis/PlanningGrid.tsx](../components/coach/analysis/PlanningGrid.tsx) | callback-ref ResizeObserver + sticky width-pinned chips wrapper; clickable week headers (`onSetStart`) |

## 4. Commit

1. `b31c2f9` — `feat(session-374): planner start-anchored date window + expanded-chips fit-to-viewport`
