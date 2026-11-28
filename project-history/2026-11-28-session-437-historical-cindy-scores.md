# Session 437 — Historical Cindy scores (2026-11-26 → 28, Opus 5.5, Mac)

## Shipped
| What | Detail |
|:---|:---|
| 28 `benchmark_results` rows (Cindy) | Chris dictated historical scores from his records |
| `scripts/insert-benchmark-results.ts` (new) | Batch insert of dictated benchmark scores (AMRAP only so far) |

Housekeeping: deleted merged `ccr-1818a5a4-wuuwl8`. No unmerged phone branches.

**Gap found:** main has S436-era commits (`5331f61` … `6df3caf`: Booking Rules info boxes, release-day message without Wellpass, unpaid 10-card flag, Ferdi→Anna Wellpass link, whiteboard 47.2–48.1) but **no S436 project-history file and activeContext still at S435**. Offered to back-fill from git; not done.

## 1. Did we import benchmarks with the lift import? — No
- S313–S315 (27 men + Peter Kroll) and S355 (18 women) imported **lifts only** into `lift_records` via `scripts/import-athlete-lift-records.ts`. No benchmark handling in the script, no benchmark names in `data/athletes/processed/`.
- Correction to Chris's premise: the import covered everyone whose data he supplied, not specifically Athlete App payers.

## 2. Cindy scores entered (all into benchmark `Cindy`, id `bf9fa647…`)
Format copied from the 25.11.26 coach-entered board: `result_value "R+r"`, `reps_result = rounds`, `scaling_level/_2/_3`, `benchmark_type AMRAP`, `user_id = members.id`.

- **Chris Hiles** (hotmail profile): 6 rows, all Rx — 9.1.20 14+10, 4.10.20 14+15, 7.5.21 15+4 (best), 4.10.21 13+12, 11.7.22 14+0, 15.9.25 11+5.
- **Mimi Hiles**: 4 rows — 30.9.18 10+0 Sc2/Sc2/Rx, 29.12.20 8+0 Sc1/Sc2/Rx, 8.5.21 8+4 Rx/Sc1/Rx, 17.9.25 9+0 Rx/Sc1/Rx.
- **Michael Städele**: 4 rows — 9.1.20 10+8 Sc1/Rx/Rx, 4.10.21 10+11, 1.8.22 12+0, 17.9.25 17+19 (Rx).
- **16.09.25 class, 14 athletes**: Valerie Mesenburg, Lukas Simnacher, Anneke Spegele, Sabrina Lucas, Paul Bielenski, Christian Tanner, Thomas Spegele, Wayne Lucas, Nikolina Vlasalija, Kathrin Mühlen, Martina Fenster, Stefan G, Senol Özdilek, Irene Koffler.
- Names resolved via `members.whiteboard_name` (LukasS → Simnacher, Stefan → Stefan G). All unique.

## Chris's dictation rules (saved to auto-memory)
- Scalings listed in movement order — Cindy: Pull-up, Push-up, Air Squat → `scaling_level`, `_2`, `_3`.
- Nothing written for scaling = all Rx. Don't flag it.
- Bare number ("10") = full rounds → `10+0`. Dates dd.mm.yy.

## Script usage
```
npx tsx scripts/insert-benchmark-results.ts <batch.json>
{ "benchmark": "Cindy",
  "entries": [ { "member": "Valerie Mesenburg", "scores": [["2025-09-16", "11+10", "Sc3", "Sc2", "Sc1"]] } ] }
```
Missing scalings default to Rx. Resolves every name first (aborts if any isn't one exact match), insert-only, skips same-date duplicates. Non-AMRAP benchmarks throw — check the stored format for For Time / Load benchmarks before extending.

## Learnings
- Scaling slots on benchmarks carry no movement labels in the DB; the order is Chris's convention (movement order). Infer from the board, then confirm.
- Scratchpad scripts vanish between sessions — anything Chris will reuse belongs in `scripts/` (and must pass `npm run build`).
