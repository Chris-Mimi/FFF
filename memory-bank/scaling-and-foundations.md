# Scaling & Foundations Playbook

> Written 2026-05-13, S349. The reference doc for "is the app going to keep working as data grows?" — both for Chris (so he doesn't have to keep this in his head) and for Claude (so future sessions don't re-discover the same patterns).
>
> **If you're Chris:** read the plain-English sections, skip the code references.
> **If you're Claude:** read this when any scaling-class question comes up, when reviewing a hook that reads from a growing table, or when designing a new feature that aggregates data.

---

## The big-picture analogy (read this first)

The database is a **kitchen**. The browser is a **dining room**. The internet between them is the **swing door**.

**The wrong way (fat client):** Browser asks the kitchen "send me every ingredient in the pantry." Kitchen wheels 2,000 jars through the swing door. You spread them on the dining table and count them yourself. Works fine at 100 jars. Breaks silently at 1,000 (the swing door has a 1,000-jar cap and you didn't notice). Falls over completely at 10,000.

**The right way (server aggregation):** Browser asks "how many of each ingredient do you have?" Kitchen counts internally (it's a kitchen — it's built for this) and sends back a one-page summary. Works the same at 100, 1,000, 1,000,000.

The phrase "**move aggregations to SQL**" means switching from the first style to the second. The kitchen does the counting. The dining room gets the answer.

For Chris: this almost never changes your workflow. You'll occasionally paste a SQL migration into Supabase SQL Editor (something you already do). The TypeScript code I write changes from `supabase.from(...).select(...)` to `supabase.rpc('view_name', { args })`. Everything else is plumbing.

---

## What we know now (S349 snapshot)

### The 1,000-row cap (PostgREST default)
- Supabase's API layer (PostgREST) caps a single response at 1,000 rows by default.
- The cap is **silent** — no error, no warning. You get the first 1,000 by insertion order; the rest are invisible.
- This is the bug class that broke the 10-card chip on the Members page (S349). Two more queries were almost certainly already truncating without producing a visible symptom (Movement Tracking, search-panel badges).
- **Status:** Six hooks/pages audited and fixed in S349. The hard rule lives in `claude-rules.md`. Future Claude sessions will check this before writing or reviewing queries against growing tables.

### The 500-search cap (intentional limit, separate from the above)
- The coach workout-search hook ([hooks/coach/useCoachData.ts:searchWODs](hooks/coach/useCoachData.ts)) has a deliberate `.limit(...)` on results.
- **Was 500, bumped to 2,000 at S349** to buy ~18 months of headroom at current data growth.
- A tripwire `console.warn` fires when 90%+ of the limit is hit, so we'll see it in dev logs before users notice.
- Symptom when it eventually bites: older WODs become invisible to unfiltered "show me all" searches. **Not** a silent-wrong-data bug — it's a "where did my old WOD go?" experience.
- **Fix later, when the tripwire fires:** pick a UX option (see below) and implement.

### Tables to be cautious with (growing tables, S349)
- `bookings` — ~2,000 rows today, growing ~330/month
- `weekly_sessions` — likely hundreds today, growing ~150/month
- `wods` — growing similarly to weekly_sessions
- `wod_section_results` — grows fastest (multiple per session × athlete)
- `lift_records` — accumulates per athlete forever
- `benchmark_results`, `reactions`, `athlete_achievements`, `programming_plan_items` — all accumulate over time

These tables are likely to cross 1,000 rows within months if they haven't already. Every browser-side `select()` on these must have a narrowing filter, pagination, or use a server-side aggregation.

---

## Workflow when a scaling fix is needed

### Decision tree for any new query against a growing table

1. **Is there a narrowing filter** (`.eq('id', x)`, `.in('member_id', [...])`, `.eq('user_id', authedId)`)? → Fine, ship it.
2. **No filter, but the browser only needs a small aggregate** (counts, top N, sum)? → **Server-side SQL aggregation** (view or RPC function). Best long-term answer.
3. **No filter, browser genuinely needs the raw rows** (to walk and build a Map / extract patterns)? → **Pagination loop** using `.range(from, from + 999)`. Cheap, no SQL migration needed.

### What happens when I propose a SQL view to Chris

1. I explain the change in plain English using the kitchen analogy.
2. I write the SQL in `database/YYYYMMDD_description.sql` AND paste the full SQL inline in chat (per Chris's preference — he runs migrations from the browser, not the file system).
3. Chris pastes it into Supabase SQL Editor and clicks Run.
4. I update the TypeScript to call `.rpc('view_name', { args })`.
5. Total work for Chris: one paste, one click.

### What happens when I just paginate

1. No SQL migration. Pure code change.
2. The hook does multiple round-trips instead of one (fine for chip-class workloads where it's a one-time fetch per page load).
3. Pattern lives in `hooks/coach/useCoachData.ts:fetchWODs` (lines ~55-80, ~570-595) and now also in `useMovementTracking.ts` (computeGlobal) and `useMemberData.ts` (10-card attribution).

---

## Search UX options (for when the 2,000 tripwire eventually fires)

Pick ONE — each has different ergonomics for the coach using search daily.

- **(A) Show all results, no cap.** Simplest. May slow page load on mobile / slow connections when result sets get huge. Acceptable up to a few thousand.
- **(B) "Load more" button.** Show first 500-1000, click for next batch. Standard pattern. Predictable, easy to implement.
- **(C) Require at least one filter.** Searches without a filter return nothing or a prompt ("please pick a week, name, or movement to search"). Forces deliberate search; never shows huge result sets.
- **(D) Default to a date window.** Unfiltered search defaults to "last 90 days"; explicit "Search all time" toggle for everything else. Best UX for "I'm looking at recent stuff most of the time" use case.

Chris's choice should be informed by **how he actually uses the search** at the time. If most searches are "find Fran from earlier this year" → D fits. If most are "browse what I've programmed lately" → A or D. If he often forgets to filter → C. Decide when the tripwire fires, not before.

---

## Other scaling categories (the "what else might bite us?" map)

Each item is named in plain English with the technical name in parentheses for me to grep on. None are urgent today; this is a forward map.

### 1. Missing database indexes (database indexes / pg_indexes)
**What it is:** An index is like the A-Z tabs in a paper address book — without them, the database flips through every page to find what it wants. Fast at 100 rows, slow at 100,000.
**Symptom:** A page that used to load in 200ms now takes 4 seconds.
**When it bites:** Year 1-2 for the most-read queries.
**Fix:** I add an index via SQL migration (~10 lines). Same paste-and-run workflow as a SQL view.

### 2. N+1 queries (the N+1 problem)
**What it is:** Page shows a list of 50 athletes. For each one, the page asks the DB an extra question ("what's their last lift?"). That's 51 round trips instead of 1.
**Symptom:** Pages with lists feel slow.
**When it bites:** Whenever a list has many items each fetching its own detail.
**Fix:** Combine into one query with a JOIN, or fetch the details for all 50 in one batch and stitch in JS.

### 3. JavaScript bundle size (bundle size / chunk splitting)
**What it is:** Every feature you add makes the JS file the phone downloads bigger.
**Symptom:** First page load on a phone over cell takes noticeably longer than wifi.
**When it bites:** After ~6 more major features, especially if any pull in big libraries.
**Fix:** Code-splitting (load heavy parts only when needed), tree-shaking unused deps, lazy-loading routes. Cheap when done as a deliberate pass.

### 4. Image / file storage (Supabase storage)
**What it is:** If we ever add profile photos, progress photos, attachments, etc., files live in a different system that has different cost and load characteristics.
**Symptom:** Cost creep + slow image loads on listing pages.
**When it bites:** Only when we add user-uploaded files. Not a concern today.
**Fix:** Use a CDN-fronted bucket, resize on upload, lazy-load images. Standard playbook.

### 5. Cron job timing drift (Vercel cron)
**What it is:** You have one daily cron (`expire-memberships` at 06:00 UTC). If we add more, they can land on the same minute and slow each other down.
**Symptom:** A cron taking longer than expected, or running late.
**When it bites:** When 3+ crons exist and one of them is slow.
**Fix:** Stagger schedules (06:00, 06:15, 06:30 instead of all at 06:00). Trivial.

### 6. Push notification deliverability (FCM rate limits)
**What it is:** Firebase Cloud Messaging has quiet per-burst rate limits.
**Symptom:** Some athletes don't get a notification that everyone else got.
**When it bites:** If we ever send to 200+ athletes in a single burst.
**Fix:** Batch sends with small delays. Already partly handled but worth auditing if/when this happens.

### 7. Stripe webhook race conditions (idempotency / event ordering)
**What it is:** Stripe sends webhook events when subscription state changes. They can arrive out of order — sometimes a "subscription updated" lands BEFORE the "checkout completed" it depends on.
**Symptom:** Subscription state in our DB doesn't match Stripe (S345 zombies, S347 missing Manage button).
**When it bites:** Already has, twice. Each time we've fixed the specific path. Long-term pattern fix: webhooks should fetch authoritative state from Stripe API rather than trusting event payload order. S345 already moved checkout.completed in this direction.
**Status:** Half-fixed. Worth a focused review session to make all four webhook handlers use the same "fetch authoritative state" pattern.

---

## When to schedule a focused scaling review

Triggers that suggest "it's time":
- A user-visible bug that turns out to be a scaling issue (like S349's chip)
- A page that "used to feel fast" feeling slow
- The search-limit tripwire firing in dev logs
- Adding the next major feature, especially one that aggregates data
- Onboarding a second gym (commercialization)

The scaling categories above are foreseeable issues. They're not coming at you in a chaotic order — they show up roughly in the sequence above, on a 6-month-to-2-year timeline. Each is fixable in a focused session of work, not a rewrite.

---

## For Chris: what to remember

If you only retain three things from this doc:

1. **The kitchen/dining-room analogy.** When I talk about "moving math to SQL", that's all I mean.
2. **The growing tables list.** When you see a new feature that involves bookings, sessions, wods, results, lifts, or benchmarks, ask me: "did you check for the 1,000-row trap?" That's enough to make me re-read this doc.
3. **The tripwires exist.** I've left a tripwire in the search code (S349) and added the 1,000-row rule to `claude-rules.md`. Future bugs of this class should announce themselves before they break things.

You don't need to keep any of this in your head day-to-day. The reference is here. The rules are in `claude-rules.md`. Your job is coaching athletes; my job is to remember this stuff for you.
