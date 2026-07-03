# Session 393 — Security + Data-integrity audit (passes 1–3) & DOB-typo fix

**Date:** 2026-07-03 · **Model:** Opus 4.8 · **Commits:** `45a3acf`, `16de732`, `26ed7e1`, `9f6ee75`, `f8e76ad`

## How the session started (Fable 5 advisory)
Opened as an advisory chat about whether to switch to **Fable 5** for a full audit. The pasted
transcript made confident claims (pricing $10/$50 per M, "50% weekly limits to July 7",
a June-12 export-control saga, a `redeploying-fable-5` URL). **None of it was verifiable** — flagged
as likely fabricated; told Chris not to base a spend decision on it and to check the real pricing
page + usage dashboard.

Landed on a concrete plan: **run the mechanical audit on Opus, reserve Fable 5 for the one
reasoning-heavy slice (pass 4).** Chris chose scope = **Security + Data-integrity only** (performance
and architecture deliberately out of scope). Framed the audit as 4 passes:
1. auth/authz · 2. data-loss paths · 3. timezone · 4. cross-cutting reasoning (judgment bugs).

## Pass 1 — auth/authz (`45a3acf`)
Scanned all 71 API routes + 73 service-role (RLS-bypassing) sites.
- **8 routes had no `requireCoach`/`requireAuth`**; 6 were fine (bookings do manual `getUser()` +
  ownership checks; stripe webhook is signature-verified; signup/register/booking-rules public).
- **cron/expire-memberships** was **fail-open**: `if (process.env.CRON_SECRET && ...)` skipped the check
  entirely when the var is unset. Made it fail-closed. Chris confirmed `CRON_SECRET` is set in Vercel.
- **stripe/create-checkout** = MEDIUM IDOR: authenticated, then trusted `memberId` from the body and
  never re-checked `user.id`. Added an ownership guard (self, or a `family_member` whose
  `primary_member_id === user.id`) — mirrors `bookings/create`, so parents-pay-for-kids still works.
- **achievements/athlete-records** = LOW IDOR: `requireAuth` let any athlete read another's achievements
  by URL param. Its only caller is the coach award modal → changed to `requireCoach`. Not exploitable
  via the app UI; closed anyway.
- **Deferred (Chris's call):** `members/check-status` is an open email-enumeration endpoint (LOW; likely
  intentional for friendly signup messages).

## Pass 2 — data-loss paths (`16de732`)
**1000-row cap (S349 class):** scanned 226 growing-table reads with a Python scanner; 7 of 9 flags were
false positives (date-windowed / member-scoped / already paginated / count-only). **2 real:**
- `useCoachData:85` — the coach-calendar `weekly_sessions` fetch was unbounded. **Latent** (Chris
  checked: 402 rows, ~40% of the cap) but would silently drop the *newest* sessions once >1000.
  Paginated with the `.range()` loop already used 10 lines above.
- `useMemberData:27` — the unlinked-whiteboard-names scan over `wod_section_results` (2,448 rows) was
  unbounded → the list was **likely already truncating**. Paginated.

**Timezone:** triaged 49 sites. Pattern-1 (`` new Date(`date T time`) ``) mostly safe (client-side Berlin
browsers, sort keys, explicit `Z`, comments); the 2 server-side spots verified safe (noon-buffer / pure
date arithmetic). Pattern-2 (`.toISOString().split('T')[0]`) — 34 cosmetic/user-editable left alone; **6
that persist a date** (award / benchmark-results ×3 / movement-results) fixed.

**Key discovery:** the existing rule said "use `formatDate` for today-as-YYYY-MM-DD" — but `formatDate`
uses `getFullYear/getMonth/getDate`, which read the *runtime* TZ. On Vercel (UTC, no `TZ` env var) that's
the **UTC date**, same bug. Added `berlinToday()` (`Intl` + `Europe/Berlin`) to `lib/bookingRules.ts` and
pointed the 6 server spots at it.

## Pass 3 rule fix (`26ed7e1`)
Updated `claude-rules.md`: browser → `formatDate`, **server → `berlinToday`**, with an explicit
"don't 'fix' a server-side date bug with formatDate — it's a no-op there" warning.

## Kickoff note (`9f6ee75`)
Parked **audit pass 4 (cross-cutting reasoning)** as the best Fable-5 test-drive candidate, and added a
**quarterly security + data-integrity scan** reminder (next due ~2026-10-03). Rationale: the 1000-row cap
is invisible until a table crosses 1000, and the gym grows ~330 bookings/mo.

## Bodo Lehmann "missing from the Workouts athlete filter" (`f8e76ad`)
Chris reported Bodo absent from the Workouts athletes list. Traced the list to `useCoachData.fetchMembers`
(`status='active' AND guardian_only=false`). Bodo passed both (`shown=true`, 13 attendances) — so the DB
gate wasn't it. The real filter is downstream in **SearchPanel**, which splits members into **Athletes
(16+)** vs **Kids (<16)** purely from `date_of_birth`. Bodo's DOB was **`2026-03-09`** (current year) → the
app computed him as an infant → filed under **Kids**.

Cross-table sweep found **two more with the same current-year typo**, both real attendees: **Aliona**
(`2026-06-17`, 3 visits) and **Emilia Peresyov** (`2026-06-12`, 1 visit).

**Why it happens:** athletes enter their *own* DOB, and the mobile year dropdown listed the current year
at the top of the list → thumb mistap. Chris's first instinct ("min age 3") would have blocked genuine
Eltern-Kind-Turnen toddlers (~1–2). Data confirmed the youngest genuine member is born **2023**, and none
are born in the current year → the safe, zero-false-positive rule is **"not this year or later,"** not a
years-based minimum.

**Fix (athlete profile form — it saves directly to the DB from the browser, no API route):**
desktop date `max` = last day of last year; mobile year list starts at last year; save-handler rejects a
current-year/future DOB with a toast. Chris corrected the 2 kids in-session; will fix Bodo's DOB tonight.

## Rejected / not done
- Fixing all 40 timezone sites (34 are cosmetic/user-editable — noisy churn).
- A years-based minimum-age DOB floor (would block genuine toddlers).
- Auto-running Fable 5 or a scheduled cloud audit agent (billed; left as a passive reminder).
- Performance + architecture audit (out of scope by Chris's choice).

## Landmines / follow-ups
- **`members/check-status`** email-enumeration still open (LOW) — Chris to decide.
- **Pass 4** (silent partial-failures, webhook races) is the remaining audit slice — Fable-5 candidate.
- After Bodo's DOB is corrected, confirm he returns to the **Athletes** section on the Workouts filter.
