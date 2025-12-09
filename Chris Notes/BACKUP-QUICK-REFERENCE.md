# Database Backup - Quick Reference Card

## 📌 Remember: Git ≠ Database

**Git saves:** Code, files, configurations
**Git does NOT save:** Database data (exercises, PRs, workouts, user records)

---

## 🚀 Commands You Need

### End of Session Routine
```bash
npm run backup              # Backup database
git add .                   # Stage changes
git commit -m "message"     # Commit code
git push                    # Push to GitHub
```

### Restore Lost Data
```bash
npm run restore             # List backups
npm run restore 2025-01-09  # Restore specific date
```

---

## 📁 What Gets Saved

**Backup Location:** `backups/` folder (local only, not on GitHub)

**Tables Backed Up:**
- Exercises, Lifts, Benchmarks (movement library)
- Athlete Records & PRs (lift_records, benchmark_results)
- WOD Results (wod_section_results)
- Programmed Workouts (wods)

---

## ✅ Best Practices

1. **Run `npm run backup` after every session** ← Most important!
2. Backup BEFORE switching branches
3. Backup BEFORE major database changes
4. Periodically copy `backups/` folder to SynologyDrive

---

## 🆘 Oh No, I Lost Data!

**Don't panic!** If you have backups:

```bash
# 1. List available backups
npm run restore

# 2. Restore from the date you want
npm run restore 2025-01-09
```

**No backups?** Check:
- Supabase Dashboard → Database → Backups (if Pro plan)
- Your SynologyDrive backup copy (if you made one)

---

## 📝 Notes

- Backups are JSON files - you can view them in any text editor
- Restore uses `upsert` - safe to run multiple times
- Old data gets updated, new data gets inserted
- Full guide: See `DATABASE-BACKUP-GUIDE.md` in project root
