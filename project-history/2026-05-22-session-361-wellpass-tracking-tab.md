# Session 361 — Wellpass tracking tab + under-attendance booking block

**Date:** 2026-05-22 (Opus 4.7) — single-thread, one major feature.

---

## 1. Feature shipped

New `/coach/members` **Wellpass** tab. Imports per-week Wellpass check-in counts from the gym's Excel workbook and auto-restricts members whose household falls below the per-pass threshold. Coach overrides per-household (exemption mode) or per-member (manual block/unblock).

### Data model

3 new tables + 1 column on `members`:

- **`wellpass_identities`** — the household / WP-payer (NOT a member row). Columns: `wellpass_name UNIQUE`, `min_checkins_required DEFAULT 3`, `tracked BOOLEAN`, `exemption_mode ('auto'|'always_exempt'|'always_enforce')`, `notes`.
- **`wellpass_identity_members`** — many-to-many link to `members` rows (one WP identity → 0..N member rows).
- **`wellpass_weekly_checkins`** — `(wellpass_identity_id, year, week_number)` UNIQUE with `checkin_count`, `week_start`, `week_end`.
- **`members.wellpass_booking_restricted BOOLEAN`** — set by import logic; honored by `/api/bookings/create`.

Schema files: `database/20260522_session361_wellpass_tracking.sql` + `_seed_mapping.sql` (gitignored).

### Seed mapping (13 households)

- **min=3** (default): Pascal Evghenia, Kerstin Städele, Ivo Keskic, Dennis Simm, Dominik Singer, Dragan Misanovic, Melissa Gruber, Julia Weihe, Denys Bornemann
- **min=6** (dual-person passes): Dimitar Peresyov, Zoran Vrbanic, Sabrina Lucas, Katharina Herbst

### Excel parser

[lib/coach/wellpassExcelParser.ts](lib/coach/wellpassExcelParser.ts). Reads every `Wk NN` sheet — col A=name, col D=weekly total. Stops at the first blank col D (rows below are individual booking lines that Chris's Excel formula has already summed above). TZ-safe date conversion using local-time accessors (Excel stores dates as UTC midnight in local zone, naive `getUTC*` would shift back a day).

### Import endpoint

[app/api/coach/wellpass/import/route.ts](app/api/coach/wellpass/import/route.ts). `requireCoach`, service-role. Multipart upload. Pipeline:

1. Parse workbook → list of weeks with `(wellpass_name, checkin_count)` rows
2. Upsert identities (new ones default to `tracked=false`, existing ones untouched)
3. Upsert weekly counts via `ON CONFLICT (wellpass_identity_id, year, week_number)`
4. Auto-link unlinked identities by exact name match against `members.name` — runs every import so newly-registered athletes pick up retroactively
5. Recompute block status per identity: if latest week's count < `min_checkins_required` AND household is not exempt → set `wellpass_booking_restricted=true` on every linked member; else `false` (auto-clear)

### Booking enforcement

[app/api/bookings/create/route.ts](app/api/bookings/create/route.ts). Added a check after the active-member guard: if `wellpass_booking_restricted=true`, count the member's confirmed bookings in the Mon–Sun calendar week of the requested session. If ≥1, reject with 403 + German error message. Coach manual booking via `useBookingManagement` does NOT go through this endpoint → bypasses the block (explicit-override channel).

### UI

[components/coach/members/WellpassTab.tsx](components/coach/members/WellpassTab.tsx). Single-component tab:

- "Sync from Excel" button → drag .xlsm
- Table: WP name, min, App? (paying/free/—), last 6 weeks (latest count red if <min), status, exemption-mode selector
- Sort buttons (urgency / app payers / A–Z); default = urgency (worst first)
- Expandable per-row: linked members with per-member block/unblock toggle, notes textarea, untrack button
- Collapsed "Untracked names" section at bottom for unmatched names from import, with Track button per row

## 2. Bug fixes during the build

- **`lib/auth-fetch.ts` was forcing `Content-Type: application/json`** even for FormData uploads. Broke the .xlsm import on first attempt — multipart needs the browser to set its own boundary. Fixed: skip the JSON default when `options.body instanceof FormData`.
- **Auto-link was failing on whitespace typos.** Carmine Carrozzo (trailing space) + Petr Bezdek (double space, known from S315) didn't match `.in('name', wellpassNames)`. Two-part fix:
  1. Normalized matching in the import endpoint (lowercase + collapse whitespace) — defensive, catches future typos
  2. New script `scripts/audit-name-whitespace.ts` (dry-run by default). Found exactly those 2 rows, applied trim — entire `members.name` is now clean.
- **Duplicate-name sub-row in UI.** When the WP identity name equals the linked member name (e.g. "Miriam Böck" identity → "Miriam Böck" member), the sub-line was redundant. Now hidden — only "and also" members show with `+` prefix.

## 3. Side work

- **Martina Fenster cleanup.** Her `members.name` was stored surname-first ("Fenster Martina"); Chris flipped to "Martina Fenster" in Supabase. Her "14x" attendance count is correct — 10 confirmed bookings + 4 OG/rehab sessions floating as whiteboard text + 5 score rows on already-booked sessions (UNION dedupes to 14). 4 sessions still need manual OG-booking insertion:
  - 2025-12-06 10:00 Endurance, 2025-12-08 18:30 WOD, 2026-02-07 10:00 Endurance, 2026-03-04 09:30 WOD
- **One-shot script:** [scripts/list-martina-whiteboard-sessions.ts](scripts/list-martina-whiteboard-sessions.ts). Kept for future similar audits.
- **xlsx@0.18.5 installed.** Known proto-pollution CVE; acceptable risk because endpoint is `requireCoach`-gated and Chris is the sole uploader. To harden later, move to SheetJS CDN-hosted release.

## 4. Memory updates

- **New:** [[feedback-ask-for-file-location]] — when Chris references external files (Excel, PDF) by description, ask for the path instead of `find`-ing across his disk. Caught when I scanned Synology Drive and picked an old-folder-name version.
- **Extended:** [[feedback-chris-has-app-open]] — added "pattern-detection" rule: when Chris says "many athletes" do X, ask him for the pattern (e.g. "what do those names look like?") instead of script-checking one example.

## 5. Files

| Type | File | Note |
|:---|:---|:---|
| schema | `database/20260522_session361_wellpass_tracking.sql` | 3 tables + members column |
| seed | `database/20260522_session361_wellpass_seed_mapping.sql` | 13 households + member links |
| code | `types/wellpass.ts` | new |
| code | `types/member.ts` | +`wellpass` MemberStatus, +column field |
| code | `lib/coach/wellpassExcelParser.ts` | new |
| code | `lib/auth-fetch.ts` | FormData fix |
| api | `app/api/coach/wellpass/route.ts` (GET) | new |
| api | `app/api/coach/wellpass/import/route.ts` (POST) | new |
| api | `app/api/coach/wellpass/identity/[id]/route.ts` (PATCH/DELETE) | new |
| api | `app/api/coach/wellpass/member/[memberId]/restriction/route.ts` (PATCH) | new |
| api | `app/api/bookings/create/route.ts` | restriction check |
| ui | `components/coach/members/WellpassTab.tsx` | new |
| ui | `app/coach/members/page.tsx` | tab integration |
| ui | `hooks/coach/useMemberData.ts` | short-circuit fetch on wellpass tab + add column to select |
| script | `scripts/audit-name-whitespace.ts` | new (applied — 2 rows fixed) |
| script | `scripts/list-martina-whiteboard-sessions.ts` | new (kept) |
| dep | `xlsx@0.18.5` | new |

## 6. Carry-over for next session

- ⏳ **Martina Fenster — manual create 4 OG bookings** (dates above). After: her `is_og=true` bookings replace the whiteboard text attribution.
- ⏳ **Felix Buffler 10-card cleanup** (S360 carry, unchanged).
- ⏳ **Booking-create `ten_card_consumed` flag bug** (S360 carry, unchanged).
- All other S355–S360 carry-overs (Mac instability capture, audit re-entry pass, capacity backfill SQL, etc.) — unchanged.
