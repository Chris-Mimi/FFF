# Session 134 — Benchmark PR Detection Fix

**Date:** 2026-02-17
**Model:** Opus 4.6
**Focus:** Fix benchmark PR notifications (Phase 1d bug from Session 133)

## Problem

Benchmark PR detection + push notifications never triggered. `[PR DEBUG]` logs never appeared in terminal, meaning the API route was never hit.

## Root Cause

`AthletePageBenchmarksTab.tsx` and `AthletePageForgeBenchmarksTab.tsx` saved benchmark results directly via Supabase client (`.insert()` / `.update()`), completely bypassing `/api/benchmark-results` where PR detection lives. Only the logbook tab (via `useBenchmarkManagement.ts` hook) used `authFetch` to call the API.

## Fix

1. **Migrated both tab components** to use `authFetch('/api/benchmark-results')` instead of direct Supabase calls
2. **Added type-based field mapping** — single `result_value` mapped to correct typed field (`timeResult`/`repsResult`/`weightResult`) based on `benchmarkType`
3. **Added `id` parameter to API** — for explicit update-by-ID when editing existing records
4. **Removed composite key upsert** — the old `(user_id, benchmark_name, result_date)` lookup was overwriting entries instead of creating new ones. Now: no `id` = always insert, `id` provided = update by ID
5. **Removed debug logs** from API route
6. **Added PR toast** to both tab components

## Files Changed

- `app/api/benchmark-results/route.ts` — `id` support, removed composite key upsert, removed debug logs
- `components/athlete/AthletePageBenchmarksTab.tsx` — migrated save to `authFetch`, added type mapping + PR toast
- `components/athlete/AthletePageForgeBenchmarksTab.tsx` — same migration

## Key Lesson

When adding server-side logic (like PR detection) to an API route, audit ALL frontend save paths — not just the one you're testing. Multiple components may save to the same table via different methods.
