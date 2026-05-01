# Session 329 — Adults/Kids filter on Attendance Reports + incident roll-up to guardians + login-recovery runbook

**Date:** 2026-05-01 (Opus 4.7)
**Trigger:** Two Chris asks against the coach Admin page: (1) add a filter to the Attendance Reports panel to scope by Adults vs Kids, (2) roll up family-member kids' incidents (no-shows, late_cancels) onto the parent's row since parents are responsible for whether the kid actually shows up. Then mid-session: a third ask to write a recovery runbook for the recurring PWA-cache login issue (Anja S317 → Michaela S328 → Carina S329).

---

## Adults/Kids filter — three signals, not two

**First pass.** `isKidMember()` originally used two signals:
- `account_type === 'family_member'` (kid registered via parent flow at `/member/book`)
- `class_types` contains `cfk` or `cft` (kids/teens classes)

Pill row (All / Adults / Kids) sits above the tabs at [app/coach/admin/page.tsx](app/coach/admin/page.tsx) so it scopes both Attended and Incidents. Trial Athletes panel hides when filter ≠ All (trials aren't members yet, so no class_types or DOB to scope against).

**Second pass — Chris flagged a gap.** Fabian Siebert (14yo) and Lenny Kleinert (under 18, self-registered) were appearing in Adults. Both are primary accounts because they registered themselves directly rather than being added by a parent — they have valid emails and own auth.users rows. Their `class_types` either weren't set or only had adult values like `t`.

**Fix — DOB fallback.** Added `ageFromDob(dob)` and a third signal: if computed age < 18, count as kid. Now any of three signals is sufficient:

```ts
function isKidMember(m: MemberInfo | undefined): boolean {
  if (!m) return false;
  if (m.account_type === 'family_member') return true;
  if ((m.class_types || []).some(c => c === 'cfk' || c === 'cft')) return true;
  const age = ageFromDob(m.date_of_birth);
  if (age !== null && age < 18) return true;
  return false;
}
```

DOB is the most-stable demographic field — every member registration captures it. The other two signals are app-flow metadata that depends on which path the user came in through. DOB catches everyone the other two miss.

---

## Incident roll-up to guardians

**The data shape.** Each row in `bookings` (with status `late_cancel` or `no_show`) belongs to one member. For family-member kids, that member has a `primary_member_id` pointing at their parent.

**The derivation.** `incidentStats` walks the booking rows and `upsert()`s into a map keyed by `memberId`. New behavior: when the booking belongs to a member with a non-null `primary_member_id`, we also `upsert()` into the guardian's bucket — same +1 to `lateCancel` or `noShow`.

```ts
for (const row of filtered) {
  const stat = upsert(row.memberId, row.name);
  // ... +1 to stat.lateCancel or stat.noShow

  const member = memberById.get(row.memberId);
  const guardianId = member?.primary_member_id;
  if (guardianId && guardianId !== row.memberId) {
    const guardian = memberById.get(guardianId);
    const gStat = upsert(guardianId, guardian?.name || 'Unknown');
    // ... +1 to gStat.lateCancel or gStat.noShow
  }
}
```

The kid's own row keeps the same incident count (no double-counting toward the kid). The parent's row inherits a copy. Total across both rows under "All" filter is technically inflated for any incident that rolls up — Chris's explicit ask: that's the intended behavior, since the parent is responsible.

**Filter interaction.** The class filter applies AFTER roll-up:
- "Kids" → only the kid's row shows (parent gets filtered out)
- "Adults" → only the parent's row shows (kid gets filtered out, but parent's count still includes the kid's incidents)
- "All" → both rows visible

**Expansion enrichment.** When you click a parent row to expand, the list includes the kid's incidents. To distinguish own-vs-rolled-up rows, the kid's name appears in italic next to inherited rows:

```tsx
{isFromKid && (
  <span className='text-gray-500 italic text-[11px]'>({inc.name})</span>
)}
```

The Delete button uses the booking-owner's name in the confirm dialog (so deleting Alois's no-show under Julia's expansion still says "delete Alois Weihe's …"), not the row stat's name. Avoids confusion.

**Member lookup map lifted.** Both Attended and Incidents now need member metadata (account_type, primary_member_id, class_types, date_of_birth). Two separate fetches would double-query and risk drift. Lifted to component-level state:

```ts
const [memberById, setMemberById] = useState<Map<string, MemberInfo>>(new Map());

useEffect(() => {
  if (loading) return;
  fetchAllMembers();
  fetchIncidentStats();
}, [...]);
```

`fetchAllMembers` runs once on mount. The Attended fetcher reads from `memberById` instead of doing its own member query. The incidents derivation uses it for both the roll-up walk and the class filter.

---

## Login-recovery runbook published

[Chris Notes/Forge app documentation/login-recovery-runbook.md](../Chris%20Notes/Forge%20app%20documentation/login-recovery-runbook.md)

**Why now.** Three rescues so far — Anja (S317), Michaela (S328), Carina (S329). All same root cause: stale PWA service-worker bundle on phone serving pre-S317 login code. S328 hardened the *error message* (`check-status`-failure German fallback) but doesn't retroactively fix already-cached PWAs. Manual recovery via `scripts/admin-set-password.ts` keeps being the only viable fix per user.

**Structure.** 4 steps:
1. Pick a simple temp password (`1234?ABCD!` or `Forge2026!` — avoid mobile-keyboard-hostile chars).
2. Run `npx tsx scripts/admin-set-password.ts <email> '<password>'` — single-quote the password to escape shell meta.
3. Verify the login works in an incognito window before sending to the athlete.
4. Send the password via WhatsApp/SMS with a German template message.

Plus: when-to-use criteria (so it isn't reached for unrelated login issues), why this keeps happening (PWA cache explanation), when-to-escalate (if same user comes back twice).

**Format adjustments mid-write.** Chris asked what to copy from the markdown code block. Initial version used <code>```bash</code> fences which confused him on the question of whether to copy them. Switched to indented code blocks (4-space indent) — renders the same in markdown viewers but no fence chars to confuse plain-text reading.

---

## The Carina/Xaver mistake

Mid-session Chris asked how to link Xaver Hiltel as a family-member of Carina in Supabase. I gave both the Dashboard-edit path (`account_type=family_member`, `primary_member_id=Carina's id`) and the via-app path (log in as Carina → Add family member). Then he ran `admin-set-password.ts` against Carina's email — but Carina is not actually Xaver's mom. Password is now changed, bcrypt is one-way, no rollback.

Action: send Carina the new temp + apology message. She'll log in and change it back to whatever she wants under Profile → Security.

**Suggested adding a "verify before running" warning** to the runbook. Chris declined: "a warning wouldn't have helped, I should have been more careful". Worth honoring — runbooks shouldn't bloat with warnings for self-inflicted mistakes that aren't structural.

---

## Process moments worth remembering

- **Self-registered teens slip past obvious classification fields.** `account_type` and `class_types` only catch kids who came in through the parent flow or were explicitly tagged. DOB is the most-reliable signal because every member has one. Lesson: when classifying users, use the most stable demographic field as a fallback, not just app-flow metadata.

- **The PWA-cache login issue is a slow-burn UX bug, not a one-time incident.** Each rescue takes ~5 minutes but the same root cause keeps producing new victims. S328 message-fix doesn't retroactively help cached PWAs; only time fixes that. The runbook acknowledges this and gives Chris a turn-key script-driven path so he doesn't have to reason through it each time.

- **Filter logic before fetching beats filtering after.** The Adults/Kids filter scopes member IDs *before* hitting the `get_all_members_attendance` RPC, so the response is already pre-filtered. Avoids transferring full attendance data we'd just discard. Cheap when memberById is small (it is — gym scale ~100 active), but the pattern matters.

- **Chris's "a warning wouldn't have helped" deserves trust.** First instinct after the Carina mistake was to add a verification step to the runbook. He pushed back: warnings and confirms add friction for the 99% of correct uses to defend against the 1% incorrect. Honor it. The same instinct probably applies to other "should we add a confirm step?" decisions. Memory: `feedback_ask_before_adding_friction.md` already covers this — confirmed rule.

---

## Files touched

| File | Change |
|:---|:---|
| `app/coach/admin/page.tsx` | Adults/Kids filter pill row above tabs; `MemberInfo` interface + `ClassFilter` type + `CLASS_FILTER_OPTIONS`; helpers `isKidMember`, `passesClassFilter`, `ageFromDob`; lifted `memberById` state with `fetchAllMembers`; refactored `fetchAttendedStats` to use shared map + classFilter; `incidentStats` derivation does guardian roll-up + class filter; expansion includes kid's incidents with name in italic; Delete button uses booking-owner's name in confirm; trial panel hidden when filter ≠ All |
| `Chris Notes/Forge app documentation/login-recovery-runbook.md` | New — 4-step recovery procedure for PWA-cache login failures |
| `memory-bank/memory-bank-activeContext.md` | Bumped 188.1→189; rewrote Next Session Kickoff for S329; added S329 + S328 to Last 5 Sessions; dropped S324 + S323 (now in project-history) |

Single commit per close-session checklist default.
