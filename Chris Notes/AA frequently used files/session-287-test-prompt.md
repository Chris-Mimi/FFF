# Session 287 Test Prompt — Waitlist Promotion + capacity=0 Fix

Copy the block below into the next Claude Code session as the first message:

---

Session 287 fixed two booking bugs. Please help me verify them in dev. See `project-history/2026-04-18-session-287-waitlist-promotion-capacity-zero-fix.md` for full context.

**What was fixed:**
1. `capacity === 0` (= "unlimited") previously forced every booking to `waitlist`. Now treated as unlimited in `lib/coach/bookingHelpers.ts` and `app/api/bookings/create/route.ts`.
2. Saving a WOD in the Workout modal updates `weekly_sessions.capacity` but didn't promote waitlist. Added `promoteWaitlistForSession`/`promoteWaitlistForWorkout` in `lib/coach/sessionCapacityHelpers.ts` and wired them into all 5 capacity-update sites in `hooks/coach/useWODOperations.ts`.

**Test plan (run `npm run dev` and walk through these):**

Scenario A — capacity=0 booking:
1. Create or edit a WOD. Set `max_capacity = 0` and publish.
2. From 2–3 athlete accounts (or the coach Manual Booking Panel), book the session.
3. ✅ Expected: every booking shows as **confirmed** (UI + `bookings.status = 'confirmed'`). Previously they all went to waitlist.

Scenario B — capacity raise via WOD save promotes waitlist:
1. Create a WOD at `max_capacity = 2`. Book 2 athletes (both confirmed). Book a 3rd (waitlist).
2. Edit the WOD. Change `max_capacity` to 5. Save.
3. ✅ Expected: 3rd athlete is auto-promoted to confirmed. Previously they stayed on waitlist.

Scenario C — capacity raise 0 → finite promotes waitlist:
1. Create a WOD at `max_capacity = 0`. Manually insert a `bookings` row with `status = 'waitlist'` (or use old DB state from before the fix).
2. Edit the WOD. Change `max_capacity = 10`. Save.
3. ✅ Expected: waitlist entry promoted to confirmed.

Scenario D — capacity-edit button (sanity — should still work):
1. From the session modal, open "Edit capacity" and raise capacity. Existing waitlist entries should still promote (this path wasn't changed but shouldn't regress).

**If all four pass:** commit isn't required (already committed in session 287). Just report pass/fail and any edge cases you hit.

**If any fail:** grab the session_id, all booking rows for that session, and the step that failed. We'll diagnose from there.

Also flag (do not fix unless asked): `app/member/book/page.tsx:540-564` still doesn't handle `capacity === 0` in the UI (division by zero + shows "Full"). Cosmetic only.
