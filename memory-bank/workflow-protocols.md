# Workflow Protocols

**Version:** 3.0
**Updated:** 2025-12-11

---

## ⛔️ SESSION START PROTOCOL (CRITICAL)

**Project Context:** 2 users working on separate Mac profiles. Git sync required at start of EVERY session.

### STEP 1: Read This File First
**ALWAYS read workflow-protocols.md BEFORE other memory bank files.**

### STEP 2: Git Sync Check (MANDATORY - 2-User Setup)
**Run these commands at the start of EVERY session:**

```bash
git fetch origin
git status
```

**Then evaluate:**

**If branch is behind origin/main:**
```bash
git pull origin main
```

**If user explicitly says "I pushed from other profile" or "GitHub is ahead":**
```bash
git reset --hard origin/main  # Trust user, force sync
```

**Why this matters:**
- 2 users on separate Mac profiles work independently
- User may have pushed from other profile in previous session
- Always sync before starting work to avoid conflicts

### STEP 3: Read Memory Bank Files
**User will provide exact file paths in session start prompt.**
Read all three files in ONE parallel call:
- memory-bank-activeContext.md
- memory-bank-techContext.md
- memory-bank-systemPatterns.md

### STEP 4: Read Latest Project History
**ALWAYS read the most recent project-history file:**

```bash
ls -t project-history/ | head -1
```

Then read that file to understand what was done in the last session.

### STEP 5: Database Backup Reminder
**Ask user if daily backup has been done (if first session of the day).**

### STEP 6: Monitor All File Changes
**Git pull/push includes all files:**
- Chris Notes folder contains files synced between accounts
- Always acknowledge ALL file changes from git operations
- Don't read Chris Notes files unless explicitly asked

---

## 🛡️ DATABASE SAFETY PROTOCOL (CRITICAL)

**⚠️ CRITICAL LESSON LEARNED:** Git branches do NOT protect database state!

**BEFORE ANY database changes (migrations, branch switches, destructive operations):**

```bash
npm run backup
```

**Mandatory backup scenarios:**
1. ✅ Before running ANY migration
2. ✅ Before switching git branches (if branch has migrations)
3. ✅ Before DROP TABLE, DELETE, TRUNCATE, or ALTER ... DROP COLUMN
4. ✅ Daily before starting work session
5. ✅ Before testing new features that write to database

**Backup commands:**
```bash
# Create backup
npm run backup

# List available backups
npm run restore

# Restore from backup (if disaster strikes)
npm run restore 2025-12-06
```

**Required reading before migrations:**
- See: `PRE_MIGRATION_CHECKLIST.md` (read EVERY TIME)
- Always review migration SQL files before running
- Look for: DROP, DELETE, TRUNCATE, ALTER...DROP
- If destructive: verify backup exists, confirm you can recreate lost data

**Why this matters:**
- Lost data: Custom Forge Benchmarks, Athlete lift records (Dec 6, 2025 incident)
- Cause: Assumed git branches protected database (they don't!)
- Solution: Mandatory backups before ANY risky operation

---

## 🚦 BEFORE EVERY TASK (MANDATORY GATE)

**⛔️ When user requests work → STOP → Evaluate FIRST**

### Evaluation Decision Tree

**Ask yourself:**
1.  **Is this Task Agent suitable?**
   - ✅ 3+ distinct steps
   - ✅ Multi-file search/exploration
   - ✅ Repetitive changes across files
   - → **Recommend Agent**

### Required Output Format

**BEFORE starting ANY implementation, output:**
```
Task: [brief description]
Complexity: [single-file/multi-file/exploratory/etc]
Best approach: [Agent/Me directly]
Reasoning: [one sentence why]

Proceed with [approach]?
```

### Critical Rules

- **NEVER** start implementation without this evaluation
- **NEVER** skip asking user for approval of approach
- **ALWAYS** provide this evaluation even if task seems obvious

---

## 📝 COMMUNICATION TERMINOLOGY

### Git/GitHub (Always Use Correct Terms)
| ✅ Correct | ❌ Incorrect |
|:---|:---|
| "Commit changes" (local) | "Push to git" |
| "Push to GitHub" (upload) | "Save to GitHub" |
| Git = tool, GitHub = service | Mixing the two |

**Key:**
- **Commit** = Save locally with Git
- **Push** = Upload to GitHub

### Workout Terminology (CRITICAL)
| ✅ Correct | ❌ Incorrect |
|:---|:---|
| "Workout" (general term) | "WOD" (except for section type) |
| "Edit Workout Modal" | "WOD Modal" |
| "Create a Workout" | "Create a WOD" |
| "Workout card" | "WOD card" |

**Component Names:**
- `WorkoutModal.tsx` = Edit Workout side panel
- `SessionManagementModal.tsx` = Manage Session popup

### UI Components (Standard Terms)
**Coach Login Page:** main workout programming interface separate from athlete
**Athlete Login Page:** athlete workout logbook, records etc separate login from coach
**Layout:** Modal, Panel, Dropdown, Popover, Tooltip
**Navigation:** Arrows, Breadcrumbs, Tabs, Sidebar
**Interactive:** Button, Toggle, Checkbox, Radio button, Input field, Textarea
**Display:** Table, Card, List, Grid, Chip
**States:** Disabled, Active, Hover, Focus, Loading

### Database
**Standard terms:** Table, Column, Row, Query, Migration, Schema

---

## 🎯 TOKEN EFFICIENCY

**MANDATE:** Keep sessions under 70% context usage.

**Monitoring:**
- **50%/60%/70%/80%:** Alert user and await instructions as to how to proceed

---

## 🤖 AI ASSISTANT SELECTION


**Requirements:**
- ⚠️ Subagents MUST be enabled (50-70% cost savings)
- ⚠️ Break tasks into small pieces
- ⚠️ Clear chat between unrelated tasks

**Cost:** $0.10-0.15 per task (with subagents)

### When to Use Claude Code (CLI)
**Best for:**
- Multi-file features (3+ files)
- Complex refactoring
- Database/backend issues
- Memory Bank updates
- Git operations
- Bug investigations

**Cost:** $0.12-0.20 per task (agents included)

### Decision Matrix
| Task | Use | Why |
|:---|:---|:---|
| "Refactor auth system" | Claude Code | Multi-file, complex |
| "Fix RLS policies" | Claude Code | Backend debugging |
| "Update Memory Bank" | Claude Code | Designed for it |
| "New feature (3+ files)" | Claude Code | Needs agents |


**NEVER:**
- ❌ Commit without `git status` first
- ❌ Commit only some modified files
- ❌ Skip showing user what's being committed

---

## 🎯 TASK DELEGATION (3-Point Test)

**MUST use Agent when ANY is true:**
1. **Multi-Step:** 3+ distinct steps/actions
2. **Multi-File:** 3+ independent files to search/read
3. **Repetitive:** Similar changes across multiple files

**Direct work OK for:**
- Single-file, simple, well-defined tasks

**Token-Efficient Workflows:**
- Complete work (implement, test, commit) BEFORE updating Memory Bank
- Use parallel Read calls for independent files
- Keep sessions focused on single limited scope

---

## 💾 DEVELOPMENT STANDARDS

### Database (Supabase)
- **Primary Keys:** UUID with gen_random_uuid()
- **Timestamps:** created_at, updated_at with TIMESTAMP WITH TIME ZONE
- **RLS:** MANDATORY on all tables
- **References:** UUID REFERENCES auth.users(id) ON DELETE CASCADE

### Git Commits
**Format:** `type(scope): brief description`
**Types:** feat, fix, docs, refactor, perf, test, chore
**Pre-Commit:** Review with `git status` and `git diff`

### Testing
**Mandatory checks before commits:**
- Happy Path
- Edge Cases
- Error Handling (network, validation, database)
- RLS policies in Supabase SQL Editor

---

**File Size:** ~6.5KB (50% reduction from 13KB)
