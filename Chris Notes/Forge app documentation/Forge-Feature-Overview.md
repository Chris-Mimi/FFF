# FORGE — The All-in-One Platform for Functional Fitness Gyms

> Designed and built by an experienced CrossFit coach — not by a software company guessing what gyms need. Every feature in Forge exists because it solved a real problem on the gym floor.

---

## Why Forge Is Different

Most gym software is built by software engineers who've never programmed a training week, never juggled movement patterns across a mesocycle, and never stood in front of a class wondering when they last tested Fran. These tools give you a booking calendar and call it done.

Forge was born inside a working CrossFit box. It was designed by a coach who programs workouts daily, manages members, and understands that "just use a spreadsheet" isn't good enough. The result is a platform that thinks the way coaches think — not the way developers think coaches should think.

There's no app-switching, no spreadsheets, no whiteboards that get erased. Just one platform that connects your programming to your athletes' results.

---

## For Coaches

### Workout Programming & Calendar

- **Visual weekly and monthly calendar** — see your entire programming cycle at a glance, color-coded by training track
- **Multi-section workout builder** — structure each day with Warm-up, WOD, Strength, Skills, Accessory, and Cooldown sections, exactly how you'd write it on the whiteboard
- **Drag-and-drop** — copy workouts between dates, reorder sections, and build training weeks effortlessly
- **Publish control** — choose exactly which sections athletes can see (keep surprise WODs hidden until class time). The publish modal is draggable and non-blocking, so you can edit the workout and publish settings side by side
- **Coach notes** — attach workout intent and stimulus notes so athletes understand the "why" behind the programming
- **Movement demos** — video clips are automatically detected from exercises in your workout sections and displayed in a collapsible bar. Coaches can also manually attach any YouTube or direct video link. One-click playback in a draggable, resizable player
- **Google Calendar sync** — optionally publish workouts to a public Google Calendar for members who prefer that view

### Smart Search & Movement Intelligence

- **Full-text search** across all workouts — find every time you've programmed a specific movement, workout name, or note
- **Acronym-aware search** — type `BS`, `DL`, `OHS`, `C&J` or any common lift shortcut and get every workout featuring that lift, including Lifts sections that reference the movement by full name. Acronyms are defined per-exercise in the database, so coaches never need to memorise which shortcut resolves to which lift
- **Movement frequency tracking** — see how often you've programmed each exercise, with date-range filtering. Never accidentally neglect a movement pattern again
- **Custom movement tracking panel** — pin the exercises you want to monitor and see at a glance when each was last programmed. Color-coded date aging (green/yellow/orange/red) highlights neglected movements instantly. Fully responsive on mobile with a dedicated toggle
- **Exercise groups** — save named presets of tracked exercises (e.g., "Barbell Strength", "Oly Lifts") and toggle entire groups on or off with one click. Group exercises appear nested under their chip for a clean overview
- **Workout deduplication** — search results intelligently group repeated workouts so you see unique programming, not duplicates
- **Filter by track, type, section, or athlete** — slice your programming data any way you need

### Member & Class Management

- **Self-registration with approval** — members sign up themselves; you approve, block, or manage their access
- **At-risk alerts** — automatically flag members with declining attendance (configurable timeframe)
- **Class scheduling** — define recurring session templates with day, time, type, and capacity. Generate weekly sessions automatically
- **Booking management** — see who's booked, waitlisted, or no-showed. Add members manually or let them self-book
- **Trial-athlete tracking** — pre-known trial athletes (people coming to try a class but not yet registered) get added by name from the same Add Member dropdown. They count toward class capacity, appear in Score Entry as "Anna (trial)" so their score gets recorded against the workout, and show up in an Admin Tools panel that surfaces "how many trial sessions and unique athletes onboarded in any date range." When they later register and get their whiteboard name set, their trial sessions auto-convert to confirmed bookings — but stay in the Trial Athletes panel as a permanent onboarding record so the metric never erodes
- **Family accounts** — link spouses and children under one primary account. Parents can book for the whole family
- **Membership types & class categories** — assign members to specific class types (Group, Personal Training, Kids, Foundations)

### Athlete Insights (Coach View)

- **Individual athlete profiles** — view any athlete's benchmark history, lift PRs, logbook entries, and payment status from one screen
- **Log results on their behalf** — coaches can record benchmarks, lifts, and workout results for athletes directly
- **Score entry modal** — quick overlay modal on the coach calendar to enter scores for all booked athletes at once, with per-athlete scaling and track selection. Press Enter to jump to the same field on the next athlete for fast column entry
- **Automatic lift record sync** — when a workout section includes a rep-max test (1RM, 3RM, 5RM, or 10RM), the score entry modal automatically shows a weight input. Coach enters the weight, and the athlete's lift records, progress charts, and calculated 1RM are updated instantly — no athlete input needed. PR detection and push notifications fire automatically
- **Up to 3 scaling levels** — enable up to three independent scaling dropdowns per section for workouts with multiple scalable components (e.g. Rx lifts with scaled gymnastics and modified cardio). All scaling levels display as badges on the leaderboard and factor into ranking. Intuitive numbered toggle UI (1/2/3) in the workout builder — clicking a higher number auto-enables all lower levels
- **Multi-track scoring** — assign athletes to Track 1, 2, or 3 per workout section. Tracks display on the leaderboard and sort within scaling level

### Achievements & Motivation

- **Custom achievement system** — define badges across categories (Strength, Gymnastics, Endurance) with tier levels and difficulty ratings (Bronze, Silver, Gold, Platinum). Tier tracks progression within a branch; difficulty reflects how hard the achievement is overall
- **Difficulty filtering** — filter achievements by difficulty level with multi-select metallic-colored chips on both coach and athlete views
- **Bodyweight calculator on achievements** — achievements with bodyweight percentages (e.g. "Bench Press @ 50% Bodyweight") automatically display the target weight in kg based on the athlete's profile weight
- **Award achievements** — recognise athlete milestones with a tap. Athletes see their badges on their profile
- **Self-claim with approval** — athletes can claim achievements they've earned; coaches verify and approve

### Gym Display Mode

- **TV/monitor view** — a dedicated dark-themed display mode designed for gym floor monitors, with oversized fonts and per-section zoom. Show the day's workout on any screen, no login required

### Analysis Dashboard

- **Exercise library** with frequency badges — see which movements are programmed most (and least)
- **Benchmark and lift frequency** — track how often you test standard and custom benchmarks
- **Track statistics** — monitor training track distribution across your programming

### Admin Tools

- **Exercise library management** — add, edit, and organise exercises across 8 categories with equipment, body parts, and difficulty tagging
- **Exercise video links** — attach demonstration and form videos (YouTube or direct) to exercises in the library. Linked videos are automatically surfaced in the workout builder's Movement Demos bar whenever those exercises appear in a workout
- **Programming notes** — markdown-based coaching journal with folder organisation
- **Resource library** — store links to form videos, articles, and equipment guides for quick reference
- **Naming conventions** — define your gym's terminology and abbreviations
- **Booking rules** — configure athlete booking behavior from one panel: 10-card cancellation refund window, auto-lock lead time before class, max bookings per day, max bookings per week, and how far in advance members can book. Leave caps blank for unlimited — no redeploy needed when policy changes
- **Next-week release gate** — program and publish next week's WODs in advance without athletes seeing them yet. Set a release moment (default Sunday 14:00) and athletes only see "this week" until that moment passes — then next week's sessions automatically open for booking. Server-enforced (not just a display filter), so direct API calls can't bypass it either

---

## For Athletes

### Daily Workouts & Logging

- **See today's workout** — published WODs appear automatically, filtered by your class type
- **Detailed logbook** — log every section of every workout: time, reps, weight, rounds, calories, metres, scaling level, and coach-defined scoring fields
- **Day, week, and month views** — browse your training history from any angle
- **Whiteboard photos** — snap a photo of the whiteboard and attach it to your log entry

### Performance Tracking

- **Benchmark tracking** — record and chart your progress across 16 standard CrossFit benchmarks (Fran, Murph, etc.)
- **Custom gym benchmarks** — your gym's signature workouts, tracked the same way
- **Barbell lift records** — track 1RM, 3RM, 5RM, and 10RM across all major lifts
- **Automatic 1RM calculation** — enter any rep/weight combo and get your estimated one-rep max
- **PR detection** — the app automatically highlights when you set a new personal record

### Records & Sharing

- **Personal records gallery** — all your PRs in one place, beautifully displayed with collapse/expand all for quick navigation
- **Social share cards** — generate branded images of your results with your photo, the workout details, and your gym's branding. Perfect for Instagram and WhatsApp
- **Fist bump reactions** — give (and receive) encouragement on any logged result. Tap to give, tap again to see who reacted, long-press to remove. Optimised for mobile with proper popover positioning

### Community & Competition

- **Per-workout leaderboards** — see how you stack up against other athletes, ranked by time, reps, or weight. Selecting a section chip shows the full workout description so you always know exactly what you're scoring
- **Intelligent ranking** — proper tie-breaking, scaling-level separation, and multi-track support (Track 1/2/3 badges)
- **DNF support** — mark an athlete as "Did Not Finish" with a single tap. DNF entries still appear on the leaderboard (so partial efforts are recognised) but always rank below athletes who completed the workout
- **Open Gym (OG) support** — for athletes who came to class but did their own thing (mobility work, pregnancy modifications, off-day cruising). One-click "OG" tag preserves attendance, surfaces their entry on the leaderboard at the very bottom (below DNFs), and skips score input. The OG chip stays out of sight by default — it appears only after the coach taps DNF, keeping the entry screen clean for normal classes
- **Smart grouping** — same-named workouts within 60 days are automatically grouped, showing each athlete's best result across sessions
- **Gender filtering** — toggle between All, Male, and Female views with re-ranked positions

### Workout Timer

- **Built-in 6-mode timer** — For Time, AMRAP, EMOM, Tabata, Intervals, and Hold modes with fullscreen support and voice cues. No need for a separate timer app
- **Custom Intervals mode** — fully editable multi-round work/rest timer. Quick Fill a standard warm-up like "12 rounds of 50s work / 10s rest" in two taps, or build descending-work sessions (Rd 1: 50/10, Rd 2: 40/20, Rd 3: 30/30…) with per-round control. Add/duplicate/delete rounds, live total-duration display
- **Named routines (cross-device)** — save any Intervals configuration with a custom name (e.g. "Warm-up 12×50/10") and reload it on any device you're signed in on. Save, overwrite, or delete from the Presets dropdown

### Notifications

- **Push notifications** — get notified when a new workout is published, when you earn a PR, when someone fist-bumps your result, or when you receive an achievement
- **Granular control** — choose exactly which notification types you want to receive

---

## For Members (Non-Athlete)

### Class Booking

- **Weekly schedule view** — see all available classes with real-time capacity
- **One-tap booking** — book into a class or join the waitlist if it's full
- **Family bookings** — parents can book sessions for their children and spouse from one account
- **Easy cancellation** — cancel with clear status tracking

---

## Subscriptions & Payments

| Plan | Price | What You Get |
|------|-------|--------------|
| **Free Member** | €0 | Class booking |
| **10-Card Pass** | €150 | 10 drop-in sessions |
| **Athlete Monthly (Members)** | €8/mo | Full athlete features (logbook, records, leaderboards, achievements, timer, notifications) |
| **Athlete Yearly (Members)** | €80/yr | Same as monthly — save €16 |
| **Athlete Monthly (Wellpass)** | €10/mo | Full athlete features |
| **Athlete Yearly (Wellpass)** | €100/yr | Same as monthly — save €20 |

- Secure payments via **Stripe**
- 1-month free trial on monthly plans
- Athletes only see the pricing tier matching their membership type (set by coach)
- Self-service billing portal (update card, cancel, view invoices)
- 10-card pass tracking with sessions remaining and expiry date

---

## Technical Highlights

- **Modern web app** — works on any device with a browser (phone, tablet, laptop, gym TV). No app store download required
- **Real-time updates** — workout changes appear instantly for athletes and on gym displays
- **Secure by design** — role-based access control, row-level database security, encrypted payments
- **Fast search** — full-text indexed exercise search across hundreds of movements
- **Offline-ready notifications** — push notifications via service worker, even when the browser is closed

---

## What Makes Forge Unique

1. **Programming intelligence** — no other gym platform tells you when you last programmed a movement or shows you frequency gaps in your training cycle
2. **Built by a coach, not a software company** — Forge wasn't designed in a product meeting by people who've never touched a barbell. It was built by an experienced CrossFit coach who programs workouts every day and knows what's missing from existing tools. The calendar layout, the search workflow, the movement tracking panel, the way sections are structured — every detail reflects years of real coaching experience, not guesswork
3. **Integrated athlete journey** — from booking a class to logging the workout to tracking PRs to sharing results, it's one seamless flow
4. **Gym identity** — custom benchmarks, custom achievements, branded share cards. Forge becomes *your* gym's platform, not a generic tool
5. **Family-friendly** — built-in family accounts with age-gating for kids' classes. Parents manage everything from one login
6. **Affordable** — athlete subscriptions start at €8/month. No per-member fees for the gym. No expensive enterprise contracts

---

*Forge Functional Fitness — where programming meets performance.*
