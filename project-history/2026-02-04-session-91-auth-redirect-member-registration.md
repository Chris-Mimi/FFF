# Session 91: Auth Redirect & Member Registration Fixes
**Date:** 2026-02-04
**Agent:** Opus 4.5
**Status:** ✅ Complete (testing paused mid-flow)

## Overview
Fixed critical auth flow issues discovered during testing: root page was a dead-end for email confirmation links, member registration had email confirmation problems, and login page showed unhelpful errors for pending members.

## Changes Made

### 1. Root Page Auth Redirect
**File:** `app/page.tsx`
- **Before:** Default Next.js template (dead-end for email confirmation links)
- **After:** Client component that processes Supabase hash tokens and redirects to /login
- Signs out any auto-created session from email confirmation
- Shows branded loading spinner during processing
- 3-second fallback timeout redirects to /login

### 2. Member Registration Email Confirmation Fix
**File:** `app/api/members/register/route.ts`
- **Issue:** `email_confirm: true` in `admin.createUser()` was unreliable — email remained unconfirmed
- **Fix:** Added explicit `admin.updateUserById()` call after user creation to confirm email
- Prevents "email not confirmed" error when members try to log in

### 3. Login Page Pending Member Handling
**File:** `app/login/page.tsx`
- **Issue 1:** Members with pending status saw "email not confirmed" (Supabase error) instead of "pending approval"
- **Fix:** Intercept "email not confirmed" errors, check members table for status, show appropriate message
- **Issue 2:** Navigation cascade when signing out pending members caused 4 popup dialogs
- **Fix:** Call `signOut()` without await, set loading=false immediately, return early
- **Issue 3:** Login hung on "Signing in..." spinner
- **Fix:** Replaced dynamic `await import('@/lib/supabase')` with top-level import
- Added top-level `import { supabase } from '@/lib/supabase'`

## Member Registration Flow (Verified Working)
1. User visits `/auth/register-member` → fills form → submits
2. Success message: "Registration Submitted! A coach will review your request"
3. Auto-redirects to `/login` (via root page `/`)
4. Login attempt → "Your account is pending approval. Please wait for coach approval."
5. No confirmation email sent (coach approval IS the gatekeeper)

## Files Modified
1. `app/page.tsx` — Complete rewrite (server → client component)
2. `app/api/members/register/route.ts` — Added explicit email confirmation
3. `app/login/page.tsx` — Pending member error handling, import fix

## Testing Status
- ✅ Member registration form works
- ✅ Success message and redirect works
- ✅ "Pending approval" error message shows correctly
- ✅ No popup dialog cascade
- ⏳ Coach approval → login redirect (next session)
- ⏳ Access tiers testing (next session)
- ⏳ Start Trial testing (next session)
- ⏳ Stripe payments testing (next session)

## Key Technical Details

### Why No Confirmation Email?
The `/auth/register-member` flow uses `admin.createUser()` with auto-confirmed email. Coach approval is the gatekeeper — adding email confirmation would be redundant friction.

### signOut() Without Await
Calling `await signOut()` caused a navigation cascade: sign-out triggered auth state changes, which triggered root page's `onAuthStateChange`, which tried to redirect, creating multiple navigation events and popup dialogs. Fire-and-forget `signOut()` prevents this.

### Dynamic Import Hang
`await import('@/lib/supabase')` inside the login handler caused the page to hang on "Signing in...". Replacing with a top-level import resolved it. Root cause likely related to Next.js module resolution during an async handler.

## Test Account
- **Email:** chris@the-forge-functional-fitness.de
- **Status:** pending (in members table)
- **Role:** member (in auth.users user_metadata)
- **Next step:** Approve via Coach Members page, then verify login redirects to /member/book

## Next Session (92) — Resume Testing
1. Approve test member via Coach Members page
2. Verify login redirects to /member/book
3. Test access tiers (greyed tabs for non-paying members)
4. Test Start Trial (coach grants 30-day trial)
5. Test Stripe payments end-to-end

---

**Duration:** ~45 minutes
**Commits:** Pending
**Status:** Ready for continued testing
