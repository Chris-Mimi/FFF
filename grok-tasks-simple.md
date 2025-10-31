# Grok Tasks - Simple UI Improvements

**Branch:** Create new branch `grok-ui-tasks-2025-10-31`

---

## Task 1: Add "Book a Class" Button to Athlete Page

**File:** `app/athlete/page.tsx`

**Context:**
The Athlete page currently has tabs for Workouts, Logbook, Benchmarks, and Barbell Lifts. We need to add a way for athletes to book classes.

**Requirements:**
1. Add a "Book a Class" button in a prominent location on the Athlete page
2. Button should be teal (#208479) with white text
3. When clicked, navigate to `/member/book` (the member booking page)
4. Position: Either in the header area or near the top of the page
5. Use lucide-react `Calendar` icon

**Implementation:**
- Import `Calendar` icon from lucide-react
- Import `useRouter` from next/navigation
- Add button with onClick handler that calls `router.push('/member/book')`
- Style: `bg-[#208479] hover:bg-[#1a6b62] text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2`

**Test:**
- Click button, verify navigation to booking page
- Check button styling matches app theme

---

## Task 2: Add "Late Cancellation" Button to Session Management Modal

**File:** `components/SessionManagementModal.tsx`

**Context:**
Session modal currently has "No-Show" button for tracking no-shows. We need a similar button for late cancellations.

**Requirements:**
1. Add "Late Cancellation" button next to "No-Show" button
2. Create new booking status: `late_cancel` (add to existing status enum)
3. Late cancellations count toward 10-card usage but NOT toward attendance stats
4. Include "Undo" functionality like No-Show has
5. Button color: Orange (#f97316)

**Database Change Needed:**
```sql
-- Add late_cancel status to bookings table
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'late_cancel';
```

**Implementation:**
1. Find the "No-Show" button (search for `handleNoShow`)
2. Add similar "Late Cancel" button next to it
3. Create `handleLateCancel` function that:
   - Updates booking status to 'late_cancel'
   - Does NOT decrement 10-card (same as no-show)
4. Add "Undo" button next to Late Cancel button (same pattern as No-Show undo)
5. Button styling: `bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded text-sm`

**Test:**
- Mark booking as late cancel
- Verify 10-card counter doesn't change
- Verify undo works
- Check button appears in correct location

---

## Task 3: Visual Distinction for Attended Workouts

**File:** `components/AthleteWorkoutsTab.tsx`

**Context:**
Athlete Published Workouts page shows all published workouts. We need to visually distinguish workouts the athlete attended vs didn't attend.

**Requirements:**
1. **Attended workouts:** Top of card should have teal background (#208479)
2. **Not attended:** Keep current styling (no teal background)
3. **Today's workout:** Should have teal BORDER instead of teal background (even if attended)

**Data Source:**
Check if booking exists for this athlete + session with status 'confirmed' AND date is in the past.

**Implementation:**
1. For each workout, query bookings:
   ```typescript
   const { data: booking } = await supabase
     .from('bookings')
     .select('status')
     .eq('session_id', workout.session_id)
     .eq('member_id', currentMemberId)
     .single();

   const attended = booking && booking.status === 'confirmed' && isPastDate;
   ```

2. Modify card header styling:
   ```typescript
   const isToday = // existing logic
   const headerClass = isToday
     ? 'border-4 border-[#208479] bg-gray-300'
     : attended
     ? 'bg-[#208479] text-white'
     : 'bg-gray-300 text-gray-900';
   ```

3. Adjust text color:
   - Attended: white text
   - Not attended: gray-900 text
   - Today: gray-900 text with teal border

**Test:**
- Check attended workout has teal background, white text
- Check not-attended workout has gray background
- Check today's workout has teal border (not background)
- Verify dates and booking status match correctly

---

**After Completion:**
1. Test all 3 features
2. Run `git status` to see all modified files
3. Run `git diff` to review all changes
4. Tell Chris: "Grok made changes, check and commit"
