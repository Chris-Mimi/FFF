# Active Context

**Version:** 3.2
**Updated:** 2025-11-04

---

## ⚠️ CRITICAL RULES

| Rule | Detail |
|:---|:---|
| **Mandate** | Read `memory-bank/workflow-protocols.md` BEFORE any work |
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
├─ wods (id, date, sections: JSONB, is_published, publish_time, publish_sections, google_event_id, coach_notes: TEXT)
├─ section_types (id, name, display_order)
├─ workout_types (id, name)
├─ workout_titles (id, title)
├─ exercises (id, name, category)
├─ tracks (id, name, description, color)
├─ weekly_sessions (id, date, time, workout_id, capacity, status)

Member Tables
├─ members (id, email, name, status, membership_types[], account_type: primary|family_member, primary_member_id, display_name, date_of_birth, relationship)
├─ bookings (id, session_id, member_id, status: confirmed|waitlist|cancelled|no_show|late_cancel)

Athlete Tables (linked to members.id)
├─ athlete_profiles (id, user_id, full_name, emergency_contact)
├─ workout_logs (id, user_id, wod_id, result, notes)
├─ benchmark_results (id, user_id, benchmark_name, result_value, scaling)
├─ lift_records (id, user_id, lift_name, rep_max_type, weight, calculated_1rm)
```

---

## 📍 Current Status (Last 2 Weeks)

**Completed (2025-11-04):**
- **Family Accounts (Phases 1-3):** Full implementation for booking family members
  - Database migration: `account_type`, `primary_member_id`, `display_name`, `date_of_birth`, `relationship` columns
  - RLS policies: Users can CRUD their own family members
  - Booking API: Accepts `memberId` parameter, validates family relationships
  - UI: Compact selectable cards for choosing booking member, inline edit/delete
  - Migration file: `supabase/migrations/20251104_add_family_accounts.sql`

**Completed (Previous):**
- Memory Bank optimization: 82% reduction (40KB → 9.5KB)
- Athlete Logbook: Accordion week view, calendar month view
- Click-to-logbook navigation from Published Workouts
- "All Time" attendance bug fix

**Active Development:**
- None (ready for Phase 4)

**Known Issues:**
- macOS iCloud Keychain autofill popups (OS behavior, not app bug)

---

## 📋 Next Immediate Steps

**Family Accounts - Remaining Phases:**
1. **Phase 4 (Recommended: Cline/Grok):** Multi-profile athlete page
   - Add profile selector dropdown in athlete page header
   - Filter all queries by `activeProfileId` (workout logs, benchmarks, lifts, logbook)
   - Update workout logging to use selected profile
   - File: `app/athlete/page.tsx` (~1400 lines, complex)
2. **Phase 5:** Subscription gating for family members
3. **Phase 6:** Booking history badges ("Booked for Emma")

**Other:**
4. Test late cancel/no-show functionality in production
5. Remove PUBLIC RLS policies before production

---

## 🗂️ Additional Resources

- **Detailed History:** See `project-history/` for feature implementation details by date
- **Critical Gotchas:** See `memory-bank/lessons-learned.md` for timezone handling, field naming, and architectural patterns
- **Workflow Rules:** See `memory-bank/workflow-protocols.md` for session protocols and agent usage
- **Tech Details:** See `memory-bank/memory-bank-techContext.md` for database schema and architecture
- **Code Patterns:** See `memory-bank/memory-bank-systemPatterns.md` for implementation standards

---

**File Size:** ~3.2KB (87% reduction from 40KB)
