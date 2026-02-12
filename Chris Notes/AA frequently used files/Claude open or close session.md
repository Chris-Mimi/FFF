# At the START of every Claude session give this prompt:

**Read in ONE parallel call (COPY EXACTLY!!!):**
/Users/chrishiles/SynologyDrive/CrossFit Hammerschmiede (CFH)/AI Development/forge-functional-fitness/memory-bank/workflow-protocols.md
/Users/chrishiles/SynologyDrive/CrossFit Hammerschmiede (CFH)/AI Development/forge-functional-fitness/memory-bank/memory-bank-activeContext.md
/Users/chrishiles/SynologyDrive/CrossFit Hammerschmiede (CFH)/AI Development/forge-functional-fitness/memory-bank/memory-bank-techContext.md
/Users/chrishiles/SynologyDrive/CrossFit Hammerschmiede (CFH)/AI Development/forge-functional-fitness/memory-bank/memory-bank-systemPatterns.md
Then go into Plan Mode and either ask or suggest next steps based on information in the memory-bank-active-Context.md and last project-history file


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

