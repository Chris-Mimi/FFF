# Session 435 — Wellpass sync guard + Kids 10-Card price (2026-11-19 → 20, Opus 5.5, Mac)

## Shipped
| Commit | What |
|:---|:---|
| `2ffb6fd` | "Team: Bumper Plate Frog Catcher" → "Team: Crocodile Frog Catcher" in 5 kids wods (`renames/2026-11-19-crocodile-frog-catcher-lines.json`) |
| `b8ec11d` | 2 kids workout names + Google Calendar titles (`renames/2026-11-19-crocodile-frog-catcher-names.json`) |
| `af8bc00` | Wellpass import refuses a file whose weeks aren't Mon–Sun |
| `c394350` | Wellpass grid legend rewrite — Wellpass logins vs app bookings |
| `a5c4fdb` | Wellpass zero-fill overwrites stale counts (Excel always wins) |
| `3e415c1` | Kids 10-Card price decided server-side; webhook note records card type |
| `0bba5fc` | Payment tab buys the Kids 10-Card FOR an own child <18 |

Housekeeping: deleted merged `ccr-08e06761-y16r6n`. Pull brought `boards/2026-W47-2-18nov.json` (phone session).

## 1. Crocodile Frog Catcher
- Chris had already renamed the library entry, so `rename-exercise.ts` (renames library + text) didn't fit → `rewrite-workout-lines.ts` for the lines, `rename-workouts.ts` + `sync-calendar-titles.ts` for the names. Planner: each wod regained the movement (old text had stopped counting after the library rename).
- Library slug is `team-cocodile-frog-catcher` (typo) — Chris fixed it himself.

## 2. Wellpass sync
- Sync reads every `Wk NN` tab, not just the latest. Counts are keyed by tab number; E1/F1 dates are only labels.
- **Mon–Sun guard:** whole file refused if any week doesn't start Monday + end 6 days later; message names each bad week. Not auto-corrected — a Sun–Sat export has wrong counts, not just wrong labels.
- **My mistake:** first "check" only verified stored dates, said all OK. Chris then found Anna Mavrommatis-Karaaslan at 3 logins vs 2 in the Excel. Real cause: zero-fill used `ignoreDuplicates`, so a week re-synced from the corrected file kept the old Sun–Sat count for anyone no longer on that tab. Full Excel-vs-app compare (all 46 weeks × all identities): exactly 2 diffs — Anna M-K W43, Anna Krautwald W45 (Excel 0, app 1). Fix: zero-fill overwrites. **Chris still has to re-sync** — not done at close.
- New read-only `scripts/compare-wellpass-excel.ts <xlsm>`.
- Legend facts verified in code: bookings = `status='confirmed'` for every member linked to the identity; YTD target = Min × weeks this year; ratio chip = YTD logins ÷ YTD confirmed bookings, green ≥1.5, amber = early warning (YTD or 13-wk under 1.5, not blocked), grey = blocked/paused/exempt.

## 3. Markus Fischer / Jano — Kids 10-Card
- Markus bought a card "for Jano" 14.11; it landed on Markus (renewTenCard: closed his cash card with 6 left → 16-session card). Jano (`membership_types: ['ten_card']`, no purchase date) had no card; his 16.11 booking `ten_card_consumed=false`, 20.11 true.
- Book page buy link only renders inside a full/expired/≤2-left warning → Markus (6 left) had no Book-page link; he used the athlete **Payment** tab, which always sent `memberId = logged-in user` and let anyone pick "Buy Kids 10-Card". Server trusted the client's `productType`. Chris confirmed he paid **€85**.
- I first mis-stated the cause ("only his own card had a buy button"), then over-corrected by hiding the Kids card for adults — Chris: then how does a parent buy one? Final: Kids card offered for self-if-<18 + each own child <18, "For" picker when several.
- Server: `create-checkout` → `getHouseholdTenCards(...).buyProduct` for that holder, else `isMinor(holder.date_of_birth)`; mismatch → 403 German message.
- Data move (backup first; Markus's prior card read from `backups/2026-11-12_members.json`): Markus → 12.10 cash card, 10 total, offset 0, used 6, expiry 12.10.27, original note. Jano → purchase 14.11, expiry 14.11.27, total 10, note citing the Stripe id. Jano 16.11 booking → consumed=true (trigger made him 2/10). Deleted the 14.11 `ten_card_archive` row. Chris checked both chips: OK.
- Chris: edge case — Markus is the only training 10-carder who bought for a child. Didn't pursue an €85-payments audit.

## Learnings
- "Check the data" = compare against the source, not just internal consistency. Date check ≠ count check.
- Upsert with `ignoreDuplicates` makes a re-import unable to correct anything — wrong for an authoritative source.
- Never trust a client-sent price tier; derive it server-side from the same rule the UI uses.
- Before hiding a button, ask who legitimately needs it (parent buying for child).
- Local Stripe key is test-mode — live lookups need Chris's dashboard.
- Scratchpad scripts can't resolve project `node_modules` by bare name — use absolute import paths, or put reusable ones in `scripts/`.
