# Session 325 — Coach 10-card holder-walk parity, leaderboard orphan-section bug, cascade-delete on WOD edit

**Date:** 2026-04-29 (Opus 4.7)
**Trigger:** Chris flagged that adding Adrian Jacht (one of Miriam's three kids who share her 10-card) to a workout from Session Management didn't decrement Miriam's card. S324's holder-walk fix landed in the API route but missed the coach-side direct-supabase write path.

---

## Fix 1 — Coach manual booking holder-walk parity

S324 added the holder-walk to `/api/bookings/create` and `/api/bookings/cancel`, but the **Session Management modal "Add Member"** path bypasses both — it inserts directly via Supabase from `hooks/coach/useBookingManagement.ts`. Adrian was registered as `member` type with `primary_payment_method='ten_card'` and `ten_card_holder_id=Miriam.id` — i.e. the new S324 model, where his own `membership_types` array doesn't contain the literal `'ten_card'` string. The pre-S324 check at line 80 (`selectedMember.membership_types?.includes('ten_card')`) returned false, so no debit fired anywhere — not Adrian's, not Miriam's.

Fix mirrors the API route logic via `getEffectivePaymentMethod` from `types/member.ts`. Two functions updated:
- `handleManualBooking` — debit holder's `ten_card_sessions_used` on confirmed booking
- `handleCancelBooking` (Remove refund block) — refund holder's card

Both walk to `ten_card_holder_id` if non-NULL, otherwise debit/refund the booking member's own card. `handleLateCancel` and `handleMarkNoShow` correctly leave `ten_card_sessions_used` untouched (the original booking already debited; late cancel still counts; no-show keeps the debit; undo doesn't refund).

Type plumbing: `useSessionDetails.Member` interface gained `primary_payment_method` + `ten_card_holder_id`. `lib/coach/bookingHelpers.ts` Member interface mirrored the same fields to keep `filterAvailableMembers` type-compatible.

Commit `7ae38b1`, pushed mid-session. Chris re-tested by removing Adrian's existing booking and re-adding — Miriam's card decremented.

---

## Fix 2 — Score-entry gender sort

Chris asked the Results modal to list girls first (alphabetical), then boys (alphabetical), matching how he writes them on the whiteboard.

`app/api/score-entry/[sessionId]/route.ts` now SELECTs `members.gender`, carries it through booked + whiteboard + trial entries (whiteboard/trial = null), and sorts the final list `F → M → null` then alphabetical by name. Whiteboard-only and trial entries (no gender data) sort to the bottom. `ScoreEntryAthlete` interface gained `gender: 'M' | 'F' | null`. Single sort, server-side, before the response.

Commit `8cfd416`. Chris confirmed working.

---

## Fix 3 — Leaderboard `formatResult` extras gating

Chris reported that the Push-up Strict section on the Leaderboard showed scaling + reps **plus** stale `kg`, `metres`, `cal` extras from a prior section schema. Section currently has `scoring_fields={reps, scaling}` only, so those extras were orphan field values left in `wod_section_results.weight_result` / `metres_result` / `calories_result` from when the section was scored on more fields.

`utils/leaderboard-utils.ts` `formatResult` gained an optional 3rd parameter `scoringFields?: ScoringFieldsForFormat`. When provided, gates each "extras" branch on whether the section actually scores that field (`load`, `metres`, `reps`, `calories`). Backward-compatible: undefined → renders all non-null fields (legacy behavior).

`components/athlete/LeaderboardView.tsx` derives `selectedSectionScoringFields` from the selected WOD + section index, passes to both `formatResult` call sites (table cell + ShareButton resultValue).

Side effect: this fix exposed a deeper bug (Fix 4 below) by removing the visual "noise" that had been disguising it.

---

## Fix 4 — Leaderboard positional sibling-index bug

After Fix 3 deployed, Chris saw a worse symptom: the same 11 athletes from the 17:15 class all displayed **uniformly 46 reps Rx** on the Push-up Strict leaderboard, while the Score Entry modal showed correct varied scores (16, 26, 31, 32, 32, 36, 36, 37, 40, 41, 42).

Wrote `scripts/diagnose-mon-wod-46reps.ts` (service role, per `claude-rules.md`). Findings:

- WOD `e525ad95` had **143 wod_section_results rows** total: 7 current sections × 11 athletes + **66 orphan rows across 6 dead section_ids** (sections that had been removed from the WOD's `sections` JSONB).
- The actual Push-up Strict section had correct varied data — none of its 11 rows had `reps_result=46`.
- **7 sibling WODs all named "WOD - Strict Movements..."** for 2026-04-22 (Chris's "edited multiple times" workflow created duplicates via the per-session WOD creation path in `useWODOperations.ts`).
- Sibling `11d9690d` had the orphan section `section-1765536331392` (the one with all 11 rows at 46 reps) sitting at **the same array index (index 7)** as Push-up Strict in `e525ad95`.

The leaderboard's grouped-mode logic at `LeaderboardView.tsx:884-891` mapped `selectedItem.sectionIndex` positionally onto each sibling's `sections[sectionIndex]` and aggregated those section_ids into the query. So selecting Push-up Strict pulled rows from `section-1765536331392` (the orphan, via sibling `11d9690d`) too. Then `bestResultPerUser` (which runs when `isGrouped=true`) picked the highest reps per athlete = 46 for all 11.

Fix: collapsed the grouped branch to keep `contentSectionIds = [selectedItem.contentSectionId!]` always. Sibling WOD IDs still flow through `contentWodIds`, but the section_id filter stays exact-UUID. Section UUIDs are reused across legitimate copies (a republish copies the same section objects), so cross-week aggregation still works for honest cases — it just stops grabbing wrong sections when WOD layouts diverge.

---

## Fix 5 — Cascade-delete on WOD edit (the structural fix)

Chris asked the bigger question: "We always seem to be fixing errors and cleaning up simply from me using the app as it was meant to be used."

Honest answer: layer 2 (Fix 4 positional patch) addresses the symptom; the underlying issue is that **removing a section from a WOD doesn't cascade-delete the result rows for that section**. Orphans accumulate forever, waiting to surface via some query path. Today: leaderboard. Tomorrow: analytics, exports, notifications, future features.

Layer 1 fix in `hooks/coach/useWODOperations.ts` `handleSaveWOD` (the UPDATE-existing-WOD branch only, not the duplicate-creation paths):

1. Fetch old `wods.sections` for `editingWOD.id`.
2. Compute `removedSectionIds = oldSections.filter(s => !newSectionIds.has(s.id))`.
3. If non-empty, query `wod_section_results` for matching rows (`wod_id=editingWOD.id AND section_id IN [...]`).
4. If row count > 0, show destructive `confirm()` dialog: *"Saving will delete N scores from M athletes on the section(s) you removed. This cannot be undone."* Cancel aborts the save entirely; confirm deletes rows then proceeds.
5. If row count = 0 (drafting, no scores yet, or section was just added then removed in the same edit), silently proceed with no dialog.

Edge cases handled: pure rename, reorder, scoring_fields edit (UUID stable) → never fires. Brand-new WOD draft → never fires. Out of scope: cascade to `lift_records` (deferred to follow-up); the duplicate-WOD-creation paths (those start fresh, no orphans).

---

## One-shot data cleanup

`scripts/cleanup-orphan-section-results.ts` sweeps every WOD: pulls current section IDs, finds `wod_section_results` rows with `section_id` not in that set, counts + deletes. Default dry-run; `--apply` deletes; `--wod=<id>` limits.

Dry-run results across 283 WODs:

| WOD | Date | Orphan rows |
|:---|:---|---:|
| `e525ad95` | 2026-04-22 | 66 (today's debug WOD) |
| `3dfa23cd` | 2026-03-13 | 11 |
| `725bf793` | 2026-03-20 | 10 |
| `64b90a43` | 2026-03-20 | 6 |

Total: **93 orphan rows across 4 WODs.** Chris approved sweep (`--apply`) — deleted all 93. Verification re-run shows 0 orphans remaining.

---

## Process moments worth remembering

- **A display fix can expose pre-existing bugs.** Fix 3's gating made Fix 4's symptom visible — what looked like "my fix broke things" was actually "my fix removed the visual noise that was hiding the real bug." When a display change appears to make things worse, check what the old view was masking.
- **`member_id` ≠ `user_id` in `wod_section_results`.** Chris filtered Supabase Dashboard by `member_id = (UUID from members table)` and got zero rows. Some rows have `user_id` populated and `member_id` null (athlete logbook saves), some vice versa. For inspection, write a service-role script rather than guess which column to filter.
- **Pushback caught wrong direction once.** I initially proposed Chris query Supabase Dashboard directly. Wrong column choice (above) made that fruitless. Pivoted to a one-shot diagnostic script — caught the sibling-index bug systematically rather than chasing it visually.
- **Layered fix scoping matters.** Chris's "will this stop it happening in future?" pushed me to articulate the three layers (display gating, positional fix, cascade hook) explicitly, rank them by structural value, and ship in dependency order: 2 (stops symptom) → 3 (cleans damage) → 1 (stops recurrence).

---

## Files touched

| File | Change |
|:---|:---|
| `hooks/coach/useBookingManagement.ts` | Holder-walk in `handleManualBooking` + `handleCancelBooking`; import `getEffectivePaymentMethod` |
| `hooks/coach/useSessionDetails.ts` | `Member` interface + SELECT pull `primary_payment_method` + `ten_card_holder_id` |
| `lib/coach/bookingHelpers.ts` | Member interface mirrors the same fields |
| `app/api/score-entry/[sessionId]/route.ts` | SELECT `gender`, carry through athlete sources, sort F → M → null then name |
| `hooks/coach/useScoreEntry.ts` | `ScoreEntryAthlete` interface gains `gender` |
| `utils/leaderboard-utils.ts` | `formatResult` accepts optional `scoringFields`, gates extras |
| `components/athlete/LeaderboardView.tsx` | Derive selected section's `scoring_fields`; pass to both `formatResult` call sites; collapse grouped-mode `contentSectionIds` to selected UUID only |
| `hooks/coach/useWODOperations.ts` | Cascade-delete confirm dialog before WOD UPDATE when removing scored sections |
| `scripts/diagnose-mon-wod-46reps.ts` (new) | One-shot diagnostic; service role |
| `scripts/cleanup-orphan-section-results.ts` (new) | Sweep all WODs for orphan rows; dry-run by default, `--apply` to delete |

Commits: `7ae38b1` (Fix 1), `8cfd416` (Fix 2), session-close commit (Fixes 3-5 + scripts + docs).
