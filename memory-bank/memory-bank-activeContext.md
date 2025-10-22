# The Forge Functional Fitness - Active Context (Final, Corrected)

Version: 2.9
Timestamp: 2025-10-23 15:45 UTC

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
| **WOD Panels** | WOD Modal converted to **800px Left Side Panel**. **Coach Notes Panel** (floating modal, resizable/draggable); notes are private, **TEXT column**, and **full-text searchable** via GIN index. **Advanced Drag-Drop** for moving sections from Search Panel into WOD panel. **Exercise Library** is draggable/resizable with responsive columns. | `components/WODModal.tsx` |
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
* **Database:** **Supabase** (PostgreSQL) with RLS enabled.
* **Authentication:** **Supabase Auth** implemented (signup/login/logout).
* **Data Model:** JSONB for WOD sections; GIN indexes for full-text search (`coach_notes`).
* **Units:** **Metric units** enforced throughout: kg, cm, meters.
* **Visualization:** `recharts` library for progress charts.

---

## 🛠️ Tooling & Development Environment

| Feature | Implementation | Files |
| :--- | :--- | :--- |
| **Cline Integration** | Integrated cline-init rules with Memory Bank protocols and agent delegation. | `.clinerules`, `~/Documents/Cline/Rules/custom_instructions.md` |
| **Linting System** | ESLint + Prettier + EditorConfig configured; all files formatted and linted (22 errors, 21 warnings fixed). | `.eslintrc.js`, `.prettierrc`, `.editorconfig`, `scripts/lint.sh` |
| **VS Code** | Format on save, ESLint integration, recommended extensions configured. | `.vscode/settings.json`, `.vscode/extensions.json` |
| **AI Assistant Selection** | Decision matrix added for Cline vs Claude Code usage (cost efficiency, subagent requirements). | `memory-bank/workflow-protocols.md:1.2` |

---

## 🔐 Supabase Auth Implementation (v2.6)

| **Feature** | Description | Files |
| :--- | :--- | :--- |
| **Analysis Logout Fix** | Fixed logout handler to use Supabase Auth instead of sessionStorage. | `app/coach/analysis/page.tsx:19` |
| **Type Error Fixes** | Fixed type assertions for `scaling` (Scaling type) and `rep_max_type` (RepMaxType type). | `app/athlete/page.tsx:139,155` |
| **Null Guard Fixes** | Added null guards for `athleteProfile.full_name` across athlete pages. | `app/athlete/page.tsx:170,171` |
| **RLS Policy Cleanup** | Created SQL script to remove PUBLIC RLS policies (for future use after multi-user setup). | `supabase/migrations/remove-public-rls-policies.sql` |
| **Signup UX** | Extended success message timeout from 2s to 3s for better readability. | `app/auth/signup/page.tsx:45` |

---

## 🎯 WOD Creation UX & Database-Driven Features (v2.8)

| **Feature** | Description | Files |
| :--- | :--- | :--- |
| **Workout Type Refactor** | Moved Workout Type dropdown from top form to WOD section headers only. Each section can have its own workout_type_id. | `components/WODModal.tsx:34` |
| **Database Section Types** | Replaced hardcoded SECTION_TYPES array with database-driven section_types table. Dynamic ordering via display_order column. | `supabase-section-types.sql`, `components/WODModal.tsx:71-78` |
| **Exercise Library UX** | Made library draggable/resizable with 4-corner handles. Responsive 2-4 column layout. Stays open for multiple selections. | `components/WODModal.tsx:104-200` |
| **Add Section Logic** | Sections now insert after currently expanded section. Uses next section type from database sequence. | `components/WODModal.tsx:handleAddSection` |
| **Resizable Coach Notes Modal** | Converted Notes side panel to floating modal with 4-corner resize handles and drag-to-move. | `app/coach/page.tsx:62-656,1893-2033` |
| **Week Number Fix** | Fixed week number calculation for second week in monthly view. | `app/coach/page.tsx:1235-1238` |

---

## 🔍 WOD Search Panel Enhancements (v2.9)

| **Feature** | Description | Files |
| :--- | :--- | :--- |
| **Dynamic Movement Extraction** | Regex-based parsing extracts movements from any WOD format (replaces 140+ hardcoded patterns). | `app/coach/page.tsx:96-180` |
| **Workout Type Filter Fix** | Fixed filter to use section-level workout_type_id instead of deprecated WOD-level field. | `app/coach/page.tsx:267-337` |
| **Section Exclusion Filters** | Dynamic filter buttons exclude specific section types (e.g., Warm-up) from search results. | `app/coach/page.tsx:58,230-236,314-316,1461-1485` |
| **WOD Hover Preview** | Popover shows full WOD content when hovering over search result card. | `app/coach/page.tsx:66,1549-1550,1569-1587` |
| **Cancel Copy Button** | Moved to navigation bar (works in both weekly and monthly views). | `app/coach/page.tsx:886-918` |
| **React Hooks Bug Fix** | Fixed hooks order violation in ExerciseLibraryPopup component. | `components/WODModal.tsx:255-304` |

---

## 📋 NEXT STEPS (Priority)

1.  **Run Migration:** Execute `supabase-section-types.sql` in Supabase SQL Editor to create section_types table.
2.  **Exercise Filtering Research:** Consider implementing movement pattern or equipment-based filtering for Exercise Library (deferred for future discussion).
3.  Add `user_id` to all athlete tables (currently NULL).
4.  Remove **PUBLIC RLS policies** using the migration script (once multi-user setup is ready).
5.  Add multi-user support with proper data isolation.