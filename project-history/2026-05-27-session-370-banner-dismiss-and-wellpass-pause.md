# Session 370 — Subscriptions Due per-row dismiss + Wellpass household pause + Synology Drive swap

**Date:** 2026-05-27 (Opus 4.7) — 1 work commit + close.

Started on Chris's primary Mac profile this time (S367 and S368 had both deferred the Synology swap because they ran on Mimi's profile). The big planned-for swap landed first, then Chris flagged two new coach-UX features that emerged from this morning's S367+S368 verification on prod.

---

## 1. Synology Drive Client swap — Mac instability investigation finally closed

Followed the runbook committed in S368 ([Chris Notes/Archive/historical root docs/synology-drive-migration-2026-05-27.md](../Chris%20Notes/Archive/historical%20root%20docs/synology-drive-migration-2026-05-27.md)). Installed Synology Drive Client 4.0.3-17892, removed legacy Cloud Station Drive 7.0.1.

**Sync reconciled cleanly with existing files** — the runbook's "DON'T let it re-download everything" check passed; the new client treated the existing local files as the source of truth.

**Verification via `~/mac-incident-data/capture.sh`:** `ecosystemanalyticsd` is GONE from the top 15 error producers (was the top producer at 100k+/run pre-fix). Residual low-rate ecosystem-analytics entries still appear, but the responsible process is now Spotify (also has an Intel/Rosetta component) — unrelated to Synology. Load avg 1.26.

Runbook archived to `Chris Notes/Archive/historical root docs/` (per claude-rules doc-archival pattern). `WHERE-IS-EVERYTHING.md` didn't reference it, so no map update needed.

Mac legacy instability investigation fully closed.

---

## 2. Subscriptions Due banner — per-row dismiss

Chris's spec: "remove the banner warning per athlete when I have verified their status."

**Design questions answered up front (one AskUserQuestion call, three options each):**
1. Dismiss lifetime → **Re-show if they lapse again later** (vs hide-forever / 14-day snooze)
2. Pause display → **Show row faded with badge** (vs hide entirely)
3. Pause + booking limit → **Lift the restriction during pause** (vs keep it)

All three answers were the "Recommended" option. Spec was clear after that.

### Schema

```sql
ALTER TABLE members
ADD COLUMN IF NOT EXISTS lapsed_banner_dismissed_at TIMESTAMPTZ NULL;
```

### Filter logic

The non-obvious part: how do you make "dismiss until next re-lapse" work without storing the dismissed lapse-date?

**Solution:** compare `dismissed_at` against the row's current lapse end-date.
- Cash-lapsed: end-date is `members.athlete_subscription_end`. Hide if `dismissed_at > end_date`.
- Stripe-lapsed: end-date is `subscriptions.current_period_end`. Same filter.

When the member renews, the end-date moves forward. When they re-lapse later, the new end-date exceeds the old `dismissed_at` → row reappears. No bookkeeping needed.

### UI

Small Lucide `X` icon at the far right of every lapsed row. Optimistic removal on click (local state filter before API returns), toast confirms "Dismissed — reappears on re-lapse", endpoint write happens async.

No undo button. Per Chris's "ask before adding friction" feedback, didn't add a confirm dialog either. Manual undo is clearing the column in Supabase — escape hatch documented in the memory entry.

### Why no undo?

Two cleaner alternatives discarded:
- **Confirmation prompt on click** — adds friction Chris explicitly doesn't want
- **"Show dismissed (N)" toggle in banner header** — adds permanent UI clutter for a rare event (mis-clicks)

The dismiss is per-member, scoped to "banner only", and self-recovers on re-lapse. The cost of a mis-click is "this lapsed athlete won't appear in the banner until they pay + re-lapse" — Chris will notice via other channels (member messages, attendance) long before that becomes a problem.

---

## 3. Wellpass household pause

Chris's spec: "I need to be able to pause an athlete's Wellpass/Bookings count on the Members page/Wellpass tab in the case that they are injured or away from the box for some reason. It should not track them in this case"

### Schema

```sql
ALTER TABLE wellpass_identities
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS pause_reason TEXT NULL;
```

Single timestamp serves as both "is paused" flag and "when did we pause". Free-text reason for the coach's own context.

### Three downstream effects

This is the part where I had to map "pause = ignore Wellpass logic" across every system that touches Wellpass state:

1. **GET [/api/coach/wellpass](../app/api/coach/wellpass/route.ts):** `status='paused'` is set ahead of any other state. Precedence over `no_data`/`below_threshold`/`ok` — paused identities never show a Wellpass-specific warning.
2. **Excel-import recompute** ([/api/coach/wellpass/import](../app/api/coach/wellpass/import/route.ts) → `recomputeBlockStatus`): `select` now includes `paused_at`; inner loop `continue`s on paused identities. `wellpass_booking_restricted` is never flipped on their linked members. Existing flags from a pre-pause import stay as-is.
3. **Booking-create** ([/api/bookings/create](../app/api/bookings/create/route.ts)): within the `if (member.wellpass_booking_restricted) { ... }` branch, after resolving `identityIds` from `wellpass_identity_members`, queries `wellpass_identities` for any row in those IDs with non-null `paused_at`. If found, skips the entire 1/week household-cap query + 403. Wrapped the existing logic in `if (!isPaused) { ... }`.

Item 3 was the trickiest — my first attempt called a `proceedWithBooking()` function that didn't exist. Refactored to a `isPaused` boolean gate around the existing flow. Tested via typecheck.

### Pause vs Untrack — two separate buttons in the same expanded section

Pause = soft, reversible, data-preserving. Status flips to `paused`, Score hides, behavior changes. Resume nulls both columns and behavior returns. Excel-import still imports new check-in rows (data accumulates for when they resume).

Untrack = removes from the main tracked list entirely. The household effectively disappears from the Wellpass tab unless you expand the "Untracked names" panel. Used when "we don't care about this household at all anymore" — like a former athlete who deleted their account.

I considered merging the two ("pause is just a temporary untrack"), rejected it because:
- Untracked → no enforcement, no tracking, completely silent
- Paused → still in the main list (faded), still imports new data, just exempt from active enforcement
- The `paused` status badge is a visible reminder that this household exists and is waiting

### UX choice: browser `prompt()` for reason

Could have built a proper modal. Used `prompt()` instead — coach uses this maybe a couple of times a month, modal would have been over-engineering. Empty input is allowed (reason is optional).

---

## 4. .env.local tidied

Chris noticed VS Code asked to save `.env.local` when he tried to close it; he wasn't aware of any changes. Read-only inspection showed an orphan "Public Key: / Private Key:" notes block (no `=` sign, so Node's env loader was already skipping it — inert at runtime). Different keys from the actual VAPID env vars at the bottom, so really just orphaned notes from an earlier session.

Removed lines 31-35 with his approval. `.env.local` is gitignored — no commit impact.

---

## 5. Process moments

**Plan-mode bypass worked well.** Two-feature work, ~7 files touched, but no Plan mode was used — the design questions resolved up-front via AskUserQuestion made the structure clear enough that I could proceed feature-by-feature. Each feature got a brief "here's the file plan, OK to proceed?" check before code.

**Asking 3 design questions up-front saved ~3 rounds of clarification.** All three were "Recommended option" answers; the recommendations matched Chris's mental model. Without the questions I might have built the wrong default for undo-behavior or paused-row visibility.

**activeContext write-up was a touch heavy.** This file is at the upper end of my own "~150 lines / 5KB" guidance (per claude-rules). Should probably have trimmed the header paragraph more aggressively — but it's a session with two distinct features + a major resolution, so the verbosity might earn its keep this once.

**No TodoWrite used.** Each phase was 1-3 steps, mostly atomic. The `<system-reminder>` flagged TodoWrite repeatedly — ignored each time per claude-rules #5 ("No TodoWrite for 1–3 step tasks").

## Files modified

| File | Change |
|:---|:---|
| `supabase/migrations/20260527000000_add_lapsed_banner_dismissed_at.sql` | NEW |
| `supabase/migrations/20260527000001_add_wellpass_pause.sql` | NEW |
| `app/api/coach/dismiss-lapsed-banner/route.ts` | NEW |
| `app/api/bookings/create/route.ts` | pause check lifts 1/week cap |
| `app/api/coach/wellpass/route.ts` | `status='paused'` precedence |
| `app/api/coach/wellpass/import/route.ts` | skip paused in recompute |
| `app/api/coach/wellpass/identity/[id]/route.ts` | PATCH accepts `paused` + `pause_reason` |
| `components/coach/SubscriptionsDueBanner.tsx` | per-row X + dismiss filter |
| `components/coach/members/WellpassTab.tsx` | Pause/Resume button + faded paused row |
| `types/wellpass.ts` | `paused_at`/`pause_reason` + `'paused'` status |
| `memory-bank/activeContext.md` | S370 entry, S365 rotated out, kickoff rewritten |
| `Chris Notes/Archive/historical root docs/synology-drive-migration-2026-05-27.md` | moved from AA frequently used files |
| `.env.local` | orphan VAPID-notes block removed (gitignored) |

## Commits

1. `506acac` — `feat(session-370): dismiss banner per row + pause Wellpass tracking per household`
2. Close-session commit (this file + activeContext + Notes sync).
