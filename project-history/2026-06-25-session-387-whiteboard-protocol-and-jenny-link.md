# Session 387 — 2026-06-25 (Opus 4.8)

Whiteboard-data cleanup + a reusable protocol. No app-code changes — all data, docs, and one recovery script.

## 1. "Jenny" whiteboard name → Pascal Evghenia (`e96e39c`)

Pascal Evghenia registered after attending classes written on the board as "Jenny"; her whiteboard name was never matched to her profile. First handled the one OHP/PP session (booked her on 10 18:30 + re-keyed her 4 score rows from `whiteboard_name='Jenny'` to her `member_id`/`user_id`), then Chris pointed out "Jenny" appears across **many** workouts.

Discovery: "Jenny" was a standalone token in the **Whiteboard Intro** section text of **25 WODs** (Dec 2025 → Mar 2026), each with exactly one session. Not in `trial_names`/`drop_in_names`, no leftover WSR rows.

[link-jenny-whiteboard-to-pascal.ts](../scripts/link-jenny-whiteboard-to-pascal.ts) (dry-run first, then `--apply`):
- Booked Pascal (status confirmed, `ten_card_consumed:false`) on all 25 sessions where she had no booking (24 new + the 1 already done).
- Removed "Jenny" from each Whiteboard Intro via split-filter-rejoin (same logic as `clean-whiteboard-and-book.ts`) — every other name + parenthetical note preserved.
- Set `members.whiteboard_name='Jenny'` for a durable mapping.

Verified: 0 intros still contain "Jenny", Pascal has 25 confirmed bookings, parity clean. For this gym `member.id == auth user id`, so her `user_id` resolves to her own id.

**Claudia PP-1RM:** the S386 misread (45, should be 40) was already corrected — Chris fixed it in the coach modal, which updates WSR *and* lift_records together. No duplicate, parity clean.

## 2. Definitive adult whiteboard-name list

Found the months-old mapping at [Athletes booking list.md](../Chris%20Notes/Forge%20app%20documentation/Athletes%20booking%20list.md) (memory pointed here). Diffed it against every member who's ever been booked, fuzzy-matching on normalized first name + last-name prefix to absorb spelling variants (Hermann/Herrmann, Bratz/Braatz, Bielinski/Bielenski, umlauts). Chris triaged the unmatched; result:
- **Added 12 adults:** Anna K, Bettina, Bianca, Carla, Dani/Daniela, Emily, Felix, Felix W, Helen, Kim, Moritz, Volker.
- Fixed Dinny → Braatz. Excluded kids (Fabian, Leopold, Nico, Frida) and parents-only (Marina, Silvia, Simone, Tobias Schiegg, Nadine).
- `TobiasW ?` left open (Chris can't place him; likely a one-off drop-in — unimportant).

## 3. Whiteboard score-entry protocol (the real deliverable)

[memory-bank/whiteboard-score-entry-protocol.md](../memory-bank/whiteboard-score-entry-protocol.md) — cue *"run the whiteboard protocol for [photo]"*. Encodes the S386 workflow so it's repeatable.

Key points baked in over several iterations:
- **Photo labels are 100% consistent `YYYY Week WW.N`** → pull via `photo_label ILIKE '2026 Week WW.%'` (public `photo_url` → curl → Read). Chris gives label or date.
- **Mental-model reframe (Chris's correction):** the **coach results modal is the single entry point** — one score there fans out to WSR (coach modal + leaderboard) AND lift_records (Lifts view). Replicate as one unit, **WSR-first** — never write one table without the other (the S386 trap was doing lifts/leaderboard but forgetting the coach modal).
- Name map = the booking list; canonical lift names (OHP→Strict Overhead Shoulder Press, PP→Push Press, …).
- Templates: the two S386 restore scripts + the Jenny link script.

## 4. Transcription accuracy (S386 misread post-mortem)

Root cause of the Claudia 45-vs-40 error: a **plausible single-digit misread** (0 read as 5) — passed both my ⚠️ flagging and Chris's eyeball review because 45 ≥ 37.5 looked valid (the 1RM≥3RM check is necessary but not sufficient). Safeguards added to the protocol:
- **Two independent read passes**, flag disagreements (the main fix).
- Per-cell zoom; flag confusable 0/5 & 1/7 tails; cross-check vs `lift_records` history; verify ⚠️ cells against the photo, not the table.

Plus board-side tips for Chris: [Whiteboard writing tips.md](../Chris%20Notes/Forge%20app%20documentation/Whiteboard%20writing%20tips.md) — clear 0 vs 5, decimals as a dot (confirmed, not comma), barred 7s, aligned columns, fresh marker, square photo.

## Carry-forward
- Verify "Jenny"→Pascal renders as the registered member in the session modal.
- Fix the **saved** orphan-check SQL (`orphan_athlete_profiles` missing the `NOT IN members` clause).
- **Backup-gap audit** now easy: run the whiteboard protocol on other testing weeks in the 2025-12-09 → 2026-03-19 gap.
- Still-pending S386/S384/S383 prod spot-checks.
