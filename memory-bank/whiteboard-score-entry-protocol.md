# Whiteboard Score-Entry Protocol

**Cue phrase:** Chris says *"run the whiteboard protocol for [photo name / session]"* → follow these steps. Born from S386 (Week-7 OHP/PP recovery from photo "2026 Week 7.1").

**Purpose:** turn a photographed gym whiteboard into stored scores, replicating exactly what happens when Chris types a score into the **coach results modal**.

## ⭐ The mental model (don't get this backwards — S386 mistake)
The **coach results modal (score-entry) is the single entry point.** One score saved there fans out automatically to everything:
- `wod_section_results` (WSR) → **coach results modal** AND the **athlete leaderboard**
- `lift_records` → the **athlete Lifts/Records** view

So when replicating it by script, **always write BOTH tables together, as one unit.** WSR is the primary target (it's what the coach modal reads); `lift_records` is its paired write. Never do one without the other, and never treat WSR as an afterthought (in S386 I wrote lift_records + leaderboard first and had to be reminded about the coach modal — wrong order, wrong framing).

---

## Definitive name map
`Chris Notes/Forge app documentation/Athletes booking list.md` — the source of truth for **whiteboard alias → registered athlete**. Format `Alias1, Alias2 - Full Name`, split into KIDS / ADULTS. Match every whiteboard name through this list. If a name isn't there, ASK Chris (new athlete / kid / parent-only / one-off drop-in / unregistered whiteboard-only) — don't guess.

## Canonical lift names (whiteboard shorthand → `lift_records.lift_name` / section `lifts[].name`)
- OHP → `Strict Overhead Shoulder Press`
- PP → `Push Press`
- BS → `Back Squat`, FS → `Front Squat`, OHS → `Overhead Squat`, DL → `Deadlift`
- Confirm any unfamiliar shorthand against existing `lift_records.lift_name` values before writing.

---

## Steps

1. **Get the image.** Stored in `whiteboard_photos`; `photo_url` is public — `curl` then Read it. One photo can cover several sessions.
   - **Label convention is 100% consistent: `YYYY Week WW.N`** (e.g. `2026 Week 25.1`, `2026 Week 25.2`) — year + ISO week number + photo index within that week. So to pull a week's boards: `photo_label ILIKE '2026 Week 25.%'` (or `workout_week = '2026-W25'`). Chris can just give the label or the session date.
   - Fallback: Chris gives a file path (ask for it — don't search his disk).

2. **Transcribe to a verification table** — Athlete · Lift · Type (3RM/1RM/5RM…) · Value. Flag any uncertain cell with ⚠️. **Never write blind.**
   **Accuracy measures (the S386 lesson — a plausible wrong digit slipped through: read 45, was 40):**
   - **Two independent read passes.** Read the board, then re-read each numeric column a second time WITHOUT looking at the first answer; flag every cell where the two passes disagree. This is the main defence against a confident single misread.
   - **Zoom per cell.** For the values actually written, read a cropped/zoomed region of each number, not the whole-board image — digit accuracy is much higher.
   - **Flag confusable tails.** Any last digit that could be 0-or-5 (or 1-or-7) gets a ⚠️ even when I think I know it — these are the silent failures.
   - **Cross-check vs history.** Compare each registered athlete's new lift to their existing `lift_records` range; flag anything out of range. (Note: the 1RM ≥ 3RM check is necessary but NOT sufficient — 45 ≥ 37.5 looked valid.)
   - Ask Chris to verify the ⚠️ cells **against the photo**, not just by reading my table (a plausible number rubber-stamps too easily).
   - **Decimals are dots** (Chris writes `37.5`, never a comma). Board-writing tips Chris follows: `Chris Notes/Forge app documentation/Whiteboard writing tips.md`.
   - **The letter after a first name is a CAPITAL surname initial** (S389 misread: read "Thomas G" as "Thomas h"). All surname initials on the board are capitals — `Thomas G` = Graf, `Thomas H` = Herbst, `Anna K`/`AnnaKr` = Krautwald. Never treat that letter as part of the first name. When the initial is ambiguous, **reconcile against who is actually booked** in the session (Thomas Graf was booked, Herbst wasn't → it's Graf). The booking list is the tiebreaker.

   **Scaling tier + load convention (S389) — for KB / barbell metcons with weighted tiers:**
   - Chris records **both a scaling level (Rx/Sc1/Sc2/Sc3) AND the actual load** so the leaderboard ranks *within* a tier by weight (Sc3 @ 6kg ranks above Sc3 @ 4kg).
   - The tier comes from the section's prescription, which is **gender-split `W/M`** (e.g. KB BOR `16/24kg, 12/20kg, 8/16kg` → Rx=W16/M24, Sc1=W12/M20, Sc2=W8/M16, Sc3=below). Read gender from `members.gender` (`F`/`M`) — don't infer from the name.
   - **In-between weights take the lower tier they clear**, and the load differentiates (woman @ 10kg ≥ Sc2's 8 but < Sc1's 12 → `Sc2`, load 10). Write `scaling_level` = tier on the metcon WSR alongside `weight_result` = load.
   - When the board writes "Rx" instead of a number, fill the prescribed Rx load (men's vs women's column). Apply tiers **consistently across every session of the same workout** — if one session has tiers and another doesn't, the pooled leaderboard ranks wrong.

3. **Chris verifies** the table against the photo and corrects misreads. This is the safety net — these are permanent PRs.

4. **Resolve names → members** via the list above. Map each athlete to their **confirmed session** (via `bookings`) to get the correct `lift_date` / session. Surface anyone booked in two sessions, or not booked at all.

5. **Read each session's wod sections.** RM lift sections have `scoring_fields.load=true` and a `lifts[0]` carrying `{ name, rm_test }`. Map each board value to its section by **lift name + rm_test** (don't hardcode section IDs — they differ per wod, esp. after a copy).

6. **Write (INSERT-only, deduped, scoped; dry-run first):**
   - **Registered athletes — write both, together:** (a) `wod_section_results` (`section_id = "<section.id>-content-0"`, weight in `weight_result`, `member_id` + `user_id`, `whiteboard_name` null) → coach modal + leaderboard; (b) `lift_records` (`user_id`, `lift_name`, `weight_kg`, `reps`, `rep_max_type`, `calculated_1rm` = Epley for >1 rep else null, `lift_date`) → Lifts records. For this gym `member.id == auth user id`.
   - **Whiteboard-only / unregistered** → `wod_section_results` with `whiteboard_name` only (no `lift_records` possible). Or Chris enters via the app.
   - A member must have a **confirmed booking** on the session for their WSR row to show in the coach modal — book them if needed (no 10-card debit: `ten_card_consumed:false`).

7. **Verify one session first** in the coach results modal, get Chris's OK, then roll out the rest.

8. **Parity check:** `npx tsx scripts/check-wsr-liftrecord-parity.ts` → expect "✅ Parity OK".

9. **Commit** the recovery script for traceability.

## Templates to copy
- `scripts/restore-week7-ohp-pp-liftrecords.ts` — lift_records write
- `scripts/restore-week7-ohp-pp-wsr.ts` — WSR write (lift→section by name+rm_test, user_id resolve, dedupe)
- `scripts/link-jenny-whiteboard-to-pascal.ts` — link a whiteboard alias to a member across all their sessions

_(See the ⭐ mental model at the top — coach modal = single entry point, both tables written together. Writing only one leaves the other empty: the S386 trap.)_
