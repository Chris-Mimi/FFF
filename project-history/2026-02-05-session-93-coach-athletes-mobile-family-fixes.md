# Session 93: Coach Athletes Mobile Optimization & Family Member Fixes
**Date:** 2026-02-05
**Agent:** Opus 4.5
**Status:** Complete

## Overview
Mobile optimization for Coach Athletes page Payments tab, fixed duplicate deletion SQL that accidentally removed family members, and fixed payment data fetching for family members who don't have email addresses.

## Changes Made

### 1. Coach Athletes Page - Payments Tab Mobile Optimization
**File:** `app/coach/athletes/page.tsx` (PaymentsSection component)

**Changes:**
- Adjusted padding: `p-3 md:p-4` for cards
- Text sizes: `text-sm md:text-base` for headings
- Shortened button text: "Save Changes" → "Save", "Reset to 0" → "Reset"
- Shortened labels: "Total Sessions" → "Total", "Used Sessions" → "Used", "Expiry Date" → "Expiry"
- Made cancel button full-width on mobile: `w-full md:w-auto`

### 2. Coach Athletes Page - Tabs Overflow Fix
**File:** `app/coach/athletes/page.tsx` (lines 218-267)

**Issue:** "Payments" text running off the page on mobile

**Fixes:**
- Added `overflow-x-auto` and `min-w-max` to tab navigation container
- Hidden icons on mobile: `hidden md:block`
- Shortened tab labels:
  - "Benchmarks" → "Bench"
  - "Lifts" → "Lifts" (unchanged)
  - "Logbook" → "Log"
  - "Payments" → "Pay"
- Added `whitespace-nowrap` to prevent text wrapping

### 3. Delete Duplicates SQL Bug Fix
**File:** `Chris Notes/supabase-delete-cheatsheet.md` (created and updated)

**Bug:** Original SQL to delete duplicates only partitioned by `email`:
```sql
-- WRONG: Deletes family members who share same email
PARTITION BY email ORDER BY created_at DESC
```

**Impact:** Cody (family member) was deleted because:
- He shared the same email as Chris (primary account holder)
- The SQL kept only the newest record per email
- Neo survived because his email was NULL (NULLs aren't grouped in SQL)

**Fix:** Partition by BOTH email AND full_name:
```sql
-- CORRECT: Keeps each person even if they share an email
PARTITION BY email, full_name ORDER BY created_at DESC
```

### 4. Family Member Payment Data Fix
**File:** `app/coach/athletes/page.tsx` (fetchPaymentData function, lines 675-735)

**Issue:** "Athlete email not found" error when viewing family members on Athletes page

**Root Cause:**
- fetchPaymentData() queried athlete_profiles for email, then used that to find member
- Family members have no email in athlete_profiles
- Threw error at line 696: `throw new Error('Athlete email not found')`

**Fix:** Query members table directly by ID first:
```typescript
// First try to get member data directly by ID (works for family members)
const { data: memberById } = await supabase
  .from('members')
  .select('...')
  .eq('id', memberId)
  .single();

if (memberById) {
  member = memberById;
} else {
  // Fall back to email lookup for cases where athlete_profiles.user_id ≠ members.id
  // ... existing email lookup logic
}
```

### 5. 10-Card Section Conditional Display
**File:** `app/coach/athletes/page.tsx`

**Issue:** 10-Card management section showed for ALL athletes with default "10/10 sessions"

**Fix:**
1. Added `membership_types` to MemberData interface and Supabase query
2. Wrapped 10-Card section with conditional:
```tsx
{memberData?.membership_types?.includes('ten_card') && (
  <div className='bg-gray-50 rounded-lg p-3 md:p-4'>
    <h4>10-Card Sessions</h4>
    ...
  </div>
)}
```

### 6. Restored Cody to athlete_profiles
**SQL Used:**
```sql
-- Insert with NULL user_id first
INSERT INTO athlete_profiles (user_id, full_name, email)
VALUES (null, 'Cody Hiles', null);

-- Update with correct member ID
UPDATE athlete_profiles
SET user_id = '85d9ec49-166e-41f5-92e1-f6c0aab6edb9'
WHERE full_name = 'Cody Hiles' AND user_id IS NULL;
```

**Key Learning:** In this app:
- `athlete_profiles.user_id` = `members.id` (NOT auth.users.id)
- Family members have their own row in `members` table with `account_type: family_member`
- Family members can appear on Athletes page via `athlete_profiles` entries

## Files Modified
1. `app/coach/athletes/page.tsx` - Mobile optimization, payment data fix, 10-card conditional
2. `Chris Notes/supabase-delete-cheatsheet.md` - Created SQL cheatsheet with fixed queries

## Database Model Clarifications

### Members Table vs Auth.Users
- `members.id` is a UUID that corresponds to `athlete_profiles.user_id`
- For primary account holders: `members.id` = `auth.users.id`
- For family members: `members.id` is a unique UUID (no auth account)

### Family Member Pattern
- Primary account: `account_type: 'primary'`, has email, has auth account
- Family member: `account_type: 'family_member'`, no email, no auth account
- Family members link to primary via `primary_member_id`
- Family members can have `athlete_profiles` entries (linked via `user_id` = `members.id`)

## Key Learnings

### SQL NULL Handling
- NULLs are NOT grouped together in `PARTITION BY`
- Each NULL value is treated as unique
- This saved Neo (NULL email) while Cody (same email as Chris) was deleted

### Family Member Data Model
- Family members don't have auth accounts or emails
- They have their own `members.id` (UUID)
- To fetch their data, query by ID directly, not via email lookup

---

**Duration:** ~45 minutes
**Status:** Complete
