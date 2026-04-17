# At the START of every Claude session give this prompt:

**Read in ONE parallel call (COPY EXACTLY!!!):**
/Users/chrishiles/SynologyDrive/CrossFit Hammerschmiede (CFH)/AI Development/forge-functional-fitness/memory-bank/memory-bank-activeContext.md

Plus the most recent file in `project-history/` (run `ls -t project-history | head -1` to find it).

Only read `memory-bank/workflow-protocols.md`, `memory-bank-techContext.md`, or `memory-bank-systemPatterns.md` if the task actually needs them.

Then suggest next steps directly based on activeContext + latest session. **Do not enter Plan Mode unless the task is a genuine 3+ file implementation.**

---

## 🪙 CONTEXT EFFICIENCY RULES (mandatory — Session 285)

Past sessions burned 70%+ context on tasks that should cost 15%. Follow these:

1. **No Explore agent for single-file lookups.** Use Grep/Read directly. Explore is for 3+ queries or genuinely unknown territory.
2. **No Plan Mode for diagnose-and-delete or single-file tasks.** EnterPlanMode loads heavy tool schemas + writes a plan file. Worth it only for 3+ file implementations.
3. **Targeted reads, not full reads.** Grep for the section, then `Read` with `offset`+`limit`. Never read 300+ line files when you need 20 lines.
4. **Short agent prompts.** 40 words, not 200.
5. **No TodoWrite for 1–3 step tasks.** TodoWrite is for 4+ step work with distinct phases.
6. **Ask before exploring** if the task is ambiguous — cheaper than guessing wrong.


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

Manual backups going forward:
Manual backups: Exclude node_modules, .next, .git folders
Synology sync will remain stable with exclusions
To restore backup: Copy files + run npm install

export STRIPE_API_KEY=sk_test_51SwHq9D9xNuuM31ez2E2LW819KkEYXAIfvV7ipay4IQzj68U6ibmFuvecEmJtWWc6fZqMnE2xAMGISjniYhR0a9w00fIyt9PeJ
stripe listen --forward-to localhost:3000/api/stripe/webhook


fetch('https://xvrefulklquuizbpkppb.supabase.co/rest/v1/members?select=*&limit=1', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2cmVmdWxrbHF1dWl6YnBrcHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMzQ3MjMsImV4cCI6MjA3NTkxMDcyM30.W7mOQD5gA3rFTqxdYKHWQekYLxjYQYPufTKj3FufzFoE',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2cmVmdWxrbHF1dWl6YnBrcHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMzQ3MjMsImV4cCI6MjA3NTkxMDcyM30.W7mOQD5gA3rFTqxdYKHWQekYLxjYQYPufTKj3FufzFo'
  }
}).then(r => console.log('Success:', r.status)).catch(e => console.log('Failed:', e))

