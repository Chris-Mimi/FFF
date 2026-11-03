# Session 430 — Whiteboard from the phone, Foundations clearance (2026-11-03, Opus 5.5, Mac)

## Shipped
| Commit | What |
|:---|:---|
| `72e4050`, `fa450cb`, `322c578`, `6a48b80` | Phone whiteboard guide + protocol rules (cloud sessions push board JSON to main; never package-lock) |
| `8807596` | Merged `claude/whiteboard-45-1-qscfre` — board 45.1 entered from the phone |
| `96f5b27` | Foundations clearance feature |

## 1. Whiteboard from the phone (Claude Code cloud session)
- Chris wanted to enter scores right after photographing the board in the gym, with no Mac setup. Remote Control was rejected because the Mac has to stay on.
- Setup (claude.ai/code, environment "Forge Whiteboard"):
  - Network **Limited** + `*.supabase.co`.
  - Env vars `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`; scripts fall back to process env when `.env.local` is missing.
  - Setup script `cd /home/user/FFF && npm ci || true`. Plain `npm install` ran in `/home/user` (no package.json) and failed. `npm install` also rewrote package-lock (dropped `"peer": true`), hence `npm ci`.
- GitHub: the clone worked but every push failed with 403 until the **Claude GitHub App was installed on Chris-Mimi** (Only select → FFF). Percepto25 is only a collaborator, so it can't grant app write access.
- The UI differs from Anthropic's docs ("Limited", not Trusted/Custom). The settings icon only appears on hover, and each row needs the back arrow before Save changes. Chris: "that is not obvious". Saved as feedback memory + click-by-click guide.
- Phone app can only Archive sessions; Delete only on the Mac.
- What else works from the phone: listed for Chris (data questions, small data fixes, audits, programming help). Not from the phone: Stripe (no key), local files, backups (`npm run backup` writes to the VM).

## 2. Foundations clearance
- Problem: Foundations athletes (e.g. Magdalena Gebska) booking full evening WODs with movements they haven't learned. Rule: 20 Foundations sessions + Chris/Mimi approval before all classes.
- Design (Chris's answers):
  - All current members start cleared; new members start as Foundations.
  - Open types: everything with "Foundations" in the name (always), plus Endurance and Open Gym. Weekend WOD stays closed.
  - The 20 counts Foundations classes; other classes are shown alongside.
  - The lock is visible on the athlete booking page.
- Storage: `foundations_clearances(member_id PK, cleared_at, cleared_by)`. **Row = cleared.** RLS on, no policies; service role only. A separate table because athletes can UPDATE their own `members` row (no column guard), so a column there would be self-settable.
- `workout_titles.open_to_foundations` (tick-boxes on Booking Rules). Defaults: Endurance, Open Gym, Diapers & Dumbbells, Kinderbetreuung, Pizza Party, kids types. Closed: WOD, Specialty/Party/Other, Special Event WOD, Hero WOD Murph.
- The check in `/api/bookings/create` sits after the kids rule; kids classes are skipped. Coach bookings don't use that route, so a coach can always book someone in. That's the "permission" path; a request-to-book flow was rejected as more work than needed.
- Members page chip: `Foundations n/20 · N other` (green "ready for review" at 20) + "Clear for all classes"; cleared members get a grey "back to Foundations" link.
- Athlete page: `/api/bookings/foundations-access` (self + family) → lock + "Noch nicht freigegeben – bitte sprich mit Chris oder Mimi."
- Order: backup → SQL run by Chris → push. Pushing first would have made every booking 500 (table missing).

## Lessons
- **Cloud-session setup scripts run outside the repo folder.** `cd` into `/home/user/<repo>` first, and use `npm ci` so the lockfile isn't touched.
- **A table that new code reads on the booking path = SQL before push**, or every booking fails.
- **The `members` table has no column guard on athlete UPDATE.** Anything an athlete mustn't set goes in a separate service-role table.
