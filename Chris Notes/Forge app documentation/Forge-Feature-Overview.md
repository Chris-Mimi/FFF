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
- **Publish control** — choose exactly which sections athletes can see (keep surprise WODs hidden until class time). The publish modal is draggable and non-blocking, so you can edit the workout and publish settings side by side. A **Notify athletes** toggle decides whether the publish fires a push — defaults ON for the first publish and OFF on every re-publish, so you can iterate on the workout without spamming athletes. Tick it explicitly when a substantive change warrants re-pinging the class
- **Coach notes** — attach workout intent and stimulus notes so athletes understand the "why" behind the programming
- **Movement demos** — video clips are automatically detected from exercises in your workout sections and displayed in a collapsible bar. Coaches can also manually attach any YouTube or direct video link. One-click playback in a draggable, resizable player
- **Google Calendar sync** — optionally publish workouts to a public Google Calendar for members who prefer that view
- **Safe section removal** — if a coach removes a section from a workout that already has scores recorded against it, the save flow surfaces a destructive confirm ("Saving will delete N scores from M athletes…") before any data is touched. Cancel keeps everything as-is; confirm deletes the orphaned score rows and saves cleanly. Drafting a brand-new workout is unaffected — the prompt only fires when real athlete data would be lost

### Smart Search & Movement Intelligence

- **Full-text search** across all workouts — find every time you've programmed a specific movement, workout name, or note
- **Curated acronym system** — every exercise, lift, benchmark, and Forge benchmark can carry a short code (e.g. `DPU` for Push-up Diamond, `HSPUK` for Handstand Push-Up Kipping, `SDL` for Sumo Deadlift, `FRAN` for Fran). Acronyms appear as small teal pills next to names in the Library popup (all four tabs), the Custom Movements dropdown, and the Movement Tracking panel column headers. Coaches set them once in the edit modal of any of the four catalogues (auto-uppercase, max 6 chars, uniqueness enforced at the DB level) and the same code becomes searchable everywhere — type `DPU` in the Workouts search bar to surface every WOD that has ever programmed Push-up Diamond, regardless of how the section text was written. No content rewrites needed: the search expands the acronym to its canonical name at query time, so historical workouts are matched the same way as new ones
- **Linked lifts → no acronym drift** — when the same movement appears in both the Lifts catalogue (e.g. Snatch) and the Exercises library (Barbell Snatch), the Lifts entry can be linked to its canonical exercise. The acronym then inherits automatically — no risk of giving the same movement two different codes. The link is set in the Lift edit modal via a dropdown filtered to the Olympic Lifting & Barbell Movements category
- **Movement frequency tracking** — see how often you've programmed each exercise, with date-range filtering. Never accidentally neglect a movement pattern again
- **Custom movement tracking panel** — pin the exercises you want to monitor and see at a glance when each was last programmed. Color-coded date aging (green/yellow/orange/red) highlights neglected movements instantly. Fully responsive on mobile with a dedicated toggle
- **Exercise groups** — save named presets of tracked exercises (e.g., "Barbell Strength", "Oly Lifts") and toggle entire groups on or off with one click. Group exercises appear nested under their chip for a clean overview
- **Workout deduplication** — search results intelligently group repeated workouts so you see unique programming, not duplicates
- **Filter by track, type, section, or athlete** — slice your programming data any way you need

### Member & Class Management

- **Self-registration with approval** — members sign up themselves; you approve, block, or manage their access. Pending registrations that turn out to be spam, duplicates, or mistakes can be rejected with one click — the account and email are fully removed so the person can re-register from scratch
- **At-risk alerts** — automatically flag members with declining attendance (configurable timeframe)
- **Class scheduling** — define recurring session templates with day, time, type, and capacity. Generate weekly sessions automatically
- **Booking management** — see who's booked, waitlisted, or no-showed. Add members manually or let them self-book
- **Trial-athlete tracking** — pre-known trial athletes (people coming to try a class but not yet registered) get added by name from the same Add Member dropdown. They count toward class capacity, appear in Score Entry as "Anna (trial)" so their score gets recorded against the workout, and show up in an Admin Tools panel that surfaces "how many trial sessions and unique athletes onboarded in any date range." When they later register and get their whiteboard name set, their trial sessions auto-convert to confirmed bookings — but stay in the Trial Athletes panel as a permanent onboarding record so the metric never erodes
- **Family accounts** — link spouses and children under one primary account. Parents can book for the whole family. Family-shared 10-cards are supported: a single 10-card on the parent's account can cover multiple children's bookings — every kid's session debits the parent's card, with the same grace-period refund rules. Each child can also have their own card if preferred — configurable per-child in Members
- **Guardian Only accounts** — parents who don't train themselves but register so they can manage their kids' bookings. Marked with a single toggle on the Members card. Filtered out of the Athletes tab and the at-risk panel; cannot book sessions for themselves (their family-member kids book normally)
- **Multi-membership disambiguation** — for members who hold more than one membership type (e.g., a parent with Wellpass for themselves AND a 10-card for their kids), the Members card shows a "Pay with:" selector so the booking flow knows which method debits on the parent's own bookings. The other membership types remain available for family debits
- **10-card chip — actual usage at a glance** — the chip on each Members card shows `past+upcoming/10` (e.g. `5+2/10` = 5 sessions already used + 2 future bookings reserved). Click the chip to open the card details: a per-date list shows every booking that's debited the card, split into Consumed and Upcoming, with date, time, status (attended / no-show / late-cancel) and the booker's name for family-shared cards. If the counter has been manually overridden and no longer matches actual bookings (e.g. for athletes who had a card from before the app was in use), an amber **⚠** glyph appears with a tooltip explaining the mismatch — coach can leave it as an intentional override or hit Recalc in the modal to sync to actual bookings
- **10-Card tab — running low at a glance** — a dedicated tab on the Members page lists every 10-card holder with one or zero sessions remaining (including overage, e.g. `11/10`). Overage members sort to the top so the coach can act before the next booking. Badge on the tab shows the current count so it's visible from anywhere in Members. Designed as a proactive view — pair it with the soft-limit booking behavior so athletes are never hard-blocked but coaches always know who's due for a renewal conversation
- **Booking is a soft-limit, not a hard-block** — athletes can keep booking even if their 10-card is full; the counter goes over (e.g. `11/10`) and the chip lights red. The coach sees the overage in the new 10-Card tab and decides how to handle it. Avoids the frustration of an athlete being unable to book the kids' class when the card needs a renewal conversation, not a system veto
- **Membership types & class categories** — assign members to specific class types (Group, Personal Training, Kids, Foundations)

### Athlete Insights (Coach View)

- **Individual athlete profiles** — view any athlete's benchmark history, lift PRs, logbook entries, and payment status from one screen
- **Log results on their behalf** — coaches can record benchmarks, lifts, and workout results for athletes directly
- **Score entry modal** — quick overlay modal on the coach calendar to enter scores for all booked athletes at once, with per-athlete scaling and track selection. Press Enter to jump to the same field on the next athlete for fast column entry. Athletes are listed girls first then boys (alphabetical within each group), matching how most coaches write the whiteboard. When two athletes in the same class share a first name (e.g. Michael Maier + Michael Weber), the row label automatically switches to `Michael M.` / `Michael W.` so the surname initial is always visible — no more guessing which Michael you're scoring
- **Automatic lift record sync** — when a workout section includes a rep-max test (1RM, 3RM, 5RM, or 10RM), the score entry modal automatically shows a weight input. Coach enters the weight, and the athlete's lift records, progress charts, and calculated 1RM are updated instantly — no athlete input needed. PR detection and push notifications fire automatically
- **Up to 3 scaling levels** — enable up to three independent scaling dropdowns per section for workouts with multiple scalable components (e.g. Rx lifts with scaled gymnastics and modified cardio). All scaling levels display as badges on the leaderboard and factor into ranking. Intuitive numbered toggle UI (1/2/3) in the workout builder — clicking a higher number auto-enables all lower levels
- **Multi-track scoring** — assign athletes to Track 1, 2, or 3 per workout section. Tracks display on the leaderboard and rank above scaling: a Track 1 (full-prescription) athlete on Sc1 ranks above a Track 2 (lighter / shorter) athlete on Rx, because the two tracks are effectively different workouts

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
- **Planner** — group exercises into movement patterns (Push-up, Squat, Posterior Chain, etc.) and see at a glance which patterns are covered each week, which are stale, and which are overdue. **Switch the grid between 1mo / 3mo / 6mo / 12mo views** and scroll back/forward week-by-week (the **Today** button re-centres on the current week; the chosen view is remembered across page loads). **Click any pattern's name** in the grid to expand its exercise chip-list inline, with the same date-coloured staleness indicators as the upper Movement Patterns section — no scrolling needed. **Toggle "RM Testing only"** at the top of the planner to filter the grid to just rep-max test weeks: dots only light up where a 1RM/3RM/5RM/10RM was actually tested, and clicked-week chips show an amber pill with the rep-max type next to each tested movement (e.g. "Sumo Deadlift · 10RM"). Useful for spotting testing cycles at a glance and planning the next strength block. Click past-week dots to see the exact exercises and dates programmed. Adults / Kids & Teens toggle scopes coverage to the relevant sessions. Pattern thresholds for "warning" and "overdue" are configurable per pattern. A built-in **How it works** info popup documents every colour, dot, threshold, and behaviour so the tool is easy to pick up after time away
- **Benchmarks / Forge Benchmarks count toward coverage** — every Benchmark and Forge Benchmark is linked to the library exercises it actually trains (e.g. *Concept 2 Rower: 1km* → C2 Rower; *Fran* → Barbell Thruster + Pull-Up Kipping). Drop a benchmark into a section and the planner registers all of those exercises automatically — no need to also type the movement names into the section description. Linked exercises are required when creating or editing a benchmark, and Forge auto-suggests them from the description so the link almost always pre-fills correctly
- **Uncategorised exercises panel** — a triage queue showing every exercise that isn't yet in any pattern. Click **Move to →** on any row to drop it into a pattern in one click. The list shrinks as you assign — the goal is to empty it

### Admin Tools

- **Exercise library management** — add, edit, and organise exercises across 8 categories with equipment, body parts, and difficulty tagging
- **Exercise video links** — attach demonstration and form videos (YouTube or direct) to exercises in the library. Linked videos are automatically surfaced in the workout builder's Movement Demos bar whenever those exercises appear in a workout
- **Programming notes** — markdown-based coaching journal with folder organisation
- **Resource library** — store links to form videos, articles, and equipment guides for quick reference
- **Naming conventions** — define your gym's terminology and abbreviations
- **Booking rules** — configure athlete booking behavior from one panel: 10-card cancellation refund window, auto-lock lead time before class, max bookings per day, max bookings per week, and how far in advance members can book. Leave caps blank for unlimited — no redeploy needed when policy changes
- **Next-week release gate** — program and publish next week's WODs in advance without athletes seeing them yet. Set a release moment (default Sunday 14:00) and athletes only see "this week" until that moment passes — then next week's sessions automatically open for booking. Server-enforced (not just a display filter), so direct API calls can't bypass it either
- **Gym memberships tracking** — record gym membership contracts (full-year upfront, 1-year monthly, or 6-month monthly) with start date, end date auto-computed, and notes. The Memberships tab in Admin lists active contracts sorted by days-to-renewal, color-coded amber under 30 days and red under 14 days. Edit, cancel, or delete from the same tab. A separate "Memberships Due" banner on the coach dashboard surfaces any contract within 30 days of expiry — both that banner and the Subscriptions Due banner are now collapsible and remember your choice. Daily auto-expiry job flips contracts past their end date to expired automatically

---

## For Athletes

### Daily Workouts & Logging

- **See today's workout** — published WODs appear automatically, filtered by your class type
- **Detailed logbook** — log every section of every workout: time, reps, weight, rounds, calories, metres, scaling level, and coach-defined scoring fields
- **Day, week, and month views** — browse your training history from any angle
- **Whiteboard photos** — snap a photo of the whiteboard and attach it to your log entry
- **Personal activity log** — alongside the Forge logbook, athletes can record their own workouts on a Personal toggle: swims, runs, hikes, holiday gym sessions, external CrossFit drop-ins, etc. Quick-add a date, activity type, optional duration, distance, effort (1–5), and free-text notes. Pick from a curated preset list or add your own custom activities (Klettern, Tennis, anything you do) — your custom names save to your personal dropdown for next time, with one-tap delete to remove typos. Use the app as your full personal training tracker, not just for class days

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
- **Open Gym (OG) support** — for athletes attending a class but not doing the WOD (returning from injury, rehab, pregnancy, off-day cruising). The coach flags any confirmed booking as OG via a one-click toggle inside the Session Management modal. OG athletes don't count toward class capacity (they're alongside the class, not part of it), get a separate "1 OG" chip beneath the booked count on the calendar card, and are excluded from Score Entry so the entry grid stays clean. If an OG athlete changes their mind and does the WOD, the coach toggles OG off and they reappear in Score Entry as normal
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
- **Booking-window countdown** — every class card shows how long is left to book — "Closes in 1d 4h" / "3h 12m" / "14m". Turns amber under 2 hours and red under 30 minutes so you don't miss the cutoff
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
- **Coach-managed activation paths** — coaches can also activate athlete-app access manually for cash-paying members (30-day, 1-year, or permanent). Members tab shows "Active — Cash Monthly (Xd left)" / "Active (1yr)" / "Active (∞)" depending on the path used; Athletes tab also surfaces these as coach-managed access cards even though no Stripe subscription is on file. Push reminder fires 14 days before any time-bound plan expires (both athlete + coach), and a **Subscriptions Due banner** at the top of the Coach dashboard lists every athlete with a renewal due in the next 7 days — color-coded red ≤3d / amber 4–7d, with one-click Renew 1 Month / Renew 1 Year buttons for cash payers and Auto-renew badges for Stripe payers. Auto-hides when nothing is due

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
