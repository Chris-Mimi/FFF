# Claude Rules — durable conventions promoted from auto-memory

These are project-wide rules that survive account/machine switches because they're committed to the repo. Promoted here from `~/.claude/.../memory/` so they're not dependent on which Mac or Anthropic account a session runs on.

**Source of truth note:** if a rule below conflicts with auto-memory, this file wins (it's git-tracked, auto-memory may be stale or missing).

---

## 🚫 Hard Rules (past incidents — don't repeat)

### Never write to `Chris Notes/AA frequently used files/Notes for next session.md`
**Why:** S304 session-close rewrote this file with a structured handoff doc, silently overwriting Chris's persistent reminder bullets. Recovery required `git show` + manual merge.

**How to apply:** It's Chris's personal notepad — bullets there usually mean nothing to me. Reading is fine; writing/rewriting is not. If a session-close checklist or handoff protocol says to write next-session notes, put them somewhere else (`memory-bank/handoff.md`, activeContext, a dated handoff file). If Chris asks me to add something there, do it; otherwise leave it alone.

### Commit Chris's Notes file when it's modified, even though I never edit it
**Why:** S324 commit pass omitted the file because I conflated "don't edit" with "don't commit". Chris syncs Notes between two machines via git, so omitting it broke that sync.

**How to apply:** "Don't write" applies to the file *contents*, not git operations. If `git status` shows `Chris Notes/AA frequently used files/Notes for next session.md` modified, include it in the close-session commit (typically as `chore: sync Chris's session notes`).

### No silent bulk writes — only modify the row the user is editing
**Why:** S240 incident — bulk modifications without explicit approval damaged production data.

**How to apply:** Never modify DB records beyond the one the user is currently editing without explicit approval. If a fix appears to require touching multiple rows (e.g., a backfill, a bulk update), surface it to the user with the exact scope ("this would update N rows") and wait for explicit go-ahead. Read-only inspection of multiple rows is fine.

### Diagnostic scripts use `SUPABASE_SERVICE_ROLE_KEY`, not anon
**Why:** S323 incident — `scripts/list-wods-with-track.ts` returned an empty set with the anon key because RLS on `wod_section_results` silently blocks anon access. I told Chris there was no data; he pushed back; service-role re-run revealed 23 sessions.

**How to apply:** When writing or running a one-off inspection script that queries RLS-protected tables, use `SUPABASE_SERVICE_ROLE_KEY`. The existing scripts in `scripts/` (e.g. `check-ghost-scaling.ts`) use anon — don't trust their output for tables behind RLS without verifying with service role.

### Never `.from(growing_table).select()` without a narrowing filter or pagination
**Why:** S349 incident — the 10-card chip on the Members page silently broke because `useMemberData` fetched all 2,019 active bookings in one shot. PostgREST's default response cap is 1,000 rows; the request succeeds with no error, returns the first 1,000 ordered by insert sequence, and the rest are invisible. The chip's math was correct on the data it received; the data was just secretly half of reality. Audit found four more queries with the same shape; two were almost certainly already truncating without producing a noticeable symptom.

**Growing tables to be cautious with:**
`bookings`, `weekly_sessions`, `wods`, `wod_section_results`, `lift_records`, `benchmark_results`, `reactions`, `athlete_achievements`, `programming_plan_items`. As of 2026-05-13 the gym has ~2,000 bookings and grows ~330/month, so every one of these tables either has crossed or will cross 1,000 rows within months.

**How to apply** — when writing OR reviewing code that does `supabase.from('<table above>').select(...)`:
1. **Is there a narrowing filter** (`.eq('id', x)`, `.in('member_id', [...])`, `.eq('user_id', authedId)`)? If yes, fine.
2. **No filter?** Then either (a) add `.range(from, from + 999)` in a paginated loop (pattern: see `hooks/coach/useCoachData.ts:fetchWODs` lines ~55-80, ~570-595), or (b) move the aggregation server-side via a SQL view / RPC function.
3. **When to pick pagination vs SQL aggregation:**
   - **Paginate** when the browser genuinely needs the rows (e.g., to walk them and build a Map). Pagination is a 5-line change; same hooks code; data semantics unchanged. Default choice unless the result set is going to be very large (>5,000 rows).
   - **Server-side SQL** when the browser only needs a number / a small aggregate (chip counts, leaderboard rankings, gap-analysis frequencies). DB does the math in milliseconds; result is tiny; doesn't grow with data. Worth a 30-line SQL view migration to remove the bottleneck permanently. Use `supabase.rpc('view_or_function_name', { args })` on the client.
4. **When in doubt, ASK Chris.** Pagination is the safer default if I'm not sure.

**The user-facing explanation, when introducing a SQL view to Chris:** "Today the browser fetches every row and counts in JavaScript. Beyond ~1,000 rows that breaks silently. The fix is to ask the database to do the counting and return just the answer. I'll write the SQL, you paste it into Supabase SQL Editor and run it, then I change the TypeScript to call the new function. Total work for you: one click in Supabase."

**Proactive check on new features.** Whenever I'm about to write a new hook or page that reads from a growing table, run through the checklist above BEFORE shipping. Don't wait for Chris to see the chip break. The bug class is invisible until the table crosses 1,000 rows — by then the wrong data has been rendering for weeks.

**For the full reasoning, the kitchen/dining-room analogy I use with Chris, the 7-item scaling-trap map, and the search-UX options:** see `memory-bank/database-and-growth.md`. Read it on demand when a scaling question comes up; don't pull it into every session.

### Documentation filing — use the navigation map, don't litter the project root
**Why:** S349 docs reorg — 21 `.md` files had accumulated at the project root over months (handoff notes, one-shot setup guides, pre-deployment plans) because each session dropped a new file at the easiest location. The root became hard to scan and Chris couldn't tell what was current vs historical. Cleaned up by moving 19 of them to `Chris Notes/Archive/historical root docs/`. Chris is a fitness coach, not an engineer — he should be able to look at a folder and know what's in it.

**How to apply:**
1. **Project root is for the 4 essentials only** — `README.md`, `CLAUDE.md`, `LICENSE`, `WHERE-IS-EVERYTHING.md`. Don't create new root-level `.md` files.
2. **When creating a new doc, decide by audience and lifetime:**
   - **Claude reads it at session start, or on demand for a class of question?** → `memory-bank/`. Lowercase-with-hyphens filename (e.g. `database-and-growth.md`).
   - **User-facing guide for the deployed app?** → `Chris Notes/Forge app documentation/`.
   - **Workflow / git / process help for Chris?** → `Chris Notes/Workflow & Git/` or `Chris Notes/AA frequently used files/`.
   - **Per-session ship log?** → `project-history/YYYY-MM-DD-session-NNN-short-description.md`. Don't put session logs anywhere else.
   - **One-shot doc that won't be re-read** (handoff, migration checklist, etc.)? Skip it — put the content in the relevant project-history entry instead. We don't need another loose file.
3. **When a doc stops being relevant** — move to `Chris Notes/Archive/<topic>/`. Don't delete; git history retains it anyway.
4. **When renaming or moving anything, update `WHERE-IS-EVERYTHING.md`** in the same commit so the map stays accurate.
5. **`WHERE-IS-EVERYTHING.md` (project root)** is the navigation index. If I'm about to create a doc and I'm unsure where it goes, the table in that file answers it.

### Coach UI mutations on athlete-owned data must run server-side with service-role
**Why:** S344 incident — `useBookingManagement.handleCancelBooking` ran wsr/lift_records cleanup browser-side using the coach's auth token. RLS hid the athlete's rows from the coach's session, so the cleanup matched 0 rows. The action appeared to succeed (toast fired) but athletes ended up with ghost scores forever — a silent partial-cleanup bug.

**How to apply:** Tables under athlete-owner RLS (`wod_section_results`, `lift_records`, `benchmark_results`, `athlete_achievements`, `reactions`, `personal_activities`, `personal_activity_custom_types`) must be mutated from a server endpoint using `supabaseAdmin` (service-role), not from the browser. Gate the endpoint with `requireCoach()`. Patterns to copy: [app/api/coach/cancel-member-booking/route.ts](app/api/coach/cancel-member-booking/route.ts), [app/api/bookings/toggle-og/route.ts](app/api/bookings/toggle-og/route.ts), [app/api/coach/promote-waitlist/route.ts](app/api/coach/promote-waitlist/route.ts). **Symptom of forgetting:** toast fires successfully, data is unchanged for cross-user rows.

### Stripe subscriptions: always collect payment up front, and webhooks must fetch authoritative state
**Why:** S345 zombie incident, two-part. (1) Stripe's default `payment_method_collection: 'if_required'` lets users start a trial without a card. At trial-end there's nothing to charge, leaving the sub stuck in `trialing` forever — 5 zombies accumulated this way before the fix. (2) The `checkout.session.completed` webhook was writing a hard-coded `status='active'` and relying on `customer.subscription.created` to correct it; that secondary webhook can fire BEFORE `checkout.completed` (clobbering trialing→active) or fail to fire at all.

**How to apply:** Any `stripe.checkout.sessions.create()` with `mode: 'subscription'` must pass `payment_method_collection: 'always'` AND `trial_settings.end_behavior.missing_payment_method: 'cancel'` (backstop). Any webhook handler that creates/updates `subscriptions` rows must fetch state via `stripe.subscriptions.retrieve(id)` — never hard-code status. Reconciliation script if drift sneaks in: `scripts/sync-subscriptions-from-stripe.ts`.

### Date + time strings: never `new Date(\`${date}T${time}\`)` or `.toISOString().split('T')[0]`
**Why:** S335 incident — Book-a-Class lock check used `new Date(\`${session.date}T${session.time}\`)` which JavaScript interprets as runtime-local (UTC on Vercel), producing a 2h offset on prod and firing "Class is locked" warnings 2h early. S330 flagged `.toISOString().split('T')[0]` as the same TZ bug class — it shifts local-midnight in Germany (UTC+1/+2) back to the previous day in UTC.

**How to apply:** For session start instants → `sessionStartInstant(date, time)` from `lib/bookingRules.ts`. For "today as YYYY-MM-DD" → `formatDate(d)` from `utils/date-utils.ts`. If you find `new Date(\`${...}T${...}\`)` or `.toISOString().split('T')[0]` anywhere in this codebase, treat it as suspect and replace.

### Trust the user's statements exactly as given
When Chris says something doesn't appear in a workout, it means exactly that — don't invent explanations or assume he's mistaken. He will explicitly say when he's unsure.

### Don't assume when debugging — verify with data
Before asserting a cause, query the actual state (DB, file, logs). The script-anon-key blind spot (above) is a concrete example of why.

### Lift-result data invariants (S385 weight-loss incident)
**Why:** RM-test lift sessions (Back Squat / Front Squat / Pendlay Testing) silently lost athletes' weights and PRs over weeks. Two bugs: (1) lift sections stored `scoring_fields.load:false`, and the S338 edit-cleanup in `useWODOperations.ts` nulls `weight_result` when `load` flips true→false on save — so editing/renaming a lift WOD wiped every athlete's weight; (2) `scoreCleanup.cleanupAthleteScoresForWod` deleted `lift_records` on every booking removal, destroying real PRs when athletes were moved between parallel sessions (silent cancel+re-add) or a session was deleted/recreated.

**How to apply:**
1. **RM-test lift sections must always be `scoring_fields.load = true`.** `useWODOperations` forces this on save for any section with an `rm_test` lift — don't remove it. `load:false` on an RM section is a corruption signature.
2. **Never delete `lift_records` as a side-effect of booking/session changes.** They're date-keyed PR history, independent of any booking. `scoreCleanup` clears only `wod_section_results`. Bad records → manual delete-lift on the athlete page.
3. **After any historical DB restore, re-check two things:** whiteboard rows for athletes who registered *after* the backup (→ leaderboard duplicates, delete the whiteboard row), and scores entered *after* the backup date (→ missing, manual fill). The recovery scripts (`scripts/sweep-rm-lift-weight-loss.ts`, `restore-*`, `rebuild-*`) are the templates.

---

## 🪙 Context Efficiency Hard Rules (Session 285)

Past sessions burned 70%+ context on tasks that should cost 15%. The full rule list is in `Chris Notes/AA frequently used files/Claude open or close session.md`. Summary:

1. **No Explore agent for single-file lookups** — Grep/Read directly. Explore is for 3+ queries or genuinely unknown territory.
2. **No Plan Mode for diagnose-and-delete or single-file tasks** — EnterPlanMode loads heavy tool schemas + writes a plan file. Worth it only for 3+ file implementations.
3. **Targeted reads, not full reads** — Grep first, then `Read` with `offset`+`limit`. Never read 300+ line files when you need 20 lines.
4. **Short agent prompts** — 40 words, not 200.
5. **No TodoWrite for 1–3 step tasks** — TodoWrite is for 4+ step work with distinct phases.
6. **Ask before exploring** if the task is ambiguous — cheaper than guessing wrong.
7. **Never `Read` a utility file without `offset` + `limit`** if it's > 100 lines. `utils/leaderboard-utils.ts` is 638 lines — never read in full.
8. **For "X isn't working" bugs, find the caller before reading the implementation** — Grep the function name first to see every call site, then read only the relevant path.
9. **Don't multi-Read the same file in one session** — three Reads at different offsets means I should have used one Grep with `-A`/`-B` context.
10. **Project-history files: cap at ~150 lines / 5 KB** (matches neighbors in `project-history/`).
11. **activeContext session entries: cap at 6 bullets max** — ship-log, not dissertation.
12. **Don't narrate the diagnostic process** — state the root cause in one sentence and fix it.
13. **Session-start reads are ~20% fixed overhead** — working budget is ~60%, not ~80%.

---

## 🚧 Active state worth knowing across sessions

These aren't durable rules but they're load-bearing facts that should survive an account switch. Keep this section trimmed.

- **Push notification debug:** `sendToCoaches` may not match subscription user IDs to coach role; 6 subscriptions exist in DB at last check. Memory: `project_push_notification_debug.md` (if present).
- **Score-save monitoring:** scores were not persisted for 2 sessions on 2026-03-18 after Load 2 feature added. Remind Chris ~Session 226-227 to check for recurrence. Memory: `project_score_save_monitoring.md`.
- **Whiteboard-to-athlete migration:** at launch, run script to link all whiteboard scores to registered athletes using the name mapping in `Chris Notes/Forge app documentation/Athletes booking list`. One-time migration, not ongoing.

---

## When to update this file

- Promote a new auto-memory if it's been the cause of an incident, or it's referenced in 2+ sessions.
- Demote a rule (delete) if it's been baked into code or made obsolete.
- At session close: scan auto-memories saved this session, ask "should this graduate to here?" Catches drift before it accumulates.
