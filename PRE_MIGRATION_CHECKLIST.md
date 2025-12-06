# 🛡️ PRE-MIGRATION SAFETY CHECKLIST

## ⚠️ CRITICAL: READ BEFORE ANY DATABASE CHANGES

**Git branches do NOT protect database state!** Migrations affect the live database regardless of which git branch you're on.

---

## ✅ Mandatory Steps Before ANY Migration

### 1. Create Backup (REQUIRED)
```bash
npx tsx scripts/backup-critical-data.ts
```

**Verify backup created:**
- Check `backups/` folder for today's date
- Confirm manifest shows all tables backed up successfully

### 2. Review Migration Files
```bash
# List all migrations in order
ls -la supabase/migrations/

# Read the migration you're about to run
cat supabase/migrations/YYYYMMDD_migration_name.sql
```

**Red flags to look for:**
- `DROP TABLE` - Will delete all data in that table
- `DELETE FROM` - Will remove records
- `TRUNCATE` - Will clear table completely
- `ALTER TABLE ... DROP COLUMN` - Will lose column data

### 3. Check for Destructive Operations

If migration contains ANY of these:
- ✋ **STOP**
- 💾 **Verify backup exists**
- 📝 **Document what will be lost**
- 🤔 **Ask yourself: "Can I recreate this data?"**
- ✅ **Only proceed if you're certain**

### 4. Test on Staging First (If Available)

If you have a staging database:
1. Run migration there first
2. Verify nothing breaks
3. Then run on production

---

## 🔄 Restore From Backup (If Things Go Wrong)

```bash
# List available backups
npx tsx scripts/restore-from-backup.ts

# Restore from specific date
npx tsx scripts/restore-from-backup.ts 2025-12-06
```

---

## 📋 Migration Workflow

### Safe Workflow:
1. ✅ Create backup (`npx tsx scripts/backup-critical-data.ts`)
2. ✅ Review migration SQL file
3. ✅ Run migration via Supabase Dashboard
4. ✅ Verify data still exists
5. ✅ Test application
6. ✅ Create new backup after successful migration

### What We Learned (The Hard Way):
- ❌ Switching git branches doesn't protect database
- ❌ Assuming migrations are safe without reading them
- ❌ Not backing up before destructive operations
- ✅ Always backup before ANY database change
- ✅ Always read migration files first
- ✅ Always verify data after migration

---

## 🚨 Emergency Contacts

**If data loss occurs:**
1. Check `backups/` folder for recent backups
2. Check Supabase Dashboard → Database → Backups (may have auto-backups)
3. Run restore script immediately
4. Document what was lost

---

## 📅 Regular Backup Schedule

**Recommended:**
- **Daily:** Before starting work
- **Weekly:** Full backup kept long-term
- **Before ANY:** Migration, branch switch, or major change

**Set up automated daily backups:**
```bash
# Add to crontab (runs daily at 3 AM)
0 3 * * * cd /path/to/project && npx tsx scripts/backup-critical-data.ts
```

---

## ⚠️ Remember:

> "The best time to create a backup was yesterday.
> The second best time is NOW."

**Never skip backups. Ever.**
