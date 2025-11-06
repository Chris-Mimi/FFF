# Database-Driven Benchmarks & Lifts Management

**Date:** November 5, 2025
**Commit:** `36352ec`

## Summary
Converted hardcoded benchmark workout and barbell lift arrays into coach-manageable database tables with full CRUD interface. Enables coaches to customize benchmark lists without code changes.

## Key Features Completed

### Database Tables Created
- `benchmark_workouts` - CrossFit standard benchmarks (21 seeded: Fran, Helen, Murph, etc.)
- `forge_benchmarks` - Gym-specific custom benchmarks
- `barbell_lifts` - Barbell lift exercises (11 seeded: Back Squat, Deadlift, etc.)
- All tables include: name, type/category, description, display_order
- Coach RLS policies: INSERT/UPDATE/DELETE on all three tables
- Public read access for athletes

### Coach Management Interface
- Three-tab UI at `/coach/benchmarks-lifts`
- Modal forms for add/edit with all fields
- Delete with confirmation dialogs
- Display order management
- Type/category dropdown selectors
- Navigation button added to coach dashboard

### Athlete Page Updates
- BenchmarksTab: Database fetch from `benchmark_workouts`
- LiftsTab: Database fetch from `barbell_lifts`
- Dynamic lists replace hardcoded arrays
- Sort by coach-controlled `display_order`

## Database Migrations
- `20251105_add_benchmark_and_lift_tables.sql` - Core tables with seed data
- `20251105_add_coach_permissions_benchmarks_lifts.sql` - RLS policies
- `20251105_add_forge_benchmarks.sql` - Gym-specific benchmarks table
- `20251105_fix_newlines_in_descriptions.sql` - Description formatting fix

## Files Modified
- `app/coach/benchmarks-lifts/page.tsx` (new, 866 lines)
- `app/coach/page.tsx` - Navigation button
- `app/athlete/page.tsx` - Database fetching for benchmarks and lifts

## Technical Notes
- Modal z-index: `z-[9999]` with `stopPropagation()` for proper layering
- Description newlines: Use `REPLACE(description, E'\\n', E'\n')` in SQL
- Input styling: Always add `bg-white text-gray-900` to prevent greyed-out appearance
