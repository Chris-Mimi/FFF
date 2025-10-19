# Workflow Protocols (Agent & Context Mandates)

Version: 1.1
Timestamp: [UPDATE ON REVISION]

## Core Principle: Token Efficiency

**MANDATE:** Keep all Claude Code sessions under **50%** token context usage.

- **Warning Level (60%):** Suggest session end after current task.
- **Critical Level (70%):** **STOP** new complex tasks, complete current work, and **END SESSION** to start fresh.

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