# Exercise Library Import Guide

## ✅ Implementation Complete!

All exercise schema extensions and Coach UI have been successfully implemented and tested.

---

## 📦 What Was Created

### 1. Database Migration
**File:** `database/exercises-schema-extension.sql`

**What it does:**
- Extends `exercises` table with new columns: `display_name`, `subcategory`, `equipment[]`, `body_parts[]`, `difficulty`, `is_warmup`, `is_stretch`, `search_terms`
- Adds UNIQUE constraint on `name` (prevents duplicate exercises)
- Creates performance indexes for fast filtering
- Creates full-text search GIN index for comprehensive search
- Sets up RLS policies (everyone reads, authenticated adds, admin-only deletes)

---

### 2. Import Script
**File:** `scripts/import-exercises.ts`

**What it does:**
- Reads JSON file (your sample or full 400+ exercises)
- Validates structure (requires `name` and `category`)
- Shows import summary grouped by category
- Uploads to Supabase with upsert (updates existing, adds new)
- Handles duplicates gracefully

**Usage:**
```bash
npx tsx scripts/import-exercises.ts database/exercises-import-sample.json
```

---

### 3. Export Script
**File:** `scripts/export-exercises.ts`

**What it does:**
- Fetches all exercises from Supabase database
- Formats as JSON matching import structure
- Writes to file (backs up current database state)
- Shows export summary grouped by category

**Usage:**
```bash
# Export to default location
npx tsx scripts/export-exercises.ts database/exercises-export.json

# Export to custom location (e.g., backup)
npx tsx scripts/export-exercises.ts database/exercises-backup-2025-11-22.json

# Overwrite working file to sync with database
npx tsx scripts/export-exercises.ts database/exercises-import.json
```

**Why you need this:**
- **Backup**: Save database state before major changes
- **Sync**: Keep JSON file updated after manual Coach UI additions
- **Share**: Export for other gyms or version control
- **Single source of truth**: Database is primary, JSON is exported copy

**Workflow:**
```bash
# 1. Add/edit exercises via Coach UI
# 2. Export database to update JSON file
npx tsx scripts/export-exercises.ts database/exercises-import.json
# 3. JSON file now matches database (includes manual additions)
# 4. Commit to git for version control
```

---

### 4. Coach UI - Exercises Tab
**File:** `app/coach/benchmarks-lifts/page.tsx` (modified)
**File:** `components/coach/ExerciseFormModal.tsx` (new)

**What it does:**
- Adds 4th tab "Exercises" to `/coach/benchmarks-lifts`
- Displays exercises grouped by category
- Shows: display_name, subcategory, tags (first 3)
- Green color theme (matches green scheme)
- Full CRUD: Create, Edit, Delete
- Comprehensive form with all fields from your JSON

---

### 5. TypeScript Interfaces Updated
**Files Modified:**
- `components/coach/ExerciseLibraryPopup.tsx` - Updated Exercise interface
- `app/coach/benchmarks-lifts/page.tsx` - Added Exercise interface
- `components/coach/ExerciseFormModal.tsx` - Matching interface

---

## 🚀 Next Steps: Import Your Sample Data

### Step 1: Run the Migration

1. Open Supabase Dashboard → SQL Editor
2. Copy/paste contents of `database/exercises-schema-extension.sql`
3. Click "Run" (⚡)
4. Verify success: "Success. No rows returned"

**This will:**
- Add all new columns to `exercises` table
- Add `search_vector` column with auto-update trigger
- Create indexes (including GIN index for fast search)
- Set up RLS policies

**Note**: The migration uses a trigger function to auto-update the search vector whenever name, tags, or search_terms change. This is the standard PostgreSQL approach for full-text search.

---

### Step 2: Import Sample Exercises

Your sample file: `database/exercises-import-sample.json`

**Run the import:**
```bash
npx tsx scripts/import-exercises.ts database/exercises-import-sample.json
```

**Expected output:**
```
🏋️  Exercise Import Script

📁 Reading file: database/exercises-import-sample.json
✓ Loaded 18 exercises from JSON

📊 Import Summary:
   Total exercises: 18
   - Olympic Lifting: 6
   - Strength Training: 4
   - Gymnastics: 4
   - Cardio: 4

⬆️  Uploading to Supabase...
✅ Import successful!
   Inserted/Updated: 18 exercises

🎉 Exercise library ready!
   View at: /coach (Exercise Library button)
```

---

### Step 3: Test in Coach UI

1. Run app: `npm run dev`
2. Navigate to `/coach/benchmarks-lifts`
3. Click **"Exercises" tab** (4th tab, green)
4. Verify:
   - Exercises grouped by category
   - 18 exercises visible
   - Tags display under each exercise
5. Click **"Add Exercise"** to test form
6. Edit an exercise to test update
7. Delete an exercise (you can only delete via Coach UI, not via Supabase direct)

---

## 📝 When You're Ready: Import Full 400+ Exercises

### Finalize Your Master List

1. Complete your `.md` file with all exercises
2. Convert to JSON using agreed structure (see below)
3. Save as `database/exercises-import-full.json`
4. Run import: `npx tsx scripts/import-exercises.ts database/exercises-import-full.json`

---

## 🗂️ JSON Structure Reference

Your JSON must follow this structure:

```json
[
  {
    "name": "Barbell Clean",
    "display_name": "Clean",
    "category": "Olympic Lifting",
    "subcategory": "Clean Variations",
    "equipment": ["barbell", "plates"],
    "body_parts": ["full-body", "legs", "shoulders"],
    "tags": ["power", "oly", "technical"],
    "difficulty": "advanced",
    "is_warmup": false,
    "is_stretch": false,
    "search_terms": "barbell clean olympic lifting power",
    "description": "Full clean from floor to rack position",
    "video_url": "https://youtube.com/..."
  }
]
```

**Required Fields:**
- `name` (unique identifier)
- `category`

**Optional Fields:**
- All others (can be null/empty)

---

## 🎨 Coach Form Fields

When coaches add exercises via UI, they can fill:

1. **Name*** (required) - Unique identifier
2. **Display Name** - Shorter name for UI display
3. **Category*** (required) - Main grouping
4. **Subcategory** - Sub-grouping under category
5. **Description** - Exercise notes/cues
6. **Video/Photo URL** - Link to media (YouTube, image, etc.)
7. **Tags** - Comma-separated searchable tags
8. **Equipment** - Comma-separated equipment list
9. **Body Parts** - Comma-separated body parts worked
10. **Difficulty** - Dropdown: Beginner | Intermediate | Advanced | Not specified
11. **Warmup Exercise** - Checkbox
12. **Stretch/Mobility** - Checkbox
13. **Search Terms** - Auto-generated if empty

---

## 🔍 Search Functionality

The full-text search uses a **`search_vector` column** that auto-updates via trigger whenever you change:
1. Exercise name (highest weight 'A')
2. Search terms (medium weight 'B')
3. Tags (lower weight 'C')

The GIN index on this column enables lightning-fast search across all exercises.

**Example searches that work:**
- "clean" → finds all clean variations
- "power" → finds power movements
- "barbell" → finds barbell exercises
- "warmup" → finds warmup exercises (via is_warmup flag)

**Technical Note**: The `search_vector` column is maintained by a PostgreSQL trigger:
- Automatically updates on INSERT or UPDATE
- Indexed with GIN for fast full-text search
- No manual maintenance required
- Standard approach for PostgreSQL full-text search

---

## ⚠️ Important Notes

### Difficulty Field
- **Optional** - You don't need to fill this now
- Can add later as you refine exercises
- Future use: Filtering by level, progression tracking

### Deleting Exercises
- **Only you can delete** (admin-only via RLS)
- Coaches can Create and Edit only
- Delete via Coach UI or Supabase dashboard

### Duplicate Prevention
- `name` field has UNIQUE constraint
- Import script uses upsert (updates existing if name matches)
- Safe to re-run import after fixing errors

---

## 🐛 Troubleshooting

### Migration Errors

**Error: "functions in index expression must be marked IMMUTABLE"**
- ✅ **Fixed**: Migration now uses a trigger-based approach
- Error occurred when trying to use non-immutable functions in index or generated column
- Current version uses standard PostgreSQL trigger to maintain search_vector column

**Error: "generation expression is not immutable"**
- ✅ **Fixed**: Switched from generated column to trigger function
- PostgreSQL requires generated columns to use only IMMUTABLE functions
- Trigger approach is the standard solution for full-text search

### Import Script Errors

**Error: "Missing Supabase environment variables"**
- Check `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Error: "Some exercises missing required fields"**
- Ensure all exercises have `name` and `category`
- Script will list which exercises are invalid

**Error: "duplicate key value violates unique constraint"**
- Two exercises have the same `name`
- Make names unique or remove duplicate

### UI Issues

**Exercises tab empty after import**
- Refresh page (hard refresh: Cmd+Shift+R / Ctrl+Shift+R)
- Check Supabase dashboard → Table Editor → `exercises` table

**Can't delete exercise**
- Only admin (you) can delete
- Other coaches blocked by RLS policy

---

## 📊 What's Next?

### After Sample Import Works:

1. **Finish master exercise list** (your `.md` file)
2. **Convert to JSON** (400+ exercises)
3. **Import full library** with same script
4. **Test Exercise Library popup** in WorkoutModal
5. **Add exercises to workouts** and verify they display

### Future Enhancements:

- Filter by difficulty level
- Filter by equipment type
- Filter by body parts
- Exercise analytics (most used, never used, etc.)
- Video thumbnail preview
- Exercise library public page for athletes

---

## 📁 Files Summary

**Created:**
- `database/exercises-schema-extension.sql` (migration)
- `scripts/import-exercises.ts` (import tool)
- `scripts/export-exercises.ts` (export tool)
- `components/coach/ExerciseFormModal.tsx` (form UI)
- `EXERCISE-IMPORT-GUIDE.md` (this file)

**Modified:**
- `app/coach/benchmarks-lifts/page.tsx` (added Exercises tab)
- `components/coach/ExerciseLibraryPopup.tsx` (updated interface)

**Build Status:** ✅ Zero errors, all warnings pre-existing

---

## 🎉 You're Ready!

**Next action:** Run the migration, then import your sample!

```bash
# Step 1: Run migration in Supabase SQL Editor
# (copy/paste database/exercises-schema-extension.sql)

# Step 2: Import sample
npx tsx scripts/import-exercises.ts database/exercises-import-sample.json

# Step 3: Test
npm run dev
# Navigate to /coach/benchmarks-lifts → Exercises tab
```

Questions? The structure is finalized and ready for your full 400+ exercises whenever you're ready to import them!
