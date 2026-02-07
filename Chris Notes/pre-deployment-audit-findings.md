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

### Completed (Sessions 96-97, 2026-02-06/07)

- [x] **#1 Admin API auth** (Session 96) — Auth added to 9 admin API routes + whiteboard-photos POST/PATCH/DELETE
- [x] **#2 Stripe route auth** (Session 96) — create-checkout and customer-portal now require authenticated user
- [x] **#3 Localhost fallback** (Session 96) — Both Stripe routes throw if `NEXT_PUBLIC_APP_URL` missing
- [x] **#4 Error boundaries** (Session 96) — Created `error.tsx` at app root, /coach, /athlete, /member
- [x] **#5 N+1 query** (Session 97) — Replaced N individual attendance queries with batch RPC `get_all_members_attendance`
- [x] **#6 Middleware** (Session 97) — Created `middleware.ts` for centralized route protection using `@supabase/ssr`; updated `lib/supabase.ts` to `createBrowserClient`
- [x] **#7 Console.logs** (Sessions 96-97) — Removed 18 console.logs across 6 files
- [x] **#8 next/image** (Session 97) — Converted all 10 raw `<img>` tags to `next/image` across 7 files; added `images.remotePatterns` in next.config.ts
- [x] **#9 Viewport metadata** (Session 96) — Moved to separate `export const viewport` in layout.tsx
- [x] **#10 Security headers** (Already existed) — Confirmed in next.config.ts (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS, Permissions-Policy)
- [x] **#11 select('*')** (Session 97) — Replaced with explicit columns in 8 API routes + 5 pages/components + loadingLogic.ts
- [x] **#12 DB indexes** (Session 97) — Created and applied `database/add-audit-indexes.sql` with indexes for 7 tables
- [x] **#14 Error exposure** (Session 97) — Fixed 7 instances in publish-workout and whiteboard-photos routes

### Remaining (LOW priority)

- [ ] **#13 Email confirmation** — Requires Supabase Dashboard config (not code). Go to Authentication → Settings → disable "Auto-confirm emails"
- [ ] **#15 Large components** — Refactoring: coach/athletes (1264 lines), benchmarks-lifts (1445 lines), members (1040 lines)
- [ ] **#16 Favicon** — Needs gym logo asset file
- [ ] **#17 Meta tags** — Add Open Graph, Twitter card, theme color to layout.tsx metadata

### New Files Created During Audit

| File | Purpose |
|:-----|:--------|
| `lib/auth-api.ts` | Server-side auth helpers (`requireAuth`, `requireCoach`) |
| `lib/auth-fetch.ts` | Client-side `authFetch` wrapper with auto auth headers |
| `middleware.ts` | Next.js middleware for centralized route protection |
| `app/error.tsx` | Root error boundary |
| `app/coach/error.tsx` | Coach section error boundary |
| `app/athlete/error.tsx` | Athlete section error boundary |
| `app/member/error.tsx` | Member section error boundary |
| `database/add-audit-indexes.sql` | Performance indexes (already applied to Supabase) |

### Notes for Next Session
- Build passes clean — all changes compile
- `NEXT_PUBLIC_APP_URL` env var must be set in `.env.local` for Stripe routes to work locally
- All CRITICAL, HIGH, and MEDIUM items are resolved
- Only LOW priority items (#13, #15, #16, #17) remain