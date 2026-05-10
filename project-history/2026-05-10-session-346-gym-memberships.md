# Session 346 — Gym membership contract tracking

**Date:** 2026-05-10 (Opus 4.7)

**Trigger:** Chris sold a gym membership and realised there's nowhere in the app to track it. Payment happens externally (annual upfront or monthly standing order); he just wants reminders 1 month and 2 weeks before each contract renews. No payment processing, no monthly reminders.

Three contract types:
- Full year, paid upfront (12 months)
- 1 year contract, paid monthly via standing order (12 months)
- 6 months contract, paid monthly via standing order (6 months)

---

## Architecture

New domain, distinct from existing concepts:
- `members.athlete_subscription_*` = Stripe-managed app subscription
- `members.ten_card_*` = drop-in pay-per-use
- **NEW** `gym_memberships` = the gym contract itself, paid externally

One row per signed contract. Renewal creates a NEW row (history preserved). Auto-expire daily flips active rows past `end_date` to `expired`.

### Schema

```sql
CREATE TABLE gym_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  contract_type TEXT NOT NULL CHECK (contract_type IN (
    'full_year_upfront', 'monthly_1_year', 'monthly_6_months'
  )),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Migration file: `database/20260510_session346_gym_memberships.sql` (gitignored, applied manually in Supabase SQL editor).

---

## API

- `GET /api/coach/memberships?status=...` — list, joined with member name. Default filter: `active`.
- `POST /api/coach/memberships` — create. Body: `{ memberId, contractType, startDate, notes? }`. `end_date` auto-computed from contract type (12 or 6 months).
- `PATCH /api/coach/memberships/[id]` — update. If `contractType` or `startDate` changes, `end_date` is recomputed.
- `DELETE /api/coach/memberships/[id]` — hard delete. Use status='cancelled' for soft delete.
- `GET /api/cron/expire-memberships` — daily cron, gated on `Authorization: Bearer ${CRON_SECRET}`.

All four routes use `requireCoach` + service-role `supabaseAdmin`. RLS enabled on the table; all access goes through these endpoints.

`computeContractEndDate(startDate, contractType)` in `types/membership.ts` — adds 12 or 6 months, returns the day BEFORE the next anniversary (e.g. 2026-05-10 + 12mo → 2027-05-09).

### Vercel cron

`vercel.json` (new file) configures `/api/cron/expire-memberships` at `0 6 * * *` (06:00 UTC daily). `CRON_SECRET` env var set in Vercel Production environment. Vercel auto-attaches `Authorization: Bearer ${CRON_SECRET}` header on cron-triggered requests.

---

## UI

### `MembershipsTab` (in `/coach/admin`)

- Filter pills: Active / Expired / Cancelled / All. Default: Active.
- "+ Add Membership" button → modal with member search + contract type select + start date picker. End date previews live as inputs change. Notes textarea optional.
- Pencil icon → edit modal (contract type, start date, status, notes; member is locked).
- Trash icon → hard delete with confirm.
- Each row shows: name, status badge, contract type label, date range, days-left. Color band on active rows: amber ≤30d, red ≤14d.

Member picker queries `members WHERE status IN ('active','pending') AND account_type != 'family_member'` — kids can't be assigned a contract directly. Initial implementation capped the dropdown at 10 names; that broke scrolling because names alphabetised meant only A-names appeared. Lifted the cap.

### Banners on `/coach`

- New `MembershipsDueBanner` — same UI pattern as the existing `SubscriptionsDueBanner`. Sorts active memberships within 30 days of `end_date` ascending. Red ≤14d, amber ≤30d. "View" link → `/coach/admin`.
- Existing `SubscriptionsDueBanner` made collapsible (chevron + count badge always visible). Same collapse pattern on the new banner. localStorage persistence per-banner (`subscriptionsDueBanner:collapsed`, `membershipsDueBanner:collapsed`).
- Two separate banners by deliberate choice — Stripe app subs and gym contracts are different concerns with different actions.

---

## Files touched

| File | Change |
|:---|:---|
| `database/20260510_session346_gym_memberships.sql` | New — schema, indexes, updated_at trigger, RLS enable. |
| `types/membership.ts` | New — types + `computeContractEndDate` helper + label map. |
| `app/api/coach/memberships/route.ts` | New — GET (list), POST (create). |
| `app/api/coach/memberships/[id]/route.ts` | New — PATCH (edit), DELETE. |
| `app/api/cron/expire-memberships/route.ts` | New — daily cron, CRON_SECRET-gated. |
| `vercel.json` | New — cron schedule. |
| `components/coach/admin/MembershipsTab.tsx` | New — list, add modal, edit modal. |
| `components/coach/MembershipsDueBanner.tsx` | New — coach dashboard banner. |
| `components/coach/SubscriptionsDueBanner.tsx` | Collapsible with localStorage. |
| `app/coach/admin/page.tsx` | New "Memberships" tab alongside Attended + Incidents. |
| `app/coach/page.tsx` | Mount `MembershipsDueBanner` under `SubscriptionsDueBanner`. |

---

## Manual steps required at deploy time

1. Apply the SQL migration in Supabase SQL editor (`*.sql` is gitignored).
2. Set `CRON_SECRET` env var in Vercel Production. Redeploy after.

---

## What's NOT shipped (deferred)

- **Push notifications.** Chris explicitly said no — the banner alone is enough.
- **Athlete-side visibility.** Members don't see their own contract end date. Coach-only tool for now.
- **Bulk import.** Existing members would need 1-by-1 entry. Chris is happy adding contracts as new ones come in (data builds over time).
- **"Lapsed contracts" surfacing.** Chris said "not sure" when asked if expired-and-not-renewed rows should surface anywhere. They live in the Memberships tab under the "Expired" filter — visible when actively looking, but not in the banner. Avoid notification fatigue.

---

## Process moments

- **One bug surfaced post-ship: member picker cap broke scrolling.** Initial code did `members.slice(0, 10)` for both filtered and unfiltered views. With ~150 members alphabetised, the unfiltered list showed only first 10 (all "A" names). Chris caught it by trying to scroll. Removed the cap; the scrollable container handles long lists.
- **Edit modal added post-launch on Chris's ask.** Initial UI had only Add + Delete; Chris asked "can I edit it later, ie: add notes?" → wired up an edit modal (member locked, everything else editable).
