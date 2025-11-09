# Workflow Protocols

**Version:** 2.1
**Updated:** 2025-11-09

---

## ⛔️ SESSION START PROTOCOL (CRITICAL)

### STEP 1: Read This File First
**ALWAYS read workflow-protocols.md BEFORE other memory bank files.**

### STEP 1.5: Git Sync FIRST (MANDATORY)
**BEFORE reading Memory Bank, check Git status:**

```bash
git fetch origin
git status
```

**If user mentions ANY of these phrases:**
- "pushed to GitHub"
- "git is ahead"
- "committed and pushed"
- "GitHub has the latest"

**Then IMMEDIATELY run:**
```bash
git reset --hard origin/main
```

**✅ Trust user statements about GitHub**
**❌ Do NOT analyze local changes first**
**❌ Do NOT make assumptions about what needs fixing**

### STEP 2: Use Correct File Paths (One Parallel Call)

**✅ CORRECT paths (copy exactly):**
```
Read:
- project-history/2025-11-03-memory-optimization.md
Read in ONE parallel call:
- memory-bank/memory-bank-activeContext.md
- memory-bank/memory-bank-techContext.md
- memory-bank/memory-bank-systemPatterns.md
```

### STEP 3: Never Read Chris Notes Folder
**ABSOLUTELY NEVER read:**
- ❌ `Chris Notes/` directory
- ❌ Any path containing "Chris Notes"

---

## 🚦 BEFORE EVERY TASK (MANDATORY GATE)

**⛔️ When user requests work → STOP → Evaluate FIRST**

### Evaluation Decision Tree

**Ask yourself:**
1. **Is this Cline/Grok suitable?**
   - ✅ Single file modification
   - ✅ UI/visual changes
   - ✅ Component styling
   - ✅ Simple bug fixes
   - → **Recommend Cline/Grok**

2. **Is this Task Agent suitable?**
   - ✅ 3+ distinct steps
   - ✅ Multi-file search/exploration
   - ✅ Repetitive changes across files
   - → **Recommend Agent**

3. **Is this Claude Code direct work?**
   - ✅ Multi-file feature (3+ files)
   - ✅ Git operations
   - ✅ Memory Bank updates
   - ✅ Complex logic/debugging
   - → **Do directly**

### Required Output Format

**BEFORE starting ANY implementation, output:**
```
Task: [brief description]
Complexity: [single-file/multi-file/exploratory/etc]
Best approach: [Cline/Agent/Me directly]
Reasoning: [one sentence why]

Proceed with [approach]?
```

### Critical Rules

- **NEVER** start implementation without this evaluation
- **NEVER** skip asking user for approval of approach
- **ALWAYS** provide this evaluation even if task seems obvious

**Cost awareness:** Cline ($0.10-0.15) vs Claude Code direct ($0.20+ with context usage)

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
- `WODModal.tsx` = Edit Workout side panel (legacy name, keep as-is)
- `SessionManagementModal.tsx` = Manage Session popup

### UI Components (Standard Terms)
**Layout:** Modal, Panel, Dropdown, Popover, Tooltip
**Navigation:** Arrows, Breadcrumbs, Tabs, Sidebar
**Interactive:** Button, Toggle, Checkbox, Radio button, Input field, Textarea
**Display:** Table, Card, List, Grid, Chip
**States:** Disabled, Active, Hover, Focus, Loading

### Database
**Standard terms:** Table, Column, Row, Query, Migration, Schema

---

## 🎯 TOKEN EFFICIENCY

**MANDATE:** Keep sessions under 50% context usage.

**Monitoring:**
- **50%/60%/70%:** Alert user and await instructions as to how to proceed
- **80%:** STOP work, finish current task, ask for Memory Bank update

---

## 🤖 AI ASSISTANT SELECTION

### When to Use Cline/Grok (VS Code)
**Best for:**
- Single-file edits
- UI tweaks with immediate preview
- TypeScript refactoring

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
| "Change button color" | Cline | Single file, instant preview |
| "Refactor auth system" | Claude Code | Multi-file, complex |
| "Fix RLS policies" | Claude Code | Backend debugging |
| "Update Memory Bank" | Claude Code | Designed for it |
| "New feature (3+ files)" | Claude Code | Needs agents |

---

## 🔄 CLINE/GROK INTEGRATION

### Task Evaluation (MANDATORY)
**When user requests task, evaluate if Cline/Grok is suitable:**

**✅ Grok suitable:**
- Single file modification
- UI/visual changes
- Component styling
- Simple bug fixes

**❌ Use Claude Code:**
- Multi-file changes
- Git operations
- Memory Bank updates
- Complex logic/debugging

### Grok Prompt Format
```
[Short title]

[Specific problem description]

Fix [exact file and line numbers]:
- [What to change]
- [Expected behavior]
- [How to test]
```

### Git Commit Protocol After Grok Work (MANDATORY)
**When user says "Grok made changes, check and commit":**

1. **ALWAYS run `git status` FIRST** - See ALL modified files
2. **ALWAYS run `git diff`** - Review ALL changes
3. Show user summary of changes
4. Wait for confirmation if unexpected
5. Commit all related files together
6. Push only if requested

**Why:** Grok can modify multiple files silently. Prevents partial commits and lost work.

**Example:**
```bash
git status              # See what changed
git diff app/coach/page.tsx
git diff components/WODModal.tsx
# Show summaries, get confirmation
git add app/coach/page.tsx components/WODModal.tsx
git commit -m "fix(coach): proper message"
git push                # Only if requested
```

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
