# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**Forge Functional Fitness** - A member management and workout scheduling system for a functional fitness gym. The app provides different interfaces for coaches and athletes, with features for WOD (Workout of the Day) management, class scheduling, and member bookings.

**Tech Stack:**
- Next.js 15.5.4 (App Router)
- React 19.1.0
- TypeScript 5+
- Tailwind CSS 4
- Lucide React (icons)
- @dnd-kit/* (drag-and-drop functionality)

**Target Platform:** Web app (desktop and mobile responsive)

---

## Development Commands

### Essential Commands

```bash
# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

### Installing Dependencies

```bash
# Add new dependency
npm install <package-name>

# Add dev dependency
npm install -D <package-name>
```

---

## Project Architecture

### App Structure

This project uses **Next.js App Router** with the following structure:

```
app/
├── layout.tsx          # Root layout with fonts and global styles
├── page.tsx            # Login page (role selection)
├── coach/
│   └── page.tsx        # Coach dashboard (weekly WOD calendar)
├── athlete/            # [To be implemented]
│   └── page.tsx        # Athlete dashboard
└── globals.css         # Global Tailwind CSS styles

components/
└── WODModal.tsx        # WOD creation/editing modal with sections
```

### Key Architectural Patterns

**1. Client-Side Routing & Authentication**
- All dashboard pages use `'use client'` directive
- Simple sessionStorage-based auth (to be replaced with proper auth)
- Role-based routing: `/coach` for coaches, `/athlete` for athletes
- Protected routes check `sessionStorage.getItem('userRole')` on mount

**2. State Management**
- Currently using React `useState` for local state
- WOD data stored in coach dashboard state as `Record<string, WODFormData[]>` keyed by date (YYYY-MM-DD format)
- No global state management library yet
- Future: Consider adding context or state management as app grows

**3. Component Pattern**
- Main pages in `app/` directory using Next.js App Router
- Reusable components in `/components` directory
- Components use Tailwind CSS for styling
- Modal pattern: WODModal is a controlled component with `isOpen`, `onClose`, `onSave` props

**4. Color Scheme**
- Primary: `#208479` (teal/green)
- Primary hover: `#1a6b62` (darker teal)
- Background: `bg-gray-50`
- Accent colors: gray scale for secondary UI elements
- Today indicator: teal ring around current day in calendar

**5. WOD Data Structure**
- WODs organized by sections (Warm-up, Strength, WOD, etc.)
- Each section has: type, duration (minutes), and free-form content (markdown-style)
- Duration tracking shows elapsed time per section (e.g., "mins 0-5")
- Total duration calculated and displayed automatically

### Database Architecture (Planned)

The app is designed to work with **PostgreSQL via Supabase** with these key entities:

**Core Tables:**
- `members` - Gym members (both coaches and athletes)
- `workouts` - WOD definitions with class times
- `bookings` - Member bookings for specific workouts
- `waitlist` - Waitlist entries when classes are full
- `attendance` - Attendance tracking

**Key Business Rules:**
- **Booking Cutoffs:** AM classes (16 hours before), PM classes (10 hours before)
- **Cancellation Cutoffs:** Same as booking cutoffs
- **Waitlist Auto-Promotion:** When someone cancels, first person on waitlist automatically gets the spot
- **Max Capacity:** Configurable per workout (typically 12-15)

---

## Important Implementation Notes

### Authentication Flow
1. User selects role on login page (`/`)
2. Role and name stored in `sessionStorage`
3. User redirected to role-specific dashboard
4. Dashboard checks session on mount, redirects to `/` if invalid

**TODO:** Replace sessionStorage with proper authentication (Supabase Auth recommended)

### Coach Dashboard (app/coach/page.tsx)
- **Weekly Calendar View:** Displays Monday-Sunday grid
- **WOD Management:** Add, edit, delete workouts per day
- **Navigation:** Previous/Next week buttons, updates selectedDate state
- **Today Indicator:** Current day highlighted with teal ring (ring-2 ring-[#208479])
- **Date Formatting:** Uses `formatDate()` to create YYYY-MM-DD keys for WOD storage
- **Week Calculation:** `getWeekDates()` finds Monday (day 1) and adds 6 more days

### WOD Modal Component (components/WODModal.tsx)

The WOD modal is the core feature for creating/editing workouts:

**Key Features:**
- **Multi-section workouts:** Users add sections (Warm-up, Strength, WOD, etc.)
- **Exercise library:** Searchable popup with categorized exercises
- **Time tracking:** Each section has duration, shows elapsed time ranges
- **Class times:** Toggle buttons for predefined class times (9:00, 10:00, 11:00, 15:00, 16:00, 17:15, 18:30)
- **Max capacity:** Configurable per WOD (default: 12, range: 1-30)
- **Form validation:** Title, class times, and sections required

**Data Types:**
```typescript
interface WODSection {
  id: string;           // Unique ID (Date.now() timestamp)
  type: string;         // Section type from SECTION_TYPES
  duration: number;     // Minutes
  content: string;      // Free-form markdown text
}

interface WODFormData {
  id?: string;          // Optional ID for existing WODs
  title: string;        // WOD title
  classTimes: string[]; // Array of selected class times
  maxCapacity: number;  // Max attendees
  date: string;         // ISO date string (YYYY-MM-DD)
  sections: WODSection[];
}
```

**Exercise Library:**
- Categories: Warm-up, Strength, MetCon, Gymnastics, Stretches
- Search filters across all categories
- Clicking exercise adds it to active section as bullet point
- Z-index layering: Exercise library (z-60) above main modal (z-50)

**Section Management:**
- Add section: Creates new section with default type "Warm-up" and 5 min duration
- Update section: Modifies section by ID in sections array
- Delete section: Removes section, recalculates total duration
- Duration display: Shows "mins X-Y" based on cumulative duration

### Styling Approach
- **Tailwind CSS 4** with JIT mode
- Custom colors defined inline (consider moving to `tailwind.config.js`)
- Responsive design using Tailwind's responsive prefixes (`md:`, `lg:`)
- Font: Geist (sans) and Geist Mono loaded via `next/font/google`
- Modal overlay: `fixed inset-0 bg-black bg-opacity-50`
- Focus states: `focus:ring-2 focus:ring-[#208479] focus:border-transparent`

### Path Aliases
- `@/*` maps to project root (configured in `tsconfig.json`)
- Use `@/components/...` for component imports (e.g., `import WODModal from '@/components/WODModal'`)

---

## Common Development Tasks

### Adding a New Page
1. Create file in `app/[route]/page.tsx`
2. Add `'use client'` if using client-side features (hooks, event handlers, etc.)
3. Implement auth check if page is protected:
   ```typescript
   useEffect(() => {
     const role = sessionStorage.getItem('userRole');
     if (!role || role !== 'expectedRole') {
       router.push('/');
     }
   }, [router]);
   ```
4. Add navigation links from existing pages

### Adding Components
1. Components directory already exists at `/components`
2. Create component file: `components/ComponentName.tsx`
3. Add `'use client'` directive at top if needed
4. Export as default: `export default function ComponentName() { ... }`
5. Import using `@/components/ComponentName`

### Modifying the WOD Modal
The WOD modal (components/WODModal.tsx) is complex with nested components:
- **ExerciseLibraryPopup:** Separate modal for exercise selection (lines 102-226)
- **WODSectionComponent:** Individual section editor (lines 228-316)
- **WODModal:** Main modal component (lines 318-633)

When editing:
- Exercise library data: Update `EXERCISE_LIBRARY` constant (lines 53-99)
- Class times: Update `CLASS_TIME_OPTIONS` constant (lines 42-50)
- Section types: Update `SECTION_TYPES` constant (lines 30-40)

### Modifying Color Scheme
Current primary color `#208479` is used throughout. To change:
1. Find all instances: Search for `#208479` and `#1a6b62` (hover state)
2. Consider extracting to Tailwind config for consistency
3. Locations: Coach dashboard header, buttons, modals, focus states

### Working with Icons
```typescript
import { IconName } from 'lucide-react';

<IconName size={20} />  // Standard icon size
```

Used icons: LogOut, Plus, Edit2, Trash2, X, Search, Library

---

## Known Issues & Decisions

### Current Limitations
1. **Auth:** Using sessionStorage (temporary solution, not secure)
2. **Data Persistence:** No backend connected - WOD state lost on page refresh
3. **No Database:** Mock data structures in place, needs Supabase integration
4. **No API Routes:** To be implemented in `app/api/`
5. **Athlete Dashboard:** Not implemented yet (app/athlete/page.tsx placeholder)
6. **Drag-and-Drop:** @dnd-kit installed but not yet integrated (planned for section reordering)

### Architectural Decisions
- **Why Next.js 15?** Modern framework with App Router, excellent TypeScript support, RSC support
- **Why sessionStorage for now?** Quick prototyping, to be replaced with Supabase Auth
- **Why Tailwind?** Rapid UI development, good for responsive design, consistent styling
- **Why App Router over Pages?** Modern Next.js pattern, better TypeScript support, file-based routing
- **Why free-form content sections?** Flexibility for coaches to structure workouts their way, simpler than strict exercise templates

---

## Memory Bank Integration

This project uses the **Memory Bank System** for session continuity. Always check:

```
memory-bank/
├── memory-bank-activeContext.md    # Current work and recent changes
├── memory-bank-techContext.md      # Technical setup and dependencies
└── memory-bank-systemPatterns.md   # Patterns and business logic
```

**Before starting work:**
1. Read all three Memory Bank files
2. Check for context about current features
3. Follow established patterns

**When significant work is done:**
1. Update relevant Memory Bank files
2. Increment version numbers
3. Update timestamps

---

## Testing Strategy

**Current State:** No tests implemented

**Future Testing:**
- Unit tests for utility functions (date formatting, week calculation)
- Component tests for WOD modal, exercise library
- Integration tests for booking logic
- E2E tests for critical user flows (WOD creation, booking, cancellation)
- Consider: Jest + React Testing Library + Playwright for E2E

---

## Deployment Notes

**Current:** Local development only

**Future Deployment:**
- Recommended: Vercel (seamless Next.js deployment)
- Environment variables needed:
  - Supabase URL and anon key
  - Database connection string
- Ensure `.env.local` is in `.gitignore` (already should be)
- Production build command: `npm run build` (outputs to `.next/` directory)

---

## Code Patterns to Follow

### Date Handling
```typescript
// Always format dates as YYYY-MM-DD for consistency
const formatDate = (date: Date) => date.toISOString().split('T')[0];

// Week calculation (Monday-based)
const getWeekDates = () => {
  const curr = new Date(selectedDate);
  const first = curr.getDate() - curr.getDay() + 1; // Monday
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(curr.setDate(first + i));
    dates.push(date);
  }
  return dates;
};
```

### Modal State Management
```typescript
// Always control modal visibility with state
const [isModalOpen, setIsModalOpen] = useState(false);

// Pass date and editing state to modal
<WODModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  onSave={handleSaveWOD}
  date={modalDate}
  editingWOD={editingWOD}
/>
```

### Form Validation Pattern
```typescript
// Use error object keyed by field name
const [errors, setErrors] = useState<Record<string, string>>({});

const validate = (): boolean => {
  const newErrors: Record<string, string> = {};
  if (!formData.title.trim()) {
    newErrors.title = 'Title is required';
  }
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

---

*Last Updated: 2025-10-13*
*Project Version: Early Development - Coach Dashboard Complete*
