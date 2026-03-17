# Session Close Checklist

## Order of Operations (CRITICAL)

### 1. Pre-Check: Terminal Lock & Sync
- [ ] **Check Terminal Locks:** Ensure no background processes (like `npm run dev`, `vite`, or `nodemon`) are actively locking the database or JSON files. Kill them if necessary to prevent corrupted backups.

### 2. Update Memory Bank
- [ ] **Update `memory-bank/memory-bank-activeContext.md`**
  - Current focus/state (Persona focus: Athlete vs. Coach?)
  - Known issues/bugs discovered
  - Next immediate steps for the next session
 - **⚠️ KEEP IT CONCISE:** Only last 5 sessions, remove older sessions (detailed history is in `project-history/`)
  - **Don't bloat activeContext** - Full details belong in project history files

### 3. Create Project History File
- [ ] **Create new file:** `project-history/YYYY-MM-DD-session-XX-description.md`
  - Document accomplishments, logic decisions, and major learnings.

### 4. Update Chris Notes/Forge app documentation/Forge-Feature-Overview.md
- [ ]Write any new features in this file with a view to using this as publicity and user manual when we launch

### 5. Run Database Backup ⚠️ BEFORE GIT
- [ ] **Execute Backup:**
  ```bash
  npm run backup
 

**Why before git?** Backup creates timestamped JSON files that should be version controlled alongside code changes.

**Auto-discovers and backs up ALL public tables** using `get_public_tables()` RPC function (Session 95). Current tables include:

**Movement/Workout Definitions (11):**
- exercises, exercise_categories, user_exercise_favorites, benchmark_workouts, forge_benchmarks
- barbell_lifts, section_types, workout_types, workout_titles, tracks, naming_conventions, resources

**Programmed Workouts (2):**
- wods, weekly_sessions

**User/Membership Data (3):**
- members, bookings, athlete_profiles

**Athlete Performance (4):**
- workout_logs, benchmark_results, lift_records, wod_section_results

**Social Features (1):**
- reactions

**Coach Tools (3):**
- programming_notes, note_folders, whiteboard_photos

### 5. Git Add
```bash
git add .
```
Stages all changes including backup files.

### 6. Git Commit
```bash
git commit -m "descriptive message

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### 7. Git Push
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
❌ **Don't ignore the "84% Bug"** – If the CLI feels slow or blocks, run /clear immediately after finishing these steps.

