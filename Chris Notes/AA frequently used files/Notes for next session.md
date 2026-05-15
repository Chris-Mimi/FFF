This document is a template with headings to show you where the issue is or where the improvement needs to be. Headings appear inside "#". If they are not followed by a "*" and text, ignore them, otherwise, read the text and act accordingly.

# Mobile URL #
http://192.168.178.75:3000

# Next Session — First Action #
* **Live-test the late-cancel gate shipped in S316.**
  1. Pick any booking on a locked-window session (or set `auto_lock_lead_minutes` to a large value so "now" is inside the lock window).
  2. Cancel from the athlete app.
  3. Expect toast: *"Booking cancelled. This is past the lock time, so it is recorded as a late cancel."*
  4. Open the coach SessionManagementModal for that session → confirm the booking shows under Late Cancel with the purple chip.
  5. Open Admin → Attendance rollup → confirm the late_cancel is counted in the rollup.
  6. Sanity check: cancel a booking well before the lock window → expect normal *"Booking cancelled"* toast, status = `cancelled`.

# FIRST. FIX BUGS MAKE IMPROVEMENTS #
# Coach Login #
* Mimi's iPhone copy/paste & delete function
* Box WiFi: Mac gets IPv6-only (no IPv4), dev sites (GitHub/Supabase/Vercel/Resend) unreachable. PC on same box WiFi works fine. At home all works. Debug next time at the box — see `SESSION-HANDOFF-S303-DNS-issue.md` for diagnostic history.
* IDEA: Put names of booked athletes in Whiteboard Intro so they also go into Google Calendar or find another way to register them in Google Calendar.
* iphone bug (I think) Coach-side: Workouts search box: Mimi can't type anythiong in the search box
* Mimi couldn't add a trial athlete
* I added Fabian's birthday but it's not correct, I have to ask him next time he's in.
* Workouts page: ability to mute/cancel athletes without clearing the group
* Kids in Athletes list on Workouts page: Engels Frida, Frieda Strömer, Leopold Wischhöfer, Nico Enzmann, Silvia Maritati (Diapers & Dumbbells?), Tobias Schiegg? Gloria Stoffer? Lenny Kleinert x2? Luisa Gruber?
* Ask Claude for a Magic link script to access athlete's accounts to check screen views so I can help them click the right buttons. I just give Claude the email ad.
* 
* Macbook still has internet problem at the box. Old Macbook Pro works fine.
* Still have an issue when the Macbook has been on for a while on 2 Users that I switch to the other user and get a black screen, then I can't type anything or restart without holding down the start button.
* 
* 
* review the rep max calculator to show clearer percentages
* 
* Why doesn't the data integrity sql catch things like this?
* 
* How it works/info/help file like in Planner
* Review and check how DNF is displayed and used in the athlete leaderboard.

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

# S315 Close → S316 Summary

## Status
Short close-out session. Cleaned up activeContext Next Steps 1/2/3/3b/6 (historical lifts tab mystery, Sonja Hujo re-entry, OG chip, Trial Athletes flow, Intervals timer) — all confirmed done or closed. Then shipped the **late-cancel gate**: athletes who cancel past the auto-lock threshold now land in `late_cancel` status instead of `cancelled`. Waitlist cancels always stay plain `cancelled`.

## Historical lifts mystery (closed)
Imported records were visible all along — Chris was looking in the athlete **Lifts** tab but imported records surface under the **Records** tab. No bug. The distinction: Lifts tab reads `barbell_lifts` + a filtered slice; Records tab shows the full `lift_records` history.

## Late-cancel gate — what shipped
Two files:
- `app/api/bookings/cancel/route.ts` — imports `getLockLeadMinutesForSessionType`, moves session fetch before the UPDATE, computes `isLocked` (manual `is_locked=true` OR past-threshold), sets status = `'late_cancel'` when a `confirmed` booking is cancelled past the lock threshold. Response now includes `status` field.
- `app/member/book/page.tsx` — toast branches on `data.status`: late cancels get `toast.warning(...)` with a distinct message.

No schema change — `late_cancel` enum already exists and is rendered coach-side (BookingListItem, SessionManagementModal, Admin attendance rollup).

## Landmines
* None material. Dev servers still running on both machines — fine; they don't lock anything.

## 📅 Scheduled reminder — 2026-05-01 (check if gate is firing)
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
