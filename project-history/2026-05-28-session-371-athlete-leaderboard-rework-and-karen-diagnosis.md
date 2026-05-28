# Session 371 — Athlete Benchmarks leaderboard rework + 8 backlog verifications + Karen 26/01 missing-scores diagnosis

**Date:** 2026-05-28 (Opus 4.7) — 1 work commit + close.

Session opened on the carry-over verification backlog. Knocked out S370/S369/S368/S367/S366/S355/S354/S346 in quick succession via Chris's prod eyeball passes + two magic links (Anneke Spegele for women's lifts, Daniel Steller for parent-self-block on kids classes). Then Chris flagged improvements to the athlete Benchmarks leaderboard, which became the main code work. Closed with a diagnostic detour into a perceived data-loss incident on Karen 26/01/26.

---

## 1. Athlete Benchmarks leaderboard rework

Started from one feedback item ("dates should have year — results from multiple years"), expanded into a full rework over a tight feedback loop.

### Final shape

- Removed standalone Date column + Scale column.
- Added parallel **Best** + **Last** columns. Same layout in both: scaling badges (Rx/Sc1/2/3) + Track badge (T1 teal / T2 amber / T3 gray) on the left, result + DD/MM/YY date stacked on the right.
- Headers are now `<button>`s — clicking switches rank order between best and last. Active button styled teal/bold/underlined. Default = `last` per Chris's explicit ask.
- Athlete column gets `w-full`; Best/Last hug each other on the right with `pl-2` gap.
- Result + date spans get `whitespace-nowrap` so "45 kg" doesn't wrap mid-cell.

### Iteration sequence (each one Chris-driven)

1. "Show year on dates" → swapped `{ day: 'numeric', month: 'short', year: '2-digit' }`.
2. "Add Last column showing the most-recent attempt next to Best" → extended `LeaderboardEntry` with `lastResult`/`lastResultDate`, built `lastByUser` Map in `rankBenchmarkResults` alongside `bestByUser`, pre-formatted via `formatBenchmarkResult` against the last raw row.
3. "Too much space between Best and Last" → Athlete column `w-full`, Best/Last `whitespace-nowrap`.
4. "Best should also show scaling levels" → first pass collapsed Scale column into Best cell.
5. "No — Best AND Last should have the same format: date, scaling, result" → made the two cells symmetric; added `lastScalingLevel{,2,3}` to `LeaderboardEntry` and populated from `last.scaling_level{,_2,_3}`.
6. "Ranking should be by Last, not Best" → flipped sort base from `bestByUser` to `lastByUser`. Tied-on-primary tiebreaker date direction flipped to DESC for last (more-recent-attempt wins ties), ASC for best (earliest-PR wins ties).
7. "Make Best and Last clickable so the athlete can pick" → added `rankBy: 'best' | 'last'` state in the component, plumbed through to `rankBenchmarkResults` as an optional 6th param defaulting to `'last'`. Tiebreaker direction flips with `rankBy`.
8. "Show Tracking levels too" → added `lastTrack` to the type + cell.
9. "Date format `21/01/26`" → `{ day: '2-digit', month: '2-digit', year: '2-digit' }`, applied to all 4 date spans via `replace_all`.
10. "45 kg shouldn't split over 2 lines" → `whitespace-nowrap` on all 4 result/date spans.

### Separate ask earlier in session — athlete-side exercise list removal

Chris's call: athletes don't need the linked-exercises list (they see the text description, which is enough). Removed exercise rendering from both subviews (WOD + Benchmarks). `exercises[]` is still fetched + flowed for Planner / search / coverage analysis — just not rendered on the athlete leaderboard.

### Why default to ranking by last

Chris's gym is small enough that "where do I stand right now vs the rest of the box" is more meaningful than "where do I rank if I count my best-ever attempt from 18 months ago." Best column still shows the best in the same row — it's not hidden, just demoted from ranking criterion.

---

## 2. Karen 26/01/26 17:15 missing-scores diagnosis

Chris added a scaling option to a Karen workout this morning and reported that 8 of the 9 booked athletes' scores had disappeared from the score-entry modal (only Madeleine survived).

### Investigation

Wrote `scripts/diagnose-karen-26jan-scaling-loss.ts` first — confirmed:
- The 17:15 session (`weekly_sessions.id=ee11263a-...`) has `workout_id=eac6bb17-...`.
- That wod has 7 sections post-edit; `updated_at=2026-05-28T12:31` (today).
- Only **1** WSR exists on it (Madeleine), with `updated_at=2026-05-09T14:58` — untouched by today's save.
- 9 athletes were booked: Kathrin, Sabrina, Sandra, Valerie, Wayne, Dimitar, Zoran, Lukas, Madeleine. The 8 missing names have no rows on this wod.

First conclusion offered to Chris: data lost in an old S356 incident; recover from photo + manual re-entry.

**Chris pushed back:** "I have the athletes app open and I'm looking at them on the Leaderboard." Per the `feedback_trust_user_over_survivor_bias` rule, that ended the "they're lost" hypothesis. Wrote second script `scripts/diagnose-karen-26jan-full.ts` to pool across all wods + the `benchmark_results` table.

Result: **18 Karen entries exist in `benchmark_results`**, including all 8 "missing" names. Cross-table inventory:

| Source | Count | Athletes |
|:---|:---|:---|
| `benchmark_results` (Karen) | 18 | all 18 unique athletes across the 3 Karen wods |
| `wod_section_results` on 17:15 wod (`eac6bb17`) | 1 | Madeleine only |
| `wod_section_results` on 18:30 wod same day (`675cf187`) | 6 | Leah, Miriam, Christian, Daniel, Paul, Tobias |
| `wod_section_results` on 28/01 wod (`4479f1c3`) | 4 | Irene, Lisa, Mimi, Michael Städele |

All 18 `benchmark_results` rows + all 11 `wod_section_results` rows were `created_at=2026-05-09` (S356 recovery day). Madeleine has only a WSR (created 14:58:18.636) — no matching `benchmark_results`. Every other athlete has BOTH a WSR and a `benchmark_results` row (or just the latter, for the 8 "missing" ones).

### Root cause

[`app/api/score-entry/save/route.ts`](../app/api/score-entry/save/route.ts) "Auto-save benchmark_results for sections with a benchmark or forge_benchmark" — coach modal writes both tables on every save. The WSR loop logs errors to an `errors[]` array but continues processing the rest of the batch AND continues to the `benchmark_results` auto-save step regardless. So if a WSR insert fails silently (likely due to a section-ID race during the S356 cascade-delete bug — IDs were regenerating mid-batch), the `benchmark_results` write a few hundred ms later still lands.

Net effect: athlete-side leaderboard pools both tables → all 18 show. Coach score-entry modal queries only WSRs → only the 11 with successful WSR inserts appear. The 8 "missing" ones are visible to athletes but invisible to the coach.

### Why today's save is innocent

`wods.updated_at` on `eac6bb17` is today (12:31), but Madeleine's WSR `updated_at` is 2026-05-09 — untouched. The save path's null-out only fires on `scoring_fields` toggles going `true → false` ([useWODOperations.ts:233](../hooks/coach/useWODOperations.ts#L233)). Adding a scaling option is `false → true` — strictly safe direction. And the S357 rename-detection migration ([useWODOperations.ts:80-130](../hooks/coach/useWODOperations.ts#L80)) protects existing WSRs even if section IDs regenerate. The 8-row gap was pre-existing.

### Chris's decision

Re-enter the 8 manually via the coach modal. Doing this will create matching WSRs; the existing `benchmark_results` rows will dedupe (coach entry takes priority on the leaderboard). Adding scaling to the other 2 Karen wods (`675cf187`, `4479f1c3`) is also safe — the pre-existing WSRs there are protected.

---

## 3. Backlog clear

8 carry-over verifications closed this session, all by Chris's eyeball pass + 2 magic-link tests:

| Session | Verified |
|:---|:---|
| S370 | Banner per-row dismiss + Wellpass household pause |
| S369 | Wellpass tab bookings column + lifetime Score |
| S368 | athlete_subscription_end backfill |
| S367 | Lapsed-sub banner phantoms cleared + Mac instability resolved (Synology Drive swap, runbook archived) |
| S366 | Leaderboard load-3 display + touch drag |
| S355 | 05/05 18:30 re-entry (4 athletes) + women's lift records (Anneke via magic-link) |
| S354 | All 3 surfaces — benchmark detail + parent self-block on kids classes (Daniel Steller via magic-link) + schedule Confirm + Delete-week |
| S346 | Gym memberships Add → Edit → Delete flow |

Two stale ⏳ entries in activeContext flipped to ✅:
- S367 Stripe webhook sync — actually fixed in S368
- Mac instability capture.sh — closed S370 by the Synology Drive Client swap

---

## Files modified

| File | Change |
|:---|:---|
| `components/athlete/LeaderboardView.tsx` | Benchmarks subview rework: Best+Last columns, clickable rank toggle, badges integrated, DD/MM/YY date, exercises removed from description box |
| `utils/leaderboard-utils.ts` | `LeaderboardEntry` gains `lastResult`/`lastResultDate`/`lastScalingLevel{,2,3}`/`lastTrack`. `rankBenchmarkResults` builds `lastByUser` Map + accepts `rankBy: 'best' \| 'last'` param |
| `memory-bank/activeContext.md` | S371 entry, kickoff trimmed, S366 rotated out of Last 5, 2 stale ⏳ → ✅ |
| `scripts/diagnose-karen-26jan-scaling-loss.ts` | NEW — first-pass WSR-only inventory |
| `scripts/diagnose-karen-26jan-full.ts` | NEW — pool benchmark_results + all Karen-referencing wods |
| `Chris Notes/AA frequently used files/Notes for next session.md` | Chris's notes (committed per claude-rules, never edited) |

## Process notes

- **Trust-user-over-survivor-bias rule paid off.** First diagnostic pass concluded "data lost in S356" based on what was in `wod_section_results`. Chris's pushback ("I see them on the athlete app right now") forced a wider net, which uncovered the actual story. The rule worked exactly as designed.
- **The right diagnostic question is rarely the first one.** Two scripts, the second one only after Chris reframed. Cost ~10 mins; without the second, I would have told him to re-enter from photos when the data was sitting right there in `benchmark_results`.
- **Iterative UI refinement was efficient via tight, narrow asks.** Chris drove 10 successive small refinements on the leaderboard with concrete bug-report-style asks. Each one was a 5-30 line edit. No Plan Mode needed; no Explore agent needed.

## Commits

1. `<this commit>` — `feat(session-371): athlete benchmarks leaderboard — best+last columns with clickable rank toggle`
