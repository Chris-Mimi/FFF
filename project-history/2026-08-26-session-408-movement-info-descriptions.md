# Session 408 — Movement Info bar: exercise descriptions in the workout builder

**Date:** 2026-08-26 · **Model:** Opus 5
**Status:** 1 commit (`a9399bb`), pushed to `main`, tsc + lint + build clean. Chris will test live.

---

## 1. The ask

Chris was copying movement mechanics into a section's Intent/Stimulus or Notes field —
e.g. the three progressive levels in the **Ring Muscle-Up Floor Assisted drill** description.
That's duplication, and it burns the session-level fields on movement-level content. He wanted
the library's written description reachable from the create/edit modal the same way an attached
video already is.

Also asked whether the Intent/Stimulus field should be enlarged (it's `maxLength={500}` on an
auto-growing textarea, [WODSectionComponent.tsx:614](../components/coach/WODSectionComponent.tsx#L614)).
**Decision: left alone** — this feature removes the pressure on it. If it comes back, the levers are
raise the cap, and clamp the TV render (`app/tv/[id]/page.tsx` prints intent untruncated at up to
`text-5xl`, above the workout).

## 2. Why it was nearly free

The bar at the top of the modal ([MovementDemosBar.tsx](../components/coach/MovementDemosBar.tsx))
already scanned every section's text and matched names against the library via
`matchAllSectionsExercises`. Descriptions were absent for exactly two reasons:

- the fetch selected `name, display_name, video_url` — `description` was never loaded;
- the matcher hard-dropped anything without a video: `if (!ex.video_url) continue;`.

Descriptions **were** already in the Movement Library popup — but only as a native `title=` tooltip
([MovementLibraryPopup.tsx:1022](../components/coach/MovementLibraryPopup.tsx#L1022), 1094, 1165),
which truncates, drops line breaks and vanishes on mouse-out. Useless for a 529-character
multi-level drill. The content existed; the delivery was wrong.

**Coverage numbers that settled the design** (counted live, service role):

| | count |
|:---|---:|
| exercises total | 716 |
| with a `description` | **713** |
| with a `video_url` | 298 |

The bar fired on ~40% of movements; it now fires on ~100%.

## 3. What shipped (`a9399bb`)

- **[utils/section-video-matcher.ts](../utils/section-video-matcher.ts)** — keep an exercise if it has a
  video **OR** a non-empty description; carry `description` through on the match.
  `MatchedExerciseVideo` → `MatchedExerciseInfo`. **The name-matching logic itself is untouched**,
  including the S384 longest-match-wins overlap pass.
- **[components/coach/MovementInfoModal.tsx](../components/coach/MovementInfoModal.tsx)** (new) —
  read-only description panel, `whitespace-pre-wrap` so numbered drill levels keep their line breaks.
  `z-[105]`, deliberately **below** `ExerciseVideoModal`'s `z-[110]` so "Play demo video" opens on top
  of it rather than behind. Portals to `<body>` (same reason as the video modal — escapes the
  WorkoutModal stacking context).
- **[components/coach/MovementDemosBar.tsx](../components/coach/MovementDemosBar.tsx)** — each chip is now
  two buttons in one shell: **▶ plays the video** (still one click), **the name opens the description**
  (small blue ℹ marks it). Label renamed *Movement Demos* → *Movement Info*.
- **[hooks/coach/useWorkoutModal.ts](../hooks/coach/useWorkoutModal.ts)** — added `description` to the select
  and **paginated it** (see pitfall 1).

**Rejected: a separate "Movement Info" bar next to Movement Demos.** The 713/298 split means the video
set is almost entirely a *subset* of the description set, so the same movement would appear in both
rows. Two headers would also eat space above the sections in a modal that's had two sessions of mobile
space work (S402, S405). One chip carrying both affordances says the same thing without duplication.
Would have been right only if video and text served different purposes (play for the class vs read
before coaching) — Chris confirmed they don't.

**Deliberate: video stays one click.** Routing everything through the info panel first would have made
the video path two clicks — a regression on the feature Chris called "very useful".

## 4. Verified

Fed the matcher a real section against the live catalogue:

```
Ring Muscle-Up Floor Assisted drill | video:Y | desc:529ch
Back Squat                          | video:n | desc:231ch
KB Dead Bug                         | video:Y | desc:319ch
```

Back Squat is the point — no video, 231-char description, previously dropped entirely.

---

## ⚠️ Pitfalls to watch

1. **`exercises` is at 716 of PostgREST's silent 1000-row cap — and most fetches are NOT paginated.**
   This session fixed only `useWorkoutModal`. An audit found these still unfiltered/unpaginated:
   `MovementLibraryPopup.tsx:307` (`select('*')`), `useCoachData.ts:556`,
   `app/coach/analysis/page.tsx:182`, `utils/pattern-analytics.ts:42` + `:171`,
   `utils/movement-analytics.ts:60` + `:508`, `athletes/LiftsSection.tsx:49`.
   At the cap they return the first 1000 **alphabetically, with no error** — the Movement Library
   would silently lose its tail, and Planner/analysis frequency maps would quietly under-count.
   ~284 exercises of headroom. This is the S349 bug class; `exercises` has been added to the
   growing-tables list in `claude-rules.md`.

2. **False-positive chips are now likelier.** The match pool went from 298 to 713. The partial-match
   pass accepts any library name ≥4 chars appearing on a line at a word boundary, so a coaching cue
   that happens to contain a movement name can produce a chip Chris didn't intend. If junk chips
   appear, the fix is to tighten the matcher (raise the length floor, or exact-match only for
   description-only entries) — **not** to strip descriptions from the library.

3. **The count badge will jump.** It now counts everything with reference material, not just video.
   Expected. If it reads as noise, the lever is to count only video + description-on-demand, or add a
   filter toggle.

4. **Descriptions are coach-side only.** The panel lives in the coach's workout modal. Nothing new is
   exposed to athletes — this change added no athlete-facing surface. Don't assume athletes can see
   library descriptions.

5. **Renamed export.** `MatchedExerciseVideo` no longer exists (`MatchedExerciseInfo`). Only
   `MovementDemosBar` imported it, but any stashed/branch work referencing the old name will fail
   to compile.

6. **The filename `section-video-matcher.ts` is now a misnomer** — it matches descriptions too. Left
   as-is deliberately to avoid git churn; the header comment says so.
