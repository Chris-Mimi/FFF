# The Forge Functional Fitness - Active Context History

This file contains detailed historical entries of features and changes implemented. It complements the main activeContext.md file by providing verbose implementation details.

---

## Session 8: WOD Search Panel & Coach Notes Feature (October 18, 2025)

**Overview:**
Implemented a comprehensive WOD Search Panel with track filtering, full-text search capabilities, and drag-and-drop functionality to streamline workout planning. Added a Coach Notes feature within the WOD Modal for private, searchable notes.

### 1. Coach Notes Feature Implementation

**Database Changes:**
- Created SQL migration file: `supabase-wods-coach-notes.sql`
- Added `coach_notes` column to `wods` table (TEXT type, nullable)
- Created GIN index on `coach_notes` for full-text search performance
- Created setup documentation: `COACH-NOTES-SETUP.md`

**WOD Modal UI Changes (`components/WODModal.tsx`):**
- Added "Notes" button in modal header (next to Check/X buttons)
- Implemented 400px wide side panel that slides in from the right
- Side panel contains:
  - "Coach Notes" header
  - "Private notes for coaches only" subtitle
  - Auto-expanding textarea for notes entry
  - Notes persist with WOD save
- Modal expansion: Changed max-w from `max-w-5xl` to `max-w-7xl` to accommodate side panel
- Side panel animates with slide-in transition (transform translate-x)
- Notes button highlights when panel is open
- Coach notes saved/loaded with WOD data through existing save/load handlers

### 2. WOD Search Panel Implementation

**Coach Dashboard Changes (`app/coach/page.tsx`):**
- Added "Add WOD" button in dashboard header (before Analysis and Athletes buttons)
- Implemented 500px wide search panel that slides in from the right side
- Panel structure:
  - "Search Workouts" header with X close button
  - Search input with debounced search (300ms delay)
  - Track filters section with checkboxes and counts
  - Search results grid displaying matching WODs

**Search Functionality:**
- Database search on WOD title and coach_notes fields
- Client-side filtering on sections content (exercise names, descriptions)
- Debounced search input to reduce API calls (300ms)
- Search queries Supabase with `.ilike()` for case-insensitive matching
- Empty state message when no results found

**Track Filtering System:**
- Fetches all tracks from Supabase on panel open
- Displays checkboxes for each track with color indicators
- Shows count of WODs per track in real-time
- "All Tracks" checkbox to select/deselect all filters
- Filter state management with `selectedTracks` Set
- Filters apply to search results instantly

**Search Results Display:**
- Grid layout with WOD cards showing:
  - Workout title
  - Date (formatted as "Mon, Oct 14")
  - Track name badge with color
  - Workout type badge
  - Sections preview (first 3 sections with duration)
- Cards have hover effect and drag cursor
- Compact card design optimized for 500px panel width

**Drag-and-Drop Functionality:**
- Search result WOD cards are draggable
- Uses HTML5 drag-and-drop API
- `handleDragStart` sets `draggedWOD` state with WOD data
- `handleDrop` on calendar days copies WOD to target date
- Visual feedback: Cards show drag cursor on hover
- Seamless integration with existing calendar drag-drop system

### 3. Layout Challenges and Solutions

**Calendar Layout Adjustment:**
- Calendar container receives right padding when search panel is open: `pr-[500px]`
- Prevents calendar from being hidden behind fixed search panel
- Uses Tailwind arbitrary value for exact 500px padding
- Conditional application based on `isSearchPanelOpen` state

**Max-Width Calculations:**
- Calendar wrapper maintains `max-w-[1600px]` for optimal weekly view
- Search panel positioned fixed on right side: `fixed right-0 top-16 h-[calc(100vh-4rem)]`
- Panel uses `translate-x-full` when closed, `translate-x-0` when open
- Smooth transition with `transition-transform duration-300 ease-in-out`

**Known Layout Issues:**
- Calendar shifts left when search panel opens (due to padding application)
- Investigated alternatives: absolute positioning, viewport width calculations
- Current solution maintains calendar usability but causes minor visual shift
- Potential future enhancement: Smoother transition or different layout strategy

### 4. CSS and Styling

**Global Styles (`app/globals.css`):**
- Added custom scrollbar styles for search panel
- Webkit scrollbar styling: 8px width, rounded thumb, hover effects
- Consistent color scheme with app design (gray background, darker thumb)

**Component-Level Styling:**
- Search panel: White background, shadow, border-left
- Track filters: Grid layout, hover effects on checkboxes
- Search results: Grid with gap-4, responsive card sizing
- Drag-drop visual feedback: cursor-grab and cursor-grabbing states

### 5. State Management

**New State Variables:**
- `isSearchPanelOpen`: Boolean for panel visibility
- `searchQuery`: String for search input
- `selectedTracks`: Set<string> for track filter selections
- `searchResults`: Array of WOD objects matching search criteria
- `isSearching`: Boolean for loading state during search

**Debounced Search Implementation:**
- Uses `useEffect` hook with 300ms timeout
- Clears previous timeout on each keystroke
- Prevents excessive API calls during typing
- Cleanup function removes timeout on unmount

### 6. Database Queries

**Search Query Structure:**
```typescript
let query = supabase
  .from('wods')
  .select('*, tracks(name, color), workout_types(name)')
  .order('date', { ascending: false });

if (searchQuery) {
  query = query.or(`title.ilike.%${searchQuery}%,coach_notes.ilike.%${searchQuery}%`);
}

if (selectedTracks.size > 0) {
  query = query.in('track_id', Array.from(selectedTracks));
}
```

**Client-Side Section Filtering:**
- After database fetch, filters results further by searching section content
- Checks section type and content fields for search query
- Uses case-insensitive includes() on stringified section data

### 7. Files Modified

- `/Users/chrishiles/SynologyDrive/CrossFit Hammerschmiede (CFH)/AI Development/forge-functional-fitness/app/coach/page.tsx`
  - Added WOD search panel UI and logic
  - Implemented debounced search
  - Added track filtering system
  - Integrated drag-and-drop from search results
  - Added calendar padding adjustment

- `/Users/chrishiles/SynologyDrive/CrossFit Hammerschmiede (CFH)/AI Development/forge-functional-fitness/components/WODModal.tsx`
  - Added coach_notes to WODFormData interface
  - Implemented side panel for coach notes
  - Added Notes button in header
  - Expanded modal max-width to accommodate panel

- `/Users/chrishiles/SynologyDrive/CrossFit Hammerschmiede (CFH)/AI Development/forge-functional-fitness/app/globals.css`
  - Added custom scrollbar styles for search panel

### 8. Files Created

- `/Users/chrishiles/SynologyDrive/CrossFit Hammerschmiede (CFH)/AI Development/forge-functional-fitness/supabase-wods-coach-notes.sql`
  - SQL migration to add coach_notes column
  - Full-text search index on coach_notes

- `/Users/chrishiles/SynologyDrive/CrossFit Hammerschmiede (CFH)/AI Development/forge-functional-fitness/COACH-NOTES-SETUP.md`
  - Documentation for coach notes feature
  - Instructions for running SQL migration

### 9. Technical Implementation Details

**Performance Optimizations:**
- Debounced search prevents excessive API calls
- GIN index on coach_notes field for fast full-text search
- Exercise library caching (existing feature) prevents repeated fetches
- Conditional rendering of search panel (unmounts when closed to save resources)

**User Experience Enhancements:**
- Instant visual feedback on drag-and-drop
- Track count updates in real-time based on filters
- Search panel slides in smoothly with animation
- Empty states for no search results
- Loading state during search operations

**Code Organization:**
- Search logic centralized in Coach dashboard component
- Reuses existing WOD state management and handlers
- Maintains separation between search UI and calendar UI
- Clean integration with existing drag-drop system

---

## Session 9: WOD Panel System & Advanced Drag-Drop (October 18, 2025)

**Overview:**
Transformed the WOD editing experience by converting the modal to a comprehensive panel system. Created a sophisticated layout with WOD panel (800px left), Coach Notes panel (400px), and WOD Search panel (400px right). Implemented advanced drag-and-drop functionality allowing both entire WODs and individual sections to be dragged from search results.

### 1. WOD Modal Conversion to Left-Side Panel

**Major Structural Changes (`components/WODModal.tsx`):**
- Converted centered modal to fixed left-side panel
- Changed positioning from centered modal to `fixed left-0 top-16 h-[calc(100vh-4rem)]`
- Width set to 800px (w-[800px])
- Added slide-in-left animation:
  - Closed state: `translate-x-[-100%]` (off-screen left)
  - Open state: `translate-x-0` (visible)
  - Transition: `transition-transform duration-300 ease-in-out`
- Removed max-width constraints (was max-w-7xl)
- Changed from centered overlay to side panel overlay

**Panel Structure:**
- Background overlay maintained for focus (bg-black/50)
- White panel container with shadow-2xl and border-r
- Full viewport height minus header: `h-[calc(100vh-4rem)]`
- Internal scroll container for WOD content
- Header sticky at top with Check/X/Notes buttons

**Scroll Container Implementation:**
- Added overflow-y-auto to content wrapper
- Custom scrollbar styling (8px width, rounded thumb)
- Padding maintained for content spacing
- Sections container scrolls independently

### 2. Coach Notes Panel Repositioning

**Architectural Change:**
The Coach Notes panel was completely repositioned from being inside the WOD Modal to being an independent panel to the right of the WOD panel.

**New Positioning Logic (`components/WODModal.tsx`):**
- Panel positioned at `left-[800px]` (directly right of WOD panel)
- Width: 400px (w-[400px])
- Height: Full viewport minus header `h-[calc(100vh-4rem)]`
- Fixed positioning: `fixed top-16`
- Slide animation: translate-x-full (closed) to translate-x-0 (open)

**State Management:**
- Notes panel opens automatically when WOD panel opens
- Independent close button allows closing notes while keeping WOD panel open
- `isNotesPanelOpen` state synchronized with WOD panel state
- Notes button in WOD panel header toggles notes panel

**Visual Design:**
- White background with shadow-xl and border-r
- "Coach Notes" header with "Private notes for coaches only" subtitle
- Auto-expanding textarea
- Smooth transitions synchronized with WOD panel

**Integration:**
- Coach notes persist with WOD data (coach_notes field)
- Saves/loads through existing WOD handlers
- No interference with WOD panel scrolling

### 3. WOD Search Panel Enhancements

**Size Adjustment (`app/coach/page.tsx`):**
- Reduced from 500px to 400px width for better visual balance
- Matches Coach Notes panel width
- Better proportion with 800px WOD panel

**Enhanced Search Results Display:**
- WOD cards show: title, date, track badge, type badge
- Sections preview with first 3 sections
- Each section shows: type, duration, exercise preview
- Compact card design optimized for 400px width

**Individual Section Drag Capability:**
- Added drag handles to each section in search results
- Sections independently draggable (separate from whole WOD drag)
- Shows section type badge and duration
- Exercise preview (first 100 characters)
- Drag cursor feedback

**Positioning:**
- Fixed on far right: `fixed right-0 top-16`
- Height: `h-[calc(100vh-4rem)]`
- Z-index: 40 (above calendar, below WOD panels)
- Slide animation from right

### 4. Advanced Drag-and-Drop System

**Two-Tier Drag System:**

**Tier 1: Entire WOD Drag-Drop**
- Drag complete WOD cards from search panel
- Drop onto calendar date cells
- Creates copy of entire WOD on target date
- Uses `handleDragStart` to set `draggedWOD` state
- Uses `handleDrop` on calendar cells to copy WOD
- Visual feedback: cursor-grab and cursor-grabbing

**Tier 2: Individual Section Drag-Drop**
- Drag individual sections from search WOD cards
- Drop into WOD panel sections container
- Inserts section at drop position
- Uses separate `draggedSection` state
- Uses `handleSectionDragStart` and `handleSectionDrop` handlers

**Drop Zone Implementation (`components/WODModal.tsx`):**
- Added `onDragOver` and `onDrop` handlers to sections container
- Prevents default behavior to allow drop
- `handleDrop` in WOD Modal:
  - Receives section data from event.dataTransfer
  - Parses JSON section data
  - Appends to existing sections array
  - Updates form data state
  - Visual feedback on drag over

**Data Transfer:**
- Section data transferred as JSON string via event.dataTransfer
- Includes: id, type, duration, content
- Parsed and validated on drop
- Prevents invalid drops

**Visual Feedback:**
- Drag cursor changes: grab → grabbing
- Drop zone highlights on drag over (not fully implemented yet)
- Smooth transitions for all drag operations
- Clear visual distinction between draggable elements

### 5. Layout System Architecture

**Dynamic Calendar Margins:**
The calendar adjusts its position dynamically based on which panels are open:

```typescript
// Left margin when WOD panel is open
const calendarLeftMargin = isWODPanelOpen ? 'ml-[800px]' : '';

// Right margin calculation
let calendarRightMargin = '';
if (isWODPanelOpen && isNotesPanelOpen && isSearchPanelOpen) {
  calendarRightMargin = 'mr-[800px]'; // Notes (400px) + Search (400px)
} else if (isSearchPanelOpen) {
  calendarRightMargin = 'mr-[400px]'; // Just Search
}
```

**Final Layout Positions:**
- WOD Panel: `left-0`, width 800px, slides from left
- Coach Notes Panel: `left-[800px]`, width 400px, appears right of WOD panel
- Calendar: Center with dynamic margins
- Search Panel: `right-0`, width 400px, slides from right

**Transition Smoothness:**
- All panels use `transition-transform duration-300 ease-in-out`
- Calendar uses `transition-all duration-300` for margin changes
- Synchronized animations prevent layout jumping
- No calendar overlap with any panel

**Layout States:**
1. **All Closed:** Calendar centered, full width
2. **Search Open:** Calendar `mr-[400px]`
3. **WOD Open:** Calendar `ml-[800px]`, Notes auto-opens creating `mr-[400px]`
4. **WOD + Search Open:** Calendar `ml-[800px] mr-[800px]` (Notes + Search)

### 6. Database Integration

**Supabase Tables Used:**
- `wods` table with `coach_notes` TEXT field
- `sections` stored as JSONB array
- `tracks` for track filtering
- `workout_types` for type filtering

**Search Queries:**
```typescript
let query = supabase
  .from('wods')
  .select('*, tracks(name, color), workout_types(name)')
  .order('date', { ascending: false });

if (searchQuery) {
  query = query.or(`title.ilike.%${searchQuery}%,coach_notes.ilike.%${searchQuery}%`);
}
```

**Data Persistence:**
- WOD saves include all sections (including dragged sections)
- Coach notes save independently
- Section drag-drop updates sections JSONB array
- All saves persist to Supabase immediately

**Full-Text Search Index:**
- GIN index on coach_notes field
- Enables fast case-insensitive search
- Combined with sections content filtering client-side

### 7. Technical Implementation Details

**State Management (`app/coach/page.tsx`):**
- `isWODPanelOpen`: Boolean for WOD panel visibility
- `isNotesPanelOpen`: Boolean for notes panel visibility (auto-opens with WOD)
- `isSearchPanelOpen`: Boolean for search panel visibility
- `draggedWOD`: Object storing dragged WOD data for calendar drop
- `draggedSection`: Object storing dragged section data for WOD panel drop
- `selectedDate`: Date for WOD being edited
- `editingWOD`: Complete WOD object being edited

**Event Handlers:**
- `handleDragStart(wod)`: Sets draggedWOD state for entire WOD drag
- `handleSectionDragStart(section)`: Sets draggedSection state for section drag
- `handleDrop(date)`: Handles WOD drop on calendar date
- `handleSectionDrop(event)`: Handles section drop in WOD panel
- `handleOpenWODPanel(date, wod?)`: Opens WOD panel for date (create or edit)
- `handleCloseWODPanel()`: Closes WOD panel and notes panel

**Scroll Container Styling (`app/globals.css`):**
```css
.wod-panel-scroll::-webkit-scrollbar {
  width: 8px;
}
.wod-panel-scroll::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}
.wod-panel-scroll::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 10px;
}
.wod-panel-scroll::-webkit-scrollbar-thumb:hover {
  background: #555;
}
```

### 8. Files Modified

**`/Users/chrishiles/SynologyDrive/CrossFit Hammerschmiede (CFH)/AI Development/forge-functional-fitness/app/coach/page.tsx`:**
- Converted WOD modal to panel system
- Added WOD panel state management
- Implemented section drag-drop handlers
- Updated calendar margin logic for multiple panels
- Added section drag capability to search results
- Reduced search panel width to 400px
- Updated layout calculations

**`/Users/chrishiles/SynologyDrive/CrossFit Hammerschmiede (CFH)/AI Development/forge-functional-fitness/components/WODModal.tsx`:**
- Converted modal structure to side panel
- Changed positioning to fixed left-side
- Added slide-in-left animation
- Repositioned Coach Notes panel to right of WOD panel
- Made notes panel independent (separate from WOD panel)
- Added scroll container with custom styling
- Implemented section drop zone
- Updated header button positions

**`/Users/chrishiles/SynologyDrive/CrossFit Hammerschmiede (CFH)/AI Development/forge-functional-fitness/app/globals.css`:**
- Added `.wod-panel-scroll` scrollbar styles
- Webkit scrollbar customization (8px, rounded, hover effects)
- Consistent with search panel scrollbar design

### 9. User Experience Enhancements

**Workflow Improvements:**
- Unified editing workspace (WOD + Notes side-by-side)
- Search panel always accessible on right
- Drag entire WODs for quick scheduling
- Drag individual sections for WOD composition
- No modal blocking - panels slide in smoothly
- Independent panel control (can close notes while editing WOD)

**Visual Feedback:**
- Smooth slide animations for all panels
- Drag cursor changes for draggable elements
- Drop zones highlight on drag over (implementation in progress)
- Clear visual hierarchy: WOD panel primary, notes secondary, search tertiary

**Performance Considerations:**
- Debounced search (300ms) reduces API calls
- GIN index on coach_notes for fast search
- Exercise library caching (from Session 2)
- Conditional panel rendering (unmount when closed)
- Efficient state updates on drag-drop

### 10. Known Issues and Future Enhancements

**Current Issues:**
- **Notes Panel Positioning:** Minor gap between WOD panel and notes panel edge
  - Current position: `left-[800px]`
  - May need adjustment to `left-[799px]` or border styling
  - Visual only, no functional impact

**Potential Enhancements:**
- Drop zone visual highlighting (currently functional but minimal feedback)
- Section reordering via drag within WOD panel (currently only append)
- Undo/redo for drag-drop operations
- Keyboard shortcuts for panel operations
- Panel resize functionality
- Save state of open panels between sessions

### 11. Integration Points

**Calendar Integration:**
- Drag entire WODs from search to calendar dates
- Click dates to open WOD panel (create or edit)
- Copy/paste WODs between dates still functional
- Hover icons (copy/delete) still functional
- All existing calendar features maintained

**Search Integration:**
- Search results display in dedicated panel
- Drag WODs to calendar OR drag sections to WOD panel
- Track filtering works with drag-drop
- Search persists while panels open
- Real-time search with debouncing

**Database Integration:**
- All drag-drop operations save to Supabase
- Coach notes persist independently
- Sections array updated on section drop
- Full-text search on coach_notes field
- Track and workout type relationships maintained

---
