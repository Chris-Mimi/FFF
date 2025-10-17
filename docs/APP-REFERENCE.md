# Forge Functional Fitness - Application Reference Guide

Version: 1.0
Timestamp: 2025-10-16 15:00 UTC

---

## Table of Contents

1. [Application Overview](#application-overview)
2. [User Roles](#user-roles)
3. [Coach Dashboard](#coach-dashboard)
4. [Coach Athletes Page](#coach-athletes-page)
5. [Coach Analysis Page](#coach-analysis-page)
6. [Athlete Dashboard](#athlete-dashboard)
7. [Database Structure](#database-structure)
8. [Setup Instructions](#setup-instructions)
9. [Troubleshooting](#troubleshooting)

---

## Application Overview

**Forge Functional Fitness** is a CrossFit gym management application designed to streamline workout programming for coaches and performance tracking for athletes.

### Purpose

- **For Coaches:** Create and manage daily WODs (Workouts of the Day), track programming patterns, analyze training volume
- **For Athletes:** View scheduled workouts, log results, track personal records, visualize progress over time

### Technology Stack

- **Frontend:** Next.js 15 with TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL database with Row Level Security)
- **Icons:** lucide-react
- **Charts:** Recharts library
- **Deployment:** Vercel (recommended)

### Color Scheme

- **Primary Teal:** #208479
- **Hover Teal:** #1a6b62
- **Background:** Gray-200 (#e5e7eb)
- **Text:** Gray-900 (dark), Gray-600 (medium), Gray-400 (light)

### Units

All measurements use **metric units:**
- Weights: kilograms (kg)
- Heights: centimeters (cm)
- Distances: meters (m), kilometers (km)

---

## User Roles

### Coach

**Access:** Full control over programming and athlete management

**Capabilities:**
- Create, edit, delete daily WODs
- Copy/paste WODs between days
- Drag-and-drop WODs to duplicate
- Categorize workouts by Track and Type
- View programming analytics
- Access all athlete profiles
- Manually add athlete data (benchmarks, lifts, logs)

**Dashboard Views:**
- Weekly calendar (7 days with full details)
- Monthly calendar (6 weeks grid view)
- Analysis page (statistics and programming insights)
- Athletes page (individual athlete tracking)

### Athlete

**Access:** Personal training data and scheduled workouts

**Capabilities:**
- View daily scheduled WODs
- Log workout results and notes
- Track benchmark WOD performance
- Log barbell lift records (1RM, 3RM, 5RM, 10RM)
- View personal records and progress charts
- Update profile information
- Track emergency contact details

**Dashboard Tabs:**
- Profile
- Athlete Logbook
- Benchmark Workouts
- Barbell Lifts
- Personal Records
- Access & Security

---

## Coach Dashboard

### Overview

The coach dashboard is the central hub for creating and managing daily programming. Coaches can switch between weekly and monthly calendar views.

### Weekly View

**Layout:**
- 7 columns (Monday - Sunday)
- Full workout details visible
- Drag-and-drop between days to copy WODs
- Add multiple WODs per day
- Hover actions: Copy, Delete

**ISO Week Numbers:**
- Displayed at top of view
- Follows ISO 8601 standard (Monday = start of week)

**Features:**
- **Click WOD card** to edit
- **Drag WOD card** to another day to copy it
- **Copy button** (hover) - copies to clipboard
- **Paste button** - appears when WOD in clipboard
- **Delete button** (hover) - removes WOD with confirmation

### Monthly View

**Layout:**
- 6 rows × 7 columns grid
- Week numbers in left column
- Compact WOD display (shows max 2 per day)
- Grayed out days from previous/next month

**Features:**
- Same copy/paste/drag functionality as weekly
- Click WOD to edit
- "+X more" indicator when >2 WODs scheduled

### Creating a WOD

**Process:**
1. Click "Add WOD" button on desired date
2. WOD Modal opens with default template:
   - Warm-up (12 min)
   - Accessory (10 min)
   - Strength (15 min)
   - WOD (15 min)

**Modal Controls:**
- **Header:** Check (✓) to save, X to cancel
- **Title Dropdown:** Select workout category
  - WOD (default)
  - Foundations
  - Endurance
  - Kids
  - Kids & Teens
  - ElternKind Turnen
  - FitKids Turnen
  - Diapers & Dumbbells
- **Track Dropdown:** Select training focus
- **Workout Type Dropdown:** Select format (For Time, AMRAP, EMOM, etc.)

### WOD Sections

**Section Types:**
- Whiteboard Intro
- Warm-up
- Skill
- Gymnastics
- Accessory
- Strength
- WOD Preparation
- WOD (main workout)
- Cool Down

**Section Controls:**
- **Duration field:** Time allocation in minutes
- **Content field:** Auto-expanding textarea for workout details
- **Exercise library button:** Quick access to 80+ exercises by category
- **Delete button:** Remove section
- **Drag handle:** Reorder sections (drag-and-drop)

**Section Behavior:**
- Collapsed by default (shows preview of content)
- Click collapsed section to expand and edit
- Auto-collapses when adding new sections
- Exercise library cached after first load (no flashing)

### Exercise Library

**Categories:**
- Warm-up
- Gymnastics
- Strength
- MetCon
- Stretches

**Features:**
- 80+ exercises with descriptions
- Click exercise name to insert into section content
- Modal interface with category tabs
- Cached after first access (performance optimization)

### Navigation

**Header Buttons:**
- **Analysis:** View programming statistics
- **Athletes:** Manage athlete profiles and data
- **Logout:** Return to login screen

---

## Coach Athletes Page

### Overview

Dedicated page for coaches to view and manage individual athlete data. Split-panel interface with athlete list and detailed view.

### Athletes List Panel (Left)

**Display:**
- All athlete profiles from database
- Clickable cards with athlete names
- Visual selection highlighting

**Interaction:**
- Click athlete to load their data in right panel

### Athlete Details Panel (Right)

**Profile Header:**
- Athlete name
- Personal stats (height, weight)
- Emergency contact information

**Tab Navigation:**
1. **Benchmarks Tab**
2. **Lifts Tab**
3. **Logbook Tab**

### Benchmarks Tab (Coach View)

**Display:**
- All benchmark results for selected athlete
- Personal bests grouped by benchmark name
- Complete history with dates and scaling

**Actions:**
- **Add Result Button:** Manually log benchmark for athlete
  - Date selector
  - Result field
  - Scaling dropdown (Rx, Sc1, Sc2, Sc3)
  - Notes field

**Use Case:** Coach logs results for athletes who don't have app access or for historical data entry

### Lifts Tab (Coach View)

**Display:**
- All lift records grouped by lift name
- PRs for each rep max type (1RM, 3RM, 5RM, 10RM)
- Complete history with dates

**Actions:**
- **Add Lift Button:** Manually log lift for athlete
  - Date selector
  - Weight field (kg)
  - Rep Max Type dropdown
  - Notes field
  - Shows estimated 1RM for non-1RM lifts (Brzycki formula)

**Use Case:** Enter historical PRs or log lifts from in-person coaching sessions

### Logbook Tab (Coach View)

**Display:**
- All workout logs for selected athlete
- Shows WOD date, result, and notes
- Sortable by date

**Use Case:** Review athlete training consistency and workout feedback

---

## Coach Analysis Page

### Overview

Statistical dashboard for analyzing programming patterns and training volume over time.

### Track Management Section

**Purpose:** Define and manage workout categories (training focuses)

**Default Tracks:**
- Strength Focus
- Endurance Focus
- Gymnastics Focus
- Olympic Lifting
- Mixed Modal
- Benchmark WOD

**Features:**
- **Add Track:** Create new category with name, description, color
- **Edit Track:** Modify existing track details
- **Delete Track:** Remove track (confirms before deleting)
- **Color Picker:** Visual identifier for each track

**Display:**
- Grid layout showing all tracks
- Color indicators on each card
- Edit/Delete buttons per track

### Monthly Statistics Section

**Navigation:**
- Previous/Next month arrows
- Displays current month and year
- Auto-updates all statistics when month changes

**Summary Cards:**
1. **Total Workouts:** Count of WODs in selected month
2. **Average WOD Duration:** Mean time across all WOD sections
3. **Total WOD Time:** Sum of all WOD section durations

### WOD Duration Distribution

**7 Duration Ranges:**
- 1-8 minutes
- 9-12 minutes
- 13-20 minutes
- 21-30 minutes
- 31-45 minutes
- 45-60 minutes
- 60+ minutes

**Calculation:**
- Sums ALL sections with type "WOD" in each workout
- Handles multiple WOD sections correctly
- Groups into ranges and displays counts

**Use Case:** Understand programming bias toward sprint vs endurance workouts

### Track Breakdown

**Display:**
- Visual progress bars for each track
- Color-coded by track color
- Sorted by count (descending)
- Shows percentage of total workouts

**Use Case:** Ensure balanced programming across training domains

### Workout Type Breakdown

**Display:**
- Grid showing counts per workout type
- All types displayed (For Time, AMRAP, EMOM, Chipper, etc.)

**Use Case:** Monitor variety in workout formats

### Top Exercises

**Display:**
- Top 20 most frequently used exercises
- Extracted from WOD section content using pattern matching
- Displays count for each exercise

**Calculation:**
- Parses WOD content for exercise names
- Filters out common non-exercise words
- Aggregates and sorts by frequency

**Use Case:** Identify overused/underused movements in programming

---

## Athlete Dashboard

### Overview

Personal training hub with 6 tabs for tracking workouts, progress, and profile management.

### Tab Navigation

**Design:**
- Horizontal tab bar with icons
- Active tab highlighted in teal
- Mobile-responsive with horizontal scroll

**Tabs:**
1. Profile (User icon)
2. Athlete Logbook (BookOpen icon)
3. Benchmark Workouts (Trophy icon)
4. Barbell Lifts (Dumbbell icon)
5. Personal Records (Award icon)
6. Access & Security (Shield icon)

---

### Profile Tab

**Purpose:** Manage personal information and emergency contacts

**Fields:**
- Full Name
- Email
- Date of Birth
- Phone Number
- Height (cm)
- Weight (kg)

**Emergency Contact:**
- Contact Name
- Contact Phone

**Features:**
- Profile picture placeholder
- Auto-loads existing profile on mount
- Insert/update logic (handles new users gracefully)
- Save Changes button

**Database:** `athlete_profiles` table

---

### Athlete Logbook Tab

**Purpose:** View daily WODs and log workout results

**Date Navigation:**
- Previous/Next day buttons
- Current date display (full format: "Monday, October 16, 2025")
- "Go to Today" button (appears when not viewing current date)
- "Today" indicator when viewing current date

**WOD Display:**
- Fetches all WODs scheduled for selected date
- Shows workout title, track, and type badges
- Displays all WOD sections with durations
- Loading and empty states

**Logging Workout Results:**

For each WOD:
1. **Date field:** Defaults to selected date, can be changed
2. **Result/Time field:** Free text (e.g., "12:45", "15 rounds", "100 kg")
3. **Notes field:** Workout feedback, modifications, observations
4. **Save Log Entry button:** Persists to database

**Features:**
- Each WOD has independent result/notes inputs
- Insert/update logic (checks for existing logs)
- Logs persist across sessions
- Can log results for any date (historical or future)

**Database:** `workout_logs` table

**Use Cases:**
- Log workout immediately after completing
- Add notes about scaling or modifications
- Record how the workout felt
- Track trends over time

---

### Benchmark Workouts Tab

**Purpose:** Track performance on classic CrossFit benchmark WODs

**12 Benchmark WODs (Metric Units):**

**"Girls" Benchmarks:**
1. **Fran:** 21-15-9 Thrusters (43/29 kg) & Pull-ups
2. **Helen:** 3 rounds - 400m Run, 21 KB Swings (24/16 kg), 12 Pull-ups
3. **Cindy:** AMRAP 20 - 5 Pull-ups, 10 Push-ups, 15 Air Squats
4. **Grace:** For Time - 30 Clean & Jerks (61/43 kg)
5. **Isabel:** For Time - 30 Snatches (61/43 kg)
6. **Annie:** 50-40-30-20-10 Double Unders & Sit-ups
7. **Diane:** 21-15-9 Deadlifts (102/70 kg) & HSPU
8. **Elizabeth:** 21-15-9 Cleans (61/43 kg) & Ring Dips
9. **Kelly:** 5 rounds - 400m Run, 30 Box Jumps (60/50 cm), 30 Wall Balls (9/6 kg)
10. **Nancy:** 5 rounds - 400m Run, 15 OHS (43/29 kg)
11. **Jackie:** For Time - 1000m Row, 50 Thrusters (20/16 kg), 30 Pull-ups
12. **Mary:** AMRAP 20 - 5 HSPU, 10 Pistols, 15 Pull-ups

**Benchmark Cards:**
- Displays workout type and description
- Shows personal best if recorded
- Click to open logging modal

**Logging Modal:**
- **Date field:** Select workout date
- **Time/Result field:** Enter completion time or rounds
- **Scaling dropdown:** Rx, Sc1, Sc2, Sc3
- **Notes field:** Optional observations

**Recent History:**
- Last 10 benchmark results
- Shows date, result, scaling, notes
- **Edit button:** Opens modal pre-filled with entry data
- **Delete button:** Removes entry with confirmation

**Progress Charts:**
- Select benchmark to view line chart
- X-axis: Dates
- Y-axis: Results (converted to numeric values)
- Shows all recorded results chronologically
- Tooltip displays original result format and scaling
- **Supports multiple result formats:**
  - Time: "5:42" → 5.7 minutes
  - Decimal: "10.00" → 10.0 minutes
  - Rounds+Reps: "15 rounds + 5" → 15.05

**Database:** `benchmark_results` table

**Use Cases:**
- Track improvement on specific benchmarks
- Compare performance across different scaling levels
- Identify PRs and trend lines
- Plan training based on weaknesses

---

### Barbell Lifts Tab

**Purpose:** Track strength progress on major barbell movements

**12 Major Lifts (Organized by Category):**

**Squat:**
- Back Squat
- Front Squat
- Overhead Squat

**Pull:**
- Deadlift
- Sumo Deadlift

**Press:**
- Bench Press
- Shoulder Press
- Push Press
- Jerk

**Olympic:**
- Clean
- Snatch
- Clean & Jerk

**Rep Max Tracking:**

Each lift tracks **4 rep max types separately:**
- **1RM:** 1 Rep Max
- **3RM:** 3 Rep Max
- **5RM:** 5 Rep Max
- **10RM:** 10 Rep Max

**Lift Cards:**
- Display all recorded rep max PRs (2-column grid)
- Shows only rep max types with data
- Click to open logging modal

**Logging Modal:**
- **Date field:** Select lift date
- **Weight field:** Enter weight in kg
- **Rep Max Type dropdown:** Select 1RM, 3RM, 5RM, or 10RM
- **Notes field:** Optional form notes or observations
- **Estimated 1RM display:** Auto-calculates for non-1RM lifts (Brzycki Formula)

**Brzycki Formula:**
```
1RM = weight × (36 / (37 - reps))
```

**Recent History:**
- Last 10 lift records
- Shows lift name, date, weight, rep max type
- Displays estimated 1RM for non-1RM lifts
- **Edit button:** Opens modal pre-filled with lift data
- **Delete button:** Removes entry with confirmation

**Progress Charts:**

**Two-Tier Selection:**
1. **Select Lift:** Shows total count across all rep maxes
2. **Select Rep Max Type:** Shows only types with recorded data

**Chart Display:**
- Line chart showing weight progression over time
- X-axis: Dates
- Y-axis: Weight (kg)
- Updates dynamically when switching lifts or rep max types
- Displays all recorded attempts chronologically

**Database:** `lift_records` table (includes `rep_max_type` field)

**Use Cases:**
- Track strength progression across multiple rep ranges
- Compare 1RM to 5RM ratios
- Identify plateaus in training
- Plan periodization and programming

---

### Personal Records Tab

**Purpose:** Consolidated view of all personal bests

**Summary Stats:**
- **Total PRs:** Combined benchmark + lift PRs
- **Benchmark WODs:** Count of benchmarks with recorded results
- **Barbell Lifts:** Count of lifts with 1RM records

**Benchmark WODs Section:**
- Displays best result per benchmark
- Shows date achieved
- Large prominent result display
- Empty state when no benchmarks logged

**Barbell Lifts Section (1RM):**
- Displays highest 1RM per lift
- Shows date achieved
- Calculated from `calculated_1rm` field
- Empty state when no lifts logged

**Auto-Sync:**
- Automatically updates when new PRs logged in other tabs
- No manual refresh needed
- Real-time reflection of training progress

**Use Case:** Quick reference for current PRs, motivation tracking

---

### Access & Security Tab

**Purpose:** Account security management (UI only, not yet functional)

**Sections:**

1. **Change Password**
   - Current Password field
   - New Password field
   - Confirm New Password field
   - Update Password button

2. **Two-Factor Authentication**
   - Explanation text
   - Enable 2FA button

3. **Danger Zone**
   - Warning about account deletion
   - Delete Account button (red)

**Note:** Functionality will be implemented when Supabase Auth is integrated

---

## Database Structure

### Overview

PostgreSQL database hosted on Supabase with Row Level Security (RLS) enabled.

**Supabase Project:** xvrefulklquuizbpkppb.supabase.co

**Current Auth:** sessionStorage (temporary, for development)
**Future Auth:** Supabase Auth with user_id linkage

---

### Coach Tables

#### `exercises`

Exercise library for WOD creation.

**Columns:**
- `id` (UUID, PK)
- `name` (TEXT)
- `category` (TEXT) - Warm-up, Gymnastics, Strength, MetCon, Stretches
- `description` (TEXT)
- `video_url` (TEXT, nullable)
- `tags` (TEXT[], nullable)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes:**
- `category` (faster filtering)
- `name` (search optimization)

**Data:** 80+ exercises across 5 categories

---

#### `tracks`

Workout categorization by training focus.

**Columns:**
- `id` (UUID, PK)
- `name` (TEXT)
- `description` (TEXT, nullable)
- `color` (TEXT) - hex color code
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Default Tracks:**
- Strength Focus
- Endurance Focus
- Gymnastics Focus
- Olympic Lifting
- Mixed Modal
- Benchmark WOD

---

#### `workout_types`

Workout format categorization.

**Columns:**
- `id` (UUID, PK)
- `name` (TEXT)
- `description` (TEXT, nullable)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Default Types:**
- For Time
- AMRAP
- EMOM
- Chipper
- Rounds for Time
- Tabata
- Interval
- Other

---

#### `wods`

Daily programmed workouts.

**Columns:**
- `id` (UUID, PK)
- `title` (TEXT)
- `track_id` (UUID, FK → tracks)
- `workout_type_id` (UUID, FK → workout_types)
- `class_times` (TEXT[]) - e.g., ["9:00 AM", "6:00 PM"]
- `max_capacity` (INTEGER, nullable)
- `date` (DATE) - workout date
- `sections` (JSONB) - array of section objects
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Sections JSONB Structure:**
```json
[
  {
    "id": "unique-id",
    "type": "Warm-up",
    "duration": "12",
    "content": "400m Run\n10 Air Squats\n10 PVC Pass Throughs"
  },
  {
    "id": "unique-id",
    "type": "WOD",
    "duration": "15",
    "content": "21-15-9\nThrusters (43kg)\nPull-ups"
  }
]
```

**Indexes:**
- `date` (calendar queries)
- `track_id` (analytics)
- `workout_type_id` (analytics)

---

### Athlete Tables

#### `athlete_profiles`

Personal information and emergency contacts.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users, nullable for now)
- `full_name` (TEXT, nullable)
- `email` (TEXT, nullable)
- `date_of_birth` (DATE, nullable)
- `phone_number` (TEXT, nullable)
- `height_cm` (INTEGER, nullable)
- `weight_kg` (DECIMAL(5,2), nullable)
- `emergency_contact_name` (TEXT, nullable)
- `emergency_contact_phone` (TEXT, nullable)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Index:**
- `user_id` (when auth implemented)

---

#### `workout_logs`

Daily workout results and notes.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users, nullable for now)
- `wod_id` (UUID, FK → wods, ON DELETE SET NULL)
- `workout_date` (DATE)
- `result` (TEXT, nullable) - time, rounds, weight, etc.
- `notes` (TEXT, nullable) - athlete feedback
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes:**
- `user_id`
- `workout_date` (calendar queries)

---

#### `benchmark_results`

Benchmark WOD performance tracking.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users, nullable for now)
- `benchmark_name` (TEXT) - e.g., "Fran", "Helen"
- `result` (TEXT) - time or rounds
- `scaling` (TEXT) - Rx, Sc1, Sc2, Sc3 (added in v2)
- `notes` (TEXT, nullable)
- `workout_date` (DATE)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes:**
- `user_id`
- `benchmark_name` (grouping)

**Constraint:**
- `scaling` CHECK (IN ('Rx', 'Sc1', 'Sc2', 'Sc3'))

---

#### `lift_records`

Barbell lift tracking with multiple rep max types.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users, nullable for now)
- `lift_name` (TEXT) - e.g., "Back Squat"
- `weight_kg` (DECIMAL(6,2))
- `reps` (INTEGER, default 1)
- `rep_max_type` (TEXT) - 1RM, 3RM, 5RM, 10RM (added in v2)
- `calculated_1rm` (DECIMAL(6,2)) - Brzycki formula result
- `notes` (TEXT, nullable)
- `lift_date` (DATE)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes:**
- `user_id`
- `lift_name` (grouping)
- `lift_date` (chronological queries)
- `rep_max_type` (filtering)

**Constraint:**
- `rep_max_type` CHECK (IN ('1RM', '3RM', '5RM', '10RM', 'Other'))

---

### Row Level Security (RLS)

**Status:** Enabled on all tables

**Current Policies:**
- **PUBLIC policies** (temporary for development)
  - Allow SELECT, INSERT, UPDATE, DELETE for all users
  - Used while sessionStorage auth is active

**Production Policies (Ready to Activate):**
- **User-specific policies** based on `auth.uid()`
  - Athletes can only access their own data
  - Coaches can access all data (will need coach role check)

**Migration Plan:**
1. Implement Supabase Auth
2. Update all `user_id` fields with actual user IDs
3. Drop PUBLIC policies
4. Activate user-specific policies
5. Test data isolation

---

## The Scaling System

### Purpose

Track workout modifications for different athlete skill levels.

### Scaling Levels

**Rx (As Prescribed):**
- Standard benchmark weights and movements
- No modifications
- Competition standard

**Sc1 (Scaling Level 1):**
- Slight modifications
- Reduced weights (10-20%)
- Movement substitutions (e.g., band pull-ups)

**Sc2 (Scaling Level 2):**
- Moderate modifications
- Reduced weights (30-50%)
- Simpler movement variations

**Sc3 (Scaling Level 3):**
- Significant modifications
- Reduced weights (50%+)
- Beginner-friendly movements

### Implementation

**Location:** Benchmark Workouts tab

**UI:** Dropdown in benchmark logging modal

**Database:** `scaling` column in `benchmark_results` table

**Constraint:** CHECK (scaling IN ('Rx', 'Sc1', 'Sc2', 'Sc3'))

**Display:**
- Badge in recent history
- Included in chart tooltips
- Allows tracking improvement within scaling levels

---

## The Track System

### Purpose

Categorize workouts by training focus/domain for balanced programming.

### Default Tracks

1. **Strength Focus**
   - Heavy barbell work
   - Low-rep, high-weight schemes
   - Strength bias

2. **Endurance Focus**
   - Longer time domains (20+ min)
   - Aerobic conditioning
   - Sustained effort

3. **Gymnastics Focus**
   - Bodyweight skills
   - Skill work emphasis
   - Movement quality

4. **Olympic Lifting**
   - Snatch, Clean & Jerk variations
   - Technical Olympic lifts
   - Power development

5. **Mixed Modal**
   - Combines multiple domains
   - Classic CrossFit style
   - Variety emphasis

6. **Benchmark WOD**
   - Named CrossFit benchmarks
   - Standardized for comparison
   - Testing workouts

### Features

**Color Coding:**
- Each track has unique color (hex code)
- Displayed as badges on WOD cards
- Visual programming balance

**Analytics Integration:**
- Track Breakdown in Analysis page
- Shows workout distribution across tracks
- Helps identify programming gaps

**Coach Management:**
- Create custom tracks
- Edit track details (name, description, color)
- Delete unused tracks

---

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account (free tier works)
- Git (for version control)

### Local Development Setup

**1. Clone Repository**
```bash
git clone https://github.com/Percepto25/FFF.git
cd FFF
```

**2. Install Dependencies**
```bash
npm install
```

**3. Configure Supabase**

Create `.env.local` file in project root:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xvrefulklquuizbpkppb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Get Supabase credentials:**
1. Log into Supabase dashboard
2. Select your project
3. Go to Settings → API
4. Copy Project URL and anon/public key

**4. Run Database Migrations**

Execute SQL files in Supabase SQL Editor in order:

1. **Coach Tables:**
   - Create `exercises` table and seed data
   - Create `tracks` table and seed data
   - Create `workout_types` table and seed data
   - Create `wods` table

2. **Athlete Tables:**
   ```bash
   supabase-athlete-tables.sql
   ```

3. **Updates/Migrations:**
   ```bash
   supabase-lift-records-update.sql
   supabase-benchmark-scaling-update.sql
   ```

**5. Start Development Server**
```bash
npm run dev
```

**6. Access Application**
- Navigate to `http://localhost:3000`
- Login screen appears
- Choose Coach or Athlete role
- Enter name and start using the app

---

### Production Deployment (Vercel)

**1. Push to GitHub**
```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

**2. Connect to Vercel**
1. Log into Vercel dashboard
2. Click "New Project"
3. Import from GitHub
4. Select repository

**3. Configure Environment Variables**

Add in Vercel project settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**4. Deploy**
- Vercel auto-deploys on every push to main
- Production URL provided after deployment

**5. Enable Supabase Auth (Future)**
- Configure Auth providers in Supabase
- Update redirect URLs for production
- Migrate from sessionStorage to proper auth

---

## Troubleshooting

### Common Issues

#### Issue: "No WODs showing in calendar"

**Possible Causes:**
1. No WODs created yet
2. Date range doesn't include created WODs
3. Database connection issue

**Solutions:**
1. Create a WOD using "Add WOD" button
2. Navigate to different weeks/months
3. Check `.env.local` Supabase credentials
4. Verify Supabase project is active

---

#### Issue: "Exercise library not loading"

**Possible Causes:**
1. `exercises` table not created
2. No exercise data seeded
3. Database permissions issue

**Solutions:**
1. Run exercise table creation SQL
2. Seed exercise data using provided SQL script
3. Check RLS policies allow PUBLIC access (development)
4. Verify Supabase connection in Network tab

---

#### Issue: "Athlete data not saving"

**Possible Causes:**
1. Tables not created
2. RLS policies too restrictive
3. Network/connection error

**Solutions:**
1. Run `supabase-athlete-tables.sql`
2. Verify PUBLIC policies exist for development
3. Check browser console for error messages
4. Test Supabase connection manually

---

#### Issue: "Charts not displaying data"

**Possible Causes:**
1. No data logged for selected item
2. Result format not parseable (benchmarks)
3. Recharts library not installed

**Solutions:**
1. Log at least 2 entries for trend line
2. Use standard formats (e.g., "5:42" for time)
3. Run `npm install recharts`
4. Check console for JavaScript errors

---

#### Issue: "Date showing wrong day in calendar"

**Possible Causes:**
1. Timezone mismatch
2. Date comparison issue

**Solution:**
- This was fixed in commit c23f788
- Ensure you have latest code
- Date handling now uses UTC normalization

---

#### Issue: "Can't delete WOD/benchmark/lift"

**Possible Causes:**
1. Confirmation dialog not appearing
2. Database permissions
3. Foreign key constraint

**Solutions:**
1. Check browser pop-up blocker settings
2. Verify RLS policies allow DELETE
3. Check for dependent records (logs referencing WOD)

---

### Database Issues

#### Reset Database Tables

**Warning:** This deletes all data!

```sql
-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS lift_records CASCADE;
DROP TABLE IF EXISTS benchmark_results CASCADE;
DROP TABLE IF EXISTS workout_logs CASCADE;
DROP TABLE IF EXISTS athlete_profiles CASCADE;
DROP TABLE IF EXISTS wods CASCADE;
DROP TABLE IF EXISTS workout_types CASCADE;
DROP TABLE IF EXISTS tracks CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;
```

Then re-run all migration scripts.

---

#### Check RLS Policies

```sql
-- View all policies on a table
SELECT * FROM pg_policies WHERE tablename = 'wods';

-- Drop specific policy
DROP POLICY "policy_name" ON table_name;

-- Recreate PUBLIC policy for development
CREATE POLICY "PUBLIC can view all" ON table_name
  FOR SELECT USING (true);
```

---

### Performance Issues

#### Slow WOD Modal Opening

**Already Fixed:** Exercise library now cached after first load

**Verify:** Modal should open instantly on second+ opening

---

#### Slow Calendar Rendering

**Possible Causes:**
1. Too many WODs in month view
2. Large WOD content in sections
3. Many drag-and-drop elements

**Solutions:**
1. Limit WOD display in monthly view (already shows max 2)
2. Consider pagination for very long timeframes
3. Optimize re-renders with React.memo if needed

---

### Development Tips

#### Enable Supabase Logs

In Supabase dashboard → Logs → select table → view queries

**Useful for:**
- Debugging query errors
- Checking RLS policy application
- Monitoring performance

---

#### Browser Console Debugging

**Key error patterns:**

1. **"Failed to fetch"** → Network issue or CORS
2. **"RLS policy violation"** → Permission issue
3. **"Null reference"** → Data not loaded yet
4. **"Cannot read property X"** → State initialization issue

---

#### Test Database Queries Directly

Use Supabase SQL Editor to test queries:

```sql
-- Test athlete profile fetch
SELECT * FROM athlete_profiles WHERE id = 'your-id';

-- Test WOD fetch for date
SELECT * FROM wods WHERE date = '2025-10-16';

-- Test lift PR fetch
SELECT * FROM lift_records
WHERE lift_name = 'Back Squat'
  AND rep_max_type = '1RM'
ORDER BY calculated_1rm DESC
LIMIT 1;
```

---

## Future Enhancements

### Planned Features

1. **Supabase Auth Integration**
   - Replace sessionStorage with real authentication
   - User registration and login
   - Password reset functionality
   - Multi-user support with data isolation

2. **Athlete Class Registration**
   - View class schedule with capacity
   - Sign up for classes
   - Waitlist management
   - Check-in system

3. **Coach-Athlete Communication**
   - Messaging system
   - Workout feedback loop
   - Programming notes visible to athletes

4. **Advanced Analytics**
   - Volume tracking over time
   - Movement frequency analysis
   - Athlete progress reports
   - Leaderboards (opt-in)

5. **Mobile App**
   - React Native version
   - Offline workout logging
   - Push notifications for class reminders

6. **Video Integration**
   - Exercise library with videos
   - Movement demo links in WOD sections
   - Coach-uploaded form check videos

7. **Nutrition Tracking**
   - Macro logging
   - Meal planning
   - Integration with workout logs

---

## Support and Documentation

### Additional Resources

- **Memory Bank:** `/memory-bank/` directory
  - `memory-bank-activeContext.md` - Recent changes and current state
  - `memory-bank-systemPatterns.md` - Development patterns and lessons
  - `memory-bank-techContext.md` - Technical setup and stack

- **Workflow Guide:** `/memory-bank/workflow-protocols.md`
  - Token-efficient development practices
  - When to use agents vs direct work
  - Database migration procedures

- **GitHub Repository:** https://github.com/Percepto25/FFF

### Getting Help

For issues or questions:
1. Check this reference guide
2. Review Memory Bank files for recent changes
3. Check Troubleshooting section above
4. Review Git commit history for relevant changes
5. Examine browser console for error details

---

*Last Updated: 2025-10-16*
*Version: 1.0*
*Documentation maintained as part of Forge Functional Fitness development*
