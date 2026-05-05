# Session 336 — Display name "Barbell" prefix strip + 10-card chip rewrite (actual bookings + ⚠ mismatch glyph) + TenCardModal bookings list + unbooked-whiteboard probe

**Date:** 2026-05-05 (Opus 4.7)

**Triggers:**
1. Chris asked whether the "Barbell" prefix on `exercises.display_name` is doing useful work — he noticed `Barbell Front Squat` sorts away from `Front Squat Pause` in the picker, breaking grouping by movement family.
2. David Montgomery's 10-card chip showed `7/10 used` after only 5 attended sessions. Investigation revealed the counter was correct (5 past + 2 upcoming) but the badge text was ambiguous.
3. Rosita Blum's chip showed `9+1/10` after Chris retroactively booked her 6 missing whiteboard sessions. Investigation revealed Mimi had manually set the counter to 10/10 (to account for pre-app-launch usage) — leading to phantom "consumed" counts in the chip's derived math.

---

## 1. Exercise display_name "Barbell" prefix strip

`exercises.name` is UNIQUE and used as the canonical match key by the movement extractor's `genericToCanonical` map ([utils/movement-extraction.ts:40-90](utils/movement-extraction.ts#L40-L90)). `display_name` is what the picker shows + sorts by ([ExercisesTab.tsx:406](components/coach/ExercisesTab.tsx#L406), [MovementLibraryPopup.tsx:908](components/coach/MovementLibraryPopup.tsx#L908)).

Bulk-rename `display_name` only — UNIQUE invariant + canonical map both untouched, picker sort improves immediately:

```sql
UPDATE exercises
SET display_name = REGEXP_REPLACE(COALESCE(display_name, name), '^Barbell ', '')
WHERE category = 'Olympic Lifting & Barbell Movements'
  AND COALESCE(display_name, name) LIKE 'Barbell %'
  AND name NOT IN ('Barbell Row', 'Barbell Bent Over Row', 'Barbell Dead Row');
```

Excluded the three "Row" rows because "Row" alone is ambiguous (also a benchmark cardio movement on C2 Rower). 17 of 20 stripped. Migration: [database/20260505_session336_strip_barbell_prefix_from_display_name.sql](database/20260505_session336_strip_barbell_prefix_from_display_name.sql) (gitignored, ran by Chris).

**Pitfalls for new exercises** (logged in landmines): keep `Barbell` in `name`, drop it from `display_name` for the picker. Placeholders in [ExerciseFormModal.tsx](components/coach/ExerciseFormModal.tsx) already nudge this pattern.

---

## 2. 10-card chip — first iteration (checkpoint commit `8f951e8`)

The David Montgomery investigation found the chip just labeled `ten_card_sessions_used` as "used" — but the counter includes future-confirmed bookings, not just past attendance. Two-stage fix:

**Stage A (this commit):** Split chip display into `consumed+upcoming/10`:
- `upcoming = upcoming_ten_card_bookings` — count of confirmed bookings with `date >= today` debiting this card holder
- `consumed = ten_card_sessions_used - upcoming`

[components/coach/members/MemberCard.tsx](components/coach/members/MemberCard.tsx) reads `consumed+upcoming/10` (e.g. David's `5+2/10`). [hooks/coach/useMemberData.ts](hooks/coach/useMemberData.ts) gained an upcoming bookings query attributed to actual card holder via `booker.ten_card_holder_id || booker.id`.

**Stage B (this commit):** [components/coach/TenCardModal.tsx](components/coach/TenCardModal.tsx) gained a "Bookings on this card" list — every consuming booking (`confirmed`/`no_show`/`late_cancel`) since purchase date, split into Consumed + Upcoming, with date+time+status badge. Family-share rows show booker name in italic purple.

This shipped as a checkpoint commit so Chris could test the David case before continuing.

---

## 3. 10-card chip — Rosita case forced an actual-bookings rewrite (close commit)

Chris's manual flow on Rosita: ran `probe-unbooked-whiteboard-athletes.ts`, got 6 missing dates (Jan-Mar 2026), booked them via Session Management modal, hit Recalc in TenCardModal → modal showed `10/10`, chip showed `9+1/10`.

Three wrong guesses before asking directly:
- **Waitlist:** "the retroactive bookings hit capacity, went to waitlist". Wrong — Chris confirmed she's not on any waitlist.
- **Capacity check edge case:** related guess, also wrong.
- **member_id mismatch:** "maybe a duplicate member row". Wrong.

Asked one direct question. Chris: "It's a user error. Mimi manually set this card at 10/10."

Real situation: counter was 10 (manual), but actual bookings on the card were 6 past + 1 upcoming = 7. The chip's `consumed = counter - upcoming` math produced `consumed = 10 - 1 = 9` — phantom consumed sessions that don't exist as bookings. The counter and bookings disagreed; the chip silently presented derived nonsense.

### Decision: rewrite chip to read actual bookings, surface mismatch as ⚠ glyph

Three options weighed:
- **A.** Derive `consumed` from actual past bookings (honest, requires another query).
- **B.** Drop the split, show plain `X/10` from counter (loses David's improvement).
- **C.** A + a discrepancy indicator when counter ≠ actual.

Picked **C**. Chris's reasoning: "This is an edge case. Rosita has bookings on her 10-card from before I started using the app. So if someone has a card from before that time, there is no way of getting her exact number of used sessions into the system without overriding the card. This generally won't be the case. The warning scenario makes most sense — so I can see that the card has been manually overridden."

### Implementation

[hooks/coach/useMemberData.ts](hooks/coach/useMemberData.ts):
- Single bookings query (`status IN (confirmed, no_show, late_cancel)`, joined to `members` for effective method + holder lookup)
- Per-row attribution to `holder_id = booker.ten_card_holder_id || booker.id` if effective method = `ten_card`
- Bounded by holder's `ten_card_purchase_date` so previous-card bookings don't bleed in
- Split per holder into `pastTenCardMap` (date < today) and `upcomingTenCardMap` (date >= today, status = confirmed only)

[components/coach/members/MemberCard.tsx](components/coach/members/MemberCard.tsx):
- `past = member.past_ten_card_bookings`
- `upcoming = member.upcoming_ten_card_bookings`
- `actualTotal = past + upcoming`
- `mismatch = ten_card_sessions_used !== actualTotal`
- Display: `${past}+${upcoming}/10` (or `${past}/10` when no upcoming), plus a small amber **⚠** when mismatch
- Tooltip when mismatch: "10-card: 6 past + 1 upcoming = 7/10 (counter manually set to 10 — mismatch). Click to manage."
- Red `>=9` background still tied to the counter (preserves the "Mimi marked it as fully used" intent as a visual signal even when actual usage is lower)

[types/member.ts](types/member.ts) gained `past_ten_card_bookings?: number`.

### Result for Rosita

`6+1/10 ⚠` — past 6 + upcoming 1 = 7 actual; counter manually at 10. Tooltip explains. Coach can leave as-is (intentional override for pre-app sessions) or hit Recalc in the modal to clear the warning. No silent UX again.

---

## 4. Read-only probe: unbooked whiteboard athletes

Chris asked for a script to "show registered athletes who have their Whiteboard names in a session but are not officially registered". Existing `backfill-whiteboard-bookings.ts` does this in dry-run but mixes proposed bookings with skip metadata. Wrote focused diagnostic:

[scripts/probe-unbooked-whiteboard-athletes.ts](scripts/probe-unbooked-whiteboard-athletes.ts) — service-role, two sources:
1. Whiteboard Intro section names (extracted with the same parser as the backfill)
2. `wod_section_results.whiteboard_name` rows that resolve to a registered member

Output: grouped per athlete, sorted by missing count, with per-date lines including the actual whiteboard string used. Filters to ten_card-only after Chris clarified that's all he cares about.

Initial run: 9 athletes / 41 missing bookings — Anton 12, Max 8, Rosita 6, Ole 5, Fabian 4, Leopold 3, Adrian 1, Kim 1, Bettina 1.

---

## Process moments worth remembering

- **Asked design choice up front on display_name vs name.** 3 options with trade-offs sketched. Chris picked the safe one — picker sort improves with zero impact on internal canonical match keys.
- **Two-commit split.** Checkpoint shipped chip split + modal bookings list mid-session (deployable independently); close commit bundles the actual-bookings rewrite + ⚠ glyph + probe + display_name landmine.
- **Three wrong guesses about Rosita's mismatch before asking directly.** Should have asked one focused question earlier per `feedback_ask_when_unsure.md`. Chris corrected with one sentence; saved further speculation.
- **`feedback_include_todo_list.md` rule landed wrong on first save.** Initial interpretation: "include the to-do list in every relevant response". Chris clarified within minutes: "session start only". Corrected immediately + memory updated. Reasonable mistake — the original "include this list every time" was ambiguous.
- **Probe before fix.** The unbooked-whiteboard probe gave Chris evidence (9 athletes / 41 missing) before he committed to the manual booking pass. Lower commitment than building a one-shot script that auto-debits cards.

---

## Files touched

| File | Change |
|:---|:---|
| `database/20260505_session336_strip_barbell_prefix_from_display_name.sql` | NEW (gitignored) — preview + UPDATE for display_name strip |
| `hooks/coach/useMemberData.ts` | Single bookings query, split into past + upcoming per holder, bounded by purchase date |
| `components/coach/members/MemberCard.tsx` | Chip reads actual bookings; ⚠ glyph on counter mismatch |
| `components/coach/TenCardModal.tsx` | NEW "Bookings on this card" list with Consumed/Upcoming sections |
| `types/member.ts` | `past_ten_card_bookings`, `upcoming_ten_card_bookings` fields |
| `scripts/probe-unbooked-whiteboard-athletes.ts` | NEW — read-only probe, ten_card-only filter |
| `memory-bank/memory-bank-activeContext.md` | Version 198, S336 entry, kickoff, landmines, S331 rotated to history |
| `Chris Notes/Forge app documentation/Forge-Feature-Overview.md` | Coach 10-card UX upgrade entry |

TS clean throughout. Production build passes.
