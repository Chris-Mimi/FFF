# Workflow Protocols (Agent & Context Mandates)

Version: 1.2
Timestamp: 2025-10-21

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