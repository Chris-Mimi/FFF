This document is a template with headings to show you where the issue is or where the improvement needs to be. Headings appear inside "#". If they are not followed by a "*" and text, ignore them, otherwise, read the text and act accordingly.

# Mobile URL #
http://192.168.178.75:3000

# Next Session — First Action #

* **PRIORITY 1 — Fix the booking unique-active-bookings constraint.** S316 introduced the `late_cancel` status, but the partial unique index on `bookings(session_id, member_id) WHERE status != 'cancelled'` was never updated. Result: any athlete who late-cancels (or whom the coach cancels via `coach_cancelled`) can NEVER be re-booked into the same session. Carole Schultz hit this today.

  **Fix (one SQL migration):** drop and recreate the index excluding all "effectively cancelled" statuses:
  ```sql
  DROP INDEX IF EXISTS unique_active_bookings;
  CREATE UNIQUE INDEX unique_active_bookings
    ON bookings(session_id, member_id)
    WHERE status NOT IN ('cancelled', 'late_cancel', 'coach_cancelled');
  ```
  Save as `database/fix-late-cancel-rebooking.sql`. Chris can run it in Supabase SQL Editor in 30 seconds. Then verify by re-booking any late-cancelled member in coach Session Management.

* **PRIORITY 2 — Manual fix for Carole Schultz** (only matters if Chris hasn't done it himself yet). Supabase Dashboard → `bookings` table → filter `member_id` to Carole Schultz + the WOD session from 2026-04-23 → her row will have `status = 'late_cancel'` and `booked_at = 2026-04-23 23:31`. Either change `status` to `cancelled` (then re-book her in the app) or directly to `confirmed` (skip the re-book). Chris is "pretty sure she late-cancelled herself" — `late_cancel` status confirms that (athlete-initiated). She did Open Gym instead.

* **PRIORITY 3 — Discuss Open Gym (OG) attendance flow with Chris.** Today's case (Carole) showed the gap: athletes who book a WOD then switch to OG currently late-cancel and disappear. Chris wants OG-attended athletes to still show in bookings. Three options I proposed but did NOT implement (he asked to defer):
  - **(A)** New status `attended_og` + a coach-side button "Switch to Open Gym" — leaves booking visible, marks she came but did her own thing.
  - **(B)** Just allow re-book to `confirmed` (current row overridden) — minimal change.
  - **(C)** Track Open Gym as a separate session type so she books OG in parallel — proper separation, more work for the athlete.
  Get Chris's preference, then implement.

* **PRIORITY 4 — Confirm Chris reset the next-week release time** to `16:00` in Admin → Booking Rules. This session he set it to `14:00` as a band-aid while we deployed the timezone fix. The fix is live (commit `5af8005`); the field now means Berlin wall-clock time. If he forgot to reset, next Sunday's release will fire 4 hours early.

# Carry-over from S317 (still untested in prod) #

* **Live-test German login error messages** (S317): incognito → wrong-email expects "Kein Konto..."; right-email + wrong password expects "E-Mail-Adresse erkannt, aber das Passwort ist falsch...".
* **Live-test late-cancel gate** (S316): cancel a confirmed booking past auto-lock threshold from athlete app → expect distinct toast + purple Late Cancel chip coach-side.
* **Resend SPF/DKIM/DMARC** for `the-forge-functional-fitness.de` still unverified — separate from any session's work but the underlying email-deliverability risk persists.

# FIRST. FIX BUGS MAKE IMPROVEMENTS #
# Coach Login #
* Mimi's iPhone copy/paste & delete function
* Box WiFi: Mac gets IPv6-only (no IPv4), dev sites (GitHub/Supabase/Vercel/Resend) unreachable. PC on same box WiFi works fine. At home all works. Debug next time at the box — see `SESSION-HANDOFF-S303-DNS-issue.md` for diagnostic history.
* Has Fabian's parent got a login, if so who?
* Coach login, Athletes tab, Lifts, Benchmarks, Forge sections. Do the scores I input here automatically appear in the athlete's app? Also, I need to be able to delete and re-enter some scores here.

# Coach library #

# Workout Library tab (coach) #
Integration with website
Investigate the "Whiteboard Intro" sections appearing in earlier workouts
2-tier payment family

Athlete login:

 # Edit Workout Modal (coach) #
Once athletes start registering, you can re-run this script anytime to check the state:
npx tsx scripts/check-whiteboard-name-conflicts.ts

  # Publish Workout Modal (coach) #
 IMPROVEMENTS/Bug Fixes:

 # Exercises tab (coach) #
 IMPROVEMENTS/Bug Fixes:

# Analysis page

# Calendar View #
*

# Athlete Published Workouts Page #
Should only show the days on which athlete has attended a workout. For example, if athletes have not attended a workout on a day, the day should not be displayed.

*

# Athlete Leaderboard Page #

# Member Management Page #
*

# 📅 Scheduled reminder — 2026-05-01 (check if late-cancel gate is firing)
If today is **2026-05-01 or later**, run this query in Supabase SQL editor:
```sql
select count(*) as total_late_cancels,
       max(updated_at) as most_recent
from bookings
where status = 'late_cancel'
  and updated_at >= '2026-04-24';

select m.name, ws.date, ws."time", b.updated_at
from bookings b
join members m on m.id = b.member_id
join weekly_sessions ws on ws.id = b.session_id
where b.status = 'late_cancel'
  and b.updated_at >= '2026-04-24'
order by b.updated_at desc
limit 5;
```
If total is 0 after a week of real usage → flag it, the gate may not be firing. If >0 → the gate is working, mark this reminder done and delete this block.
