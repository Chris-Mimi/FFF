# Session 340 — Link Benchmarks / Forge Benchmarks to library exercises so the planner recognises them when programmed

**Date:** 2026-05-07 (Opus 4.7)

**Trigger:** Chris asked whether free-form section content text was purely decorative for scoring/saving — it is, after S339. That follow-up surfaced a planner gap: programming a Forge Benchmark like "Concept 2 Rower: 1km" with empty section content meant the planner had no idea the rower was trained that day. The benchmark's name doesn't match any library exercise, and the planner extractor reads section content text as one of its inputs. Chris's framing: "It can't be that I program a rower benchmark and it doesn't show if it is planned."

---

## The fix — explicit master-row → library-exercise link

### Schema decision: TEXT[] vs UUID[] vs join table

Three options were on the table:
- **TEXT[] of canonical names** — simple, mirrors the existing `ConfiguredBenchmark.exercises?: string[]` shape on the section JSONB. Brittle if exercises rename.
- **UUID[] of `exercises.id`** — referentially stable but requires resolution every read.
- **Many-to-many join table** — most normalised, most ceremony.

Picked TEXT[] — the planner extractor already accepts `section.benchmarks[].exercises` / `forge_benchmarks[].exercises` as `string[]`, so there's no resolution layer to write. Exercises rarely rename in this codebase. If the rename problem ever materialises, switching to UUID[] is a localised change.

### Required-field UX

Both Benchmarks and Forge Benchmarks edit modals now have a multi-select "Linked library exercises" picker. Save is blocked with a toast if the picker is empty — that's the only way to guarantee the planner sees future benchmarks without per-coach discipline.

Auto-suggest pre-fills the picker on modal-open by running the planner's text extractor over `name + description`. For most benchmarks the suggestion is right (e.g. "Concept 2 Rower: 1km" → ["C2 Rower"]). Coach reviews + tweaks rather than typing from scratch. Re-runs whenever description changes AND the picker is empty (so manual edits are preserved).

### Section JSONB snapshot

[components/coach/ConfigureBenchmarkModal.tsx](components/coach/ConfigureBenchmarkModal.tsx) and [ConfigureForgeBenchmarkModal.tsx](components/coach/ConfigureForgeBenchmarkModal.tsx) now copy the master row's `exercises[]` into the section JSONB at attach time — same shape as `name`/`type`/`description`. Snapshot consistency means historical WODs don't get retroactively rewritten when a benchmark's exercises change later (matches the rest of the WOD JSONB convention).

The planner extractor at [utils/movement-extraction.ts](utils/movement-extraction.ts) already iterates `section.forge_benchmarks[].exercises` — no extractor change needed. The wiring just had to fill that array.

### Backfill strategy

- **New benchmarks:** auto-link via auto-suggest + required-field validation. Empty arrays are impossible.
- **Existing master rows:** opening any benchmark in the edit modal triggers auto-suggest on the empty picker; coach reviews + saves. ~15 Forge benchmarks + however many Benchmarks — manual but quick.
- **Old WOD JSONB snapshots:** predate the `exercises` field. Re-saving a WOD in the editor re-pulls from master and injects the array. If coach decides this is too tedious for historical WODs, a one-shot service-role script can walk `wods.sections[].benchmarks/forge_benchmarks` and inject `exercises` from the master row by `id`. Deferred until needed.

---

## Polish round (same chat)

After the main fix shipped, Chris ran through the new flow and surfaced rough edges. All bundled into one polish commit.

- **Visible chips in MultiSelectDropdown.** "2 selected" string was unhelpful — coach had to re-open the picker and scroll the checkbox list to see what was selected. Fix: render selected items as removable teal chips below the trigger button, with an X on each chip. Generic improvement that benefits all 4 consumers ([ExercisesTab](components/coach/ExercisesTab.tsx), [MovementLibraryPopup](components/coach/MovementLibraryPopup.tsx), Benchmarks/Forge tabs).

- **Publish gate.** Coach could open the PublishModal without a Track or Workout Name set, only to fail validation when clicking the actual Publish button — confusing UX. Fix: new `canPublish()` + `requestOpenPublishModal()` in [hooks/coach/useWorkoutModal.ts](hooks/coach/useWorkoutModal.ts) — toast-and-bail before opening the modal. `handlePublish` re-checks defensively in case the modal gets opened by another path. Both `onPublishClick` handlers in WorkoutModal now wire to `requestOpenPublishModal`.

- **Red asterisks on Track + Workout Name.** Existing required-field labels (Workout Title, Max Capacity, Workout Sections) had `<span className='text-red-500'>*</span>`. Track and Workout Name didn't. Added — visual consistency with the new publish gate.

- **German guardian-only booking error.** Backend already blocked guardian-only members from booking via [app/api/bookings/create/route.ts](app/api/bookings/create/route.ts), but the message was English jargon ("Guardian-only accounts cannot book sessions"). Replaced with a German "du" message that tells the guardian *what to do* ("Füge zuerst ein Familienmitglied (z.B. dein Kind) hinzu, um einen Kurs zu buchen."). Matches the German tone of the other booking-page error toasts (S317).

- **Achievements athletes-list filter.** Scan turned up exactly one athletes-list endpoint missing `.eq('guardian_only', false)` — [app/api/achievements/athletes/route.ts](app/api/achievements/athletes/route.ts), used by the achievement-award modal. Every other "athlete list" path is either already filtering ([/coach/athletes](app/coach/athletes/page.tsx), [useCoachData](hooks/coach/useCoachData.ts), [useMemberData](hooks/coach/useMemberData.ts)), scoped by id, or joined through bookings (and guardians are blocked from booking — that booking-create gate is the load-bearing safeguard).

---

## Bundled S339-followup chip-in-modal fix

S339 added the lift/benchmark/forge chip row to the score-entry full-page route ([app/coach/score-entry/[sessionId]/page.tsx](app/coach/score-entry/[sessionId]/page.tsx)) but missed the `ScoreEntryModal` Chris actually uses from `/coach`. Both UIs share the `useScoreEntry` hook (so the saveScores cascade did fire from both — Chris's score *did* land in the leaderboard), but the render JSX is duplicated.

Mirror-applied the chip pattern to [ScoreEntryModal.tsx](components/coach/score-entry/ScoreEntryModal.tsx) and aligned the page lift-chip rep-scheme display so both UIs match. Shipped as `fix(session-339): apply S339 chip row to ScoreEntryModal (was page-only)` (commit `682afc3c`) before the S340 work began.

The diagnostic worth remembering: I assumed Chris was testing the same UI I had patched, then doubled down on cache theories when he reported "literally nothing changed". The right diagnostic move was to grep for *all* score-entry UIs early — there were two. Fast `grep -rln "ScoreEntry"` would have surfaced this in 30 seconds. Instead I burned minutes on Vercel-deploy and PWA-cache theories before Chris's specific phrasing ("it's a modal") prompted the right search.

---

## Process moments worth remembering

- **Asked design choice up front** for schema (TEXT[] / UUID[] / join table). Picked TEXT[] explicitly with a one-line rationale. Saved building either of the heavier alternatives.
- **Asked Chris one user-facing question on backfill UX** ((a) blank picker vs (b) auto-suggest pre-fill) and made every other technical decision. Chris's response was "b" + "If you guess wrong I can simply correct it right?" — confirms low-cost-of-error UX is the right framing.
- **Stopped over-engineering when Chris pushed back on jargon.** First spec response had three nested "open decisions" sections with phrases like "stale-snapshot pattern". Chris: "I don't understand how to answer this!". Reduced to one yes/no question. Useful reminder that decisions framed as "tradeoffs" aren't always tradeoffs the user can engage with.
- **Polish was iterative + responsive, not pre-planned.** Chip-display, publish-gate, asterisks, German message, achievements filter — all came up while Chris was testing the main fix. Bundling them into one commit at session close was right; trying to predict them upfront would have added scope creep.

---

## Files touched

| File | Change |
|:---|:---|
| `database/20260507_session340_link_benchmarks_forge_to_exercises.sql` | New migration: `exercises TEXT[]` columns + GIN indexes (gitignored, run manually) |
| `types/movements.ts` | `Benchmark` + `ForgeBenchmark` interfaces gained `exercises?: string[]` |
| `hooks/coach/useBenchmarksCrud.ts` | Form state + save + validation for `exercises` |
| `hooks/coach/useForgeBenchmarksCrud.ts` | Same |
| `hooks/coach/useWorkoutModal.ts` | `canPublish` + `requestOpenPublishModal` helpers |
| `components/coach/BenchmarksTab.tsx` | Multi-select picker + auto-suggest effect |
| `components/coach/ForgeBenchmarksTab.tsx` | Same; template-pick also forwards `exercises` |
| `components/coach/ConfigureBenchmarkModal.tsx` | Copy `exercises` into section JSONB snapshot |
| `components/coach/ConfigureForgeBenchmarkModal.tsx` | Same |
| `components/coach/MultiSelectDropdown.tsx` | Visible removable chips below trigger |
| `components/coach/WorkoutModal.tsx` | Both `onPublishClick` use new `requestOpenPublishModal`; Track label red asterisk |
| `components/coach/WorkoutFormFields.tsx` | Track + Workout Name labels red asterisk |
| `components/coach/score-entry/ScoreEntryModal.tsx` | Chip row mirrored from page (S339-followup) |
| `app/coach/score-entry/[sessionId]/page.tsx` | Lift chip rep-scheme aligned (S339-followup) |
| `app/coach/benchmarks-lifts/page.tsx` | Pass `availableExercises` to Benchmarks/Forge tabs |
| `app/api/achievements/athletes/route.ts` | `.eq('guardian_only', false)` filter |
| `app/api/bookings/create/route.ts` | German guardian-only error message |
| `utils/movement-extraction.ts` | Export `extractMovementsFromText` for re-use |
| `utils/benchmark-exercise-suggest.ts` | New helper: auto-suggest exercises from name/description |
| `Chris Notes/Forge app documentation/Forge-Feature-Overview.md` | New "Benchmarks/Forge count toward coverage" bullet |
| `memory-bank/memory-bank-activeContext.md` | Version 202; S340 entry; kickoff rewritten; S335 rotated to history; new landmine |

TS clean. Production build passes.
