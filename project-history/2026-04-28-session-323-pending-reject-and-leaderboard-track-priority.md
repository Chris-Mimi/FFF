# Session 323 — Pending-Reject Button + Leaderboard Track-Above-Scaling

**Date:** 2026-04-28 (Opus 4.7)
**Trigger:** S322 carry-overs verified (OG flow live, working). Chris pulled "Reject/Delete button on Members Pending tab" off the backlog (item #4 from S322 next-steps) and then opened a leaderboard ordering bug.

---

## Pending member reject/delete

### Why
S306 had to use raw SQL to clean up Claudia Herrmann from the `members` table — she'd self-registered by mistake. Pending tab had Approve / Block but no destructive removal. "Block" leaves the row in the DB, just hidden in a different tab; the email stays "taken" so the person can't re-register cleanly.

### Decision
Two scope options proposed:
- (a) Delete `members` row only — orphans the auth.users record, keeps email locked
- (b) Delete `members` row **and** `auth.users` row — email freed, clean re-registration possible

Chris went with **(b)**. Coach-only endpoint, confirm dialog, no email sent to the rejected user.

### Implementation
4 files:
- New `app/api/members/reject/route.ts` — `requireCoach` gate; verifies `status='pending'` (Block is the right tool for active members); deletes from `members` then `auth.users` via `supabaseAdmin.auth.admin.deleteUser(memberId)`. Returns 500 with a "contact support" message if the auth delete fails after the members row is gone (rare but possible split state).
- `hooks/coach/useMemberActions.ts` — `handleReject(memberId, memberName)` with destructive confirm dialog.
- `components/coach/members/MemberCard.tsx` — third button ("Reject", `Trash2` icon, gray with red hover) in Pending tab actions row alongside Approve and Block. New `onReject` prop.
- `app/coach/members/page.tsx` — wires the prop.

The `members.id === auth.users.id` invariant (set up in `app/api/members/register/route.ts` at create time) is what makes the auth delete trivially target the same record.

---

## Leaderboard: Track wins over Scaling

### Symptom
Chris opened a Note: "Trk 1 athletes should appear before Trk 2 athletes. Tracks are usually less reps, shorter distances etc the track rankings come before Scaling."

### Old sort chain
[utils/leaderboard-utils.ts](utils/leaderboard-utils.ts) `comparePrimary` was: `Tier (real/DNF) → Scaling → Track → Score`. So an Sc1 Track 2 athlete could outrank an Rx Track 1 athlete just because Sc1 < Rx aggregate scaling — wrong, because they're effectively doing different workouts.

### New sort chain
`Tier → Track → Scaling → Score`. DNF still always last (Chris was explicit). Within finishers, Track 1 absolutely beats Track 2 beats Track 3, regardless of scaling. Within a single track, scaling and score break ties as before.

Same swap applied to `rankBenchmarkResults` (no tier there — benchmarks don't have DNF — so just `Track → Scaling → primary metric`).

### Verification
2026-03-04 and 2026-03-16 "Handstand Walk Drills #26.1, GHDSU, HSPU" sessions are the cleanest test cases (all three tracks present in scored results). Chris checked, ordering is correct.

---

## Diagnostic-script blind spot — anon key vs RLS

I wrote a one-shot script (`scripts/list-wods-with-track.ts`) to count tracked WODs. First run reported "zero results have track set anywhere" — based on that I told Chris the new sort had nothing to verify and asked whether tracks were even being used.

Chris pushed back: he'd just opened the Results modal on multiple WODs and seen track buttons highlighted. Re-ran with `SUPABASE_SERVICE_ROLE_KEY` instead of anon and got the real answer: **23 sessions with track values in `wod_section_results`**, mixed Track 1/2/3. RLS on `wod_section_results` blocks the anon key entirely; the query returned an empty set silently.

Saved as feedback memory (`feedback_diagnostic_scripts_use_service_role.md`). Default to service role for inspection scripts going forward; the existing scripts in `scripts/` (e.g. `check-ghost-scaling.ts`) use anon and may have the same blind spot — don't trust their output for tables behind RLS.

---

## Process moments worth remembering

- **Chris-owned files still need committing.** The Notes file from S321's "Chris-owned, don't read or write" rule was misread on the first commit pass — I left it in the working tree because the rule is about file *contents*, not git operations. Two machines (Mac + laptop) sync via git, so omitting it broke that sync. Committed afterwards as `chore: sync Chris's session notes`. Saved as `feedback_chris_notes_commit_but_dont_edit.md`.

---

## Files touched

| File | Change |
|:---|:---|
| `app/api/members/reject/route.ts` (new) | Coach-only DELETE for pending registrations |
| `hooks/coach/useMemberActions.ts` | `handleReject` + export |
| `components/coach/members/MemberCard.tsx` | Reject button on Pending tab |
| `app/coach/members/page.tsx` | Wire `onReject` prop |
| `utils/leaderboard-utils.ts` | Swap Track and Scaling priority in both `rankSectionResults` and `rankBenchmarkResults` |
| `scripts/list-wods-with-track.ts` (new) | Audit script (service role) |
| `Chris Notes/Forge app documentation/Forge-Feature-Overview.md` | Reject mention + corrected Multi-track sort description |

Memory: `feedback_chris_notes_commit_but_dont_edit.md`, `feedback_diagnostic_scripts_use_service_role.md`.

Three commits during the session (`f685439` reject feature, `2e8e9c7` leaderboard sort + script, `9c76834` script service-role fix), plus `7c1edb4` for the Chris notes sync. Session-close commit will bundle the docs/memory updates.
