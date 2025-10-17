# RLS Policies Fix - Explanation & Testing Guide

## Problem Identified

The original `supabase-athlete-tables.sql` had **conflicting policies**:
- Lines 73-122: Proper auth-based policies (user can only access their own data)
- Lines 124-172: PUBLIC policies with `USING (true)` - allowing anyone to access everything

These conflicting policies were causing the 406 errors because Supabase's policy evaluation was getting confused by having both restrictive AND permissive policies on the same tables.

## Solution Applied

The migration file `supabase-fix-rls-policies.sql` does three things:

### 1. Removes ALL Existing Policies
Drops both the auth-based policies AND the problematic PUBLIC policies to start with a clean slate.

### 2. Creates Proper Auth-Based Policies
For each table (athlete_profiles, workout_logs, benchmark_results, lift_records), creates 4 policies:

#### SELECT (Read) Policy
```sql
CREATE POLICY "table_name_select_own"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id);
```
**What it does:** Allows authenticated users to view ONLY their own records where `user_id` matches their auth token.

#### INSERT (Create) Policy
```sql
CREATE POLICY "table_name_insert_own"
  ON table_name FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```
**What it does:** Allows authenticated users to create NEW records, but ONLY if they set the `user_id` to their own auth ID. This prevents users from creating data as someone else.

#### UPDATE (Modify) Policy
```sql
CREATE POLICY "table_name_update_own"
  ON table_name FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```
**What it does:** Allows authenticated users to modify their own records. The `USING` clause checks they own the existing record, and `WITH CHECK` ensures they don't change the `user_id` to someone else's.

#### DELETE (Remove) Policy
```sql
CREATE POLICY "table_name_delete_own"
  ON table_name FOR DELETE
  USING (auth.uid() = user_id);
```
**What it does:** Allows authenticated users to delete ONLY their own records.

### 3. Adds Coach Access Policies
For each table, adds a SELECT policy for coaches:

```sql
CREATE POLICY "table_name_select_coach"
  ON table_name FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );
```
**What it does:** If a user has `role: 'coach'` in their user_metadata, they can view ALL records in the table (not just their own). This is for coaches to monitor all athletes.

**Note:** Coaches can READ all data but can only INSERT/UPDATE/DELETE their own data.

## How to Apply the Migration

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to: **SQL Editor** (left sidebar)
3. Click **"New Query"**
4. Copy the entire contents of `supabase-fix-rls-policies.sql`
5. Paste into the query editor
6. Click **"Run"** button
7. You should see: "Success. No rows returned"

### Option 2: Via Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db reset  # This will run all migrations including the new one
```

## Testing the Policies

### Test 1: User Can View Their Own Profile
**Expected:** SUCCESS (200 response, data returned)

```javascript
const { data, error } = await supabase
  .from('athlete_profiles')
  .select('*')
  .eq('user_id', (await supabase.auth.getUser()).data.user.id);

console.log('My profile:', data, error);
```

### Test 2: User Can Insert Their Own Profile
**Expected:** SUCCESS (201 response, data inserted)

```javascript
const user = (await supabase.auth.getUser()).data.user;
const { data, error } = await supabase
  .from('athlete_profiles')
  .insert({
    user_id: user.id,
    full_name: 'Test User',
    email: user.email
  })
  .select();

console.log('Insert result:', data, error);
```

### Test 3: User Can Update Their Own Profile
**Expected:** SUCCESS (200 response, data updated)

```javascript
const user = (await supabase.auth.getUser()).data.user;
const { data, error } = await supabase
  .from('athlete_profiles')
  .update({ full_name: 'Updated Name' })
  .eq('user_id', user.id)
  .select();

console.log('Update result:', data, error);
```

### Test 4: User CANNOT View Other Users' Profiles
**Expected:** SUCCESS but with empty data array (not an error, just no results)

```javascript
// Try to view all profiles (should only return YOUR profile)
const { data, error } = await supabase
  .from('athlete_profiles')
  .select('*');

console.log('All profiles (should only show mine):', data, error);
// Should return: data = [your profile only], error = null
```

### Test 5: User CANNOT Insert Data with Someone Else's user_id
**Expected:** ERROR (403 or policy violation error)

```javascript
const { data, error } = await supabase
  .from('athlete_profiles')
  .insert({
    user_id: '00000000-0000-0000-0000-000000000000', // Fake UUID
    full_name: 'Hacker Attempt',
    email: 'fake@example.com'
  })
  .select();

console.log('Hacker attempt (should fail):', data, error);
// Should return: data = null, error = policy violation
```

## Verification Queries

After running the migration, you can verify the policies are active:

### Check Active Policies
Run this in Supabase SQL Editor:

```sql
SELECT
  tablename,
  policyname,
  cmd as operation,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('athlete_profiles', 'workout_logs', 'benchmark_results', 'lift_records')
ORDER BY tablename, policyname;
```

**Expected output:** You should see 5 policies per table (4 for users + 1 for coaches).

### Test Auth Context
Run this to see what Supabase sees as the current user:

```sql
SELECT
  auth.uid() as my_user_id,
  auth.jwt() -> 'user_metadata' as my_metadata;
```

**Expected output:** Should show your user_id and metadata (including role if set).

## Troubleshooting

### Still Getting 406 Errors?
1. **Clear browser cache and reload** - Old policies might be cached
2. **Check you're authenticated** - Run `supabase.auth.getUser()` and verify user is not null
3. **Verify user_id in table** - Check that existing records have the correct user_id
4. **Check browser console** - Look for the actual error message from Supabase

### Profile Not Saving?
1. **Check if profile already exists** - You can only INSERT once per user_id. Use UPDATE if it exists.
2. **Verify user_id matches** - The user_id you're inserting must match `auth.uid()`
3. **Check required fields** - Make sure you're not violating any NOT NULL constraints

### Coach Access Not Working?
1. **Verify role is set** - Run this SQL:
   ```sql
   SELECT raw_user_meta_data FROM auth.users WHERE id = 'YOUR_USER_ID';
   ```
2. **Update user metadata if needed**:
   ```sql
   UPDATE auth.users
   SET raw_user_meta_data = raw_user_meta_data || '{"role": "coach"}'::jsonb
   WHERE id = 'YOUR_USER_ID';
   ```

## What Changed

### Before (Problematic)
- 20 policies total (8 proper + 12 PUBLIC)
- PUBLIC policies allowed anyone to do anything
- Conflicting policies causing 406 errors
- No coach access

### After (Fixed)
- 20 policies total (16 user + 4 coach)
- Users can ONLY access their own data
- Coaches can READ all data
- No more PUBLIC policies
- Clear policy names for easier debugging

## Next Steps

1. **Run the migration** in Supabase Dashboard
2. **Test your Profile page** - Try to save your profile
3. **Check browser console** - Should see successful INSERT/UPDATE
4. **Verify in Supabase Dashboard** - Go to Table Editor > athlete_profiles and confirm data is saved
5. **Test with multiple users** - Create a second account and verify they can't see each other's data

---

**File Created:** `supabase-fix-rls-policies.sql`
**Date:** 2025-10-17
**Issue Fixed:** 406 errors on athlete_profiles table due to conflicting RLS policies
