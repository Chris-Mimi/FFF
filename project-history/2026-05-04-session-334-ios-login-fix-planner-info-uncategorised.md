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

## Files touched

| File | Change |
|:---|:---|
| `app/login/page.tsx` | 4× `router.push(...)` → `window.location.href = ...` post-`signInWithEmail` |
| `components/coach/analysis/PlannerSection.tsx` | Info button next to Track toggle; renders `UncategorizedExercises`; new `handleAssignFromUncategorized` handler |
| `components/coach/analysis/PlannerInfoModal.tsx` | NEW — static doc modal, 8 sections |
| `components/coach/analysis/UncategorizedExercises.tsx` | NEW — set-difference panel with per-row Move-to popover |

TS clean. Production build clean. Login fix committed and pushed separately as `fa0b862f`.

---

## Carry-over

- ⏳ iOS Safari login fix — awaiting confirmation from the affected athlete on his iPhone 16 Safari. If he still bounces, the next suspect is ITP cookie purge — would involve hardening cookie max-age / cookie name / cookie size on the Supabase client config.
- ✅ Planner Info modal + Uncategorised panel — shipped, ready for Chris to triage the unassigned movements over time.
