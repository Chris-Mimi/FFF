---
name: No silent bulk writes
description: Never write code that silently modifies database records beyond the one the user is editing — always flag and get approval
type: feedback
---

Never add code that silently updates/overwrites database records the user didn't explicitly open or edit. Especially not on a common action like "save."

**Why:** Session 240 incident — a "sync sibling WODs" feature matched by `session_type + date` and overwrote ALL workouts of that type on a given date whenever any one was saved. Different class times can have completely different workouts. Chris's 10:00, 11:00, 17:15 workouts were all overwritten with the 18:30 content.

**How to apply:**
- Before implementing any write that affects records beyond the one being edited, explain the blast radius and ask for explicit approval
- Never assume data relationships (e.g., "same type + date = same workout") without verifying with Chris
- If a fix requires syncing or bulk-updating, present the matching criteria and ask: "Would this ever match records that SHOULDN'T be changed?"
- Prefer read-side solutions (smarter queries, better dedup) over write-side solutions (syncing data) when possible
