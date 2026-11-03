# Whiteboard scores from the phone (cloud session)

Lets you run the whiteboard protocol from the Claude app on Android, with the Mac switched off. The session runs on Anthropic's computers and gets the project from GitHub (**Chris-Mimi/FFF**, branch **main**).

Set up in S430 (Nov 2026).

---

## One-time setup (done in S430; repeat only if the environment is lost)

**GitHub write access (done S430):** the Claude GitHub App must be installed on the **Chris-Mimi** account. Without it, sessions can read FFF but every push fails with 403. Steps: Chrome private window → sign in to github.com as **Chris-Mimi** → github.com/apps/claude → **Install/Configure** → **Chris-Mimi** → **Only select repositories** → **FFF** → Install/Save. *Why Chris-Mimi:* only the repo owner can let an app write; Percepto25 is only a collaborator.

On the Mac, in the browser at **claude.ai/code** (the Code area, not the normal Claude chat):

1. At the bottom there are three buttons: **environment name**, **Chris-Mimi/FFF**, **main**. Leave FFF and main as they are.
2. Click the **environment name**. Ignore the **Local** section and its "download the Claude app" message. Under **Cloud**, **hover over "Forge Whiteboard"** and a settings icon appears at the right end of the row (it's invisible until you hover). Click it.
3. The settings dialog has rows. Each row opens its own screen. **Fill it in, then click the back arrow** to return to the list. **Don't click Save changes until all rows are done**, because Save closes the whole dialog.
   - **Network access** → choose **Limited** → in **Allowed domains** type `*.supabase.co` → **back arrow**.
     *Why:* cloud sessions can only reach approved websites; this adds your database.
   - **Environment variables** → paste two lines copied from `.env.local` in VS Code (triple-click a line, Cmd+C):
     - line 2: `NEXT_PUBLIC_SUPABASE_URL=…`
     - the line starting `SUPABASE_SERVICE_ROLE_KEY=…` (whole line)
     → **back arrow**.
     *Why:* the database address plus the key that allows writing scores. That file is never uploaded to GitHub, so the cloud copy doesn't have it.
     ⚠️ That key is the master key to the database. Never share this environment with anyone.
   - **Setup script** → `cd /home/user/FFF && npm ci || true` → **back arrow**.
     *Why:* installs the tools the whiteboard scripts need. It must go into the project folder first: plain `npm install` ran in the wrong folder and failed (S430 test 1). `npm ci` installs exactly what the project lists without changing the `package-lock.json` file; `npm install` changed it (S430 test 2). `|| true` stops a failed install from blocking the session from starting.
4. Click **Save changes** once.

## Using it (in the gym)

1. Take the board photo and upload it to the app as usual.
2. Claude app → **Code** tab → **New session** → check it shows **Forge Whiteboard**, **Chris-Mimi/FFF**, **main**.
3. Type e.g. `Whiteboard 45.1` and send.
4. Scores go into the app straight away. The record file lands on a side branch on GitHub; Claude merges it into main at the next Mac session.

**Clearing old sessions:** the phone only offers **Archive** (hides it). To **Delete**, use the Mac at claude.ai/code: hover over the session in the left list → **⋯** → **Delete**.

The "Add device" button in the Code tab is for Remote Control (steering a session running on the Mac). Not needed here.
