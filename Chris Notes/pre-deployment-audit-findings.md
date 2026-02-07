# Pre-Deployment Audit Findings

**Date:** 2026-02-06
**Audited by:** Claude Opus 4.6 (3 parallel agents: Security, Performance, Production Readiness)

---

## CRITICAL (Must Fix Before Go-Live)

### 1. Unprotected Admin API Routes
**Impact:** Anyone can call admin-only endpoints without authentication.

| Route | What it does unprotected |
|:------|:------------------------|
| `/api/members/approve` | Approve member accounts |
| `/api/members/unapprove` | Unapprove members |
| `/api/members/block` | Block members |
| `/api/members/unblock` | Unblock members |
| `/api/members/athlete-subscription` | Grant/extend trials and subscriptions |
| `/api/sessions/generate-weekly` | Create weekly sessions |
| `/api/google/publish-workout` (POST/DELETE) | Publish/unpublish workouts to Google Calendar |

**Fix:** Add coach role verification to all admin routes.

---

### 2. Stripe Payment Routes Missing Auth
**Impact:** Attacker could create checkout sessions or access billing portal for any member.

| Route | Issue |
|:------|:------|
| `/api/stripe/create-checkout` | Accepts `memberId` from client without verifying caller |
| `/api/stripe/customer-portal` | Same issue |

**Fix:** Verify authenticated user ID matches the `memberId` being accessed.

---

### 3. Localhost Fallback in Stripe Routes
**Impact:** If `NEXT_PUBLIC_APP_URL` env var is missing in production, Stripe redirects point to `http://localhost:3000`.

| File | Line |
|:-----|:-----|
| `app/api/stripe/create-checkout/route.ts` | 81 |
| `app/api/stripe/customer-portal/route.ts` | 52 |

**Fix:** Make `NEXT_PUBLIC_APP_URL` required — throw error if missing.

---

### 4. No Error Boundaries
**Impact:** Any crash shows a white screen instead of a friendly error message.

- No `error.tsx` files found anywhere in the app directory
- Affects all pages: coach, athlete, member

**Fix:** Create `error.tsx` at app root and major segment levels.

---

## HIGH (Should Fix)

### 5. N+1 Query on Members Page
**Impact:** 50 members = 51 database queries instead of 1.

- File: `app/coach/members/page.tsx` (lines 141-160)
- Fetches `get_member_attendance_count` per member in a `Promise.all` loop

**Fix:** Create batch RPC function returning attendance for all members at once.

---

### 6. No middleware.ts
**Impact:** No centralized auth protection — each route must check auth individually.

**Fix:** Add Next.js middleware for route protection.

---

### 7. Debug Console.logs Everywhere
**Impact:** Leaks internal details in browser console. ~20+ instances.

| File | Count |
|:-----|:------|
| `app/coach/members/page.tsx` | 17 instances |
| `app/coach/athletes/page.tsx` | 8 instances |
| `lib/auth.ts` | 3 instances (logs auth attempts!) |
| `app/api/google/publish-workout/route.ts` | Multiple |
| `app/api/stripe/webhook/route.ts` | Multiple |

**Fix:** Remove all debug `console.log` statements.

---

### 8. Raw `<img>` Tags Instead of next/image
**Impact:** Missing lazy loading, responsive sizing, WebP conversion, CDN optimization.

Affected files (10+):
- `components/coach/WhiteboardGallery.tsx`
- `components/coach/WhiteboardUploadPanel.tsx`
- `app/coach/athletes/page.tsx`
- `components/athlete/AthletePageProfileTab.tsx`
- `components/athlete/AthletePagePhotosTab.tsx`
- `components/athlete/logbook/PhotoModal.tsx`
- `components/athlete/logbook/WhiteboardSection.tsx`

**Fix:** Replace with `next/image` component.

---

### 9. Viewport Metadata Warning
**Impact:** Next.js console warning on every page load.

- `viewport` configured inside `metadata` export instead of separate `viewport` export
- Warning: "Unsupported metadata viewport is configured in metadata export"

**Fix:** Move viewport to separate `export const viewport` in layout.tsx.

---

## MEDIUM (Nice to Fix)

### 10. No Security Headers
- `next.config.ts` has no CSP, X-Frame-Options, HSTS, X-Content-Type-Options
- **Fix:** Add headers via Next.js config or middleware

### 11. `.select('*')` Everywhere
- 10+ queries fetch all columns unnecessarily
- **Fix:** Specify only needed columns

### 12. Missing Database Indexes
- `benchmark_results.user_id`, `lift_records.user_id`, `workout_logs.user_id` not indexed
- **Fix:** Add indexes via SQL migration

### 13. Auto-Confirmed Emails
- Registration auto-confirms email — anyone can register with a fake email
- **Fix:** Send actual confirmation emails or add alternative verification

### 14. Error Details Exposed to Client
- Google Calendar route returns `(error as Error).message` to browser
- **Fix:** Log full error server-side, return generic message to client

### 15. Large Components (>1000 lines)
- `app/coach/athletes/page.tsx` (1,278 lines)
- `app/coach/benchmarks-lifts/page.tsx` (1,445 lines)
- `app/coach/members/page.tsx` (1,040 lines)
- **Fix:** Extract sub-components into separate files

---

## LOW / Cosmetic

### 16. No Favicon
- No `favicon.ico` in `/public/`
- **Fix:** Add gym logo as favicon

### 17. Missing OG/Meta Tags
- No Open Graph, Twitter card, or theme color
- **Fix:** Add to `app/layout.tsx` metadata export

---

## What's Already Good

- Stripe webhook signature verification is correct
- Google Calendar handles missing credentials gracefully
- Build scripts are production-ready
- Loading states and spinners are implemented
- Auth flow with Supabase works
- `.env.local` is in `.gitignore`

---

## Fix Progress

- [ ] #1 Admin API auth
- [ ] #2 Stripe route auth
- [ ] #3 Localhost fallback
- [ ] #4 Error boundaries
- [ ] #5 N+1 query
- [ ] #6 Middleware
- [ ] #7 Console.logs
- [ ] #8 next/image
- [ ] #9 Viewport metadata
- [ ] #10 Security headers
- [ ] #11 select('*')
- [ ] #12 DB indexes
- [ ] #13 Email confirmation
- [ ] #14 Error exposure
- [ ] #15 Large components
- [ ] #16 Favicon
- [ ] #17 Meta tags


COPIED FROM END OF LAST SESSION:
Completed This Session
New files created:
auth-api.ts — Server-side auth helpers (requireAuth, requireCoach, isAuthError)
auth-fetch.ts — Client-side authFetch wrapper that auto-includes auth headers
[pre-deployment-audit-findings.md](Chris Notes/pre-deployment-audit-findings.md) — Full audit findings
CRITICAL fixes applied:
Auth added to 9 admin API routes: approve, block, unapprove, unblock, athlete-subscription, generate-weekly, publish-workout (POST+DELETE), benchmark-results, movement-results
Auth added to whiteboard-photos POST/PATCH/DELETE (GET stays open for athletes)
Auth added to Stripe routes — create-checkout and customer-portal now require authenticated user
Localhost fallback removed — Both Stripe routes now throw if NEXT_PUBLIC_APP_URL is missing
Viewport metadata fixed — Moved from metadata to separate export const viewport
Frontend updated — All 13+ fetch calls across 6 files now use authFetch
Files modified (API routes):
app/api/members/approve/route.ts
app/api/members/block/route.ts
app/api/members/unapprove/route.ts
app/api/members/unblock/route.ts
app/api/members/athlete-subscription/route.ts
app/api/sessions/generate-weekly/route.ts
app/api/google/publish-workout/route.ts
app/api/benchmark-results/route.ts
app/api/movement-results/route.ts
app/api/whiteboard-photos/route.ts
app/api/stripe/create-checkout/route.ts
app/api/stripe/customer-portal/route.ts
Files modified (frontend):
app/layout.tsx (viewport fix)
app/coach/members/page.tsx (7 calls → authFetch)
app/coach/schedule/page.tsx (1 call → authFetch)
hooks/coach/useWorkoutModal.ts (2 calls → authFetch)
hooks/athlete/useBenchmarkManagement.ts (1 call → authFetch)
components/coach/WhiteboardUploadPanel.tsx (1 call → authFetch)
components/coach/WhiteboardGallery.tsx (2 calls → authFetch)
components/athlete/AthletePagePaymentTab.tsx (2 calls → authFetch)
Still Remaining (next session)
#	Task	Severity
1	Add error.tsx error boundaries	CRITICAL
2	Remove debug console.log statements (~30+)	HIGH
3	Add security headers to next.config.ts	MEDIUM
4	Stop exposing error details to client	MEDIUM
5	N+1 query fix on Members page	HIGH
6	Run npm run build to verify all changes compile	HIGH
Important: You should run npm run build at the start of next session to verify everything compiles before continuing. The NEXT_PUBLIC_APP_URL env var must be set in .env.local for the Stripe routes to work locally now.

Is it safe for me to trigger auto-compact here? We are at 90%
96%!
No — start a new session instead. At 96% there's not enough room left to do useful work after compaction.

All critical fixes are saved to disk. Next session priorities:

npm run build to verify changes compile
Add NEXT_PUBLIC_APP_URL=http://localhost:3000 to .env.local
Remaining items from [pre-deployment-audit-findings.md](Chris Notes/pre-deployment-audit-findings.md)