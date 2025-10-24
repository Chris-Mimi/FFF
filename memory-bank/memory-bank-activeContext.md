# The Forge Functional Fitness - Active Context (Final, Corrected)

Version: 2.18
Timestamp: 2025-10-24

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
| **Cline Integration** | Configured with free backup models (Grok, Supernova) for use during Anthropic rate limiting. User experienced throttling issues requiring backup strategy. | `.clinerules`, `CLAUDE.md:39-45` |
| **Linting System** | ESLint + Prettier + EditorConfig configured; all files formatted and linted (22 errors, 21 warnings fixed). | `.eslintrc.js`, `.prettierrc`, `.editorconfig`, `scripts/lint.sh` |
| **VS Code** | Format on save, ESLint integration, recommended extensions configured. | `.vscode/settings.json`, `.vscode/extensions.json` |
| **AI Assistant Selection** | Decision matrix added for Cline vs Claude Code usage (cost efficiency, subagent requirements). | `memory-bank/workflow-protocols.md:15-68` |
| **Grok Workflow Integration** | Task evaluation protocol and mandatory git commit process (status/diff verification before commits). | `memory-bank/workflow-protocols.md:71-157` |

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

## 🎨 UX Refinements & Smart Features (v2.10)

| **Feature** | Description | Files |
| :--- | :--- | :--- |
| **Hover Preview Refinement** | WOD hover popover adjusted to 75% width, left-aligned, with clean layout and no border ghost frame. | `app/coach/page.tsx:1593-1633` |
| **Smart Section Insertion** | Sections dragged from search insert at correct position based on database display_order. | `components/WODModal.tsx:1083-1124` |
| **WOD → Workout Rename** | All user-facing "WOD" text changed to "Workout" for clarity and voice input support. | `app/coach/page.tsx:835,1180,1290,1791`, `components/WODModal.tsx:1244,1474` |
| **Default Section Updates** | Changed template from [Warm-up, Accessory, Strength, WOD] to [Warm-up, WOD, Cool Down]. | `components/WODModal.tsx:827-848` |
| **Time Display Fix** | Section time ranges now show correct start times (1-12, 13-27 instead of 0-12, 12-27). | `components/WODModal.tsx:530` |

---

## 📅 Calendar Navigation & Workout Preview (v2.11)

| **Feature** | Description | Files |
| :--- | :--- | :--- |
| **Add Workout Button Redesign** | Moved to top-right of day headers. Shows large teal "+" icon (22px, stroke 2.5) with hover effects. Removed button text. | `app/coach/page.tsx:1125-1131,1262-1268` |
| **Workout Hover Popover** | Displays filtered workout sections on hover in both weekly and monthly views. Excludes: Whiteboard Intro, Warm-up, WOD preparation, Cool Down. Shows only sections with content. | `app/coach/page.tsx:1183-1206,1320-1343,1056-1079` |
| **Monthly View Expansion** | Removed 2-workout limit. All workouts now display and expand vertically. Removed "+X more" indicator. | `app/coach/page.tsx:1015` |
| **Focused Date System** | Added `focusedDate` state separate from `selectedDate` (week navigation). Blue ring (ring-4) highlights focused date. Teal ring shows today. | `app/coach/page.tsx:68,983,1130,1275` |
| **Click-to-Select Navigation** | Monthly: Click empty space = highlight; click day number = switch to weekly + highlight. Weekly: Click empty space = highlight (no navigation). Works in both weeks displayed. | `app/coach/page.tsx:992-998,1008-1014,1138-1144,1283-1289` |
| **Today Button** | Teal button in navigation bar jumps to current date. Sets both `selectedDate` and `focusedDate`. | `app/coach/page.tsx:905-914` |

---

## 📊 Analysis Page Enhancements (v2.13)

| **Feature** | Description | Files |
| :--- | :--- | :--- |
| **Exercise Search Database Integration** | Replaced hardcoded exercise list with Supabase `exercises` table. Search uses full dataset (`allExerciseFrequency`) while display shows top 20. Normalization preserves case for parentheses "(PVC)", handles hyphen/space variations. | `app/coach/analysis/page.tsx:96-195,485-529` |
| **Multi-Select Exercise Chips** | Changed search from single to multiple selection array. Selected exercises display as small chips below search bar with exercise name + count. Individual X buttons and "Clear All" button added. | `app/coach/analysis/page.tsx` |
| **Top 40 Compact Display** | Changed from grid of large cards to flex-wrap compact chips. Increased display from top 20 to top 40 exercises. Chips styled with grey background and teal border (distinct from search chips). | `app/coach/analysis/page.tsx` |
| **Category Filters & Library Panel** | Fetch exercise categories from Supabase. Dynamic category filter chips (multiple selection). "Unused" filter shows exercises not used in workouts. Browse Library button opens draggable/resizable panel with ALL database exercises, responsive column layout. Filters affect Top Exercises, search results, and library. | `app/coach/analysis/page.tsx` |

---

## 📅 Analysis Page UX & Timeframes (v2.14)

| **Feature** | Description | Files |
| :--- | :--- | :--- |
| **Exercise Search Bug Fix** | Fixed popover showing "0 times" for exercises outside top 20 by using `allExerciseFrequency` instead of `exerciseFrequency`. | `app/coach/analysis/page.tsx:485-529` |
| **Panel Reorganization** | Moved Statistics to top, Manage Tracks to bottom with reduced padding (p-4 instead of p-6). | `app/coach/analysis/page.tsx:567-755` |
| **1 Week Timeframe** | Added 0.25 period for rolling 7-day window with arrow navigation moving by 7 days instead of months. | `app/coach/analysis/page.tsx:48,170-174,485-491,517-524` |
| **Editable Date Range Picker** | Draggable modal with month/year dropdowns, validation, and "Today" button. | `app/coach/analysis/page.tsx:541-638` |
| **Date Range Display** | Shows actual date ranges for week view (e.g., "Oct 25, 2024 - Oct 31, 2024"). | `app/coach/analysis/page.tsx:570-577` |

---

## 📅 Calendar & Panel UX (v2.16)

| **Feature** | Description | Files |
| :--- | :--- | :--- |
| **Search Panel Date Format** | Added year to workout date display in search results (e.g., "Oct 25, 2024" instead of "Oct 25"). | `app/coach/page.tsx:1550` |
| **Button Repositioning** | Moved Add Workout/Paste buttons to bottom right of day cards. Flexbox layout prevents day name obstruction. | `app/coach/page.tsx:1148,1160-1264,1295,1307-1412` |
| **Single Add Button** | Replaced per-day "+" buttons with single focused-date "+" in nav bar with date tooltip. Simplified UX with single action point. | `app/coach/page.tsx:919,1107,1254,1401` |
| **Exercise Insertion Fix** | Fixed cursor position gap bug when inserting exercises from library into WOD content. | `components/WODModal.tsx:1311-1356` |
| **Calendar Hide Logic** | Calendar now hides when both WOD and Search panels are open simultaneously. Shows when either panel closes. | `app/coach/page.tsx:973,1751-1807` |
| **Panel Alignment** | WOD panel now aligns with Search panel below header (matches height and positioning). | `components/WODModal.tsx:1205` |

---

## 🎨 Panel Layout & Workflow (v2.17)

| **Feature** | Description | Files |
| :--- | :--- | :--- |
| **Header Independence** | Header moved outside content container, always full width regardless of panel states. Panels positioned below at top-[72px]. | `app/coach/page.tsx:808-846` |
| **Panel Borders** | Added gray-400 top borders to all three panels (WOD Modal, Search Panel, Coach Notes Modal). | `components/WODModal.tsx:1205`, `app/coach/page.tsx:1455,1933` |
| **Calendar Content Container** | Separate container for calendar navigation/grid; hides both when panels open. | `app/coach/page.tsx:973-982` |
| **Workflow Protocols v1.3** | Added Grok integration workflow: Task Evaluation Protocol and Git Commit Protocol (mandatory git status/diff before commits). | `memory-bank/workflow-protocols.md:71-157` |

---

## 📋 NEXT STEPS (Priority)

1.  **Run Migration:** Execute `supabase-section-types.sql` in Supabase SQL Editor to create section_types table.
2.  **Exercise Filtering Research:** Consider implementing movement pattern or equipment-based filtering for Exercise Library (deferred for future discussion).
3.  Add `user_id` to all athlete tables (currently NULL).
4.  Remove **PUBLIC RLS policies** using the migration script (once multi-user setup is ready).
5.  Add multi-user support with proper data isolation.