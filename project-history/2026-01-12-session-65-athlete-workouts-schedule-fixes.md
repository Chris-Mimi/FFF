# Session 65: Athlete Workouts & Schedule Page Fixes

**Date:** 2026-01-12
**Agent:** Sonnet 4.5
**Session Type:** Bug fixes and UX improvements

---

## 🎯 Session Goals

1. Fix Athlete Workouts tab weekly selector "Today" button
2. Fix results display order (Rounds before Reps)
3. Add Schedule page "Current Week" button and rename existing button
4. Fix scroll jump when toggling templates/titles

---

## ✅ Completed Tasks

### 1. Athlete Workouts Tab - Weekly Selector Fix

**Problem:**
- "Today" button showing wrong week
- Example: On 11 Jan 2026 (Saturday), clicking "Today" showed week 12-18 Jan (next week) instead of 6-12 Jan (current week)

**Root Cause:**
- `getWeekDates()` function treating Sunday as day 0, calculating "days until next Monday"
- Formula: `const first = curr.getDate() - curr.getDay() + 1`
- When Sunday (day=0): `date - 0 + 1` = next Monday instead of previous Monday

**Solution:**
- Fixed Sunday handling to go back 6 days to find Monday of current week
- New formula: `const diff = day === 0 ? -6 : 1 - day`
- Consistent Monday-Sunday week calculation

**Files Changed:**
- `components/athlete/AthletePageWorkoutsTab.tsx` (lines 239-253)

**Code:**
```typescript
const getWeekDates = (date: Date): Date[] => {
  const curr = new Date(date);
  const day = curr.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Sunday: go back 6 days
  const monday = new Date(curr);
  monday.setDate(curr.getDate() + diff);

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
};
```

---

### 2. Athlete Workouts Tab - Results Display Order

**Problem:**
- Results showing "Reps: X" before "Rounds: Y"
- Incorrect priority (rounds more important than reps in CrossFit context)

**Solution:**
- Swapped display order to match logical hierarchy
- New order: Time → Rounds → Reps → Weight → Calories → Distance → Scaling → Task Completion

**Files Changed:**
- `components/athlete/AthletePageWorkoutsTab.tsx` (lines 494-495)

**Before:**
```typescript
{sectionResult.time_result && <div>Time: {sectionResult.time_result}</div>}
{sectionResult.reps_result && <div>Reps: {sectionResult.reps_result}</div>}
{sectionResult.rounds_result && <div>Rounds: {sectionResult.rounds_result}</div>}
```

**After:**
```typescript
{sectionResult.time_result && <div>Time: {sectionResult.time_result}</div>}
{sectionResult.rounds_result && <div>Rounds: {sectionResult.rounds_result}</div>}
{sectionResult.reps_result && <div>Reps: {sectionResult.reps_result}</div>}
```

---

### 3. Schedule Page - Week Generation Buttons

**Problem:**
- Only "Generate Next Week" button available
- User wanted ability to generate sessions for current week

**Solution:**
- Renamed "Generate Next Week" → "Next Week" (clearer, shorter)
- Added "Current Week" button (blue) to generate sessions from Monday of current week
- Both buttons use same week calculation logic as Athlete tab fix (consistent behavior)

**Files Changed:**
- `app/coach/schedule/page.tsx` (lines 226-277, 397-414)

**New Functions:**
```typescript
const handleGenerateWeek = async (startDate?: string) => {
  // Refactored to accept optional start date parameter
  const response = await fetch('/api/sessions/generate-weekly', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(startDate ? { start_date: startDate } : {})
  });
};

const handleGenerateCurrentWeek = async () => {
  // Calculate Monday of current week
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);

  const formattedDate = `${year}-${month}-${dayNum}`;
  await handleGenerateWeek(formattedDate);
};

const handleGenerateNextWeek = async () => {
  await handleGenerateWeek(); // Uses default (next Monday)
};
```

**Button Colors:**
- Current Week: Blue (`bg-blue-600`)
- Next Week: Purple (`bg-purple-600`)

---

### 4. Schedule Page - Toggle Scroll Jump Fix

**Problem:**
- Clicking active/inactive toggle on template or workout title caused page to jump to top
- Required user to scroll back down every time (frustrating UX)

**Root Cause:**
- State update (`fetchTemplates()` or `fetchWorkoutTitles()`) triggered component re-render
- React reset scroll position during re-render

**Solution:**
- Save scroll position before database update
- Restore scroll position after fetch completes using `requestAnimationFrame`
- `requestAnimationFrame` ensures scroll restoration happens after DOM updates complete

**Files Changed:**
- `app/coach/schedule/page.tsx` (lines 200-214, 387-401)

**Implementation:**
```typescript
const handleToggleActive = async (template: SessionTemplate) => {
  const scrollPosition = window.scrollY;
  try {
    await supabase.from('session_templates').update({...}).eq('id', template.id);
    await fetchTemplates();
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollPosition);
    });
  } catch (error) {
    console.error('Error toggling template:', error);
  }
};

// Same pattern applied to handleToggleTitleActive()
```

---

## 📊 Impact Summary

**User Experience:**
- ✅ Athlete Workouts tab "Today" button now works correctly
- ✅ Results display in logical priority order
- ✅ Schedule page has flexible week generation (current or next)
- ✅ No scroll jump when toggling templates/titles

**Technical Improvements:**
- ✅ Consistent week calculation across Athlete and Coach pages
- ✅ Proper Sunday handling in date calculations
- ✅ Scroll preservation pattern for state updates

---

## 🔧 Files Changed (2 total)

1. `components/athlete/AthletePageWorkoutsTab.tsx` - Week calculation fix, results display order
2. `app/coach/schedule/page.tsx` - Week generation buttons, scroll preservation

---

## 💡 Lessons Learned

### 1. Week Calculation - Sunday Edge Case
- **Issue:** `getDay()` returns 0 for Sunday, causing calculation errors
- **Pattern:** Always handle Sunday explicitly in week calculations
- **Formula:** `const diff = day === 0 ? -6 : 1 - day` (go back to previous Monday)

### 2. Scroll Preservation During State Updates
- **Problem:** State updates causing re-renders that reset scroll position
- **Solution:** Save/restore scroll with `requestAnimationFrame`
- **Why requestAnimationFrame:** Ensures restoration happens after DOM updates complete
- **Alternative tried:** Direct `window.scrollTo()` (didn't work - timing issue)

### 3. Date Calculation Consistency
- **Best practice:** Reuse same date calculation logic across components
- **Benefit:** Current Week button and Athlete "Today" button use identical logic
- **Result:** Predictable, consistent behavior across different pages

---

## 📝 Notes for Next Session

**No Pending Issues:**
- All requested fixes completed
- Ready for user testing

**Testing Checklist:**
- [ ] Athlete Workouts tab - "Today" button shows correct week on Sunday
- [ ] Athlete Workouts tab - Results show Rounds before Reps
- [ ] Schedule page - "Current Week" generates sessions from Monday of current week
- [ ] Schedule page - "Next Week" generates sessions from next Monday
- [ ] Schedule page - Toggle buttons preserve scroll position

---
