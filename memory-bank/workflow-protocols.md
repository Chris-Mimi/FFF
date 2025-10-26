# Workflow Protocols (Agent & Context Mandates)

Version: 1.5
Timestamp: 2025-10-26

## 🚨 SESSION START PROTOCOL (MANDATORY - DO THIS FIRST)

**EVERY session MUST start with reading these 4 files in a SINGLE parallel Read call:**

```
Read: memory-bank/memory-bank-activeContext.md
Read: memory-bank/memory-bank-techContext.md
Read: memory-bank/memory-bank-systemPatterns.md
Read: memory-bank/workflow-protocols.md
```

**CRITICAL:** Memory bank files have `memory-bank-` prefix! Use exact paths above.

**DO NOT attempt to read:**
- ❌ `memory-bank/activeContext.md` (missing prefix)
- ❌ `memory-bank/techContext.md` (missing prefix)
- ❌ `memory-bank/systemPatterns.md` (missing prefix)

**If you read wrong paths:** You waste tokens and user time. Always use the 4 correct paths listed above.

---

## 🚫 FORBIDDEN DIRECTORIES (NEVER READ)

**NEVER read files from these directories under ANY circumstances:**
- ❌ `Chris Notes/` - User's personal notes (not for Claude)
- ❌ Any directory explicitly marked as personal/private

**Why:** `.gitignore` only affects Git commits, NOT Read tool access. This protocol prevents reading user's private files.

---

## 📝 COMMUNICATION TERMINOLOGY (MANDATORY)

**CORE PRINCIPLE:** Always use correct, consistent technical terminology. User can ask for clarification, but proper terms help learning and clear communication.

### Git/GitHub Terminology

**CORRECT:**
- ✅ "Commit changes" or "Save to Git" (local)
- ✅ "Push to GitHub" (upload to cloud)
- ✅ "Use `git push` command"
- ✅ "Upload commits to GitHub"

**INCORRECT:**
- ❌ "Push to git" (git is the tool, not the destination)
- ❌ "Save to GitHub" (you commit first, then push)
- ❌ Mixing up Git (tool) and GitHub (service)

**Key Distinctions:**
- **Git** = Version control software (tool on your computer)
- **GitHub** = Cloud hosting service for Git repositories
- **Commit** = Save changes locally with Git
- **Push** = Upload commits from local Git to GitHub

### UI/Component Terminology (Consistency Required)

**Always use these exact terms:**

**Layout Components:**
- **Modal** = Overlay window that blocks interaction with page behind it (e.g., PublishModal)
- **Panel** = Side/fixed area that can coexist with main content (e.g., WOD Modal as side panel)
- **Dropdown** = Select menu that expands downward
- **Popover** = Small floating info box triggered by hover/click
- **Tooltip** = Brief text hint on hover

**Navigation Elements:**
- **Navigation arrows** = Chevron/arrow buttons for moving between items
- **Breadcrumbs** = Path showing current location (Home > Coach > Workouts)
- **Tabs** = Horizontal navigation switching between views
- **Sidebar** = Vertical navigation menu

**Interactive Elements:**
- **Button** = Clickable action trigger
- **Toggle** = On/off switch
- **Checkbox** = Square box for multiple selections
- **Radio button** = Round button for single selection
- **Input field** = Text entry box
- **Textarea** = Multi-line text entry box

**Data Display:**
- **Table** = Grid of rows and columns
- **Card** = Contained block of related info
- **List** = Vertical stack of items
- **Grid** = Multi-column layout of items
- **Chip** = Small pill-shaped label/tag

**States:**
- **Disabled** = Greyed out, non-interactive
- **Active** = Currently selected/in use
- **Hover** = Mouse over element
- **Focus** = Element selected for keyboard input
- **Loading** = Waiting for data/action to complete

### Database Terminology

**Always use these exact terms:**
- **Table** = Database table (e.g., `wods`, `athlete_profiles`)
- **Column** = Table field (e.g., `published`, `event_time`)
- **Row** = Single record in a table
- **Query** = Database request for data
- **Migration** = SQL script that changes database schema
- **Schema** = Structure/organization of database tables

### Why This Matters

1. **Learning** - User learns correct technical vocabulary
2. **Clarity** - No ambiguity about what's being discussed
3. **Consistency** - Same element always called by same name
4. **Professional communication** - User can discuss project with other developers

**User can always ask:** "What's a modal?" or "What do you mean by migration?" - that's expected and encouraged.

---

## 📁 Memory Bank Files Reference

**Correct paths:**
- `memory-bank/memory-bank-activeContext.md` ✅
- `memory-bank/memory-bank-techContext.md` ✅
- `memory-bank/memory-bank-systemPatterns.md` ✅
- `memory-bank/workflow-protocols.md` ✅ (no prefix)

---

## Core Principle: Token Efficiency

**MANDATE:** Keep all Claude Code sessions under **50%** token context usage.

- **Warning Level (60%):** Suggest session end after current task.
- **Critical Level (70%):** **STOP** new complex tasks, complete current work, and **END SESSION** to start fresh.

---

## 🤖 AI Assistant Selection (Cost & Efficiency)

### When to Use Cline (VS Code)

**Best for:**
- ✅ Quick UI tweaks (single component)
- ✅ TypeScript/React refactoring (IntelliSense feedback)
- ✅ Single-file edits
- ✅ Visual changes (immediate preview)

**Requirements:**
- ⚠️ **Subagents MUST be enabled** (50-70% cost savings)
- ⚠️ Break large tasks into small pieces (reduce context)
- ⚠️ Clear chat between unrelated tasks

**Cost (with subagents):** $0.10-0.15 per medium task
**Cost (without subagents):** $0.30-0.50 per medium task ❌ AVOID

### When to Use Claude Code (Me - CLI)

**Best for:**
- ✅ Multi-file features (3+ files)
- ✅ Complex refactoring
- ✅ Database/backend issues
- ✅ Memory Bank updates
- ✅ Git operations
- ✅ Bug investigations
- ✅ Architecture planning

**Advantages:**
- ✅ Uses Task agents automatically (per 3-Point Test)
- ✅ Better for full codebase context
- ✅ Safer Git/Memory Bank handling

**Cost:** $0.12-0.20 per medium task (agents included)

### Decision Matrix

| Task Type | Use | Why |
|:---|:---|:---|
| "Change button color" | Cline | Single file, instant preview |
| "Add delete icon to month view" | Cline (if subagents work) | UI-focused, TypeScript feedback |
| "Refactor authentication system" | Claude Code | Multi-file, complex, needs agents |
| "Fix database RLS policies" | Claude Code | Backend, requires debugging |
| "Update Memory Bank" | Claude Code | Designed for it |
| "Create Git commit" | Claude Code | Safer, more experience |
| "Implement new feature (3+ files)" | Claude Code | Needs Task agents |

### Cost Tracking

**Monitor usage:** https://console.anthropic.com/settings/billing
**Set budget alerts** in Anthropic Console
**Review monthly:** Identify which assistant is most cost-effective for your workflow

---

## 🔄 Cline (Grok) + Claude Code Integration Workflow

### Task Evaluation Protocol (MANDATORY for Claude Code)

**When user requests a task, Claude Code MUST:**

1. **Evaluate if Cline/Grok is suitable** using these criteria:
   - ✅ Single file modification
   - ✅ UI/visual changes (immediate preview needed)
   - ✅ Component styling or layout adjustments
   - ✅ Simple bug fixes with clear scope
   - ❌ Multi-file changes → Use Claude Code
   - ❌ Git operations → Use Claude Code
   - ❌ Memory Bank updates → Use Claude Code
   - ❌ Complex logic/debugging → Use Claude Code

2. **If Grok is suitable:**
   - Tell user: "Grok - good fit"
   - Provide **precise, copy-paste prompt** with:
     - Exact file path(s)
     - Specific line numbers if known
     - Clear description of what to change
     - Expected behavior after change
     - How to test the change

3. **Example response format:**
   ```
   Grok - good fit.

   **Prompt for Grok:**

   Bug fix in components/WODModal.tsx:

   The Exercise Library insertion is leaving unwanted gaps when:
   1. User selects exercises (works correctly)
   2. User closes library, places cursor on new line
   3. User reopens library and selects exercise
   4. Result: Extra blank line appears

   Fix the insertion logic (around line 1083-1124) to:
   - Trim trailing whitespace/newlines before cursor position
   - Insert exercise without creating gaps
   - Maintain clean spacing (one newline between exercises)

   Test by: Add exercises, close library, click below last exercise,
   reopen library, add another - should have no gap.
   ```

### Git Commit Protocol After Grok Work (MANDATORY)

**When user says "Grok made changes, check and commit" (or similar):**

1. **ALWAYS run `git status` FIRST** - See ALL modified files
2. **ALWAYS run `git diff`** - Review ALL changes (or per file)
3. **Show user summary:**
   - List of modified files
   - Brief description of changes per file
4. **Wait for confirmation** if unexpected changes found
5. **Commit all related files together** - Never partial commits
6. **Use proper commit message format** (see Git Commit Guidelines)
7. **Push only if user requests**

**Why this matters:**
- Grok can modify multiple files silently
- `git status` catches everything
- Prevents lost work from partial commits
- Ensures working changes aren't buried under new edits

**Example workflow:**
```bash
# User: "Grok made changes, check and commit"
git status              # Discover: app/coach/page.tsx, components/WODModal.tsx modified
git diff app/coach/page.tsx
git diff components/WODModal.tsx
# Show user summaries
# Get confirmation
git add app/coach/page.tsx components/WODModal.tsx
git commit -m "fix(coach): proper commit message"
git push                # Only if requested
```

**NEVER:**
- ❌ Commit without running `git status` first
- ❌ Commit only some modified files
- ❌ Assume you know what changed without verifying
- ❌ Skip showing user what's being committed

---

## 🎯 Task Delegation and Agent Use

### Non-Negotiable Rule (The "3-Point Test")

**You MUST use an Agent (Task Tool) when any of these is true:**
1. **Multi-Step:** Task requires **3 or more** distinct steps/actions.
2. **Multi-File:** Task requires searching/reading **3 or more** independent files.
3. **Repetitive:** Task requires similar changes across **multiple** files.

**If the 3-Point Test is failed (NO to all):** You may work **directly** (single-file, simple, well-defined tasks only).

**Token-Efficient Workflows:**
- **Strategy:** Complete complex work (implement, test, commit) **before** updating the Memory Bank (do not update Memory Bank files mid-task).
- **Context Gathering:** Use **parallel Read tool calls** for independent file context, do not read sequentially.
- **Goal:** Keep sessions focused on a single, limited scope (e.g., "Add feature X"), not broad objectives (e.g., "Improve dashboard").

---

## 💾 Project and Development Standards

### Database (Supabase)

- **Primary Keys:** Always use `UUID` with `gen_random_uuid()`.
- **Timestamps:** Always include `created_at` and `updated_at` with `TIMESTAMP WITH TIME ZONE DEFAULT NOW()`.
- **RLS:** **MANDATORY** to enable Row Level Security on all tables.
- **References:** Use `UUID REFERENCES auth.users(id) ON DELETE CASCADE`.

### File Organization (Reference Only)

- **App Code:** `app/` (Next.js App Router).
- **Components:** `components/` (Reusable React).
- **Utilities:** `lib/` (Supabase client, helpers).
- **Memory:** `memory-bank/` (The 3 core files).
- **SQL Scripts:** `*.sql` in root.

### Git Commit Guidelines

- **Format:** `type(scope): brief description`
- **Types:** `feat, fix, docs, refactor, perf, test, chore`.
- **Pre-Commit:** Review changes (`git status`, `git diff`) before committing.

### Testing Protocols

- **Mandatory Checks:** Before committing new code, verify **Happy Path**, **Edge Cases**, and **Error Handling** (network, validation, database).
- **Database Test:** Test RLS policies and constraints in the Supabase SQL Editor.

---

*This document defines **the rules** for efficiency and compliance. The 'memory-bank/' files provide **the project facts**.*