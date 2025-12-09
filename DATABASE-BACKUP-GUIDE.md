# Database Backup & Restore Guide

## Why You Need This
**Git only saves CODE, not DATABASE DATA!**

When you switch branches or revert code, you can lose:
- ❌ Manually added exercises, benchmarks, and lifts
- ❌ Athlete records and PRs
- ❌ Workout history and programming
- ❌ All user data

This guide shows you how to backup and restore your Supabase data.

---

## ⚡ Quick Start

### Backup (After Each Session)
```bash
npm run backup
```

Creates timestamped JSON backups in `backups/` folder.

### Restore
```bash
# List available backups
npm run restore

# Restore specific backup
npm run restore 2025-01-09
```

---

## 📋 What Gets Backed Up

The backup system saves all critical tables:
- ✅ `barbell_lifts` - Lift definitions
- ✅ `benchmark_workouts` - CrossFit benchmarks
- ✅ `forge_benchmarks` - Custom gym benchmarks
- ✅ `lift_records` - **Athlete lift results (CRITICAL USER DATA)**
- ✅ `benchmark_results` - **Athlete benchmark results (CRITICAL USER DATA)**
- ✅ `wod_section_results` - **WOD results (CRITICAL USER DATA)**
- ✅ `wods` - Programmed workouts
- ✅ `exercises` - Exercise library

---

## 🔄 Recommended Workflow

### At the END of Each Session:
```bash
# 1. Backup database
npm run backup

# 2. Commit code changes
git add .
git commit -m "session X: description"

# 3. Push to GitHub
git push
```

### Before Switching Branches or Major Changes:
```bash
# 1. Backup current state
npm run backup

# 2. Make your changes
git checkout other-branch
# or
git reset --hard HEAD

# 3. If data is lost, restore
npm run restore 2025-01-09
```

---

## 📂 Where Are Backups Stored?

**Local Machine:**
- Location: `backups/` folder in project root
- Format: `YYYY-MM-DD_tablename.json`
- **Important:** This folder is gitignored (not uploaded to GitHub)

**Manifest File:**
Each backup creates a manifest file (`YYYY-MM-DD_manifest.json`) that tracks:
- Timestamp
- Which tables were backed up
- Success/failure status

---

## 🛠️ How It Works

### Backup Process
1. Connects to Supabase using your `.env.local` credentials
2. Exports each table to a JSON file
3. Creates a manifest file tracking the backup
4. Stores everything in `backups/` folder

### Restore Process
1. Reads the manifest to find which tables exist
2. Loads each JSON backup file
3. Uses `upsert` to restore data (updates existing, inserts new)
4. Prevents duplicates using `id` conflict resolution

---

## ⚠️ Important Notes

### Backups Are Local Only
- **Not backed up to GitHub** (gitignored for security)
- **Consider copying to SynologyDrive** or cloud storage periodically
- Example: Copy `backups/` folder to your SynologyDrive after major milestones

### .env.local Required
The backup system needs your Supabase credentials. Make sure `.env.local` exists with:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Restore Uses Upsert
- Existing records (same `id`) get **updated**
- New records get **inserted**
- No data loss - safe to run multiple times

---

## 🆘 Troubleshooting

### "Cannot find module 'dotenv'"
Install dependencies:
```bash
npm install
```

### "Invalid Supabase credentials"
Check your `.env.local` file has the correct:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### "No backups found"
Run `npm run backup` first to create a backup.

### Want to see backup contents?
Backups are JSON files - you can open them in any text editor:
```bash
cat backups/2025-01-09_exercises.json
```

---

## 💡 Pro Tips

1. **Backup before every major change** - It takes 5 seconds
2. **Name your backups** - Add notes to manifest files if needed
3. **Regular backups** - Make it a habit at the end of each session
4. **Off-site storage** - Copy important backups to SynologyDrive
5. **Test restores** - Occasionally test that restore works

---

## 🔗 Additional Resources

**Supabase Dashboard Backups** (Pro Plan):
- Daily automated backups (7 day retention)
- Point-in-time recovery
- Access via Dashboard → Database → Backups

**For Free Tier:** Use these scripts - they're designed exactly for this!
