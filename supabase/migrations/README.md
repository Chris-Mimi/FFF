# Database Migrations

## How to Apply Migrations

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Copy the entire migration file content
4. Click **Run** to execute

## Available Migrations

### `20251104_add_family_accounts.sql`

**Purpose:** Adds family account support to the members table

**What it does:**
- Adds `account_type` column (primary vs family_member)
- Adds `primary_member_id` to link family members to primary account
- Adds `display_name`, `date_of_birth`, `relationship` for family profiles
- Backfills existing users as 'primary' accounts
- Creates RLS policies for family member access
- Adds helper function for subscription checks

**Backward Compatibility:** ✅ Safe - All existing users automatically become 'primary' accounts

**Before Running:**
- Backup your database (optional but recommended)
- Review the SQL in a staging environment if available

**After Running:**
- Verify with: `SELECT id, email, account_type, display_name FROM members;`
- All existing users should show `account_type = 'primary'`

## Migration Naming Convention

Format: `YYYYMMDD_description.sql`

Example: `20251104_add_family_accounts.sql`
