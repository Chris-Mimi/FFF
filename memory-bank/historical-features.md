# Historical Features

**Version:** 1.0
**Purpose:** Quick reference of major features implemented in this codebase

---

## Core Infrastructure

- **Authentication System** - Supabase Auth with role-based access (coach/member/athlete)
- **Database Schema** - 22+ tables with RLS policies
- **Backup System** - Automated JSON backups with restore capability
- **Google Calendar Integration** - Publish workouts to public calendar

---

## Coach Features

### Workout Programming
- **Calendar System** - Weekly/monthly views with drag-and-drop
- **WOD Builder** - Multi-section workouts (Warm-up, Skill, WOD Pt.1-6, etc.)
- **Movement Library** - 800+ exercises with video links, categories, search
- **Benchmark Library** - CrossFit benchmarks (Fran, Murph, etc.) + Forge custom benchmarks
- **Barbell Lifts Library** - Olympic lifts with variable reps/percentages
- **Programming Notes** - Markdown notes with folders, drag-and-drop organization
- **Workout Naming** - Named workouts with ISO week tracking
- **Quick Edit** - Edit workouts inline without opening modal
- **Workout Library** - Search/filter past workouts by movements, tracks, types, session types

### Analysis & Planning
- **Movement Analytics** - Track exercise frequency across time periods
- **Duration Distribution** - Visualize workout length patterns
- **Section Type Usage** - See which section types are used most
- **Workout Deduplication** - Accurate counts for repeated workouts

### Session Management
- **Session Templates** - Weekly schedule templates
- **Booking System** - Capacity tracking, waitlist management
- **Manual Booking Panel** - Coach can book members for sessions
- **Session Info Panel** - Capacity, time, status management (0 = unlimited capacity)

### Member Management
- **Member Approval Workflow** - Review pending registrations
- **Trial Management** - 30-day trial grants (separate from approval)
- **Stripe Payments** - Monthly/yearly subscriptions + 10-card punchcards
- **Payment Tab** - Coach view of all member payment statuses

### Reference Tools
- **Resources Tab** - Links to external resources (video tutorials, articles)
- **Naming Conventions** - Standard abbreviations and terminology
- **Whiteboard Photos** - Upload/manage weekly whiteboard photos with auto-parsing

---

## Member Features

- **Self-Registration** - Create account awaiting coach approval
- **Book a Class** - View/book available sessions for the week
- **Family Members** - Primary accounts can add family members (shared subscription)
- **Filter Sessions** - Toggle between "All" and "Booked" views

---

## Athlete Features

### Performance Tracking
- **Workout Logbook** - Day/week/month views with results entry
- **Benchmark Results** - Track CrossFit benchmark PRs with scaling levels
- **Forge Benchmark Results** - Custom gym benchmark tracking
- **Lift Records** - 1RM/3RM/5RM/10RM tracking with calculated 1RM
- **Progress Visualization** - Recharts graphs for benchmarks/lifts over time
- **Whiteboard Photos** - View weekly whiteboard photos

### Workout Access
- **Published Workouts** - Weekly view of booked workout details
- **Access Tiers** - FREE (Profile, Payment, Security, Book) vs PAID (Workouts, Logbook, Benchmarks, etc.)
- **Trial System** - 30-day trial for full access
- **Subscription Management** - Stripe customer portal integration

---

## Mobile Optimization

- **Responsive Design** - All pages optimized for mobile (text-[10px] sm:text-xs md:text-base pattern)
- **Touch Sensors** - Drag-and-drop works on mobile with @dnd-kit TouchSensor
- **Collapsible Drawers** - Programming notes, family members, etc.
- **Full-Screen Modals** - Movement library, exercise videos, photos on mobile
- **Compact Navigation** - Icon-only buttons, shortened labels on small screens

---

## System Features

- **RLS Policies** - Row-level security on all athlete/member data
- **Coach Permissions** - Role-based access via JWT claims
- **Email Confirmation** - Auto-confirmed for admin-created accounts
- **Metric Units** - Enforced kg/cm/meters throughout
- **ISO Week Calculation** - UTC-based (Jan 4 always in Week 1, Thursday determines week)
- **Database Triggers** - Auto-calculate workout_week on INSERT/UPDATE
- **Search Utilities** - Regex escaping, word boundary matching, phrase matching
- **GIN Indexes** - Full-text search on exercises with search_vector

---

## UI/UX Patterns

- **Drag-and-Drop** - Workout sections, programming notes, benchmark/lift ordering
- **Modal System** - Draggable/resizable modals with desktop-only features
- **Hover Popovers** - Preview workout details on calendar cards
- **Loading States** - Skeletons, spinners, empty states throughout
- **Error Handling** - User-friendly messages, graceful degradation
- **Coach Notes** - Markdown preview/edit with formatting toolbar
- **Date Navigation** - Previous/Today/Next with responsive sizing
- **Filter Systems** - Tracks, workout types, session types, equipment, body parts

---

**Total Sessions:** 91 (Dec 23, 2025 → Feb 4, 2026)
**Lines of Code:** ~50,000+ (estimated)
**Database Tables:** 22 core tables
**API Routes:** 15+ Next.js API routes
