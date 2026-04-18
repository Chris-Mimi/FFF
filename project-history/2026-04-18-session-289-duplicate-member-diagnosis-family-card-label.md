# Session 289 — Duplicate Member Diagnosis + Family Card Label

**Date:** 2026-04-18
**Model:** Opus 4.7

---

## Context

Susi Glocker appeared twice on the Workouts → Athlete List. She had registered as a family member under her husband Stefan, then registered again on her own. Chris had unapproved the family one and approved her own — both still showed.

During diagnosis, it emerged she actually had **two active primary accounts** (different emails) plus one pending family_member row, even though Chris believed he only approved one.

## Diagnosis

### Why both show on the Athlete List
[`app/api/score-entry/[sessionId]/route.ts:48-56`](../app/api/score-entry/%5BsessionId%5D/route.ts#L48-L56) queries `bookings` filtered only by `session_id` and `status='confirmed'` and joins `members` — it never checks `members.status`. So when a member is unapproved (status → pending), their confirmed bookings stay and still render.

### Why two active primary accounts
Ran SQL to pull all Susi rows by name. Result:

| id | email | status | account_type | created_at | updated_at |
|:---|:---|:---|:---|:---|:---|
| 0d5a0252 | susanneglocker@gmx.de | active | primary | 16:37:35 | 20:11:22 |
| f91173a4 | susi.strobel@gmx.de | active | primary | 16:40:38 | 20:11:04 |
| eac70c98 | (none) | pending | family_member | 16:50:03 | 17:19:15 |

Both primaries have distinct `updated_at` timestamps 18 seconds apart at 20:11 — confirmation of two explicit Approve clicks. The family row was auto-active on insert (per [`app/member/book/page.tsx:309-318`](../app/member/book/page.tsx#L309-L318)) then unapproved 29 min later.

Chris's hypothesis that toggling "Mb" (Member) might auto-approve was investigated and ruled out: [`handleToggleMembershipType`](../hooks/coach/useMemberActions.ts#L270-L292) only updates `membership_types`, never `status`. The only primary-activation path is `/api/members/approve`. No bulk-approve exists anywhere.

### Root cause
Two compounding user/UX factors (no system bug):
1. **No name/DOB dedup at registration** — [`app/api/members/register/route.ts:54-58`](../app/api/members/register/route.ts#L54-L58) only enforces email uniqueness. Same person with two emails = two accounts.
2. **Family members auto-activate without approval** — primary-adds-family flow inserts `status: 'active'` directly (by design).

## Decisions

Chris opted **not to code-fix** the Athlete List filter — treating Susi's case as user error, not a system bug. Cleanup deferred until he hears back from her on which email she wants to keep.

## What shipped

**UX improvement:** family_member member cards on the coach Members tab now display "Family of {primary_name}" instead of just "Family", so the coach can tell which household a family row belongs to.

### Files changed
- [`types/member.ts`](../types/member.ts) — added optional `primary_member_name?: string | null` to `Member` interface.
- [`hooks/coach/useMemberData.ts`](../hooks/coach/useMemberData.ts) — extended the existing primary-lookup block (already fetching subscription fields for inheritance) to also pull `name` and `display_name`, and attach `primary_member_name` to each family member.
- [`components/coach/members/MemberCard.tsx:90-94`](../components/coach/members/MemberCard.tsx#L90-L94) — pill renders `Family of {primary_member_name}` when resolvable, falls back to `Family`.

Works for all existing and future family member rows automatically — no data migration needed.

## Carryover

**Susi cleanup (pending her reply):** once she confirms which email she wants to keep:
```sql
-- Unapprove the duplicate primary:
update members
set status = 'pending', updated_at = now()
where id = '<duplicate_primary_id>';

-- Delete the pending family_member row:
delete from members
where id = 'eac70c98-87de-43fa-8f75-ec302f2fa0db'
  and account_type = 'family_member';
```

Duplicate primary IDs: `0d5a0252-130b-40ff-812c-a790f0d73c06` (susanneglocker@gmx.de) and `f91173a4-9be5-4f84-8afc-b9d928e83a5d` (susi.strobel@gmx.de).

## Lessons

- The score-entry bookings query only cares about `bookings.status`, not `members.status`. If we ever want unapprove to cascade to hide bookings from the Athlete List, either filter in the API or cascade-cancel bookings on unapprove.
- Family member creation is the only insert path that bypasses the pending→active coach-approval gate. Worth keeping in mind when reasoning about how "active" members can appear without an approval record.
