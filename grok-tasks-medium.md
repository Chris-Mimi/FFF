# Grok Tasks - Medium Complexity

**Branch:** Use same branch as simple tasks `grok-ui-tasks-2025-10-31`

---

## Task 4: Make Session Management Modal Resizable and Draggable

**File:** `components/SessionManagementModal.tsx`

**Context:**
Session Management Modal currently appears as a fixed modal. We need to make it draggable and resizable like the Coach Notes Modal.

**Reference Implementation:**
Look at `app/coach/page.tsx` lines 1893-2033 for the Coach Notes Modal implementation, which already has drag and resize functionality.

**Requirements:**
1. Make modal draggable by clicking and dragging the header
2. Make modal resizable from all 4 corners
3. Maintain existing modal functionality (all buttons, forms, etc.)
4. Default position: Centered on screen
5. Default size: 600px width, 700px height
6. Minimum size: 500px width, 500px height

**Implementation Steps:**

### 1. Add State Variables
```typescript
const [modalPos, setModalPos] = useState({ top: 100, left: 100 });
const [modalSize, setModalSize] = useState({ width: 600, height: 700 });
const [isDragging, setIsDragging] = useState(false);
const [isResizing, setIsResizing] = useState(false);
const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
const [resizeCorner, setResizeCorner] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null);
```

### 2. Add Drag Handlers
```typescript
const handleDragStart = (e: React.MouseEvent) => {
  if ((e.target as HTMLElement).closest('.resize-handle')) return;
  setIsDragging(true);
  setDragStart({ x: e.clientX - modalPos.left, y: e.clientY - modalPos.top });
};

const handleDragMove = (e: MouseEvent) => {
  if (!isDragging) return;
  setModalPos({
    left: e.clientX - dragStart.x,
    top: e.clientY - dragStart.y,
  });
};

const handleDragEnd = () => {
  setIsDragging(false);
};
```

### 3. Add Resize Handlers
```typescript
const handleResizeStart = (e: React.MouseEvent, corner: 'nw' | 'ne' | 'sw' | 'se') => {
  e.stopPropagation();
  setIsResizing(true);
  setResizeCorner(corner);
  setResizeStart({
    x: e.clientX,
    y: e.clientY,
    width: modalSize.width,
    height: modalSize.height,
  });
};

const handleResizeMove = (e: MouseEvent) => {
  if (!isResizing || !resizeCorner) return;

  const dx = e.clientX - resizeStart.x;
  const dy = e.clientY - resizeStart.y;

  let newWidth = resizeStart.width;
  let newHeight = resizeStart.height;
  let newLeft = modalPos.left;
  let newTop = modalPos.top;

  if (resizeCorner.includes('e')) newWidth = Math.max(500, resizeStart.width + dx);
  if (resizeCorner.includes('w')) {
    newWidth = Math.max(500, resizeStart.width - dx);
    newLeft = modalPos.left + dx;
  }
  if (resizeCorner.includes('s')) newHeight = Math.max(500, resizeStart.height + dy);
  if (resizeCorner.includes('n')) {
    newHeight = Math.max(500, resizeStart.height - dy);
    newTop = modalPos.top + dy;
  }

  setModalSize({ width: newWidth, height: newHeight });
  setModalPos({ left: newLeft, top: newTop });
};

const handleResizeEnd = () => {
  setIsResizing(false);
  setResizeCorner(null);
};
```

### 4. Add useEffect for Event Listeners
```typescript
useEffect(() => {
  if (isDragging) {
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }
}, [isDragging]);

useEffect(() => {
  if (isResizing) {
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }
}, [isResizing]);
```

### 5. Update Modal Container Styling
Replace the existing modal wrapper with:
```typescript
<div
  className="fixed bg-white rounded-lg shadow-2xl border-2 border-gray-300 flex flex-col"
  style={{
    left: `${modalPos.left}px`,
    top: `${modalPos.top}px`,
    width: `${modalSize.width}px`,
    height: `${modalSize.height}px`,
    zIndex: 1000,
  }}
>
  {/* Header - Draggable */}
  <div
    className="p-4 border-b border-gray-200 cursor-move bg-gray-50"
    onMouseDown={handleDragStart}
  >
    {/* Existing header content */}
  </div>

  {/* Content - Scrollable */}
  <div className="flex-1 overflow-y-auto p-4">
    {/* Existing modal content */}
  </div>

  {/* Resize Handles - 4 Corners */}
  <div
    className="resize-handle absolute top-0 left-0 w-4 h-4 cursor-nw-resize"
    onMouseDown={(e) => handleResizeStart(e, 'nw')}
  />
  <div
    className="resize-handle absolute top-0 right-0 w-4 h-4 cursor-ne-resize"
    onMouseDown={(e) => handleResizeStart(e, 'ne')}
  />
  <div
    className="resize-handle absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize"
    onMouseDown={(e) => handleResizeStart(e, 'sw')}
  />
  <div
    className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
    onMouseDown={(e) => handleResizeStart(e, 'se')}
  />
</div>
```

**Test:**
- Click and drag header to move modal
- Drag each corner to resize
- Verify minimum size constraints work
- Check all buttons and forms still function
- Verify modal stays within viewport

---

## Task 5: Add Week Navigation to Logbook and Published Workouts

**Files:**
- `components/AthleteWorkoutsTab.tsx` (Published Workouts)
- `app/athlete/page.tsx` (Logbook section)

**Context:**
Currently both tabs use daily date navigation. Add week-based navigation for easier date selection.

**Requirements:**
1. Add "Previous Week" and "Next Week" buttons
2. Display current week range (e.g., "Oct 25 - Oct 31, 2025")
3. Keep existing single-day navigation as well
4. Week starts on Monday (ISO week)

**Implementation:**

### For AthleteWorkoutsTab.tsx:

1. **Add Week Navigation State:**
```typescript
const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
```

2. **Add Week Calculation Function:**
```typescript
const getWeekRange = (date: Date) => {
  const curr = new Date(date);
  const first = curr.getDate() - curr.getDay() + 1; // Monday
  const start = new Date(curr.setDate(first));
  const end = new Date(start);
  end.setDate(end.getDate() + 6); // Sunday
  return { start, end };
};

const previousWeek = () => {
  const newDate = new Date(selectedDate);
  newDate.setDate(newDate.getDate() - 7);
  setSelectedDate(newDate);
};

const nextWeek = () => {
  const newDate = new Date(selectedDate);
  newDate.setDate(newDate.getDate() + 7);
  setSelectedDate(newDate);
};
```

3. **Add Week Range Display:**
```typescript
const { start: weekStart, end: weekEnd } = getWeekRange(selectedDate);
const weekRangeText = `${weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
```

4. **Update Navigation UI:**
```typescript
<div className="flex items-center justify-between mb-4">
  {/* Mode Toggle */}
  <div className="flex gap-2">
    <button
      onClick={() => setViewMode('week')}
      className={`px-3 py-1 rounded ${viewMode === 'week' ? 'bg-[#208479] text-white' : 'bg-gray-200'}`}
    >
      Week
    </button>
    <button
      onClick={() => setViewMode('day')}
      className={`px-3 py-1 rounded ${viewMode === 'day' ? 'bg-[#208479] text-white' : 'bg-gray-200'}`}
    >
      Day
    </button>
  </div>

  {/* Navigation based on mode */}
  {viewMode === 'week' ? (
    <div className="flex items-center gap-4">
      <button onClick={previousWeek} className="p-2 hover:bg-gray-100 rounded">
        <ChevronLeft size={20} />
      </button>
      <span className="font-medium">{weekRangeText}</span>
      <button onClick={nextWeek} className="p-2 hover:bg-gray-100 rounded">
        <ChevronRight size={20} />
      </button>
    </div>
  ) : (
    /* Existing day navigation */
  )}
</div>
```

### For Logbook in app/athlete/page.tsx:

Apply the same pattern to the Logbook date picker section.

**Test:**
- Click "Week" mode, verify week range displays correctly
- Click previous/next week arrows, verify date changes by 7 days
- Switch back to "Day" mode, verify single-day navigation works
- Check week starts on Monday
- Verify workouts load for correct date range in week mode

---

**After Completion:**
1. Test all features (drag, resize, week navigation)
2. Run `git status` to see all modified files
3. Run `git diff` to review all changes
4. Tell Chris: "Grok made changes, check and commit"
