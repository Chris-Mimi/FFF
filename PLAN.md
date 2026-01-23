# Implementation Plan: Whiteboard Photos Feature

**Created:** 2026-01-22
**Feature:** Weekly whiteboard photo upload and display for paying athletes

---

## Overview

Enable coaches to upload weekly whiteboard photos (post-workout results) and make them accessible to paying athletes. Photos are labeled by ISO week (e.g., "2026 week 3.1", "2026 week 3.2") and displayed in both a dedicated gallery view and integrated into Published Workouts.

---

## User Requirements

**Coach Workflow:**
- Take photos of whiteboard after workouts
- Label by ISO week: "2026 week 3.1", "2026 week 3.2", etc.
- One photo can span multiple sessions/days
- Variable quantity: 1-4 photos per week

**Athlete Access:**
- View photos in Published Workouts tab (contextual)
- Browse all photos in dedicated Whiteboard Photos tab (gallery)
- Only accessible to paying athletes (athlete app members)

---

## Architectural Approach

### A. Database Schema

**New Table: `whiteboard_photos`**

```sql
CREATE TABLE whiteboard_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_week TEXT NOT NULL,          -- ISO week format: "2026-W03"
  photo_label TEXT NOT NULL,           -- User-provided label: "2026 week 3.1"
  photo_url TEXT NOT NULL,             -- Full public URL from Supabase Storage
  storage_path TEXT NOT NULL,          -- Storage path: "whiteboard-photos/2026-W03/uuid.jpg"
  caption TEXT,                        -- Optional description
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,     -- Order within the week
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for week-based queries
CREATE INDEX idx_whiteboard_photos_week ON whiteboard_photos(workout_week);

-- RLS Policies
ALTER TABLE whiteboard_photos ENABLE ROW LEVEL SECURITY;

-- Coaches can do everything
CREATE POLICY "Coaches can insert whiteboard photos"
  ON whiteboard_photos FOR INSERT
  TO authenticated
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'coach');

CREATE POLICY "Coaches can update whiteboard photos"
  ON whiteboard_photos FOR UPDATE
  TO authenticated
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'coach');

CREATE POLICY "Coaches can delete whiteboard photos"
  ON whiteboard_photos FOR DELETE
  TO authenticated
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'coach');

-- Athletes and coaches can view
CREATE POLICY "Authenticated users can view whiteboard photos"
  ON whiteboard_photos FOR SELECT
  TO authenticated
  USING (true);
```

### B. Supabase Storage

**Bucket Configuration:**
```typescript
Bucket Name: 'whiteboard-photos'
Public: true (for athlete access)
Path Structure: {week}/{uuid}.{ext}
  Example: "2026-W03/abc123-def456-789.jpg"
File Types: JPEG, PNG, HEIC
Max Size: 5MB per photo (user pre-compresses to ~400KB)
```

**Storage Pattern (from avatar reference):**
- Client-side upload via Supabase client
- Generate UUID for filename
- Store path in database
- Retrieve public URL for display

---

## Implementation Plan

### Phase 1: Database & Storage Setup

**Step 1.1: Create Migration**
- File: `supabase/migrations/YYYYMMDD_add_whiteboard_photos.sql`
- Create `whiteboard_photos` table
- Add indexes and RLS policies
- Run via Supabase Dashboard SQL Editor
- **BEFORE MIGRATION**: Run `npm run backup`

**Step 1.2: Create Storage Bucket**
- Access Supabase Dashboard → Storage
- Create bucket: `whiteboard-photos`
- Set public access: true
- Configure file size limit: 5MB
- Allowed MIME types: image/jpeg, image/png, image/heic

---

### Phase 2: Coach Upload Interface

**Step 2.1: Create Whiteboard Page**

**New Files:**
- `app/coach/whiteboard/page.tsx` - Main whiteboard management page
- `components/coach/WhiteboardUploadPanel.tsx` - Upload interface component
- `components/coach/WhiteboardGallery.tsx` - Grid gallery for coach view
- `app/api/whiteboard-photos/route.ts` - API endpoints (GET, POST, DELETE)

**Features:**
- Week selector (dropdown or date picker → auto-calculate ISO week)
- Photo upload area (drag-drop or click)
- Manual label input: "2026 week 3.1" (text field)
- Optional caption input
- Photo preview before upload
- Upload progress indicator
- Gallery view of all uploaded photos (grouped by week)
- Edit/delete controls per photo
- Reorder photos within a week (drag-drop with display_order)

**Upload Logic:**
```typescript
// Generate ISO week from selected date
const weekNumber = getWeekNumber(selectedDate); // Utils already exist
const isoWeek = `${year}-W${weekNumber.toString().padStart(2, '0')}`;

// Upload to Supabase Storage
const fileExt = file.name.split('.').pop();
const fileName = `${uuidv4()}.${fileExt}`;
const storagePath = `${isoWeek}/${fileName}`;

const { data: uploadData, error: uploadError } = await supabase.storage
  .from('whiteboard-photos')
  .upload(storagePath, file);

// Get public URL
const { data: urlData } = supabase.storage
  .from('whiteboard-photos')
  .getPublicUrl(storagePath);

// Save to database
await supabase.from('whiteboard_photos').insert({
  workout_week: isoWeek,
  photo_label: userProvidedLabel, // e.g., "2026 week 3.1"
  photo_url: urlData.publicUrl,
  storage_path: storagePath,
  caption: caption || null,
  uploaded_by: userId,
  display_order: nextOrderNumber
});
```

**Step 2.2: Add Navigation Button**

**File to Edit:** `components/coach/CoachHeader.tsx`

Add new button after "Coach Library":
```tsx
<button
  onClick={() => router.push('/coach/whiteboard')}
  className='flex items-center gap-2 bg-[#1a6b62] hover:bg-teal-800 px-4 py-2 rounded-lg transition'
>
  <Image size={18} />
  Whiteboard
</button>
```

Import: `import { Image } from 'lucide-react';`

---

### Phase 3: Athlete Gallery View

**Step 3.1: Create Whiteboard Photos Tab**

**New File:** `components/athlete/AthletePagePhotosTab.tsx`

**Features:**
- Week selector (previous/next/today navigation)
- Photo grid (2-3 columns responsive)
- Click to enlarge (full-screen modal)
- Show photo label + caption
- Filter by date range
- Empty state: "No photos for this week"
- Loading skeleton during fetch

**Layout Pattern:**
```tsx
// Similar to AthletePageWorkoutsTab structure
<div className="space-y-6">
  {/* Week Navigation */}
  <div className="flex items-center justify-between">
    <button onClick={handlePreviousWeek}>←</button>
    <h2>{currentWeekLabel}</h2>
    <button onClick={handleNextWeek}>→</button>
    <button onClick={handleToday}>Today</button>
  </div>

  {/* Photo Grid */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {photos.map(photo => (
      <div key={photo.id} className="cursor-pointer" onClick={() => openModal(photo)}>
        <img src={photo.photo_url} alt={photo.photo_label} />
        <p>{photo.photo_label}</p>
        {photo.caption && <p className="text-sm text-gray-600">{photo.caption}</p>}
      </div>
    ))}
  </div>

  {/* Full-Screen Image Modal */}
  {selectedPhoto && <ImageModal photo={selectedPhoto} onClose={closeModal} />}
</div>
```

**Step 3.2: Add Tab to Athlete Page**

**File to Edit:** `app/athlete/page.tsx`

Add new tab to tabs array:
```tsx
{
  id: 'photos',
  label: 'Whiteboard Photos',
  icon: Image // from lucide-react
}
```

Add corresponding component render:
```tsx
{activeTab === 'photos' && <AthletePagePhotosTab userId={userId} />}
```

Position: After "Personal Records", before "Access & Security"

---

### Phase 4: Integrate into Published Workouts

**Step 4.1: Add Photos to Workouts Tab**

**File to Edit:** `components/athlete/AthletePageWorkoutsTab.tsx`

**Integration Strategy:**
- Fetch photos for current week when workouts are loaded
- Display photos at bottom of each day card (if photos exist for that week)
- Show thumbnails (small, 100px wide)
- Click to enlarge (reuse modal from photos tab)

**Code Location:**
Within each workout card render (around line 476-491 where results display):

```tsx
{/* Existing workout details */}

{/* Whiteboard Photos for This Week */}
{weekPhotos.length > 0 && (
  <div className="mt-4 border-t pt-4">
    <p className="text-sm font-medium mb-2">Whiteboard Photos</p>
    <div className="flex gap-2 flex-wrap">
      {weekPhotos.map(photo => (
        <img
          key={photo.id}
          src={photo.photo_url}
          alt={photo.photo_label}
          className="w-24 h-24 object-cover rounded cursor-pointer hover:opacity-80"
          onClick={() => openPhotoModal(photo)}
        />
      ))}
    </div>
  </div>
)}
```

**Data Fetching:**
Add to existing useEffect that fetches workouts:
```tsx
// Fetch photos for current week
const { data: photos } = await supabase
  .from('whiteboard_photos')
  .select('*')
  .eq('workout_week', currentISOWeek)
  .order('display_order', { ascending: true });
```

---

### Phase 5: API Endpoints

**New File:** `app/api/whiteboard-photos/route.ts`

**Endpoints:**

**GET /api/whiteboard-photos?week=2026-W03**
- Fetch photos for specific ISO week
- Returns: Array of photo objects with URLs

**POST /api/whiteboard-photos**
- Upload photo metadata (after Supabase Storage upload completes)
- Body: `{ workout_week, photo_label, photo_url, storage_path, caption, display_order }`
- Validates: Coach role, required fields
- Returns: Created photo object

**DELETE /api/whiteboard-photos/[id]**
- Delete photo from database AND storage
- Validates: Coach role, ownership
- Returns: Success message

**PATCH /api/whiteboard-photos/[id]**
- Update caption or display_order
- Validates: Coach role
- Returns: Updated photo object

---

## Component Reference Patterns

**File Upload Pattern:**
- Reference: `components/athlete/AthletePageProfileTab.tsx` (avatar upload)
- Key functions: `handleFileUpload()`, `uploadToSupabase()`, `getPublicUrl()`

**Modal Display Pattern:**
- Reference: `components/coach/ExerciseVideoModal.tsx`
- Features: Draggable, resizable, full-screen toggle

**Week Navigation Pattern:**
- Reference: `components/athlete/AthletePageWorkoutsTab.tsx`
- Functions: `getWeekDates()`, `handleToday()`, `handlePreviousWeek()`, `handleNextWeek()`

**ISO Week Calculation:**
- Utility: `utils/date-utils.ts`
- Function: `getWeekNumber(date: Date)` - Already implemented

---

## File Structure Summary

**New Files (9):**
```
app/
  coach/
    whiteboard/
      page.tsx                         # Coach whiteboard management page
  api/
    whiteboard-photos/
      route.ts                         # CRUD API endpoints

components/
  coach/
    WhiteboardUploadPanel.tsx         # Upload interface
    WhiteboardGallery.tsx             # Coach gallery view
  athlete/
    AthletePagePhotosTab.tsx          # Athlete gallery tab
    WhiteboardPhotoModal.tsx          # Full-screen image modal

supabase/
  migrations/
    YYYYMMDD_add_whiteboard_photos.sql # Database schema

utils/
  whiteboard-utils.ts                 # Helper functions (ISO week formatting, etc.)
```

**Modified Files (3):**
```
components/coach/CoachHeader.tsx      # Add navigation button (line ~70)
app/athlete/page.tsx                  # Add Photos tab (line ~40-60)
components/athlete/AthletePageWorkoutsTab.tsx  # Add photo thumbnails (line ~476)
```

---

## Testing Checklist

**Coach Upload Flow:**
- [ ] Navigate to Whiteboard page
- [ ] Select week via date picker
- [ ] Upload photo with label "2026 week 3.1"
- [ ] Add caption
- [ ] Verify photo appears in coach gallery
- [ ] Upload 2nd photo "2026 week 3.2" for same week
- [ ] Verify display order
- [ ] Edit caption
- [ ] Delete photo
- [ ] Verify storage file deleted

**Athlete Gallery View:**
- [ ] Navigate to Whiteboard Photos tab
- [ ] Verify week navigation works
- [ ] Click photo to enlarge (modal)
- [ ] Close modal
- [ ] Navigate to previous/next week
- [ ] Verify "Today" button jumps to current week
- [ ] Test empty state (week with no photos)

**Athlete Workouts Integration:**
- [ ] Navigate to Published Workouts tab
- [ ] Verify thumbnails appear at bottom of workout cards
- [ ] Click thumbnail to enlarge
- [ ] Verify correct week photos displayed
- [ ] Test week with no photos (no section shown)

**Access Control:**
- [ ] Verify athletes cannot access upload page
- [ ] Verify coach can see all photos
- [ ] Verify RLS policies block unauthorized access

**Edge Cases:**
- [ ] Upload large file (near 5MB limit)
- [ ] Upload invalid file type (.txt, .pdf)
- [ ] Upload photo for future week
- [ ] Delete all photos from a week
- [ ] Same label for multiple photos (should allow)
- [ ] Network error during upload
- [ ] Slow connection (progress indicator)

---

## Dependencies & Imports

**New Imports Needed:**
```typescript
// lucide-react icons
import { Image, Upload, Trash2, Edit2, X } from 'lucide-react';

// Supabase
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Utilities
import { getWeekNumber, formatDate } from '@/utils/date-utils';
import { v4 as uuidv4 } from 'uuid'; // For filename generation
```

**Existing Dependencies (No New Installs):**
- @supabase/supabase-js (already installed)
- lucide-react (already installed)
- uuid (check package.json, may need: `npm install uuid`)

---

## Security Considerations

**RLS Policies:**
- Coaches: Full CRUD access
- Athletes: Read-only access
- Public: No access (even though bucket is public, table blocks access)

**Storage Security:**
- Public bucket (athletes need direct URL access)
- Obfuscated filenames (UUID-based)
- No sensitive metadata in URLs

**API Validation:**
- Check coach role before INSERT/UPDATE/DELETE
- Validate file types on upload
- Sanitize user inputs (photo_label, caption)
- Prevent path traversal in storage paths

**File Upload:**
- Client-side validation: file type, size
- Server-side validation: MIME type check
- Progress feedback for large uploads
- Error handling for storage failures

---

## Cost Estimate

**Supabase Storage:**
- 1GB free tier (generous for photos)
- Average photo size: ~400KB (user pre-compresses)
- ~2,500 photos = 1GB
- Should last 1+ year before needing upgrade (~50 weeks at 4-5 photos/week)

**Database:**
- Minimal impact (~100 rows per year)
- Within free tier limits

---

## Alternative Approaches Considered

**Option A: Session-Based Photos** (REJECTED)
- Attach photos to specific session times
- Pros: More granular tracking
- Cons: Doesn't match user's weekly workflow, complex linking

**Option B: Date-Based Photos** (REJECTED)
- Store by date, group by week in UI
- Pros: More flexible
- Cons: User already labels by week, adds unnecessary conversion

**Option C: Coach Library Tab Instead of Page** (REJECTED)
- Add as 8th tab to /coach/benchmarks-lifts
- Pros: Less navigation clutter
- Cons: Photos deserve dedicated space, already 7 tabs

**Selected Approach: ISO Week-Based with Dedicated Page** ✅
- Matches user's existing workflow exactly
- Clear separation of concerns
- Dedicated coach page for management
- Dedicated athlete tab for gallery
- Integration into workouts for context

---

## Success Criteria

**Must Have:**
- [ ] Coach can upload photos with week labels
- [ ] Athletes can view photos in gallery
- [ ] Photos appear in Published Workouts
- [ ] Correct RLS policies (coach CRUD, athlete read)
- [ ] Week navigation works correctly
- [ ] Photo enlargement modal works

**Nice to Have:**
- [ ] Drag-drop upload
- [ ] Photo reordering (display_order)
- [ ] Caption editing
- [ ] Date range filtering
- [ ] Bulk upload (multiple photos at once)
- [ ] Download photo option

**Future Enhancements:**
- Search by caption/label
- Photo comments (athlete engagement)
- Share individual photos via link
- Archive old photos (auto-delete after 6 months)

---

## Rollback Plan

**If Issues Arise:**

1. **Hide feature temporarily:**
   - Comment out navigation button in CoachHeader
   - Comment out tab in athlete page
   - Feature hidden, no data loss

2. **Database rollback:**
   - Drop table: `DROP TABLE whiteboard_photos;`
   - Restore from backup if needed: `npm run restore YYYY-MM-DD`

3. **Storage cleanup:**
   - Delete bucket via Supabase Dashboard
   - No orphaned files if table deleted first

---

## Implementation Order

**Session 1: Database & Storage**
1. Run database backup
2. Create migration
3. Create storage bucket
4. Test with manual inserts

**Session 2: Coach Upload**
1. Create Whiteboard page
2. Create upload panel component
3. Implement upload logic
4. Add navigation button
5. Test upload flow

**Session 3: Athlete Gallery**
1. Create Photos tab component
2. Implement week navigation
3. Create image modal
4. Add tab to athlete page
5. Test gallery view

**Session 4: Workouts Integration**
1. Add photo fetch to Workouts tab
2. Display thumbnails
3. Wire up modal
4. Test integration

**Session 5: Polish & Testing**
1. Full testing checklist
2. Error handling
3. Loading states
4. Empty states
5. Responsive design
6. Final commit

---

**Estimated Total Time:** 5 sessions
**Complexity:** Medium (new feature, but follows existing patterns)
**Risk Level:** Low (no changes to existing features, easy to rollback)
