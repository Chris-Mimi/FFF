# Session 413 — Whiteboard catch-up + auto-booking (2026-09-24 → 09-27, Opus 5.5)

**Whiteboard data entry only. No app code changed.** Chris checked every score afterwards: all OK.

## Entered
| Board | Sessions | Rows | File |
|:---|:---|---:|:---|
| 38.1–38.3 | 14.9–21.9 (DB AMRAP, clean, T2B AMRAP, GHDHE AMRAP) | 80 | `boards/2026-W38-1/2/3.json` |
| 36.2 | 2.9 Tabata ×4 sections, 4.9 Weekend WOD ×3 parts | 150 | `boards/2026-W36-2.json` |
| 32.2 + 32.3 | 8.8 Endurance, 9.8 KB metcon | 17 | `boards/2026-W32-2-3.json` |
| 5.2 corner + 5.4 | 31.1 Endurance, 1.2 E3MOM | 24 | `boards/2026-W05-31-1.json` |
| 6.1–6.4 | 2.2, 4.2, 6.2, 7.2, 8.2 | 69 | `boards/2026-W06.json` |
| 39.1–39.3 | 21.9–27.9 (metcon, clean, Man Maker, WW #26.16 ×4, TGU cals, Endurance, 27.9 ×2) | 132 | `boards/2026-W39.json` |

## New tooling
- **`"book": true` on a board row** (`a192fab`, `scripts/enter-whiteboard-scores.ts`). The athlete is matched against ACTIVE members (must be exactly 1), then gets a confirmed booking in that session before the WSR write. An existing cancelled/late_cancel row is flipped instead of inserting a duplicate. The 10-card trigger counts it like any booking. 13 bookings were made this way.
- **Chris's rule behind it:** "guess at which class they were in and add them, then let me know. Most times you'll be correct and it's easy for me to fix if not."

## Protocol changes (`memory-bank/whiteboard-score-entry-protocol.md`)
- **Step 0 — coverage sweep.** I worked photo-by-photo on Week 38 and declared it done while 20.9 10:00 + 11:00 had no scores. Chris: "why didn't you spot that?" Now: preflight every day of the ISO week, list sessions with bookings + `rows:0`, compare against the photos, and flag the gaps up front.
- **Skip in the sweep:** kids classes, Diapers & Dumbbells (almost never a board), and **Thursdays** (gym day off; a member runs a non-coached Endurance workout others can join, rarely scored).
- **Endurance `Nx` on sled push / tyre pull = N lanes × 10m.** I first summed "11.5x" as 11.5. Corrected 8.8 totals (Kathrin 490→630, etc.).

## Scoring decisions worth remembering
- **Time-capped for-time WODs:** time null, `rounds_result 0` + `reps_result` = reps completed (matches `leaderboard-utils.ts:773` "Time Cap N reps" display). Setting rounds to 0 keeps the existing `rounds_reps` field instead of enabling `reps`.
- **Lower-is-better does not exist** in the leaderboard. Weekend WOD #26.5 (burpee penalty rounds) is stored as **32 − rounds** per Chris ("everyone starts with 32 points and loses 1 per round").
- **Hyrox-style AMRAP with rounds + metres** (36.2 Pt.2): converted to `metres_result` (1 round = 100m) and enabled `metres`. Chris: "great job".
- **Two scalings on one board** (e.g. V-Up + Pull-up, Rope + Push-up, GHD + Man Maker): scaling = first/tagged, scaling_2 = second, enabled `scaling_2`. Band colours dropped.
- **Foundations half-reps in the same WOD:** Track 2, everyone else Track 1 (filled, per S411 track rule).
- **Pt.3 Muscle-Ups/Dips (36.2):** summed pull-ups + dips. Chris corrected some rows himself — summing Rx BMU with dips was questionable.
- **Scaling tier from load** when the board only gives kg (cleans, deadlift): use the WOD's tier table, round down between tiers, and anything below the lowest tier goes to the lowest one.

## Landmines hit
- **Self-entered rows have `member_id` NULL but `user_id` set** (Michi S 23.9 cleans). The writer dedupes on member_id → would create a duplicate. Check existing rows in the dump before writing.
- **Score columns drift upward against names** again (36.2, 38.2, 39.1). Validated every block by matching value counts end-to-end, never by visual row.
- **`wod_section_results` has no `workout_id`** — filter by `workout_date` + `section_id` (`-content-0`).
- **tsx scripts must run from the project root** (scratchpad `.ts` files can't resolve `@supabase/supabase-js`) — use `npx tsx -e "$(cat file)"`.

## Other
- **Nicole Rauh "2" in the Workouts athlete list, 1 workout shown:** one of her 2 past sessions was Open Gym (no published workout). `get_all_members_attendance` counts all attended sessions. Offered to count only sessions with a published workout — not answered.
- Magic link generated: abauer@verlag-bauer.de.
- Week 37 has no photos. Every session except Mon 7.9 09:30 Endurance #26.17 has no workout attached (probably Open Gym) — nothing to enter.
