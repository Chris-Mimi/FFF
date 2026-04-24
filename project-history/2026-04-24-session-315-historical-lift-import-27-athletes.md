# Session 315 — Historical Lift Records Import (27 Athletes)

**Date:** 2026-04-24  
**Model:** Claude Sonnet 4.6  
**Type:** Data import / seed data  
**App code changed:** No

---

## What Was Done

### Source Data
Chris provided a single master JSON array with 27 athletes and their full lift history. Previous session (314) had imported 8 athletes from individually-created JSONs that contained errors. This session replaced all of that with corrected data from the master source.

### Process
1. Mapped 27 `athlete` keys → `full_name` (DB members.name). 10 athletes were new and required Chris to supply full names.
2. Wrote 27 individual JSON files to `data/athletes/` in the format expected by `scripts/import-athlete-lift-records.ts`.
3. Ran dry-run — 6 athletes not found. Fixed name mismatches iteratively.
4. Confirmed DB had been reset since S314 import (only 53 records total, all from live user activity). No DELETE needed for the 8 previously-imported athletes.
5. Ran `--apply` → **686 records inserted, 0 errors**.
6. Ran Petr Bezdek separately after fixing double-space name → **3 more records**.
7. **Total: 689 historical lift records** across 26 athletes.
8. Moved all 27 files to `data/athletes/processed/`.

### Name Mappings (Non-Obvious)
| JSON athlete key | full_name used | Notes |
|---|---|---|
| Michi | Michael Städele | "Michi" is nickname |
| Dimitar | Peresyov Dimitar | Last name first in DB |
| DanielB | Daniel Braatz | Double-z spelling |
| Stefan | Stefan G | Only first name + initial in DB |
| Petr | Petr  Bezdek | Double space in DB (Chris to fix manually) |
| Peter | Peter Kroll | Not yet registered — skipped |

### New Athletes Added (not in previous import)
Christian Tanner, Peter Kroll (pending), Patrik Gruber, Daniel Steller, Michael Junkes, Steven Zaft, Petr Bezdek, Torben Stoffer, Teemu Lian Geisler, Bodo Lehmann, Sven Hujo

---

## Open Issue: Records Not Showing in Athlete App

At end of session, Chris reported that historical records are NOT visible in the Lifts tab, even though manually-entered records ARE visible.

**Confirmed:**
- Records exist in DB (service-role query returns them for Chris's user_id)
- `members.id` = `auth.users.id` for Chris (84280ec0-...) — no ID mismatch
- `lift_name` values match `barbell_lifts` table exactly
- RLS policy: `auth.uid() = user_id` — should work since IDs match

**Not yet confirmed:**
- Whether the Lifts tab has a date filter hiding old records (goes back to 2019)
- Whether there's a display grouping issue (the tab groups by lift name from `barbell_lifts`)
- Browser DevTools network response when query runs as authenticated user

**Next step:** Open Lifts tab, check browser console + network tab, compare a manually-entered record vs an imported one in the DB to spot any structural difference.

---

## Files Changed
- `data/athletes/processed/` — 27 JSON files (19 new, 8 updated)
- `Chris Notes/AA frequently used files/Notes for next session.md` — updated
- No app code, no migrations, no schema changes
