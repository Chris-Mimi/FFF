# Session 95 - Backup Auto-Discovery, Google Calendar Types, Class Type Colors

**Date:** 2026-02-06
**Model:** Claude Opus 4.6
**Duration:** ~45 min

---

## Session Goals

1. Fix backup script missing `subscriptions` table
2. Make backup auto-discover new tables
3. Add workout type to Google Calendar events
4. Fix class type button colors on mobile
5. Misc fixes (label rename, email confirm, cost estimate)

---

## Completed Tasks

### 1. Backup Script Auto-Discovery

**Problem:** Backup script had a hardcoded table list — new tables could be missed.

**Solution:**
- Added `discoverTables()` function that calls `get_public_tables()` RPC
- Falls back to hardcoded `KNOWN_TABLES` list if RPC unavailable
- Alerts when new tables found: `New tables found: table_name`
- Shows total count: `Total tables backed up: 26/26`
- Added missing `subscriptions` table

**Requires SQL function in Supabase:**
```sql
CREATE OR REPLACE FUNCTION get_public_tables()
RETURNS TABLE(tablename TEXT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT tablename::TEXT
  FROM pg_tables
  WHERE schemaname = 'public';
$$;
```

**File:** scripts/backup-critical-data.ts

---

### 2. Google Calendar Workout Type Display

**Problem:** Workout type (AMRAP, For Time, etc.) not shown in Google Calendar events.

**Solution:**
- Looks up `workout_type_id` from `workout_types` table for selected sections
- Adds type name to section header in event description
- Format: `**Workout - AMRAP** 15 mins (1-15)`
- No change for sections without a workout type

**File:** app/api/google/publish-workout/route.ts (lines 118-132, 159-161)

---

### 3. Class Type Button Color Fix (Tailwind Safelist)

**Problem:** EKT/Tu/CFK/CFT buttons showed no color on mobile (indigo-600, violet-600 purged by Tailwind JIT).

**Solution:**
- Added `safelist` to tailwind.config.ts for all 4 class type colors
- `bg-cyan-600`, `bg-indigo-600`, `bg-rose-600`, `bg-violet-600` + hover variants

**Root Cause:** Tailwind JIT can't detect class names inside JavaScript objects (`CLASS_TYPE_COLORS`). Colors used elsewhere (like in JSX) are detected, but these were only in the config object.

**File:** tailwind.config.ts

---

### 4. Class Type Label Rename

- Renamed "T" → "Tu" (Turnen) for clarity
- Database key remains `t` unchanged
- **File:** app/coach/members/page.tsx (line 59)

---

### 5. Coach Email Confirmation

- Confirmed `mimi.hiles@web.de` email in Supabase Auth
- Was blocking coach login with "check email confirmation" message
- Used `supabase.auth.admin.updateUserById()` with `email_confirm: true`

---

### 6. Deployment Cost Estimate

- Created `Chris Notes/deployment-cost-estimate.md`
- Production: ~€74/month (Supabase Pro €25 + Stripe fees ~€47.50 + domain ~€1.50)
- Vercel Free tier sufficient for current traffic
- Supabase Free auto-pauses — Pro required for production

---

## Files Changed

### Modified:
- `scripts/backup-critical-data.ts` - Auto-discovery + subscriptions table
- `app/api/google/publish-workout/route.ts` - Workout type in calendar events
- `tailwind.config.ts` - Safelist for class type colors
- `app/coach/members/page.tsx` - "T" → "Tu" label

### Created:
- `Chris Notes/deployment-cost-estimate.md` - Cost breakdown

---

## Key Learnings

1. **Tailwind Safelist:** Dynamic class names in JS objects need safelisting — JIT can't detect them
2. **Backup Auto-Discovery:** Using `pg_tables` via RPC ensures new tables are always backed up
3. **Coach Accounts:** Creating users via Supabase dashboard may not auto-confirm email — use admin API

---

## Session Stats

- **Files Modified:** 4
- **Files Created:** 1
- **Database Migrations:** 1 pending (get_public_tables RPC)
