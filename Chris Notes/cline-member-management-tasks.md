# Member Management Enhancements - Implementation Plan for Cline

**⚠️ IMPORTANT INSTRUCTIONS FOR CLINE:**
- You can READ memory-bank/ files for context
- ✅ You CAN UPDATE memory-bank/memory-bank-activeContext.md as you complete features
  - Add concise entries to existing tables when you finish a feature
  - Follow the existing format (| Feature | Description | Files |)
  - This helps other models know what you accomplished
- ❌ DO NOT MODIFY:
  - project-history/session_history.md (verbose archive - Claude only)
  - memory-bank/memory-bank-techContext.md (stable tech stack)
  - memory-bank/memory-bank-systemPatterns.md (stable patterns)
- Commit your work frequently with clear commit messages
- Test each feature before moving to the next
- When you finish a feature, update activeContext.md so the next model has current info

---

## 📋 TERMINOLOGY (Critical - Read First!)

**Athlete** = Anyone who comes to the box (adults, kids, all categories)
**Member** = Specifically those who pay monthly/yearly fees (one category of athlete)

This distinction is important for UI labels and logic throughout the application.

---

## Feature 1: 10-Card Tracking System

### Overview
Track usage of 10-session punch cards. Display current usage (X/10), allow manual card reset, and alert at 9/10.

### Database Migration
**File:** `database/add-ten-card-tracking.sql`

```sql
-- Add 10-card tracking columns to members table
ALTER TABLE members
ADD COLUMN IF NOT EXISTS ten_card_purchase_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ten_card_sessions_used INTEGER DEFAULT 0 CHECK (ten_card_sessions_used >= 0 AND ten_card_sessions_used <= 10);

-- Add comment explaining the fields
COMMENT ON COLUMN members.ten_card_purchase_date IS 'Date when current 10-card was purchased/activated';
COMMENT ON COLUMN members.ten_card_sessions_used IS 'Number of sessions used on current 10-card (0-10)';

-- Create index for faster 10-card user queries
CREATE INDEX IF NOT EXISTS idx_members_ten_card_date ON members(ten_card_purchase_date) WHERE ten_card_purchase_date IS NOT NULL;
```

### Component: TenCardModal.tsx
**File:** `components/TenCardModal.tsx`

**Purpose:** Modal for managing 10-card purchase date and resetting card

**Interface:**
```typescript
interface TenCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: {
    id: string;
    name: string;
    ten_card_purchase_date: string | null;
    ten_card_sessions_used: number;
  };
  onUpdate: () => void;
}
```

**Features:**
- Display current card status (X/10 sessions used)
- Date picker for setting purchase date
- "Reset Card" button (sets purchase_date to today, sessions_used to 0)
- Show how many sessions used since purchase date
- Warning if at 9/10 sessions

**Styling:** Match SessionManagementModal.tsx (teal theme, white background)

### Update: app/coach/members/page.tsx

**Changes needed:**

1. **Add state for 10-card modal:**
```typescript
const [tenCardModal, setTenCardModal] = useState<{
  isOpen: boolean;
  member: Member | null;
}>({ isOpen: false, member: null });
```

2. **Update Member interface to include new fields:**
```typescript
interface Member {
  // ... existing fields
  ten_card_purchase_date: string | null;
  ten_card_sessions_used: number;
}
```

3. **Add 10-card chip next to member name (only if ten_card is checked):**
```tsx
{member.membership_types?.includes('ten_card') && (
  <button
    onClick={() => setTenCardModal({ isOpen: true, member })}
    className={`px-2 py-0.5 rounded text-xs font-medium transition cursor-pointer ${
      member.ten_card_sessions_used >= 9
        ? 'bg-red-600 text-white hover:bg-red-700'
        : 'bg-purple-600 text-white hover:bg-purple-700'
    }`}
    title="Manage 10-card"
  >
    {member.ten_card_sessions_used || 0}/10
  </button>
)}
```

4. **Add TenCardModal component at bottom before closing div:**
```tsx
<TenCardModal
  isOpen={tenCardModal.isOpen}
  onClose={() => setTenCardModal({ isOpen: false, member: null })}
  member={tenCardModal.member}
  onUpdate={fetchMembers}
/>
```

5. **Increment ten_card_sessions_used when athlete books a session**
- This happens in the booking creation logic
- Check if member has ten_card type active
- If yes, increment ten_card_sessions_used by 1
- **Location to modify:** Wherever bookings are created (likely API route or booking component)

### Alert System for 9/10 Sessions

**When to trigger:**
- When ten_card_sessions_used reaches 9
- Show alert badge on member card (red instead of purple)
- When clicked, modal shows: "⚠️ Next session will complete this card. Remind athlete to purchase new 10-card."

---

## Feature 2: Filter Chip Counters

### Overview
Show count of athletes in each membership category under filter buttons, plus total active athletes.

### Update: app/coach/members/page.tsx

**Changes needed:**

1. **Add count calculation function:**
```typescript
const getMembershipTypeCounts = () => {
  const counts: Record<MembershipType, number> = {
    member: 0,
    drop_in: 0,
    ten_card: 0,
    wellpass: 0,
    hansefit: 0,
    trial: 0,
  };

  members.forEach(member => {
    member.membership_types?.forEach(type => {
      counts[type]++;
    });
  });

  return counts;
};

const membershipCounts = getMembershipTypeCounts();
const totalActiveAthletes = members.length;
```

2. **Update filter buttons to show counts:**
```tsx
<button
  key={type}
  onClick={() => toggleFilter(type)}
  className={`flex flex-col items-center px-2.5 py-1 rounded text-xs font-medium transition ${
    selectedFilters.includes(type)
      ? MEMBERSHIP_TYPE_COLORS[type].active
      : MEMBERSHIP_TYPE_COLORS[type].inactive
  }`}
>
  <span>{MEMBERSHIP_TYPE_LABELS[type]}</span>
  <span className="text-[10px] opacity-75">{membershipCounts[type]}</span>
</button>
```

3. **Add total count display at end of filter row:**
```tsx
<div className="ml-auto px-3 py-1 bg-gray-700 rounded text-xs font-medium text-gray-300">
  Total Athletes: {totalActiveAthletes}
</div>
```

---

## Feature 3: Attendance History Tracking

### Overview
Show how many times each athlete has attended in selectable timeframes (1 week, 1 month, 12 months).

### Database Function
**File:** `database/add-attendance-functions.sql`

```sql
-- Function to count confirmed bookings for a member in a given timeframe
CREATE OR REPLACE FUNCTION get_member_attendance_count(
  p_member_id UUID,
  p_days_back INTEGER DEFAULT 7
)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM bookings b
    JOIN weekly_sessions ws ON b.session_id = ws.id
    WHERE b.member_id = p_member_id
    AND b.status = 'confirmed'
    AND ws.date >= CURRENT_DATE - (p_days_back || ' days')::INTERVAL
    AND ws.date <= CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Update: app/coach/members/page.tsx

**Changes needed:**

1. **Add state for timeframe selector:**
```typescript
type AttendanceTimeframe = '7' | '30' | '365';
const [attendanceTimeframe, setAttendanceTimeframe] = useState<AttendanceTimeframe>('30');
```

2. **Add timeframe selector dropdown (above member cards):**
```tsx
<div className="flex items-center gap-2 mb-4">
  <span className="text-sm text-gray-400">Attendance period:</span>
  <select
    value={attendanceTimeframe}
    onChange={(e) => setAttendanceTimeframe(e.target.value as AttendanceTimeframe)}
    className="px-3 py-1 bg-gray-700 text-white rounded text-sm"
  >
    <option value="7">Last 7 days</option>
    <option value="30">Last 30 days</option>
    <option value="365">Last 12 months</option>
  </select>
</div>
```

3. **Fetch attendance counts when members load:**
```typescript
const fetchMembersWithAttendance = async (status: MemberStatus) => {
  setLoading(true);
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // For each member, get attendance count
    const membersWithAttendance = await Promise.all(
      (data || []).map(async (member) => {
        const daysBack = parseInt(attendanceTimeframe);
        const { data: bookingData } = await supabase.rpc('get_member_attendance_count', {
          p_member_id: member.id,
          p_days_back: daysBack
        });

        return {
          ...member,
          attendance_count: bookingData || 0
        };
      })
    );

    setMembers(membersWithAttendance);
  } catch (error) {
    console.error('Error fetching members:', error);
  } finally {
    setLoading(false);
  }
};
```

4. **Update Member interface:**
```typescript
interface Member {
  // ... existing fields
  attendance_count?: number;
}
```

5. **Display attendance count on member card (compact, non-intrusive):**
```tsx
<div>
  <span className="text-gray-400">Attended:</span>{' '}
  <span className="text-white font-medium">
    {member.attendance_count || 0}x
  </span>
</div>
```

6. **Re-fetch when timeframe changes:**
```typescript
useEffect(() => {
  if (activeTab) {
    fetchMembersWithAttendance(activeTab);
  }
}, [attendanceTimeframe]);
```

---

## Feature 4: Manual Booking Cancellation from Coach View

### Overview
Allow coaches to cancel/delete bookings for athletes who don't show up or forget to cancel.

### Component: SessionManagementModal.tsx

**Changes needed:**

1. **Add delete button next to each booking:**
```tsx
<div className="flex items-center justify-between bg-white border rounded px-2 py-1.5 text-sm">
  <span className="font-medium text-gray-800">{booking.member.name}</span>
  <div className="flex items-center gap-2">
    <span className="text-xs text-gray-400">
      {new Date(booking.booked_at).toLocaleDateString('en-GB')}
    </span>
    <button
      onClick={() => handleCancelBooking(booking.id)}
      className="p-1 text-red-600 hover:bg-red-50 rounded transition"
      title="Cancel booking"
    >
      <X size={14} />
    </button>
  </div>
</div>
```

2. **Add cancel booking handler:**
```typescript
const handleCancelBooking = async (bookingId: string) => {
  if (!confirm('Cancel this booking? The athlete will lose their spot.')) {
    return;
  }

  try {
    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (error) throw error;

    alert('Booking cancelled successfully');
    await fetchSessionDetails();
    onSessionUpdated();
  } catch (error) {
    console.error('Error cancelling booking:', error);
    alert('Failed to cancel booking');
  }
};
```

---

## Feature 5: Late Cancellation Tracking & Alerts

### Overview
Track and visually mark athletes who cancel within restricted timeframes. Generate alerts for coaches.

### Database Migration
**File:** `database/add-late-cancellation-tracking.sql`

```sql
-- Add late cancellation tracking to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS late_cancellation BOOLEAN DEFAULT false;

-- Add comment explaining the field
COMMENT ON COLUMN bookings.cancelled_at IS 'Timestamp when booking was cancelled';
COMMENT ON COLUMN bookings.late_cancellation IS 'True if cancelled within restricted timeframe (12h morning, 8h afternoon/evening)';

-- Create index for late cancellation queries
CREATE INDEX IF NOT EXISTS idx_bookings_late_cancellation ON bookings(late_cancellation) WHERE late_cancellation = true;
```

### Logic for Determining Late Cancellation

**Timeframe Rules:**
- **Morning classes** (before 12:00 PM): 12-hour cancellation window
- **Afternoon/Evening classes** (12:00 PM or later): 8-hour cancellation window

**Implementation in cancellation handler:**

```typescript
const determineLate Cancellation = (sessionTime: string, cancelledAt: Date): boolean => {
  const sessionDate = new Date(sessionTime);
  const timeDiffHours = (sessionDate.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60);

  const sessionHour = sessionDate.getHours();
  const isMorning = sessionHour < 12;

  if (isMorning) {
    return timeDiffHours < 12; // Within 12 hours of morning class
  } else {
    return timeDiffHours < 8; // Within 8 hours of afternoon/evening class
  }
};
```

### Update: API Route for Athlete Booking Cancellation
**File:** `app/api/bookings/cancel/route.ts` (or wherever athlete cancels their own bookings)

**Changes needed:**

1. **When athlete cancels, determine if it's late:**
```typescript
// Get session details to check time
const { data: session } = await supabase
  .from('weekly_sessions')
  .select('date, time')
  .eq('id', booking.session_id)
  .single();

const sessionDateTime = new Date(`${session.date}T${session.time}`);
const cancelledAt = new Date();
const isLateCancellation = determineLate Cancellation(sessionDateTime.toISOString(), cancelledAt);

// Update booking with cancellation info
await supabase
  .from('bookings')
  .update({
    status: 'cancelled',
    cancelled_at: cancelledAt.toISOString(),
    late_cancellation: isLateCancellation
  })
  .eq('id', bookingId);

// If late cancellation, log for coach notification
if (isLateCancellation) {
  console.log(`LATE CANCELLATION: ${memberName} cancelled session at ${session.time} on ${session.date}`);
  // TODO: Implement notification system (email, in-app alert, etc.)
}
```

### Update: SessionManagementModal.tsx

**Changes needed:**

1. **Update Booking interface:**
```typescript
interface Booking {
  id: string;
  status: 'confirmed' | 'waitlist' | 'cancelled';
  booked_at: string;
  cancelled_at: string | null;
  late_cancellation: boolean;
  member: {
    id: string;
    name: string;
    email: string;
  };
}
```

2. **Update booking query to include cancellation fields:**
```typescript
const { data: bookingsData, error: bookingsError } = await supabase
  .from('bookings')
  .select(`
    id,
    status,
    booked_at,
    cancelled_at,
    late_cancellation,
    member:members (
      id,
      name,
      email
    )
  `)
  .eq('session_id', sessionId)
  .order('booked_at', { ascending: true });
```

3. **Display late cancellations with visual indicator:**
```tsx
{confirmedBookings.map((booking) => (
  <div
    key={booking.id}
    className={`flex items-center justify-between border rounded px-2 py-1.5 text-sm ${
      booking.late_cancellation
        ? 'bg-red-50 border-red-300'
        : 'bg-white border-gray-200'
    }`}
  >
    <div className="flex items-center gap-2">
      {booking.late_cancellation && (
        <span className="text-red-600 font-bold" title="Late cancellation">
          ✕
        </span>
      )}
      <span className={`font-medium ${
        booking.late_cancellation ? 'text-red-700' : 'text-gray-800'
      }`}>
        {booking.member.name}
      </span>
    </div>
    <span className="text-xs text-gray-400">
      {new Date(booking.booked_at).toLocaleDateString('en-GB')}
    </span>
  </div>
))}
```

4. **Add section for late cancellations if any exist:**
```tsx
{/* Late Cancellations Alert */}
{confirmedBookings.filter(b => b.late_cancellation).length > 0 && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
    <h4 className="text-sm font-semibold text-red-800 mb-2">
      ⚠️ Late Cancellations ({confirmedBookings.filter(b => b.late_cancellation).length})
    </h4>
    <p className="text-xs text-red-700">
      The following athletes cancelled within the restricted timeframe:
    </p>
    <ul className="mt-2 space-y-1">
      {confirmedBookings.filter(b => b.late_cancellation).map(booking => (
        <li key={booking.id} className="text-xs text-red-700">
          • {booking.member.name} - Cancelled {new Date(booking.cancelled_at!).toLocaleString('en-GB')}
        </li>
      ))}
    </ul>
  </div>
)}
```

---

## Testing Checklist

After implementing each feature, test:

### Feature 1: 10-Card Tracking
- [ ] Click 10-card checkbox for a member
- [ ] Verify "0/10" chip appears next to name
- [ ] Click chip to open modal
- [ ] Set purchase date
- [ ] Create test bookings and verify count increments
- [ ] Verify at 9/10 the chip turns red
- [ ] Test "Reset Card" button

### Feature 2: Filter Counters
- [ ] Verify counts appear under each filter button
- [ ] Add/remove membership types and verify counts update
- [ ] Verify "Total Athletes" count is correct

### Feature 3: Attendance History
- [ ] Select different timeframes (7 days, 30 days, 12 months)
- [ ] Verify attendance counts update
- [ ] Check that counts match actual confirmed bookings in database

### Feature 4: Manual Cancellation
- [ ] Open session management modal
- [ ] Click X button next to a booking
- [ ] Verify booking status changes to 'cancelled'
- [ ] Verify spot becomes available for new bookings

### Feature 5: Late Cancellation
- [ ] Have athlete cancel within 12h of morning class
- [ ] Verify `late_cancellation` flag is set to true
- [ ] Verify X symbol and red styling appears in session modal
- [ ] Test with afternoon class (8h window)
- [ ] Verify late cancellation alert section appears

---

## Commit Strategy

Make separate commits for each major feature:

1. `feat: add 10-card tracking system with usage counter and alerts`
2. `feat: add membership type counters to filter buttons`
3. `feat: add attendance history tracking with timeframe selector`
4. `feat: add manual booking cancellation from coach view`
5. `feat: add late cancellation tracking and visual indicators`

---

## Notes for Cline

- **Database migrations:** Run SQL files in Supabase SQL Editor before testing features
- **Existing patterns:** Reference `SessionManagementModal.tsx` for modal styling consistency
- **Color scheme:** Use existing teal (#208479) for primary actions, purple for 10-card, red for alerts/warnings
- **Error handling:** Always wrap database operations in try/catch and show user-friendly alerts
- **Performance:** Use Promise.all() for parallel queries when fetching attendance data for multiple members
- **RLS policies:** You may need to add coach access policies for the new columns/functions

---

## Priority Order (Easiest → Hardest)

Implement in this order for best workflow:

1. **Feature 2** (Filter Counters) - ⭐ EASIEST
   - No database changes
   - Pure JavaScript/TypeScript logic
   - Only UI updates
   - ~15-20 minutes

2. **Feature 4** (Manual Cancellation) - ⭐⭐ VERY EASY
   - Small addition to existing SessionManagementModal
   - One button + one handler function
   - Simple database update
   - ~20-30 minutes

3. **Feature 1** (10-Card Tracking) - ⭐⭐⭐ MEDIUM
   - Database migration (2 columns)
   - New modal component (but similar to existing SessionManagementModal)
   - Update member card UI
   - Hook into booking creation logic
   - ~45-60 minutes

4. **Feature 3** (Attendance History) - ⭐⭐⭐⭐ MEDIUM-HIGH
   - Database function creation
   - Modify fetch logic with RPC calls
   - Promise.all() for parallel queries
   - UI dropdown + display
   - ~60-75 minutes

5. **Feature 5** (Late Cancellation) - ⭐⭐⭐⭐⭐ MOST COMPLEX
   - Database migration (2 columns)
   - Time-based calculation logic
   - Multiple touchpoints (athlete cancellation API + coach modal)
   - Visual indicators and alert section
   - Edge case handling (timezones, morning vs afternoon)
   - ~90-120 minutes

**Total estimated time: 4-5 hours**

---

## Technical Decisions Explained

### 1. Why Store 10-Card Counter in Database (Not Calculate On-The-Fly)?

**Option A: Calculate dynamically** ❌
```typescript
// Every time we load members page, count bookings for each 10-card user
const count = await supabase
  .from('bookings')
  .select('id')
  .eq('member_id', memberId)
  .gte('booked_at', tenCardPurchaseDate)
  .eq('status', 'confirmed');

// Result: count.data.length
```

**Problems:**
- Slow: Requires JOIN query between members + bookings tables
- Network overhead: Fetching all booking records just to count them
- If we have 50 members with 10-cards, that's 50 separate queries!
- Page load becomes sluggish

**Option B: Store counter in database** ✅
```typescript
// Just read the number from members table
const member = {
  name: "Chris",
  ten_card_sessions_used: 7  // Already stored, instant read
}
```

**Benefits:**
- Fast: Single query to get all members with counters already included
- No JOINs needed
- No counting logic at display time
- Page loads instantly

**Trade-off:**
- Must keep counter in sync (increment when booking confirmed)
- Slight risk of counter drift if booking logic fails midway
- But we can add a "recalculate" button if needed

**Analogy:** It's like keeping a running total on a receipt vs. re-adding all items every time you look at it.

---

### 2. Why Use Database Function for Attendance Queries?

**Option A: Fetch all bookings, filter in JavaScript** ❌
```typescript
// Fetch ALL bookings for a member (could be hundreds)
const { data: allBookings } = await supabase
  .from('bookings')
  .select('*, weekly_sessions(*)')
  .eq('member_id', memberId);

// Then filter in JavaScript
const recentBookings = allBookings.filter(b => {
  const bookingDate = new Date(b.weekly_sessions.date);
  const daysAgo = (Date.now() - bookingDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysAgo <= 30 && b.status === 'confirmed';
});

const count = recentBookings.length;
```

**Problems:**
- Transfers ALL booking records from database to browser
- JavaScript does the filtering (slow, client-side)
- If member has 100 bookings over 2 years, we transfer all 100 just to count last 30 days
- Network bandwidth waste

**Option B: Database function counts server-side** ✅
```sql
CREATE FUNCTION get_member_attendance_count(member_id, days_back)
RETURNS INTEGER
-- Counts bookings WHERE date >= today - days_back
-- Returns just the number
```

```typescript
// Call function, get just the number back
const { data: count } = await supabase.rpc('get_member_attendance_count', {
  p_member_id: memberId,
  p_days_back: 30
});

// Result: 12 (just the count, not 100 records)
```

**Benefits:**
- Database does the heavy lifting (it's optimized for this)
- Only transfers the final count number (tiny data)
- Fast: Database uses indexes efficiently
- Can be reused for reports, analytics, etc.

**Analogy:** Asking a librarian "How many books on history do you have?" vs. having them bring you every book so you can count yourself.

---

### 3. Why Determine Late Cancellation at Cancellation Time (Not Retroactively)?

**Option A: Calculate when displaying** ❌
```typescript
// Every time we show the booking, recalculate if it was late
const isLate = () => {
  const sessionTime = new Date(booking.session.time);
  const cancelledTime = new Date(booking.cancelled_at);
  const hoursDiff = (sessionTime - cancelledTime) / (1000 * 60 * 60);

  const isMorning = sessionTime.getHours() < 12;
  return isMorning ? hoursDiff < 12 : hoursDiff < 8;
};

// Show red if isLate() returns true
```

**Problems:**
- Date math runs every render (performance hit)
- Timezone edge cases (what if server timezone changes?)
- Clock skew: If system time was wrong during cancellation, retroactive calculation could be wrong
- More complex display logic

**Option B: Store flag at cancellation moment** ✅
```typescript
// When athlete clicks "Cancel Booking"
const sessionTime = new Date(session.date + 'T' + session.time);
const cancelledAt = new Date();
const isLate = determineLate Cancellation(sessionTime, cancelledAt);

await supabase.from('bookings').update({
  status: 'cancelled',
  cancelled_at: cancelledAt.toISOString(),
  late_cancellation: isLate  // ← Store the result
});

// Later, when displaying:
if (booking.late_cancellation) {
  return <div className="text-red-600">Late Cancel</div>
}
```

**Benefits:**
- Calculation happens once, at the moment of truth
- Display logic is simple: check boolean flag
- Historical accuracy: Frozen timestamp of what happened
- No timezone issues on display
- Faster renders (no date math)

**Example scenario:**
- Athlete cancels at 9 PM
- Class is tomorrow at 8 AM (11 hours away - LATE for morning class)
- We store: `late_cancellation: true`
- Next week when reviewing: Flag still says `true`
- If we calculated retroactively next week, dates might be confusing

**Analogy:** Recording "LATE" on a package label when it arrives late, vs. checking the clock every time someone asks "Was this late?"

---

Good luck! Remember to test thoroughly and commit often.
