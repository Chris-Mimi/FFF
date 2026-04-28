# Session 324 — 10-Card Blindspots: family-shared cards, Guardian Only enforcement, Members popup edit parity

**Date:** 2026-04-28 (Opus 4.7)
**Trigger:** Chris pulled an urgent issue off the backlog — Miriam Jacht (Wellpass + 10-card) was getting her own card debited on every self-booking, despite Wellpass being her actual payment method. Three kids share that one card. Two adjacent issues bundled in: Guardian Only registrations leaking into the Athletes tab, and Members popup 10-card editor missing the manual edit affordance available on the Athletes tab.

---

## Diagnosis: why the existing booking flow couldn't handle multi-membership households

Old logic at `app/api/bookings/create/route.ts` line 109:

```ts
const hasTenCardMembership = member.membership_types?.includes('ten_card') || false;
const use10Card = hasTenCardMembership && hasTenCardSessions;
```

Two architectural assumptions baked in:

1. **The booking member's own card is the only card.** No notion of "this member books, but a different member's card is debited."
2. **`membership_types` array is the source of payment-method truth.** If multiple types are present (e.g., `['wellpass', 'ten_card']`), `'ten_card'` is picked unconditionally — first match wins, no disambiguation.

Both broke for Miriam: assumption (1) makes it impossible for her three kids to share one card without three separate card rows, and assumption (2) burned her own card every time she booked herself, even though Wellpass is her actual method.

---

## Decision: two new fields, not one

**Rejected approach:** narrow `membership_types` to a single value (radio not multi-select). Would force a data migration that loses information — Miriam genuinely has access to both Wellpass (for self) and a 10-card (for kids). Multi-select is the right model for *what coverage exists*; a separate field is needed for *what wins on self-bookings*.

**Chosen approach:**
- `members.primary_payment_method` (text, CHECK constraint enforces enum) — what THIS member's own bookings debit. Solves the disambiguation. NULL fallback = `membership_types[1]` for backward compatibility with single-type members.
- `members.ten_card_holder_id` (uuid FK to members, ON DELETE SET NULL) — when a 10-card debit happens, whose card is debited. NULL = self. Non-NULL = walk to that member's row (kids sharing a parent's card).

Two fields keep the concepts separate: "what method does this member use for themselves" and "if it's a 10-card, whose card." A single combined field would conflate them.

---

## Migration: backfill + audit pattern

`database/add-payment-method-and-tencard-holder.sql` does three things:

1. ADD COLUMNs (idempotent with IF NOT EXISTS).
2. CHECK constraint on `primary_payment_method` (enum-as-text).
3. Backfill `primary_payment_method` from `membership_types[1]` ONLY for members with exactly one type. Multi-type members stay NULL — they're surfaced in the UI with an amber "Pick one to disambiguate" warning.

The audit query at the bottom of the SQL file lists members still NULL post-backfill. Ran it after migration: only Miriam Jacht came back. Carmine Carozzo (Wellpass only, kid Sandro has his own card) wasn't flagged because he's single-type — confirmed his current setup needs no changes.

---

## Walk-up logic in the booking flow

`getEffectivePaymentMethod(member)` in `types/member.ts`:

```ts
return member.primary_payment_method ?? member.membership_types?.[0] ?? null;
```

Three places use the holder walk:

1. **`bookings/create`** — fetch member, resolve effective method, walk to holder if 10-card. Validate holder's balance + expiry. On confirmed booking, debit holder's `ten_card_sessions_used`.
2. **`bookings/cancel` refund block** — same walk; refund holder's card if within grace period.
3. **`bookings/cancel` waitlist promotion** — same walk; debit promoted member's holder card on auto-promote.

Considered extracting into a `lib/tenCardHelpers.ts` shared helper. Rejected: the three usages have different surrounding query shapes (different SELECTed fields, different downstream consumers). An extracted helper would either be tightly coupled to one route's shape or so generic it adds little value over inline code. ~15 lines per route × 3 = manageable; abstraction would be premature.

---

## UI gating bug caught mid-session

First-pass MemberCard rendered the "10-card debits:" toggle for every `family_member` with a `primary_member_id`. Chris flagged it appearing on Irene Koffler's family — all `member`-type, no 10-card involvement, the toggle was visual noise.

Fix: tighten the gate to `getEffectivePaymentMethod(member) === 'ten_card'`. The toggle now appears only when the kid's effective method is `ten_card` — i.e., when the choice between "own card" and "primary's card" actually matters.

Lesson: when adding optional UI affordances to a list view, gate them on the actual data condition, not just the row type. "Family member with a primary" is too broad — the relevant condition is "has a 10-card decision to make."

---

## Session B (Guardian Only enforcement)

The `members.guardian_only` field has existed for a while; the binary toggle on MemberCard was already there. But two enforcement points were missing:

- Athletes tab (`app/coach/athletes/page.tsx`) showed guardian-only members despite the field existing. JS-side filter added (two queries: fetch athletes, then query members for `guardian_only=true`, set-difference). Reason for two queries: `athlete_profiles.user_id` and `members.id` both reference auth.users without a Supabase-recognised FK between them, so an inner-join filter wasn't trivially available.
- `bookings/create` didn't reject self-bookings by guardian-only adults. Returns 403 with a clear message ("Guardian-only accounts cannot book sessions. Book on behalf of a family member instead."). Family-member kids unaffected — they book via the existing primary→family path.

A "Guardian" derived badge (auto-shown when a member has any rows pointing at them via `primary_member_id`) was discussed but NOT built. Chris's existing binary toggle covers the immediate need; the derived badge can land later if useful.

---

## Session C (Members popup edit parity)

Chris's actual ask: "I can change the amount of sessions left on a 10-card in the Athletes page but not on the Members page 10-Card pop-up."

Looked at both: `TenCardModal.tsx` (Members popup) had a read-only `{sessionsUsed}/{tenCardTotal}` display with a "Preview" button that recalculated from bookings, and `handleSave` auto-overwrote the displayed value on save. `PaymentsSection.tsx` (Athletes tab) has a manual `<input type=number>` for `Used`.

Original plan was to extract a shared `<TenCardEditor>` component. Rejected mid-session: the two editors are structurally different — auto-recalc-on-save vs manual-input-with-save. A "shared" component would have to merge both behaviors into one, which is a redesign, not a refactor.

Cheaper path: change TenCardModal's display to an editable input, change save to use the typed value (no auto-recalc), rename "Preview" → "Recalc" to make the explicit-action nature clear. Members popup now has feature parity with the Athletes tab editor. Both editors remain separate components for now.

Behavior change: previously, changing purchase date and clicking Save would silently recalculate. Now save trusts what's typed; coach must click Recalc explicitly. Slight extra click but more predictable.

---

## Session-close handoff-prompt bug

`Chris Notes/AA frequently used files/handoff-prompt.md` line 20 was telling Claude to overwrite `Notes for next session.md` — directly contradicting the post-S304 rule (memory `feedback_dont_write_to_notes_for_next_session.md`). The Notes file is Chris's personal notepad; overwriting it lost his persistent reminders in S304.

Redirected the handoff output to `memory-bank/handoff.md` and added an explicit "do NOT touch Chris's Notes" guard in the prompt. The "After pasting" steps in the same file were updated to point to the new location.

---

## Files touched

| File | Change |
|:---|:---|
| `database/add-payment-method-and-tencard-holder.sql` (new) | Migration: 2 columns + CHECK + backfill + audit query (gitignored — file not in repo) |
| `types/member.ts` | Add `primary_payment_method`, `ten_card_holder_id`, `ten_card_holder_name` fields + `getEffectivePaymentMethod` helper |
| `hooks/coach/useMemberData.ts` | SELECT new fields in `fetchMembersWithAttendance` |
| `hooks/coach/useMemberActions.ts` | `handleSetPaymentMethod` + `handleSetTenCardHolder` |
| `components/coach/members/MemberCard.tsx` | "Pay with:" radio (multi-type), "10-card debits:" toggle (family + ten_card method) |
| `app/coach/members/page.tsx` | Wire two new props |
| `app/api/bookings/create/route.ts` | Holder-walk debit, guardian-only rejection |
| `app/api/bookings/cancel/route.ts` | Holder-walk refund + holder-walk waitlist-promotion debit |
| `app/coach/athletes/page.tsx` | Filter out guardian_only members in `fetchAthletes` |
| `components/coach/TenCardModal.tsx` | Sessions Used → editable input; save uses typed value; Preview → Recalc |
| `Chris Notes/AA frequently used files/handoff-prompt.md` | Redirect handoff output to `memory-bank/handoff.md` |
| `Chris Notes/Forge app documentation/Forge-Feature-Overview.md` | Document family-shared 10-cards + Guardian Only |

Commits: `630aff69` (Session A feature), `29c7c2e8` (Chris notes sync), `47632ea7` (Sessions B + C feature), `92d5c3b4` (Chris notes sync), session-close commit (this doc + activeContext + memory).
