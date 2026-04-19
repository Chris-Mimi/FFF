# Session 291 — Susi Glocker Duplicate Hard-Delete Cleanup

**Date:** 2026-04-19
**Model:** Opus 4.7

---

## Context

Carryover from Session 289. Susi Glocker had three rows in `members`:

| id | email | status | account_type |
|:---|:---|:---|:---|
| `0d5a0252-130b-40ff-812c-a790f0d73c06` | susanneglocker@gmx.de | active | primary |
| `f91173a4-9be5-4f84-8afc-b9d928e83a5d` | susi.strobel@gmx.de | active | primary |
| `eac70c98-87de-43fa-8f75-ec302f2fa0db` | (null) | pending | family_member |

Chris had messaged Susi asking which account she wanted to keep. This session started with her reply: `susi.strobel@gmx.de` is the correct account.

## What happened

### Step 1: Block + delete family row

Initial recommendation was `status='blocked'` on the duplicate primary (preserves audit trail, prevents re-registration with the dropped email) + hard-delete the pending family row.

```sql
update members set status = 'blocked', updated_at = now()
where id = '0d5a0252-130b-40ff-812c-a790f0d73c06';

delete from members where id = 'eac70c98-87de-43fa-8f75-ec302f2fa0db'
  and account_type = 'family_member';
```

Verified: only one active Susi remained.

### Step 2: Chris asked why not hard-delete

Explained the three risk factors:
1. FK cascades — `members.id` is referenced by `bookings`, `benchmark_results`, `lift_records`, `wod_section_results`, `athlete_achievements`, `reactions`. DELETE either silently wipes history or errors on FK constraints.
2. `auth.users` would be left orphaned if only the `members` row is deleted.
3. `status='blocked'` prevents the email being re-registered accidentally.

### Step 3: Dependency check

To confirm hard-delete safety, ran a `WITH dup AS (...)` SQL across every table that references the id as either `member_id` or `user_id`. Result: only `athlete_profiles` (1 row) and `auth.users` (1 row). Everything else 0. Safe to hard-delete.

### Step 4: Hard delete via Supabase Auth Dashboard

Chris used **Authentication → Users → search `susanneglocker@gmx.de` → Delete user**. FK cascades wiped `members` + `athlete_profiles` automatically.

Final verification:
```sql
select id, email, status from members
where name ilike '%susi%glocker%' or name ilike '%susanne%glocker%';
```

Result: single row `f91173a4` / susi.strobel@gmx.de / active. Done.

## Memory updates

- Removed `~/.claude/.../memory/project_susi_glocker_cleanup.md` (resolved).
- Removed the corresponding entry from `MEMORY.md` index.
- Updated `memory-bank/memory-bank-activeContext.md`: added S291 + brief S290 entry (from git), removed S285/S286 from the current-status window, removed Susi from Next Immediate Steps.

## Carryover

- **Score-entry API filter (deferred S289):** `app/api/score-entry/[sessionId]/route.ts:48-56` still only checks `bookings.status`, not `members.status`. If unapprove should cascade to hide athletes from the Workouts → Athlete List, this needs an API-level filter or a cascade-cancel on unapprove. Not prioritised.
- No code changes committed this session — dependency check + hard-delete ran in Supabase UI/SQL Editor, no app changes needed.

## Lessons

- **Hard-delete is safe when dependency-checked.** The `WITH dup AS (...)` pattern against every FK-bearing table is a reusable template for future duplicate-account cleanup.
- **Supabase Auth Dashboard cascade works.** Deleting the `auth.users` row via the Dashboard cascaded cleanly through `members` + `athlete_profiles` — no manual pre-delete of child rows needed on this project's FK setup.
- **`blocked` vs hard-delete tradeoff:** `blocked` is the safer default (audit trail + re-registration prevention). Hard-delete is fine when dependencies are verified clean AND re-registration with the dropped email isn't a concern.
