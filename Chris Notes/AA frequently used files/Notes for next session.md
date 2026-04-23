This document is a template with headings to show you where the issue is or where the improvement needs to be. Headings appear inside "#". If they are not followed by a "*" and text, ignore them, otherwise, read the text and act accordingly.

# Mobile URL #
http://192.168.178.75:3000


# FIRST. FIX BUGS MAKE IMPROVEMENTS #
# Coach Login #
* 
* Mobile view: I couldn't select from the dropdown on Schedule Page:Workout Type. No list appeared when I clicked in it.
* 
* Mimi's iPhone copy/paste & delete function
* Box WiFi: Mac gets IPv6-only (no IPv4), dev sites (GitHub/Supabase/Vercel/Resend) unreachable. PC on same box WiFi works fine. At home all works. Debug next time at the box — see `SESSION-HANDOFF-S303-DNS-issue.md` for diagnostic history.
* 
* Has Fabian's parent got a login, if so who?
* Make the M/F WP selectors give me a warning if I change a selected one



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
SHould only show the days on which athlete has attended a workout. For example, if athletes have not attended a workout on a day, the day should not be displayed.

* 

# Athlete Leaderboard Page #

# Member Management Page #
*

# Future Plans 25.11.25 #

 Testing & Deployment - Validate current feature set
     Systematic testing of 3-state workout system, booking flows, athlete page enhancements. Create deployment
     checklist. (2-3 hours)
  2. Future Feature Development - Pick a new feature
     Implement undo functionality, bulk operations, improved search/filter, or another enhancement from the roadmap.
  3. Exercise Library Enhancements - Add optional features
     Equipment/body parts filters, favorites tracking, video URLs, or usage analytics for the exercise library.
  4. Code Maintenance - Review file sizes
     Check if any files are approaching 1500 lines and need proactive refactoring. Low priority unless files growing.

     📋 TODO Features (Not Yet Implemented)

  1. Session Cancellation Notifications - Members not notified when sessions cancelled
  2. Waitlist Promotion Notifications - Members not notified when promoted from waitlist
  3. Category/Sub-category Dropdowns - Exercise Modal needs dropdowns instead of text inputs

  🚀 Remaining Work Before Deployment

  1. Code Commits: Commit auto-promotion fixes, timezone fix, UX improvements
  2. Exercise Modal: Add category/sub-category dropdowns
  3. Deployment Checklist:
    - 5.1: Run production build, check TypeScript/build errors
    - 5.2: Verify environment variables, security, RLS policies
    - 5.3: Browser compatibility testing (Chrome, Firefox, Safari, mobile)
  4. Testing Report: Document all test results
  5. Memory Bank: Update Session 21 history

  1. [✔] Equipment/Body Parts Filters
     Add multi-select dropdown filters in MovementLibraryPopup to filter exercises by equipment and body parts (2-3
     hrs, no DB changes needed)
  2. [✔] Video URL Integration
     Display video URLs as iframe embeds with modal viewer. Field already exists in DB, just needs UI integration (2-3
     hrs)
  3. [ ] Favorites & Recently Used
     Add star icons for favorites + recently used section. Uses localStorage, no DB changes (3-4 hrs for both)
❯ 4. [ ] Usage Analytics
     Show exercise frequency in workouts using text parsing. Imperfect but quick (1-2 hrs, or defer for future schema
     refactor)

     1. activeContext.md (v6.1 → v6.2)
    - Added Session 22 summary with exercise filters and video features
    - Added 4 new lessons learned:
        - Pattern ordering in rule-based systems
      - Equipment vs descriptor distinction
      - Search comprehensiveness expectations
      - Dry run mode for safe automation
    - Updated "Next Immediate Steps" to mark filters/video as completed
    - Version dated: 2025-11-26
  2. Created project-history/2025-11-26-session-22-exercise-filters-video.md
    - Comprehensive 440-line session history
    - Features: Multi-select filters, video modal, equipment script, enhanced search
    - Technical details: Filter architecture, pattern priority, TypeScript fixes
    - Testing results: 421/522 exercises auto-populated (80.7%)
    - Lessons learned: 6 key takeaways
    - Statistics: 1.5 hours, ~85K tokens, high user satisfaction


    Github Mimi Mac - FFF Project no expiration token : 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
    We had some issues with this and couldn't get it to work. The old token should stop working in January at which time we can input this one.

    Testing for last session:
    3. Critical Functionality

  - Section expansion state persists correctly
  - Active section tracking works for library inserts
  - Drag-drop preserves section order
  - Modal resizing maintains position
  - Movement removal updates UI correctly

  4. Code Review

  - Check WorkoutModal.tsx imports useWorkoutModal correctly
  - Verify return interface matches expectations
  - No console errors in browser
  - State dependencies in useEffect are correct

  5. Edge Cases

  - Empty workout creation works
  - Editing workout with pending section drop
  - Time updates for sessions
  - Apply workout to multiple sessions


   Testing Checklist - Refactored Components

  1. WorkoutModal (Panel & Modal Modes)

  Panel Mode:
  - Open panel via calendar date click
  - Header displays correctly with all buttons (Save, Publish, Notes, Close)
  - Create new workout → Save → Works
  - Edit existing workout → Save → Changes persist
  - Toggle Coach Notes → Floating panel appears at correct position (bottom: 190, left: 800)
  - Drag notes panel → Position updates
  - Resize notes panel from all 4 corners → Size updates
  - Close notes panel → Reopens at last position
  - Session time edit (inline) → Updates correctly
  - Publish button (saved workout only) → Works
  - Close panel → Data cleared

  Modal Mode:
  - Open modal via "Create Workout" button
  - Header displays correctly with all buttons
  - Create new workout → Save → Works
  - Toggle Coach Notes → Side panel appears (not floating)
  - Side panel cannot be dragged/resized
  - Session time edit → Works
  - Close modal → Data cleared

  2. SessionManagementModal

  Session Details:
  - Modal opens with correct session data
  - Capacity displays correctly (X/Y confirmed)
  - Time displays correctly
  - Edit capacity inline → Save → Updates
  - Increase capacity → Waitlist auto-promoted
  - Decrease capacity below confirmed count → Warning shown
  - Edit time inline → Save → Updates
  - Drag modal → Position updates
  - Resize modal from all 4 corners → Size updates

  Booking Management:
  - Manual booking dropdown shows available members
  - Add member to confirmed → Booking created
  - Add member when full → Goes to waitlist
  - Mark confirmed as no-show → Status updates
  - Mark confirmed as late-cancel → Status updates
  - Undo no-show → Returns to confirmed
  - Undo late-cancel → Returns to confirmed
  - Bookings grouped by status (Confirmed, Waitlist, No-Show, Late Cancel)
  - Cancel session → Status updates to cancelled

  10-Card Tracking:
  - Manual booking decrements 10-card
  - No-show decrements 10-card (if not already decremented)
  - Late-cancel decrements 10-card (if not already decremented)
  - Undo actions restore 10-card usage

  3. AthletePageLogbookTab

  Day View:
  - Navigate previous/next day → Workouts load
  - "Today" button → Jumps to current date
  - Booked future workout → Shows "Booked" placeholder
  - Attended past workout → Shows full sections
  - Published sections only displayed
  - Result input → Saves correctly
  - Notes input → Saves correctly
  - Date input → Saves correctly
  - "Save Log Entry" → Creates new log
  - "Save Log Entry" (existing) → Updates log
  - Empty result/notes → Save button does nothing

  Week View:
  - Navigate previous/next week → Workouts load
  - "Today" button → Jumps to current week
  - 7-day grid displays (Mon-Sun)
  - Each day shows correct workouts
  - Booked workouts → Green background, "Booked" text
  - Attended workouts → White background, title + track color dot
  - Click workout card → Switches to day view for that date
  - Days with no workouts → "No workouts" message

  Month View:
  - Navigate previous/next month → Workouts load
  - "Today" button → Jumps to current month
  - Calendar grid displays (42 days, 6 weeks)
  - Current month days → White background
  - Adjacent month days → Grey background
  - Workouts display in correct dates
  - Booked workouts → Green pill, "Booked"
  - Attended workouts → Teal pill with title
  - Click day with workouts → Switches to day view
  - Days with >2 workouts → Shows "+X more"

  Cross-View:
  - Switch between views → Date persists
  - Loading states display correctly
  - Empty states display correctly
  - Only user's confirmed bookings shown
  - Workout logs persist across view switches

---

# S305 Close → S306 Handoff

## Status
Clean close. S305 shipped one-shot whiteboard-name backfill: 1083 bookings inserted retroactively + 3 historical orphan scores re-attributed. Sonja Hujo's conflicting score was deleted manually (Chris will re-input via UI). S299/S300 leaderboard items live-verified OK; S302 benchmark tiebreakers pinned as edge case.

## Next concrete action (S306 start)
1. **Re-input Sonja Hujo's deleted score** via Score Entry UI — she now has a booking from the S305 backfill, so the entry will land with `member_id` set cleanly. (Chris: just normal flow, nothing special.)
2. **Sanity-check the backfill in production:** open Session Management for any past WOD that previously had whiteboard-only attendees (e.g. one of the early December 2025 dates from the dry-run sample) and confirm the names now show as booked members. Spot-check 2-3 sessions.

## Pending live-tests (carry-over, still not done)
1. **S296** Intervals timer mode itself on deployed app (presets already confirmed S298).
2. **S297** SPF/DKIM/DMARC in Resend → Domains + reset flow end-to-end on live app.

## Other open items
- **Mac Chrome hang** — dedicated session needed. Activity Monitor (Memory Pressure, Chrome Helper), disk free %, `~/Library/Logs/DiagnosticReports/`. Fixes Mac push as a side effect.
- **Athlete subscription bug** — Stefan Glocker DB row + webhook ordering + `autoExpireSubscriptions` vs trialing.
- **Whiteboard duplicate entries** (Session 251 uncommitted in `memory/project_whiteboard_duplicates.md`). **Note:** S305 backfill may have largely resolved this — re-evaluate before doing the S251 work.
- **Score-entry API filter** (deferred S289) — `app/api/score-entry/[sessionId]/route.ts:48-56`.
- **Test endpoint 410 cleanup** (deferred S292) — `app/api/notifications/test/route.ts`.

## Files to open first
1. `memory-bank/memory-bank-activeContext.md` — v168.0 (just written)
2. If revisiting whiteboard duplicates: `memory/project_whiteboard_duplicates.md` + check whether S305 already covers it

## Landmines
- `scripts/backfill-whiteboard-bookings.ts` is a **one-shot** — don't re-run unless retroactively backfilling a fresh batch of historical Whiteboard Intro entries. It's idempotent (dedupes on existing bookings), but no reason to re-run.
- **Supabase JS `.select()` caps at 1000 rows by default.** Any future script that builds in-memory state from a large table (`bookings`, `wod_section_results` if it grows) needs `.range(from, from+999)` pagination loop. See [scripts/backfill-whiteboard-bookings.ts:122-135](scripts/backfill-whiteboard-bookings.ts#L122-L135) for the pattern.
- `*.sql` is `.gitignore`'d by pattern — DB migrations need `git add -f` per commit.
- `tsconfig.tsbuildinfo` is tracked (project convention); commits with TS changes.
