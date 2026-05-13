# Login Recovery Runbook

**For:** Athletes who can't log in despite having a valid account, where the password reset email isn't helping (or they aren't tech-savvy enough to use it).

**Past cases:** Anja Goette (S317), Michaela Eder (S328), Carina Hiltel (S329).

---

## When to use this

Use this when **all** of these are true:

- Athlete says "I can't log in" / "Es funktioniert nicht"
- Their member row exists in Supabase and `status = 'active'`
- Password reset email isn't an option (didn't arrive, can't find it, doesn't understand the flow)
- They're on a phone/tablet (the stale-PWA cache issue almost always hits mobile)

If they're a brand-new registration that hasn't been approved yet, **don't** use this — approve them in the Members page instead.

---

## The 4-step recovery

### 1. Pick a simple temp password

Use something easy to type on a phone keyboard. Examples that have worked:

- `1234?ABCD!`
- `Forge2026!`

Avoid characters that need shift-juggling on mobile (`@`, `#`, `~`).

### 2. Run the admin password script

Open Terminal in the project folder (in Cursor/VS Code: `Terminal → New Terminal`, it opens at the right path automatically).

**Copy the line below, replace the email and password, then paste into Terminal:**

    npx tsx scripts/admin-set-password.ts athlete@example.com 'Forge2026!'

Notes:
- The password **must be wrapped in single quotes** `'…'` so the shell doesn't interpret special characters like `!` or `?`
- Email is lowercased automatically — case doesn't matter
- Don't put quotes around the email

The script will:
- Look up the member row by email
- Confirm it found them (prints name + status)
- Set the password via the Supabase Admin API
- Print a success message + the password to forward

**Possible errors:**
- **"No member row found"** → email is wrong or they registered with a different one. Check the `members` table in Supabase Dashboard.
- **"Failed to set password"** → likely an env var issue (`.env.local` missing `SUPABASE_SERVICE_ROLE_KEY`). Shouldn't happen on your machine, but if it does, check the file exists.

### 3. Verify the login works (you do this, not them)

Before sending the password to the athlete, confirm it actually works:

1. Open the app in an **incognito window** (so it doesn't conflict with your own session)
2. Go to `https://app.the-forge-functional-fitness.de/login`
3. Log in with their email + the temp password
4. If you get in → password works, log out, proceed to step 4
5. If it fails → something else is wrong; check the member row's `status` (must be `active`, not `pending`/`blocked`) and re-run the script

### 4. Send the temp password to the athlete

Send via WhatsApp/SMS (not email — they may not check email reliably). Template:

> Hallo [Name],
>
> Ich habe dir ein neues Passwort gesetzt: **`Forge2026!`**
>
> Bitte logge dich damit ein und ändere es danach unter **Profil → Sicherheit** in dein eigenes Passwort.
>
> Falls du noch Probleme hast, melde dich nochmal.

---

## Why this keeps happening (the underlying cause)

The app is a PWA (Progressive Web App). When an athlete adds it to their phone home screen, the browser caches the entire app — including the login page code. That cached version sticks around until the service worker updates itself, which can take days or require manually clearing site data.

S317 changed the login error messages to be more helpful. But athletes whose PWA was cached **before** S317 are still running the old login code, which on certain failures shows a generic "Es funktioniert nicht" with no actionable info — even though their account is fine and the password is correct on the server.

S328 added a German fallback for when `check-status` itself fails (so future cache misses surface a useful message). It does **not** retroactively fix already-cached PWA installs.

Until every active user's PWA refreshes, expect this to keep happening once every few weeks.

---

## When to escalate (don't just re-run the script)

Re-run the script if it's a fresh case. But if **the same athlete** comes back a second or third time after a successful temp-password recovery, something else is going on:

- Their PWA might be stuck on an old bundle → ask them to remove the app from their home screen and re-add it from the browser
- Their device clock could be way off (causes JWT issues) → ask them to check phone date/time
- Browser autofill might be filling in an old password they remembered → ask them to delete the saved password in their browser/iCloud Keychain first

---

## What to do after the athlete confirms it worked

- No code change needed (the script is the recovery; S328 is the long-term fix as PWAs update)
- Add a one-line entry to `memory-bank/activeContext.md` carry-over so it shows up in future session-start scans
- Optional: log the case in a "Recovered logins" list at the bottom of this file (date, name, root cause if known) so we can spot patterns
