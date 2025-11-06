# Family Accounts System (Phases 1-6)

**Date:** November 4, 2025
**Commits:** Multiple commits spanning all 6 phases

## Summary
Complete family accounts implementation allowing primary members to add family members, book sessions for them, and view their athlete profiles with full data isolation and subscription inheritance.

## Key Features Completed

### Phase 1-3: Database & Booking
- Added family account columns to `members` table
  - `account_type` ('primary' | 'family_member')
  - `primary_member_id`, `display_name`, `date_of_birth`, `relationship`
- RLS policies for family member access
- Booking API accepts `memberId` parameter with family validation
- Compact card UI for family member selection (replaced dropdown)
- Add/edit/delete family member modals

### Phase 4: Multi-Profile Athlete Page
- Profile selector dropdown in athlete page header
- Complete data isolation across all tabs (Workouts, Logbook, Benchmarks, Lifts, Records)
- All queries filter by `activeProfileId` instead of hardcoded user ID
- Instant data refresh on profile change

### Phase 5: Subscription Inheritance
- Created RPC function `get_primary_subscription_status`
- Family members inherit subscription from primary account
- Athlete page checks primary member's subscription for access

### Phase 6: Booking Badges
- Blue badges show "Booked for [Name]" on session cards
- Uses local data matching (RLS workaround for nested joins)
- Display name fallback: `display_name` → `name.split(' ')[0]` → 'Unknown'
- Authorization fix: Family members can cancel own bookings
- UI improvements: Primary shows "You" instead of name + badge

## Database Changes
- `supabase/migrations/20251104_add_family_accounts.sql`
- RPC function: `get_primary_subscription_status`

## Files Modified
- `app/member/book/page.tsx` - Family selection UI, badge logic
- `app/api/bookings/create/route.ts` - Family authorization
- `app/api/bookings/cancel/route.ts` - Family member cancel authorization
- `app/athlete/page.tsx` - Profile selector, data isolation, subscription check
- `app/coach/members/page.tsx` - Display name support

## Technical Patterns

### RLS Workaround for Nested Data
```tsx
// Don't: bookings.members.display_name (RLS blocks)
// Do: Fetch separately and join client-side
const familyMembers = await fetchFamilyMembers();
const bookings = await fetchBookings(); // Just IDs
const enriched = bookings.map(b => ({
  ...b,
  memberName: familyMembers.find(fm => fm.id === b.member_id)?.display_name
}));
```

### Family Authorization Check
```tsx
const canBook = memberId === user.id ||
  familyMembers.some(fm =>
    fm.id === memberId && fm.primary_member_id === user.id
  );
```
