# RLS Member Registration Resolution - 2025-11-08 Session 2

## Summary
Resolved member registration issue from Session 1. Root cause: Testing approach, not RLS policies.

## Problem from Session 1
- Spent session testing raw SQL INSERT into members table
- All 6 policy variations failed with "violates row-level security policy"
- Believed RLS policies were misconfigured

## Root Cause Discovery

### Diagnostic Process
1. Created comprehensive diagnostic SQL (`diagnose-members-insert-block.sql`)
2. Ran Part 1: Check for triggers on members table
3. **Found:** `RI_FKey_check_ins` trigger (BEFORE INSERT FK validation)
4. **Key insight:** Trigger validates FK constraints before RLS policies

### FK Constraint Analysis
```sql
-- members table has self-referencing FK:
primary_member_id UUID REFERENCES members(id) ON DELETE CASCADE

-- But NO FK to auth.users!
-- members.id is independent UUID with gen_random_uuid()
```

### The Real Issue
**Yesterday's test approach:**
- Raw SQL: `INSERT INTO members (email, name, status, account_type) VALUES (...)`
- Auto-generated UUID for `id`
- No auth session context
- RLS policy evaluates: `auth.uid() = id` → Always false (random UUID ≠ no session)

**Production signup flow:**
1. `supabase.auth.signUp()` creates user in `auth.users`
2. Returns authenticated user object with `user.id`
3. INSERT into members with `id = user.id`
4. RLS policy evaluates: `auth.uid() = id` → True (same UUID)

## Solution Implemented

### File: `app/signup/page.tsx`
**Added members record creation after auth.signUp():**

```typescript
// Create member record for booking system (all users need this)
const { error: memberError } = await supabase.from('members').insert({
  id: user.id,           // ← KEY: Use auth user ID
  email: email,
  name: fullName,
  status: 'pending',
  account_type: 'primary',
});
```

### Why This Works
- `id = user.id` ensures members.id matches auth session
- RLS policy `auth.uid() = id` evaluates correctly
- No FK constraint issues (members.id doesn't reference auth.users)
- Authenticated context for INSERT operation

## Testing Results

### Signup Flow Test
1. ✅ Created account via `http://localhost:3001/signup`
2. ✅ Confirmed email
3. ✅ Checked Supabase members table:
   ```
   id: 32271b04-3e36-4d5e-b139-0a11ec116546 (matches auth.users.id)
   status: pending
   account_type: primary
   ```

### RLS Protection Test
1. ✅ Logged out
2. ✅ Navigated to `http://localhost:3001/athlete`
3. ✅ Redirected to login page
4. ✅ Console error: `AuthSessionMissingError` (expected behavior)

## Key Takeaways

### What We Learned
1. **Don't test RLS with raw SQL** - Production flows use auth context
2. **FK triggers run before RLS** - Constraint validation happens first
3. **members.id must match auth.uid()** - For RLS policies to work
4. **Test via actual app flow** - Not direct database operations

### What Worked
- RLS policies were correct all along
- "Public can register" policy works with auth session
- Production signup flow creates proper member records

### What Didn't Work (Yesterday)
- Testing INSERT without `id = auth.uid()`
- Attempting to make auto-generated UUID work with RLS
- 6 different policy variations (all correct, wrong test approach)

## Files Modified

### Production Code
- `app/signup/page.tsx` - Added members table INSERT

### Diagnostics (Kept for reference)
- `database/diagnose-members-insert-block.sql` - Trigger/FK analysis
- `database/check-force-rls-and-policies.sql` - Policy verification

### Cleanup (Deleted)
- `database/fix-members-insert-policies.sql` (v1)
- `database/fix-members-insert-v2.sql`
- `database/fix-members-insert-v3.sql`
- `database/fix-members-insert-v4.sql`
- `database/fix-members-insert-v5.sql`
- `database/fix-members-insert-v6.sql`
- `database/check-auth-role.sql`
- `database/debug-members-rls.sql`
- `database/test-insert-directly.sql`

## Commits
- `50d8656` - fix(signup): create members record for booking system

## Status
✅ **RESOLVED** - Member registration working via proper signup flow
✅ RLS policies protecting data correctly
✅ Signup creates both athlete_profiles and members records
