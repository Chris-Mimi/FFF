# Session History

Detailed implementation records for major features and bug fixes.

---

## Session: 2025-11-05 - Database-Driven Benchmarks & Lifts Management

**Duration:** ~90 minutes
**Context Usage:** ~50%
**Commit:** `36352ec` - feat: add database-driven benchmark and lift management system

### Overview
Converted hardcoded benchmark workout and barbell lift arrays into coach-manageable database tables with full CRUD interface. Enables coaches to customize benchmark lists without code changes.

### Database Migrations

**1. Core Tables Migration** (`20251105_add_benchmark_and_lift_tables.sql`)
- Created `benchmark_workouts` table (name, type, description, display_order)
- Created `barbell_lifts` table (name, category, display_order)
- Seeded 21 CrossFit benchmarks (Fran, Helen, Murph, etc.)
- Seeded 11 barbell lifts (Back Squat, Deadlift, etc.)
- Public read access RLS policies

**2. Coach Permissions** (`20251105_add_coach_permissions_benchmarks_lifts.sql`)
- INSERT/UPDATE/DELETE policies for coaches on both tables
- Uses `auth.jwt() -> 'user_metadata' ->> 'role'` check

**3. Forge Benchmarks Table** (`20251105_add_forge_benchmarks.sql`)
- Separate table for gym-specific benchmarks
- Same structure as benchmark_workouts
- Allows gym to track custom WODs separately from CrossFit standards

**4. Description Fix** (`20251105_fix_newlines_in_descriptions.sql`)
- Replaced literal `\n` text with actual newline characters
- SQL: `REPLACE(description, E'\\n', E'\n')`

### Frontend Implementation

**Coach Management Page** (`app/coach/benchmarks-lifts/page.tsx`)
- Three-tab interface: Benchmark Workouts | Forge Benchmarks | Barbell Lifts
- Modal forms for add/edit with all fields
- Delete with confirmation dialogs
- Display order management
- Type/category dropdown selectors
- Modal z-index fix: `z-[9999]` on container, `stopPropagation()` on content

**Coach Dashboard** (`app/coach/page.tsx`)
- Added "Benchmarks & Lifts" navigation button with Dumbbell icon
- Positioned between "Analysis" and "Logout"

**Athlete Page Updates** (`app/athlete/page.tsx`)
- BenchmarksTab: Replaced hardcoded array with database fetch from `benchmark_workouts`
- LiftsTab: Replaced hardcoded array with database fetch from `barbell_lifts`
- Both use `useEffect` to fetch on component mount
- Sort by `display_order` for coach-controlled sequencing

### Technical Patterns Established

**Modal Structure (Standard Pattern)**
```tsx
<div className='fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4'
     onClick={closeModal}>
  <div className='bg-white rounded-lg max-w-lg w-full p-6 shadow-2xl'
       onClick={(e) => e.stopPropagation()}>
    {/* Form content */}
  </div>
</div>
```

**Database Fetch Pattern**
```tsx
const [items, setItems] = useState<Item[]>([]);

useEffect(() => {
  fetchItems();
}, []);

const fetchItems = async () => {
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) throw error;
  setItems(data || []);
};
```

### Issues Encountered & Solutions

**Issue 1: Modal showing only black background**
- Problem: Complex z-index layering with separate backdrop div
- Solution: Simplified to single container with `z-[9999]` and `stopPropagation()` on content
- Key: Container gets backdrop styling, content gets click handler to prevent close

**Issue 2: Input fields appearing greyed out**
- Problem: Missing explicit background and text color
- Solution: Added `bg-white text-gray-900` to all inputs and textareas
- Also added `cursor-pointer` to select dropdowns for UX clarity

**Issue 3: Literal \n in descriptions**
- Problem: PostgreSQL stored `\n` as literal text, not newline
- Solution: SQL migration using `REPLACE(description, E'\\n', E'\n')`
- Applied with `WHERE description LIKE '%\n%'` to target affected rows

**Issue 4: Browser caching old modal structure**
- Problem: User saw no changes after multiple code updates
- Solution: Hard refresh (Cmd+Shift+R / Ctrl+Shift+R) cleared cache
- Note: User hard refreshes by default, doesn't need reminders

### Files Modified

**Created:**
- `app/coach/benchmarks-lifts/page.tsx` (866 lines) - Full CRUD interface
- `supabase/migrations/20251105_add_benchmark_and_lift_tables.sql`
- `supabase/migrations/20251105_add_coach_permissions_benchmarks_lifts.sql`
- `supabase/migrations/20251105_add_forge_benchmarks.sql`
- `supabase/migrations/20251105_fix_newlines_in_descriptions.sql`

**Modified:**
- `app/coach/page.tsx` - Added navigation button
- `app/athlete/page.tsx` - Database fetching for benchmarks and lifts

### Feature Status
✅ **Complete** - Coach can fully manage all three lists, athletes see dynamic data

---

## Session: 2025-11-04 (Continued) - Family Accounts Phases 5-6

**Duration:** ~2 hours
**Context Usage:** ~45%
**Commits:** Multiple commits covering subscription gating and booking badges

### Phase 5: Subscription Gating for Family Members

**Problem:** Athlete page subscription check only worked for primary members, not family members who need to inherit from primary.

**Solution:**
- Updated athlete page to use RPC function `get_primary_subscription_status`
- Function checks if user is primary or family_member type
- Returns primary member's subscription data for family members
- Code: `app/athlete/page.tsx` lines 72-93

**Testing:**
- Primary member with active subscription: ✅ Access granted
- Primary member with expired trial: ✅ Blocked
- Family member (subscription inherited): ✅ Access granted
- Family member (primary expired): ✅ Blocked

### Phase 6: Booking Badges ("Booked for [Name]")

**Goal:** Show blue badges on booking cards indicating which family member has a booking.

**Implementation Journey:**

**Attempt 1: Nested Join (Failed)**
- Query: `bookings (member_id, members (display_name))`
- Problem: RLS policies blocked nested access to other family members' data

**Attempt 2: Local Data Matching (Success)**
- Fetch bookings with just `member_id`
- Match against locally-fetched `familyMembers` array
- Local data already passed RLS, so no access issues
- Code: `app/member/book/page.tsx` lines 172-186

**Display Name Logic:**
```tsx
let displayName = 'Unknown';
if (member?.display_name) {
  displayName = member.display_name;
} else if (member?.name) {
  displayName = member.name.split(' ')[0]; // First name only
}
```

**Authorization Issue:**
- Family members couldn't cancel their own bookings
- Fixed: Added `primary_member_id` check in cancel API
- Code: `app/api/bookings/cancel/route.ts` lines 68-94

**UI Improvements:**
- Primary member button shows just "You" instead of full name + badge
- Badge rendering: `<span>Booked for {booking.name}</span>`
- Changed "Add Member" button to "Add Family Member" for clarity

### Additional Fixes in This Session

**Dropdown Styling** (`app/athlete/page.tsx` line 221)
- Added `bg-white`, `text-gray-900`, `cursor-pointer`
- Fixed greyed-out appearance

**Workout Count Badges** (lines 1018-1032)
- Added to both week view and month view in logbook
- Format: `{count} workout(s)` in teal badge

**Member Page Display Names** (`app/coach/members/page.tsx`)
- Updated to show `display_name` with fallback to `name`
- Consistent with booking UI pattern

### Technical Patterns

**RLS Workaround Pattern:**
```tsx
// Don't do nested joins when RLS might block:
// bookings.members.display_name ❌

// Instead, fetch separately and join client-side:
const familyMembers = await fetchFamilyMembers(); // RLS allows
const bookings = await fetchBookings(); // Just IDs
const enriched = bookings.map(b => ({
  ...b,
  memberName: familyMembers.find(fm => fm.id === b.member_id)?.display_name
})); // ✅
```

**Name Display Fallback Chain:**
1. `display_name` (custom nickname)
2. `name.split(' ')[0]` (first name from full name)
3. `'Unknown'` (ultimate fallback)

### Files Modified
- `app/member/book/page.tsx` - Badge logic, authorization, UI text
- `app/api/bookings/cancel/route.ts` - Family member authorization
- `app/athlete/page.tsx` - Dropdown styling, workout count badges
- `app/coach/members/page.tsx` - Display name support

### Feature Status
✅ **Complete** - All 6 phases of family accounts fully implemented and tested

---

## Session: 2025-11-04 - Family Accounts Phase 4

**Duration:** ~3 hours
**Context Usage:** ~60%
**Commit:** `1f3239a` - feat: implement multi-profile athlete page with complete data isolation

### Overview
Implemented profile selector dropdown in athlete page header allowing primary members to switch between their own profile and family members' profiles with complete data isolation.

### Implementation Details

**State Management:**
- Added `activeProfileId` state (defaults to authenticated user ID)
- Added `familyMembers` state (fetched from database)
- Profile selector dropdown in header with family member names

**Data Isolation:**
- All tabs filter by `activeProfileId` instead of hardcoded `user.id`
- Workouts tab: `user_id = activeProfileId`
- Logbook tab: `user_id = activeProfileId`
- Benchmarks tab: `user_id = activeProfileId`
- Lifts tab: `user_id = activeProfileId`
- Records tab: `user_id = activeProfileId`

**UI Updates:**
- Dropdown shows "You" for primary member, names for family members
- Instant data refresh when profile changes
- All components respect active profile selection

**RLS Considerations:**
- Queries use authenticated user's session
- Data filtering happens via explicit `user_id` filter in queries
- Family members' data accessible because they share `primary_member_id`

### Files Modified
- `app/athlete/page.tsx` - Profile selector, state management, data filtering

### Feature Status
✅ **Complete** - Multi-profile switching works with full data isolation

---

## Session: 2025-11-04 - Family Accounts Phases 1-3

**Duration:** ~4 hours
**Context Usage:** ~65%
**Commit:** `3401cd9` - docs: update Memory Bank to v3.2 with family accounts phases 1-3

### Overview
Complete implementation of family member booking system with database schema, RLS policies, booking API updates, and UI for managing family members.

### Database Schema

**Migration:** `supabase/migrations/20251104_add_family_accounts.sql`

**New Columns in `members` table:**
- `account_type` TEXT ('primary' | 'family_member')
- `primary_member_id` UUID (references members.id)
- `display_name` TEXT (nickname for family members)
- `date_of_birth` DATE
- `relationship` TEXT ('self' | 'spouse' | 'child' | 'other')

**RLS Policies:**
- Users can view their own family members (`primary_member_id = auth.uid()`)
- Users can CRUD their own family member records
- Family members cannot create other family members

### Booking API Updates

**`/api/bookings/create/route.ts`:**
- Accepts `memberId` parameter
- Validates family relationships before booking
- Checks if `memberId` is either user's own ID or a family member's ID
- Creates booking with correct `member_id`

### UI Implementation

**Family Member Management** (`app/member/book/page.tsx`)
- Compact selectable card UI (replaced dropdown)
- Cards show name, relationship, age
- Badges: "Primary", "You", family member names
- Inline edit and delete buttons
- Add family member modal with form fields

**Booking Flow:**
- Select family member card
- Click Book Session
- Badge shows "You" for primary member bookings
- Booking linked to selected `memberId`

### Technical Patterns

**Family Member Fetch:**
```tsx
const { data, error } = await supabase
  .from('members')
  .select('id, name, display_name, date_of_birth, relationship, account_type')
  .or(`id.eq.${user.id},primary_member_id.eq.${user.id}`)
  .order('account_type', { ascending: false });
```

**Relationship Validation:**
```tsx
const canBook =
  memberId === user.id || // Own booking
  familyMembers.some(fm =>
    fm.id === memberId &&
    fm.primary_member_id === user.id
  ); // Family member booking
```

### Files Modified
- `supabase/migrations/20251104_add_family_accounts.sql` (migration)
- `app/api/bookings/create/route.ts` (authorization)
- `app/member/book/page.tsx` (UI and state management)

### Feature Status
✅ **Complete** - Primary members can book for themselves and family members

---

*For older sessions, see git history or previous documentation.*
