# Session Close Checklist

## Order of Operations (CRITICAL)

Follow this exact order to ensure backups are included in git commits:

### 1. Update Memory Bank
- Update `memory-bank/memory-bank-activeContext.md`
  - Current focus/state
  - Known issues
  - Next immediate steps
  - **⚠️ KEEP IT CONCISE:** Only last 5 sessions, remove older sessions (detailed history is in `project-history/`)
  - **Don't bloat activeContext** - Full details belong in project history files

### 2. Create Project History File
- Create new file: `project-history/YYYY-MM-DD-session-XX-description.md`
- Document what was accomplished this session
- Include any important decisions or learnings

### 3. Run Database Backup ⚠️ BEFORE GIT
```bash
npm run backup
```
**Why before git?** Backup creates timestamped JSON files that should be version controlled alongside code changes.

Backs up 22 tables (879+ records as of Session 68):

**Movement/Workout Definitions (10):**
- exercises, exercise_categories, benchmark_workouts, forge_benchmarks, barbell_lifts
- section_types, workout_types, tracks, naming_conventions, resources

**Programmed Workouts (2):**
- wods, weekly_sessions

**User/Membership Data (3):**
- members, bookings, athlete_profiles

**Athlete Performance (4):**
- workout_logs, benchmark_results, lift_records, wod_section_results

**Coach Tools (3):**
- programming_notes, note_folders, whiteboard_photos

### 4. Git Add
```bash
git add .
```
Stages all changes including backup files.

### 5. Git Commit
```bash
git commit -m "descriptive message

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### 6. Git Push
```bash
git push
```

---

## Verification Checklist

- [ ] Memory bank updated with current state
- [ ] Project history file created
- [ ] Backup completed successfully
- [ ] All changes committed (including backups)
- [ ] Pushed to GitHub
- [ ] Both accounts synced (if working across Mimi/Chris accounts)

---

## Common Mistakes to Avoid

❌ **Don't commit before backup** - Backup files won't be in the commit
❌ **Don't skip project history** - Future sessions need context
❌ **Don't use generic commit messages** - Be specific about what changed
❌ **Don't bloat activeContext.md** - Keep only last 5 sessions, move older sessions to "See project-history/" summary
