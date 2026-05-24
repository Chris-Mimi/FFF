# Session 365 — Wellpass household-level restriction + status-label cleanup + manual household links

**Date:** 2026-05-24 (Opus 4.7) — short Sunday-evening session after S364, two commits.

---

## 1. Wellpass booking restriction is now HOUSEHOLD-level (not per-member)

**Why caught:** Chris asked "Sabrina signs in Wellpass for herself and her husband Wayne. If Wayne is linked to Sabrina, how many times can they book if blocked?" Code inspection revealed the cap was per-member (`COUNT bookings WHERE member_id = bookingMemberId`), so a 2-person household got 2 bookings/week when blocked; a 3-person household (Peresyov) would get 3. This contradicted the design intent — Wellpass requires the *household* to hit a weekly minimum, so the restriction should also apply at the household level.

**Shipped:**

- [app/api/bookings/create/route.ts](app/api/bookings/create/route.ts) now resolves the household before counting:
  1. SELECT `wellpass_identity_id`s linked to the booking member (typically just one, but the schema allows N).
  2. SELECT all `member_id`s linked to those identities (defensive: also include `bookingMemberId` in case of a stale link state).
  3. `COUNT bookings WHERE member_id IN (householdMemberIds) AND status='confirmed' AND session_id IN (weekSessionIds)`.
- Service-role client added inline — RLS hides cross-member rows in `wellpass_identity_members` from an athlete's own auth context, so anon would have silently returned the per-member subset (re-creating the bug).
- Defensive fallback: if the flagged member has no household link (shouldn't happen — recompute only flags linked members), fall back to per-member-only.
- German error message updated to `"Dein Wellpass-Haushalt hat in dieser Woche bereits einen Kurs gebucht. Wellpass-Haushalte werden auf 1 Buchung pro Woche begrenzt…"`.

**Behaviour change:**

| Household | Before | After |
|---|---|---|
| Single member | 1/week | 1/week (no change) |
| Sabrina + Wayne | 2/week | 1/week |
| Peresyov (3 members) | 3/week | 1/week |

**Commit:** `13c1b4b`.

---

## 2. Wellpass tab — hide `athlete_subscription_status` label unless `active`

**Why caught:** Chris pointed out that "expired" labels were appearing next to members on the Wellpass tab's linked-members panel, even for members who had never registered for the in-app athlete subscription. Root cause: the DB default for `athlete_subscription_status` is literally `'expired'`, not `null` — so members who never had a sub still display as "expired". Misleading on a tab where the focus is Wellpass household state, not the orthogonal in-app subscription.

**Shipped:** [components/coach/members/WellpassTab.tsx:436-447](components/coach/members/WellpassTab.tsx#L436-L447) — status span (and its separator dot) now only renders when `athlete_subscription_status === 'active'`. The teal `active` chip remains as a positive signal that the member is paying twice (Wellpass for gym + app subscription). Everyone else just shows their name.

**Discussed and rejected:**
- *Show "no app sub" instead of "expired"*: more accurate but still adds noise to a slot that's rarely meaningful on the Wellpass tab.
- *Remove the status entirely*: clean but loses the rare-but-useful `active` signal.

**Commit:** `33a3191`.

---

## 3. Manual Wellpass household links — Albrechts + Peresyovs

**Why caught:** Two households surfaced during the session where the auto-linker couldn't or wouldn't link members:

### Albrecht (nickname mismatch)
- Wellpass identity: `Conny Albrecht` (Excel)
- Members: `Cornelia Albrecht` (mum, primary) + `Luisa Albrecht` (child)
- Auto-linker uses exact normalized match + reverse-word-order. "Conny" ↔ "Cornelia" is a nickname, neither pass catches it.

### Peresyov (household members beyond the WP payer)
- Wellpass identity: `Dimitar Peresyov` (Excel)
- Members: `Peresyov Dimitar` (surname-first, reverse-words case), `Peresyova Regina` (Russian female suffix — likely wife), `Emilia Peresyov` (likely daughter, first-last format)
- S364's auto-linker would catch Dimitar on next import (reverse-word-order match), but Regina + Emilia are household members beyond the 1:1 name match — never auto-linked, always require manual.

**Shipped:** Inserted rows directly into `wellpass_identity_members` via inline script for both households (3 + 2 links respectively).

**Landmine identified:** The auto-linker treats "identity has any link → considered done" (skip set built from `linkedIds`). So if we'd linked Regina + Emilia BEFORE Chris's resync, the linker would have skipped Dimitar's identity and Dimitar himself would have stayed unlinked. Pattern: when adding household links manually, link ALL members in one shot, including the WP payer — don't rely on the next sync to fill in the gap.

---

## 4. Decisions parked

- **Nickname auto-linking** (Conny↔Cornelia, Susi↔Susanne, etc.): Chris rejected — "doesn't happen that often" + he can rename in Supabase if it does. Manual link continues as the path for nickname cases.
- **Athlete Test 1 Wellpass setup**: kept as a permanent test fixture (identity `dd566f85-…` + link + W21=0 row). Chris flips `membership_types` back to `wellpass` himself when he needs the restricted-flow available to test against.
- **Marion ↔ Michael Weber link**: Chris confirmed they're already linked — earlier `+1 manual adjustment` carry-over guidance is stale, removed from activeContext.

---

## 5. Admin tasks

- Magic links generated: `vrbanic@gmx.de`, `lilia.zi@gmx.de`.

---

## 6. Commits

1. `33a3191` — `fix(session-365): Wellpass tab — hide athlete sub status unless 'active'` (also includes activeContext carry-over updates for Athlete Test 1 + Marion + Conny manual links)
2. `13c1b4b` — `fix(session-365): Wellpass booking restriction is now household-level`

Plus this close-session commit (memory bank + project-history + feature overview).
