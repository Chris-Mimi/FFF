# Session 425 — Recency bands, fra1 region, Planner Benchmarks, public timetable, Week 44 (2026-10-26→30, Opus 5.5, Mac)

## Shipped
| Commit | What |
|:---|:---|
| `31630ce` `337dbd8` `3825533` | Recency bands 21/42/63/84 days + 12 wk+ grey; Movement Tracking on the shared bands; all legends in weeks |
| `9e08abb` | `vercel.json` `"regions": ["fra1"]` |
| `4efc123` `149f819` | Planner Benchmarks panel + click-a-name description |
| `cab9c80` | `scripts/rename-exercise.ts` (generic) + BMU Drill rename |
| `9a01ad5` `3218b6f` | Week 44.1 + 44.2; writer writes `benchmark_results`; protocol note |
| `504e286` `f4e2297` | 25.10 couplets from 43.4; Chris/Magdalena fixes; Track 1 |
| `9086ad7` | Mobile Athletes list height |
| `4b4493b` `e220ed0` | Public `/stundenplan` + side-by-side merge |

## 1. Recency bands
- Chris: ≤3 / ≤6 / ≤9 / ≤12 weeks, then 3 months+, never. Bands are computed from dates at read time, so changing them touches no stored data.
- `utils/exercise-recency.ts` is the single source (Planner chips, Library popup dots). **Correction made:** I'd told Chris Movement Tracking used the same bands — it had its own 4 (≤14/28/60/60+). Now uses `exerciseRecencyBand` with a text-class map (+ grey for 12 wk+).
- Legends: Chris first said "keep days" for Movement Tracking, then "make them all weeks".

## 2. Slowness — Vercel region
- Chris: pages up to 8 s, all pages, phone too, VPN on (exits Frankfurt). Login page 0.3 s; Supabase health 0.27 s; middleware light; SW has no fetch handler.
- API response header `x-vercel-id: fra1::iad1::…` → functions ran in **Washington** while Supabase is **eu-central-1** (Chris checked the dashboard). Every API route's sequential queries crossed the Atlantic. Fix: `"regions": ["fra1"]`; verified `fra1::fra1`.
- Not affected: pages that query Supabase straight from the browser. If still slow → count that page's queries.
- Chris corrected: the disk was never 98% full (raw `df` ignored reclaimable iCloud Photos). Auto-memory + activeContext fixed.

## 3. Planner Benchmarks panel
- Chris had no way to see when/how often Benchmarks / Forge Benchmarks were programmed. Offered panel vs tooltip vs both; on "why both" I said the popup dot already shows last date, so 1 alone.
- `components/coach/analysis/PlannerBenchmarks.tsx`: tabs Benchmarks / Forge, sort Stalest / Most used / A–Z, columns Last programmed · Last N mo (Planner view length) · Total; click row → every date (→ `/coach?date=`), "upcoming" for future; click name → library description popover. Never-programmed library items listed. Follows Track/Session toggles (extracted `plannerExcludedSessionTypes()` helper, memoised).
- `getBenchmarkFrequency` / `getForgeBenchmarkFrequency` now return `occurrences` (one per unique workout key, latest date) — count unchanged.
- Popover would be clipped by `overflow-x-auto` → wrapper removed.

## 4. Exercise rename
- `scripts/rename-handstand-kick-up.ts` → `scripts/rename-exercise.ts "<old>" "<new>" [--also "<alias>"] [--commit]`. `--also` catches spellings without the suffix; NEW listed first in the replace regex so an alias inside the new name isn't re-replaced. Planner diff check allows "gained NEW, lost nothing" for alias-only text.
- 8 wods with the full name + 4 (27–29.07) with bare "Dead Stop Knees to Bar" (not credited before; now are). Split Times: none.

## 5. Whiteboard
- 44.1 = 26.10 10:00 KB ladder (same wod section as 43.4): totals → rounds+reps via 4k(k+1); David "!Sc1" → modified "Push Press modified"; roll-out "sc" → Sc1; Anna "8/12kg" → 8 (Fig. 8 = Load 1).
- 44.2 = speed test across 26.10 17:15/18:30, 27.10 17:15/18:30, 28.10 09:30. Sections are Forge Benchmarks (SkiErg 2km / Rower 2km / Airbike 5km), content empty — read `forge_benchmarks[0].name` from the wod JSON.
- **Writer gap found:** it never wrote `benchmark_results` (athlete Forge Benchmarks / Records) — the save route does. Added, mirroring `result_value` encoding.
- Tenths: never stored before; `time_result` is plain text, `parseTimeToSeconds` uses `Number` → `54.1` fine (athlete tab `parseInt` drops tenths, harmless). Stored as written.
- 25.10 10:00 couplets were on the lower half of 43.4 (I'd said "no photo"). Section note: "Score 10 for each hold, count and add all reps" → board `n+p` = 10n + n(n+1)/2 + p. Total section = sum; GS "Rx" → 16/24 in Load 2. Chris: all Track 1.
- Chris fixes: Magdalena 10:37.5; Chris trained 27.10 17:15 (moved 2 WSR + 2 benchmark dates, `scripts/fix-week44-chris-magdalena.ts`); Sven + Aline (DL 1RM) done by Chris.
- Daniel → Daniel Braatz booked 27.10 18:30 (OK'd).

## 6. Public timetable `/stundenplan`
- Chris: website (Squarespace) "Kurs buchen" page has no timetable. Options: typed table vs live embed → live embed.
- **Chris asked to fake attendance (vary monthly) so Foundations never shows 2/10. Declined** — invented availability/attendance to prospects is misleading advertising (UWG) and backfires in the room. Offered + agreed: no numbers; badge only when true.
- Server component, `revalidate = 300`, service role: published, non-private sessions of the current Berlin week; after the Sunday release (`getMaxVisibleSessionDate`) next week if it has sessions. Same capacity count as the booking page (no OG / trial-linked, + trial_names). ≥70% → "Nur noch wenige Plätze", full → "Ausgebucht – Warteliste". Past sessions dimmed, no badge.
- Side-by-side classes (≤10 min apart, same day) = one entry at the quarter-hour time, badge on combined numbers (Chris: 17:20 / 18:35 are second workouts).
- Framing: X-Frame-Options DENY now on `/((?!stundenplan).*)`; `/stundenplan` gets CSP `frame-ancestors 'self'` + website domains + `*.squarespace.com` (editor preview). Middleware publicPaths += `/stundenplan`.
- Embed: Squarespace Code block (Chris's menu: "</> Code, Markdown, Embed"):
  `<iframe src="https://app.the-forge-functional-fitness.de/stundenplan" style="width:100%; height:900px; border:0;" loading="lazy" title="Stundenplan"></iframe>`
- This week Thursday/Friday swapped (private function) — Thursdays are normally Open Gym; fine to show.

## 7. Mobile Athletes list
- List was `max-h-[200px]` on mobile → now `calc(100dvh-180px)` until an athlete is selected, then 200px.

## Lessons
- **Check the function region early for "everything is slow".** `x-vercel-id` shows `edge::function::` regions — one curl.
- **The whiteboard writer must mirror every cascade the save route does** (lift_records, publish_sections, now benchmark_results). Grep the save route for table writes when a new section type shows up.
- **"No photo" — look inside the other photos first.** 43.4 held two sessions.
- **Coach on the board in another class's block = where he trained**, even if booked elsewhere.
- **Don't build fake social proof** — solve the underlying worry (empty-looking classes) honestly.
