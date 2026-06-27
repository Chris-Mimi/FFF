# Session 390 — Planner accuracy + whiteboard score entry + "Not done by selected" filter

**Date:** 2026-06-28 · **Model:** Opus 4.8 · **Commits:** 8 + close

---

## 1. Planner accuracy (`3952f58`)

**Reported bug:** A group ("Olympic Lift Drills") showed a grey "Never programmed" chip for "Snatch Drill: Slow Motion Snatch" even though the grid right above it had a check for the week of 2 Feb and the detail panel listed it.

**Root cause:** Two different lookback windows.
- Grid (`detectWeeklyCoverage`) gets the full visible date range → saw the 2 Feb workout.
- Chips (`computePatternGaps`) were hard-coded to a **16-week lookback** (today 28 Jun → back to ~6 Mar). The 2 Feb workout fell outside → no date → grey "Never".

**Fix:** [PlannerSection.tsx](../components/coach/analysis/PlannerSection.tsx) computes `gapLookbackWeeks = max(16, weeksBackToGridStart)` so the chip recency always covers at least the leftmost visible grid week. 16-week floor preserved for when the grid is anchored at/after today.

**Second fix (latent landmine):** `fetchPublishedWorkouts` ([movement-analytics.ts](../utils/movement-analytics.ts)) was an unbounded `.select()` on `weekly_sessions` — silently capped at PostgREST's 1000 rows. Feeds BOTH the grid and the chips. Past ~12 months of scroll-back it would drop the oldest sessions (old exercises wrongly "Never", grid dots vanish). Now paginated in 1000-row pages, ordered by date desc. The two extraction engines (`extractMovementsFromWod` / `extractMovementsWithMetadata`) were verified identical, so grid + chips agree once the window matches.

---

## 2. Whiteboard score entry via protocol (`82f35a8`, `c56d960`, `42b0bc6`)

Ran the whiteboard protocol for three photo sets. All entries: dry-run script → verify one session in coach modal → roll out the rest → parity check → commit. WSR written to mirror the coach results modal exactly (section_id `<id>-content-0`, member_id + user_id resolved via email→auth).

- **Week 26.2 — 24.06 "TGU, Run, PP, Pull-up, L-Sit" metcon (15 athletes, 17:15 + 18:30).** 6 score fields: `track` (Run ok=T1 / 600mAB=T2 — the "Trk" Chris flagged), `scaling_2` (Pull-ups), `weight_result` (PP load), `scaling` (L-Sit), `time`/`rounds_reps`. WSR-only (no RM lift → no lift_records). Jens L excluded (drop-in).
- **Week 25.2 — 17.06 RDL Testing 5RM + KB metcon (18 athletes, 17:15 + 18:30).** Two scoring sections: RDL strength → WSR + `lift_records` (lift_name `Romanian Deadlift`, 5RM, Epley 1RM); KB metcon → WSR (load + rounds/reps). Carole Schultz (OG) excluded.
- **Week 25.1 — the 16.06.26 column (16 athletes across 16.06 18:30 + 17.06 09:30).** The board mixed two sessions under one date heading; mapped each athlete to their actual confirmed session. Bonnie = drop-in (whiteboard-only, no PR). AnnaKr = Anna Krautwald, who attended 16.06 as a trial but is now a registered member — flipped her `late_cancel` booking → `confirmed` + cleared the `trial_names` entry so she's scored as a member with a real RDL PR (mirrors the app's trial→member move). Martina Fenster is OG on 16.06 → her row scored under 09:30. ThomasH was a misread of **Thomas G**(raf) — board surname initials are always capitals; reconcile against bookings.

**Gender-split KB scaling tiers (the key learning).** Chris records BOTH a scaling level and the load on weighted metcons so the leaderboard ranks within a tier by weight (Sc3 6kg above Sc3 4kg). The KB BOR prescription `16/24·12/20·8/16` is gender-split (W/M): Rx=W16/M24, Sc1=W12/M20, Sc2=W8/M16, Sc3=below. In-between weight takes the lower tier it clears. Read gender from `members.gender`. Applied tiers to **all four sessions** of the RDL+KB workout (25.1 + 25.2) for consistent pooled-leaderboard ranking. Parity OK throughout (601→634 RM results).

---

## 3. Protocol doc + data hygiene (`227186c`, `f31e8ca`)

[whiteboard-score-entry-protocol.md](../memory-bank/whiteboard-score-entry-protocol.md) gained three durable rules from this session:
- **Capital surname initial** — the letter after a first name is a capital surname initial (Thomas G = Graf, not lowercase h = Herbst); reconcile ambiguous ones against who's actually booked.
- **Scaling-tier + load convention** — gender-split tiers, in-between→lower, read `members.gender`, apply consistently across all sessions.
- **Blank gender → STOP and ask** — never silently default (a blank-gender man would be mis-tiered, e.g. 16kg as Rx instead of Sc2). 14 members had no gender; Chris filled them all in.

Also: added the `AnnaKr` alias to [Athletes booking list.md](../Chris Notes/Forge app documentation/Athletes booking list.md) (3 Annas now: Ha/Ho/Kr).

---

## 4. Mobile whiteboard close-button fix (`895fa7f`)

Coach gallery lightbox close X was positioned `absolute -top-12 right-0` — above the image. On mobile the tall image sits near the top of the viewport, pushing the X off-screen behind the status bar with no way to close (tapping the image is `stopPropagation`). Moved to `top-2 right-2` inside the image, matching the athlete photo modals. [WhiteboardGallery.tsx](../components/coach/WhiteboardGallery.tsx). Verified by Chris on Android.

---

## 5. NEW FEATURE — "Not done by selected" chip (`3793eb8`)

**Ask:** given a group of selected athletes in the Workouts panel, a chip filter that shows only workouts NONE of them has attended (so Chris can pick a workout that's new to everyone in a group).

**Key discovery that shaped the design:** selecting athletes already restricts the search to workouts they DID attend ([useCoachData.ts](../hooks/coach/useCoachData.ts) `searchWODs`, `.in('id', sessionIds)`). So filtering that list for "not done" is always empty. The chip must INVERT it.

**Implementation (4 files):**
- New [/api/coach/attended-workouts](../app/api/coach/attended-workouts/route.ts) — GET `?memberIds=…` → distinct `workout_name`s any of those members attended (confirmed bookings → sessions → wods). Service-role (RLS hides cross-member bookings), paginated.
- [useCoachData.ts](../hooks/coach/useCoachData.ts) — when `notDoneBySelected` is on: (a) skip the member-restriction (`selectedMembers.length>0 && !notDoneBySelected`) so it searches all workouts, (b) after the other filters, exclude attended `workout_name`s. Unnamed workouts kept.
- [SearchPanel.tsx](../components/coach/SearchPanel.tsx) — chip in the Results header, bound to props; disabled until ≥1 athlete selected.
- [app/coach/page.tsx](../app/coach/page.tsx) — owns the `notDoneBySelected` state, threads it to both the hook and SearchPanel.

Matched the manual analysis run earlier (8 athletes → 17 adult workouts none attended, of 107). Chris: "looks good, can tweak later" — tweak pass likely next session.

---

## Carry-over / open
- **S390 prod verify:** the new chip; Planner chip recency + scroll-back; (mobile X already verified).
- Still-pending S384/S383 spot-checks (see activeContext kickoff).
- Backup-gap audit (2025-12-09 → 2026-03-19) for other RM weeks with no DB-recoverable source — whiteboard photos only.
