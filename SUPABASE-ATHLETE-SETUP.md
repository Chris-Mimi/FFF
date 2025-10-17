# Supabase Athlete Tables Setup

This document explains how to set up the athlete-related database tables in Supabase.

## Tables Created

### 1. **athlete_profiles**
Stores athlete personal information and emergency contacts.

**Fields:**
- `id` (UUID, primary key)
- `user_id` (UUID, references auth.users)
- `full_name`, `email`, `date_of_birth`, `phone_number`
- `height_cm` (integer), `weight_kg` (decimal)
- `emergency_contact_name`, `emergency_contact_phone`
- `created_at`, `updated_at` (timestamps)

### 2. **workout_logs**
Records athlete's daily workout results and notes.

**Fields:**
- `id` (UUID, primary key)
- `user_id` (UUID, references auth.users)
- `wod_id` (UUID, references wods table)
- `workout_date` (date)
- `result` (text - time or score)
- `notes` (text - athlete's comments)
- `created_at`, `updated_at` (timestamps)

### 3. **benchmark_results**
Tracks performance on classic CrossFit benchmark WODs.

**Fields:**
- `id` (UUID, primary key)
- `user_id` (UUID, references auth.users)
- `benchmark_name` (text - e.g., "Fran", "Helen")
- `result` (text - time or score)
- `notes` (text)
- `workout_date` (date)
- `created_at`, `updated_at` (timestamps)

### 4. **lift_records**
Stores barbell lift tracking with 1RM calculations.

**Fields:**
- `id` (UUID, primary key)
- `user_id` (UUID, references auth.users)
- `lift_name` (text - e.g., "Back Squat", "Deadlift")
- `weight_kg` (decimal - weight lifted in kilograms)
- `reps` (integer - number of repetitions)
- `calculated_1rm` (decimal - estimated or actual 1RM)
- `notes` (text)
- `lift_date` (date)
- `created_at`, `updated_at` (timestamps)

## Setup Instructions

### Step 1: Run the SQL Script

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project (xvrefulklquuizbpkppb)
3. Click "SQL Editor" in the left sidebar
4. Click "+ New query" button (top right)
5. Open the file `supabase-athlete-tables.sql`
6. Copy ALL the SQL code from that file
7. Paste it into the SQL editor
8. Click "Run" button (or press Ctrl+Enter / Cmd+Enter)

### Step 2: Verify Tables Created

1. Go to "Table Editor" in the left sidebar
2. You should see 4 new tables:
   - `athlete_profiles`
   - `workout_logs`
   - `benchmark_results`
   - `lift_records`

### Step 3: Check Row Level Security

All tables have RLS enabled with two sets of policies:

1. **User-specific policies** - For when Supabase Auth is implemented
   - Users can only access their own data
   - Ready for production use

2. **PUBLIC policies** - For current development
   - Anyone can access all data
   - **IMPORTANT:** Remove these before going live!
   - Marked with comments in the SQL file

## Data Storage Details

### Units
- **Weights:** All stored in kilograms (kg)
- **Distances:** All stored in meters (m) and kilometers (km)
- **Heights:** Stored in centimeters (cm)

### Indexes
Performance indexes created on:
- All `user_id` fields (for fast user queries)
- Date fields (`workout_date`, `lift_date`)
- Lookup fields (`benchmark_name`, `lift_name`)

## Next Steps

After running this SQL:

1. **Test the tables** - Try inserting sample data
2. **Connect the frontend** - Update athlete dashboard to use these tables
3. **Implement Supabase Auth** - Replace sessionStorage with proper authentication
4. **Remove PUBLIC policies** - Once auth is working, delete the PUBLIC RLS policies

## Security Notes

⚠️ **Important:** The PUBLIC policies are temporary for development only!

Before deploying to production:
1. Implement Supabase Auth
2. Remove all policies with "PUBLIC" in the name
3. Test that user-specific policies work correctly
4. Ensure users can only see/edit their own data

## 1RM Calculation

The `lift_records` table includes a `calculated_1rm` field. The app uses the **Brzycki Formula**:

```
1RM = weight × (36 / (37 - reps))
```

This is calculated on the frontend before saving to the database.
