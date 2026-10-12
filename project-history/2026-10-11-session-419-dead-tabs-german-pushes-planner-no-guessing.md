# Session 419 — Dead tabs root cause, German pushes, Planner "no guessing" (2026-10-11→12, Opus 5.5)

## Shipped
| Commit | What |
|:---|:---|
| `108ae5f` | Muted Athletes filter no longer freezes the coach header tabs |
| `3408525` | Athlete pushes in German, times without seconds |
| `ecd63d5` | Planner counts a movement named beside a longer variant on the same line |
| this close | Detector: loose-match guess removed, singular/plural + closing-bracket fixes; audit script; flags to-do |

## 1. Jan Huelbig — "paid, nothing changed"
In-app 10-card purchase via Apple Pay. DB: card untouched (cash card 18.09, 10/10, no archive). Webhook healthy (3 Stripe cards issued 05–08.10); dry-run of his renewal clean. Stripe showed red **Blocked** — "too high risk… independently of your Radar configuration", failure code `card_declined` = Stripe's own platform block, no charge. Advice: one retry typing the card number, else cash + Close & Issue New. Pending Jan.

## 2. Dead coach tabs — the "stale login" diagnosis was wrong
Recurred 12.10; Chris left the state intact. Evidence: typed `/coach/members` loads (server accepts login); the tab click's request returns normally (304 + page script); console clean. Cause: [app/coach/page.tsx](../app/coach/page.tsx) passed `athletesMuted ? [] : selectedMembers` — a fresh array each render — into `useCoachData`, whose search effect set new empty state every render → endless silent re-render → `router.push` (a transition) never committed. `coach_selected_athletes_muted` is in localStorage, so it survived hard refresh, was cured by clearing site data, and never happened in Incognito. Introduced by the S397 mute feature; first freeze S398. Confirmed: unmute instantly released a queued click. The S398 cookie theory and S400 middleware self-heal targeted the wrong cause. Surfshark VPN irrelevant.

## 3. German pushes
11 athlete pushes translated in [lib/notifications.ts](../lib/notifications.ts); bodies avoid "du" (a child's push goes to the parent). Verify from `notification_log`.

## 4. Planner detection
- **Bench Press showed 22.07 not 16.09:** the longest-match filter dropped a short name whenever a longer one containing it was on the line. Now per position. 22 sessions gained a movement, none lost.
- **Audit** (`scripts/audit-movement-false-flags.ts`): runs the extractor line by line over every distinct workout text and lists credits without solid evidence. Three causes: loose-match guess, library name inside a longer phrase, sentences.
- **"No guessing" (Chris):** removed the reverse-substring guess in `findMatchingExercise`. The old-vs-new diff exposed two things the guess had been hiding: singular text vs plural library name ("Deep Squat Knee Circle", 33 workouts) and names ending in a bracket being truncated ("DB Deadlift (unilateral)"). Both fixed. Final diff over 464 distinct workouts: 63 credits removed in 40 workouts (29 in 11 D&D), 2 added (D&D).
- Backlog for Chris: [memory-bank/planner-false-flags-todo.md](../memory-bank/planner-false-flags-todo.md).

## Decisions
- Sentence rule ("names inside sentences don't count") — **declined**; Chris rewords or uses abbreviations (never read from text).
- Wellpass "Link member" button — **declined**; Claude links directly and offers it unprompted.
- All S418 / S416 / S415 live checks confirmed OK.

## Lessons
- "Survives hard refresh, cured by clearing site data, fine in Incognito" = saved browser state, not login. Ask for a typed sub-page address first.
- Never pass a fresh `[]` / `{}` into a hook whose effect depends on it.
- I first proposed a rule that would not have caught Chris's own example sentence — check a proposal against the user's real case before pitching it.
- My first before/after for the guess removal missed the per-line view; the wod-level diff alone hid why "Deadlift" appeared.
