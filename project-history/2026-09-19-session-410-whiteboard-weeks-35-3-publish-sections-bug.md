# Session 410 — whiteboard weeks 35 + 3, publish_sections bug, athlete history search

**Date:** 2026-09-19 · **Model:** Opus 5
**Status:** 9 commits, all pushed, tsc + lint + build clean. 72 score rows + 3 lift_records
written. Two of my own conclusions corrected mid-session (§5, §7) — both recorded because
each nearly caused a wrong "fix".

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

Verification artifact (boards embedded beside the tables, so Chris checked against the
photos not a terminal dump): <https://claude.ai/code/artifact/946e98a8-2c2c-4b80-9ab6-e66df518a95f>

## 2. Week 3 whiteboard entry — 19 rows, 3 sessions (`dbed0d6`)

Board `2026 Week 3.1`, left block. `scripts/enter-week3-whiteboard.ts`.

**Headed `12.1.26` but covers three sessions, not two.** 17:15 (11) + 18:30 (4) matched
bookings exactly; the **last four names were a different day** — Chris confirmed they did the
same WOD on **14.01 at 09:30**, and those four are exactly that session's bookings.
**Lesson: a dated block header is not a session boundary.** The booking match is.

Columns mapped 1:1 (HPC → load, T2B → scaling, R+R → rounds_reps). Board's "Ninja" is
**Minja Dogan**, resolved via bookings not name-guessing. Senol saved with load+scale, no
score. Tabata drills section has no board column — left unscored.

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

**(a) 24.04 Front Squat Testing — not data loss.** Those 5 scores are **exact duplicates**
(80/75/45/42.5/40) of 5 live ones: entered 28.04, Strength section replaced, re-entered
30.04. Invisible leftovers. The restore script's guard (section must still exist on the wod)
correctly refused to "fix" it.

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

## 6. Distance input took tenths of a metre (`7fd147d`)

`step='0.1'` let the spinner move in tenths and accepted 400.5m; calories (the comparable
field) sets no step at all. Now `step='1'`. `ScoringFieldInputs` is shared, so the athlete
logbook was fixed too. All 54 stored values were already whole — no data change.

## 7. Athlete workout-history search (`3de885a`, `ad02cdf`)

Athletes could only find a past score by knowing its date — no search existed anywhere in
the athlete app. Shipped a Search view in the Logbook (`utils/athlete-history-search.ts`,
`hooks/athlete/useHistorySearch.ts`, `components/athlete/logbook/HistorySearch.tsx`):
browse chips + type-ahead, scores inline, jump to the leaderboard.

**Two approaches were built and thrown away — that's the value here:**

1. **Catalogue matching via `matchAllSectionsExercises` — FAILED on live data.** It looks
   for the exact catalogue name in the text, so "Jump Rope Double-Unders (DUs)" never
   matched the written "Jump Rope Double-Unders". On the 28.08 workout it returned five
   warm-up drills and **zero** real movements. Typecheck said nothing; only running it
   against a real athlete exposed it. **Never make that matcher the backbone of something
   that must be complete** — it's tuned for the coach's Movement Info bar where a missed
   chip is free. Left untouched.
2. **Exercise `acronym` as fallback — rejected.** Internal codes (PLVR, BUT, ARR), not
   whiteboard shorthand. "BUT" would match the word.

**What worked: the workout NAME is the index.** All 556 wods have a `workout_name` and
Chris writes it as the movement list ("Run, T2B, Burpee, Bear Crawl, WBs"). Splitting on
`,`/`&` yields the gym's vocabulary — Push-up 43, Pull-up 35, PP 31, DUs 25, T2B 21, BJ 19
— in the shorthand athletes read on the whiteboard. **Chris volunteered this**; it's the
decision that made the feature work.

**Only published sections are searchable.** Warm-ups/drills never reach athletes, and the
Whiteboard Intro holds athlete names as body text. Mirrors `getPublishedSections`.

**Type-ahead cap 8 → 25 + scrollable (`ad02cdf`).** On Chris's 194-term history, 18 of 22
prefixes overflowed 8 ("pull" hid 3, "kb" 11). For a feature premised on athletes not
recalling terms, dropping matches defeats it.

Verified live: Chris 93 workouts/194 terms in 18ms, Miriam 95/196 in 2ms. Each athlete sees
only their own terms (194 of the gym's 387), confirmed-bookings only. Of 3,659 member score
rows, just 2 lack a confirmed booking — negligible edge.

## 8. "Skierg" → "SkiErg" rename — assessed safe, Chris made the change

All name matching is case-insensitive (`section-video-matcher.ts:66-68,107-108`;
`useMovementTracking` too); everything else links by exercise **id**. Clincher: workout text
was *already* mixed — `Skierg` x253, `SkiErg` x66, `skierg` x5 across 176 wods, working
fine. Catalogue already held "C2 SkiErg Alternating Arms" capitalised, so the rename removed
an inconsistency. Slug `c2-skierg` untouched. Residual: `SkiErgs` (x3) matches neither.

## 9. Chris deleted a booked session — and NOTHING told the athletes

He deleted the 20.09 10:00 session (12 athletes booked). Bookings were **cascade-deleted**
with it: 0 orphans across all 4,595 rows, and the wod went too.

**Recovery attempt.** Local backups were 18 days old (1 Sep) — useless, all 12 bookings
were made this week. `notification_log` yielded only **4** names (Teemu, Julia, Rosita,
Lukas) with timestamps. Chris reconstructed the rest from the Workouts-page selection.
Mid-investigation I wrongly doubted the 4 because Teemu's "20. Sept" notification sat
beside a booking for 14.09 — the real explanation is that he booked **two** sessions in one
action and only the 20.09 row died. Multi-booking in one click is normal here (Lukas booked
3 at once); don't read one booking per notification.

**⚠️ THE REAL FINDING:** `app/api/coach/delete-session/route.ts` imports no notification
helper at all. Removing ONE booking notifies that athlete ("Booking Removed"); deleting a
whole session — far more disruptive — notifies **nobody**. Verified empirically: the last
notification of any kind that day was 13:52, hours before the deletion. All 12 still
believed they were booked. **Unfixed; needs Chris's go-ahead.**

**Second open question:** only 4 of 12 bookings left a `notification_log` trace, even
though the coach-booking path logs its own message and the search covered it. The log is
missing entries it should hold — worth investigating before trusting it for recovery again.

---

## Carry-overs

- **⭐ The athlete history search is the one thing needing a live look** — built and
  verified against real data, but never opened in a running app. Check how the chip list
  feels at ~194 terms on a phone.
- **Nothing else from S410 needs verifying** — every write was checked in-session and both
  boards were verified by Chris before writing.
- **Three athlete-facing changes ship on the next Vercel deploy:** history search, the
  whole-metres input, and the publish fix.
- **⚠️ Deleting a session still notifies nobody** (section 9). Chris's call.
- **Open:** `notification_log` recorded only 4 of 12 bookings for the deleted session.
- Open decision: unpublish clearing `publish_sections`.
- Left alone on purpose: the 20 RM sections with unset `scoring_fields`; the 5 duplicate
  Front Squat rows on 24.04.
- Chris entered Martina, the Sabrina/Steven loads, and the rest of board 3.1 himself.
- Chris renamed "C2 Skierg" → "C2 SkiErg"; slug unchanged.
- The S402–S408 verification backlog is **still parked**, untouched since S409.
