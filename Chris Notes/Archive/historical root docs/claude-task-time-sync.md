# Claude Code Task: Time Sync Between WOD Modal and Session Modal

**Complexity:** Medium-High (Multi-component state synchronization)
**Files:** `components/WODModal.tsx`, database updates
**Time Estimate:** 30-45 minutes

---

## Context

Currently:
- Session time is stored in `weekly_sessions` table
- Session Modal can edit time (already implemented with 15-min increments)
- WOD Modal has NO time display or editing capability
- WODs can be linked to sessions via `booking_info.session_id`

**Goal:** Display and edit workout time in WOD Modal, keep it synced with the linked session.

---

## Implementation Steps

### Step 1: Add Session Time State

**File:** `components/WODModal.tsx`
**Location:** After line 679 (after `isPublishing` state)

**Add:**
```typescript
const [sessionTime, setSessionTime] = useState<string | null>(null);
const [editingTime, setEditingTime] = useState(false);
const [tempTime, setTempTime] = useState('12:00');
```

### Step 2: Fetch Session Time When Editing WOD

**File:** `components/WODModal.tsx`
**Location:** Inside the useEffect at line 841-888 (where editingWOD is loaded)

**Add this after line 844 (`setFormData(editingWOD);`):**

```typescript
// Fetch session time if this WOD is linked to a session
if (editingWOD.booking_info?.session_id) {
  const fetchSessionTime = async () => {
    const { data, error } = await supabase
      .from('weekly_sessions')
      .select('time')
      .eq('id', editingWOD.booking_info!.session_id)
      .single();

    if (!error && data) {
      setSessionTime(data.time);
      setTempTime(data.time);
    }
  };
  fetchSessionTime();
} else {
  setSessionTime(null);
}
```

### Step 3: Create Time Update Function

**File:** `components/WODModal.tsx`
**Location:** After the `toggleClassTime` function (around line 910)

**Add:**
```typescript
const handleTimeUpdate = async () => {
  if (!formData.booking_info?.session_id) return;

  try {
    const { error } = await supabase
      .from('weekly_sessions')
      .update({ time: tempTime })
      .eq('id', formData.booking_info.session_id);

    if (error) {
      console.error('Error updating session time:', error);
      alert('Failed to update time');
      return;
    }

    setSessionTime(tempTime);
    setEditingTime(false);
  } catch (error) {
    console.error('Error updating session time:', error);
    alert('Failed to update time');
  }
};
```

### Step 4: Add Time Display/Edit UI in Header

**File:** `components/WODModal.tsx`
**Location:** Find the WOD Modal header (search for "WOD Modal header" or look around line 1325-1350)

**Add this AFTER the title/track selection, BEFORE the Publish button:**

```typescript
{/* Session Time Display/Edit */}
{sessionTime && (
  <div className="flex items-center gap-2 border-l border-gray-300 pl-4">
    <Clock size={18} className="text-gray-500" />
    {editingTime ? (
      <div className="flex items-center gap-2">
        <select
          value={tempTime}
          onChange={(e) => setTempTime(e.target.value)}
          className="px-2 py-1 border rounded bg-white text-gray-900 text-sm"
        >
          {/* Generate time options in 15-minute increments */}
          {Array.from({ length: 24 }, (_, hour) =>
            [0, 15, 30, 45].map(minute => {
              const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
              return (
                <option key={timeString} value={timeString}>
                  {timeString}
                </option>
              );
            })
          ).flat()}
        </select>
        <button
          onClick={handleTimeUpdate}
          className="px-3 py-1 bg-[#208479] text-white rounded hover:bg-[#1a6b62] text-sm"
        >
          Save
        </button>
        <button
          onClick={() => {
            setEditingTime(false);
            setTempTime(sessionTime!);
          }}
          className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
        >
          Cancel
        </button>
      </div>
    ) : (
      <>
        <span className="font-medium text-gray-700">{sessionTime}</span>
        <button
          onClick={() => setEditingTime(true)}
          className="p-1 text-gray-500 hover:text-[#208479]"
          title="Edit time"
        >
          <Edit2 size={16} />
        </button>
      </>
    )}
  </div>
)}
```

**Important:** You need to import `Clock` and `Edit2` icons at the top of the file:
```typescript
import { Clock, Edit2, /* ...existing imports */ } from 'lucide-react';
```

### Step 5: Reset Time State When Modal Closes

**File:** `components/WODModal.tsx`
**Location:** In the useEffect at line 841, add to the cleanup or when modal closes

**Modify the useEffect to reset time state:**

Add at line 885 (after `setErrors({});`):
```typescript
setEditingTime(false);
setSessionTime(null);
```

---

## Testing Checklist

1. **Load WOD with linked session:**
   - Open coach calendar
   - Click on a workout that has a session (shows booking badge)
   - Verify time displays in WOD Modal header next to Publish button

2. **Edit time in WOD Modal:**
   - Click edit icon next to time
   - Select different time from dropdown
   - Click Save
   - Verify time updates in WOD Modal

3. **Verify sync with Session Modal:**
   - While WOD Modal is still open, click the booking badge to open Session Modal
   - Verify time matches what was just set in WOD Modal
   - Close Session Modal

4. **Edit time in Session Modal:**
   - Open Session Modal
   - Edit time
   - Save
   - Close Session Modal
   - Open WOD Modal for same workout
   - Verify time matches what was set in Session Modal

5. **WOD without session:**
   - Create new workout (no session linked)
   - Verify NO time field appears (sessionTime is null)

6. **Edge cases:**
   - Cancel time edit (verify reverts to original)
   - Edit time multiple times
   - Close modal while editing time (verify resets on reopen)

---

## Troubleshooting

**Time not displaying:**
- Check browser console for errors
- Verify `editingWOD.booking_info.session_id` exists
- Check Supabase query returned data

**Time not updating:**
- Check browser console for database errors
- Verify session_id is valid
- Check RLS policies on `weekly_sessions` table

**Icons not showing:**
- Verify `Clock` and `Edit2` are imported from lucide-react at top of file

---

## Architecture Notes

- Time is **single source of truth** in `weekly_sessions` table
- WOD Modal reads/writes to session table when linked
- No time column added to `wods` table
- WODs without linked sessions have no time (design decision)

---

**After Implementation:**
1. Test all 6 scenarios above
2. Run TypeScript check: `npx tsc --noEmit`
3. Commit with message: `feat: add time sync between WOD Modal and Session Modal`
