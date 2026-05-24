# Session 364 — Tiered booking release + Wellpass missing-from-Excel fix + capacity parity

**Date:** 2026-05-24 (Opus 4.7) — long Sunday session, nine commits.

---

## 1. Tiered booking release (priority vs Wellpass-restricted)

**Why:** Chris wanted to spread out the Sunday booking rush. Priority tier (members + app subscribers + Wellpass households meeting their weekly check-in quota) should open early; Wellpass-restricted households open later.

**Shipped:**

- `database/20260524_session364_tiered_booking_release.sql` (gitignored): added `booking_rules.wellpass_restricted_release_offset_minutes` (default 0 = no tiering, backwards compatible).
- [lib/bookingRules.ts](lib/bookingRules.ts): `getMaxVisibleSessionDate` gained an optional `restricted` param that shifts the release instant later by the offset. New exported `getNextReleaseInstant` helper returns the next upcoming release instant for the viewer's tier (used by the UI countdown).
- [app/api/bookings/create/route.ts](app/api/bookings/create/route.ts): server gate now passes `member.wellpass_booking_restricted` so server enforcement matches the page-side gate.
- [app/api/booking-rules/public/route.ts](app/api/booking-rules/public/route.ts): exposes the new offset column to the athlete page.
- [app/member/book/page.tsx](app/member/book/page.tsx):
  - Fetches `wellpass_booking_restricted` in the member SELECT and stores in `isWellpassRestricted` state.
  - Passes the flag to `getMaxVisibleSessionDate` so each member sees only their tier's slots.
  - Renders a teal countdown banner above the session list — *"Buchungen für nächste Woche öffnen in 1 Std. 12 Min."* — refreshing every 60s via the existing nowMs tick. Suppresses the generic "No sessions available" empty state so athletes don't see a confusing default when the gate is the real reason.
- [app/coach/admin/booking-rules/page.tsx](app/coach/admin/booking-rules/page.tsx) + [app/api/admin/booking-rules/route.ts](app/api/admin/booking-rules/route.ts): added "Wellpass restricted-tier offset" minutes field on the Admin Booking Rules tab so the offset can be tuned via UI.

**Today's config (Chris-set via UI):** base release 16:00 Berlin (priority tier), offset 120 min → restricted tier opens at 18:00.

**Commits:** `a6e1f93`, `0b2c273`.

---

## 2. Countdown banner visibility window — Sunday from 12:00 only

**Why:** Initial implementation showed the banner every day until release fired. Mon-Sat would display "in 130 Std." which was noise. Chris's program drops Sunday, athletes only care when it's near.

**Shipped:** `getNextReleaseInstant` now gates output to a visibility window — `current Berlin dow === next_week_release_day_of_week && Berlin hour >= 12`. Returns null outside the window. Extended `berlinWallClock` to also return `hour` so the gate can check it cleanly. 12:00 cutoff is hardcoded — no UI exposure requested.

**Commit:** `ae51958`.

---

## 3. Date-gate TZ bug (Monday next-week sessions leaked)

**Why caught:** Chris populated next week's sessions early in `/coach/schedule`, then checked his athlete view. Two newly-created Monday sessions (Hero WOD "Murph") appeared in the booking list despite the release gate. API correctly rejected the booking ("not yet open"), but the page query let them render.

**Root cause:** `getMaxVisibleSessionDate` returned end-of-Sunday as `23:59:59 UTC` = `Mon 01:59 Berlin`. `formatLocalDate` (browser-local) read `getDate()` → 25 → `"2026-05-25"`. Page query `lte('date', '2026-05-25')` then allowed exactly Monday rows through. Latent bug — only surfaces when next week has Monday sessions AND someone navigates past the gate before release.

**Fix:** changed end-of-week instant to `12:00 UTC` (well inside Berlin Sunday under any DST). API's `>` comparison against midnight-UTC session dates still works.

**Commit:** `773d3e8`.

---

## 4. Wellpass — missing-from-Excel auto-block + always-show Block button

**Why caught:** Chris wanted to block Franziska Kary (who hadn't appeared in the last 2 weekly Excel imports). She wasn't visible as actionable in the Wellpass tab. Root cause was three compounding issues:

1. Status calculation used her most recent stored week (W19, 3 check-ins) — meets her min of 3 → status `'ok'`.
2. Block button only rendered when `status === 'below_threshold'` → no button visible.
3. `recomputeBlockStatus` only touched identities present in the new Excel — Franziska's identity got skipped because she wasn't in the file.

**Shipped:**

- **A. Per-week zero-fill** in [app/api/coach/wellpass/import/route.ts](app/api/coach/wellpass/import/route.ts): for each week in the parsed Excel, build the set of identity IDs present in THAT week and insert a 0-check-in row for every tracked identity not in the set. Uses `upsert ignoreDuplicates: true` so pre-existing real values are preserved. Recompute then runs on the union of imported + all tracked.
- **B. Always-show Block button** in [components/coach/members/WellpassTab.tsx](components/coach/members/WellpassTab.tsx): removed the `row.status === 'below_threshold' && !row.is_exempt` gate. Block now appears on every tracked household row regardless of computed status — manual override.

**Iteration:** First version of A used "missing from Excel anywhere" — but Franziska was in W20 (not W21), so she was treated as "imported" and skipped from zero-fill entirely. Fixed to be per-week.

**Commits:** `1175897` (initial), `785cfb6` (per-week fix).

---

## 5. Wellpass auto-linker — reverse word-order fallback

**Why caught:** Andreas Keip (paid app subscriber via cash) appeared in the Wellpass tab but not flagged as "app payer." Diagnosis: his member.name is `"Andreas Keip"`, the Wellpass Excel uses `"Keip Andreas"` (German last-first convention). The auto-linker normalized case + whitespace but not word order → identity stayed unlinked → no member to derive payer status from. Same bug class as S361 Martina Fenster (second time this hit).

**Shipped:**

- Manual link inserted for Andreas via inline script.
- Two-pass linker in [app/api/coach/wellpass/import/route.ts](app/api/coach/wellpass/import/route.ts): (1) exact normalized match (existing behaviour), then (2) reverse-word-order fallback for members still unlinked. Identity removed from both candidate maps on match so no double-linking. Catches any other German-format identity sitting unlinked in the DB on next sync.

**Commit:** `99bdbbb`.

---

## 6. Athlete booking page — coach-parity capacity + hide OG/trial names

**Why caught:** Chris marked Sandra Lederle as Open Gym on a session. Coach correctly showed "6/10 free (+1 OG)" but athlete card showed "7/10". Off-by-one in opposite directions because the displays computed different things on the same data.

**Shipped:**

- [app/member/book/page.tsx](app/member/book/page.tsx) fetchSessions now SELECTs `is_og`, `is_trial` on bookings and `trial_names` on weekly_sessions. Computes capacity as `(confirmed && !is_og && !is_trial).length + trial_names.length` — matches the coach formula in the S343/S351/S360 landmine exactly.
- [app/api/bookings/attendees/route.ts](app/api/bookings/attendees/route.ts) excludes OG/trial bookings from the "Also attending" name list visible to other athletes. The viewer's own OG/trial booking still puts them in `bookedSessionIds` so they see the attendee list when attending in any form. Guarded `sessionBookings[sid]` with `?? []` since a session can now be in bookedSessionIds without any visible co-attendees.

**Commit:** `f48f1fa`. Lint hotfix `e823269` — eslint-disable directive sitting on a const declaration instead of the line using `(b: any)`; build failed on Vercel until moved.

---

## 7. Manual test setups + magic links

- **Athlete Test 1**: created Wellpass identity (`tracked=true`, min_checkins=3), linked to member, inserted W21=0 row, flipped `wellpass_booking_restricted=true`. Used to verify the restricted-tier flow end-to-end. Flag manually cleared mid-session when Chris changed her membership_types to test the other flow.
- **Franziska Kary**: directly flipped `wellpass_booking_restricted=true` via inline script (couldn't use UI initially because of the three-issue bug above; resolved after deploy).
- **Andreas Keip**: manually inserted `wellpass_identity_members` link before the auto-linker fix deployed.
- Magic links generated for: Zoran Vrbanic, Thomas Spegele, Rosita Blum, byandrej (Andreas Keip), Paul Bielenski.

---

## 8. Discussed / decided to NOT ship

- **Membership-type cascade for `wellpass_booking_restricted`**: Chris's mental model was that changing `members.membership_types` away from `'wellpass'` should auto-clear the restriction flag. Confirmed it's rare in practice (athletes don't transition between WP and Member often); decided to keep manual flag-clearing as the path rather than add code complexity.
- **Days formatting on countdown** (e.g. "in 2 Tagen" past 24h): dropped after the visibility window was scoped to Sunday 12:00 only — countdown can never exceed ~5 hours so hours+minutes formatting is sufficient.

---

## 9. Commits

1. `a6e1f93` feat: tiered booking release — Wellpass offset + countdown banner
2. `773d3e8` fix: release-gate TZ bug — Monday next-week sessions leaked through
3. `1175897` fix: Wellpass — auto-block missing-from-Excel + always-show Block btn
4. `785cfb6` fix: Wellpass zero-fill is per-week, not per-file
5. `99bdbbb` fix: Wellpass auto-linker — reverse-word-order fallback
6. `0b2c273` feat: Admin Booking Rules — Wellpass restricted offset field
7. `f48f1fa` fix: athlete book page — coach-parity capacity + hide OG/trial names
8. `e823269` fix: lint — move eslint-disable to the line using 'any'
9. `ae51958` feat: countdown banner only on release day from 12:00 Berlin
10. (this session-close commit) — memory bank + project-history + feature overview
