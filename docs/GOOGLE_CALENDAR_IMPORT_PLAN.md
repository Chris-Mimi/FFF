# Google Calendar Workouts Import Plan

**Goal:** Import 5+ years (~1500 workouts) from Google Calendar text events into structured Supabase format for Forge Functional Fitness.

## 📋 Core Problem

Google Calendar workouts are unstructured text (Warm-Up, Strength, WOD sections), while the app needs structured data with exercise IDs and metadata.

## 🎯 Import Strategy

### Phased Approach
1. **Test Week** → Validate parsing logic
2. **Test Month** → Tune matching and handling
3. **Year-by-Year** → Safe full migration

### Technical Pipeline
```
Google Calendar Event → Parse Sections → Match Exercises → Stage in Import Tables → Promote to Live Data
```

## 🏗️ Technical Implementation

### 1. Google API Setup
- Create Google Cloud project → Enable Calendar API → OAuth credentials
- Use service account for programmatic access
- Required scopes: `https://www.googleapis.com/auth/calendar.readonly`

### 2. Parsing & Processing
- **Section Detection:** Fuzzy matching for "Warm-Up", "Strength", "WOD", etc.
- **Exercise Matching:** Compare text against Supabase exercises library
- **Unknown Handling:** Flag new exercises for coach review
- **Link Extraction:** Preserve YouTube/Facebook URLs

### 3. Database Architecture

#### Import Tables (Temporary Testing)
```sql
-- Raw events from Google Calendar
CREATE TABLE calendar_imports (
  id uuid PK,
  google_event_id text UNIQUE,
  event_date date,
  title text,
  raw_description text,  -- Original unparsed text
  processed boolean DEFAULT false
);

-- Parsed sections
CREATE TABLE calendar_imported_sections (
  id uuid PK,
  import_id uuid FK,
  section_name text,  -- warm_up, strength, wod
  section_text text
);

-- Matched exercises
CREATE TABLE calendar_imported_exercises (
  id uuid PK,
  section_id uuid FK,
  exercise_name text,
  matched_exercise_id uuid,  -- NULL if not matched
  confidence float,  -- 0-1 matching quality
  notes text  -- reps, sets, weights
);
```

#### Live Integration
Extends existing `workouts`, `workout_sections`, `workout_movements` tables with:
- `raw_text` field (100% original preservation)
- `coach_notes` for unclear content
- `parsing_confidence` rating

### 4. Promotion Script
Moves validated data from import tables to live tables:
- Creates workout records with metadata
- Maps sections and exercises
- Handles unmapped content in coach_notes
- Marks imports as processed

### 5. Safety Features
- **Zero Data Loss:** Raw text always preserved
- **Graceful Degradation:** Unmatched content goes to coach_notes
- **Reprocessing:** Can improve parsing and remap later
- **Dry-Run Mode:** Preview imports without database changes

## 🚨 Risk Mitigation

| Risk | Solution |
|------|----------|
| Inconsistent formatting | Fuzzy detection + raw text backup |
| Incomplete exercise library | Unknown exercises table + review workflow |
| Links/videos in text | Automatic extraction and preservation |
| API limits (1500 events) | Parameterized batch processing by date ranges |
| Human review needed | Admin dashboard for unknown exercises |

## 🛠️ Implementation Technology

### Preferred Stack
- **Python** for ETL (google-api-python-client, supabase-py)
- **Fuzzy Matching:** `fuzzywuzzy` or `rapidfuzz` for exercise matching
- **Supabase Client:** Direct PostgreSQL or REST API integration

### Sample Code Structure
```python
# 1. Fetch Google Calendar events
events = google_api.events().list(timeMin=start_date, timeMax=end_date)

# 2. Parse each event
sections = parse_workout_description(event.raw_description)
exercises = extract_movements(sections, supabase_exercises)

# 3. Stage in import tables
stage_event_for_import(event, sections, exercises)

# 4. Promotion (after review)
promote_to_live_tables(staged_data)
```

## 📊 User Experience

### Coach Workflow
1. Run import script with date parameters
2. Review unknown exercises in admin panel
3. Approve matches or add new movements
4. Execute promotion script
5. Historical workouts appear in search and analysis

### Athlete Experience
- Seamless history available for tracking
- No interruption in current functionality

## 📅 Next Steps Checklist

- [ ] **Phase 0:** Confirm Google Calendar data accessibility
- [ ] **Phase 1:** Implement 1-week test import and parsing
- [ ] **Phase 2:** Build admin review interface for unknown exercises
- [ ] **Phase 3:** Execute monthly test import
- [ ] **Phase 4:** Full year-over-year migration
- [ ] **Phase 5:** Optional automated sync for future workouts

### Prerequisites
- Complete Supabase exercises library migration
- Google Cloud Console project setup
- Environment variables configured (.env.local)

**Estimated Timeline:** 2-3 weeks for initial implementation, plus 1-2 weeks for iterative testing per phase.
