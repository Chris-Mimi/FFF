# At the START of every Claude session give this prompt:

**Read in ONE parallel call (COPY EXACTLY!!!):**
/Users/chrishiles/SynologyDrive/CrossFit Hammerschmiede (CFH)/AI Development/forge-functional-fitness/memory-bank/workflow-protocols.md
/Users/chrishiles/SynologyDrive/CrossFit Hammerschmiede (CFH)/AI Development/forge-functional-fitness/memory-bank/memory-bank-activeContext.md
/Users/chrishiles/SynologyDrive/CrossFit Hammerschmiede (CFH)/AI Development/forge-functional-fitness/memory-bank/memory-bank-techContext.md
/Users/chrishiles/SynologyDrive/CrossFit Hammerschmiede (CFH)/AI Development/forge-functional-fitness/memory-bank/memory-bank-systemPatterns.mdThen go into Plan Mode and either ask or suggest next steps based on information in the memory-bank-active-Context.md and last project-history file

# At the CLOSE of every Claude session give this prompt:

1. Following the file conventions in the project-history/2025-11-03-memory-optimization.md & memory-bank/workflow-protocols.md update the memory bank
2. Create the next project history file
3. Then, finally push to GitHub.
# ALWAYS - Ask before updating the memory bank/memory-bank-activeContext.md file in case there is not enough session time/token usage left!


# Note for Chris #
Only update to memory bank with at least 15% (better 20%) before auto-compact. I did it on the 6.11 with 13% context left before auto-compact and Claude managed to update the memory bank with just 1% to spare!

# Supabase Backup Info #
Not quite - adjust the timing: Start of every session:

git pull
✅ Get latest code changes BEFORE making risky changes:

npm run backup
✅ Create safety checkpoint
# Don't need to backup:
After every git pull ❌
If just reading/testing code ❌
Multiple times in same session ❌
# DO backup before:
Database migrations ✅
Bulk deletions ✅
Testing new database features ✅
Major refactors ✅
# Mimi's current status:
✅ Already has baseline backup
✅ Protected for next risky change
✅ Good to go
# Workflow:
Start session → git pull
About to do risky work → npm run backup
Make changes
If breaks → npm run restore 2025-12-13

# If Claude Code is not in side bar #
* Open Command Pallete (Cmd+Shift+P)
* Type "Claude Code: Open in side bar"
