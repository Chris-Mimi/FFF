# Active Context

**Version:** 10.50
**Updated:** 2026-02-06 (Session 95 - Backup Auto-Discovery, Google Calendar Types, Class Type Colors)

---

## ⚠️ CRITICAL RULES

| Rule | Detail |
|:---|:---|
| **Mandate** | Read `memory-bank/workflow-protocols.md` BEFORE any work |
| **Database Safety** | Run `npm run backup` BEFORE any migration or risky change |
| **Agent Use** | Use Agent for 3+ step tasks, multi-file changes, bug investigations |
| **Efficiency** | Target: Keep sessions under 50% context usage |
| **Context Monitoring** | 50%/60%/70%: Alert. 80%: STOP, finish current task, ask for Memory Bank update |

---

## 🎯 Project Overview

**Goal:** CrossFit gym management app with WOD creation, analysis, member booking system, and athlete performance tracking.

**Tech Stack:**
- Next.js 15 App Router + TypeScript + Tailwind
- Supabase (PostgreSQL) with RLS enabled
- Supabase Auth (signup/login/logout)
- Recharts for progress visualization
- Metric units enforced (kg, cm, meters)

---

## 🗄️ Data Models (Core Schema)

```
Users (Supabase Auth)
├─ auth.users (id, email)

Coach Tables
├─ wods (id, date, session_type: TEXT, workout_name: TEXT, workout_week: TEXT, sections: JSONB [content, lifts[], benchmarks[], forge_benchmarks[], scoring_fields], is_published, publish_time, publish_sections, publish_duration, google_event_id, coach_notes: TEXT, title: TEXT [DEPRECATED - use session_type])
├─ section_types (id, name, display_order)
├─ workout_types (id, name)
├─ workout_titles (id, title)
├─ exercises (id, name [UNIQUE], display_name, category, subcategory, equipment[], body_parts[], difficulty, is_warmup, is_stretch, search_terms, search_vector [GIN indexed])
├─ user_exercise_favorites (id, user_id, exercise_id, created_at [UNIQUE user_id + exercise_id])
├─ naming_conventions (id, category [equipment|movementTypes|anatomicalTerms|movementPatterns], abbr, full_name, notes)
├─ resources (id, name, description, url, category)
├─ tracks (id, name, description, color)
├─ weekly_sessions (id, date, time, workout_id, capacity, status)
├─ benchmark_workouts (id, name, type, description, display_order, has_scaling)
├─ forge_benchmarks (id, name, type, description, display_order, has_scaling)
├─ barbell_lifts (id, name, category, display_order)
├─ programming_notes (id, user_id, title, content [markdown], folder_id, created_at, updated_at)
├─ note_folders (id, user_id, name, display_order, created_at, updated_at)

Member Tables
├─ members (id, email, name, status, membership_types[], account_type: primary|family_member, primary_member_id, display_name, date_of_birth, relationship, class_types[] [ekt|t|cfk|cft])
├─ bookings (id, session_id, member_id, status: confirmed|waitlist|cancelled|no_show|late_cancel)

Athlete Tables (linked to members.id)
├─ athlete_profiles (id, user_id, full_name, emergency_contact)
├─ workout_logs (id, user_id, wod_id, result, notes)
├─ benchmark_results (id, user_id, benchmark_id, forge_benchmark_id [XOR], benchmark_name, benchmark_type, result_value, scaling_level, result_date)
├─ lift_records (id, user_id, lift_name, weight_kg, reps, rep_max_type ['1RM'|'3RM'|'5RM'|'10RM'], rep_scheme [workout patterns], calculated_1rm, notes, lift_date)
├─ wod_section_results (id, user_id, wod_id, section_id, workout_date, time_result, reps_result, weight_result, scaling_level, rounds_result, calories_result, metres_result, task_completed)
```

**Workout Naming System (Session 49/50/52):**
- `wods.session_type` - Replaces title (WOD, Foundations, Kids & Teens, etc.)
- `wods.workout_name` - Optional name for tracking repeated workouts (e.g., "Overhead Fest", "Fran")
- `wods.workout_week` - ISO week format YYYY-Www (e.g., "2025-W50"), auto-calculated from date
- Unique workout identifier: `workout_name + workout_week` (NULL workout_name falls back to date)
- Index: `idx_wods_workout_name_week` on (workout_name, workout_week)
- **ISO Week Calculation:** UTC-based to match PostgreSQL (Jan 4 always in Week 1, Thursday determines week)

---

## 📍 Current Status (Last 2 Weeks)

**Completed (2026-02-06 Session 95 - Opus 4.6):**
- **✅ Backup Script Auto-Discovery:**
  - Backup now auto-discovers all tables via `get_public_tables()` RPC function
  - Falls back to hardcoded list if RPC not available
  - Alerts when new tables found that aren't in known list
  - Added missing `subscriptions` table to backup
  - Requires SQL function in Supabase: `CREATE FUNCTION get_public_tables()` (see session history)
  - File: scripts/backup-critical-data.ts
- **✅ Google Calendar Workout Type Display:**
  - Workout type (AMRAP, For Time, etc.) now shows in Google Calendar event descriptions
  - Looks up workout_type_id from workout_types table
  - Format: **Workout - AMRAP** 15 mins (1-15)
  - No change if section has no workout type selected
  - File: app/api/google/publish-workout/route.ts
- **✅ Class Type Button Color Fix (Tailwind Safelist):**
  - Added safelist to tailwind.config.ts for dynamically-referenced colors
  - Fixed: bg-indigo-600, bg-violet-600, bg-cyan-600, bg-rose-600
  - Colors were being purged by Tailwind JIT as they only appeared in JS objects
  - File: tailwind.config.ts
- **✅ Class Type Label Change:**
  - Renamed "T" (Turnen) display label to "Tu" for clarity
  - Database key remains `t` unchanged
  - File: app/coach/members/page.tsx
- **✅ Coach Email Confirmation:**
  - Confirmed mimi.hiles@web.de email in Supabase Auth (was blocking login)
- **✅ Deployment Cost Estimate:**
  - Created Chris Notes/deployment-cost-estimate.md
  - Production: ~€74/month (Supabase Pro €25 + Stripe fees ~€47.50 + domain ~€1.50)
- See: `project-history/2026-02-06-session-95-backup-autodiscovery-calendar-types.md`

**Completed (2026-02-06 Session 94 - Sonnet 4.5):**
- **✅ Kids Programs Class Type System:**
  - Database: Added `class_types TEXT[]` column to members table (allows multiple selections)
  - Class types: EKT (Elternkind Turnen), T (Turnen), CFK (CrossFit Kids), CFT (CrossFit Teens)
  - Class type buttons on member cards (only for kids <16)
  - Class type filter buttons (only visible when kids age filter selected)
  - Multiple class types can be selected per member (toggle on/off)
  - Files: database/add-class-type.sql, app/coach/members/page.tsx
- **✅ Enhanced Age Filtering for Kids Programs:**
  - Added age range filters: <7, 7-11, 12-16, 7-16 (in addition to Kids <16, Adults, All)
  - Age filter dropdown reordered: All, Adults, Kids (<16), 12-16, 7-16, 7-11, <7
  - All kids filters restrict membership buttons to Mb/10/Wp only
  - All kids filters show class type filter buttons
  - File: app/coach/members/page.tsx
- **✅ Age Filter Bug Fix:**
  - Fixed >7 filter to <7 (user correction)
  - File: app/coach/members/page.tsx
- See: `project-history/2026-02-06-session-94-kids-class-filtering.md`

**Completed (2026-02-05 Session 93 - Opus 4.5):**
- **✅ Coach Athletes Page - Mobile Optimization:**
  - Payments tab: Adjusted padding, text sizes, spacing for mobile
  - Shortened button text ("Save" → "Save", "Reset to 0" → "Reset")
  - Shortened labels ("Total", "Used", "Expiry")
  - File: app/coach/athletes/page.tsx (PaymentsSection)
- **✅ Coach Athletes Page - Tabs Overflow Fix:**
  - Added `overflow-x-auto` and `min-w-max` to tab nav
  - Hidden icons on mobile (`hidden md:block`)
  - Shortened tab labels ("Bench", "Lifts", "Log", "Pay")
  - File: app/coach/athletes/page.tsx (lines 218-267)
- **✅ Delete Duplicates SQL Bug Fix:**
  - Original SQL only partitioned by `email`, deleting family members who share same email
  - Fixed: Now partitions by BOTH `email` AND `full_name`
  - Created cheatsheet: Chris Notes/supabase-delete-cheatsheet.md
- **✅ Family Member Payment Data Fix:**
  - Family members have no email in athlete_profiles, causing "Athlete email not found" error
  - Fix: Query members table by ID first, fall back to email lookup only if needed
  - File: app/coach/athletes/page.tsx (fetchPaymentData function)
- **✅ 10-Card Section Conditional Display:**
  - 10-Card management section was showing for all athletes (default 10/10)
  - Fix: Only show if member has `ten_card` in `membership_types` array
  - Added `membership_types` to MemberData interface and query
  - File: app/coach/athletes/page.tsx
- **✅ Restored Cody to athlete_profiles:**
  - Family member accidentally deleted by faulty SQL (email-only partition)
  - Restored with correct member ID from members table
- See: `project-history/2026-02-05-session-93-coach-athletes-mobile-family-fixes.md`

**Completed (2026-02-04 Session 91 - Opus):**
- **✅ Root Page Auth Redirect (app/page.tsx):**
  - Replaced default Next.js template with auth-aware redirect page
  - Processes Supabase hash tokens from email confirmation links
  - Signs out auto-created session, redirects all users to /login
  - Branded loading spinner (The Forge - Functional Fitness)
- **✅ Member Registration Email Confirmation Fix:**
  - admin.createUser email_confirm param unreliable
  - Added explicit updateUserById call to confirm email after creation
  - File: app/api/members/register/route.ts
- **✅ Login Page Pending Member Handling:**
  - Intercepts "email not confirmed" error from Supabase
  - Checks members table to show "Your account is pending approval" instead
  - Fixed navigation cascade: signOut() called without await to prevent popup chain
  - Replaced dynamic imports with top-level import to fix login hang
  - File: app/login/page.tsx
- **✅ Member Registration Flow Tested End-to-End:**
  - Register at /auth/register-member → success message → redirect to /login
  - Login attempt with pending account → "Your account is pending approval" message
  - Coach approval required before login succeeds
  - No confirmation email (coach approval IS the gatekeeper)
- See: `project-history/2026-02-04-session-91-auth-redirect-member-registration.md`

**Completed (2026-02-04 Session 92 - Sonnet):**
- **✅ Member Registration Mobile Testing:**
  - Fixed registration redirect from `/` → `/login` to bypass root page auth checks
  - Fixed "Sign In" link from `/` → `/login`
  - Root cause: Root page auth checks triggered "Auth session missing" errors
  - Files: app/auth/register-member/page.tsx (lines 100, 276)
- **✅ Login Page RLS Fix - Member Status Check:**
  - Created API route `/api/members/check-status` using service role to bypass RLS
  - Previous direct Supabase query failed with 406 error (RLS blocking unauthenticated requests)
  - Login now correctly shows "pending approval" message for member accounts
  - Files: app/api/members/check-status/route.ts (NEW), app/login/page.tsx (lines 77-96)
- **✅ Delete Test Account Script:**
  - Created reusable script with dotenv support for environment variables
  - Usage: `npx tsx scripts/delete-test-account.ts <email>`
  - File: scripts/delete-test-account.ts
- **✅ Full Registration Flow Verified (Desktop + Mobile):**
  - Register → Pending message → Coach approval → Login → Redirect to /member/book
  - Access tiers working (greyed tabs for non-paying members)
  - Start Trial working (30-day trial unlocks full access)
  - Stripe payments working (monthly/yearly/10-card)
- **✅ Memory Bank Cleanup (40% reduction):**
  - Trimmed activeContext.md from 1,215 → 358 lines (removed sessions 57-86)
  - Trimmed systemPatterns.md from 981 → 688 lines (removed implemented patterns)
  - Created historical-features.md (121 lines) - quick reference of all features
  - Total: 2,542 → 1,513 lines (1,029 lines removed)
  - Files: memory-bank/memory-bank-activeContext.md, memory-bank/memory-bank-systemPatterns.md, memory-bank/historical-features.md (NEW)
- **✅ Session Close Checklist Updated:**
  - Updated backup tables count from 10 → 22 tables (organized into 5 categories)
  - Added warning to keep activeContext concise (last 5 sessions only)
  - File: Chris Notes/AA frequently used files/session-close-checklist.md
- See: `project-history/2026-02-04-session-92-member-registration-mobile-testing.md`

**Completed (2026-02-03 Session 90 - Sonnet):**
- **✅ Stripe Payment System Color Coding:**
  - **Athlete Payment Tab (AthletePagePaymentTab.tsx):**
    - Monthly subscriptions: Blue theme (blue-100 bg, blue-600 icon/text)
    - Yearly subscriptions: Teal theme (teal-100 bg, teal-600 icon/text)
    - 10-Card: Purple theme (purple-100 bg, purple-600 icon/text)
    - Active status displays correct colors based on plan_type
    - 12-month validity text for 10-card
  - **Coach Athletes Payments Tab (app/coach/athletes/page.tsx):**
    - Monthly Plan text: blue-600
    - Yearly Plan text: green-600
    - Monthly Active badge: blue-100/blue-700
    - Yearly Active badge: green-100/green-700
    - 10-Card Sessions heading: purple-600
    - Sessions counter: purple-600 (red warning for ≤2 sessions)
  - **Webhook Improvements (app/api/stripe/webhook/route.ts):**
    - 10-card expiry: 365 days (12 months)
    - Subscription dates set immediately on checkout.session.completed
    - Subscription record created in subscriptions table before subscription.created event
  - **Booking System Fixes (app/api/bookings/):**
    - create/route.ts: Separated 10-card from athlete subscription logic
    - create/route.ts: Added safety check Math.min() to prevent counter exceeding 10
    - create/route.ts: Enhanced warnings at 3, 2, 1, 0 sessions remaining
    - cancel/route.ts: Implemented 12-hour grace period for 10-card refunds
    - cancel/route.ts: Fixed refund logic to check membership_types instead of athlete_subscription_status
- See: `project-history/2026-02-03-session-90-stripe-color-coding.md`

**Older Sessions (57-89):**
See `project-history/` folder for detailed implementation history including:
- Access tiers & approval flow (Session 89)
- Workout Library search/drag-drop fixes (Session 86)
- Mobile optimization (Sessions 76-85)
- Analysis page fixes (Session 80)
- Whiteboard features (Sessions 72-74)
- Movement library improvements (Sessions 66-69)
- Programming notes (Session 67)
- Google Calendar integration fixes (Sessions 62-68)
- Modal/UI improvements (Sessions 58-61)
- Exercise parsing & debugging (Session 57)

---

## 🚨 Known Issues (Next Session)

**Migration Pending:**
1. **`20251206_fix_newlines_after_restore.sql`** (Optional) - Fix escaped `\n` in benchmark descriptions
   - **Apply via:** Supabase Dashboard SQL Editor (only if needed)
2. **`get_public_tables()` RPC function** - Required for backup auto-discovery
   - **Apply via:** Supabase SQL Editor (see project-history/2026-02-06-session-95)

**No Critical Blocking Issues**

---

## 🛡️ Database Safety Protocol

**MANDATORY Before ANY Database Change:**

```bash
npm run backup  # Creates timestamped JSON backups
```

**When to Backup:**
1. ✅ Before running ANY migration
2. ✅ Before switching git branches (if branch has migrations)
3. ✅ Before DROP TABLE, DELETE, TRUNCATE, or ALTER...DROP operations
4. ✅ Daily before starting work session
5. ✅ Before testing features that write to database

**Emergency Restore:**
```bash
npm run restore              # List backups
npm run restore 2025-12-06  # Restore specific date
```

**Pre-Migration Checklist:**
- Read `PRE_MIGRATION_CHECKLIST.md` EVERY TIME
- Review migration SQL for destructive operations
- Verify backup exists
- Run migration via Supabase Dashboard SQL Editor
- Verify data still exists
- Create new backup after success

**Why This Matters:**
- Dec 6, 2025 incident: Lost custom Forge Benchmarks + athlete lift records
- Root cause: Assumed git branches protected database (they don't!)
- Solution: Mandatory backups before risky operations

---

## 📋 Next Immediate Steps

### Session 96 Priorities

**✅ Member Registration & Booking System Complete:**
- Registration flow tested (desktop + mobile)
- Coach approval flow working
- Access tiers implemented (greyed tabs for non-paying members)
- Stripe payments working (monthly/yearly/10-card)

**Stripe Admin Tools Roadmap (In Order):**
- Task 1: ✅ Coach admin tools (manual subscription/10-card management) - COMPLETED Session 87
- Task 2: ⏳ 10-card auto-decrement on class booking - IN PROGRESS (booking creates, refunds work)
- Task 3: ✅ Low session warning (≤2 sessions remaining) - COMPLETED Session 90

**Pending Polish:**
- Continue mobile optimization for other Coach pages as needed

**DEFERRED: Phase 3 - Extract Utility Functions from AthletePageLogbookTab**
- Create 5 utility files in `utils/logbook/` directory
- Target: Remove ~180 lines from main component
- Files to create:
  1. dateNavigation.ts (40 lines) - Date arithmetic functions
  2. photoHandlers.ts (50 lines) - ISO week calculation, photo navigation
  3. formatters.ts (40 lines) - formatLift, formatBenchmark, formatForgeBenchmark
  4. savingLogic.ts (30 lines) - saveSectionResult, saveAllResults
  5. loadingLogic.ts (20 lines) - loadSectionResults, loadLiftResultsToSection
- Update hooks from Phase 2 to import these utilities
- Goal: Main component → ~1,100 lines (from 1,267)
- See approved refactoring plan at: ~/.claude/plans/graceful-squishing-kitten.md

**Week 2: Testing Phase** - Parallel work when refactoring complete
- All Week 1 critical tasks complete (RLS policies, build verification)
- Ready to begin systematic manual validation of all features

### JANUARY LAUNCH PLAN (Weeks 1-5)

**Week 1: Security & Infrastructure (Dec 2-8) - CRITICAL**

1. **✅ RLS Policies** (COMPLETED - Session 54)
   - ✅ Removed PUBLIC access from athlete data tables
   - ✅ Added coach and user-based policies
   - ✅ Fixed auth.users GRANT permissions
   - ✅ Tested with isolated accounts - working correctly

2. **✅ Build Verification** (COMPLETED - Session 54)
   - ✅ Fixed 12 ESLint type errors
   - ✅ Production build successful (`npm run build`)
   - ✅ Created `.env.example` with all environment variables documented

3. **Analysis Page Scroll Jump Bug** (DEFERRED)
   - Location: components/coach/analysis/StatisticsSection.tsx
   - Priority: Medium (UX polish)

**Week 2-5:** Testing, Beta Launch, Public Launch (see full plan above)

---

## 🗂️ Additional Resources

- **Detailed History:** See `project-history/` for feature implementation details by date
- **Critical Gotchas:** See `memory-bank/lessons-learned.md` for patterns
- **Workflow Rules:** See `memory-bank/workflow-protocols.md` (includes DATABASE SAFETY PROTOCOL)
- **Tech Details:** See `memory-bank/memory-bank-techContext.md`
- **Code Patterns:** See `memory-bank/memory-bank-systemPatterns.md`

---

**File Size:** ~4.3KB
