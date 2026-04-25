This document is a template with headings to show you where the issue is or where the improvement needs to be. Headings appear inside "#". If they are not followed by a "*" and text, ignore them, otherwise, read the text and act accordingly.

# Mobile URL #
http://192.168.178.75:3000

# Next Session — First Action #
* **Live-test the German login error messages shipped in S317** (after deploy lands).
  1. Open `https://app.the-forge-functional-fitness.de/login` in incognito.
  2. Try `nonexistent@example.com` + any password → expect *"Kein Konto mit dieser E-Mail-Adresse gefunden..."*
  3. Try `chris@crossfit-hammerschmiede.com` + a wrong password → expect *"E-Mail-Adresse erkannt, aber das Passwort ist falsch..."*
  4. Confirm pending/blocked branches still show their existing messages (just translated).

* **Then live-test the late-cancel gate carried over from S316** (still open from yesterday).
  1. Pick any booking on a locked-window session (or set `auto_lock_lead_minutes` to a large value so "now" is inside the lock window).
  2. Cancel from the athlete app.
  3. Expect toast: *"Booking cancelled. This is past the lock time, so it is recorded as a late cancel."*
  4. Open the coach SessionManagementModal for that session → confirm the booking shows under Late Cancel with the purple chip.
  5. Open Admin → Attendance rollup → confirm the late_cancel is counted.

# FIRST. FIX BUGS MAKE IMPROVEMENTS #
# Coach Login #
* Mimi's iPhone copy/paste & delete function
* Box WiFi: Mac gets IPv6-only (no IPv4), dev sites (GitHub/Supabase/Vercel/Resend) unreachable. PC on same box WiFi works fine. At home all works. Debug next time at the box — see `SESSION-HANDOFF-S303-DNS-issue.md` for diagnostic history.
* Has Fabian's parent got a login, if so who?
* Coach login, Athletes tab, Lifts, Benchmarks, Forge sections. Do the scores I input here automatically appear in the athlete's app? Also, I need to be able to delete and re-enter some scores here.

# Coach library #

# Workout Library tab (coach) #
Integration with website
Investigate the "Whiteboard Intro" sections appearing in earlier workouts
2-tier payment family

Athlete login:

 # Edit Workout Modal (coach) #
Once athletes start registering, you can re-run this script anytime to check the state:
npx tsx scripts/check-whiteboard-name-conflicts.ts

  # Publish Workout Modal (coach) #
 IMPROVEMENTS/Bug Fixes:

 # Exercises tab (coach) #
 IMPROVEMENTS/Bug Fixes:

# Analysis page

# Calendar View #
*

# Athlete Published Workouts Page #
Should only show the days on which athlete has attended a workout. For example, if athletes have not attended a workout on a day, the day should not be displayed.

*

# Athlete Leaderboard Page #

# Member Management Page #
*

# S316 Close → S317 Summary

## Status
Diagnostic + small fix session. Triaged Anja Götte's "can't log in" report — auth row + member row both healthy, password the only problem. Built `scripts/admin-set-password.ts` (one-off rescue tool), reset her password to `1234?ABCD!`, verified by logging in as her in incognito. Then refactored the login error UX so future cases are self-explanatory: Supabase's generic *"Invalid login credentials"* now becomes one of 5 specific German messages (no account / pending / blocked / unconfirmed / wrong password). Six total error strings now in German.

## Anja Götte rescue
Auth row created 2026-04-24 16:52, signed in once at 16:55, then she couldn't log in again. `last_sign_in_at` proved auth + email confirmation + member row were all fine, so it was a password-typing issue on her side. Sent her the temp password via WhatsApp; she logs in and changes it.

## Login error specificity — what shipped
[app/login/page.tsx](app/login/page.tsx) — catch block now always calls `/api/members/check-status` (previously only when error was "email not confirmed") and branches on `(exists, status, isEmailNotConfirmed)`:
- `!exists` → "Kein Konto mit dieser E-Mail-Adresse gefunden..."
- `status === 'pending'` → "Dein Konto wartet auf die Freigabe..."
- `status === 'blocked'` → "Dein Konto wurde gesperrt..."
- `isEmailNotConfirmed` → "Bitte überprüfe deine E-Mails..."
- else → "E-Mail-Adresse erkannt, aber das Passwort ist falsch..."
- `check-status` itself errors → fallback to raw Supabase message
Plus the `reset_link_invalid` URL-param message (line 22) translated.

## Resend deliverability still unverified
Open from S313: `the-forge-functional-fitness.de` SPF/DKIM/DMARC may still be unverified. Not investigated this session — Anja's issue turned out to be password, not deliverability. Next Step #4 still applies.

## Landmines
* None material. Login change is deployed but not yet live-tested in prod.

## 📅 Scheduled reminder — 2026-05-01 (check if late-cancel gate is firing)
If today is **2026-05-01 or later**, run this query in Supabase SQL editor:
```sql
select count(*) as total_late_cancels,
       max(updated_at) as most_recent
from bookings
where status = 'late_cancel'
  and updated_at >= '2026-04-24';

select m.name, ws.date, ws."time", b.updated_at
from bookings b
join members m on m.id = b.member_id
join weekly_sessions ws on ws.id = b.session_id
where b.status = 'late_cancel'
  and b.updated_at >= '2026-04-24'
order by b.updated_at desc
limit 5;
```
If total is 0 after a week of real usage → flag it, the gate may not be firing. If >0 → the gate is working, mark this reminder done and delete this block.
