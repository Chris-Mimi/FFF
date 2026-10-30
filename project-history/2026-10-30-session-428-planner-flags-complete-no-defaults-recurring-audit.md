# Session 428 — Planner flags project complete: batch 2, no generic translations, recurring audit (2026-10-30, Opus 5.5, Mac)

## Shipped
| Commit | What |
|:---|:---|
| `1626963` | S427 closed retroactively from git history (project-history file + activeContext) |
| `d950fc5` | Section F batch 2 applied — 33 wods, 5 new library entries |
| `6a4fb92` | `genericToCanonical` removed from `utils/movement-extraction.ts`; 30 Jul "Walking Lunges" → "Lunge Walking" |
| `e3339fc` | Planner audit becomes recurring every 3 months |
| `e83c759` | `scripts/audit-movement-false-flags.ts` gets `--uncounted` + `--since`; Athlete 2 Skierg fix; 3 library names trimmed |
| `0ad868b` | D&D left alone like Turnen — project complete |

## 1. S427 close
- S427 committed its work but never wrote a history file / activeContext. Closed from the 3 commits + the S427 section of `planner-false-flags-todo.md` — no need to go back to the old chat.
- 7 Oct 17:15 + 18:30 "Pendlay Rows" Intro notes: Chris had already deleted them.

## 2. Section F batch 2 (F26–F97)
- Lookup per line: workouts still holding it, what the Planner credits, library candidates. 6 lines already fixed in S427; most of the rest were cues / structure / shorthand.
- Applied (Chris "1–15 OK"): Ring M-Up Drill: Hips to Rings · C2 SkiErg · Push-Up Bottom Position Hold · Sled Pull/Drag · Barbell Hand To Hand Rotations · Pull-up Scapular · KB Flat Back Pullover · DB Biceps Curl · Active Supine Piriformis · Swiss Ball → Stability Ball (6 lines) · Parallettes Tuck Hold · Rings Hang · C2 SkiErg 400m · BMU Drill: Hip Pop to Wall (8 classes) · Bear Crawl Slamball Push/Roll.
- "DB OHP" → **DB Strict OH Press** (already in the library — no new entry).
- New library: Split Hold, Headstand (text "Head Stand" → "Headstand"), Dip Squat (also counts 27/28 Apr + 4 May now), 3-Point Jump (text "3-point-jump" renamed), Cartwheel. Split Hold + 3-Point Jump have no description — meaning not verified, Chris to fill in.
- Left (my picks, Chris agreed): Wrist Warm-Up on the floor, Weight plate pull, FitKids games.
- Dry run first, Planner lost nothing; backup taken before writing.

## 3. Generic translations removed
- I recommended keeping the last 5 active ones (KB Swing → American, Double-Unders → Jump Rope DUs, Walking Lunge → Lunge Walking, Knees to Elbows, Back Extension → GHD) because they match S149 naming rules. **Chris: "all of those translations wouldn't be necessary if the exercises were written correctly in the first place."**
- Check showed only ONE line depended on them. The barbell / Muscle-up entries were already dead (their "Barbell …" targets don't exist in the library).
- Removed the whole map + its 4 lookups. Old-vs-new across all 671 wods (lifts included): 0 differ.

## 4. Recurring audit + tooling
- Chris: audit at regular intervals. Suggested 6 months; I recommended 3 (≈65 new workouts per round instead of ≈130). Next due end Jan 2027.
- `--uncounted` = the S426 Section F scan, now in the audit script (lead regex, filler words, shorthand rule against the WOD's own credits, grouped by text). `--since` limits to classes from a date. Full run after S428 = 51 texts, all accepted leave-items.
- Building it found: "Athlete 2: Skierg" (missed in batch 2) and **library display names with stray spaces** — "Supine Pigeon Piriformis " never matched its text (7 + 12 Oct). Trimmed 3 names.
- D&D: Chris chose to leave it, like Turnen. Rule added to `claude-rules.md`.

## Lessons
- **A library name with a leading/trailing space can never be matched** — check display names when a correctly written movement isn't counted.
- **Before recommending to keep a code default, count what depends on it** — 1 line, so the "keep" case was weak.
- **A needle that matches only one of a pair (Athlete 1 / Athlete 2) misses the twin** — search by the movement word, not the whole line.
