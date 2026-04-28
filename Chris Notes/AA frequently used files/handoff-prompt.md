# Session Handoff Prompt

Paste this verbatim to Claude when context hits ~70%. Do NOT start new work after pasting — only let Claude finish the handoff, commit, and stop.

---

## Prompt to paste

> Prepare handoff as S{NUMBER}. Cover:
>
> 1. **What's done this session** — list every commit (hash + subject) and every uncommitted file with a one-line description of the change.
> 2. **What's in-flight** — anything started but not finished, and exactly where I stopped (file:line if possible).
> 3. **Decisions made + rejected alternatives** — for any non-trivial choice, record *why* we picked X over Y so future-Claude doesn't undo it.
> 4. **Open questions you asked me that I haven't answered yet** — verbatim.
> 5. **Landmines** — anything that will bite next session if forgotten: migrations not run, tests not run, stale caches, manual dashboard config, live tests pending, uncommitted state.
> 6. **Feedback Chris gave mid-session** — corrections, pushback, preferences — so it survives to memory.
> 7. **Next concrete action** — the very first thing next-session-Claude should do.
> 8. **Files to open first** — ranked, with line numbers if relevant.
>
> Write it to `memory-bank/handoff.md` (overwrite — only one in-flight handoff at a time). Then read it back and flag anything vague, missing, or that assumes context you have but the next session won't. Then stop — do not start new work, do not update memory bank (that happens next session). **Do NOT touch `Chris Notes/AA frequently used files/Notes for next session.md` — that's Chris's personal notepad.**

---

## Why this works

- Forces externalization of working memory before compaction loses it.
- The "read it back and flag gaps" step catches omissions — Claude is better at critiquing written text than at remembering what it forgot.
- Explicit numbered scope stops Claude from writing a vague narrative summary.
- Stopping before memory-bank update matches the CLAUDE.md 70% protocol (memory bank updates happen in the fresh session, not the bloated one).

## When to paste

- **50-60% context:** note only, no action needed.
- **60-70% context:** consider wrapping current task, then paste.
- **70% context:** paste immediately. Do not start new work.
- **80%+:** critical — paste and close the session even if mid-task.

## After pasting

1. Verify `memory-bank/handoff.md` is written and covers the 8 points.
2. Commit any safe-to-commit uncommitted work (ask Claude which files).
3. Close the session.
4. Next session: paste a short "continue from handoff" prompt; Claude reads memory bank + `memory-bank/handoff.md` and picks up.
