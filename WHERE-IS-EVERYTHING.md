# Where is everything?

A map of the documentation in this repository. If you're trying to find something and don't know where to look, start here.

> Last updated: 2026-05-13 (S349). If you reorganize folders, update this file.

---

## TL;DR — "I want to find..."

| You want to find... | Look in... |
|:---|:---|
| A guide for athletes / coaches using the deployed app | [Chris Notes/Forge app documentation/](Chris%20Notes/Forge%20app%20documentation/) |
| A workflow checklist (session-start, session-close, mid-session) | [Chris Notes/AA frequently used files/](Chris%20Notes/AA%20frequently%20used%20files/) |
| What was worked on this week / last session | [memory-bank/activeContext.md](memory-bank/activeContext.md) |
| What was worked on months ago | [project-history/](project-history/) (one file per session, dated) |
| How the app handles data growth + the kitchen/dining-room analogy | [memory-bank/database-and-growth.md](memory-bank/database-and-growth.md) |
| Hard rules Claude follows across sessions | [memory-bank/claude-rules.md](memory-bank/claude-rules.md) |
| Database backup / restore commands | [Chris Notes/AA frequently used files/DATABASE-BACKUP-GUIDE.md](Chris%20Notes/AA%20frequently%20used%20files/DATABASE-BACKUP-GUIDE.md) |
| Git commands and workflow help | [Chris Notes/Workflow & Git/](Chris%20Notes/Workflow%20%26%20Git/) |
| Deployment plans / cost estimates | [Chris Notes/Deployment/](Chris%20Notes/Deployment/) |
| Older one-shot docs / handoff notes from 2025 | [Chris Notes/Archive/](Chris%20Notes/Archive/) |
| App project plan from Mimi | [Chris Notes/Plan from Mimi Claude.md](Chris%20Notes/Plan%20from%20Mimi%20Claude.md) |
| Workout examples | [Chris Notes/Workout examples.md](Chris%20Notes/Workout%20examples.md) |

---

## The four documentation locations

### 📁 Project root — **just the essentials**

Three files only:
- `README.md` — public-facing repo intro
- `CLAUDE.md` — Claude's project-context summary (auto-loaded at every session start)
- `LICENSE` — the license

Everything else at root is code, config, or auto-generated. Older `.md` files that used to live here have been moved to `Chris Notes/Archive/historical root docs/`.

### 📁 `memory-bank/` — **Claude's persistent memory**

Claude reads these files at session start to know the state of the project. **Chris-readable, Claude-readable.**

| File | What it is |
|:---|:---|
| [activeContext.md](memory-bank/activeContext.md) | The last 5 sessions, current open issues, next steps, landmines. The "what's going on right now" doc. |
| [claude-rules.md](memory-bank/claude-rules.md) | Durable hard rules promoted from past incidents (e.g. "never `.from(big_table).select()` without a filter"). What Claude *must* follow. |
| [database-and-growth.md](memory-bank/database-and-growth.md) | Reference playbook for how the app scales as data grows. Kitchen/dining-room analogy, decision tree, 7-category scaling map. Read on demand when a scaling question comes up. |
| [techContext.md](memory-bank/techContext.md) | Tech stack, environment variables, core configuration. |
| [systemPatterns.md](memory-bank/systemPatterns.md) | Code conventions and patterns used across the project. |
| [workflow-protocols.md](memory-bank/workflow-protocols.md) | Token efficiency rules, agent delegation guidance. |
| [historical-features.md](memory-bank/historical-features.md) | Older feature history that's been rotated out of activeContext. |

### 📁 `Chris Notes/` — **Chris's personal notes and references**

The user-facing documentation. Organized by topic.

| Subfolder | What's in it |
|:---|:---|
| `AA frequently used files/` | Session-start prompt, session-close checklist, handoff prompt, git cheatsheet, database backup guide. The `AA` prefix sorts it to the top alphabetically. |
| `Forge app documentation/` | User-facing guides for athletes & coaches (Athlete Guide, Feature Overview, login recovery runbook). |
| `Workflow & Git/` | Git workflow guides, code navigation tips, working-with-Cline workflow. |
| `Database & Supabase/` | Supabase admin cheatsheets, orphan-check queries, backup commands. |
| `Deployment/` | Deployment plan, cost estimates, Stripe fees. |
| `Planning/` | Planning docs for features (backfill plans, unified movement system plan, etc.). |
| `Chat GPT help & explanations/` | Helpful prompts from past Chat-GPT conversations. |
| `Archive/` | Older docs no longer in active use — kept for reference. Includes `historical root docs/` for the .md files that used to clutter the project root. |

Plus three loose files at the Chris Notes root:
- `Plan from Mimi Claude.md`
- `Workout examples.md`
- `Exercise_Categories_Refined.md`

### 📁 `project-history/` — **session-by-session ship logs**

One markdown file per coding session, named `YYYY-MM-DD-session-NNN-short-description.md`. Each documents what was built/fixed in that session.

When `memory-bank/activeContext.md` rotates a session out of its "Last 5 Sessions" view, the full detail lives here. **Don't edit these — they're historical records.**

`project-history/lessons-learned.md` is a meta-doc accumulating recurring lessons across sessions.

---

## How they relate

```
                ┌──────────────────────────────────────────────┐
                │  README.md │ CLAUDE.md │ LICENSE  (root)     │
                └────────────┬─────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────────────┐
        ▼                    ▼                            ▼
┌──────────────────┐ ┌──────────────────┐ ┌────────────────────────────┐
│  memory-bank/    │ │  Chris Notes/    │ │  project-history/          │
│                  │ │                  │ │                            │
│  Claude reads    │ │  Chris's user-   │ │  Historical session logs.  │
│  on session      │ │  facing docs.    │ │  One file per session.     │
│  start.          │ │                  │ │  Read-only.                │
│                  │ │  Both audiences  │ │                            │
│  Both audiences. │ │  occasionally.   │ │  Both audiences (rarely).  │
└──────────────────┘ └──────────────────┘ └────────────────────────────┘
```

---

## Conventions

- **Filenames:** lowercase-with-hyphens for the technical docs in `memory-bank/`. Title Case for Chris Notes (since they're personal).
- **Dating:** project-history files use `YYYY-MM-DD-session-NNN-...` so they sort chronologically.
- **What goes in `memory-bank/` vs `Chris Notes/`:** if Claude needs it at session start, it's `memory-bank/`. If only Chris references it (workflow, deployment, gym-specific docs), it's `Chris Notes/`. If both, put it in `memory-bank/` and link to it from a Chris Notes index.
- **Archiving:** when a doc stops being relevant, move it to `Chris Notes/Archive/<topic>/`. Don't delete unless certain it's obsolete (git history keeps it anyway).
