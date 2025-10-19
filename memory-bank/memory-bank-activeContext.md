# The Forge Functional Fitness - Active Context (Final, Corrected)

Version: 2.4
Timestamp: 2025-10-20 00:30 UTC

## ⚠️ CRITICAL RULES & CONTEXT

| Rule Category | Detail |
| :--- | :--- |
| **Mandate** | **Read** `memory-bank/workflow-protocols.md` **BEFORE** any work. |
| **Agent Use** | Use Agent for 3+ step tasks, multi-file changes, and bug investigations. |
| **Efficiency** | **Target:** Keep sessions under **50%** context usage. |
| **Style Mandate** | Keep all memory bank content **highly structured, concise, and focused** using tables, short lists, and bold text. Avoid large prose. |
| **Context Monitoring** | **50%:** Alert. **60%:** Alert. **70%:** Alert. **80%:** **STOP** work, finish current task, and ask Chris for the Memory Bank update prompt. **DO NOT** update without user input. |
| **Project Goal** | CrossFit gym management app for coaches (WOD creation, analysis) and athletes (tracking, PRs). |

---

## 🏗️ Project Status & History Summary

The project is **IN PROGRESS**. All core data models and UI features are complete. The current focus is on **implementing Supabase Authentication, security, and multi-user data isolation.**

### Coach Interface & WOD Management

| Area | Features Implemented (Scope & Detail) | Files/DB |
| :--- | :--- | :--- |
| **Dashboard** | Weekly/Monthly view (using **ISO week numbers**). Drag-and-drop WODs between calendar days. **Search Panel** for WOD lookup, filtered by Track. **Layout System refined** for smooth panel transitions. | `app/coach/page.tsx` |
| **WOD Panels** | WOD Modal converted to **800px Left Side Panel**. **Coach Notes Panel** (400px wide) slides from right; notes are private, **TEXT column**, and **full-text searchable** via GIN index. **Advanced Drag-Drop** for moving sections from Search Panel into WOD panel. | `components/WODModal.tsx` |
| **Analysis** | Full CRUD for **Tracks** (name, description, color picker). Stats include: **7 WOD Duration Distribution ranges**, Track/Type breakdowns, and **Top 20 Exercises** (parsed from WOD content). | `app/coach/analysis/page.tsx` |
| **Athletes** | Athletes Management Page with null guards for data fetching. Coaches have full CRUD for athlete data. | `app/coach/athletes/page.tsx` |

### Athlete Tracking & Data Management

| Area | Features Implemented (Scope & Detail) | DB Tables |
| :--- | :--- | :--- |
| **Profile** | Full profile persistence (personal info, emergency contact). Handles new user creation gracefully. | `athlete_profiles` |
| **Logbook** | Logs persist **per WOD** (result/notes) with an **independent date selector** for historical logging. | `workout_logs` |
| **Benchmarks** | Tracking for **12 classic CrossFit benchmarks** (metric). **Progress Charts** with **Time Format Display Fix** implemented. **Full Edit/Delete** on history entries. | `benchmark_results` |
| **Barbell Lifts** | Tracks **1RM, 3RM, 5RM, and 10RM** separately. **Calculated 1RM** stored. **Progress Charts** use a **two-tier selection system**. **Full Edit/Delete** on history entries. | `lift_records` |
| **PRs** | Summary section automatically fetches and displays current best results for Benchmarks and Lifts. | `benchmark_results`, `lift_records` |

---

## 🔑 Key Technical Decisions

* **Platform:** Next.js 15 App Router, TypeScript, Tailwind.
* **Database:** **Supabase** (PostgreSQL) with RLS enabled (PUBLIC policies for development).
* **Data Model:** JSONB for WOD sections; GIN indexes for full-text search (`coach_notes`).
* **Units:** **Metric units** enforced throughout: kg, cm, meters.
* **Temp Auth:** `sessionStorage` (slated for upgrade to Supabase Auth).
* **Visualization:** `recharts` library for progress charts.

---

## 📋 NEXT STEPS (Priority)

1.  **Implement Supabase Auth** to replace `sessionStorage`.
2.  Add `user_id` to all athlete tables (currently NULL).
3.  Remove **PUBLIC RLS policies** once Auth is implemented.
4.  Add multi-user support with proper data isolation.
5.  Test athlete dashboard with multiple users.