# Session 377 — Wellpass blocking redesign + Unblock-all + Dev env setup

**Date:** 2026-06-10
**Model:** Opus 4.7
**Commit:** _added at close_

---

## What shipped

### 1. Wellpass blocking system — single-week rule → 3-gate redesign

**Before.** Recompute at every Excel import: `shouldBlock = !exempt && latestWeek.checkin_count < min_checkins_required`. One bad week (sick, vacation, holiday) blocked an otherwise-consistent user. Particularly brittle for spouse-shared identities at min=6 — no headroom (logins capped at 1/day = 7/wk max), one missed week below 6 → blocked.

**After.** Three gates, all must pass to be unblocked. Block if ANY fails:

| Gate | Window | Threshold | Catches |
|---|---|---|---|
| A. Recent dormancy | last 4 wks | sum ≥ 3 × min | Stopped recently |
| B. Annual pace | last 12 wks | sum ≥ 9 × min | Quietly under-pacing the yearly target |
| C. Ratio (shared only) | last 13 wks | logins / attendances ≥ 1.5 | Account holder not padding rest-day logins for the partner |

Each gate has a grace period — auto-passes when the identity has fewer than `window` weeks of data. New identities can't be blocked until they accumulate history.

Solo identities skip gate C entirely (they have no partner to pad for). Paused / exempt identities skip everything.

### 2. Math centralized — `lib/coach/wellpassScoring.ts` (new)

Pure functions:
- `computeMetrics(weeklyLogins, weeklyAttendances, identity, isShared, now)` → all metric numbers (4wk/12wk/13wk sums, YTD logins/target/%/ratio, all-time logins/target/%/ratio).
- `decideBlock(metrics, identity, isExempt, isShared)` → `{ shouldBlock, reason, ratioFlag }`.
- `loadScoringData(supabase, identityIds, memberIdToIdentityIds)` — bulk loader that paginates `wellpass_weekly_checkins` AND `bookings` for ALL identities at once (per claude-rules growing-table caution).

Constants at top so future thresholds can be dialed in one place:

```ts
WINDOW_4WK = 4;            WINDOW_12WK = 12;          WINDOW_RATIO = 13;
DEFICIT_MULTIPLIER_4WK = 3;  DEFICIT_MULTIPLIER_12WK = 9;
RATIO_THRESHOLD = 1.5;
```

Called from both `/api/coach/wellpass` GET (for the tab) and `/api/coach/wellpass/import` (recompute) so the displayed verdict equals what the recompute will write.

### 3. UI — `components/coach/members/WellpassTab.tsx`

- Old lifetime `+N/-N` Score column **replaced** by two new columns: **YTD %** and **All-time %** (logins ÷ target × 100). Green ≥100, amber 80–99, red <80. Tooltips show the raw numerator/denominator.
- Inline **ratio chip** under each shared-identity name (e.g. `1.25×`). Green when ≥1.5, amber when below.
- Status badge on blocked rows now has a hover tooltip naming which rule tripped: *recent dormancy* / *annual pace* / *ratio sustained*.
- Header description updated to explain the new columns.

### 4. Unblock all (N) — new endpoint + button

[/api/coach/wellpass/unblock-all](app/api/coach/wellpass/unblock-all/route.ts) (POST, coach-gated, service-role) — bulk clears `wellpass_booking_restricted` on every member where it's true. Returns the count unblocked.

Header button in WellpassTab appears only when ≥1 member is blocked (no clutter when there's nothing to do). Confirmation dialog spells out the count AND warns: *any household still below their weekly minimum will be re-blocked at the next Excel sync.* For permanent exemptions, Chris should use the per-identity `exemption_mode='always_exempt'` dropdown — the unblock-all is a one-shot.

### 5. Cross-machine setup (Synology Drive)

Session started on Chris's Windows PC after months of Mac-only work. Macbook had pushed the previous evening; Synology Drive on the Windows side hadn't finished syncing, so `git pull` failed with ~100 files "would be overwritten." Diagnosed, confirmed remote was the source of truth, ran `git fetch && git reset --hard origin/main && git clean -fd`, then `npm install` to pick up the 10 packages added on Mac (drag-drop-touch, xlsx, etc.) so the dev server would build.

**Persistence added so this doesn't repeat:**

- New **🖥️ DEV ENVIRONMENT** section at the top of `memory-bank/activeContext.md` explaining the two-machine setup + Windows session-start workflow.
- Auto-memory at `C:\Users\Chris\.claude\projects\.../memory/dev_environment_synology_sync.md` for the same.
- `Chris Notes/AA frequently used files/Claude open or close session.md` rewritten with **relative paths** (works on both machines) + a Windows `git pull` caveat.
- `Chris Notes/AA frequently used files/free-ports info & help.md` got a PowerShell one-liner at the top (`Get-NetTCPConnection -LocalPort (3000..3009) ... | Stop-Process`) for kill-ports on Windows since `lsof`/`kill` don't exist there.
- PowerShell tool auto-allowed in `~/.claude/settings.json` so it matches the Bash auto-allow on the Macbook.

---

## Design decisions + alternatives rejected

### Why "deficit/surplus accounting" (sum ≥ 3×min) instead of average (avg ≥ min)?

Considered first: `avg(last 4 wks) < min` → block. **Rejected** because for min=6 (spouse-shared) there's no headroom — every week must hit 6 exactly to keep avg≥6, so a single 4-week dropped Sabrina+spouse to avg 5.5 → still blocked. The 1-week-deficit-allowed framing fixes this: 4-week sum ≥ 3×min lets a household over-deliver one week (max 7) and compensate for an under-delivery another week.

### Why "count weeks below" was also rejected

`Block if ≥2 of last 4 weeks below min` is human-intuitive but doesn't credit over-delivery. Klaus's `6, 0, 6, 0` has 2 weeks below → blocked, even though he averaged exactly min and is hitting it half the time. Chris explicitly said over-delivery should compensate, which only the sum-based rule honors.

### Why ratio rule lives at 13 weeks (not YTD)

Chris's first instinct: "YTD" — strict calendar-year reset. **Rejected** in favor of rolling 13 weeks because:
- Stable window size — same rule in week 5 of January as week 50 of December.
- Catches quarterly underperformance, which matches the "annual rate prorated to weeks" intuition for `min_checkins_required = 6`.
- Identity can recover sooner (don't have to wait until next January).

YTD numbers are still displayed for at-a-glance reading; just not used for the gate.

### Why 1.5× ratio threshold

Chris's call. The shared-Wellpass deal is "2 people, 1 account, you log in 6×/wk regardless of who attends — Forge gets paid even when no one trains." Realistically attendances will be lower than logins because both partners aren't there every session. 1.5× ratio means "for every 2 attended visits, 3 logins" — covers the rest-day padding the deal expects.

### Why solo identities are exempt from the ratio rule

Chris's correction during design: solo athletes log in 1:1 with attendance (or close to it). There's no spouse to pad for. Applying 1.5× to solo would unfairly flag someone whose login pattern is mechanically correct.

### Klaus / Marcus / Olaf / Sabrina archetypes (test cases mid-design)

| Archetype | Min | Last 4 wks | A pass? | B/C status | Expected |
|---|---|---|---|---|---|
| Sabrina solo sick once | 3 | 6,6,1,6 → 19 | ✅ | ✅/n/a | OK |
| Sabrina+Wayne sick once | 6 | 6,6,4,6 → 22 | ✅ (≥18) | depends on hist | OK (fixed!) |
| Marcus chronic 2/wk | 3 | 2,2,2,2 → 8 | ❌ (<9) | n/a | BLOCKED |
| Olaf stopped 6 wks ago | 3 | 0,0,0,0 → 0 | ❌ | ❌ | BLOCKED |
| Klaus alternating | 3 | 6,0,6,0 → 12 | ✅ (≥9) | n/a | OK (surplus comp) |
| Klaus only-1-good-wk | 3 | 6,0,0,0 → 6 | ❌ (<9) | ❌ | BLOCKED |
| Sabrina+Wayne real | 6 | (96 YTD vs 132 target) | will trip B + maybe C |  | BLOCKED-soon |

---

## Files touched

- **New:** `lib/coach/wellpassScoring.ts`, `app/api/coach/wellpass/unblock-all/route.ts`.
- **Updated:** `types/wellpass.ts` (new `WellpassScoreFields` interface merged into `WellpassIdentityRow`), `app/api/coach/wellpass/route.ts` (computes + returns score fields), `app/api/coach/wellpass/import/route.ts` (`recomputeBlockStatus` rewritten + bulk-loads), `components/coach/members/WellpassTab.tsx` (new columns, ratio chip, tooltip, Unblock-all button).
- **Cross-machine setup:** `memory-bank/activeContext.md` (DEV ENVIRONMENT section + landmines), `Chris Notes/AA frequently used files/Claude open or close session.md` (relative paths), `Chris Notes/AA frequently used files/free-ports info & help.md` (PowerShell section), `~/.claude/settings.json` (PowerShell allow), `package-lock.json` (npm install caught up).

Type-check clean. `npx next build` passed.

---

## Verify on production

1. Open `/coach/members` → Wellpass. Confirm new YTD % + All-time % columns render. Color coding correct.
2. Hover the YTD % cell — tooltip should show `${ytd_logins} YTD logins ÷ ${ytd_target} target (min × weeks elapsed)`.
3. Sabrina (Wayne), Zoran (Lisa), Dimitar (Regina) should show inline ratio chips next to the name (1.25× ish for Sabrina based on 96/77).
4. If any household is currently blocked under the new system, hover the "< min" badge — tooltip names the rule.
5. **Sunday Excel sync** — first sync after deploy will recompute everyone using the new rules. `blocks_applied` / `blocks_cleared` lists may differ from old behavior. Read carefully.
6. Header Unblock all (N) button — only shows when ≥1 blocked. Confirm dialog includes the next-sync re-block caveat.

---

## Carry-over for next session

- **Badge label rename.** "< min" → "blocked". Chris approved in principle; needs wording confirmed.
- **Mild duplication** in `/api/coach/wellpass` route: 6-week-cell bookings are fetched separately from the all-time scoring data. Could be merged into one fetch. Not urgent at ~2k bookings.
- **Threshold dialing.** First Sunday sync may surface false positives (someone Chris considers in-good-standing getting blocked). Tunable in one place: `lib/coach/wellpassScoring.ts` constants.
