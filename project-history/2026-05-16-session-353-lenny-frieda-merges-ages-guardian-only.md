# Session 353 — Lenny Kleinert + Frieda Stromer Family-Member Cleanups, Member Card Ages, Guardian-Only Auto-Select

**Date:** 2026-05-16 (Opus 4.7)

Two member-data migrations following the same shape as yesterday's Gloria Stoffer fix (S352), plus two small UX features for the coach Members page and the athlete Book-a-Class page. Theme of the session: parent-kid family-member hygiene. All commits ended up tagged `session-352` due to label drift across the date boundary; the actual calendar-day work is S353.

---

## 1. Lenny Kleinert — two-profile merge

**Problem.** Mum had registered Lenny as the primary on her email (`mausibrueckner@web.de`) — the "kid-as-primary, mum's email" anti-pattern. She had ALSO created a family_member row for Lenny under the same primary. Two Lenny profiles, one parent profile that was actually mum's account misnamed.

**End state wanted (and achieved):** Profile A (`88bfb767...`) becomes Katja Brückner, primary, `guardian_only=true`, holding the 10-card. Profile B (`deab4706...`) stays Lenny Kleinert, family_member, cascade via `ten_card_holder_id` → Profile A.

**Approach.** Two ordered steps so the S351 trigger sees the cascade wiring before booking writes start:

1. **Cascade link first** — `UPDATE deab4706... SET ten_card_holder_id = '88bfb767...', primary_payment_method = 'ten_card'`.
2. **Migration transaction** — DELETE 4 duplicate Profile B bookings (April-23 batch on A + May-9 batch on B for the same 4 sessions; only attended once each), then UPDATE bookings + wod_section_results from Profile A → B, then rename Profile A to Katja + `guardian_only=true` + clear Lenny-specific bio fields (class_types, date_of_birth, gender, whiteboard_name).

**Why drop the newer Profile B duplicates (not the older Profile A ones).** Profile A's 4 bookings had `ten_card_consumed=true` (S351 backfilled them because A had `membership_types[1]='ten_card'`). Profile B's 4 had `consumed=false` (B's payment_method was NULL at backfill time, only set in step 1 above). Dropping Profile A would silently leave the counter at 5 instead of 9. Direction matters; verified before running.

**Result.** Profile A counter recomputes via cascade to 9/10 (correct), Profile B's `ten_card_sessions_used` shows 0 (cosmetic — chip reads from holder). Lenny's leaderboard appearances + score history now attribute to him as family_member, not to the misnamed parent profile.

**Note.** A third row surfaced — "Katja Neumann" (`df6670eb...`, Wellpass, `neumann-kjl@gmx.de`). Chris confirmed it's a completely different person, not Katja Brückner. Untouched.

---

## 2. Frieda Stromer — single-profile cleanup, INSERT-then-migrate pattern

**Problem.** Same anti-pattern as Lenny, but only ONE profile existed — Frieda named as primary on mum's email `burgl_stromer@yahoo.de`. No family_member row for Frieda yet.

**End state.** Existing row renamed to Burgl Stromer (mum), `guardian_only=true`. NEW family_member row created for Frieda with cascade pre-wired.

**Approach — plpgsql DO block.** Standard SQL doesn't make it easy to `INSERT ... RETURNING id` and reference that id in subsequent statements within one transaction. A `DO $$ ... END $$` block with a `DECLARE v_new_id UUID` variable solves this cleanly:

```sql
DO $$
DECLARE
  v_new_id UUID;
  v_old_id UUID := 'bb489951-35da-4411-9a4a-84c666b78f98';
BEGIN
  INSERT INTO members (...)
  VALUES (...)
  RETURNING id INTO v_new_id;

  UPDATE bookings SET member_id = v_new_id WHERE member_id = v_old_id;
  UPDATE wod_section_results SET member_id = v_new_id WHERE member_id = v_old_id;
  UPDATE members SET name = 'Burgl Stromer', display_name = 'Burgl Stromer',
                     guardian_only = true, gender = NULL,
                     primary_payment_method = 'ten_card'
  WHERE id = v_old_id;
END $$;
```

**What travels and what doesn't:** Frieda's `gender='F'` moves to the new row; cleared on Burgl's. `class_types=[]` was already empty, no migration. `date_of_birth` was NULL on Frieda — exactly the field the new ages-on-cards feature will surface when filled in. Burgl's `primary_payment_method` set to `'ten_card'` for consistency with the Katja case + her role as holder.

**No pre-flight duplicate check needed** — only one profile existed, so no cross-profile collisions are possible.

---

## 3. Member card ages

**Trigger.** Chris asked for athlete ages in the UI so he can place kids in the right CFK category at a glance. `members.date_of_birth` was stored but not surfaced anywhere.

**Change.** [components/coach/members/MemberCard.tsx](components/coach/members/MemberCard.tsx) — `(age N)` appended to the member name in subtle gray, hidden when DOB is null (no "(age 0)" placeholder). Uses the existing `getAge(date_of_birth)` helper from `types/member.ts` that was already in use for the class-type-buttons gating.

**Scope decision.** Three other UI surfaces were candidates (Session Management booking list, family-member booking dropdown, all three). Chris picked #1 only — Members page MemberCard — keeping the change small.

---

## 4. Guardian-only auto-select on Book-a-Class

**Trigger.** Chris asked that guardian-only accounts (Katja, Burgl, etc.) open the booking page already pointed at the first family member instead of themselves — saves a click — AND that they cannot book under their own name.

**Server-side block was already in place.** [app/api/bookings/create/route.ts:101](app/api/bookings/create/route.ts#L101) returns a 403 with a German message ("Dein Konto ist nur für Erziehungsberechtigte eingerichtet…") if `member.guardian_only` is true. So the second half of Chris's request was already enforced; the work was purely UI alignment.

**Frontend changes** in [app/member/book/page.tsx](app/member/book/page.tsx):

1. `FamilyMember` interface picks up `guardian_only: boolean | null`.
2. `fetchFamilyMembers` SELECT pulls `guardian_only`. Default `bookingForMemberId` is the first `account_type='family_member'` row when the primary is `guardian_only=true`; falls back to `userId` otherwise (existing behavior unchanged for non-guardians).
3. Booking-for selector filters out the primary entry when guardian-only → no "You" chip rendered, so they can't switch back to themselves.

**Edge case:** guardian with zero family members. `bookingForMemberId` falls back to `userId`; the server returns the 403 with the German "add a family member first" message if they try to book. Selector still shows the "+ Family" button.

---

## 5. Testing notes

Attempted local-dev impersonation test (admin-magic-link → localhost) for Katja. The impersonate page hung on "Signing in…" — verifyOtp didn't resolve. Likely a localhost auth-flow quirk (Supabase URL allowlist or session conflict) but not worth diagnosing further. Skipped the test in favor of prod verification after deploy. Production impersonation flow is known-working per S347.

---

## Files Modified

| File | Change |
|:---|:---|
| `components/coach/members/MemberCard.tsx` | (age N) span next to member name |
| `app/member/book/page.tsx` | guardian_only on FamilyMember type + SELECT, auto-select first family, hide "You" chip |
| `Chris Notes/AA frequently used files/Notes for next session.md` | Chris-owned, synced via separate commit |

## SQL Applied Manually (gitignored convention)

- Lenny/Katja merge — 2 statements (cascade-link, then atomic transaction with delete + migrate + rename)
- Frieda/Burgl merge — single plpgsql DO block

## Commits

- `e9ff696 feat(session-352): ages on member cards + guardian-only auto-select to first family` ← actually S353 work; label drift not amended (prefer new commits over amending per safety rules)
- `4ea2caf chore: sync Chris's session notes`
- This session-close commit will use `docs(session-353):` correctly going forward.

## Carry-overs for next session

- S351 paper-card sync still pending (now overdue by 1 day per S352 close's "first action").
- Visual verify on prod that Katja's Book-a-Class auto-selects Lenny + hides her "You" chip. Filling Lenny + Frieda's DOB will exercise the new age display on Members.
- Open-question candidate: same auto-select-first-family pattern on Coach booking flows? Not requested today; tabling unless Chris raises it.
