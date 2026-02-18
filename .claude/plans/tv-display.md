# TV Display Page — Implementation Plan

## Context
Coach currently uses Google Calendar events on a large TV to display workout details during classes, but has to scroll down to see everything. This feature adds a dedicated TV-optimized display page that shows workout sections in large, bold typography — readable from across the gym. Launched via a chip on the workout card that opens a new browser tab (drag to TV).

## User Preferences
- **Sections:** All sections shown, with subtle indicator for coach-only (unpublished) ones
- **Launch:** Chip/icon on workout card → opens new tab
- **Intent notes:** Always visible on TV display
- **Font size:** Large & bold — readable from across the gym

---

## Implementation Steps

### 1. Create TV Display Route — `app/tv/[id]/page.tsx`

New server-rendered page that:
- Fetches WOD by ID from Supabase (using service role or public client)
- Renders all sections with large typography
- Dark background (`bg-gray-950`) with high-contrast text for TV readability
- No navigation chrome — just the workout content
- Sections not in `publish_sections` get a subtle "Coach Only" badge

**Layout:**
- Header: session_type + workout_name + date (large)
- Sections stacked vertically, each with:
  - Section type heading (e.g., "Warm-Up (10 min)") — teal accent, ~2xl/3xl
  - Intent notes in amber callout (always shown)
  - Lifts in blue cards, benchmarks in teal, forge benchmarks in cyan (same color scheme as rest of app)
  - Free-form content in large mono/sans text
- No interactivity needed — pure display

**Reuse from:** PublishModal athlete preview renderer (lines 273–329) and AthletePageWorkoutsTab section rendering pattern, scaled up.

### 2. Add TV Chip to Workout Cards — `components/coach/CalendarGrid.tsx`

Add a small `<Monitor>` (or `<Tv>`) icon from lucide-react to the workout card action area:
- Placed in the title row alongside existing "N" notes chip and booking badge
- `onClick` → `window.open('/tv/' + wod.id, '_blank')`
- Only shows on cards with an `id` (saved workouts, not empty placeholders)
- Tooltip: "TV Display"

### 3. Types — No Changes Needed

`WODFormData` and `WODSection` from `types/movements.ts` and `hooks/coach/useWorkoutModal.ts` already have all needed fields.

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `app/tv/[id]/page.tsx` | **CREATE** | TV display page (server component) |
| `components/coach/CalendarGrid.tsx` | MODIFY | Add TV chip to workout cards |

## Verification

1. Open coach page → create or find a saved workout
2. See the TV icon chip on the workout card
3. Click it → new tab opens with `/tv/[wodId]`
4. Verify: all sections displayed, large text, dark background, intent notes visible, unpublished sections marked
5. Test on actual TV screen for readability
