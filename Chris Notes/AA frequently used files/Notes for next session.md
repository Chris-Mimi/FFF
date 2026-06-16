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
* iphone bug (I think) Coach-side: Workouts search box: Mimi can't type anything in the search box
* Mimi couldn't add a trial athlete
* 

Athletes app: Give me the posssibility to send Athletes who pay for the app a message.
* Workouts page: ability to mute/cancel athletes without clearing the group
* Kids in Athletes list on Workouts page:
Need DOB: Engels Frida, Frieda Stromer, Leopold Wischhöfer, Nico Enzmann, 
Ask Mimi Silvia Maritati (Diapers & Dumbbells?)
* 
* 
Default setting for publish should be NOT to notify athletes.
* 
* Workouts page: Custom Movements list:Movement Tracking grid: Give me a numbered list in the Custom Movements and a numbered list across the top of the Tracking Grid. This enables me to locate an exercise quickly rather than counting across. This is an issue in the KB List for example as most exercises have an acronym that begins with K. Identifying a number (as well as the acronym) makes it easier.
* Kathrin should flag in the banner as her sub is about to cancel in 3 days!

* Ask Claude for a Magic link script to access athlete's accounts to check screen views so I can help them click the right buttons. I just give Claude the email ad.
* 
* Macbook still has internet problem at the box. Old Macbook Pro works fine.
Script works. Baseline + a sample capture both saved to ~/mac-incident-data/.

When the problem next happens — here's exactly what to do:

Open Terminal (or use a Terminal window that's already open — don't try to launch new apps when the system is jammed)
Type: ~/mac-incident-data/capture.sh and press Enter
Takes ~10 seconds; outputs a timestamped file
Then do your usual recovery (Cmd+Option+Esc or hard restart)
Next session, tell me to read the incident file and we'll compare it to the baseline

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

# Athlete Leaderboard Page #

# Member Management Page #

- 🟢 HELPFUL NOTES:
* Planning Grid terminology: the filled marker is a "coverage dot" (solid colored circle with a check = "this was covered that week"; the dashed empty one is the "planning circle" for future weeks). I'll use "coverage dot" precisely from here on.
