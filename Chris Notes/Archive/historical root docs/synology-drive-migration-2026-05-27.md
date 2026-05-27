# Synology Drive Migration — 2026-05-27

Replacing legacy **Cloud Station Drive 7.0.1** (Intel/Rosetta, signed 2021, expired cert) with the current **Synology Drive Client 4.0.3-17892**. The old client is what's been crashing Chris's Mac via the `ecosystemanalyticsd` log storm — root-caused in S367.

**Archive this file once migration is done + verified.**

---

## Before you start

- ✅ DSM 7.3.2 finished on the NAS overnight
- Pick a window where you can leave your Mac alone for ~30 min in case re-sync takes longer than expected
- All Synology Drive files live at `~/SynologyDrive/...` — they're on disk regardless of which client is installed, so the migration won't lose any files
- **What you WILL lose:** the client-side sync configuration (which folders are paired with which NAS team folder, sync direction, filters). About 5 min to re-set-up.

---

## Steps

### 1. Download the new client

- Go to https://www.synology.com/en-global/support/download/SynologyDriveClient
- Pick **macOS** → download `Synology Drive Client 4.0.3-17892`
- Don't run the installer yet

### 2. Stop the old client

- Menu bar → Synology Drive Client icon → **Quit**
- If it won't quit cleanly: `⌥⌘Esc` → Synology Drive Client → Force Quit

### 3. Uninstall the old client

- Drag `/Applications/Synology Drive Client.app` to Trash → empty Trash
- In Terminal, remove the leftover state folder:
  ```
  rm -rf ~/.SynologyDrive
  ```
  (This is the old sync database + config — `.SynologyDrive` with a dot. Your actual files in `~/SynologyDrive/` — no dot — are NOT touched.)

### 4. Install the new client

- Open the downloaded `.dmg`
- Drag the app to `/Applications`
- Launch from `/Applications`

### 5. Pair with the NAS

- Enter NAS address (your usual one — local IP or QuickConnect ID)
- Log in with your normal NAS account
- Approve the SSL cert if it asks

### 6. Set up sync — IMPORTANT

- The new client will ask which team folders to sync — pick the ones you had before (CrossFit Hammerschmiede etc.)
- When it asks WHERE to put them locally, **point at `~/SynologyDrive/`** — same location as today
- **WATCH for this:** after picking the folder, it should say something like *"X files already exist — comparing"* or *"Reconciling with existing files"*. That means it'll only sync diffs.
- 🛑 **STOP and ask me if instead it says "X files to download" with a number anywhere near your full library size** (100+ GB). That means it didn't recognise the existing files and is about to re-download everything. We can fix the reconcile before letting it run.

### 7. Confirm it's healthy

After 5 min of normal idle, in Terminal:

```
~/mac-incident-data/capture.sh
```

Look at the "Top 15 processes producing errors" section in the output. **Expected:** `ecosystemanalyticsd` should NOT appear in the top 5, and total error count should be in the hundreds or low thousands (not the 100k+ we saw with the legacy client).

Load average (top of `capture.sh` output, or `uptime` in Terminal) should stay under 2-3 during normal idle.

### 8. Optional cleanup later (only after a full clean day)

- System Settings → Privacy & Security → Profiles → remove `Enable-Private-Data.mobileconfig`
- We installed it during S367 debugging to un-redact log paths. Not needed once the storm is confirmed gone.

---

## Rollback (just in case)

If something breaks, the old `.dmg` for Cloud Station Drive 7.0.1 isn't easily available anymore — Synology pulled it. The new client is the only forward path. Your files on the NAS and locally are independent of which client is running, so worst-case the migration "fails" by leaving you without sync — files stay safe on both sides.

---

## What to tell me when you're done

- ✅ **"Done, no errors"** — we move on to S367 prod verification (Subscriptions Due banner + Sandra's coach card)
- ⚠️ **"It wants to re-download everything"** — stop, paste me what it shows, we figure out the right reconcile
- 🚨 **"Storm came back"** — paste the `capture.sh` output, we look at what's spawning the errors
