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

## Forge Functional Fitness Patterns

### Database Schema Overview

**Existing Tables:**
- `wods` - Workout definitions with JSONB sections
- `section_types` - Dynamic section types (Warm-up, WOD, etc.)
- `workout_types` - Workout categories (MetCon, Strength, etc.)
- `tracks` - Programming tracks for organizing workouts
- `exercises` - Exercise library with categories
- `athlete_profiles` - Athlete personal information
- `workout_logs` - Per-WOD results and notes
- `benchmark_results` - CrossFit benchmark tracking
- `lift_records` - Barbell lift PRs (1RM, 3RM, 5RM, 10RM)
- `exercise_categories` - Categories for exercise library

**New Tables (Booking System - Planned):**
- `members` - User accounts with approval workflow and trial tracking
- `session_templates` - Weekly schedule templates
- `weekly_sessions` - Generated sessions from templates
- `bookings` - Member session reservations
- `subscriptions` - Stripe subscription management

### Booking System Workflow Pattern

```typescript
// Weekly Session Generation (Scheduled Sunday 15:00)
// 1. Fetch active session templates
const templates = await supabase
  .from('session_templates')
  .select('*')
  .eq('active', true);

// 2. Generate sessions for upcoming week
for (const template of templates) {
  // Create placeholder workout
  const { data: workout } = await supabase
    .from('wods')
    .insert({
      date: calculatedDate,
      sections: [], // Empty placeholder
      status: 'draft'
    })
    .select()
    .single();

  // Create session linked to workout
  await supabase
    .from('weekly_sessions')
    .insert({
      date: calculatedDate,
      time: template.time,
      workout_id: workout.id,
      capacity: template.default_capacity,
      status: 'draft'
    });
}

// 3. Coach reviews and publishes sessions
```

### Member Registration & Approval Pattern

```typescript
// Self-Registration Flow
const registerMember = async (email: string, password: string, name: string) => {
  // 1. Create auth user (disabled until approved)
  const { data: authUser } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: '/book-a-wod' }
  });

  // 2. Create member record with pending status
  await supabase.from('members').insert({
    id: authUser.user.id,
    email,
    name,
    status: 'pending', // Requires coach approval
    account_type: 'primary'
  });

  // 3. Notify coach (in-app notification)
  // Future: Email notification
};

// Coach Approval Flow
const approveMember = async (memberId: string) => {
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days

  await supabase
    .from('members')
    .update({
      status: 'active',
      athlete_trial_start: now.toISOString(),
      athlete_subscription_status: 'trial',
      athlete_subscription_end: trialEnd.toISOString()
    })
    .eq('id', memberId);

  // Enable auth account
  // Send welcome notification
};
```

### Booking Flow Pattern

```typescript
// Member Books Session
const bookSession = async (sessionId: string, memberId: string) => {
  const { data: session } = await supabase
    .from('weekly_sessions')
    .select('*, bookings(*)')
    .eq('id', sessionId)
    .single();

  const confirmedCount = session.bookings.filter(
    b => b.status === 'confirmed'
  ).length;

  const status = confirmedCount < session.capacity
    ? 'confirmed'
    : 'waitlist';

  await supabase.from('bookings').insert({
    session_id: sessionId,
    member_id: memberId,
    status,
    booked_at: new Date().toISOString()
  });

  // If waitlist, notify coach
  if (status === 'waitlist') {
    // Create notification for coach
  }
};

// Coach Promotes Waitlist Member
const promoteFromWaitlist = async (bookingId: string) => {
  await supabase
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', bookingId);

  // Notify member of confirmation
};
```

### Publishing Restriction Pattern

```typescript
// Athlete Page - Fetch Published Workouts (Restricted by Booking)
const fetchAthleteWorkouts = async (memberId: string, weekStart: Date) => {
  // Only show workouts for sessions the member booked
  const { data } = await supabase
    .from('wods')
    .select(`
      *,
      weekly_sessions!inner(
        id,
        bookings!inner(member_id)
      )
    `)
    .eq('is_published', true)
    .eq('weekly_sessions.bookings.member_id', memberId)
    .gte('date', weekStart.toISOString());

  return data;
};

// Check athlete access (trial or subscription)
const hasAthleteAccess = (member: Member): boolean => {
  if (member.athlete_subscription_status === 'trial') {
    return new Date() < new Date(member.athlete_subscription_end);
  }
  return member.athlete_subscription_status === 'active';
};
```

### Stripe Subscription Pattern (Phase 2)

```typescript
// Create Subscription Checkout
const createCheckoutSession = async (
  primaryMemberId: string,
  planType: 'monthly' | 'yearly',
  familyMemberCount: number
) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  // Calculate price based on family size
  const basePrice = planType === 'monthly' ? 2999 : 29999; // cents
  const additionalFee = familyMemberCount * 500; // 5 EUR per family member
  const totalPrice = basePrice + additionalFee;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'eur',
        product_data: { name: 'Athlete Page Access' },
        recurring: { interval: planType === 'monthly' ? 'month' : 'year' },
        unit_amount: totalPrice
      },
      quantity: 1
    }],
    success_url: `${process.env.NEXT_PUBLIC_URL}/athlete?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/athlete?cancelled=true`,
    metadata: { primary_member_id: primaryMemberId }
  });

  return session.url;
};

// Webhook Handler for Subscription Events
const handleStripeWebhook = async (event: Stripe.Event) => {
  switch (event.type) {
    case 'checkout.session.completed':
      // Activate subscription
      const session = event.data.object as Stripe.Checkout.Session;
      await supabase.from('subscriptions').insert({
        primary_member_id: session.metadata.primary_member_id,
        stripe_subscription_id: session.subscription as string,
        status: 'active'
      });
      break;

    case 'customer.subscription.deleted':
      // Handle cancellation
      const subscription = event.data.object as Stripe.Subscription;
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('stripe_subscription_id', subscription.id);
      break;
  }
};
```

### Coach Calendar Booking Badge Pattern

```typescript
// Display booking status on calendar workout cards
interface BookingBadge {
  confirmed: number;
  capacity: number;
  waitlist: number;
  color: 'green' | 'yellow' | 'red' | 'purple';
}

const getBookingBadge = (session: WeeklySession): BookingBadge => {
  const confirmed = session.bookings.filter(b => b.status === 'confirmed').length;
  const waitlist = session.bookings.filter(b => b.status === 'waitlist').length;

  let color: 'green' | 'yellow' | 'red' | 'purple' = 'green';
  if (waitlist > 0) color = 'purple';
  else if (confirmed >= session.capacity) color = 'red';
  else if (confirmed >= session.capacity * 0.8) color = 'yellow';

  return { confirmed, capacity: session.capacity, waitlist, color };
};

// Render: "[8/10 +2]" with color coding
```

### Session Management Pattern
```typescript
// Check authentication in each protected page
useEffect(() => {
  const role = sessionStorage.getItem('userRole');
  if (!role || role !== 'expectedRole') {
    router.push('/');
  }
}, [router]);
const formatDate = (date: Date) => date.toISOString().split('T')[0];

const getWeekDates = () => {
  const curr = new Date(selectedDate);
  const first = curr.getDate() - curr.getDay() + 1;
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(curr.setDate(first + i));
    dates.push(date);
  }
  return dates;
};
const previousWeek = () => {
  const newDate = new Date(selectedDate);
  newDate.setDate(newDate.getDate() - 7);
  setSelectedDate(newDate);
};