# Session 164 — Debug: "signal is aborted without reason"
**Date:** 2026-02-28
**Model:** Opus 4.6

## Context
Debugging session following Session 163's code changes (commit 6dfeb369). Page would not load after server restart. Error: "signal is aborted without reason".

## Issue
- **Symptom:** Page failed to load; "signal is aborted without reason" in console. Login page showed "Signing in..." spinner indefinitely.
- **Hard refresh + server kill/restart:** Did NOT fix it.
- **Resolved:** On its own after ~7 hours.
- **Root cause:** Unknown / transient. Ruled out: `.next/` cache corruption, Supabase free-tier pause (project is actively used daily).
- **Diagnostic for recurrence:** DevTools → Network tab → check Supabase request status (pending = network, cancelled = AbortError, status code = server error).

## Changes Made

### `components/coach/ExercisesTab.tsx`
- Added proper `useEffect` cleanup to the exercise frequency fetch:
  - `cancelled` flag prevents state updates after unmount
  - `clearTimeout` on the 10-second timeout when race resolves or component unmounts
  - `AbortError` guard silences React Strict Mode double-invoke noise
- This is React hygiene improvement, **not** the fix for the transient issue.

## Files Changed
- `components/coach/ExercisesTab.tsx`
