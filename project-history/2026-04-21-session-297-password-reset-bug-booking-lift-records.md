# Session 297 — Password Reset Bug + Booking Lift Records Fix

**Date:** 2026-04-21
**Model:** Opus 4.7
**Persona:** Bugfix / incident response
**Status:** Shipped (2 commits) — SMTP config done in Supabase dashboard

---

## Goal

Two uncommitted bugs from prior debugging session needed to ship:

1. Coach "Remove Booking" was not deleting the athlete's `lift_records`, so the
   WOD's lift entries persisted after the booking was removed.
2. Password reset flow had silently overwritten the **wrong user's** password
   when a recovery link was clicked while already logged in as a different
   account (happened live to Chris mid-session — his coach login was broken
   and required a SQL `UPDATE auth.users SET encrypted_password = crypt(...)`
   to restore).

Also: configure Resend as custom SMTP in Supabase so password reset emails
don't route through Supabase's shared 4/hour pool.

---

## Bug 1 — Remove Booking didn't delete `lift_records`

### Root cause

`lift_records.user_id` references `auth.users.id`, not `members.id`. The
cancel/remove flow filtered the delete by `memberId` directly, so for any
athlete whose `members.id` differs from their `auth.users.id` (the normal
case), the `lift_records` rows silently weren't touched.

### Fix

Capture `user_id` values from `wod_section_results` **before** deleting them,
then use that list to delete matching `lift_records`.

### Files

- [hooks/coach/useBookingManagement.ts:252-275](hooks/coach/useBookingManagement.ts#L252-L275) — coach side (Remove Booking)
- [app/api/bookings/cancel/route.ts:170-193](app/api/bookings/cancel/route.ts#L170-L193) — API side (athlete self-cancel + server fallback)

Both paths now:

```ts
const { data: existingResults } = await supabase
  .from('wod_section_results')
  .select('user_id')
  .eq('wod_id', session.workout_id)
  .or(`member_id.eq.${memberId},user_id.eq.${memberId}`);

const userIds = [...new Set((existingResults || []).map(r => r.user_id).filter(Boolean))];

await supabase.from('wod_section_results').delete()...;

if (userIds.length > 0) {
  await supabase.from('lift_records').delete()
    .eq('wod_id', session.workout_id)
    .in('user_id', userIds);
}
```

**Commit:** `3e0892d` — `fix(session-297): delete lift_records by auth user_id, not member_id`

---

## Bug 2 — Password reset overwrote the wrong user's password (CRITICAL)

### What happened (live)

Chris was logged in as a coach in one browser tab. He clicked an athlete's
password recovery link in another tab. The code exchange on `/auth/callback`
**failed silently** (error swallowed by `await supabase.auth.exchangeCodeForSession(code)`
with no error handling). Because the failure didn't clear his existing session,
he was still authenticated as the coach. `/reset-password` then called
`supabase.auth.updateUser({ password })` — which updated the **coach's**
password to the athlete's intended new password.

Result: coach login broken mid-session. Chris restored both accounts via SQL:

```sql
UPDATE auth.users SET encrypted_password = crypt('...', gen_salt('bf')) WHERE email = '...';
```

### Root cause

Three layers:

1. `/auth/callback` silently swallowed errors from `exchangeCodeForSession`.
2. No pre-exchange signout, so a stale session from another tab kept the
   previous user authenticated.
3. `/reset-password` never verified **whose** session it was updating; it
   trusted whatever session was active.

### Fix

- [app/auth/callback/route.ts](app/auth/callback/route.ts) — for recovery
  flows (`next=/reset-password`), sign out any existing session **before**
  the code exchange. Capture and surface exchange errors, redirect to
  `/login?error=reset_link_invalid`.
- [app/reset-password/page.tsx](app/reset-password/page.tsx) — verify active
  session on mount with `supabase.auth.getUser()`. If no session, redirect
  to `/login?error=reset_link_invalid`. Display the session email above the
  form ("Updating password for [email]") so the user sees whose account
  they're modifying.
- [app/login/page.tsx](app/login/page.tsx) — read `?error=reset_link_invalid`
  query param and show "Your password reset link is invalid or has expired.
  Please request a new one."

**Commit:** `bd594e4` — `fix(session-297): prevent password reset from overwriting wrong user`

---

## SMTP — Resend custom sender for Supabase Auth

Configured in Supabase dashboard (not code):

- **Provider:** Resend
- **Sender:** `noreply@the-forge-functional-fitness.de`
- **Effect:** password reset emails now route through Resend, not Supabase's
  shared 4/hour pool.

### Deliverability notes

Gmail still flags some cold sends as suspicious (strips the link, shows
warning banner). Expected to improve as:

- DKIM / SPF / DMARC records fully propagate in Resend → Domains
- Sender reputation builds with volume

**Todo:** Verify SPF / DKIM / DMARC all ✅ in Resend → Domains →
`the-forge-functional-fitness.de`, then run the full reset flow on deployed
app end-to-end.

---

## Decisions

1. **Two-step delete for lift_records** (capture IDs first, then filter
   delete) rather than a single SQL `DELETE ... USING` subquery. Supabase-js
   doesn't expose `USING` cleanly, and the two-query version is readable and
   matches the existing pattern in both call sites.
2. **Signout-before-exchange** rather than a stricter "only allow recovery
   exchange if no session exists" rule. Reason: users in good faith who click
   a recovery link from the same browser they're logged in as (a common
   scenario) shouldn't be blocked.
3. **Display session email on reset page** as a belt-and-braces measure —
   even with the backend fixes, showing the user which account they're
   updating is the last line of defense against confusion.
4. **No code-level SMTP config.** Supabase manages SMTP in dashboard; adding
   env vars would just duplicate state.

---

## Follow-ups

- **Coach profile / change-password page** (Chris requested) — no UI exists
  for a logged-in coach to change their own password, which is why the SQL
  fallback was needed in this incident. Small page, same pattern as
  `/reset-password` but accessed while logged in.
- **Verify DNS records (SPF/DKIM/DMARC)** on Resend dashboard.
- **Test full reset flow on deployed app** — should now show "Updating
  password for [email]" above the form.

---

## Still open from Session 296

- Live-test Intervals timer mode on deployed app
- Whiteboard duplicate entries (uncommitted from S251)
- Athlete subscription bug (Stefan Glocker, trialing → end_date wrong)
- Mac Chrome hang (system-level, separate session)
- Score-entry API filter (S289 deferral)
