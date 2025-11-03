# Booking & Member Management System (v2.23, 2.26, 2.27)

**Date:** October 28, 2025
**Versions:** 2.23, 2.26, 2.27

## Summary
Implemented comprehensive booking system with membership types, session management, 10-card tracking, manual booking, and no-show/late cancel tracking.

## Key Features Completed

### v2.23 - Membership Types & Sessions
- Added membership_types column with 7 categories (WOD, Foundations, Diapers & Dumbbells, Unlimited, Trial, Coach, Paused)
- Color-coded badges and dynamic filter chips
- Session Management Modal (draggable, shows bookings, edit time/capacity, cancel session)
- Created formatDateLocal() helper to prevent timezone shifting
- Removed class_times field from WOD creation
- Compacted member cards for efficient layout
- Added member status validation to login flow (active/blocked)

### v2.26 - 10-Card Auto-Tracking
- Auto-increment 10-card counter on booking
- Auto-decrement on cancellation
- Header-based auth for booking API routes (switched from cookies)
- Filter chip counters showing real-time membership type counts
- Attendance history tracking by selectable timeframe (7/30/365 days, All Time)
- TenCardModal for manual purchase date and sessions_used editing
- Installed @supabase/ssr for Next.js 15 compatibility

### v2.27 - Booking Improvements
- Fixed rebooking constraint (partial unique index: only active when status != 'cancelled')
- Added 'no_show' status (counts toward 10-card but NOT attendance)
- Manual booking via dropdown in Session Management Modal
- Pending member notification with orange text pulse animation
- Unapprove/Unblock testing endpoints
- Athlete Page navigation button with trial/active/expired status
- Access control validates trial expiry

## Database Changes
- `database/add-membership-types.sql`
- `database/fix-rebooking-constraint.sql` - Partial unique index
- `database/add-no-show-status.sql`
- Added ten_card_purchase_date, ten_card_sessions_used columns
- Created get_member_attendance_count RPC function

## Files Modified
- `app/coach/members/page.tsx`
- `components/SessionManagementModal.tsx`
- `components/TenCardModal.tsx`
- `app/member/book/page.tsx`
- `app/athlete/page.tsx`
- `app/api/bookings/create/route.ts`
- `app/api/bookings/cancel/route.ts`
- `app/api/members/unapprove/route.ts`
- `app/api/members/unblock/route.ts`
- `lib/utils.ts`

## Key Commits
- 7bf65e6: 10-card auto-tracking and booking authentication fix
- acdaf5b: Member management features and booking improvements
- d03fdb6: Athlete page navigation with access control

## Technical Notes
- Rebooking uses partial unique index (only enforced when status != 'cancelled')
- No-show increments 10-card but excluded from attendance RPC
- Manual booking filters out already-booked members
- Authorization header auth pattern for API routes
