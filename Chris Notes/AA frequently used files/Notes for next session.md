This document is only for Chris and should NEVER be read by Claude. 
It should be committed and pushed as all other changes are.

This document is a template with headings to show me where the issue is or where the improvement needs to be, or simply reminders for me as I'm working on other thoings and I have an idea. Headings appear inside "#". If they are not followed by a "*" and text, ignore them, otherwise, read the text and act accordingly.

# Mobile URL #
http://192.168.178.75:3000



# FIRST. FIX BUGS MAKE IMPROVEMENTS #
# Coach Login #
* Mimi's iPhone copy/paste & delete function
* Box WiFi: Mac gets IPv6-only (no IPv4), dev sites (GitHub/Supabase/Vercel/Resend) unreachable. PC on same box WiFi works fine. At home all works. Debug next time at the box — see `SESSION-HANDOFF-S303-DNS-issue.md` for diagnostic history.
* IDEA: Put names of booked athletes in Whiteboard Intro so they also go into Google Calendar or find another way to register them in Google Calendar.
* iphone bug (I think) Coach-side: Workouts search box: Mimi can't type anything in the search box
* Mimi couldn't add a trial athlete
* Mimi's phone when scrolling selects a workout and copies it over anotehr workout and we have no way of getting the workout back.
* Bear Crawl chase around the ring (battle rope), WB Squat Carries
* Kids 1.7, 27.7 31.7 needs exercises

Athletes app: Give me the possibility to send Athletes who pay for the app a message.
* 
* NOTE: Eufy clip saved to Mac: Foam roller movements from 10.06.26 to sav e to YT and then link in app exercises.
Need DOB: Engels Frida, Frieda Stromer, Leopold Wischhöfer, Nico Enzmann, 
Ask Mimi Silvia Maritati (Diapers & Dumbbells?)
* Review what the section filter chips do in the Workouts page. 
* New protocol: memory-bank/whiteboard-score-entry-protocol.md. Next time, just say "run the whiteboard protocol for [photo]" and give the name of the WOD and the date/s and times. Give also any Drop-ins or unknown names in the session. Whether it's an RM/Strength day or a MetCon. I'll: pull the image → transcribe to a verification table → you confirm → map names via the list → write lift_records + WSR → verify one session → parity check. 
* IDEA for new app. Piano tutorials, YT clips, own recordings and sheet music all in one webapp


* At-Risk put the list in order from most recent to least recent attendance
* Weekend WOD #26.2 not done by selected first showed correctly then did not appear
* Michi asked about a way to search past workouts in teh AThlete App

* 
* One thing I'd flag for later (not now): the parallel-session "move" still loses the athlete's whiteboard score for that day (the re-add doesn't carry it over) — only their PR is now safe. A proper one-click "move booking that keeps the score" is the real cure, but that's a feature, not a bug fix. Want me to note it in the memory bank for a future session? - I don't understand, explain in simple terms.
* Macbook still has internet problem at the box. Old Macbook Pro works fine.
Script works. Baseline + a sample capture both saved to ~/mac-incident-data/.

When the problem next happens — here's exactly what to do:

Open Terminal (or use a Terminal window that's already open — don't try to launch new apps when the system is jammed)
Type: ~/mac-incident-data/capture.sh and press Enter
Takes ~10 seconds; outputs a timestamped file
Then do your usual recovery (Cmd+Option+Esc or hard restart)
Next session, tell me to read the incident file and we'll compare it to the baseline

* Exercise library: 
* review the rep max calculator to show clearer percentages
* 

* Why doesn't the data integrity sql catch things like this?
* Planner: click on an exercise in the planner grid and it shows all the instances of that exercise in the workouts
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

