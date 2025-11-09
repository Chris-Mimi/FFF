# Athlete Page Refactor - Testing Checklist

**Branch:** refactor/athlete-page-split
**Original Working Commit:** 9374e44

---

## ✅ Pre-Refactor Verification

- [ ] Confirmed working code pushed to GitHub (commit 9374e44)
- [ ] Created feature branch: refactor/athlete-page-split
- [ ] Dev server running on localhost:3000

---

## 🧪 Testing After Each Component Extraction

### Test EVERY tab after EACH component extraction:

#### Profile Tab
- [ ] Page loads without errors
- [ ] Profile information displays correctly
- [ ] Family member selector works (if applicable)
- [ ] Edit profile modal opens and saves changes
- [ ] Profile data persists after refresh

#### Workouts Tab
- [ ] Workouts list displays
- [ ] Week navigation works (previous/next)
- [ ] Can view workout details
- [ ] All workout data renders correctly

#### Logbook Tab
- [ ] Calendar displays correctly
- [ ] Can navigate between weeks
- [ ] Can log new workout results
- [ ] Logged results save to database
- [ ] Historical logs display correctly

#### Benchmarks Tab
- [ ] Benchmark list displays
- [ ] Can add new benchmark result
- [ ] Results save correctly
- [ ] Charts render (if present)
- [ ] PR badges show correctly

#### Forge Benchmarks Tab
- [ ] Forge benchmark list displays
- [ ] Can add new results
- [ ] Results save correctly
- [ ] Charts render correctly
- [ ] Multi-PR display works (Rx, Sc1, Sc2, Sc3)

#### Lifts Tab
- [ ] Barbell lifts grid displays (5 columns)
- [ ] Olympic lifts on bottom row
- [ ] Can add new lift records
- [ ] Rep max types work correctly (1RM, 3RM, 5RM, 10RM)
- [ ] Calculated 1RM displays

#### Records Tab (Personal Records)
- [ ] All sections display
- [ ] Accordions expand/collapse
- [ ] Data renders correctly
- [ ] 4-column layout works

#### Security Tab
- [ ] Password change functionality works
- [ ] Logout button works

---

## 🔍 Cross-Cutting Concerns

Test these after ALL components extracted:

### Navigation
- [ ] All tab buttons work
- [ ] Active tab highlights correctly
- [ ] Browser back/forward works
- [ ] URL updates correctly (if using query params)

### Authentication
- [ ] Redirects to login if not authenticated
- [ ] Checks athlete access subscription status
- [ ] Handles family member profiles correctly

### Data Fetching
- [ ] All API calls complete successfully
- [ ] Loading states display correctly
- [ ] Error states handled gracefully
- [ ] No console errors

### Responsive Design
- [ ] Desktop view works (1920px)
- [ ] Tablet view works (768px)
- [ ] Mobile view works (375px)

### Performance
- [ ] Page loads in < 3 seconds
- [ ] No layout shifts
- [ ] Smooth tab transitions
- [ ] No memory leaks (check dev tools)

---

## 📊 TypeScript Verification

After ALL changes:

```bash
npx tsc --noEmit
```

- [ ] No TypeScript errors
- [ ] No new warnings

---

## 🚀 Final Checks Before Merge

- [ ] All tests above passing
- [ ] Code committed to feature branch
- [ ] No console errors in browser
- [ ] No console warnings in terminal
- [ ] Visual comparison with main branch (screenshots if needed)

---

## ⚠️ If Something Breaks

See `ROLLBACK-PROCEDURE.md` for recovery steps.

---

**Last Updated:** 2025-11-09
