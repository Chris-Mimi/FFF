# Coach Dashboard & Session Management Fixes

**Date:** November 17, 2025
**Session:** Bug fixes for multi-session creation, member display, and UI improvements
**Branch:** coach-page-refactor

---

## Summary
Fixed critical issues preventing multiple workouts on same day, corrected session management modal to display all family members, and enabled profile updates for family members without auth accounts.

---

## Problems Fixed

### 1. Cannot Create Multiple Workouts on Same Day
**Issue:** Creating second workout at different time on same day failed silently
**Root Cause:** INSERT into weekly_sessions violated unique constraint on (date, time)
**Solution:** Check if session exists before INSERT, update if exists

### 2. Session Management Shows Only One Member
**Issue:** Modal showed "Unknown Member" for family members despite 3 bookings
**Root Cause:**
- Used wrong relationship syntax (`members!inner` not `member:members`)
- Aggressive filter removed valid bookings
- Field name mismatch (members vs member)
**Solution:**
- Changed to `members!bookings_member_id_fkey` for proper join
- Removed filter that was hiding valid data
- Transformed `members` field to `member` for consistency

### 3. Hover Popover Showing Only Title
**Issue:** Hovering over workout cards showed only title, not workout content
**Root Cause:**
- Missing null check on wod.sections
- Filter excluding Warm-up, Cool Down, etc. sections
**Solution:**
- Added null safety check before filtering
- Removed section type exclusion filter

### 4. Monthly View Action Buttons Invisible
**Issue:** Copy/Delete buttons transparent over booking badge
**Root Cause:** No background styling for monthly view buttons
**Solution:** Added white background, rounded corners, and shadow to both views

### 5. Family Member Profile Updates Failing
**Issue:** RLS error when saving family member names: "new row violates row-level security policy for table 'athlete_profiles'"
**Root Cause:** Family members don't have auth accounts, can't insert into athlete_profiles
**Solution:**
- Update `members.name` directly instead of athlete_profiles
- Fetch name from members table for family members without profiles
- Skip athlete_profiles insert for family members

---

## Implementation Details

### Multi-Session Creation Fix
**File:** `hooks/coach/useWODOperations.ts:92-121, 214-242`

```typescript
// Check if session exists before insert
const { data: existingSession } = await supabase
  .from('weekly_sessions')
  .select('id')
  .eq('date', dateKey)
  .eq('time', time)
  .maybeSingle();

if (existingSession) {
  // Update existing session
  await supabase
    .from('weekly_sessions')
    .update({
      workout_id: newWOD.id,
      capacity: wodData.maxCapacity,
      status: 'published'
    })
    .eq('id', existingSession.id);
} else {
  // Create new session
  await supabase.from('weekly_sessions').insert({...});
}
```

### Session Management Member Display
**File:** `components/coach/SessionManagementModal.tsx:98-129`

```typescript
// Fetch bookings with proper foreign key relationship
const { data: bookingsData, error: bookingsError } = await supabase
  .from('bookings')
  .select(`
    id,
    status,
    booked_at,
    members!bookings_member_id_fkey (
      id,
      name,
      email
    )
  `)
  .eq('session_id', sessionId)
  .order('booked_at', { ascending: true });

// Transform members field to member for consistency
const transformedBookings = (bookingsData || []).map(booking => ({
  id: booking.id,
  status: booking.status,
  booked_at: booking.booked_at,
  member: booking.members
}));
```

**Display Changes:**
- Added "Booked:" label before dates for clarity
- Added null safety checks (`booking.member?.name || 'Unknown Member'`)
- Filter out bookings with missing member data during transform

### Family Member Profile Updates
**File:** `components/athlete/AthletePageProfileTab.tsx:70-106, 184-212`

**Fetch Logic:**
```typescript
// First check athlete_profiles
const { data } = await supabase
  .from('athlete_profiles')
  .select('*')
  .eq('user_id', userId)
  .maybeSingle();

if (data) {
  setProfile(data); // Primary account holder
} else {
  // Family member - get from members table
  const { data: memberData } = await supabase
    .from('members')
    .select('name, email')
    .eq('id', userId)
    .single();

  if (memberData) {
    setProfile({
      full_name: memberData.name || '',
      email: memberData.email || '',
      // ... rest empty
    });
  }
}
```

**Save Logic:**
```typescript
// Always update members.name for consistency
if (profile.full_name) {
  await supabase
    .from('members')
    .update({ name: profile.full_name })
    .eq('id', userId);
}

if (existingProfile) {
  // Update athlete_profiles for primary account holder
  await supabase.from('athlete_profiles').update({...});
} else {
  // Family member - members table already updated above
  alert('Profile updated successfully!');
}
```

### Hover Popover Fix
**File:** `components/coach/CalendarGrid.tsx:225-242`

```typescript
{wod.sections && wod.sections.length > 0 ? (
  wod.sections
    .filter((section) => section.content?.trim())  // Only filter empty
    .map((section, idx) => (
      <div key={idx}>
        <div>{section.type}</div>
        <div>{section.content}</div>
      </div>
    ))
) : (
  <div>No workout sections</div>
)}
```

### Monthly View Button Visibility
**File:** `components/coach/CalendarGrid.tsx:193-216`

```typescript
<button
  className={`hover:text-[#1a6b62] transition text-[#208479] bg-white rounded shadow-sm ${
    isMonthlyView ? 'p-0.5' : 'p-1'
  }`}
>
  <Copy size={iconSize} />
</button>
```

---

## Files Modified

1. `hooks/coach/useWODOperations.ts` - Multi-session creation logic
2. `components/coach/SessionManagementModal.tsx` - Member display fixes
3. `components/coach/CalendarGrid.tsx` - Hover popover & button visibility
4. `components/coach/WODModal.tsx` - Time selector for new workouts (from previous commit)
5. `components/athlete/AthletePageProfileTab.tsx` - Family member profile updates

---

## Commits

**Branch:** coach-page-refactor

1. `1fc9380` - fix(coach): enable multi-session creation and copy/paste to empty days
2. `6ac10e2` - fix(coach): update existing sessions instead of inserting duplicates
3. `e8a514e` - fix(coach): add null check for workout sections in hover popover
4. `09420d5` - fix(coach): show all workout sections in hover popover
5. `9e4ae94` - fix(coach): make action buttons visible in monthly view
6. `ba17f86` - fix(coach): improve member name display in Session Management modal
7. `25470bb` - fix(coach): correctly fetch and display all member bookings
8. `3cfbf74` - fix(coach): use correct foreign key relationship for member data
9. `f0716fd` - fix(athlete): enable family member profile updates via members table

---

## Testing Results

**Multi-Session Creation:**
✅ Can create multiple workouts on same day at different times
✅ Copy/paste to empty days works
✅ Drag-drop to empty days works

**Session Management:**
✅ All 3 family member bookings display correctly
✅ Shows member names (not "Unknown Member")
✅ "Booked:" label clarifies date meaning

**Hover Popover:**
✅ Shows all workout sections including Warm-up, Cool Down
✅ Scrollable when content overflows
✅ Handles empty sections gracefully

**Monthly View:**
✅ Copy/Delete buttons visible on hover
✅ White background prevents transparency over badges

**Family Members:**
✅ Can update names on Athlete Profile tab
✅ Names sync to Session Management modal
✅ No RLS errors

---

## Lessons Learned

1. **Database Constraints:** Always check for existing records before INSERT when unique constraints exist
2. **Supabase Relationships:** Use explicit foreign key names (`table!fkey_name`) for clarity
3. **Data Transform Consistency:** Field name mismatches (members/member) cause silent failures
4. **RLS Scoping:** Family members without auth accounts need different data paths than primary users
5. **UI State Visibility:** Always provide white/solid backgrounds for buttons over dynamic content
6. **Filter Logic:** Overly aggressive filters can hide valid data - start permissive, then restrict

---

## User Feedback

- Initial frustration with multi-session creation not working
- Confusion about member display showing dates instead of names
- Satisfaction with fixes after testing

---

**Session Time:** ~90 minutes
**Token Usage:** ~94K
**Status:** All issues resolved, branch ready for merge
