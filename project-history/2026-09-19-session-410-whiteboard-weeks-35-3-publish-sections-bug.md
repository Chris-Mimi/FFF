# Session 410 — whiteboard entry (weeks 35 + 3), publish_sections bug, RM-load audit

**Date:** 2026-09-19 · **Model:** Opus 5
**Status:** 5 commits, all pushed, tsc + lint + build clean. 72 score rows + 3 lift_records written.

---

## 1. Week 35 whiteboard entry — 53 rows, 7 sessions (`63d4359`)

Boards `2026 Week 35.1` + `35.2`. `scripts/enter-week35-whiteboard.ts`.

**Names resolved through each session's own confirmed bookings, not board order** — every
block matched a session's booking list *exactly*, which is what makes the splits provable
rather than guessed (Mon 24.08 first-7 / last-9; Wed 26.08 three groups; Fri 28.08 first-6 /
rest). Method worth repeating: build the resolver so it throws unless a name maps to exactly
one confirmed booking in that session.

**Chris's field-mapping decisions** (the board carried more metrics than the sections had fields):
- **28.08 S2OH AMRAP:** `reps` = S2OH + DUs summed; `max_time` = bar hang + HS hold summed.
  He switched `reps` + `max_time` on in the WOD first — the section originally had only
  `load, scaling, scaling_2`, so **18 rows had nowhere to go**. Same shape as the S396 mid-task
  field add. *Check the section can hold the board's metrics before transcribing.*
- **26.08 18:30:** three station scores summed into the rounds field.
- **24.08:** everyone Rx on the Russian Twist; Michael W's "Sc1 15kg" is the **barbell** load.
- **26.08 17:15:** everyone Rx on the Handstand Hold; the written Rx/Sc is the **DU** scaling.
  The "Sc" on the plate/thruster column has no field on that section — ignored.

**Left out at the time, all since completed by Chris manually:** Martina (28.08 17:15, board
reads an impossible `4:70` hang + 15-or-13 load + Lunge ×40 for DUs), and Sabrina's + Steven's
plate/thruster loads. Justine + Daniela Struben had a ditto+smiley = took part, no score.

**Verification artifact.** Published a side-by-side page (both boards embedded + tables +
flagged cells) so Chris could check against the photos rather than a terminal table:
<https://claude.ai/code/artifact/946e98a8-2c2c-4b80-9ab6-e66df518a95f>

## 2. Week 3 whiteboard entry — 19 rows, 3 sessions (`dbed0d6`)

Board `2026 Week 3.1`, left block. `scripts/enter-week3-whiteboard.ts`.

**Headed `12.1.26` but covers three sessions, not two.** 17:15 (11) + 18:30 (4) matched
bookings exactly; the **last four names were a different day** — Chris confirmed they did the
same WOD on **14.01 at 09:30**, and those four are exactly that session's bookings.
**Lesson: a dated block header is not a session boundary.** The booking match is.

Board columns mapped 1:1 (Barbell HPC → load, T2B → scaling, R+R → rounds_reps). Board's
"Ninja" is **Minja Dogan** — resolved via the bookings, not by name-guessing. Senol has a load
and a scale but no score; saved that way. The Tabata drills section has no board column and was
deliberately left unscored.

## 3. Nils Weihe — 3 missing lift_records restored (`2c6f849`)

Parity check flagged 3 weighted RM results with no `lift_records` row (Back Squat 1RM 65 /
3RM 60 on 23.03, Pendlay Row 5RM 50 on 25.03).

**Root cause, from Chris:** the scores were entered under his **whiteboard name**, so no
lift_record was possible at the time. Linking the rows to his login profile later **relabels
the WSR rows but never creates the paired lift_records** — the score shows on the workout while
the athlete's Lifts/Records page stays empty. Same family as the S394/S395 approve-migration
gaps. Restored from the WSR rows (weight + date re-verified against the live rows before
inserting). Parity now **✅ OK across all 908** weighted RM results.

## 4. 🐛 `publish_sections` has two writers that disagree (`ceca307`)

**Reported:** entered 12 Sumo Deadlift scores on the 30.01 Foundations WOD, then the section
vanished from the scoring modal.

**Scores were never lost.** The column `wods.publish_sections` gates whether a section renders
in the coach modal and on the leaderboard — and it has two writers:

| Writer | Behaviour |
|:---|:---|
| score-entry save route | **appends** the scored section (so it renders) |
| publish dialog → `google/publish-workout` | **overwrites** with the coach's ticked sections |

Chris renamed the workout and re-published at 15:11; scores had saved at 15:07. The re-publish
replaced the list with the dialog's selection, and the appended entry was gone.

**Diagnosis method worth reusing:** compared `wods.updated_at` against the latest
`wod_section_results.updated_at` — a WOD saved *after* its scores is the fingerprint. Both
occurrences showed it (15:11 vs 15:07; 08:23 vs 08:22).

**Fix:** the publish route now unions the dialog's selection with every section that already has
a WSR row, so a re-publish can never blank a scored section.

**Sweep of all 3,726 WSR rows found exactly 2 occurrences.** The other (2026-04-24) turned out
to be a **different, benign** thing — see below.

**Not changed:** *un*publishing still sets `publish_sections: null`, which blinds the coach
modal the same way. Left alone because suppressing athlete visibility is the point of
unpublishing — but it's an open decision.

## 5. The 24.04 "orphans" were duplicates — and my RM-load alarm was wrong

Two corrections I made mid-session, both worth recording so they aren't re-derived:

**(a) 24.04 Front Squat Testing — not data loss.** The 5 scores on the deleted section are
**exact duplicates** (80/75/45/42.5/40) of 5 live ones. Chris entered them on 28.04, replaced
the Strength section, re-entered the same five on 30.04. The old rows are invisible leftovers.
The restore script's guard (section must still exist on the wod) correctly refused to "fix" it.

**(b) 137 weights are NOT at risk — I misread the S385 condition.** New audit
`scripts/audit-rm-sections-load-off.ts` found **22 RM sections across 555 wods** with
`scoring_fields.load` not true, 20 holding **137 weights**. I called it the S385 signature. It
isn't:

- the edit-cleanup clears `weight_result` only on `oldSf[field] === true && newSf[field] !== true`
  — a genuine **true → false** flip ([useWODOperations.ts](../hooks/coach/useWODOperations.ts));
- on all 20, `scoring_fields` is **entirely unset**, so `load` is `undefined`, never `true`,
  and the clear **cannot fire**;
- [useScoreEntry.ts:155-162](../hooks/coach/useScoreEntry.ts#L155-L162) already **synthesises
  `load: true`** for any section holding an `rm_test` lift, which is why the weights were
  enterable and display correctly all along.

**So setting `load: true` "for consistency" would move them from a state where the wipe is
impossible into the only state from which a later toggle-off can wipe them.** Deliberately not
done. The audit script is committed (`8caa326`) so the state stays visible and a real
`load: false` regression is easy to spot.

---

## Carry-overs

- **Nothing to verify from S410** — every write was verified in-session (suffix, member_id,
  user_id, publish_sections, no dupes) and both boards were checked by Chris before writing.
- The publish fix goes live on the **next Vercel deploy**.
- Open decision: unpublish clearing `publish_sections`.
- Left alone on purpose: the 20 RM sections with unset `scoring_fields`; the 5 duplicate
  Front Squat rows on 24.04.
- Chris has since entered Martina, the Sabrina/Steven loads, and the rest of board 3.1 himself.
- The S402–S408 verification backlog is **still parked**, untouched since S409.
