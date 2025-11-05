# Active Context

**Version:** 3.4
**Updated:** 2025-11-05

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
├─ benchmark_workouts (id, name, type, description, display_order)
├─ forge_benchmarks (id, name, type, description, display_order)
├─ barbell_lifts (id, name, category, display_order)

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

**Completed (2025-11-05):**
- **Database-Driven Benchmarks & Lifts:** Coach management UI for benchmarks and lifts
  - Replaced hardcoded arrays with database tables
  - Coach CRUD interface at `/coach/benchmarks-lifts` with 3 tabs
  - Athletes now see dynamic lists based on coach configuration
  - Tables: `benchmark_workouts`, `forge_benchmarks`, `barbell_lifts`

**Completed (2025-11-04):**
- **Family Accounts (Phases 5-6):** Subscription gating and booking badges
  - Phase 5: Family members inherit subscription from primary account
  - Phase 6: Booking badges show "Booked for [Name]" with proper authorization
- **Family Accounts (Phases 1-4):** Multi-profile athlete page
  - Profile selector with complete data isolation
  - Family member booking with compact card UI

**Active Development:**
- None

**Known Issues:**
- macOS iCloud Keychain autofill popups (OS behavior, not app bug)

---

## 📋 Next Immediate Steps

1. Test late cancel/no-show functionality in production
2. Remove PUBLIC RLS policies before production
3. Consider adding coach ability to edit section types, workout types, exercises

---

## 🗂️ Additional Resources

- **Detailed History:** See `project-history/` for feature implementation details by date
- **Critical Gotchas:** See `memory-bank/lessons-learned.md` for timezone handling, field naming, and architectural patterns
- **Workflow Rules:** See `memory-bank/workflow-protocols.md` for session protocols and agent usage
- **Tech Details:** See `memory-bank/memory-bank-techContext.md` for database schema and architecture
- **Code Patterns:** See `memory-bank/memory-bank-systemPatterns.md` for implementation standards

---

**File Size:** ~3.4KB
