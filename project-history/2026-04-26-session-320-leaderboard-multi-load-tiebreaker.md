# Session 320 — Leaderboard Multi-Load Tiebreaker Fix

**Date:** 2026-04-26 (Opus 4.7)
**Trigger:** Chris saw "Rinse & Repeat" Pt.2 leaderboard rank Teemu (10kg DBs) above him (22.5kg DBs) and asked why heavier loads weren't honored.

---

## Problem

The leaderboard sort in [utils/leaderboard-utils.ts](utils/leaderboard-utils.ts) only ever read `weight_result` (the primary load slot) when comparing athletes. Sections that capture multiple loads via `scoring_fields.load2` and `scoring_fields.load3` (e.g. sandbag + DBs in the same WOD, or barbell complex with two lifts at different weights) had `weight_result_2` and `weight_result_3` saved correctly to the DB but **silently dropped on every rank comparison.**

Two distinct code paths inside `compareByScoringType()` had the same blind spot — both got fixed.

---

## The two code paths

### Path 1 — Weight tiebreaker (primary metric ≠ weight)

When the section's primary scoring is `'reps'`, `'time'`, `'rounds_reps'`, etc., the function runs a load tiebreaker BEFORE the primary metric: "if one athlete loaded heavier, they win regardless of reps/time."

That tiebreaker only read `weight_result`. So on today's Pt.2 (`{ load: true, reps: true, load2: true, scaling: true }`, primary type detected as `'reps'`), Chris and Teemu both at 20kg sandbag tied on weight → fell through to reps → Teemu's 182 beat Chris's 165. Chris's 22.5kg DBs vs Teemu's 10kg DBs were ignored entirely.

### Path 2 — Primary `'weight'` case

When the section IS scored on weight (e.g. 1RM Snatch), the `case 'weight':` branch returned `b.weight_result - a.weight_result` and stopped. A two-load section like "1RM Snatch + 1RM C&J" would only rank by the snatch weight — the C&J was invisible to the sort.

---

## Fix

Both paths now chain through `[weight_result, weight_result_2, weight_result_3]` in order. First slot where the values differ wins. This honors heavier secondary/tertiary loads in any multi-load section, retroactively across all WODs that already have load2/load3 captured.

[utils/leaderboard-utils.ts:173-190](utils/leaderboard-utils.ts#L173-L190) — tiebreaker loop
[utils/leaderboard-utils.ts:235-243](utils/leaderboard-utils.ts#L235-L243) — primary `'weight'` chain

`aggregateScaling` (line 316) was already correct — it sums all 3 scaling levels — so scaling bias across `scaling_level/_2/_3` was already accounted for. Only the load comparison was broken.

---

## Diagnostic process

1. **Started by misreading Chris's complaint** — the screenshot was on Pt.1 (shuttle run + burpees, NO weights). I initially explained "Pt.1 has no scaling" and called the ranking correct, which it is *for Pt.1*. The DB-weight comparison Chris cared about lives on Pt.2.
2. **Pulled the actual section JSON + results from Supabase** via a throwaway script (cleaned up after). Confirmed:
   - Pt.1 (`section-1776596973834-4`): `scoring_fields = { reps: true, track: false }`. All 12 results had `weight_result=null, scaling_level=null`. Teemu 45 > Chris 43 is correct.
   - Pt.2 (`section-1777153053547`): `scoring_fields = { load, reps, load2, scaling }`. All Rx athletes at sandbag=20kg. DB weights varied: Teemu 10kg, Andreas 15kg, Chris 22.5kg, Katharina 15kg, Susi 7.5kg.
3. **Walked the sort code** and traced exactly which lines fire for each athlete pair. Found `weight_result_2`/`_3` referenced in the `RawSectionResult` type but never read in any comparator.
4. **Chris pushed back** ("we've fixed this a few times now... why would I have 3 Load Scaling levels and they not be taken into account?"). Re-read code, found the second instance in the primary `'weight'` case, fixed both.

---

## Lessons

- **When Chris says "we've fixed this a few times before, why is it still broken"** — that's a signal there's likely more than one broken path. Don't fix the obvious one and stop. Grep for every place the suspect column is referenced. Today: only one of two affected branches got fixed in my first pass; Chris's pushback caught the second.
- **`detectScoringType` priority order is non-obvious.** A section with both `load: true` and `reps: true` resolves to `'reps'`, NOT `'weight'`, because reps wins the priority at line 138 before line 139's load check. So Pt.2's primary metric was reps, with weight as tiebreaker — not the other way around. Worth keeping in mind when reasoning about future leaderboard edits.
- **Scaling fields ≠ load fields.** `aggregateScaling` (sum of all three scaling slots) was already correct. The bug was strictly in the load comparator. Two parallel concepts, two parallel pitfalls — the team got one right and missed the other.
- **Throwaway scripts in `/tmp` fail because tsx resolves modules from project root.** Had to move the script into `scripts/` for `@supabase/supabase-js` to resolve. Cleaned up after diagnosis.

---

## Carry-over

- **Live verification needed.** Reload the Pt.2 leaderboard for `2026-04-26 Rinse & Repeat`. Chris should now rank above Teemu (both Rx, both sandbag 20kg, but Chris DB 22.5kg > Teemu DB 10kg). Andreas (15kg DBs) should land between them.
- **Scope of regression.** This will reorder past leaderboards for every WOD whose sections opted into `load2` or `load3`. Mostly heavy-day WODs and complexes. Should be net-positive (more accurate), but expect athletes to notice rank changes on old WODs.
- **Carry-overs from S319 still open:** Nikolina cash-monthly migration (click new "30d" button), reset booking-rules release time to 16:00, OG attendance flow decision, German login error live-test, `next-intl` setup.
