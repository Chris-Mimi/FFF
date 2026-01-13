# Session 66: Google Calendar & Search Fixes

**Date:** 2026-01-13
**Agent:** Sonnet 4.5
**Session Type:** Bug fixes and feature enhancements

---

## 🎯 Session Goals

1. Update Google Calendar event title format (remove date, add session type)
2. Add running time display to Google Calendar section headers
3. Fix Workout Library search crash with special characters
4. Fix Workout Library search precision (phrase matching)
5. Include workout_name field in search

---

## ✅ Completed Tasks

### 1. Google Calendar Event Title Format

**Problem:**
- Event titles showed workout name followed by date
- Format: "Overhead Fest - Thu, 28 Dec"
- Date was unnecessary since it's already in the calendar

**Solution:**
- Changed format to "Workout Name - Session Type"
- New format: "Overhead Fest - WOD"
- More useful information at a glance

**Files Changed:**
- `app/api/google/publish-workout/route.ts`
  - Line 70: Added session_type to Workout interface
  - Line 101: Added session_type to Supabase query
  - Line 267: Updated event summary format

**Code:**
```typescript
// Before
summary: `${workoutTitle} - ${new Date(workout.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`

// After
summary: `${workoutTitle} - ${workout.session_type}`
```

---

### 2. Google Calendar Running Time Display

**Problem:**
- Section headers only showed duration: "Warm-up (12 min)"
- Athletes couldn't easily see when each section starts/ends during class

**Solution:**
- Added cumulative running time to section headers
- Format: "Section Name X mins (start-end)"
- Examples:
  - Warm-up 12 mins (1-12)
  - Gymnastics 16 mins (13-28)
  - WOD 20 mins (29-48)

**Files Changed:**
- `app/api/google/publish-workout/route.ts`
  - Line 146: Updated formatSectionToHTML() signature with startMin/endMin params
  - Lines 211-221: Added cumulative time calculation logic

**Implementation:**
```typescript
// Calculate running time for each section
let cumulativeTime = 0;
const formattedSections = selectedSections.map(section => {
  const duration = section.duration || 0;
  const startMin = cumulativeTime + 1;
  const endMin = cumulativeTime + duration;
  cumulativeTime = endMin;
  return formatSectionToHTML(section, startMin, endMin);
});
```

---

### 3. Workout Library Search - Regex Escape Fix

**Problem:**
- Typing special regex characters crashed search
- Error: "Uncaught SyntaxError: Invalid regular expression: /(()/gi: Unterminated group"
- Example: Typing "Toes to Bar (" caused immediate crash

**Root Cause:**
- Search terms passed directly to RegExp constructor without escaping
- Parentheses, brackets, and other regex special characters caused syntax errors

**Solution:**
- Added escapeRegex() helper function to escape special characters
- Escapes: `.*+?^${}()|[]\`
- Applied to both search filtering and highlighting

**Files Changed:**
- `utils/search-utils.ts`
  - Lines 6-8: Added escapeRegex() helper function
  - Line 21: Escape search terms before creating RegExp

**Code:**
```typescript
const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
```

---

### 4. Workout Library Search - Phrase Matching

**Problem:**
- Search split input into individual words, finding false matches
- Example: "Toes to Bar (s" matched workouts with "toes" separately
- Found 4 results: 2 correct (with phrase), 2 incorrect (just word "toes")

**Root Cause:**
- Code: `searchQuery.trim().toLowerCase().split(/\s+/)`
- Each word searched independently with `searchTerms.every(term => ...)`
- Word boundaries (`\b`) blocked matches with special characters

**Solution:**
- Treat entire query as single phrase (no splitting)
- Remove word boundaries to allow partial matches
- Changed from `searchTerms` array to `searchPhrase` string

**Files Changed:**
- `hooks/coach/useCoachData.ts` (lines 219-246)
  - Changed: `const searchTerms = searchQuery.trim().toLowerCase().split(/\s+/)`
  - To: `const searchPhrase = searchQuery.trim()`
  - Removed: `searchTerms.every(term => ...)`
  - Changed to: Single RegExp test with escaped phrase
- `components/coach/SearchPanel.tsx` (line 406)
  - Changed: `searchQuery.trim().split(/\s+/).filter(Boolean)`
  - To: `searchQuery.trim() ? [searchQuery.trim()] : []`

**Before:**
```typescript
const searchTerms = searchQuery.trim().toLowerCase().split(/\s+/);
return searchTerms.every(term =>
  new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(combinedText)
);
```

**After:**
```typescript
const searchPhrase = searchQuery.trim();
const escapedPhrase = searchPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
return new RegExp(escapedPhrase, 'i').test(combinedText);
```

---

### 5. Workout Library Search - Include workout_name Field

**Problem:**
- Search only included: title, coach_notes, section content
- Didn't search workout_name field (e.g., "Overhead Fest", "Fran")

**Solution:**
- Added workout_name to combined search text
- Search now includes: title, workout_name, coach_notes, section content

**Files Changed:**
- `hooks/coach/useCoachData.ts`
  - Line 226: Added workout_name to "All" filter
  - Line 237: Added workoutNameText variable
  - Line 241: Included workoutNameText in combined search text

**Code:**
```typescript
// All filters
combinedText = `${wod.title} ${wod.workout_name || ''} ${wod.coach_notes || ''} ${wod.sections.map(s => s.content).join(' ')}`;

// Specific filters
const workoutNameText = wod.workout_name || '';
combinedText = `${titleText} ${workoutNameText} ${notesText} ${sectionsText}`;
```

---

## 🐛 Issues Encountered

### Next.js Build Cache Corruption

**Problem:**
- After multiple rapid file changes, dev server showed error:
- "Cannot find module './586.js'"
- Hard refresh required server restart

**Root Cause:**
- Stale webpack chunks from rapid file changes
- `.next` build cache out of sync with source files

**Solution:**
```bash
kill -9 $(lsof -t -i :3000-3009)
rm -rf .next
npm run dev
```

**Prevention:**
- Restart dev server after multiple rapid changes
- Clear `.next` cache if seeing module errors

---

## 📊 Impact Summary

**User Experience:**
- ✅ Google Calendar events show more useful information (session type vs date)
- ✅ Athletes can see exact timing for each section (running time)
- ✅ Search no longer crashes with special characters
- ✅ Search is more precise (exact phrase matching)
- ✅ Can search by workout name

**Technical Improvements:**
- ✅ Robust regex handling (escaping special characters)
- ✅ Better search UX (phrase matching instead of word matching)
- ✅ Complete search coverage (includes workout_name field)

---

## 🔧 Files Changed (4 total)

1. `app/api/google/publish-workout/route.ts` - Google Calendar formatting
2. `utils/search-utils.ts` - Regex escaping
3. `hooks/coach/useCoachData.ts` - Search logic (phrase matching, workout_name)
4. `components/coach/SearchPanel.tsx` - Search term handling

---

## 💡 Lessons Learned

### 1. Regex Special Characters
- **Issue:** Special characters must be escaped before using in RegExp constructor
- **Pattern:** Always escape user input before creating regex patterns
- **Escaped chars:** `.*+?^${}()|[]\`

### 2. Search Precision
- **Issue:** Word-by-word search creates false positives
- **Pattern:** Use phrase matching for more precise results
- **Trade-off:** Less flexible (no AND logic), more accurate

### 3. Next.js Dev Server
- **Issue:** Rapid file changes can corrupt webpack cache
- **Pattern:** Restart dev server after multiple rapid edits
- **Solution:** Clear `.next` cache if seeing module errors

---

## 📝 Notes for Next Session

**Testing Checklist:**
- [ ] Publish workout to Google Calendar and verify title format
- [ ] Check running time display in Google Calendar sections
- [ ] Test search with special characters (parentheses, brackets)
- [ ] Test phrase search precision ("Toes to Bar (strict)")
- [ ] Test workout_name search functionality

**No Pending Issues**

---
