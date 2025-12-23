# Week 2 Testing Phase - Comprehensive Validation Plan

**Date:** 2025-12-23
**Context:** Session 57 - Systematic testing before Beta Launch
**Goal:** Validate all features, edge cases, security, and data integrity

---

## Testing Approach

**Method:** Systematic manual validation with documented results
**Format:** Interactive checklist - I will guide you through each area
**Output:** Testing report documenting findings and fixes

---

## Testing Categories

### 1. Coach Workflow Testing
**Priority:** CRITICAL
**Areas:**
- Workout creation and editing
- Movement library operations
- Google Calendar publishing
- Analysis page functionality
- Session management
- Notes markdown rendering

### 2. Athlete Workflow Testing
**Priority:** CRITICAL
**Areas:**
- Logbook viewing (published workouts only)
- Workout logging (all scoring types)
- Benchmark results tracking
- Lift records tracking

### 3. Security & RLS Testing
**Priority:** CRITICAL
**Areas:**
- Data isolation between users
- Coach vs Athlete permissions
- Published vs Draft workout visibility
- Unauthorized access attempts

### 4. Data Integrity Testing
**Priority:** HIGH
**Areas:**
- Workout naming system (workout_name + workout_week)
- Movement frequency deduplication
- Foreign key constraints
- Cascade deletes
- NULL handling

### 5. Edge Case Testing
**Priority:** HIGH
**Areas:**
- Empty states (no data, no results)
- Boundary conditions (max capacity, very long text)
- Special characters in inputs
- Concurrent operations

### 6. Performance Testing
**Priority:** MEDIUM
**Areas:**
- Large dataset queries
- Complex JSONB searches
- Movement analytics calculations
- Page load times

---

## Detailed Testing Checklist

### 1. COACH WORKFLOW - Workout Creation

#### 1.1 Basic Workout Creation
- [ ] Create new workout (current date)
- [ ] Add all section types (Warm-up, Strength, WOD, Cool-down)
- [ ] Verify section ordering
- [ ] Save and reload - verify persistence
- [ ] Check empty state messaging

#### 1.2 Movement Library Integration
- [ ] Add Barbell Lift (with weight/reps)
- [ ] Add Benchmark workout (scaling options)
- [ ] Add Forge Benchmark (scaling options)
- [ ] Add Free-form exercise
- [ ] Search exercises (multi-word queries)
- [ ] Filter by category/tags
- [ ] Toggle favorites
- [ ] Verify "Unused" filter (Analysis page fix from Session 55)

#### 1.3 Workout Naming System (Session 49/50)
- [ ] Create workout without name (NULL workout_name)
- [ ] Create workout with name (e.g., "Overhead Fest")
- [ ] Verify workout_week auto-calculation (ISO format YYYY-Www)
- [ ] Copy workout to same week - verify unique constraint
- [ ] Copy workout to different week - verify separate entry
- [ ] Check Analytics deduplication (named workouts counted once per week)

#### 1.4 Notes & Markdown (Session 55/56)
- [ ] Add notes with markdown syntax (**bold**, _italic_, <u>underline</u>)
- [ ] Verify markdown rendering (not raw syntax)
- [ ] Test auto-list continuation (bullet lists)
- [ ] Test auto-list continuation (numbered lists)
- [ ] Press Enter twice to exit list mode
- [ ] Add URLs - verify clickable links with target="_blank"
- [ ] Add H1/H2/H3 headings - verify styling

#### 1.5 Google Calendar Publishing
- [ ] Publish new workout - verify Google Calendar event created
- [ ] Edit published workout - verify Re-publish button appears
- [ ] Click Re-publish - verify auto-save happens first (Session 53 fix)
- [ ] Verify Google Calendar event updated (no duplicates)
- [ ] Unpublish workout - verify event deleted from calendar

#### 1.6 Workout Operations
- [ ] Copy workout to different date
- [ ] Copy workout to same week (test naming conflict)
- [ ] Delete workout - verify confirmation dialog
- [ ] Delete published workout - verify Google Calendar cleanup

---

### 2. COACH WORKFLOW - Movement Library

#### 2.1 Exercise Management
- [ ] Create new exercise (all required fields)
- [ ] Add tags, equipment, body_parts
- [ ] Add search_terms (verify no duplicates from Session 56 cleanup)
- [ ] Add video URL with YouTube timestamp (e.g., t=77s)
- [ ] Verify video starts at timestamp (Session 56 fix)
- [ ] Edit existing exercise
- [ ] Delete exercise (verify cascade to related data)

#### 2.2 Movement Analytics (Analysis Page)
- [ ] Select movement from dropdown
- [ ] Verify type badges (Lift=purple, Benchmark=teal, Forge=cyan, Exercise=gray)
- [ ] Test "Unused" filter - verify dropdown shows all unused exercises
- [ ] Test timeframe dropdown (1-8 weeks)
- [ ] Test month buttons (3/6/12 months)
- [ ] Verify frequency counts match actual usage
- [ ] Test workout_name deduplication (same workout in same week = 1x)

---

### 3. ATHLETE WORKFLOW - Logbook

#### 3.1 Published Workout Viewing
- [ ] Login as athlete
- [ ] Verify only published workouts visible
- [ ] Verify draft workouts NOT visible
- [ ] Check workout time display (Session 53 fix)
- [ ] Check empty state (no published workouts)

#### 3.2 Workout Logging - Scoring Inputs (Session 51)
- [ ] Free-form section (gray) - verify unit labels outside inputs
- [ ] Lifts section (blue) - verify weight in kg, reps
- [ ] Benchmarks section (teal) - verify time/reps/rounds
- [ ] Forge Benchmarks section (cyan) - verify all scoring types
- [ ] Test placeholders (Load, Cal, Distance, Rounds, Reps)
- [ ] Test centered text alignment
- [ ] Test input widths (reps w-16, metres w-20)

#### 3.3 Workout Logging - Validation (Session 49 fix)
- [ ] Enter notes only (no scoring) - verify Save enabled
- [ ] Enter scoring only (no notes) - verify Save enabled
- [ ] Enter both notes and scoring - verify Save enabled
- [ ] Click Save - verify data persists
- [ ] Reload logbook - verify results appear

#### 3.4 Benchmark & Lift Tracking
- [ ] Log benchmark result (time-based)
- [ ] Log benchmark result (reps-based)
- [ ] Log forge benchmark result
- [ ] Log lift record (1RM, 3RM, 5RM, 10RM)
- [ ] Verify PR tracking works
- [ ] Verify historical results appear

---

### 4. SECURITY & RLS TESTING (Session 54)

#### 4.1 Data Isolation (CRITICAL)
- [ ] Create 2 athlete accounts (Account A, Account B)
- [ ] Account A: Log workout results
- [ ] Account B: Verify CANNOT see Account A's results
- [ ] Account A: Verify can only see own results
- [ ] Test with wod_section_results table
- [ ] Test with benchmark_results table
- [ ] Test with lift_records table

#### 4.2 Coach vs Athlete Permissions
- [ ] Coach: Verify can create/edit/delete workouts
- [ ] Coach: Verify can view all athlete data
- [ ] Athlete: Verify CANNOT access coach editing features
- [ ] Athlete: Verify can only log own results

#### 4.3 Published Workout Visibility
- [ ] Create workout as coach (draft state)
- [ ] Athlete: Verify CANNOT see draft workout
- [ ] Coach: Publish workout
- [ ] Athlete: Verify CAN now see published workout
- [ ] Coach: Unpublish workout
- [ ] Athlete: Verify workout disappears from logbook

#### 4.4 Auth Callback (Session 54)
- [ ] Test signup flow - verify email confirmation works
- [ ] Test password reset flow - verify redirect to /auth/callback
- [ ] Verify redirect to correct page after auth

---

### 5. DATA INTEGRITY TESTING

#### 5.1 Workout Naming System Constraints
- [ ] Create workout with workout_name="Test" in week 2025-W50
- [ ] Attempt to create duplicate (same name, same week) - verify constraint
- [ ] Create workout with workout_name="Test" in week 2025-W51 - verify allowed
- [ ] Test NULL workout_name - verify allowed (uses date fallback)

#### 5.2 ISO Week Calculation (Session 52 fix)
- [ ] Create workout on Dec 30, 2024 (should be 2025-W01)
- [ ] Create workout on Jan 1, 2025 (verify week assignment)
- [ ] Verify UTC-based calculation (not local timezone)
- [ ] Cross-check with PostgreSQL week calculation

#### 5.3 Foreign Key Constraints
- [ ] Delete workout - verify orphaned workout_logs cleaned up (Session 49 fix)
- [ ] Delete user - verify cascade to athlete_profiles, workout_logs
- [ ] Delete exercise - verify references handled correctly

#### 5.4 NULL Handling
- [ ] Workout with empty sections array
- [ ] Workout with NULL workout_name
- [ ] Workout with NULL publish_sections (Session 48 fix)
- [ ] Exercise with empty search_terms (Session 56 cleanup)

---

### 6. EDGE CASE TESTING

#### 6.1 Empty States
- [ ] New user (no workouts) - verify empty state messaging
- [ ] Analysis page (exercise never used) - verify "0 times" display
- [ ] Athlete logbook (no published workouts) - verify message
- [ ] Movement library (no favorites) - verify empty filter state

#### 6.2 Boundary Conditions
- [ ] Very long workout name (>100 characters)
- [ ] Very long notes (>10,000 characters)
- [ ] Session capacity = 0 (edge case)
- [ ] Workout with 20+ sections

#### 6.3 Special Characters
- [ ] Workout name with special chars (é, ñ, ü)
- [ ] Notes with markdown special chars (*, _, #, [, ])
- [ ] Exercise name with apostrophe (e.g., "Devil's Press")
- [ ] Search query with special chars

#### 6.4 Time & Date Edge Cases
- [ ] Workout on Dec 31 (year boundary)
- [ ] Workout on Feb 29, 2024 (leap year)
- [ ] Copy workout from past to future
- [ ] Session time at midnight (00:00)

---

### 7. PERFORMANCE TESTING

#### 7.1 Large Dataset Queries
- [ ] Analysis page with 500+ workouts
- [ ] Movement library search (536 exercises)
- [ ] Athlete logbook with 100+ logged workouts
- [ ] Complex JSONB section queries

#### 7.2 Page Load Times
- [ ] Coach calendar (monthly view, 30+ workouts)
- [ ] Analysis page (12-month timeframe)
- [ ] Movement library (all exercises loaded)
- [ ] Athlete logbook (full year)

---

## Testing Execution Plan

### Phase 1: Critical Path Testing (Day 1)
1. Coach workflow - Basic workout creation (1.1-1.3)
2. Athlete workflow - Logbook viewing and logging (3.1-3.3)
3. Security - RLS isolation (4.1)
4. Google Calendar publishing (1.5)

### Phase 2: Feature Completeness (Day 2)
5. Movement library (2.1-2.2)
6. Notes markdown (1.4)
7. Benchmark & lift tracking (3.4)
8. Coach vs Athlete permissions (4.2-4.3)

### Phase 3: Edge Cases & Data Integrity (Day 3)
9. Workout naming system (5.1-5.2)
10. Foreign key constraints (5.3)
11. NULL handling (5.4)
12. Empty states & boundaries (6.1-6.2)

### Phase 4: Final Validation (Day 4)
13. Special characters (6.3)
14. Time & date edge cases (6.4)
15. Performance testing (7.1-7.2)
16. Regression testing (verify all previous fixes still work)

---

## Testing Report Format

For each test:
```
✅ PASS - [Test name]
❌ FAIL - [Test name] - [Description of issue]
⚠️ PARTIAL - [Test name] - [What works, what doesn't]
```

At end of each phase:
- Summary of findings
- Bugs discovered (with severity: CRITICAL/HIGH/MEDIUM/LOW)
- Fixes applied
- Items deferred (with justification)

---

## Questions for User

1. **Testing approach preference:**
   - **Option A:** I guide you through each test interactively (you perform, I track results)
   - **Option B:** You test independently and report findings (I fix issues)
   - **Option C:** We test together in focused sessions (one category at a time)

2. **Priority areas:**
   - Should we focus on any specific area first?
   - Any known issues or concerns you want validated?

3. **Test data:**
   - Do you have test accounts set up (coach + 2 athletes)?
   - Should we create new test data or use production data?

4. **Time commitment:**
   - How much time per day for testing?
   - Target completion date for testing phase?
