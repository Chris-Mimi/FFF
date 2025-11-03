# Active Context

**Version:** 3.0
**Updated:** 2025-11-03

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
├─ members (id, email, name, status: pending|active|blocked, membership_types[], ten_card_purchase_date, ten_card_sessions_used)
├─ bookings (id, session_id, member_id, status: confirmed|waitlist|cancelled|no_show|late_cancel)

Athlete Tables (linked to members.id)
├─ athlete_profiles (id, user_id, full_name, emergency_contact)
├─ workout_logs (id, user_id, wod_id, result, notes)
├─ benchmark_results (id, user_id, benchmark_name, result_value, scaling)
├─ lift_records (id, user_id, lift_name, rep_max_type, weight, calculated_1rm)
```

---

## 📍 Current Status (Last 2 Weeks)

**Completed:**
- Late cancel and no-show tracking (v2.30)
- Session management improvements with 15-min time picker (v2.28-2.29)
- Time synchronization across wods and weekly_sessions tables
- "All Time" attendance filter option
- Olympic Lifting section type added

**Active Development:**
- Memory Bank optimization (THIS SESSION)

**Known Issues:**
- None currently

---

## 📋 Next Immediate Steps

1. Test late cancel/no-show functionality in production
2. Review Google Calendar publishing setup (optional, env vars not configured)
3. Continue Phase 1 booking system features:
   - Session template auto-generation (Sunday 15:00)
   - Booking badges on calendar cards
   - Waitlist promotion workflow
4. Add `user_id` to athlete tables (currently NULL for multi-user support)
5. Remove PUBLIC RLS policies before production (migration ready: `supabase/migrations/remove-public-rls-policies.sql`)

---

## 🗂️ Additional Resources

- **Detailed History:** See `memory-bank/history/` for feature implementation details by date
- **Critical Gotchas:** See `memory-bank/lessons-learned.md` for timezone handling, field naming, and architectural patterns
- **Workflow Rules:** See `memory-bank/workflow-protocols.md` for session protocols and agent usage
- **Tech Details:** See `memory-bank/memory-bank-techContext.md` for database schema and architecture
- **Code Patterns:** See `memory-bank/memory-bank-systemPatterns.md` for implementation standards

---

**File Size:** ~3.2KB (87% reduction from 40KB)
