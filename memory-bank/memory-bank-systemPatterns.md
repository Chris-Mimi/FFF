# System Patterns

Version: 1.1
Timestamp: 2025-11-06

---

## Development Standards

### Code Style

**General Principles:**
- Write code that's easy to read
- Prefer clarity over cleverness
- Comment the "why", not the "what"
- Keep functions small and focused

**Naming:**
- Variables: `descriptiveNames`
- Functions: `doSomething()`
- Components: `ComponentName`
- Constants: `CONSTANT_VALUE`

**File Organization:**
- One component per file
- Related files stay together
- Clear folder structure

---

## Implementation Patterns

### Pattern: API Data Fetching

**When to use:** Fetching data from an API

**Implementation:**
```javascript
const [data, setData] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

const fetchData = async () => {
  setLoading(true);
  setError(null);

  try {
    const response = await fetch('/api/endpoint');
    if (!response.ok) throw new Error('Failed to fetch');

    const result = await response.json();
    setData(result);
  } catch (err) {
    setError(err.message);
    console.error('Fetch error:', err);
  } finally {
    setLoading(false);
  }
};
```

**Why it works:**
- Clear loading states
- Proper error handling
- User knows what's happening

**Gotchas:**
- Don't forget to handle loading state
- Always catch errors
- Clean up if component unmounts

---

### Pattern: Form Handling

**When to use:** User input forms

**Implementation:**
```javascript
const [formData, setFormData] = useState({
  field1: '',
  field2: ''
});
const [errors, setErrors] = useState({});

const handleChange = (e) => {
  const { name, value } = e.target;
  setFormData(prev => ({
    ...prev,
    [name]: value
  }));
};

const handleSubmit = async (e) => {
  e.preventDefault();

  // Validate
  const newErrors = validate(formData);
  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    return;
  }

  // Submit
  try {
    await submitForm(formData);
    // Success handling
  } catch (err) {
    // Error handling
  }
};
```

**Why it works:**
- Controlled components
- Validation before submit
- Clear error display

---

### Pattern: Conditional Rendering

**When to use:** Show different UI based on state

**Implementation:**
```javascript
// Loading state
if (loading) return <LoadingSpinner />;

// Error state
if (error) return <ErrorMessage error={error} />;

// Empty state
if (!data || data.length === 0) return <EmptyState />;

// Success state
return <DataDisplay data={data} />;
```

**Why it works:**
- User always sees appropriate feedback
- Clear state management
- Easy to debug

---

## Error Handling Protocols

### Frontend Errors

**Always do:**
```javascript
try {
  // Your code
} catch (error) {
  // 1. Log for debugging
  console.error('Error context:', error);

  // 2. Show user-friendly message
  setErrorMessage('Something went wrong. Please try again.');

  // 3. Optional: Report to error tracking
  // reportError(error);
}
```

**Never do:**
- Ignore errors silently
- Show technical error messages to users
- Let app crash without feedback

### API Errors

**Pattern:**
```javascript
const response = await fetch('/api/endpoint');

if (!response.ok) {
  // Handle HTTP errors
  if (response.status === 404) {
    throw new Error('Resource not found');
  }
  if (response.status === 401) {
    throw new Error('Please log in');
  }
  throw new Error('Something went wrong');
}

const data = await response.json();
```

---

## Component Structure

### Standard Component Pattern

```javascript
import React, { useState, useEffect } from 'react';

/**
 * [Component description]
 * @param {Object} props - Component props
 * @param {string} props.propName - What this prop does
 */
function MyComponent({ propName }) {
  // 1. State declarations
  const [state, setState] = useState(initialValue);

  // 2. Effects
  useEffect(() => {
    // Side effects here
    return () => {
      // Cleanup if needed
    };
  }, [dependencies]);

  // 3. Event handlers
  const handleEvent = () => {
    // Handler logic
  };

  // 4. Helper functions
  const helperFunction = () => {
    // Helper logic
  };

  // 5. Render logic
  if (loading) return <LoadingState />;
  if (error) return <ErrorState />;

  return (
    <div className="component-container">
      {/* JSX here */}
    </div>
  );
}

export default MyComponent;
```

---

## Testing Patterns

### What to Test

**Do test:**
- User interactions (clicks, input)
- Data fetching and display
- Form validation
- Error handling
- Key business logic

**Don't test:**
- Implementation details
- Third-party libraries
- Obvious code (getters/setters)

### Test Structure

```javascript
describe('ComponentName', () => {
  it('should do expected behavior', () => {
    // Arrange: Set up test data

    // Act: Perform action

    // Assert: Check result
  });
});
```

---

## Git Commit Patterns

### Commit Message Format

```
type(scope): description

[optional body]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting changes
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

**Examples:**
```
feat(auth): add user login form
fix(api): correct data fetching error
docs(readme): update installation steps
refactor(components): simplify Button component
```

---

## Code Review Checklist

Before committing, ask yourself:

- [ ] Does this code work?
- [ ] Is it easy to understand?
- [ ] Are there any magic numbers? (use constants)
- [ ] Is error handling in place?
- [ ] Are edge cases covered?
- [ ] Could this be simpler?
- [ ] Is it consistent with existing code?
- [ ] Are there any console.logs to remove?
- [ ] Is documentation updated?

---

## Performance Patterns

### Avoid Unnecessary Re-renders

```javascript
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  // Component logic
});

// Use useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(data);
}, [data]);

// Use useCallback for functions passed as props
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

---

## Lessons Learned

### Lesson 1: [Title] — [Date]

**What happened:**
[Description of situation]

**What I learned:**
[Key takeaway]

**Applied pattern:**
```javascript
// Code showing the solution
```

**When to use:**
[Situations where this applies]

---

### Lesson 2: [Title] — [Date]

**What happened:**
[Description]

**What I learned:**
[Takeaway]

---

## Collaboration Guidelines

### Working with Claude Code (CLI)

**Start of session:**
1. Claude reads workflow-protocols.md FIRST
2. Claude reads all Memory Bank files
3. Explain what you want to accomplish
4. Claude evaluates task delegation (Cline/Agent/Direct)
5. Ask questions if anything is unclear

**During development:**
- Claude explains decisions
- Request code reviews
- Discuss trade-offs

**End of session:**
- Update Memory Bank
- Commit changes
- Note next steps

### Working with Cline/Grok (VS Code)

**CRITICAL: Always provide Active Context first**

**Setup (MANDATORY):**
1. Have Cline read `memory-bank-activeContext.md` FIRST
2. Then provide specific task prompt
3. Cline works confidently in 1-2 minutes

**Why Active Context is required:**
- Without context, Cline overthinks and gets stuck (10+ min on 2-min tasks)
- Active Context provides confidence anchor:
  - Tech stack confirmation
  - Project patterns
  - Prevents analysis paralysis
- Even "simple" UI tasks need this context

**Lesson learned:** 2025-11-06 - Attempted UI change without Active Context, Cline repeated statements and couldn't start work after 10+ minutes. With Active Context, same tasks complete in 1-2 minutes.

**Best for:**
- Single-file edits
- UI/visual changes
- Component styling
- Simple bug fixes

**Not suitable for:**
- Multi-file changes
- Git operations
- Memory Bank updates
- Complex logic/debugging

### Code Documentation

**When to comment:**
- Complex algorithms
- Non-obvious business logic
- Workarounds for known issues
- TODOs for future improvements

**When not to comment:**
- Obvious code
- Self-explanatory functions
- Code that can be made clearer instead

---

## Security Best Practices

### Input Validation

```javascript
// Always validate user input
const isValid = (input) => {
  if (typeof input !== 'string') return false;
  if (input.length === 0) return false;
  if (input.length > MAX_LENGTH) return false;
  // Add more validation
  return true;
};
```

### Sensitive Data

- Never commit API keys
- Use environment variables
- Don't log sensitive data
- Sanitize user input

---

## Debugging Protocols (CRITICAL - Read First When Debugging)

### Core Principles

**ALWAYS follow this order when debugging:**

1. **Trust the User**
   - If user says "exercise is in database", it IS in the database
   - Don't ask to verify what user already confirmed
   - User has direct access to database - trust their statements

2. **Add Comprehensive Logging IMMEDIATELY**
   - Don't guess at the problem
   - Add console.logs at every step of data flow
   - Log: input → transformation → output
   - Verify assumptions with data, not speculation

3. **Trace Data Flow Systematically**
   - Extraction → Normalization → Validation → Storage → Display
   - Find where data is lost/changed
   - Don't skip steps or modify code until you know where the issue is

4. **Don't Modify Code Based on Guesses**
   - Verify each step with logging first
   - Only change code after confirming root cause
   - One fix at a time, verify after each change

### Anti-Patterns (DO NOT DO)

❌ **Circular Questioning**
- Asking same question multiple times after user answered
- Requesting database verification when user selected from UI

❌ **Premature Optimization**
- Changing normalization logic before checking if data exists
- Modifying regex patterns before seeing what they capture

❌ **Scattered Debugging**
- Checking random parts of code without systematic trace
- Modifying multiple areas simultaneously

### Debugging Template

```javascript
// Step 1: Log at extraction point
console.log('Extracted:', rawValue);

// Step 2: Log after transformation
console.log('After transform:', transformedValue);

// Step 3: Log validation result
console.log('Validation:', validationResult);

// Step 4: Log final state
console.log('Final state:', finalValue);
```

**Use this pattern EVERY TIME** before modifying code.

---

*Add new patterns as you discover them. This becomes your pattern library!*

---

## Component Refactoring Pattern (Large File Extraction)

**When to use:** When a component file exceeds 2000 lines and becomes difficult to maintain

**Implementation Steps:**

1. **Create Safety Branch:**
```bash
git checkout -b feature-refactor
```

2. **Identify Extraction Targets:**
   - Utilities: Pure functions (date formatting, text processing, calculations)
   - Custom Hooks: Stateful logic (data fetching, operations, UI state)
   - Components: Self-contained UI sections (headers, navigation, panels, modals)

3. **Extract in Order (Dependencies First):**

**Step 1: Extract Utilities**
```typescript
// utils/date-utils.ts
export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getWeekDates = (selectedDate: Date): Date[] => {
  // Monday-Sunday week calculation
  const curr = new Date(selectedDate);
  const first = curr.getDate() - curr.getDay() + 1;
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(curr.setDate(first + i));
    dates.push(date);
  }
  return dates;
};
```

**Step 2: Extract Custom Hooks**
```typescript
// hooks/useCoachData.ts
export const useCoachData = ({
  searchQuery,
  selectedMovements,
  selectedWorkoutTypes,
  selectedTracks,
  excludedSectionTypes,
}: UseCoachDataProps) => {
  const [wods, setWods] = useState<Record<string, WODFormData[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchWODs = async () => {
    // Data fetching logic
  };

  // CRITICAL: Don't include fetchWODs in useEffect deps if stable
  useEffect(() => {
    fetchWODs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  return { wods, loading, fetchWODs };
};

// hooks/index.ts (barrel export)
export { useCoachData } from './useCoachData';
export { useWODOperations } from './useWODOperations';
export { useDragDrop } from './useDragDrop';
```

**Step 3: Extract Components**
```typescript
// components/CalendarNav.tsx
interface CalendarNavProps {
  viewMode: 'weekly' | 'monthly';
  selectedDate: Date;
  onViewModeChange: (mode: 'weekly' | 'monthly') => void;
  onPreviousPeriod: () => void;
  onNextPeriod: () => void;
  onTodayClick: () => void;
}

export const CalendarNav = ({
  viewMode,
  selectedDate,
  onViewModeChange,
  onPreviousPeriod,
  onNextPeriod,
  onTodayClick,
}: CalendarNavProps) => {
  return (
    <div className="navigation-container">
      {/* Navigation UI */}
    </div>
  );
};
```

**Step 4: Use Callback Pattern for Dependencies**
```typescript
// Instead of passing handlers through hook props:
const useDragDrop = ({ handleCopyWOD }) => { /* ... */ }; // ❌ Requires prop

// Use callback parameters:
const useDragDrop = () => {
  const handleDrop = (e: React.DragEvent, targetDate: Date, onCopy: CopyCallback) => {
    // onCopy passed when called, not when hook defined
    if (!draggedWOD) return;
    onCopy(draggedWOD.wod, targetDate);
  };
  return { handleDrop };
};

// Call with wrapper:
const handleDropWrapper = (e: React.DragEvent, date: Date) => {
  handleDrop(e, date, handleCopyWOD); // ✅ Curried callback
};
```

4. **Test Integration:**
   - Fix TypeScript errors (signature mismatches, missing imports)
   - Verify table names and database queries
   - Check useEffect dependency arrays
   - Test all functionality incrementally
   - Compare with original branch to identify new vs pre-existing bugs

5. **Commit and Test Before Merging:**
```bash
git add -A
git commit -m "refactor: extract components/hooks/utils from monolithic file"
git push -u origin feature-refactor
# User tests thoroughly before merge
```

**Why it works:**
- Smaller files are easier to navigate and maintain
- Separation of concerns (UI, logic, utilities)
- Reusable hooks and utilities
- Clear file organization
- Easier to test individual pieces

**Gotchas:**
- Agent-created code may have different signatures than expected
- useEffect dependencies with function refs cause infinite re-renders
- Table names may be inconsistent when moving code
- Z-index/layout issues may emerge from component extraction
- Always create safety branch before major refactors
- Test thoroughly before merging to main development branch

**Success Metrics:**
- Session 8: Reduced coach/page.tsx from 2,635 → 408 lines (84% reduction)
- Created 16 new files (4 utilities, 5 hooks, 7 components)
- All functionality preserved (with one fixable bug)

---

**Note:** For Forge Functional Fitness specific implementation patterns (booking system, member registration, Stripe integration, etc.), see `historical-features.md` for feature list and `project-history/` for implementation details.