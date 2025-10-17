# Authentication & Profile Data Fix Summary

## Issues Identified

### Issue 1: Session Not Persisting (Browser Not Offering to Save Password)
**Root Cause:** The Supabase client was not configured to persist authentication sessions in localStorage. It was using default settings which don't enable session persistence.

### Issue 2: Profile Data Not Saving
**Root Cause:** No specific bug in the save logic, but the function lacked proper debugging and user feedback. The issue was likely related to:
1. No visual confirmation that save succeeded or failed
2. Errors being swallowed silently
3. No debugging output to help diagnose issues

## Files Modified

### 1. `/lib/supabase.ts` (Lines 6-13)
**What Changed:**
- Added authentication configuration with `persistSession: true`
- Enabled `autoRefreshToken` for automatic token renewal
- Configured `detectSessionInUrl` for OAuth redirects
- Set storage to use `localStorage` for session persistence

**Before:**
```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**After:**
```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
```

**Why This Fixes Session Persistence:**
- `persistSession: true` tells Supabase to store the session in localStorage
- This allows the browser to offer password-saving functionality
- Sessions will persist across page reloads and browser restarts
- Users won't need to log in every time

### 2. `/lib/auth.ts` (Lines 8-17, 60-75)
**What Changed:**
- Added console logging to `getCurrentUser()` to track session retrieval
- Added console logging to `signInWithEmail()` to track login success

**Lines 8-17:**
```typescript
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    console.log('getCurrentUser result:', { user: user?.id, email: user?.email, error });
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}
```

**Lines 60-75:**
```typescript
export async function signInWithEmail(email: string, password: string) {
  try {
    console.log('Attempting sign in for:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    console.log('Sign in successful:', { userId: data.user?.id, email: data.user?.email, session: !!data.session });
    return data;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
}
```

### 3. `/app/athlete/page.tsx` (Lines 169-206, 202-263)
**What Changed:**
- Added extensive console logging to `fetchProfile()` to debug data loading
- Added console logging to `handleSaveProfile()` to track save operations
- Changed alerts to provide more specific feedback (create vs update)
- Added `.select()` to save operations to return the saved data
- Improved error messages to show the actual error

**Lines 169-206 (fetchProfile):**
```typescript
const fetchProfile = async () => {
  console.log('Fetching profile for user:', userId);
  setLoading(true);
  try {
    const { data, error } = await supabase
      .from('athlete_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    console.log('Profile fetch result:', { data, error });

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (data) {
      console.log('Setting profile data from database:', data);
      setProfile({...});
    } else {
      console.log('No profile data found, user will need to create profile');
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
  } finally {
    setLoading(false);
  }
};
```

**Lines 202-263 (handleSaveProfile):**
```typescript
const handleSaveProfile = async () => {
  console.log('Starting profile save for user:', userId);
  console.log('Profile data to save:', profile);

  try {
    // ... existing check logic ...

    if (existingProfile) {
      console.log('Updating existing profile with id:', existingProfile.id);
      const { data, error } = await supabase
        .from('athlete_profiles')
        .update({...})
        .eq('id', existingProfile.id)
        .select();  // NEW: Returns the saved data

      console.log('Update result:', { data, error });
      if (error) throw error;
      alert('Profile updated successfully!');  // More specific message
    } else {
      console.log('Inserting new profile');
      const { data, error } = await supabase
        .from('athlete_profiles')
        .insert(profileData)
        .select();  // NEW: Returns the saved data

      console.log('Insert result:', { data, error });
      if (error) throw error;
      alert('Profile created successfully!');  // More specific message
    }
  } catch (error: any) {
    console.error('Error saving profile:', error);
    alert(`Failed to save profile: ${error.message || 'Unknown error'}. Please check the console for details.`);
  }
};
```

## Database Schema Updates Required

### Missing Columns in Supabase
Run this SQL in your Supabase SQL Editor to add missing columns:

```sql
-- Add missing columns to existing tables
ALTER TABLE benchmark_results
ADD COLUMN IF NOT EXISTS scaling TEXT;

ALTER TABLE lift_records
ADD COLUMN IF NOT EXISTS rep_max_type TEXT;
```

This SQL has been saved to: `supabase-athlete-tables-update.sql`

## Testing Instructions

### Test 1: Session Persistence
1. Clear your browser's localStorage (DevTools > Application > Local Storage > Clear)
2. Log in with your credentials
3. **Expected:** Browser should offer to save your password
4. **Check Console:** Should see "Sign in successful" with user info
5. Refresh the page (F5)
6. **Expected:** Should stay logged in, redirected to athlete dashboard
7. **Check Console:** Should see "getCurrentUser result" with your user ID
8. Close browser completely, reopen
9. Navigate to the app
10. **Expected:** Should still be logged in

### Test 2: Profile Data Save
1. Log in and go to Profile tab
2. Open browser DevTools Console (F12)
3. Fill out profile fields (name, email, phone, etc.)
4. Click "Save Changes"
5. **Check Console Output:**
   - "Starting profile save for user: [your-user-id]"
   - "Profile data to save: {full_name: ..., email: ...}"
   - "Existing profile check: {existingProfile: ..., fetchError: ...}"
   - "Formatted profile data: {...}"
   - Either "Updating existing profile" or "Inserting new profile"
   - "Update/Insert result: {data: [...], error: null}"
6. **Expected Alert:** "Profile created successfully!" or "Profile updated successfully!"
7. Refresh the page (F5)
8. **Expected:** All profile data should still be there
9. Log out, log back in
10. **Expected:** Profile data should still be there

### What to Look For in Console

**On Successful Save:**
```
Starting profile save for user: abc-123-def-456
Profile data to save: {full_name: "John Doe", email: "john@example.com", ...}
Existing profile check: {existingProfile: null, fetchError: {code: "PGRST116", ...}}
Formatted profile data: {user_id: "abc-123-def-456", full_name: "John Doe", ...}
Inserting new profile
Insert result: {data: [{id: "xyz-789", ...}], error: null}
```

**On Failed Save (Shows the problem):**
```
Starting profile save for user: abc-123-def-456
Profile data to save: {full_name: "John Doe", ...}
...
Insert result: {data: null, error: {message: "duplicate key value violates unique constraint", ...}}
```

## What Each Fix Does

### Session Persistence Fix
- **Before:** Sessions stored in memory only, cleared on page refresh
- **After:** Sessions stored in localStorage, persist across sessions
- **Result:** Browser can save passwords, users stay logged in

### Profile Save Fix
- **Before:** Silent failures, no feedback, hard to debug
- **After:** Detailed logging, clear success/error messages, visible errors
- **Result:** You can see exactly what's happening and where it fails

## Troubleshooting

### If Session Still Not Persisting:
1. Check browser console for errors
2. Verify localStorage is enabled (some privacy modes disable it)
3. Check DevTools > Application > Local Storage > [your-domain]
   - Should see keys like `supabase.auth.token`

### If Profile Still Not Saving:
1. Check console logs for the exact error message
2. Common issues:
   - **RLS Policy Error:** Database permissions not set correctly
   - **Duplicate Key Error:** Profile already exists for this user
   - **Foreign Key Error:** user_id doesn't match authenticated user
   - **Type Error:** Data format doesn't match schema (e.g., string vs integer)
3. If error mentions RLS (Row Level Security):
   - Check if you're logged in (check console for getCurrentUser result)
   - Verify your user_id matches the session user_id

### If Data Fetches But Doesn't Display:
1. Check console: "Setting profile data from database"
2. Verify the data structure matches the form state
3. Check for type mismatches (numbers as strings, etc.)

## Next Steps

1. **Test the session persistence** - Browser should offer to save password
2. **Test profile save** - Watch console logs to see what happens
3. **Run the SQL update** - Add missing columns to database
4. **Report back** - Share console logs if issues persist

## Additional Notes

### Console Logging (For Development Only)
The extensive console logging added is for debugging purposes. Once everything works:
- You can remove the console.log statements
- Or wrap them in `if (process.env.NODE_ENV === 'development')`
- Keep the console.error statements for production debugging

### Security Considerations
The current setup uses PUBLIC RLS policies (lines 124-172 in supabase-athlete-tables.sql) which allow anyone to access data. This is noted as "for development" in the SQL comments.

**Before production:**
1. Remove the PUBLIC policies (lines 124-172)
2. Keep only the user-specific policies (lines 72-122)
3. Test that users can only access their own data

### Browser Password Manager
Now that sessions persist properly:
- Chrome/Edge: Should offer "Save password" on login
- Firefox: Should offer "Save password" on login
- Safari: Should offer to save to Keychain
- If not offering, check browser settings for password manager
