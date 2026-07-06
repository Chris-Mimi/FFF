# Week 27 Whiteboard Entry — HANDOFF (transcription verified, nothing written yet)

**Status:** All three boards transcribed AND verified by Chris. **No DB writes done.** Next session: execute the writes per the whiteboard protocol (`memory-bank/whiteboard-score-entry-protocol.md`) — dry-run, write WSR + lift_records together, verify one session in the coach modal, parity check, commit. Do them **one workout at a time**, committing each.

Photos: `whiteboard_photos` `photo_label ILIKE '2026 Week 27.%'` → 27.2 (`7b87e4cc…`) + 27.3 (`7abfe9bf…`).

## Legend (Chris-confirmed this session)
- **Strict Pull-up bands → scaling:** Rx = strict, **P/Bk/R = Sc1**, **G (Green) = Sc2**, **B (Blue, strongest) = Sc3**. `B+G` (two bands) = Sc3.
- **"ok" in a Hold column = held the full cap (3:00).** ("AB"/"ok" as Run column on 27.3 instead = Track, see below.)
- **27.3 "Run" column = Track:** `ok = Track 1`, `AB = Track 2`.

---

## 1. DL Testing (27.2) — 2026-07-03 09:00 — READY TO WRITE
- Session `986df67d-6962-40f7-a757-545cd829d2a9`, wod `ab6ca890-f492-4e00-9116-57c63681c0dd` "DL Testing 5RM, Plank Hold, Strict Pull-up, Handstand Hold".
- Only these **5 new athletes** (rest of the board did it 01/07 — already entered, don't touch).
- **Sections (scoring_fields):**
  - Deadlift 5RM → `section-1782901773992` (`load:true`, lift `Deadlift` rm:5RM) → `weight_result` **+ lift_records** (rm_test 5RM, calculated_1rm=Epley(w,5)).
  - 80% DL AMRAP → `section-1782903061126` (`load:true,reps:true`) → `reps_result` + `weight_result`. (Metcon, NOT an RM → WSR only, no lift_record.)
  - Plank Hold → `section-1782650643558-4` (`max_time:true,track:true`) → time-as-max_time. ⚠️ confirm column (time_result?) + whether track_id needed — inspect an existing entry on the **01/07 DL wod**.
  - Strict Pull-up → `section-1782903385173` (`reps:true,scaling:true`) → `reps_result` + `scaling_level`.
  - HS Hold → `section-1782903461923` (`max_time:true,scaling:true`) → time-as-max_time + `scaling_level`.
- WSR `section_id` = `"<section.id>-content-0"`.

| Athlete (member_id, gender) | DL 5RM | 80% AMRAP | Plank | Strict Pull-up | HS Hold |
|---|---|---|---|---|---|
| Michael Städele `b7323658-398a-46e2-8f0a-27e1a81cb2c7` M | 130 kg | 23 @110 kg | 3:00 (full) | 28 · Rx | 1:30 · Rx |
| Senol Özdilek `cf5fa375…` M | 140 kg | 21 @110 kg | 1:40 | 4 · Sc3 | 0:50 · Sc2 |
| Aline von Rüden `f5d467cb…` F | 85 kg | 31 @65 kg | 2:30 | 15 · Sc3 | 0:28 · Sc2 |
| Irene Koffler `c77cad44…` F | 70 kg | 24 @56 kg | 1:04 | 13 · Sc2 | 0:40 · Sc2 |
| Mimi Hiles `fc5b34d5…` F | 100 kg | 27 @80 kg | 3:00 (full) | 9 · Rx | 3:00 · Rx |

All 5 are **confirmed-booked** on the session. Ignore "Leah" (below the line — Chris enters manually, different workout).

## 2. "Annie" (27.2 right block) — 2026-07-05 10:00 — NEEDS PREP
- Benchmark **Annie** 50-40-30-20-10 DUs / Ab-Mat Sit-ups. Score = **Time**, with a **DUs scaling** column. It's a named benchmark → also writes `benchmark_results` (check the wod's benchmark link).
- Find the 05/07 10:00 session + wod + sections; resolve 11 names; match bookings.

| Athlete | DUs | Time |
|---|---|---|
| Franzi | Sc3 | 13:08 |
| Susi | Sc3 | 11:30 |
| Justine | Sc3 | 16:00 |
| Gloria | AB | DNF |
| Sonja | Sc3 | 14:22 |
| Kathrin | Rx | 14:12 |
| AnnaKr | Sc3 | 15:30 |
| Michi W (Michael Weber) | Sc3 | 10:35 |
| Christian T | Sc2 | 15:50 |
| Stefan | Sc3 | 11:45 |
| Sven | Sc3 | 11:48 |

## 3. Clean/Run/Farmers/Bear Crawl (27.3) — 2026-07-03, 17:15 + 18:30 — NEEDS PREP
- 17:15 session `556962f1-0a3f-4550-868a-082b116ae57c` (wod `dcb4baf8…`); 18:30 session `83fa6022-d408-4cb7-9135-b1ed71cd00c4` (wod `1e012314…`). Same workout "Clean, Run, Farmers Carry, Bear Crawl". Match each athlete to whichever they booked.
- Score = **Time**; **KB** column = scaling (Rx / Sc2), gender-split load (W 15 kg DB + 16 kg KB / M 22.5 kg DB + 24 kg KB) — read `members.gender`, STOP if blank. **Run column = Track** (ok=Trk1, AB=Trk2).
- **Patrik & Miriam = DNF.** Chris booked himself into this session late (his row is on the board).

| Athlete | Track | KB scale | Time |
|---|---|---|---|
| Niko | 1 | Rx | 24:32 |
| Valerie | 1 | Rx | 15:20 |
| Miriam | 2 | Rx | DNF |
| Paul | 1 | Rx | 21:41 |
| Lukas | 1 | Rx | 15:25 |
| Daniel B | 1 | Rx | 15:02 |
| Patrik | 2 | Rx | DNF |
| Wayne | 2 | Rx | 15:08 |
| Daniela | 1 | Rx | 22:30 |
| Franzi H | 1 | Rx | 23:50 |
| Bodo | 1 | Sc2 | 22:48 |
| Sven | 1 | Rx | 22:30 |
| Chris | 1 | Rx | 20:28 |

## First step next session
Inspect an existing WSR row on the **01/07 DL wod** (same workout, already-entered athletes) to lock the exact column mapping for the max_time holds + track, then write DL board (workout 1) as the template.
