This document is a template with headings to show you where the issue is or where the improvement needs to be. Headings appear inside "#". If they are not followed by a "*" and text, ignore them, otherwise, read the text and act accordingly.

# FIRST. FIX BUGS MAKE IMPROVEMENTS #
# Coach Login #

* After every Workout, i take a picture of the whiteboard. I want to be able to upload this picture to the workout and have it displayed on the workout page.
* Thursday is hideable. Is it complicated to make all days hideable?
* If I go back in time on the monthly calendar, then switch to another tab, it returns to the current date when I return to the calendar tab. As I have a "today" button, I don't need it to return to the current date.
* Make a plan for how we export and then re-import the data from my Google Calendar workouts from the past 5 years.
*
*

 # Edit Workout Modal (coach) #
 IMPROVEMENTS/Bug Fixes:
 * Configure sets/reps modal input fields are greyed out in Lifts, Benchmarks & Forge Benchmarks.
 *


# Analysis page
* If I am not at the top of the page, the page jumps when clicking a category filter button.
* Make the week button a drop down from which I can select 1-8 weeks.
* fix the timescale selector so it doesn't jump left and right on clicking different timescales. It does this as the timescale indicator on the right shrinks and expands.
* How many top exercises will display?
* Make the "Manage Tracks" section collapsible and have it collapsed by default as it will not be used often.
* Make a note that we have to add filter badges to the Analysis page for Lifts, Benchmarks, and Forge Benchmarks.

# Calendar View #
*

# Athlete Published Workouts Page #
*

# Athlete Logbook Page #
*

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
