# Backfill Historical Bookings from Whiteboard Intro Names

**Status:** FUTURE TASK (post-launch)
**Created:** 2026-03-15 (Session 211)

## Goal

Populate historical workout sessions with the athletes who actually attended, using the short names written in the Whiteboard Intro section of each workout.

## Data Source

- `wods.sections` JSONB array
- Look for sections with type "Whiteboard Intro" (or similar)
- Each contains athlete short names like: "Mimi", "DanielS", "DanielB", "AnnaHo", "AnnaHa"

## Script Steps

1. **Build name lookup table** (requires Chris input):
   - Map each short name to a `members.id` / `members.email`
   - Handle ambiguous names: DanielS vs DanielB, AnnaHo vs AnnaHa
   - Chris confirms mappings before script runs

2. **Scan all wods** with Whiteboard Intro content:
   - Extract short names (split by comma, space, newline)
   - Normalize: trim whitespace, handle case variations

3. **Match to weekly_sessions**:
   - Each wod links to weekly_sessions via `workout_id`
   - Create `bookings` records with status `confirmed` for each matched member

4. **Lock sessions afterward**:
   - Set `is_locked = true` on all backfilled sessions
   - Prevents future changes to historical attendance

## Edge Cases

- Multiple sessions per workout (e.g., 09:00 and 17:00) — need to determine which session each athlete attended, or book into all sessions for that workout
- Names not in the members table (guests, dropouts) — skip with warning log
- Sessions that already have bookings — skip duplicates (UNIQUE constraint handles this)

## Prerequisites

- Session lock feature must be deployed (done Session 211)
- All historical workouts must have Whiteboard Intro sections populated
- Members table must have all relevant athletes

## When to Run

- After full launch, when Chris confirms all historical workouts are entered
- Run as a one-time migration script (Node.js, uses Supabase admin client)
