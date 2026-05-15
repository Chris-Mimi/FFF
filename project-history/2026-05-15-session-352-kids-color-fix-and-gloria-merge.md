# Session 352 — Kids Calendar Color Fix + Gloria Stoffer Family→Primary Merge

**Date:** 2026-05-15 (Opus 4.7)

Two small operational items. First: kids-class calendar cards had been rendering in the dark WOD teal-700 instead of the lighter teal-400 since 2026-04-20 because the title matcher used strict equality. Second: Gloria Stoffer was originally a family-member under Torben Stoffer and now has her own standalone registration; her family-profile bookings + scores were merged into her new primary profile via a 3-statement SQL transaction in Supabase.

---

## 1. Kids calendar color regression

**Symptom.** All Kids & Teens / FitKids Turnen / Elternkind Turnen cards on the coach Calendar started rendering in WOD teal-700 instead of the lighter teal-400 from around 2026-04-20 (week 17) onward. Earlier kids classes still rendered correctly.

**Investigation.**
- [utils/card-utils.ts](utils/card-utils.ts) hadn't changed since 2026-03-15 (S212), so the matcher logic itself was stable.
- The `getSessionTier` matcher used **strict equality after lowercasing**: `KIDS_KEYWORDS.some((k) => lower === k)`. The keyword list was `['kids', 'kids & teens', 'kids and teens', 'fitkids turnen', 'elternkind turnen']`.
- The foundations branch on the next line already used `lower === k || lower.startsWith(k)` — so foundations was robust against suffixes, kids was not.
- Chris recalled that around 2026-04-19/20 (S295 era) he + Mimi edited `workout_titles` to add age suffixes like "Kids & Teens 6-9", "FitKids Turnen 4-6", etc. for Schedule-page clarity. Strict equality silently broke for every new title.

**Fix.** Single-line change in [utils/card-utils.ts:44](utils/card-utils.ts#L44):

```diff
- if (KIDS_KEYWORDS.some((k) => lower === k)) return 'kids';
+ if (KIDS_KEYWORDS.some((k) => lower === k || lower.startsWith(k))) return 'kids';
```

Commit `32f50d1` — `fix(session-352): kids-class calendar color matches age-suffixed titles`. Vercel deploys it; visual verification on next session view.

**Why this is the right shape of fix.** `startsWith` matches every base spelling Mimi-Chris specified plus any future age-group variant ("Kids 10-13 Jahre", "FitKids Turnen ab 4", etc.) without needing the keyword list to be exhaustive. Doesn't widen too far — "Kidsmasher" or whatever isn't a session type anyone would type.

**Rejected alternatives:**
- Updating `KIDS_KEYWORDS` to enumerate every current variant. Brittle — next time Mimi tweaks ages, we regress again.
- Switching the matcher to `includes`. Too permissive; a workout titled "Tipps für Kids" would match.

---

## 2. Gloria Stoffer family→primary profile merge

**Trigger.** Gloria registered her own standalone account. Her existing bookings + scores were attached to her family-member profile (`primary_member_id` = Torben Stoffer). Chris wanted them under the new account so the family-member row could be deleted cleanly.

**Approach decision — SQL over UI clicks.** Three reasons:
1. Preserves original `bookings.created_at` (when she actually booked, not the merge moment).
2. No cascading side effects — no waitlist promotion, no 10-card chip flicker, no `coach_cancelled` rows polluting history.
3. Atomic transaction; same effort as editing N rows row-by-row in the Bookings table editor.

**Pre-flight: duplicate check.** Ran a `GROUP BY session_id HAVING COUNT(*) > 1` on bookings keyed by either member_id. One session (2026-05-14 10:00) flagged a duplicate. Inspection revealed both rows were already on the NEW profile (`551e4612...`): a `coach_cancelled` at 10:19 + a fresh `confirmed` at 19:31 — normal cancel-and-rebook on the new profile, NOT a cross-profile duplicate. The family profile had zero bookings on that session. False positive; merge could proceed unchanged.

**Merge transaction.**

```sql
BEGIN;

UPDATE bookings
SET member_id = '551e4612-a2a8-431f-8862-936f13205631'      -- new primary
WHERE member_id = 'cee4213e-9ebc-4439-a2c6-894dbed61186';   -- old family-member

UPDATE wod_section_results
SET member_id = '551e4612-a2a8-431f-8862-936f13205631'
WHERE member_id = 'cee4213e-9ebc-4439-a2c6-894dbed61186';

DELETE FROM members WHERE id = 'cee4213e-9ebc-4439-a2c6-894dbed61186';

COMMIT;
```

**Tables NOT touched (zero rows expected):** `lift_records`, `benchmark_results`, `athlete_achievements`, `reactions` — all keyed by `auth.users.id` (`user_id`), and family-member profiles typically have no auth account. Verified Gloria's family row had no separate user_id; nothing to migrate.

**S351 trigger side effect (good).** The bookings UPDATE on `member_id` fires `trg_bookings_recompute_ten_card` for both the OLD and NEW member rows. Since the family profile is gone post-DELETE, only the new profile's `ten_card_sessions_used` gets recomputed — auto-syncs without manual Recalc.

---

## 3. Process notes

- The duplicate-check pre-flight nearly led us astray. The GROUP BY query returned `count: 2` for one session, which I initially interpreted as a cross-profile collision. Surfacing the actual rows (member_id, status, created_at) showed both belonged to the new profile — saved an unnecessary booking deletion.
- The angle-bracket placeholder convention (`'<NEW-ID>'`) misfired once — Chris pasted `<cee4...>` literally and got a UUID syntax error. Worth dropping the brackets in future SQL templates.

---

## Files Modified

| File | Change |
|:---|:---|
| `utils/card-utils.ts` | Kids matcher uses startsWith (1-line) |
| `memory-bank/activeContext.md` | v220 — S352 entry, Next Session Kickoff |
| `project-history/2026-05-15-session-352-...md` | This file |

## SQL Applied Manually (gitignored convention)

Member merge transaction (in §2 above). Not persisted to any `database/*.sql` file because it's one-off member-data migration, not a schema change.

## Carry-overs for next session

- S351 paper-card sync still pending (~1 day from now).
- All other S351 / S346 / S345 / S344 / S342 / S341 / S338 carry-overs unchanged.
- Visual verification: kids calendar cards render lighter teal after Vercel redeploys S352 commit `32f50d1`.
