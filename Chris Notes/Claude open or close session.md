# At the START of every Claude session give this prompt:
git pull


1. Git sync check:
git fetch origin
git status
(pull if behind)

2. **Read in ONE parallel call (COPY EXACTLY!!!):**
/Users/chrishiles/SynologyDrive/CrossFit Hammerschmiede (CFH)/AI Development/forge-functional-fitness/memory-bank/workflow-protocols.md
/Users/chrishiles/SynologyDrive/CrossFit Hammerschmiede (CFH)/AI Development/forge-functional-fitness/memory-bank/memory-bank-activeContext.md
/Users/chrishiles/SynologyDrive/CrossFit Hammerschmiede (CFH)/AI Development/forge-functional-fitness/memory-bank/memory-bank-techContext.md
/Users/chrishiles/SynologyDrive/CrossFit Hammerschmiede (CFH)/AI Development/forge-functional-fitness/memory-bank/memory-bank-systemPatterns.md

3. Follow remaining steps in workflow-protocols.md
This format:
Line 1: Git sync FIRST (I must do this before reading anything)
Line 2: Four exact file paths (no chance to use wrong paths)
Line 3: Defer to workflow-protocols for rest (read latest project history, backup reminder)
Then read the workflow-protocols and act on what it says. 
Then go into Plan Mode and either ask or suggest next steps based on information in the memory-bank-active-Context.md and last project-history file

# At the CLOSE of every Claude session give this prompt:

1. - Following the file conventions in the project-history/2025-11-03-memory-optimization.md & memory-bank/workflow-protocols.md, commit all changes. Then update the memory bank not forgetting the project history file. Finally push to GitHub.
# ALWAYS - Ask before updating the memory bank/memory-bank-activeContext.md file in case there is not enough session time/token usage left!



# Note for Chris #
Only update to memory bank with at least 15% (better 20%) before auto-compact. I did it on the 6.11 with 13% context left before auto-compact and Claude managed to update the memory bank with just 1% to spare!


add-benchmark-fields.ts
apply-benchmark-migration.ts
apply-migration.ts
check-forge-benchmarks.ts
delete-forge-benchmarks.ts
2025-12-06-session-38-benchmark-inputs-redesign.md