# Session 322 — Open Gym Redesigned at Booking Level + Trial Chip Name Match

**Date:** 2026-04-27 (Opus 4.7)
**Trigger:** S321 carry-overs — verify late-cancel TZ fix, trial chips, Coach Remove. Chris reported trial chips all showing the same amber color (the green-for-registered didn't fire). Then redesigned Open Gym entirely.

---

## Trial chip fix

### Symptom

S321 added green chips for trial athletes whose names match a `members.whiteboard_name`. Live test: every chip on Admin → Attended showed the same amber color. Daniela Simm (registered last week) should have been green.

### Diagnostic

Spelling check first — Chris confirmed trial name was "Daniela" (one L), not "Daniella". Could be a `whiteboard_name` typo on her member row.

But Chris's actual rule: `whiteboard_name` is legacy. Most new registrations don't get one — it's a field for athletes who used the gym pre-app and haven't yet registered in the system (on holiday, ill, etc). Going forward, almost all new members will have `whiteboard_name=null`. Setting it manually for every new registration just to make a coach panel chip turn green is not how the system should work.

### Fix

[app/coach/admin/page.tsx:272](app/coach/admin/page.tsx#L272) — the registered-name set now unions `members.name`, `members.display_name`, AND `members.whiteboard_name` (case-insensitive, trimmed). Drop the `.not('whiteboard_name', 'is', null)` query filter — we want all members. Trial names are entered by coaches as they expect the athlete to register, so the eventual registered name will match.

```ts
const registered = new Set<string>();
for (const m of members || []) {
  for (const v of [m.name, m.display_name, m.whiteboard_name]) {
    const s = v?.trim().toLowerCase();
    if (s) registered.add(s);
  }
}
```

Daniela Simm's chip will turn green automatically once she's registered, no manual `whiteboard_name` setup needed.

---

## OG (Open Gym) redesign — booking-level

### Old design (removed)

`wod_section_results.open_gym BOOLEAN` — a per-section flag set at score-entry time via a small "OG" chip in the AthleteScoreRow. Used by leaderboard to push OG entries to the bottom (below DNF). Athletes appeared in score entry like everyone else; coach manually flagged them.

### What Chris actually wanted

> "OGs during a Workout are edge cases ... If I could select an Athlete within the Session Management modal and allocate them with 'OG'. If no OG athletes are booked, calendar card shows as normal, if one exists another chip appears under the booked chip with the number (usually 1) and OG. So we have a total booked for the Workout plus the OG athlete/s. OG athletes don't count towards class limits."

OG is a **booking-level concept**, not a score-entry concept. An OG athlete is admitted to the session but isn't doing the WOD (returning from injury, rehab, pregnant). They don't count toward capacity. They don't appear in Score Entry.

Edge case: OG athlete changes their mind and does the WOD. Coach toggles OG off in Session Management → athlete reappears in Score Entry → score normally.

### Data model

Add `bookings.is_og BOOLEAN NOT NULL DEFAULT false`. OG is a modifier on a confirmed booking — `confirmed + is_og=true` = "attending as Open Gym, off-capacity." A `late_cancel + is_og` row is possible if an OG athlete cancels late. Rejected: a separate `attended_og` status enum value, because it would force inventing OG-variants of every existing status.

Plus drop the legacy `wod_section_results.open_gym` column. Chris confirmed only 1 historical OG row exists (last week); it's of no consequence.

[database/add-is-og-to-bookings.sql](database/add-is-og-to-bookings.sql):
```sql
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS is_og BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_bookings_session_is_og
  ON bookings (session_id) WHERE is_og = true;
ALTER TABLE wod_section_results DROP COLUMN IF EXISTS open_gym;
```

### Touched files (15)

| File | Change |
|:---|:---|
| `database/add-is-og-to-bookings.sql` (new, gitignored) | Migration |
| `app/api/bookings/create/route.ts` | Capacity check excludes `is_og` |
| `hooks/coach/useCoachData.ts` | Splits `confirmed_count` (non-OG, counts toward cap) and `og_count`; tooltip suffixes OG names with " (OG)" |
| `hooks/coach/useWorkoutModal.ts` | `booking_info` shape gains `og_count?: number` |
| `components/coach/CalendarGrid.tsx` | Wraps booked pill + new blue "N OG" pill in `flex-col` when `og_count > 0` |
| `hooks/coach/useSessionDetails.ts` | Booking type gains `is_og`; SELECT includes the column |
| `hooks/coach/useBookingManagement.ts` | New `handleToggleOg(bookingId, name, isOg)` — direct Supabase PATCH |
| `components/coach/BookingListItem.tsx` | New `showOgBtn` + `onToggleOg` props; renders blue OG badge next to athlete name when `is_og`; OG toggle button in actions row |
| `components/coach/SessionManagementModal.tsx` | Header line splits to "Confirmed (X/cap) · M OG"; ManualBookingPanel uses non-OG count for capacity gate |
| `app/api/score-entry/[sessionId]/route.ts` | Bookings query `.eq('is_og', false)` — OG athletes filtered from Score Entry |
| `components/coach/score-entry/AthleteScoreRow.tsx` | OG chip + DNF/OG mutual-exclusion logic removed |
| `hooks/coach/useScoreEntry.ts` | `open_gym` removed from `AthleteScoreValues`, `emptyScoreValues`, prefill, save payload, two empty-checks |
| `app/api/score-entry/save/route.ts` | `open_gym` removed from `ScoreEntry` interface, `isScoreEmpty`, both upsert payloads |
| `utils/leaderboard-utils.ts` | OG tier removed; tier collapses to `0=real, 1=DNF`; output omits `openGym` |
| `components/athlete/LeaderboardView.tsx` | OG chip removed from two result-cell renderers; `open_gym` removed from three SELECTs |
| `app/coach/admin/page.tsx` | (Trial chip fix from earlier in session, bundled in same commit) |

---

## Pushback caught wrong direction

When asked which option made sense for an OG athlete who decides to do the WOD, I proposed (A) auto-locked, citing Chris's comment "we don't need the extra OG chip in the Results pop-up." Chris corrected: that quote means OG doesn't belong in Results modal **at all** (the score-entry server-side filter handles it), not that the override should be locked. The "did the WOD" scenario needs (B) overridable.

He then asked for the least-work / risk option → B1 (override flips only `wod_section_results.open_gym`, not `bookings.is_og`). But the score-entry filter means OG athletes don't appear in Score Entry to override in the first place. Net result: **no override path needed inside Score Entry; coach toggles OG off in Session Management and the athlete reappears.** Cleaner mental model than I first proposed.

Saved in feedback memory style: don't chain inferences from one offhand quote. The quote ruled out the chip in Score Entry, not the override behavior.

---

## Migration ordering trap

Chris hit "Error fetching WODs: {}" on local because [hooks/coach/useCoachData.ts:58](hooks/coach/useCoachData.ts#L58) SELECTs `is_og` before the column exists in the DB. Supabase error stringifies as `{}` so the cause was hidden — the empty-object diagnostic is a known sign of this class of bug (same pattern as S318's booking-error toast).

Documented as a landmine. Run migration BEFORE deploying code. Improving the `fetchWODs` catch block to extract `.message`/`.code`/`.details` is added to Next Immediate Steps as low priority.

---

## Carry-over for next session

1. Run [database/add-is-og-to-bookings.sql](database/add-is-og-to-bookings.sql) in Supabase SQL Editor.
2. Deploy.
3. Live-verify OG flow end-to-end on the deployed app (see "⚡ Next Session Kickoff" in [memory-bank/memory-bank-activeContext.md](memory-bank/memory-bank-activeContext.md)).
4. From S321 still: late-cancel TZ fix in a real cancellation (Chris will wait for one organically).

---

## Notes

- TS clean throughout. Single bundled commit per checklist default — trial chip fix, OG redesign, and dead-code cleanup all in one logical changeset (the trial fix and OG redesign are both Admin/Booking-area changes for the same session).
- 15 files modified; SQL migration file is gitignored (`*.sql`), kept locally and run via Supabase SQL Editor — same workflow as S319's `fix-rebooking-constraint-v2.sql`.
- No new `feedback_*.md` memory files written. The "don't chain inferences from one offhand quote" lesson is contextual to OG and not a durable rule.
