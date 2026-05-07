# Session 338 — Leaderboard ignores disabled scoring fields + cancel-booking finds athlete-self-entered scores

**Date:** 2026-05-07 (Opus 4.7)

**Triggers:** Two unrelated bugs surfaced from the same Chris test session.

1. AKBS Deadlift leaderboard ranked Chris (T2, 47 reps · 20 kg) below Madeleine (T2, 48 reps · 12 kg) and below several T2 16-kg athletes. Visually, every displayed field said Chris should win.
2. Chris recorded a test 200kg Sumo DL on a workout he didn't actually do, then used Session Management → Remove Booking. The booking moved to `coach_cancelled` but the score persisted on the leaderboard AND the Lifts tab.

---

## Bug 1 — leaderboard read masked-but-stored fields

### Root cause

`section-1774340929806` ("WOD Pt.3", the AKBS section) had `scoring_fields.scaling: false`, so the score-entry UI hid the scaling input and `formatResult` (S325) hid the scaling badge in the leaderboard display. But the section had been edited *after* athletes saved their scores — earlier saves persisted `scaling_level = 'Rx'` (30 Mar T2 entries) or `'Sc1'` (15 Apr Chris + Irene). The ranker's primary chain is `tier → track → aggregate scaling → scoring-type`, and `aggregateScaling()` reads `scaling_level` regardless of whether the section currently exposes it. Result: Sc1 athletes silently demoted below Rx peers, with no visible explanation in the UI.

The bug isn't unique to this WOD — a service-role probe across all WODs found 21 sections totalling 146 stale rows where `scoring_fields` had a slot turned off but row data still populated it. Mostly load slots (BFS 5x5 turned off load2/load3 after results were saved; Back Squat turned off load/load2; etc.).

### Fix — defense in depth

| Layer | File | What it does |
|:---|:---|:---|
| **Read** | [utils/leaderboard-utils.ts](utils/leaderboard-utils.ts) | New `maskDisabledFields(r, sf)` masks load/scaling slots when `scoring_fields` says they're off. Both `bestResultPerUser` and `rankSectionResults` accept an optional `scoringFields` arg. Double-mask is a no-op so callers don't have to coordinate. |
| **Read** | [components/athlete/LeaderboardView.tsx](components/athlete/LeaderboardView.tsx) | Plumbs `section.scoring_fields` through `LeaderboardItem` → both ranker calls. |
| **Write (athlete)** | [utils/logbook/savingLogic.ts](utils/logbook/savingLogic.ts) | `saveSectionResult` accepts `scoringFields` arg; gates load/scaling at the upsert. |
| **Write (athlete caller)** | [components/athlete/AthletePageLogbookTab.tsx](components/athlete/AthletePageLogbookTab.tsx) | Wrapper forwards `section.scoring_fields`. |
| **Write (coach)** | [app/api/score-entry/save/route.ts](app/api/score-entry/save/route.ts) | Fetches `wods.sections` once at request start, builds a per-section field map, masks each record server-side before insert/update. |
| **Toggle-off cleanup** | [hooks/coach/useWODOperations.ts](hooks/coach/useWODOperations.ts) | When the coach's WOD edit flips a section's scoring_fields slot from `true → false`, NULLs the corresponding column on existing `wod_section_results` rows for that section. Sits next to the existing S326 removed-section cascade. |
| **Data heal** | [scripts/cleanup-stale-scoring-fields.ts](scripts/cleanup-stale-scoring-fields.ts) | One-shot: dry-run by default, `--apply` to run. Walks every WOD, NULLs columns where `scoring_fields` says the field is off. Applied — 146 rows across 21 sections. |

---

## Bug 2 — cancel-booking missed athlete-self-entered scores

### Root cause

[hooks/coach/useBookingManagement.ts:347](hooks/coach/useBookingManagement.ts#L347):
```ts
.or(`member_id.eq.${memberId},user_id.eq.${memberId}`)
```

Athlete-self-entered rows save with `user_id = auth.users.id`, which is a different UUID from `members.id`. The OR clause tested both columns against the same `memberId`, missing those rows. The lift_records cleanup is gated on `userIds.length > 0` from that same query — so when the section_results query returned empty, the lift_records deletion was also skipped silently.

### Fix

New endpoint [app/api/coach/resolve-auth-user/route.ts](app/api/coach/resolve-auth-user/route.ts) (coach-only): GET `?memberId=<uuid>` → `{ userId: string | null }`. Resolves via `members.email` → `supabaseAdmin.auth.admin.listUsers()` match.

`handleCancelBooking` now calls this before the cleanup, then uses `or(member_id.eq.${memberId},user_id.eq.${authUserId ?? memberId})`. Falls back to `memberId` if resolution fails (so the existing coach-entered match still works).

---

## Process moments worth remembering

- **Stopped guessing after the second wrong theory.** First diagnosis ("load slot mismatch between dates") was wrong — Chris pushed back: "I copied the workout, slots are identical." Second guess ("stale data from edited section") was correct, but I wrote a service-role probe FIRST this time before claiming. Probe revealed exact scaling_level values per row + per section's scoring_fields config; theory matched data exactly. Lesson: when the user mentions "5th or 6th time we've had issues with scoring", write the probe before the theory.
- **Asked "how is stale data being saved in the first place?" turned a symptom fix into a defense-in-depth fix.** Original plan was just the read-time mask. Chris's question forced the full chain (read + write + toggle-off + cleanup). Without that nudge, the same stale data would have kept accumulating with every section edit.
- **Bulk write paused for explicit go-ahead.** 146-row cleanup ran in dry-run first, presented per-section per-WOD impact summary, got "apply" confirmation, then ran with `--apply`. Matches the S240 silent-bulk-write rule.
- **Single commit for two unrelated bugs surfaced from one test.** Both came from the same Chris test session and both deploy-affect leaderboard correctness. No value in splitting; commit body covers both clearly.
- **The display-vs-rank inconsistency was the giveaway.** S325 made `formatResult` use `scoring_fields` to gate the displayed extras, but the ranker was missed. When display says "47 reps · 20 kg" with no scaling badge but the rank doesn't match the visible numbers, look for fields the ranker reads that the display hides.

---

## Files touched

| File | Change |
|:---|:---|
| `utils/leaderboard-utils.ts` | New `maskDisabledFields`; `bestResultPerUser` + `rankSectionResults` accept `scoringFields` |
| `components/athlete/LeaderboardView.tsx` | Pass `section.scoring_fields` through `LeaderboardItem` to ranker calls |
| `utils/logbook/savingLogic.ts` | `saveSectionResult` accepts `scoringFields` arg; gates load/scaling at upsert |
| `components/athlete/AthletePageLogbookTab.tsx` | Wrapper forwards `section.scoring_fields` |
| `app/api/score-entry/save/route.ts` | Fetch sections once, mask each record server-side |
| `hooks/coach/useWODOperations.ts` | Toggle-off cleanup on section save |
| `hooks/coach/useBookingManagement.ts` | Resolve auth user id via new endpoint, use both ids in OR |
| `app/api/coach/resolve-auth-user/route.ts` | New: `members.id → auth.users.id` via email |
| `scripts/cleanup-stale-scoring-fields.ts` | One-shot data heal (dry-run by default) |
| `memory-bank/memory-bank-activeContext.md` | Version 200, S338 entry, kickoff updated, S333 rotated to history, 4 new landmines |

TS clean. Production build passes. 146 rows cleaned via `--apply`.
