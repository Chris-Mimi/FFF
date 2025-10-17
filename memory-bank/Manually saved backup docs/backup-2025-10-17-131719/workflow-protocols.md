# Workflow Protocols for Forge Functional Fitness

Version: 1.0
Timestamp: 2025-10-16 15:00 UTC

## Purpose

This document defines token-efficient workflows for developing the Forge Functional Fitness application. The goal is to keep Claude Code sessions under 50% context usage through strategic use of agents and clear decision rules.

---

## Core Principle: Token Efficiency

**Target:** Keep sessions under 50% token context usage
**Warning Level:** 60% (suggest session end after current task)
**Critical Level:** 70% (stop new complex tasks, complete current work, end session)

---

## Pre-Task Checklist (Run Before EVERY Task)

**STOP. Before you start ANY task, answer these questions:**

1. ☐ Does this task have 3 or more distinct steps?
2. ☐ Will I need to search or read multiple files (3+)?
3. ☐ Does this involve making similar changes across multiple files?
4. ☐ Is this a bug where I don't immediately know the cause?
5. ☐ Is this exploring/analyzing how something works across the codebase?

**If you answered YES to ANY question above:**
- ✅ **USE THE TASK TOOL** with appropriate agent type
- ❌ **DO NOT work directly**
- 💡 Working directly will burn tokens and waste session time

**If you answered NO to ALL questions:**
- ✅ You may work directly
- ✅ This should be a single-file, simple, well-defined task

---

## When to Use Agents vs Direct Work

### Use Agents (Task Tool) When:

1. **Multi-step tasks (3+ distinct steps)**
   - Database migrations with multiple table changes
   - Feature implementations spanning multiple files
   - Refactoring that touches several components
   - Bug investigations requiring multiple file searches

2. **Open-ended exploration**
   - Searching for patterns across the codebase
   - Analyzing how a feature works across files
   - Finding all instances of a particular implementation
   - Investigating performance issues

3. **Repetitive operations**
   - Updating similar patterns across multiple files
   - Adding consistent error handling to multiple functions
   - Applying styling changes across components

4. **Complex analysis tasks**
   - Performance optimization requiring profiling
   - Security audit across authentication flows
   - Dependency analysis and updates

### Work Directly When:

1. **Single-file edits**
   - Fixing a bug in one component
   - Adding a single feature to one file
   - Updating configuration in one place

2. **Simple, well-defined tasks**
   - Adding a new field to a form
   - Updating text/copy
   - Changing colors or simple styling

3. **Quick answers or explanations**
   - Explaining how existing code works
   - Answering questions about architecture
   - Providing recommendations

4. **Documentation updates**
   - Updating Memory Bank files
   - Writing or updating README
   - Adding code comments

---

## Decision Tree

```
Is this task 3+ distinct steps?
├─ YES → Use Agent
└─ NO → Continue...
    │
    Does it require searching multiple files?
    ├─ YES → Use Agent
    └─ NO → Continue...
        │
        Does it involve repetitive changes?
        ├─ YES → Use Agent
        └─ NO → Work directly
```

---

## Database Migration Protocols

### Creating New Tables

**Always use agents for:** Creating multiple tables or complex schema changes

**Process:**
1. Create migration SQL file with descriptive name: `supabase-[feature]-[action].sql`
2. Include in migration file:
   - Table creation with proper types
   - Indexes for performance
   - Row Level Security (RLS) enablement
   - Development PUBLIC policies (temporary)
   - Production user-specific policies (commented or ready)
3. Document migration in `SUPABASE-[FEATURE]-SETUP.md`
4. Test migration in Supabase SQL Editor
5. Update Memory Bank with schema changes

**Example filename:** `supabase-scaling-system-update.sql`

### Adding Columns to Existing Tables

**Can work directly if:** Single column addition with clear requirements

**Use agent if:** Multiple columns or constraints need to be added

**Process:**
1. Create migration file: `supabase-[table]-[feature]-update.sql`
2. Include:
   ```sql
   ALTER TABLE table_name ADD COLUMN column_name TYPE;
   ALTER TABLE table_name ADD CONSTRAINT constraint_name CHECK (condition);
   CREATE INDEX IF NOT EXISTS idx_name ON table_name(column_name);
   ```
3. Update existing data if needed with UPDATE statements
4. Document in Memory Bank

### Schema Considerations

- **Always use UUIDs** for primary keys: `id UUID DEFAULT gen_random_uuid() PRIMARY KEY`
- **Always add timestamps:** `created_at`, `updated_at` with `TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
- **User references:** `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`
- **Indexes:** Add for all foreign keys and frequently queried columns
- **RLS:** Enable on all tables, add both user-specific AND temporary PUBLIC policies

---

## Git Commit Guidelines

### Commit Message Format

```
type(scope): brief description

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Commit Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Changes to build process or auxiliary tools

### Examples from This Project

```
feat: add Track system and Analysis page with comprehensive statistics
fix: eliminate exercise library flashing by caching exercises
docs: update Memory Bank with Track system and Analysis page features
refactor: consolidate authentication checks into reusable hook
```

### Workflow

1. **Before committing:** Run `git status` and `git diff` to review changes
2. **Commit scope:** Be specific (e.g., "athlete dashboard", "WOD modal", "database schema")
3. **Description:** Focus on WHY, not WHAT (the diff shows what)
4. **When to commit:**
   - Feature is complete and working
   - Bug is fixed and tested
   - Logical checkpoint in multi-step work

---

## Testing Protocols

### Manual Testing Checklist

Before committing new features, test:

1. **Happy path:** Feature works as intended
2. **Edge cases:**
   - Empty states (no data)
   - Maximum values
   - Invalid inputs
3. **Error handling:**
   - Network failures
   - Database errors
   - Validation failures
4. **UI/UX:**
   - Loading states display
   - Success/error messages appear
   - Mobile responsiveness

### Database Testing

1. **Test in Supabase SQL Editor first**
2. **Verify data types** are correct
3. **Check constraints** work (e.g., scaling values)
4. **Test RLS policies** (PUBLIC for dev, user-specific for production)
5. **Verify indexes** exist on foreign keys

---

## Token-Efficient Workflows

### Strategy 1: Focused Sessions

Each session should have a clear, limited scope:
- "Add scaling field to benchmarks"
- "Create athlete progress charts"
- "Fix timezone bug in date handling"

NOT: "Improve the athlete dashboard" (too broad)

### Strategy 2: Memory Bank Updates

Update Memory Bank **after** completing significant work, not during:
- Complete the feature first
- Test it thoroughly
- Then update Memory Bank in one focused update
- This prevents multiple back-and-forth edits

### Strategy 3: Parallel Operations

When reading multiple files for context:
- Use multiple Read tool calls in parallel
- Don't read files sequentially if they're independent
- This saves overall token usage

### Strategy 4: Agent Delegation

For complex tasks:
1. Define the task clearly upfront
2. Delegate to agent with specific goals
3. Agent handles the exploration/implementation
4. Review results when complete

---

## File Organization Standards

### Project Structure

```
forge-functional-fitness/
├── app/                    # Next.js app router pages
│   ├── page.tsx           # Login page
│   ├── athlete/           # Athlete dashboard
│   └── coach/             # Coach dashboard & sub-pages
├── components/            # Reusable React components
├── lib/                   # Utilities (Supabase client, helpers)
├── memory-bank/           # Project memory (3 core files)
├── docs/                  # Project documentation
├── public/                # Static assets
└── *.sql                  # Database migration scripts
```

### Naming Conventions

- **Components:** PascalCase (`WODModal.tsx`)
- **Pages:** lowercase with folder structure (`app/coach/analysis/page.tsx`)
- **Utilities:** camelCase (`supabase.ts`)
- **SQL files:** kebab-case (`supabase-athlete-tables.sql`)
- **Documentation:** UPPERCASE or kebab-case (`README.md`, `workflow-protocols.md`)

---

## Common Task Examples

### Example 1: Adding a New Field to Database + UI

**Task:** Add "scaling" field to benchmark_results table

**Approach:** Work directly (simple, focused)

**Steps:**
1. Create migration file: `supabase-benchmark-scaling-update.sql`
2. Add column with constraint:
   ```sql
   ALTER TABLE benchmark_results ADD COLUMN scaling TEXT;
   ALTER TABLE benchmark_results ADD CONSTRAINT valid_scaling
     CHECK (scaling IN ('Rx', 'Sc1', 'Sc2', 'Sc3'));
   ```
3. Update UI component to include scaling dropdown
4. Update save handler to include scaling field
5. Test: Create benchmark entry with each scaling option
6. Commit: `feat(benchmarks): add scaling field (Rx, Sc1, Sc2, Sc3)`

**Token estimate:** Low (single file changes, direct work)

---

### Example 2: Building Multi-Tab Dashboard

**Task:** Create athlete dashboard with 6 tabs

**Approach:** Use agent (multi-step, multiple components)

**Why agent:**
- 6 distinct tab components to build
- Database queries for each tab
- State management across tabs
- Multiple file creation/edits

**Process:**
1. Define requirements clearly
2. Delegate to agent with specific tab list
3. Agent explores patterns, creates components
4. Review and test each tab
5. Single commit when complete

**Token estimate:** High (many files, complex state) - agent keeps it manageable

---

### Example 3: Bug Investigation

**Task:** "Date highlighting shows wrong day in calendar"

**Approach:** Use agent if cause unknown, direct if obvious

**Agent approach (when debugging):**
1. Agent searches for date handling code
2. Identifies timezone issue in date comparison
3. Proposes fix with UTC normalization
4. Implements and tests

**Direct approach (when cause known):**
1. Fix the specific line causing issue
2. Test thoroughly
3. Commit fix

**Decision point:** If you can identify the bug location immediately, work directly. If investigation needed, use agent.

---

## Session End Protocol

### At 60% Context

1. **Complete current task** or reach safe stopping point
2. **Update Memory Bank** with session progress
3. **Commit changes** with descriptive message
4. **Inform user:** "Context at 60% - suggest new session for next feature"

### When Starting New Session

1. **Read Memory Bank** (all 3 files)
2. **Review recent commits** (`git log`)
3. **Check current state** (`git status`)
4. **Understand context** before starting work

---

## Best Practices Summary

1. **Always read Memory Bank at session start**
2. **Use agents for 3+ step tasks**
3. **Work directly for single-file changes**
4. **Create focused, testable commits**
5. **Update Memory Bank after completing work**
6. **Monitor context usage throughout session**
7. **Test before committing**
8. **Use parallel reads when gathering context**
9. **Delegate complex exploration to agents**
10. **Keep sessions focused on single goals**

---

## Anti-Patterns to Avoid

1. **Don't:** Read files one-by-one when they're independent
   **Do:** Use parallel Read calls

2. **Don't:** Update Memory Bank multiple times per session
   **Do:** Update once at the end with all changes

3. **Don't:** Start broad, unfocused work ("improve the app")
   **Do:** Define specific, measurable goals

4. **Don't:** Work directly on complex multi-file features
   **Do:** Use agents for exploration and implementation

5. **Don't:** Continue past 70% context on complex tasks
   **Do:** Complete current work and start fresh session

---

## Project-Specific Notes

### Supabase Patterns

- **Current auth:** sessionStorage (temporary)
- **Production auth:** Will use Supabase Auth
- **RLS policies:** Always include both user-specific AND temporary PUBLIC
- **Database client:** Import from `@/lib/supabase`

### Component Patterns

- **All pages:** 'use client' directive (Next.js App Router)
- **State management:** useState hooks, no external state library
- **Styling:** Tailwind CSS with teal theme (#208479)
- **Icons:** lucide-react library

### Data Flow

1. User interacts with UI
2. Event handler calls async function
3. Function uses Supabase client to query/mutate
4. Update local state on success
5. Display loading states during async operations
6. Handle errors with try/catch and user-friendly messages

---

*This protocol ensures efficient Claude Code sessions while maintaining code quality and project momentum.*
