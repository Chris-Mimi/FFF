Cmd + Shift + V

This opens a Markdown Preview window to the side.

You can also press Cmd + K, then V to open the preview to the side-by-side view.

# Safe Workflow for Local Dev Ports (3000–3009) #

# Check which ports are in use

lsof -i :3000-3009


# Lists all processes using ports 3000 through 3009.
#Take note of the PID (process ID) if you want to kill selectively.
#Kill all processes in that port range


kill -9 $(lsof -t -i :3000-3009)
# This forcibly stops all processes using those ports.
# Safe for local dev — your code files and Git branches are unaffected.
# Any dev servers you kill will need to be restarted.
# Start your development server fresh

npm run dev


# This will start a new server, usually on port 3000.
# If that port is taken, the server will usually suggest another free port or you can adjust it manually.
# Optional: Check that the server is running

lsof -i :3000

# You should see a single process (your new server) using the port.
#💡 Tip: You can make this even easier with a small script:

#!/bin/bash
# Free ports 3000–3009 and start dev server
kill -9 $(lsof -t -i :3000-3009) 2>/dev/null
npm run dev


# Save it as dev-start.sh, make it executable:

chmod +x dev-start.sh

# Then just run:

./dev-start.sh

# Every time, it clears old servers and starts fresh.

---

# ⚡ QUICKEST METHOD: Bash Alias (ONE WORD COMMAND) #

## Implementation Instructions:

1. **Add alias to your shell config:**
   ```bash
   echo "alias restart='kill -9 \$(lsof -t -i :3000-3009) 2>/dev/null; npm run dev'" >> ~/.zshrc
   ```

2. **Reload your config:**
   ```bash
   source ~/.zshrc
   ```

3. **Use it (just type one word):**
   ```bash
   restart
   ```

## What it does:
- Kills all processes on ports 3000-3009
- Starts `npm run dev`
- All in one command

## Notes:
- This alias is already installed in your ~/.zshrc
- Works from any directory within the project
- No need to remember two separate commands anymore
- The `2>/dev/null` suppresses error messages if no processes are running
