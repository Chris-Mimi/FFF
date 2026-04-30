# Session 327 — Family-member `display_name` fallback + stale subscription carry-over closed

**Date:** 2026-04-30 (Opus 4.7)
**Trigger:** Chris hit two visible bugs in the Score Entry (Results) modal: Fabian Siebert (kid, in the kids course) showing as `zielu2012`, Hannah Sterk (kid, also booked) rendering as a blank row. Asked where the names come from, what other coach views might be affected, and (separately) what the long-standing "Athlete subscription bug" carry-over actually was.

---

## The two visible bugs

**Where names come from.** [app/api/score-entry/[sessionId]/route.ts:55](app/api/score-entry/[sessionId]/route.ts#L55) joins `bookings → members` and reads `members.name` directly (line 99). The Score Entry row just renders `members.name` verbatim — no fallback, no transform.

**Fabian.** His `members.name` was literally the string `zielu2012` — the username portion of his email. Chris fixed manually in Supabase Dashboard → set `name = "Fabian Siebert"`.

**Hannah.** Her `members.name` was NULL/empty. Booking exists, members row exists, name field blank. Chris fixed manually → set `name = "Hannah Sterk"`.

Both data fixes; not code bugs by themselves.

---

## The deeper pattern — 5 family-member kids with `display_name` only

After fixing Fabian and Hannah, Chris found 5 more kids with `display_name` set but no `name`. Investigation:

**Root cause.** [app/member/book/page.tsx:337-346](app/member/book/page.tsx#L337-L346) — the family-member insert path used by parents adding their kids — only sets `display_name`. Never writes `name`. So all family-member kids registered via that flow have `name = NULL, display_name = "Firstname Lastname"`.

By contrast, adult signup at [app/api/members/register/route.ts](app/api/members/register/route.ts) sets `name` from the form input and leaves `display_name` NULL. Two registration paths, two different field-population conventions.

**Codebase audit.** Grep for `members\.name\|m\.name\|member\.name\b` across `app/api/`, `hooks/coach/`, `components/coach/` revealed inconsistency:
- ~5 paths used `display_name || name` (works fine for kids).
- ~6 paths used `name` only (renders blank for kids).

Affected coach views with the bug:
- Score Entry (Results modal) — empty rows
- 10-card modal header
- Manual Booking dropdown — kids invisible
- Coach SearchPanel (3 places) — blank labels
- Member-name search filter in `useMemberData` (already had `display_name` fallback — not actually broken)
- MovementTrackingPanel — blank cell

---

## Fix — resolve at data sources, not UIs

Chose two-part B (proper fix) over A (one-time backfill) because A leaves the bug live for any new kid added via the parent flow.

**Part 1 — registration insert.** [app/member/book/page.tsx:342](app/member/book/page.tsx#L342) — `handleAddFamilyMember` now writes both `name` and `display_name` from the form input. Stops the bug at source for all future family-member additions.

**Part 2 — read-side fallback at data sources.** Rather than patching ~6 UI components individually, resolved `display_name || name` at the data sources so the UIs don't need to change:

| Data source | Change |
|:---|:---|
| [app/api/score-entry/[sessionId]/route.ts](app/api/score-entry/[sessionId]/route.ts) | Added `display_name` to the SELECT; resolves into the `athletes` array `name` field; whiteboard-dedup name-set loop also uses fallback |
| [hooks/coach/useCoachData.ts](hooks/coach/useCoachData.ts) `fetchMembers` | Added `display_name` to SELECT; maps `display_name \|\| name` into the local `name` field. Covers SearchPanel + MovementTrackingPanel without touching them |
| [hooks/coach/useSessionDetails.ts](hooks/coach/useSessionDetails.ts) | Same pattern; normalizes `membersData` before calling `filterAvailableMembers`. Covers ManualBookingPanel without touching it |
| [components/coach/TenCardModal.tsx](components/coach/TenCardModal.tsx) | Added optional `display_name` to prop type; header uses `display_name \|\| name` (caller already passes the full `Member` object which has both fields) |

Net diff: 5 files, no UI files touched outside TenCardModal.

TS clean.

**Backfill option.** Existing 5 kids with NULL `name` still render correctly (the new code handles NULL). Backfill is cosmetic-only — Chris can run a Supabase SQL update later if desired:
```sql
UPDATE members SET name = display_name
WHERE account_type = 'family_member' AND name IS NULL AND display_name IS NOT NULL;
```

---

## Stale carry-over closed — "Athlete subscription bug"

Chris asked "what is this issue" referring to "Next Immediate Steps" item 4: athlete subscription bug, trialing → end_date wrong, Stefan Glocker needs DB fix. Investigation showed both root causes were already fixed in code, the carry-over had been migrating between sessions for 30+ sessions without anyone re-checking it.

**S280 root causes (now fixed):**

1. **Webhook overwriting `athlete_subscription_end` on `subscription.updated`.** Fixed at [app/api/stripe/webhook/route.ts:251-264](app/api/stripe/webhook/route.ts#L251-L264) — explicit gate `if (subscription.status === 'active')` before writing the end date. Comment in code documents the exact failure mode S280 saw. Trialing subs no longer have their checkout-set end date overwritten.

2. **`autoExpireSubscriptions` not skipping trialing.** Fixed at [hooks/coach/useMemberData.ts:284-292](hooks/coach/useMemberData.ts#L284-L292) — `!stripeSubMap[m.id]` guard skips any member whose Stripe sub is active or trialing. Even if the end date were wrong, auto-expire wouldn't fire.

**Stefan Glocker.** S280 referenced him because he was approved without a membership type (separate issue from the trialing bug). The validation at [components/coach/members/MemberCard.tsx](components/coach/members/MemberCard.tsx) prevents that now. Chris confirmed Stefan has an active monthly subscription — never affected by the trialing bug.

**What to watch for if it ever regresses:**
- New athlete signs up + pays → app shows "subscription expired" within minutes.
- Coach view: MemberCard red "Expired" instead of teal "Trial".
- Stripe Dashboard: sub status `trialing` or `active` (paid).
- Supabase: `athlete_subscription_status = 'expired'`, `athlete_subscription_end` = signup date.
- Athlete messages saying "I just paid but the app says I need to subscribe."

**Action.** Removed the "Known Open Issues" entry and the "Next Immediate Steps" item; renumbered list.

---

## Process moments worth remembering

- **"Where does X come from?" → trace to data source, not UI.** Chris's question could've been answered by reading the modal. Reading the API gave the actual answer (raw `members.name`, no transform) and exposed the inconsistency across the codebase. The follow-up grep mapped every read site in two minutes.
- **Fix at the data source, not every UI.** Six UI components used `member.name`. Patching each would be 6 edits + 6 type updates. Resolving `display_name || name` in the two hooks and the score-entry API covers 5 of those 6 components without touching them. Only TenCardModal needed direct touching.
- **Verify "open issue" claims before scheduling work.** S280's bug description was true at write time but obsolete by S324-ish. Two greps + a code read closed an item that had been migrating between Next Immediate Steps lists for 30+ sessions. **Future:** scan other long-lived "Next Immediate Steps" items for the same staleness on a quiet session.
- **Two registration paths, two field conventions.** Adult `/signup` writes `name`, family-member adds write `display_name`. The codebase as a whole assumes both fields are interchangeable but neither path writes both. Easy class of bug — anywhere a developer writes "the user's name" they have to remember to read both. The S327 fix sets BOTH on the family-member path so going forward the inconsistency is gone for new rows.

---

## Files touched

| File | Change |
|:---|:---|
| `app/member/book/page.tsx` | Family-member insert sets both `name` and `display_name` |
| `app/api/score-entry/[sessionId]/route.ts` | SELECT includes `display_name`; resolves in athletes array + whiteboard dedup loop |
| `hooks/coach/useCoachData.ts` | SELECT includes `display_name`; maps to `name` field |
| `hooks/coach/useSessionDetails.ts` | SELECT includes `display_name`; normalizes before `filterAvailableMembers` |
| `components/coach/TenCardModal.tsx` | Prop type adds `display_name?`; header uses fallback |
| `memory-bank/memory-bank-activeContext.md` | Removed stale subscription bug carry-over; added S327 entry; bumped version 187→188 |

Single commit (per checklist default).
