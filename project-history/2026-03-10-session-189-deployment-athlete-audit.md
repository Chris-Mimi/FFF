# Session 189 — Deployment + Athlete Audit

**Date:** 2026-03-10
**AI:** Claude Opus 4.6

---

## Part 1: Production Deployment

### Vercel Setup
- Created Vercel account (Hobby/free tier) on percepto25 personal account
- Imported Chris-Mimi/FFF repo (had to make public temporarily — private org repos need Pro)
- Added all 15 environment variables
- `NEXT_PUBLIC_APP_URL` set to `https://app.the-forge-functional-fitness.de`

### Pre-Deploy Fixes
- **PlannerSection.tsx** — Fixed 3 `@typescript-eslint/no-explicit-any` errors + 2 unused vars
- **Next.js 15.5.4 → 15.5.12** — Patched CVE security vulnerability (Vercel blocked 15.5.4)
- **npm audit fix** — Patched ajv, bn.js, minimatch, qs vulnerabilities (Vercel blocked unpatched deps)

### Domain Setup
- Added `app.the-forge-functional-fitness.de` in Vercel
- Created CNAME record `app` → `563d5dc00d045c83.vercel-dns-017.com.` in Squarespace DNS
- SSL certificate auto-generated
- Repo made private again after Vercel connected

### Supabase Config
- Site URL updated to production domain
- Added production redirect URL `https://app.the-forge-functional-fitness.de/**`
- Kept localhost redirect for local dev

### Status
- Coach login: working
- Athlete login: working
- Auto-deploys on push: working

---

## Part 2: Athlete App Audit

### Findings
1. **Movement-results endpoint** — Uses `requireCoach` but endpoint is dead code (never called from app). No fix needed.
2. **Race conditions** — Check-then-act pattern in saveSectionResult could create duplicates on rapid saves
3. **No input validation** — Could log unrealistic values (999kg, negative reps)
4. **No save feedback** — Button didn't indicate saving state

### Fixes Applied
- **savingLogic.ts** — Replaced check-then-act with atomic `upsert` using `onConflict`
- **benchmark-results/route.ts** — Added weight (0-500kg), reps (0-10000), time format validation
- **lift-records/route.ts** — Added weight (0-500kg), reps (0-1000) validation
- **savingLogic.ts** — Added validation for reps, weight, rounds, calories, metres
- **AthletePageLogbookTab.tsx** — Added `isSaving` state, button shows "Saving..." and disables during save

### Migration Created (NOT YET APPLIED)
- `20260310000000_add_duplicate_prevention_constraints.sql`
- Adds unique indexes on `wod_section_results` and `benchmark_results`
- Cleans up existing duplicates first

---

## Outstanding Items

### MUST DO (Before athletes use app)
- ⏳ Run migration `20260310000000_add_duplicate_prevention_constraints.sql` in Supabase SQL Editor
- ⏳ **Phase 5: Stripe Live Mode** — Complete onboarding, create live products, set webhook
- ⏳ **Phase 6: Beta Testing** — Mark 4-5 testers, run checklist
- ⏳ Apply pending migration `20260304000000_add_performance_indexes.sql` (7 indexes)

### SHOULD DO (Before 100+ athletes)
- N+1 query optimization in logbook data loading
- Error recovery (retry logic for failed saves, preserve form data)
- Better empty states (no benchmarks, no feed activity)

### NICE TO HAVE
- Unsaved changes warning before leaving page
- Export logbook to PDF
- Undo/revert for recently saved results

---

## Files Changed
- `components/coach/analysis/PlannerSection.tsx` — lint fixes
- `package.json` / `package-lock.json` — Next.js upgrade + audit fixes
- `app/api/benchmark-results/route.ts` — input validation
- `app/api/lift-records/route.ts` — input validation
- `components/athlete/AthletePageLogbookTab.tsx` — save feedback (isSaving state)
- `utils/logbook/savingLogic.ts` — atomic upsert + input validation
- `supabase/migrations/20260310000000_add_duplicate_prevention_constraints.sql` — NEW
