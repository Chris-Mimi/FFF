# The Forge Functional Fitness - Active Context (Final, Corrected)

Version: 2.29
Timestamp: 2025-11-01

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

## 📤 Google Calendar Publishing (v2.19)

| **Feature** | Description | Files |
| :--- | :--- | :--- |
| **Database Schema** | Added publishing columns to wods table (is_published, publish_sections, google_event_id, publish_time, publish_duration). | `supabase-publishing-columns.sql` |
| **Publishing Modal** | Section checkboxes for selective publishing, time picker with 30-min increments, duration selector (30-90 min), event preview. | `components/PublishModal.tsx` |
| **WOD Modal Integration** | Added Publish button in header (only visible when editing existing workouts with valid date). | `components/WODModal.tsx:1195,1242-1253` |
| **Athlete Workouts Tab** | Weekly calendar view displaying published workouts with section content popover on hover. | `components/AthleteWorkoutsTab.tsx`, `app/athlete/page.tsx:75,311-313` |
| **Google Calendar API** | POST/DELETE endpoints for event creation/deletion using service account auth. Location: Bergwerkstrasse 10, Pforzen. Timezone: Europe/Berlin. | `app/api/google/publish-workout/route.ts` |
| **Setup Documentation** | Complete guide for Google Cloud project setup, service account creation, and calendar sharing. | `GOOGLE_CALENDAR_SETUP.md` |
| **Environment Variables** | Added 3 placeholders: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_CALENDAR_ID. | `.env.local` |
| **Implementation Status** | Code complete, Google Calendar setup pending (requires manual configuration). | — |

---

## 🐛 Publishing Fixes & Workflow (v2.20)

| **Feature** | Description | Files |
| :--- | :--- | :--- |
| **Optional Google Calendar** | Publishing now works WITHOUT Google credentials. Database updates always succeed; Google sync is optional. Error handling prevents crashes when env vars missing. | `app/api/google/publish-workout/route.ts:79-136` |
| **Schema Fix (INTEGER[] → TEXT[])** | Fixed publish_sections and published_section_ids columns from INTEGER[] to TEXT[] to store section type names instead of IDs. | `supabase-publishing-columns.sql` |
| **Timezone Bug Fix** | Fixed date shifting in athlete workouts tab by removing toISOString(). Now uses local date strings to prevent UTC conversion issues. | `components/AthleteWorkoutsTab.tsx:104,126,134` |
| **Styling Fixes** | Fixed greyed out text in athlete workouts: dates (text-gray-300 → text-gray-800), arrows (text-gray-400 → text-gray-800), input fields (text-gray-400 → text-gray-900, opacity-50 removed). | `components/AthleteWorkoutsTab.tsx:99,115,140-146,153-158` |
| **Workflow Protocols** | Updated session start protocol with correct file paths, added forbidden directories (Chris Notes/, cline-rules/). | `memory-bank/workflow-protocols.md:1-15` |

---

## ✅ Publish/Unpublish Workflow (v2.21)

| **Feature** | Description | Files |
| :--- | :--- | :--- |
| **Grok Revert & Rebuild** | Reverted incomplete Grok implementation, rebuilt publish/unpublish from scratch with proper field mappings. | `git restore .` → rebuild |
| **"P" Badge Display** | Added is_published field to coach page queries (fetchWODs, searchWODs) to show publish badge. | `app/coach/page.tsx:185,217` |
| **Schema Field Names** | Corrected SQL migration to match TypeScript (published → is_published, calendar_event_id → google_event_id, published_section_ids → publish_sections, event_time → publish_time, event_duration_minutes → publish_duration). | `supabase-publishing-columns.sql` |
| **Publish/Unpublish Flow** | Complete workflow: PublishModal (section selection, time/duration), API route (POST/DELETE), conditional button (Publish vs Unpublish), auto-refresh calendar. | `components/PublishModal.tsx`, `app/api/google/publish-workout/route.ts`, `components/WODModal.tsx:1242-1260`, `app/coach/page.tsx` |
| **Athlete Workouts Fix** | Updated all field names in AthleteWorkoutsTab (published → is_published, published_section_ids → publish_sections). | `components/AthleteWorkoutsTab.tsx:33,193` |
| **Logbook Filter** | Added .eq('is_published', true) to athlete logbook query to show only published workouts. | `app/athlete/page.tsx:141` |

---

## 🔧 Database-Driven Titles & Bug Fixes (v2.22)

| **Feature** | Description | Files |
| :--- | :--- | :--- |
| **Workout Titles Migration** | Moved hardcoded workout titles to Supabase table, updated WODModal and schedule page to fetch from DB. | `supabase-workout-titles.sql`, `components/WODModal.tsx:88-93,659,813,1424-1426,1681-1683`, `app/coach/schedule/page.tsx:19-24,39,67-80,454-458` |
| **Session Generation Timezone Fix** | Fixed UTC conversion causing 1-day offset in auto-generated weekly sessions. | `app/api/sessions/generate-weekly/route.ts:81-85,147-151` |
| **Weekly Session Auto-Publish** | Auto-publish weekly_sessions when saving linked WODs to make sessions available for booking. | `app/coach/page.tsx:592-598` |

---

## 🎫 Membership Types & Session Management (v2.23)

| **Feature** | Description | Files |
| :--- | :--- | :--- |
| **Membership Types System** | Added membership_types column to members table with 7 categories (WOD, Foundations, Diapers & Dumbbells, Unlimited, Trial, Coach, Paused). Color-coded badges and dynamic filter chips. | `database/add-membership-types.sql`, `app/coach/members/page.tsx:61-86,165-215,459-495` |
| **Session Management Modal** | Draggable modal shows booking details (member list, status badges), edit time/capacity, cancel session button. Opens from calendar badge click. | `components/SessionManagementModal.tsx`, `app/coach/page.tsx:1134-1143` |
| **Timezone Fix (formatDateLocal)** | Created helper function to prevent timezone shifting from toISOString(). Returns YYYY-MM-DD in local timezone. | `lib/utils.ts:29-34`, `components/AthleteWorkoutsTab.tsx:104,126,134` |
| **Workout Creation Simplification** | Removed class_times field from WOD creation (linked sessions now define scheduling). | `components/WODModal.tsx` |
| **Member Card Compaction** | Reduced card padding and spacing for efficient multi-column layout. | `app/coach/members/page.tsx:459-495` |
| **Login Member Status Validation** | Added member status check (active/blocked) to login flow with appropriate error messages. | `app/login/page.tsx:67-74` |
| **Git Commit** | Committed all changes from membership types implementation and session management features. | Git commit SHA pending |

---

## 📅 Booking System Planning (v3.0)

---

## 👥 Member Management & 10-Card Auto-Tracking (v2.26 - ✅ Complete)

| **Feature** | **Status** | **Description** |
| :--- | :--- | :--- |
| **10-Card Auto-Tracking** | ✅ **Complete** | Auto-increment on booking, auto-decrement on cancellation. Header-based auth for API routes. Member booking page uses API endpoints instead of direct DB calls. |
| **Filter Chip Counters** | ✅ **Complete** | Real-time membership type counts, total active athletes count, dynamic updates. |
| **Attendance History Tracking** | ✅ **Complete** | Confirmed booking counts by selectable timeframe (7/30/365 days), integrated into member cards. |
| **Manual 10-Card Management** | ✅ **Complete** | TenCardModal for purchase date and sessions_used editing with reset functionality. |
| **Authentication Fix** | ✅ **Complete** | Booking API routes switched from cookie-based to Authorization header authentication. Client passes access token in request headers. |

**Technical Implementation:**
- **API Routes**: Authorization header authentication (`Bearer token`), auto-increment/decrement logic with debug logging
- **Client Integration**: Member booking page fetches session token and includes in Authorization header for create/cancel requests
- **Database**: ten_card_purchase_date, ten_card_sessions_used columns, RPC function (get_member_attendance_count)
- **Files Modified**: `app/api/bookings/create/route.ts`, `app/api/bookings/cancel/route.ts`, `app/member/book/page.tsx`
- **Commit**: 7bf65e6 (fix: implement 10-card auto-tracking and fix booking authentication)
- **Package**: Installed @supabase/ssr for Next.js 15 compatibility

**Testing Results:**
- ✅ First booking: Counter increments correctly
- ✅ Cancellation: Counter decrements correctly
- ✅ Rebooking: Fixed in v2.27 (partial unique index solution)

---

## 🔧 Member Management & Booking Improvements (v2.27 - ✅ Complete)

| **Feature** | **Status** | **Description** |
| :--- | :--- | :--- |
| **Rebooking Fix** | ✅ **Complete** | Fixed 500 error when rebooking cancelled sessions. Replaced UNIQUE constraint with partial unique index (only applies when status != 'cancelled'). |
| **No-Show Tracking** | ✅ **Complete** | Added 'no_show' status to bookings. Counts toward 10-card usage but not attendance stats. Includes undo functionality. |
| **Manual Booking** | ✅ **Complete** | Coach can manually book members via dropdown in Session Management Modal. Auto-increments 10-card for confirmed bookings. Filters out already-booked members. |
| **Pending Member Notification** | ✅ **Complete** | Pending tab shows orange text with pulse animation when members await approval. Real-time counter badge. |
| **Unapprove/Unblock Endpoints** | ✅ **Complete** | Testing utilities: Reset active members to pending, move blocked members back to pending. |
| **Athlete Page Navigation** | ✅ **Complete** | Member booking page shows "Athlete Page" button with trial/active/expired status. Access control validates trial expiry. |

**Technical Implementation:**
- **Database**: Partial unique index (`unique_active_bookings`), no_show status enum, fix rebooking constraint SQL
- **API Routes**: `/api/members/unapprove`, `/api/members/unblock` with service role authentication
- **Member Management**: Pending count polling, subtle testing buttons (unapprove), success message parsing fix
- **Session Modal**: Manual booking dropdown with member filtering, no-show/undo buttons, confirmation messages updated
- **10-Card Integration**: No-show counts toward sessions_used, manual booking auto-increments
- **Athlete Access**: Navigation button shows trial end date, validates subscription status on athlete page load

**Files Modified:**
- `database/fix-rebooking-constraint.sql` - Partial unique index for rebooking
- `database/add-no-show-status.sql` - Add no_show enum value
- `app/coach/members/page.tsx` - Pending notifications, unapprove/unblock, success message fix
- `components/SessionManagementModal.tsx` - Manual booking, no-show tracking, member dropdown
- `components/TenCardModal.tsx` - Updated sessions_used calculation to include no_show
- `app/member/book/page.tsx` - Athlete page navigation button with access status
- `app/athlete/page.tsx` - Member-based authentication with trial validation
- `app/api/members/unapprove/route.ts` - Reset to pending endpoint
- `app/api/members/unblock/route.ts` - Unblock endpoint

**Commits:**
- `acdaf5b` - feat: add member management features and booking improvements
- `d03fdb6` - feat(member): add athlete page navigation with access control

**Testing Status:**
- ✅ Rebooking after cancellation works correctly
- ✅ No-show marks correctly, counts toward 10-card
- ✅ Manual booking filters and increments correctly
- ✅ Pending notification appears/disappears dynamically
- ✅ Athlete page access validates trial expiry

---

## 🔧 Section Types Extension & Olympic Lifting Addition (v2.27)

| **Feature** | **Status** | **Description** |
| :--- | :--- | :--- |
| **Olympic Lifting Section Type** | ✅ **Complete** | Added "Olympic Lifting" section type to section_types table. Includes Olympic weightlifting movements (Clean, Snatch, Jerk variations). Available in Create New Workout modal for section selection. |

**Technical Implementation:**
- **Database**: Added Olympic Lifting to section_types table with display_order 11, description for weightlifting movements
- **File Created**: `database/add-olympic-lifting-workout-type.sql` - Corrected SQL script (initial mistake placed in wrong table)
- **UI Integration**: Section type choice in WOD creation modal (Warm-up, Strength, Gymnastics, **Olympic Lifting**, etc.)
- **Verification**: Confirmed in database and UI working as expected

**Commits:**
- `7e1d839` - feat: add Olympic Lifting section type to section_types table

---

## 🎛️ Session Management UX Improvements (v2.28 - ✅ Complete)

| **Feature** | **Status** | **Description** |
| :--- | :--- | :--- |
| **Time Picker (15-min increments)** | ✅ **Complete** | Replaced HTML time input with select dropdown showing only 15-minute intervals (00, 15, 30, 45). Default selection set to 12:00 for better UX. |
| **Session Modal 2-Row Layout** | ✅ **Complete** | Reorganized session info section from 4 individual rows to 2-row CSS Grid layout: Row 1 (Date \| Time), Row 2 (Capacity \| Status). Improved visual organization. |
| **Athlete Workout Card Time Display** | ✅ **Complete** | Modified workout card headers to display "Date at Time" format (e.g., "31 Oct 2025 at 18:00"). Days without workouts show just date. |
| **"All Time" Attendance Filter** | ✅ **Complete** | Added "All Time" option to attendance timeframe selector. Set as default selection. Passes null to RPC function for no date filter. |

**Technical Implementation:**
- **Time Picker**: Select dropdown with 96 options (24 hours × 4 intervals). Dynamic generation using Array.from with hour/minute mapping.
- **Grid Layout**: CSS Grid provides better responsive behavior than previous flexbox approach.
- **Date/Time Display**: Conditional rendering in athlete workouts tab - shows time only when workout exists.
- **Attendance TypeScript**: Updated types to include 'all', proper null handling for RPC call parameter.

**Files Modified:**
- `components/SessionManagementModal.tsx` - Time picker and 2-row grid layout
- `components/AthleteWorkoutsTab.tsx` - Time display on workout cards
- `app/coach/members/page.tsx` - "All Time" attendance option

**Commits:**
- `1d66c0f` - feat: implement session tasks - time picker, layout, athlete cards, attendance

**Testing:**
- ✅ Time picker shows 15-minute increments only
- ✅ Session modal displays in clean 2-row grid
- ✅ Athlete cards show time when workouts exist
- ✅ "All Time" attendance filter fetches all historical data

---

## 🐛 Time Picker Bug Fixes (v2.29 - ✅ Complete)

| **Feature** | **Status** | **Description** |
| :--- | :--- | :--- |
| **Zero-Padding Fix** | ✅ **Complete** | Fixed time picker defaulting to 00:00. Added padTime() helper to ensure time values always match select dropdown format (HH:MM). Applied at all 8 state-setting locations. |
| **Athlete Page Time Sync** | ✅ **Complete** | Fixed Athlete page showing stale time. Both modals now update weekly_sessions.time AND wods.publish_time when time changes. |

**Technical Implementation:**
- **Root Cause 1**: Database stores "8:45", select options are "08:45" - mismatch caused default to "00:00"
- **Root Cause 2**: Athlete page reads publish_time from wods table, but updates only changed weekly_sessions.time
- **Solution**: padTime() helper function, dual-table updates in both modals
- **Locations Fixed**: 8 total (SessionManagementModal: 3, WODModal: 5)

**Files Modified:**
- `components/SessionManagementModal.tsx` - padTime() helper, zero-padding at fetch/cancel/edit, publish_time update
- `components/WODModal.tsx` - padTime() helper, zero-padding at fetch/cancel/edit (2 instances each), publish_time update

**Commits:**
- `04f64ec` - fix: ensure time picker always shows current time by applying zero-padding everywhere
- `a2c84fe` - fix: update wods.publish_time when changing session time for Athlete page display

**Testing:**
- ✅ Time picker consistently shows current time across all state changes
- ✅ Athlete page immediately reflects time changes from either modal

---

## 📅 Booking System Planning (v3.0)

---

| **Feature** | Description | Implementation Phase |
| :--- | :--- | :--- |
| **Overview** | Three-section app: Coach Page (workouts), Book a WOD Page (member bookings), Athlete Page (paid performance tracking). | — |
| **Weekly Workflow** | Sunday 15:00: Auto-generate weekly sessions from templates with coach review. Sessions create placeholder workouts on calendar. Members book by class type only (content hidden until published). | Phase 1 |
| **Member System** | Self-registration with pending status. Coach approval required (active/blocked). Individual 1-month Athlete trial per member (starts on approval). Family accounts supported with tiered pricing. | Phase 1 |
| **Session Templates** | Database-driven templates: day_of_week, time, workout_type, capacity. Used for weekly auto-generation. | Phase 1 |
| **Booking Flow** | Members book sessions with capacity limits. Waitlist when full. Coach notified of waitlist, can promote members or increase capacity. | Phase 1 |
| **Coach Integration** | Booking badges on calendar cards: "[8/10 +2]" (confirmed/capacity +waitlist). Color-coded: green (available), yellow (nearly full), red (full), purple (waitlist). Session Management Modal for bookings. | Phase 1 |
| **Publishing Restriction** | Published workouts visible ONLY to members who booked that specific session AND have active subscription or trial. | Phase 1 |
| **Payments (Stripe)** | Monthly/yearly subscriptions with family pricing tiers. Trial expiry shows paywall with subscribe prompt. Germany-compatible. | Phase 2 |
| **Notifications** | In-app bell icon initially. Email notifications later: account approval, booking confirmed, waitlist promoted, trial ending. | Phase 3 |

### Database Schema (New Tables)

**1. members**
- id (UUID, PK), email, password_hash, name, phone
- status (pending, active, blocked)
- account_type (primary, family_member)
- primary_member_id (FK to members, nullable)
- athlete_trial_start (timestamp, individual per member)
- athlete_subscription_status (trial, active, expired)
- athlete_subscription_end (timestamp)
- athlete_access (boolean, calculated field)
- created_at, updated_at

**2. session_templates**
- id (UUID, PK)
- day_of_week (1-7, Monday=1)
- time (HH:MM)
- workout_type (WOD, Foundations, Diapers & Dumbbells, etc.)
- default_capacity (integer)
- active (boolean)

**3. weekly_sessions**
- id (UUID, PK)
- date (YYYY-MM-DD)
- time (HH:MM)
- workout_id (FK to wods, auto-created placeholder)
- capacity (integer)
- status (draft, published, completed, cancelled)

**4. bookings**
- id (UUID, PK)
- session_id (FK to weekly_sessions)
- member_id (FK to members)
- status (confirmed, waitlist, cancelled)
- booked_at (timestamp)

**5. subscriptions**
- id (UUID, PK)
- primary_member_id (FK to members)
- plan_type (monthly, yearly)
- family_member_count (integer, for tiered pricing)
- status (active, expired, cancelled)
- current_period_end (timestamp)
- stripe_subscription_id
- created_at, updated_at

### Implementation Priorities

**Phase 1 - Core Booking System:**
1. Create database schema (5 new tables)
2. Member registration and coach approval workflow
3. Session templates and weekly auto-generation (Sunday 15:00)
4. Booking interface for members (capacity + waitlist)
5. Coach page integration (booking badges + Session Management Modal)

**Phase 2 - Payment Integration:**
6. Stripe setup and configuration
7. Subscription management (monthly/yearly)
8. Paywall for Athlete Page after trial

**Phase 3 - Enhancements:**
9. Notification system (in-app → email)
10. Advanced booking features

---

## 📤 Google Calendar Workouts Import Planning (v3.0 - Future Feature)

ChatGPT analysis provided comprehensive ETL strategy for importing 5+ years of workout data from Google Calendar text events into structured Supabase format.

| **Phase** | **Key Features** | **Technical Approach** |
| :--- | :--- | :--- |
| **Import Strategy** | 5+ years (≈1500 workouts) → Staged approach: Test week → Test month → Full migration | Google Calendar API → Python/JS ETL script → Supabase |
| **Text Processing** | Parse inconsistent text formats → Map to structured sections (Warm-Up, Strength, WOD) | Fuzzy section detection, exercise name matching against Supabase library |
| **Data Safety** | No data loss: Raw text preservation in coach_notes for unclear content | 100% backup in raw_text field, catch-all for unparsed content |
| **Database Schema** | Import tables (calendar_imports, calendar_imported_sections, calendar_imported_exercises) → Live tables (workouts, workout_sections, workout_movements) | Hybrid: Temp import tables for testing, then promote to production |
| **User Experience** | Manual review for unknown exercises, automated handling of YouTube/Facebook links, optional Google publishing | Admin dashboard for unmatched exercise review, structured reprocessing possible |

| **Technology Stack** | **Tools** | **Key Dependencies** |
| :--- | :--- | :--- |
| **Scripting** | Python preferred (supabase-py, google-api-python-client) | google-api-python-client, fuzzywuzzy for matching, supabase-py |
| **Database** | PostgreSQL extensions for fuzzy matching possible | TEXT[] for section types, UUID relationships, preserve original raw_text |
| **Setup** | Google Cloud Console for API access + Service Account | OAuth 2.0 credentials, Calendar.readonly scope |
| **Processing** | Dry-run mode for testing, promotion script for final migration | Batch processing, confidence scores for parsing quality |

| **Workflow** | **Steps** | **Safety Measures** |
| :--- | :--- | :--- |
| **1. Extraction** | Google Calendar API pulls events by date range | Time range parametrization (--start --end) |
| **2. Parsing** | Section detection (fuzzy keywords), exercise extraction from text | Confidence rating per workout (0-1 scale) |
| **3. Matching** | Fuzzy match against Supabase exercises library | Unknown exercises flagged for review |
| **4. Staging** | Store in temporary import tables for testing | Never touches production data during testing |
| **5. Promotion** | Script moves validated data to live tables | Unmatched content goes to coach_notes |

| **Risks & Mitigations** | **Solution** |
| :--- | :--- |
| Inconsistent text formatting (5 years of variation) | Fuzzy detection for section headers, raw_text backup |
| Unknown exercises (Incomplete Supabase library) | Separate unknown_exercises table, manual review workflow |
| Links/videos in workout text | Automatic extraction to links field or coach_notes |
| API rate limits/timeouts (1500 events) | Staged imports, parameterized batch processing |
| Data loss during import | Always preserve original raw text, reprocess anytime |

---

## 📋 NEXT STEPS (Priority)

1.  **Execute Publishing Migration:** Run `supabase-publishing-columns.sql` in Supabase SQL Editor to add publishing columns to wods table.
2.  **Google Calendar Setup (Optional):** Follow `GOOGLE_CALENDAR_SETUP.md` to create service account and fill in environment variables (publishing works without this).
3.  **Test Publishing Workflow:** Test event creation/deletion and athlete view.
4.  **Run Migration:** Execute `supabase-section-types.sql` in Supabase SQL Editor to create section_types table.
5.  **Begin Booking System Phase 1:** Start with database schema creation for members, session_templates, weekly_sessions, bookings, and subscriptions tables.
6.  Add `user_id` to all athlete tables (currently NULL).
7.  Remove **PUBLIC RLS policies** using the migration script (once multi-user setup is ready).
