# Lessons Learned & Critical Gotchas

**Purpose:** Preserve critical patterns, gotchas, and "why we did it this way" knowledge that prevents recurring bugs and poor architectural decisions.

---

## 🕐 Timezone Handling (CRITICAL - Multiple Bug History)

### The Problem
JavaScript's `toISOString()` converts dates to UTC, causing day-shifting bugs across the app.

### The Solution
**ALWAYS use `formatDateLocal()` helper for date strings**

```typescript
// ❌ WRONG - Causes timezone bugs
const dateStr = new Date(2025, 10, 3).toISOString().split('T')[0]

// ✅ CORRECT - Use formatDateLocal helper
const dateStr = formatDateLocal(new Date(2025, 10, 3))
```

**Location:** `lib/utils.ts:29-34`

### Where This Matters
- Athlete workouts tab date display
- Session generation (weekly schedule)
- Any date comparisons or storage

### History
- Fixed 3 separate timezone bugs (v2.20, v2.22, v2.29)
- Symptom: Dates shift by 1 day unexpectedly

---

## ⏰ Time Picker Formatting (Zero-Padding Bug)

### The Problem
Database stores times as "8:45", but HTML select options require "08:45". Mismatch causes time picker to default to "00:00".

### The Solution
**ALWAYS use `padTime()` helper when setting time state**

```typescript
// ❌ WRONG - Database returns "8:45", select shows "00:00"
setTime(sessionTime)

// ✅ CORRECT - Pad to "08:45"
const padTime = (time: string) => {
  const [h, m] = time.split(':')
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`
}
setTime(padTime(sessionTime))
```

**Apply at ALL state-setting locations:**
- SessionManagementModal: 3 locations (fetch, cancel, edit)
- WODModal: 5 locations (fetch, cancel, edit × 2 each)

### History
- Fixed in v2.29 after user reported bug
- Root cause: format mismatch between DB and UI

---

## 📅 Publish Time Synchronization

### The Problem
Athlete page reads `wods.publish_time`, but Session Management Modal only updated `weekly_sessions.time`. Result: Athlete page showed stale times.

### The Solution
**When updating session time, update BOTH tables**

```typescript
// ✅ CORRECT - Update both tables
await supabase
  .from('weekly_sessions')
  .update({ time: newTime })
  .eq('id', sessionId)

await supabase
  .from('wods')
  .update({ publish_time: newTime })
  .eq('id', wodId)
```

**Where:** SessionManagementModal AND WODModal publish handlers

### History
- Fixed in v2.29 (commit: a2c84fe)
- Easy to forget because it "seems to work" on coach side

---

## 🗄️ Database Field Naming (Publishing Schema)

### The Problem
Inconsistent field naming between TypeScript and SQL caused confusion and bugs.

### The Standard
**Use these EXACT field names for publishing:**

| Feature | Correct Field Name | ❌ Wrong Alternatives |
|:---|:---|:---|
| Published status | `is_published` | published, status |
| Google Calendar ID | `google_event_id` | calendar_event_id, event_id |
| Section types | `publish_sections` | published_section_ids, sections |
| Event time | `publish_time` | event_time, time |
| Duration | `publish_duration` | event_duration_minutes, duration |

### History
- Fixed in v2.21 after Grok implementation used wrong names
- SQL migration created to correct schema

---

## 🎫 10-Card Auto-Tracking Logic

### The Rules
**When counter increments:**
- ✅ Booking status changes to 'confirmed'
- ✅ No-show marked (counts toward usage)
- ✅ Late cancel marked (counts toward usage)

**When counter decrements:**
- ✅ Booking cancelled (only if was 'confirmed')

**When counter DOES NOT change:**
- ❌ Waitlist bookings (not confirmed yet)
- ❌ Already-cancelled bookings

### The Code Pattern
```typescript
// ✅ CORRECT - Check current status before decrement
const { data: booking } = await supabase
  .from('bookings')
  .select('status, member_id')
  .eq('id', bookingId)
  .single()

if (booking.status === 'confirmed') {
  // Decrement 10-card counter
}
```

**Where:** `/api/bookings/create/route.ts`, `/api/bookings/cancel/route.ts`

### History
- Implemented in v2.26
- Uses Authorization header (not cookies) for auth

---

## 🔐 RLS Policies Status

### Current State
**PUBLIC policies are ENABLED for testing** - All users can access all data.

### Before Production
**MUST run migration:** `supabase/migrations/remove-public-rls-policies.sql`

### Why This Matters
- Security risk if forgotten
- Easy to miss because app "works fine" with public access
- Migration script already created, just needs execution

---

## 🔄 Rebooking Constraint (Partial Index)

### The Problem
Standard UNIQUE constraint on (member_id, session_id) prevented rebooking after cancellation.

### The Solution
**Use partial unique index** - Only enforced when status != 'cancelled'

```sql
CREATE UNIQUE INDEX unique_active_bookings
ON bookings(member_id, session_id)
WHERE status != 'cancelled';
```

**Migration:** `database/fix-rebooking-constraint.sql`

### Why This Works
- Cancelled bookings don't block new bookings
- Multiple cancelled records allowed for same member/session
- Active bookings still enforced as unique

### History
- Fixed in v2.27 after 500 error on rebooking
- Standard UNIQUE constraint was too restrictive

---

## 📊 Attendance vs 10-Card Counting

### The Distinction
**Attendance (get_member_attendance_count RPC):**
- ✅ Counts: 'confirmed' bookings only
- ❌ Excludes: 'no_show', 'late_cancel', 'cancelled', 'waitlist'

**10-Card Usage (ten_card_sessions_used):**
- ✅ Counts: 'confirmed', 'no_show', 'late_cancel'
- ❌ Excludes: 'cancelled', 'waitlist'

### Why Different
- Attendance = actual gym visits
- 10-card = classes "consumed" (even if member didn't show)

### Where This Matters
- TenCardModal calculation
- Member stats display
- Booking status logic

---

## 🎨 Component Naming Convention

### User-Facing Terms
**NEVER say "WOD" except for the section type**

| ❌ Wrong | ✅ Correct |
|:---|:---|
| "WOD Modal" | "Edit Workout Modal" or "Create Workout Modal" |
| "Create a WOD" | "Create a Workout" |
| "WOD card" | "Workout card" |

### Technical Terms
- `WODModal.tsx` = Edit Workout side panel (component name stays for legacy)
- `SessionManagementModal.tsx` = Manage Session popup (bookings, time, capacity)
- `wods` table = Technical name (keep as-is in code)

### Why This Matters
- User learning correct terminology
- Voice input compatibility ("workout" is easier to say)
- Professional communication

---

## 📁 File Path Convention

### Memory Bank Files
**ALWAYS include `memory-bank-` prefix**

```typescript
// ✅ CORRECT paths
/Users/chrishiles/SynologyDrive/CrossFit Hammerschmiede (CFH)/AI Development/forge-functional-fitness/memory-bank/memory-bank-activeContext.md
/Users/chrishiles/SynologyDrive/CrossFit Hammerschmiede (CFH)/AI Development/forge-functional-fitness/memory-bank/memory-bank-techContext.md
/Users/chrishiles/SynologyDrive/CrossFit Hammerschmiede (CFH)/AI Development/forge-functional-fitness/memory-bank/memory-bank-systemPatterns.md

// ❌ WRONG paths (will fail)
memory-bank/activeContext.md
memory-bank/techContext.md
```

### Why This Matters
- User has corrected this multiple times
- Wrong paths waste tokens on failed reads
- Copy exact paths from workflow-protocols.md

---

## 🔍 When to Use Task Agents (3-Point Test)

**MUST use Agent when ANY of these is true:**
1. ✅ Multi-Step: 3+ distinct steps/actions
2. ✅ Multi-File: 3+ independent files to search/read
3. ✅ Repetitive: Similar changes across multiple files

**Example: Use Agent for**
- "Where are errors from the client handled?" (exploratory search)
- "Update authentication across the app" (multi-file)
- "Add error handling to all API routes" (repetitive)

**Example: Direct work for**
- "Change button color in coach page" (1 file, simple)
- "Fix typo in README" (1 file, trivial)

---

**Last Updated:** 2025-11-03
**Total Size:** ~2.5KB
