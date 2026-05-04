# Session 334 — iOS Safari login bounce fix + Planner Info modal + Uncategorised exercises panel

**Date:** 2026-05-04 (Opus 4.7)
**Triggers:** (1) Athlete on iPhone 16 Safari logged in fine last week, then this week landed straight back on `/login` after submitting credentials — no error, just bounce. (2) Chris asked for an info popup on the Planner because it's a powerful tool but easy to forget criteria after time away. (3) Same conversation: a "Movement Patterns group" populated with exercises not in any other group, so Chris can systematically assign them until empty.

---

## 1. iOS Safari login bounce — root cause and fix

### Symptom

iPhone 16 Safari. Login form accepts credentials. No error message. App appears to authenticate momentarily, then immediately returns to `/login`. Worked once last week, broken this week.

### Diagnosis (verified before fixing)

The auth setup uses `@supabase/ssr` correctly:
- `lib/supabase.ts` — `createBrowserClient` (cookie-based session)
- `middleware.ts` — `createServerClient`, refreshes session and gates non-public routes

Login flow at `app/login/page.tsx`:
1. `signInWithPassword` writes auth cookies via `document.cookie` on the browser client
2. `getUserRole()`
3. `router.push('/athlete')` — Next.js client-side navigation

The classic "logs in then bounces" pattern with this exact stack on iOS Safari is a **race between cookie flush and Next.js prefetch cache**:
- `router.push` triggers a soft navigation
- Next.js may serve the destination from the prefetch cache (rendered when he was unauthenticated → that prefetch contained a redirect to `/login`)
- iOS Safari is slower than Chrome to flush cookie writes; the middleware sees no session, sends another redirect to `/login`, the cached redirect wins

Once the user's browser purges the auth cookie via Safari ITP after 7 days, the same race fires on the next login. Hence "ok last week, broken this week".

### Fix

Replaced 4× `router.push(...)` post-login with `window.location.href = ...` in `app/login/page.tsx:43-74`. Forces a full page load → cookies guaranteed flushed → middleware sees fresh session → no prefetch cache.

Reset-password and register-member redirects to `/login` left alone — `/login` is in `publicPaths`, middleware doesn't gate it, so no race.

**Lesson promoted to landmines:** any future post-auth redirect (callback, magic-link, OAuth) should use `window.location.href`, not `router.push`. Logged in activeContext.

Shipped as commit `fa0b862f`, separately from the Planner work below, so the fix could deploy independently.

---

## 2. Planner Info modal — new component

Static doc modal at `components/coach/analysis/PlannerInfoModal.tsx`. 8 sections:

1. What the Planner is for (overview)
2. Adults / Kids & Teens toggle (shared patterns; toggle scopes coverage analysis only)
3. Planning grid — past weeks (coloured dots = coverage, click to drill in)
4. Planning grid — current & future weeks
5. Pattern staleness colours (green / yellow / red / grey)
6. Exercise picker — recency shading (teal / black / light grey / faint italic)
7. Auto-detection (text scan of WOD section content)
8. Uncategorised Exercises panel (the new triage queue below)

Triggered by an "i How it works" button next to the Track filter. FocusTrap + click-outside-to-close + Got-it footer.

---

## 3. Uncategorised Exercises panel

### Decision: separate panel, not pseudo-pattern

Two options considered:

| Model | Pro | Con |
|:---|:---|:---|
| Virtual pseudo-pattern at top of patterns list | Same UI Chris already uses | Special-case logic in PatternManager — read-only, no rename / delete / drag / thresholds |
| Separate collapsible panel below the planning grid | Honest about what it is — a triage queue, not a pattern | One extra UI section |

Picked the panel. The stated goal — "go through them and assign to a pattern until empty" — fits a temporary triage panel better than a permanent fake row. The panel can shrink to "All sorted ✓" and effectively disappear once Chris has assigned everything.

### Implementation

`components/coach/analysis/UncategorizedExercises.tsx`. Set-difference: every exercise minus those in any pattern's `exercise_ids`. Pre-Workout + Recovery & Stretching hidden by default; "Include warm-ups & stretches" checkbox to reveal. Categories sorted same as the picker, each collapsible.

Each row:
- Exercise display name on the left
- Teal **Move to →** button on the right
- Click → amber-bordered popover appears with chips for every pattern (colour dot + name) + Cancel
- Click a pattern chip → `movement_pattern_exercises` insert → toast → refresh patterns + analytics → exercise drops out of the panel

Empty state: green badge + "All sorted ✓" message.
Edge case: if Chris hasn't created any patterns yet, panel says "No patterns yet. Create one above before you can assign exercises here."

### Wire-up in PlannerSection

- Imports `Info` icon, `PlannerInfoModal`, `UncategorizedExercises`
- New state `infoOpen`
- New handler `handleAssignFromUncategorized(exerciseId, patternId)` — direct insert into `movement_pattern_exercises`, refresh, toast
- Track filter row gets the Info button on the right (justify-between)
- UncategorizedExercises rendered after PlanningGrid, before the picker dialog
- PlannerInfoModal rendered as a sibling at the end

---

## Process moments worth remembering

- **Diagnose-first on the login bug.** "Logs in then bounces" with `@supabase/ssr` + middleware on iOS Safari is a documented race; verified the actual auth wiring (browser client + middleware refresh + cookie chunking) before recommending the fix. Saved guessing wrong about ITP / private mode / cookie size as the cause.
- **Asked A vs B before building Uncategorised.** Two valid implementation models, very different code shapes. Asking saved building the wrong one. Per the established `feedback_ask_when_unsure.md` pattern: ambiguous request → one short question with options → cheaper than guessing.
- **Defaulted to excluding warmup/stretch.** They're not pattern material; including them would have buried the real triage signal. Toggle reveals them when needed. Avoids the "show everything by default → overwhelming list" failure mode.
- **Two-commit split.** Login fix and Planner additions are unrelated workstreams. Login fix shipped first (`fa0b862f`) so it could deploy fast for the affected athlete; Planner work batched into a second commit. Worth the extra status round-trip.

---

## 4. Tab rename + reorder

`/coach/analysis` page header renamed "Workout Analysis" → **"Planner"** (mobile + desktop). Tab bar reordered so **Planner is first**; default `activeTab` is now `'planner'` so the page lands on the Planner on open. Top-nav button label in `CoachHeader` updated from "Analysis" → "Planner" in both desktop and mobile layouts. Route `/coach/analysis` itself unchanged so existing bookmarks/links still work.

---

## 5. Statistics filter — show all exercises in selected category

Previously: clicking a category chip filtered the top-50 movement list down to exercises in that category — capped at 50 and only including exercises that actually appeared in workouts during the timeframe.

Now (`app/coach/analysis/page.tsx` `filteredTopExercises`):

- **No category selected** → top 50 from `allMovementFrequency` (unchanged default).
- **Category selected** → walk the full `exercises` library, keep every exercise in the selected categories, look up its programmed count from `allMovementFrequency` (defaulting to **0** for never-programmed). Sorted by count desc, then name asc. No 50-cap.

Result: filtered view surfaces `(0×)` exercises immediately so Chris can see which exercises in a category have never been touched in the timeframe — exactly the gap-analysis surface he wanted for programming.

---

## 6. Relative-usage dimming on Statistics chips

Goal: at-a-glance distinction between "well-programmed" / "rotating but underused" / "barely touched" — without the visual breaking down as the library matures.

### The iteration

The user's intuition was 10% / 30% breakpoints on % of max count in the view. First implementation used grey-only tiers — text-gray-400 italic for very-low and text-gray-700 for low, both against the page's `bg-gray-600` container. User reported chips were unreadable and only 2 visual differences came through. Second pass added dashed border + italic on the very-low tier. User pushed back: still only 2 distinct visuals (normal teal-bordered chips and the dashed-italic ones) — the middle tier blended into the top.

Root cause: the differentiator on the top tier was the **teal border**, on the bottom it was the **dashed border + italic**. The middle tier had only "absence of teal border" + slightly-grey text, which reads as a faint variation on either neighbour.

Final design uses traffic-light colour semantics so each tier carries an unambiguous accent:

| Tier | Threshold | Background | Text | Border |
|:---|:---|:---|:---|:---|
| Top (>30% of max) | dominant | amber-50 | amber-900 | amber solid |
| Middle (10–30%) | rotating | white | gray-900 | teal solid |
| Bottom (≤10%) | barely touched | gray-50 | gray-500 italic | gray dashed |

The user explicitly chose to put the amber palette on the **top** tier (the most-programmed) by asking for the visuals of top and middle tiers to be swapped after the first traffic-light layout. Reasoning he didn't state but I'd guess at: amber draws the eye, and what he wants to *avoid* programming repeatedly is the over-used heavy hitter — so visual prominence on the dominant tier acts as a "you're leaning on these" signal.

### Threshold caveat (logged for re-evaluation)

10% / 30% on `% of max` works when usage is fairly even (e.g. push-up family with one or two exercises at 8–12× and others at 2–4×). It can over-flag when one exercise dominates a category by 5×+ — then ≤30% of max sweeps in everything that isn't the heavy hitter, and the bottom tier loses signal.

Logged in `memory-bank-activeContext.md` as Next Immediate Step **0b** to revisit after 1–2 weeks of use. If categories with a dominant exercise look mostly-dim: bump to 20% / 50%, or switch to quantile-based ranking (bottom 25% of the ranked list dims regardless of values).

---

## Files touched

| File | Change |
|:---|:---|
| `app/login/page.tsx` | 4× `router.push(...)` → `window.location.href = ...` post-`signInWithEmail` |
| `app/coach/analysis/page.tsx` | Default tab `'planner'`; page header → "Planner"; tab bar Planner-first; `filteredTopExercises` rewrite to include 0-count exercises when filtering by category |
| `components/coach/CoachHeader.tsx` | Top-nav button label "Analysis" → "Planner" (desktop + mobile) |
| `components/coach/analysis/PlannerSection.tsx` | Info button next to Track toggle; renders `UncategorizedExercises`; new `handleAssignFromUncategorized` handler |
| `components/coach/analysis/StatisticsSection.tsx` | 3-tier traffic-light dimming on chips by `% of max count in view` |
| `components/coach/analysis/PlannerInfoModal.tsx` | NEW — static doc modal, 8 sections |
| `components/coach/analysis/UncategorizedExercises.tsx` | NEW — set-difference panel with per-row Move-to popover |

TS clean. Production build clean. Three commits: login fix (`fa0b862f`), Planner Info + Uncategorised (`bb80a85c`), session-close bundle (this commit) covering tab rename + Statistics.

---

## Carry-over

- ⏳ iOS Safari login fix — awaiting confirmation from the affected athlete on his iPhone 16 Safari. If he still bounces, the next suspect is ITP cookie purge — would involve hardening cookie max-age / cookie name / cookie size on the Supabase client config.
- ✅ Planner Info modal + Uncategorised panel — shipped, ready for Chris to triage the unassigned movements over time.
