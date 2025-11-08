# RLS Policy Debugging Session - 2025-11-08

## Goal
Remove PUBLIC RLS policies before production deployment. Ensure only authenticated users can access data, except for member registration.

## What Worked ✅

### 1. Identified Existing Issues
- Found 20+ PUBLIC CRUD policies on athlete data tables
- Identified missing `late_cancel` status in 10-card recalculation
- Successfully created comprehensive RLS migration

### 2. Fixed 10-Card Bug
- **File:** `components/TenCardModal.tsx:60`
- **Issue:** `late_cancel` status missing from recalculation query
- **Fix:** Added `'late_cancel'` to `.in('status', ['confirmed', 'no_show', 'late_cancel'])`
- **Commit:** ea1aad4

### 3. Created Initial RLS Migration
- **File:** `database/remove-all-public-policies.sql`
- Successfully removed PUBLIC CRUD policies for athlete tables
- Restricted benchmark/lift reference data to authenticated users
- **Commit:** 2045f77

### 4. Fixed Coach Policies
- **File:** `database/fix-rls-policies-v2.sql`
- Added missing WITH CHECK clauses to INSERT policies
- Changed coach policies to require `auth.role() = 'authenticated'`
- **Result:** Policies look correct in pg_policies view

## What Didn't Work ❌

### Member Registration INSERT - Still Failing

**Test Result:** `new row violates row-level security policy for table "members"`

**Confirmed:**
- RLS is enabled on members table ✓
- FORCE ROW LEVEL SECURITY is FALSE ✓
- No RESTRICTIVE policies exist ✓
- INSERT works when RLS is disabled ✓
- All policies are PERMISSIVE ✓
- No conflicting table constraints ✓

**Attempted Solutions (All Failed):**

#### Attempt 1: TO anon / TO authenticated role assignment
- **File:** `database/fix-members-insert-policies.sql`
- **Approach:** Use `TO anon` for registration, `TO authenticated` for family members
- **Result:** FAILED - anon role not recognized correctly

#### Attempt 2: auth.uid() IS NULL check
- **File:** `database/fix-members-insert-v2.sql`
- **Approach:** Use `TO public` with `auth.uid() IS NULL` vs `IS NOT NULL`
- **Result:** FAILED - auth.uid() doesn't evaluate correctly

#### Attempt 3: auth.role() comparison
- **File:** `database/fix-members-insert-v3.sql`
- **Approach:** Check `auth.role() = 'anon'` vs `= 'authenticated'`
- **Result:** FAILED - auth.role() returns NULL in SQL Editor

#### Attempt 4: current_user check
- **File:** `database/fix-members-insert-v4.sql`
- **Approach:** Use `current_user = 'anon'` to check Postgres role
- **Result:** FAILED - still blocked

#### Attempt 5: ALTER POLICY TO anon
- **File:** `database/fix-members-insert-v5.sql`
- **Approach:** Create policy then ALTER POLICY TO anon to assign role
- **Result:** FAILED - still blocked (and policies didn't change from v2)

#### Attempt 6: Remove auth.uid() check entirely
- **File:** `database/fix-members-insert-v6.sql`
- **Approach:** Just check `status = 'pending' AND account_type = 'primary'`
- **Result:** FAILED - still blocked even without auth checks

### Key Findings

1. **auth.uid()** in SQL Editor with `SET ROLE anon`:
   - Returns NULL
   - Check `auth.uid() IS NULL` doesn't work as expected

2. **auth.role()** in SQL Editor with `SET ROLE anon`:
   - Returns NULL (not 'anon')
   - Can't use for role discrimination

3. **current_user** with `SET ROLE anon`:
   - Returns 'anon' correctly
   - But policy still blocks even when checking this

4. **Test without any auth checks:**
   - Even policy with ONLY `status = 'pending'` check fails
   - Suggests something deeper is wrong

5. **Policy state inconsistency:**
   - v5 migration showed policies reverting to v2 state
   - Possible caching issue or transaction rollback

## Current State

### Working RLS Policies
- ✅ Athlete data tables (profiles, logs, benchmarks, lifts)
- ✅ Reference data (benchmarks, lifts) - authenticated only
- ✅ Booking system (sessions) - authenticated only

### Not Working
- ❌ Member registration (public INSERT with status='pending')
- ❌ Family member creation (authenticated INSERT)

### Current INSERT Policies on Members
```sql
"Public can register"
  WITH CHECK (status = 'pending' AND account_type = 'primary')

"Users can add family members"
  WITH CHECK (account_type = 'family_member' AND auth.uid() IS NOT NULL AND auth.uid() = primary_member_id)
```

## Test Environment

**Files Created:**
- `test-rls-policies.js` - Node.js test script using Supabase client
- `check-table-data.js` - Verify tables have data
- `test-member-insert.js` - Detailed member INSERT test
- `detailed-insert-test.js` - Test with all required fields
- `check-current-role.js` - Check auth role
- Various SQL debugging scripts

**Test Results:**
- Benchmark/lift tables: Return 0 rows (secure but tables empty)
- Athlete profiles: BLOCKED ✅
- Member registration: BLOCKED ❌ (should work)

## Next Steps for New Session

### High Priority
1. **Investigate why even simplest policy fails**
   - Policy with ONLY `status = 'pending'` check still blocked
   - Suggests issue beyond policy logic

2. **Check Supabase-specific configuration**
   - Review Supabase Dashboard RLS settings
   - Check if there's a project-level setting overriding policies
   - Verify anon role permissions at database level

3. **Alternative approaches**
   - Consider using service role for registration API endpoint
   - Implement registration via Edge Function with elevated permissions
   - Check if Supabase Auth handles registration differently

### Medium Priority
4. **Add test data to benchmark/lift tables**
   - Can't verify RLS blocking without data
   - Need to confirm 0 rows = RLS working, not empty tables

5. **Test authenticated user access**
   - Verify coach and athlete pages work normally
   - Confirm RLS doesn't break existing functionality

### Low Priority
6. **Document as known issue if unfixable**
   - Registration through Supabase Auth UI works
   - Direct database INSERT blocking might be acceptable
   - Focus on protecting existing data (primary goal achieved)

## Important Context for Next Session

**Don't repeat these attempts:**
- ✗ Using `TO anon` / `TO authenticated`
- ✗ Checking `auth.uid() IS NULL`
- ✗ Checking `auth.role() = 'anon'`
- ✗ Checking `current_user = 'anon'`
- ✗ Removing auth checks entirely

**All of the above failed with the same error despite different approaches.**

**The issue appears to be deeper than policy logic - possibly:**
- Supabase-specific behavior
- Database role permissions
- Project configuration
- Function/trigger blocking INSERT
- Cached policy state

## Files to Review in Next Session

**Migrations (in order):**
1. `database/remove-all-public-policies.sql` - Initial cleanup
2. `database/fix-rls-policies-v2.sql` - Comprehensive fix
3. `database/fix-members-insert-v6.sql` - Latest attempt (failed)

**Test Scripts:**
- `test-rls-policies.js` - Main test (updated with account_type)
- `database/check-force-rls-and-policies.sql` - Diagnostic queries

**Reference:**
- `project-history/2025-11-08-rls-debugging-session.md` - This file
