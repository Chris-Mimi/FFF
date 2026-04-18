# Plan: Exclude Guardian-Only Parents from At-Risk

**Status:** Planned — not yet implemented. Pick up in a future session.
**Raised:** Session 289 (2026-04-18)

---

## Problem

Parents who register in the app purely to book sessions for their kids (Kids classes) appear in the coach **Members → At-Risk** tab, flagged as if they're athletes who have stopped attending. They're not athletes — they never intend to train. The At-Risk list is meant to surface lapsed *athletes*, so these parents are noise that makes the tab harder to trust.

### Current At-Risk logic
[`hooks/coach/useMemberData.ts`](../../hooks/coach/useMemberData.ts) — `fetchAtRiskCount` (lines ~67-108) and the `at-risk` branch of `fetchMembersWithAttendance` (lines ~236-246):

A member lands in At-Risk when:
- `status = 'active'`
- `membership_types` includes at least one of `['member', 'ten_card', 'wellpass', 'hansefit']`
- `attendance_count === 0` in the selected timeframe

Parents meet all three because coaches currently assign a membership type (e.g. "Mb") to mark them as belonging to the gym, and they have 0 attendance by design.

---

## Options considered

### Option A — Derive from family attendance (no schema change)
Exclude a primary from At-Risk if any of their `family_member` children have non-zero attendance in the timeframe.

- Pros: zero schema change, zero new UI, automatic.
- Cons:
  - False negative for a parent who *does* train but whose kid also trains — they'd be hidden from At-Risk even if they genuinely lapsed.
  - Doesn't help a parent-only primary whose kid has also missed recently (both appear).
  - Silent, opaque rule — Chris can't see or override it.

### Option B — Add a `guardian_only` boolean on `members` (recommended)
New column `guardian_only BOOLEAN NOT NULL DEFAULT false`. Coach sets it via a checkbox/toggle on `MemberCard`. Filter At-Risk with `AND guardian_only = false`.

- Pros:
  - Explicit, visible intent.
  - Works for any parent config (family_member, no family_member, no membership type).
  - Reusable: also excludes these members from other athlete-flavored metrics (e.g. subscription counts, attendance dashboards) if we want.
  - Trivial migration.
- Cons:
  - Manual flag-setting per parent — but there are only a handful.
  - One more field to remember to toggle when onboarding a parent.

### Option C — New `membership_type: 'guardian'`
Add `guardian` to the `MembershipType` union. A parent has ONLY `guardian` set (no regular types) → automatically excluded from At-Risk by the existing regular-types filter.

- Pros: reuses existing membership-type UI, no new schema field.
- Cons:
  - Conflates "what this member pays for" (existing semantics of membership_types) with "whether this person trains" (new semantics).
  - Fails if Chris wants a guardian who *also* has a legitimate membership type (e.g. a dad who trains AND is guardian for his kid — though that person should probably just be a normal member).

---

## Recommended approach — Option B

Add `members.guardian_only boolean default false`. Single place to mark a parent-only account. Explicit, inspectable, reversible.

### Implementation sketch

1. **DB migration**
   ```sql
   alter table members
   add column guardian_only boolean not null default false;
   ```

2. **Type update** — [`types/member.ts`](../../types/member.ts)
   Add `guardian_only: boolean;` to the `Member` interface.

3. **Fetch update** — [`hooks/coach/useMemberData.ts`](../../hooks/coach/useMemberData.ts)
   - Add `guardian_only` to the `select(...)` in `fetchMembersWithAttendance`.
   - In `fetchAtRiskCount`: filter out `guardian_only = true` rows (either in SQL via `.eq('guardian_only', false)` or in the client filter).
   - In the `at-risk` branch of `fetchMembersWithAttendance`: same exclusion.

4. **UI control** — [`components/coach/members/MemberCard.tsx`](../../components/coach/members/MemberCard.tsx)
   Add a small toggle/checkbox near the Family pill labelled "Guardian only (doesn't train)". On change, PATCH `members.guardian_only`. Ideally shown only for primary accounts (family_member rows don't need it — they're already children/dependants).

5. **Action hook** — [`hooks/coach/useMemberActions.ts`](../../hooks/coach/useMemberActions.ts)
   Add a `handleToggleGuardianOnly` mirroring the `handleSetGender` / `handleToggleClassType` patterns — optimistic update + direct `supabase.from('members').update(...)`.

6. **Backfill existing parents**
   After shipping, Chris manually toggles the flag on each parent-only primary (short list — handful of members). No migration script needed.

### Out of scope for first pass
- Applying `guardian_only` to other views (Subscriptions tab, Analysis page metrics). Can layer on later if noise appears elsewhere.
- Auto-detection of guardians at registration — keep it coach-controlled for now.

---

## Acceptance criteria

- [ ] Coach can toggle a parent primary as "Guardian only" from the Member card in one click.
- [ ] Guardian-only members never appear in the At-Risk tab, regardless of membership_types or attendance.
- [ ] The At-Risk count in the tab header excludes guardian-only members.
- [ ] Flag persists, survives refresh, survives session.
- [ ] Existing at-risk detection still works for genuine lapsed athletes.

---

## Notes

- There are likely only a small number of parent-only primaries today (manual handful). Don't over-engineer.
- The UI affordance should make the state obvious — maybe a small "Guardian" pill on the card header when enabled, similar to the existing "Family" pill.
