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
- **Publish control** — choose exactly which sections athletes can see (keep surprise WODs hidden until class time). The publish modal is draggable and non-blocking, so you can edit the workout and publish settings side by side. A **Notify athletes** toggle decides whether the publish fires a push — defaults OFF on every publish, so publishing never spams athletes by accident. Tick it explicitly when you want the class pinged about a new or changed workout
- **Coach notes** — attach workout intent and stimulus notes so athletes understand the "why" behind the programming
- **Movement demos** — video clips are automatically detected from exercises in your workout sections and displayed in a collapsible bar. Coaches can also manually attach any YouTube or direct video link. One-click playback in a draggable, resizable player
- **Google Calendar sync** — optionally publish workouts to a public Google Calendar for members who prefer that view
- **Safe section removal** — if a coach removes a section from a workout that already has scores recorded against it, the save flow surfaces a destructive confirm ("Saving will delete N scores from M athletes…") before any data is touched. Cancel keeps everything as-is; confirm deletes the orphaned score rows and saves cleanly. Drafting a brand-new workout is unaffected — the prompt only fires when real athlete data would be lost

### Smart Search & Movement Intelligence

- **Full-text search** across all workouts — find every time you've programmed a specific movement, workout name, or note
- **Curated acronym system** — every exercise, lift, benchmark, and Forge benchmark can carry a short code (e.g. `DPU` for Push-up Diamond, `HSPUK` for Handstand Push-Up Kipping, `SDL` for Sumo Deadlift, `FRAN` for Fran). Acronyms appear as small teal pills next to names in the Library popup (all four tabs), the Custom Movements dropdown, and the Movement Tracking panel column headers. Coaches set them once in the edit modal of any of the four catalogues (auto-uppercase, max 6 chars, uniqueness enforced at the DB level) and the same code becomes searchable everywhere — type `DPU` in the Workouts search bar to surface every WOD that has ever programmed Push-up Diamond, regardless of how the section text was written. No content rewrites needed: the search expands the acronym to its canonical name at query time, so historical workouts are matched the same way as new ones
- **Linked lifts → no acronym drift** — when the same movement appears in both the Lifts catalogue (e.g. Snatch) and the Exercises library (Barbell Snatch), the Lifts entry can be linked to its canonical exercise. The acronym then inherits automatically — no risk of giving the same movement two different codes. The link is set in the Lift edit modal via a dropdown filtered to the Olympic Lifting & Barbell Movements category
- **Movement frequency tracking** — see how often you've programmed each exercise, with date-range filtering. Never accidentally neglect a movement pattern again
- **Custom movement tracking panel** — pin the exercises you want to monitor and see at a glance when each was last programmed. Color-coded date aging (green/yellow/orange/red) highlights neglected movements instantly. **Hover an exercise in the list and its whole column lights up in the grid** (and scrolls into view if off-screen) — so you can find it instantly without counting across the acronym headers. Fully responsive on mobile with a dedicated toggle
- **Exercise groups** — save named presets of tracked exercises (e.g., "Barbell Strength", "Oly Lifts") and toggle entire groups on or off with one click. Group exercises appear nested under their chip for a clean overview
- **Workout deduplication** — search results intelligently group repeated workouts so you see unique programming, not duplicates
- **Filter by track, type, section, or athlete** — slice your programming data any way you need. Active filter sections are highlighted in teal with a count, so it's obvious at a glance what's still applied when you reopen the page. Your **Athletes** and **Session Types** selections are remembered between visits (and across logout) so you don't have to re-pick them every time
- **Session Type groups** — save named bundles of session types (e.g., "Adults", "Kids") and switch your whole view to one group with a single click — click it again to clear. Set up once, then flip between "show me only the adult classes" and "show me only the kids classes" instantly. Rename, edit, or delete groups any time; they sync across all your devices
- **"Not done by selected" filter** — select a group of athletes, then flip one chip to show only the workouts that *none* of them has ever attended. Perfect for picking a benchmark or session that's brand-new to a whole group (a small-group class, a make-up session, a fair head-to-head) without anyone having a prior-attempt advantage. Stacks with the search box and the other filters, so you can narrow it to e.g. only adult WODs none of the group has done

### Member & Class Management

- **Self-registration with approval** — members sign up themselves; you approve, block, or manage their access. **Only approved members appear in the Athletes list** — pending sign-ups (including spam/bot registrations awaiting your decision) stay out of it until you approve them. Pending registrations that turn out to be spam, duplicates, or mistakes can be rejected with one click — the member record, athlete profile, and email/auth account are all fully removed so nothing lingers as a "ghost" athlete and the person can re-register from scratch
- **At-risk alerts** — automatically flag members with declining attendance over a configurable window (last 7 days / 30 days / **2 months** / 12 months / all time). Parked members (below) are excluded so the list stays focused on people you'd actually chase
- **Park inactive members** — a dedicated **Parked** tab lets you tuck away members who rarely attend (e.g. an out-of-town friend who drops in once a year) so they stop cluttering the Active, At-Risk, Subscriptions, and 10-Card lists and their count badges. One click **Park** from the Active tab, one click **Restart** to bring them back exactly as they were. Parking only hides — their booking and login access is untouched, so a parked member can still drop in any time without you un-parking them first
- **Birthday reminders** — a banner on the coach dashboard lists every athlete (and kid) with a birthday in the next 7 days — today's highlighted, with the age they're turning — so nobody's birthday slips by. Auto-hides when there's nothing coming up
- **Class scheduling** — define recurring session templates with day, time, type, and capacity. Generate weekly sessions automatically
- **Booking management** — see who's booked, waitlisted, or no-showed. Add members manually or let them self-book
- **Hide a session from athletes** — a one-click **Hide** toggle in the Session Management modal makes any session non-bookable and invisible in the athlete app while keeping it on your coach calendar (marked with a "Hidden" badge). Handy for interim copies — when you stage a workout on a temporary day/time to tweak it before moving it to its real slot, hide it so athletes never see the work-in-progress. Click again to make it live. **Pasting a workout into an empty calendar slot now creates it Hidden by default** — the interim copy is never mistaken for a bookable class until you deliberately make it live (pasting onto an existing session still publishes as before)
- **Waitlist promotion done right** — when a confirmed booking is cancelled or flagged as Open Gym, the longest-waiting waitlister is automatically promoted to confirmed and pinged via push. If a no-show frees a slot mid-class, the coach can manually promote any waitlister with one tap from the Session Management modal — no need to bump capacity. 10-card debit and parent-card cascade run automatically on every promotion path
- **Waitlist actions — Open Gym & Remove** — straight from the waitlist a coach can mark an athlete **Open Gym**: they join the class off-capacity (they don't count toward the class max and don't bump anyone), perfect for someone training independently in a full session. A **Remove** button also lets the coach drop a waitlisted athlete outright (refunds their 10-card if applicable) without having to promote them first
- **Trial-athlete tracking** — pre-known trial athletes (people coming to try a class but not yet registered) get added by name from the same Add Member dropdown. They count toward class capacity, appear in Score Entry as "Anna (trial)" so their score gets recorded against the workout, and show up in an Admin Tools panel that surfaces "how many trial sessions and unique athletes onboarded in any date range." When they later register, the coach opens that past session and clicks the link icon on the trial chip → picks the member from a dropdown → a confirmed booking is created on the spot. The booking shows an amber "Trial" badge; the original trial chip stays in place with a green "linked" badge. Best of both worlds — the trial appears in the athlete's workout history (calendar filter, Movement Tracking, sidebar attendance count) AND the trial record is preserved as a permanent onboarding metric. **The link does NOT debit the 10-card** — trials are paid in cash separately
- **Drop-in tracking** — one-time visitors (people paying cash for a single class, no app account) get added by name from the same Add Member dropdown via "+ Drop-in". They take a real spot in the class (count toward capacity and the calendar's Booked count) and appear in Score Entry as "Anna (drop-in)" so their result is recorded against the workout. An **Admin Tools → Drop-ins panel** tallies every drop-in across any date range — set it to the year for a clean "how many drop-ins did we have this year" number, with per-name visit counts and dates. Unlike trials, drop-ins are pure walk-in tracking — no login, no 10-card, no membership record needed
- **Family accounts** — link spouses and children under one primary account. Parents can book for the whole family. Family-shared 10-cards are supported: a single 10-card on the parent's account can cover multiple children's bookings — every kid's session debits the parent's card, with the same grace-period refund rules. Each child can also have their own card if preferred — configurable per-child in Members
- **Guardian Only accounts** — parents who don't train themselves but register so they can manage their kids' bookings. Marked with a single toggle on the Members card. Filtered out of the Athletes tab and the at-risk panel; cannot book sessions for themselves (their family-member kids book normally)
- **Multi-membership disambiguation** — for members who hold more than one membership type (e.g., a parent with Wellpass for themselves AND a 10-card for their kids), the Members card shows a "Pay with:" selector so the booking flow knows which method debits on the parent's own bookings. The other membership types remain available for family debits
- **10-card chip — actual usage at a glance** — the chip on each Members card shows `past+upcoming/10` (e.g. `5+2/10` = 5 sessions already used + 2 future bookings reserved). Click the chip to open the card details: a per-date list shows every booking that's debited the card, split into Consumed and Upcoming, with date, time, status (attended / no-show / late-cancel) and the booker's name for family-shared cards. **Counter is database-maintained** — every booking carries its own "did this eat a card session" flag, and a database trigger keeps the displayed total in sync automatically on every booking create/update/delete (including direct row deletions). Drift between the displayed total and actual usage is mathematically impossible once a holder has their card start date set. **Self-healing Recalc** — if an athlete booked classes before their 10-card was registered (the typical "book first, pay second" workflow), clicking Recalc on the card auto-backfills the consumed flag on every in-window booking, no manual SQL needed
- **10-Card tab — running low at a glance** — a dedicated tab on the Members page lists every 10-card holder with one or zero sessions remaining (including overage, e.g. `11/10`). Overage members sort to the top so the coach can act before the next booking. Badge on the tab shows the current count so it's visible from anywhere in Members. Designed as a proactive view — pair it with the soft-limit booking behavior so athletes are never hard-blocked but coaches always know who's due for a renewal conversation
- **Wellpass tab — minimum check-ins enforced automatically** — Wellpass requires a minimum number of weekly check-ins (3 for single-person passes, 6 for spouse-shared passes) to maintain the gym's reimbursement. Coaches drag the weekly Wellpass spreadsheet into the new Wellpass tab and the app imports every week's check-in counts, auto-links household names to registered athletes, and surfaces under-attending households at the top of the list. **Three-gate enforcement system** — a household is automatically capped at 1 booking per household per week only when the pattern actually warrants it: (1) **recent dormancy** — last 4 weeks of check-ins below the household minimum; (2) **annual pace** — last 12 weeks falling behind the year's target; (3) **shared-pass ratio** — for spouse-shared households, sign-ins must average ≥ 1.5× actual attendances over the last quarter, otherwise the deal isn't being honoured. A consistent user who has one bad week (sick, holiday) is **never** punished — they have built-up credit and the math forgives one off week. Hover the block badge to see exactly which rule tripped. **YTD % and All-time % score columns** show every household's progress against their target as a coloured percentage (green ≥100%, amber 80–99%, red <80%) so the coach can spot drift weeks before any blocking happens. Shared households also get a small "1.5×" ratio chip next to the name — green when the deal is being held up, amber when it's slipping. **Unblock all (N) button** — when blocks are in place, a one-click header button clears them all with a confirmation dialog (useful for holiday weeks or gym closures; rebuilds on the next sync if the underlying pattern hasn't changed). Per-household override mode: `auto` (paying-app subscribers are exempt), `always exempt`, or `always enforce`. Per-member manual block/unblock on every tracked row — coach has the final word at any time. **Missing athletes auto-block too:** if a tracked athlete stops appearing in the Excel entirely, the import treats it as zero check-ins for that week — they don't slip through by going dark. **Pause tracking when an athlete is injured or away** — one-click Pause/Resume per household with a reason field; paused rows render faded with a "paused" badge, the Excel sync skips them on every import, and the 1-booking-per-week cap is lifted. The name-linker handles German export quirks (last-name-first vs first-name-last) automatically. Sort the list by urgency, app-payer status, or alphabetically. The Excel sync rebuilds the whole picture each Sunday — no double bookkeeping, the app becomes the master view over time
- **Two-tier booking release — Sunday rush, spread out** — instead of every athlete refreshing the booking page at the same minute, the system opens next week's slots in two waves: **priority tier** (members, paid app subscribers, and Wellpass households meeting their check-in quota) opens at the configured release time, and **Wellpass-restricted households** (under-attending the prior week) open later by a configurable offset. Both the release time and the restricted-tier offset live on the Admin Booking Rules tab — no SQL, no developer needed. Athletes opening the app within the visibility window (release day from 12:00 onwards) see a teal countdown banner — *"Bookings for next week open in 1h 12m"* — instead of the generic "no sessions available" message. Banner refreshes every minute and disappears the moment release fires. The release gate is enforced server-side too, so manual replays of the booking endpoint can't beat it
- **Booking is a soft-limit, not a hard-block** — athletes can keep booking even if their 10-card is full; the counter goes over (e.g. `11/10`) and the chip lights red. The coach sees the overage in the new 10-Card tab and decides how to handle it. Avoids the frustration of an athlete being unable to book the kids' class when the card needs a renewal conversation, not a system veto
- **Membership types & class categories** — assign members to specific class types (Group, Personal Training, Kids, Foundations)

### Athlete Insights (Coach View)

- **Individual athlete profiles** — view any athlete's benchmark history, lift PRs, logbook entries, and payment status from one screen
- **Log results on their behalf** — coaches can record benchmarks, lifts, and workout results for athletes directly
- **Score entry modal** — quick overlay modal on the coach calendar to enter scores for all booked athletes at once, with per-athlete scaling and track selection. Press Enter to jump to the same field on the next athlete for fast column entry. Athletes are listed girls first then boys (alphabetical within each group), matching how most coaches write the whiteboard. When two athletes in the same class share a first name (e.g. Michael Maier + Michael Weber), the row label automatically switches to `Michael M.` / `Michael W.` so the surname initial is always visible — no more guessing which Michael you're scoring
- **Automatic lift record sync** — when a workout section includes a rep-max test (1RM, 3RM, 5RM, or 10RM), the score entry modal automatically shows a weight input. Coach enters the weight, and the athlete's lift records, progress charts, and calculated 1RM are updated instantly — no athlete input needed. PR detection and push notifications fire automatically
- **Lift filter chips** — on an athlete's Lifts tab, small acronym chips (DL, BP, …) above the list let you filter their rep-max history to a single movement with one tap. Handy when an athlete has logged many lifts and you want just their Deadlift or Bench Press progression. Tap "All" to clear; hover a chip to see the full lift name
- **Up to 3 scaling levels** — enable up to three independent scaling dropdowns per section for workouts with multiple scalable components (e.g. Rx lifts with scaled gymnastics and modified cardio). All scaling levels display as badges on the leaderboard and factor into ranking. Intuitive numbered toggle UI (1/2/3) in the workout builder — clicking a higher number auto-enables all lower levels
- **Multi-track scoring** — assign athletes to Track 1, 2, or 3 per workout section. Tracks display on the leaderboard and rank above scaling: a Track 1 (full-prescription) athlete on Sc1 ranks above a Track 2 (lighter / shorter) athlete on Rx, because the two tracks are effectively different workouts

### Achievements & Motivation

- **Custom achievement system** — define badges across categories (Strength, Gymnastics, Endurance) with tier levels and difficulty ratings (Bronze, Silver, Gold, Platinum). Tier tracks progression within a branch; difficulty reflects how hard the achievement is overall
- **Difficulty filtering** — filter achievements by difficulty level with multi-select metallic-colored chips on both coach and athlete views
- **Bodyweight calculator on achievements** — achievements with bodyweight percentages (e.g. "Bench Press @ 50% Bodyweight") automatically display the target weight in kg based on the athlete's profile weight
- **Award achievements** — recognise athlete milestones with a tap. Athletes see their badges on their profile
- **Self-claim with approval** — athletes can claim achievements they've earned; coaches verify and approve
- **"Prior skill" claim** — athletes who could already do a movement before joining (e.g. arrive able to do a strict pull-up) can claim a badge as a prior skill with no specific date; it shows a "Prior" tag instead of an achieved date. Lower tiers are also claimable when a higher one is already earned, so a skipped/assisted entry tier never shows a misleading lock — while forward progression stays gated (you still can't jump ahead more than one tier)

### Gym Display Mode

- **TV/monitor view** — a dedicated dark-themed display mode designed for gym floor monitors, with oversized fonts and per-section zoom. Show the day's workout on any screen, no login required

### Analysis Dashboard

- **Exercise library** with frequency badges — see which movements are programmed most (and least)
- **Benchmark and lift frequency** — track how often you test standard and custom benchmarks
- **Track statistics** — monitor training track distribution across your programming
- **Planner** — group exercises into movement patterns (Push-up, Squat, Posterior Chain, etc.) and see at a glance which patterns are covered each week, which are stale, and which are overdue. **Switch the grid between 1mo / 3mo / 6mo / 12mo views** and scroll back/forward week-by-week (the **Today** button re-centres on the current week; the chosen view is remembered across page loads). **Click any pattern's name** in the grid to expand its exercise chip-list inline, with the same date-coloured staleness indicators as the upper Movement Patterns section — no scrolling needed. **Toggle "RM Testing only"** at the top of the planner to switch into a dedicated rep-max view: the grid drops every group except your strength-testing group (the one named with rep-max notation, e.g. "Barbell Strength Testing 1,3,5 & 10RM") and shows **one row per movement** in it (Back Squat, Deadlift, Bench Press…). A dot lights up for a movement only on weeks it was actually tested at a 1RM/3RM/5RM/10RM — a normal Back Squat workout no longer counts. Click a dot to see the exact date(s) and rep-max type. Movements you haven't tested yet still show as empty rows, so gaps are obvious. **Drag to re-order** — grab the grip handle on the left of any row: in normal view this re-orders your pattern groups, and in RM Testing view it re-orders the movements within the strength group. The order is saved. Back in normal view, **click any pattern's name** to expand its exercise chip-list inline. Adults / Kids & Teens toggle scopes coverage to the relevant sessions. Pattern thresholds for "warning" and "overdue" are configurable per pattern. A built-in **How it works** info popup documents every colour, dot, threshold, and behaviour so the tool is easy to pick up after time away
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
- **"Modified movement" flag** — sometimes an athlete has to adapt a movement to physically perform it (e.g. raising the heels on plates for a squat or wall-ball) — not a scaling choice, just a mobility accommodation. The coach taps a small red **`!`** next to the athlete in Score Entry (with an optional short note like "heels on plates"), and it shows as a red `!` beside that athlete's result everywhere the leaderboard appears, with the note in a tooltip. It **never affects the score or ranking** — it simply keeps things fair and transparent so a full-range effort isn't quietly out-ranked by an adapted one. The full detail lives on the whiteboard photo the coach already logs
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
- **Birthday surprise** — when an athlete logs in on their birthday they're greeted with a personalised celebration (confetti and a message from the gym). It appears whether they open the full athlete app or just the booking page, and because it runs across the whole family, a parent logging in on their child's birthday gets the greeting too — kids don't need their own login

---

## Subscriptions & Payments

| Plan | Price | What You Get |
|------|-------|--------------|
| **Free Member** | €0 | Class booking |
| **10-Card Pass** | €150 | 10 drop-in sessions |
| **Kids 10-Card Pass** | €85 | 10 drop-in sessions (kids price) |
| **Athlete Monthly (Members)** | €8/mo | Full athlete features (logbook, records, leaderboards, achievements, timer, notifications) |
| **Athlete Yearly (Members)** | €80/yr | Same as monthly — save €16 |
| **Athlete Monthly (Wellpass)** | €10/mo | Full athlete features |
| **Athlete Yearly (Wellpass)** | €100/yr | Same as monthly — save €20 |

- Secure payments via **Stripe**
- 1-month free trial on monthly plans
- Athletes only see the pricing tier matching their membership type (set by coach)
- Self-service billing portal (update card, cancel, view invoices)
- 10-card pass tracking with sessions remaining and expiry date
- **Coach-managed activation paths** — coaches can also activate athlete-app access manually for cash-paying members (30-day, 1-year, or permanent). Two surfaces, fully consistent: from inside the member modal click **Activate 1 Month** or **Activate 1 Year** (always available, works for both first-time setup and renewals); from the dashboard's **Subscriptions Due banner** click **Renew 1 Month** or **Renew 1 Year** when an athlete is in the 7-day expiry window. Both surfaces archive the outgoing subscription before activating, so the **Subscription History panel** on the member modal shows every paid month as a separate row — perfect record of cash-monthly athletes who pay 12+ times a year. Each history row supports inline notes (Edit / Add note) and a red Delete X for accidental clicks. Members tab shows "Active — Cash Monthly (Xd left)" / "Active (1yr)" / "Active (∞)" depending on the path used. Push reminder fires 14 days before any time-bound plan expires; the banner color-codes red ≤3d / amber 4–7d and auto-hides when nothing is due
- **Dismiss verified athletes from the banner per row** — once you've eyeballed a lapsed athlete (talked to them, taken cash, or made the bookkeeping call to ignore), click the small X on their banner row to silence them. The dismissal persists until they renew + lapse again later — at which point the row reappears automatically. No "Show dismissed" list to manage and no separate undo button: the system tracks the lapse-end-date the dismissal was against, and any new lapse with a later end-date re-surfaces them
- **Friendly grace period for cash athletes** — a cash-paying athlete who forgets to pay isn't cut off the instant their month runs out. They get a **4-day grace window** of continued full access, and a gentle in-app reminder banner — *"Your membership is due, please pay to keep your access — X days left"* — appears across the athlete app and the booking page, starting 2 days before their renewal date and through the grace days. The banner is dismissable (per day) and only shows for cash members: athletes on auto-renewing card subscriptions never see it, since their payment is automatic. After the grace days pass, access lapses as before

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
