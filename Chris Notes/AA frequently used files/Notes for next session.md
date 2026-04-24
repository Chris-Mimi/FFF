This document is a template with headings to show you where the issue is or where the improvement needs to be. Headings appear inside "#". If they are not followed by a "*" and text, ignore them, otherwise, read the text and act accordingly.

# Mobile URL #
http://192.168.178.75:3000

# Next Session — First Action #
* **Investigate why historical lift records aren't showing in the Lifts tab on the athlete app.**
  Records ARE in the DB (confirmed via service role query — 156 records for Chris Hiles alone).
  The athlete can see records they manually entered, but NOT the historically imported ones.
  Chris was logged out before we could debug further. Start here:
  1. Open the Lifts tab on the athlete app as Chris and check browser console for errors.
  2. Check if there's a date filter or sort that might hide old records (oldest goes back to 2019).
  3. The query in `components/athlete/AthletePageLiftsTab.tsx:83` uses RLS client — verify it's returning data by checking the Network tab in DevTools.
  4. Cross-reference: manually entered records show up, imported ones don't — what's different? (Both use same user_id and lift_name format.)

# FIRST. FIX BUGS MAKE IMPROVEMENTS #
# Coach Login #
* AThletes cancelled really late on Friday and didn't show as late cancellations
* Mimi's iPhone copy/paste & delete function
* Box WiFi: Mac gets IPv6-only (no IPv4), dev sites (GitHub/Supabase/Vercel/Resend) unreachable. PC on same box WiFi works fine. At home all works. Debug next time at the box — see `SESSION-HANDOFF-S303-DNS-issue.md` for diagnostic history.
* Has Fabian's parent got a login, if so who?

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

# S314 Close → S315 Handoff

## Status
Import session. 27 athlete JSON files written from a corrected master JSON (27 athletes). 689 historical lift records imported into `lift_records` table. All JSON files in `data/athletes/processed/`. No app code changed.

## Open issue: historical records not visible in athlete app
- Records ARE in DB (service-role confirmed). Chris's manually-entered records show fine.
- Historical records from import are NOT showing in Lifts tab.
- Session ended before root cause found. Likely a date-range filter, sort, or subtle display difference.
- **Peter Kroll** not yet registered — his JSON is in `processed/` ready when he joins.

## Athlete name corrections made this session (DB names ≠ intuitive names)
| File | full_name in JSON |
|---|---|
| michi-stadele.json | Michael Städele |
| dimitar-peresyov.json | Peresyov Dimitar |
| daniel-bratz.json | Daniel Braatz |
| stefan-glocker.json | Stefan G |
| petr-bezdek.json | Petr  Bezdek (double space — Chris fixing manually in DB) |

## Files to open first
1. `memory-bank/memory-bank-activeContext.md`
2. `components/athlete/AthletePageLiftsTab.tsx` (Lifts tab display logic)

## Landmines
- `*.sql` is `.gitignore`'d — migrations need `git add -f`.
- Peter Kroll not in DB yet — his JSON is staged in `processed/` for when he registers.
- Petr Bezdek DB name has double space — Chris correcting manually.
