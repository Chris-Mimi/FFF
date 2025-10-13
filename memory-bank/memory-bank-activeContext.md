# The Forge Functional Fitness - Active Context

Version: 1.4
Timestamp: 2025-10-14 17:30 UTC

## Project Overview
CrossFit gym management application for coaches and athletes. Coaches create and manage daily WODs (Workouts of the Day), athletes view and track their workouts.

## Complete Project History

### ✅ Session 1: Initial Setup (October 12-13, 2025)
1. Set up Next.js 15 project with TypeScript and Tailwind
2. Installed lucide-react for icons
3. Created login page (`app/page.tsx`) with coach/athlete role selection
4. Created coach dashboard (`app/coach/page.tsx`) with calendar view
5. Created WOD Modal (`components/WODModal.tsx`) with initial functionality:
   - Collapsible sections with content preview
   - Auto-expanding textarea (no scrollbar)
   - Drag-and-drop section reordering with grip icon
   - Hardcoded exercise library (Warm-up, Strength, MetCon, Gymnastics, Stretches)
   - Click collapsed content to expand and edit
   - Sections auto-collapse when adding new ones
   - Default template: Warm-up (12min), Accessory (10min), Strength (15min), WOD (15min)
6. Git repository initialized and connected to GitHub (https://github.com/Percepto25/FFF.git)

### ✅ Session 2: Supabase & UI Enhancements (October 14, 2025)
1. **Supabase Integration - FULLY FUNCTIONAL:**
   - Created Supabase project (xvrefulklquuizbpkppb.supabase.co)
   - Set up environment variables in `.env.local`
   - Created `lib/supabase.ts` client
   - Designed and created `exercises` table with schema: id, name, category, description, video_url, tags, created_at, updated_at
   - Added indexes for category and name for faster searches
   - Seeded database with 80+ exercises across 5 categories (Warm-up, Gymnastics, Strength, MetCon, Stretches)
   - Connected WOD modal to fetch exercises from Supabase (replaced hardcoded data)

2. **Coach Dashboard Enhancements (`app/coach/page.tsx`):**
   - Added weekly/monthly view toggle with icons
   - Implemented ISO week number calculation and display
   - Fixed date highlighting timezone bug (was showing wrong day)
   - Widened weekly view layout (max-w-[1600px]) with flexbox columns
   - Added global copy/paste system for WODs (clipboard with paste buttons)
   - Implemented drag-and-drop functionality for copying WODs between days
   - Changed background to darker grey (bg-gray-200)
   - Made icons hover-only (copy, delete) with vertical layout and absolute positioning
   - Changed weekday labels from abbreviated to full names
   - Made WOD cards clickable to edit in both weekly and monthly views

3. **WOD Modal UI Improvements (`components/WODModal.tsx`):**
   - Added editable workout title dropdown with preset options (WOD, Foundations, Endurance, Kids, Kids & Teens, ElternKind Turnen, FitKids Turnen, Diapers & Dumbbells)
   - Redesigned header with Check (✓) and X icon buttons
   - Removed bottom Cancel/Save buttons in favor of header controls
   - Fixed all text readability issues (added explicit text-gray-900/700 classes)
   - Fixed typo: "Diapers & Dumbells" → "Diapers & Dumbbells"
   - **Fixed exercise library flashing issue:** Added caching so exercises only fetch once on first open, eliminating distracting flash on subsequent opens

4. Git: All changes committed and pushed to GitHub

### 📋 NEXT STEPS
1. Store WODs in Supabase database (currently stored in component state)
2. Create athlete dashboard (`app/athlete/page.tsx`)
3. Implement Supabase Auth (replace sessionStorage)
4. Add athlete view to see today's workouts
5. Add benchmark tracking (Forge WODs, Endurance, Lifts)

## Key Technical Decisions
- Using Next.js 15 App Router
- All interactive pages are Client Components ('use client')
- Supabase for exercise database (PostgreSQL with RLS)
- SessionStorage for temporary auth (will upgrade to Supabase Auth)
- Teal color scheme: #208479 (primary), #1a6b62 (hover)
- Darker grey background: #e5e7eb (bg-gray-200)
- WODs stored in component state (will move to Supabase)
- File structure: app/page.tsx (login), app/coach/page.tsx (coach dashboard), components/WODModal.tsx, lib/supabase.ts

## Coach Dashboard Features (Reference)
- Weekly/monthly view toggle with ISO week numbers
- Global copy/paste system for WODs (clipboard shows paste buttons when WOD copied)
- Drag-and-drop WODs between days
- Hover-only icons (vertically positioned, absolute top-right)
- Click WOD to edit in both views
- Today's date highlighted with teal ring
- Fixed date handling to prevent timezone issues

## WOD Modal Features (Reference)
- Header: Check (✓) to save, X to cancel
- Editable title dropdown with preset options
- Collapsible sections showing content when collapsed
- Auto-expanding textarea grows with content
- Drag sections to reorder (HTML5 drag-drop)
- Exercise library fetches from Supabase (80+ exercises, cached after first load)
- No flashing/loading on library re-opens (exercises cached)
- Section types: Whiteboard Intro, Warm-up, Skill, Gymnastics, Accessory, Strength, WOD Preparation, WOD, Cool Down
- Default template automatically created for new WODs
