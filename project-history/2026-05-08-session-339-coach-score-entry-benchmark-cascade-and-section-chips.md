# Session 339 — Coach score-entry cascades to benchmark_results + section header surfaces lift/benchmark/forge chips

**Date:** 2026-05-08 (Opus 4.7)

**Trigger:** Chris recorded a 1km Rower Forge Benchmark via the coach-side score-entry modal. The score appeared on the leaderboard but was missing from his athlete-side Forge Benchmarks tab and Records tab.

---

## Bug — coach score-entry never wrote benchmark_results

### Root cause

[app/api/score-entry/save/route.ts](app/api/score-entry/save/route.ts) writes to `wod_section_results` (the leaderboard's primary source) and cascades to `lift_records` for both RM-test and non-RM lift sections. There was **no parallel cascade to `benchmark_results` for benchmark or forge_benchmark sections** — so coach-entered benchmark/forge scores never reached the athlete's Forge Benchmarks tab or Records tab (both read `benchmark_results` and filter by name match against the curated benchmark/forge tables).

This isn't unique to forge benchmarks — regular benchmarks have the same gap. The athlete-side in-WOD save path *does* write `benchmark_results` (via [app/api/benchmark-results/route.ts](app/api/benchmark-results/route.ts)), so athletes self-entering through their logbook were unaffected. Only coach-on-behalf-of entries lost the data.

### Fix — defense in depth

| Layer | File | What it does |
|:---|:---|:---|
| **API payload** | [app/api/score-entry/save/route.ts](app/api/score-entry/save/route.ts) | Body now accepts `benchmarks?: Record<sectionId, {benchmarkId, name, type}>` and `forgeBenchmarks?: Record<sectionId, {forgeBenchmarkId, name, type}>` — parallel to the existing `rmTestLifts` / `nonRmLifts` shape. |
| **API cascade** | same | After the lift cascades, walks scores; for each `score.sectionId` that has a benchmark or forge entry, resolves `user_id` via the existing email→auth-user lookup, skips whiteboard-only athletes, builds a `result_value` mirroring the athlete-side encoding (time → rounds+reps → reps → weight → metres → calories priority), and upserts to `benchmark_results` keyed on `(user_id, benchmark_id\|forge_benchmark_id, result_date)`. |
| **API delete** | same | Deletion path now also deletes the matching `benchmark_results` row when a score is cleared. Mirrors the existing lift_records delete pattern. |
| **Client** | [hooks/coach/useScoreEntry.ts](hooks/coach/useScoreEntry.ts) | `WodSection` interface extended with `benchmarks?` / `forge_benchmarks?`. `saveScores` builds the two maps from `section.benchmarks?.[0]` / `section.forge_benchmarks?.[0]` per scorable section and includes them in the POST. |

**Whiteboard-only athletes are skipped.** They have no `auth.users.id`, so they can't own `benchmark_results` rows. Their scores still land in `wod_section_results` (and the leaderboard sees them) — same behavior as before for their lift cascade path.

**PR notify is NOT wired in the cascade** (deliberate scope limit). The lift cascade triggers PR notifications on RM-test inserts but the non-RM lift path doesn't, so I matched the simpler pattern. Athletes self-entering through the logbook still get PR notifications via [app/api/benchmark-results/route.ts](app/api/benchmark-results/route.ts). If Chris wants coach-entered scores to also fire PR notifications, that's a follow-up.

---

## UX — score-entry header now surfaces configured movements

### Trigger

Chris had been adding redundant "C2 Rower" content rows to sections that already had Forge Benchmarks configured, because the score-entry modal showed nothing about the section's benchmark/lift slots — only the free-text content field. The duplicate rows were a workaround for an invisible UI feature, NOT the cause of the cascade bug. Worth fixing both in the same session because the duplicate-content-row pattern was directly tangled up in the diagnosis.

### Fix

[app/coach/score-entry/[sessionId]/page.tsx](app/coach/score-entry/[sessionId]/page.tsx) — chip row above the content preview, color-coded:

- **Lifts** (blue): `Snatch · 5RM` (with optional `· {rmTest}` suffix when `rm_test` is set)
- **Benchmarks** (teal): `Benchmark · Fran`
- **Forge** (cyan): `Forge · 1km Rower`

Renders only when at least one is configured. Empty sections fall back to content-only display, unchanged.

---

## Process moments worth remembering

- **Asked one disambiguating question instead of guessing.** Chris's first message named a "Forge Benchmark modal" but there are several UIs that could match (athlete logbook flow, Forge Benchmarks tab modal, coach-side score-entry, Records tab). Asked one short question — Chris said coach-side score-entry — and that pointed straight at the correct file. Per `feedback_ask_when_unsure.md`. Saved an exploration cycle.
- **Chris's instinct that the duplicate "C2 Rower" content row was suspicious was right that something was odd, wrong about which thing.** The duplicate row was a UX papercut he'd built around an invisible feature; it had nothing to do with the cascade bug. Surfaced both as separate work items rather than conflating, then bundled them in one commit because they shared a code surface and a trigger.
- **Single commit for two related fixes.** The cascade fix touches the API + the score-entry hook; the UX fix touches the score-entry page. All three files belong to the score-entry flow and both fixes were prompted by the same Chris test. Splitting would have produced two near-identical commit bodies and forced the activeContext to record two interleaved sessions.
- **Mirrored an existing pattern instead of inventing one.** The `rmTestLifts` / `nonRmLifts` cascade was the obvious template — same payload shape, same email→userId resolution, same upsert-by-natural-key. Using the same pattern means the next person reading this code (likely future me) won't need to re-derive the conventions.

---

## Files touched

| File | Change |
|:---|:---|
| `app/api/score-entry/save/route.ts` | New `BenchmarkRef` / `ForgeBenchmarkRef` interfaces; payload accepts `benchmarks` / `forgeBenchmarks` maps; cascade after non-RM lifts; deletion-path also deletes matching benchmark_results row |
| `hooks/coach/useScoreEntry.ts` | `WodSection` extended with `benchmarks?` / `forge_benchmarks?`; `saveScores` builds + sends the two maps |
| `app/coach/score-entry/[sessionId]/page.tsx` | New chip row above content preview; renders lift / benchmark / forge_benchmark when present |
| `memory-bank/memory-bank-activeContext.md` | Version 201; S339 entry; kickoff updated; S334 rotated to history; 2 new landmines |

TS clean. Production build passes.
