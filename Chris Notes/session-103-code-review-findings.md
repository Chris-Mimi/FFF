# Session 103 — Code Review & Competitor Analysis Findings

**Date:** 2026-02-10
**Model:** Opus 4.6

---

## Part 1: Code Improvements (UX/Quality)

### High Impact

- [x] 1. **Replace `alert()` with toast notifications** — ✅ DONE (Session 105, sonner). 39 files updated, zero alert() remaining.
   - Files: booking page, schedule page, gallery, modals, tabs

- [x] 2. **Add `aria-labels` to icon-only buttons** — ✅ DONE (Session 106). ~136 aria-labels added across 35 files.
   - Previously only 1 aria-label in entire codebase (ExerciseVideoModal)

- [ ] 3. **Add Escape key handlers** to modals that are missing them — most modals can't be closed via keyboard.
   - Only ExerciseVideoModal and SearchPanel have Escape handlers

### Medium Impact

- [ ] 4. **Form validation** — Many inputs lack `required`, `maxLength`, or inline error messages. No character limits, no numeric constraints.

- [ ] 5. **Debounce search inputs** — SearchPanel and MovementLibrary filter on every keystroke. Could cause lag on large datasets.

- [ ] 6. **Missing empty states** — Favorites section, booking history, records tab show minimal UI when empty.

- [ ] 7. **Touch targets** — Some mobile buttons under 44px (BookingListItem action buttons, SearchPanel mobile toggle).

### Lower Impact

- [ ] 8. **Replace browser `confirm()` with styled modal dialogs** — Most delete actions use browser confirm().

- [ ] 9. **Focus traps in modals** — Can tab outside of modals currently.

- [ ] 10. **Color contrast audit** — Some potential WCAG AA issues with teal-on-white text.

---

## Part 2: Competitor Feature Analysis

### Competitors Researched
WODIFY, SugarWOD, Beyond the Whiteboard (BTWB), Zen Planner, PushPress, Wodboard

### Top 10 Missing Features (Ranked by Value)

| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| | # | Feature | Effort | Impact |
|---|---|---------|--------|--------|
| ✅ | 1 | **Social reactions on results** (fist bumps/likes + comments) | Medium | Very High |
| ✅ | 2 | **Per-workout leaderboard** | Medium | Very High |
| ⬜ | 3 | **Push notifications** (WOD posted, PR, booking reminders) | High | Very High |
| ⬜ | 4 | **Workout intent/stimulus notes + scaling options** | Low | High |
| ⬜ | 5 | **At-risk member alerts** (no attendance for X days) | Low-Med | High |
| ⬜ | 6 | **Built-in workout timer** (AMRAP/EMOM/For Time) | Medium | Medium |
| ⬜ | 7 | **Auto percentage calculator** from athlete's 1RM | Low-Med | High |
| ⬜ | 8 | **Achievement badges/streaks** | Medium | Medium |
| ⬜ | 9 | **Athlete notes + result photos** on logged workouts | Low | Medium |
| ⬜ | 10 | **Movement demo videos** linked in workouts | Low (code) | Medium |

### Quick Wins (Low effort, high value)
- **#4 Workout intent/stimulus notes** — Add structured "Intent/Stimulus" field + scaling options per workout section
- **#9 Athlete notes + result photos** — Add optional notes/photo fields to workout result entries (already have upload infra)
- **#10 Movement demo videos** — Add video_url to exercises table (already exists!), display on athlete workout view

### Medium Effort, Very High Impact
- **#1 Social reactions** — reactions table + comments table + UI on result cards. Drives community engagement.
- **#2 Leaderboard** — Already track workout results. Add ranked view per workout, filter Rx/Scaled.
- **#5 At-risk alerts** — Already have booking data. Dashboard showing members by days-since-last-visit.
- **#7 Percentage calculator** — Already have lift records. Calculate 75% of 1RM when workout references percentages.

### Larger Projects
- **#3 Push notifications** — Service worker, notification preferences table, server-side triggers
- **#6 Workout timer** — Client-side component with AMRAP/EMOM/Tabata presets
- **#8 Badges/streaks** — Badge criteria, user_badges table, trigger logic

---

## What Forge Already Does Well (vs Competitors)
- Section-based workout programming is more flexible than most competitors
- Movement library with 500+ exercises exceeds most platforms
- Custom "Forge" benchmarks alongside standard benchmarks is unique
- Analysis page (movement frequency, body part coverage) is more detailed than most
- Whiteboard photo system is a nice differentiator
- 10-card membership with grace period cancellation is well-implemented
- Family member booking is uncommon in competitors

---

## Sources
- Wodify: wodify.com/products
- SugarWOD: sugarwod.com/coach-features, athlete-features, owner-features
- BTWB: beyondthewhiteboard.com
- Zen Planner: zenplanner.com/product
- PushPress: pushpress.com/products/core
- Wodboard: wodboard.com/features
