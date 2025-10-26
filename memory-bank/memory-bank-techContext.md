# Technical Context

Version: 2.0
Timestamp: 2025-10-26

---

## Core Technologies

### Frontend

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Why chosen:** Modern React framework with server-side rendering, API routes, and excellent TypeScript support

### Backend

- **Runtime:** Node.js (via Next.js API routes)
- **Framework:** Next.js API Routes
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth

### Database

- **Type:** PostgreSQL (via Supabase)
- **Version:** Supabase managed
- **Query Library:** Supabase JavaScript client
- **Key Features:** RLS (Row Level Security), JSONB columns, GIN indexes for full-text search

---

## Key Dependencies

### Production Dependencies

```json
{
  "@supabase/supabase-js": "latest",
  "next": "15.x",
  "react": "18.x",
  "recharts": "latest",
  "stripe": "latest"
}
```

**Why we use them:**
- **@supabase/supabase-js:** Database client and authentication
- **next:** React framework with SSR and API routes
- **react:** UI library
- **recharts:** Progress charts for athlete tracking
- **stripe:** Payment processing (upcoming booking system)

### Development Dependencies

```json
{
  "typescript": "latest",
  "eslint": "latest",
  "prettier": "latest"
}
```

**Purpose:**
- **TypeScript:** Type safety and better developer experience
- **ESLint:** Code quality and consistency
- **Prettier:** Automatic code formatting

---

## Configuration System

### Environment Variables

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Supabase anonymous/public key

# Google Calendar (Optional - Publishing feature)
GOOGLE_SERVICE_ACCOUNT_EMAIL=      # Service account email
GOOGLE_PRIVATE_KEY=                # Service account private key
GOOGLE_CALENDAR_ID=                # Target calendar ID

# Stripe (Upcoming - Booking system payments)
STRIPE_SECRET_KEY=                 # Stripe secret key (Phase 2)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY= # Stripe publishable key (Phase 2)
```

### Config Files

- **`package.json`:** Project dependencies and scripts
- **`.env.local`:** Environment-specific variables (NOT in Git, required for local development)
- **`tsconfig.json`:** TypeScript configuration
- **`tailwind.config.js`:** Tailwind CSS configuration
- **`.eslintrc.js`:** ESLint rules and configuration
- **`.prettierrc`:** Prettier formatting rules
- **`.editorconfig`:** Editor settings for consistent formatting

---

## Development Setup

### Prerequisites

```bash
# Required software
- Node.js 18+
- npm (comes with Node.js)
- Supabase account (for database)
- Git
```

### Initial Setup

```bash
# 1. Clone repository
git clone [repo-url]

# 2. Install dependencies
npm install

# 3. Create environment file
# Create .env.local and add Supabase credentials

# 4. Run development server
npm run dev
```

### Available Scripts

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm run lint         # Check code quality with ESLint
npm run format       # Format code with Prettier (if configured)
```

---

## Technical Constraints

### Browser Support

- Chrome/Edge: Latest 2 versions (primary target)
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari, Chrome Android

### Performance Requirements

- Page load: Under 3 seconds
- API response: Under 500ms for database queries
- Client-side rendering for interactive calendar
- Optimized JSONB queries with GIN indexes

### Security Considerations

- **Supabase RLS policies:** Row-level security enforced at database level
- **Authentication:** Supabase Auth with JWT tokens
- **Input validation:** TypeScript type checking + runtime validation
- **SQL injection prevention:** Supabase client parameterized queries
- **Environment variables:** Sensitive keys in .env.local (not committed)

### Units System

- **Metric units enforced throughout:**
  - Weight: kilograms (kg)
  - Distance: meters (m)
  - Height: centimeters (cm)

---

## Development Environment

### IDE/Editor

**VS Code** with extensions:
- ESLint
- Prettier
- TypeScript + JavaScript
- Tailwind CSS IntelliSense

### Tools

- **Git:** Version control
- **Claude Code:** AI development assistant (primary)
- **Cline:** Backup AI assistant with free models (Grok, Supernova) for rate limit situations
- **Supabase Dashboard:** Database management and SQL editor

---

## API Integration

### External APIs

**Google Calendar API:**
- Purpose: Publish workouts to public calendar for athletes
- Authentication: Service account with OAuth 2.0
- Endpoints used:
  - `POST /calendars/{calendarId}/events` - Create event
  - `DELETE /calendars/{calendarId}/events/{eventId}` - Delete event
- Rate limits: Standard Google API limits
- Documentation: [Google Calendar API Docs](https://developers.google.com/calendar)
- Status: Optional (app works without it)

**Stripe API (Upcoming - Phase 2):**
- Purpose: Process subscription payments for booking system
- Authentication: API keys (secret + publishable)
- Endpoints: Checkout, subscriptions, webhooks
- Documentation: [Stripe Docs](https://stripe.com/docs)

### Internal API

**Base URL:** `http://localhost:3000/api`

**Endpoints:**
- `POST /api/google/publish-workout` - Publish workout to Google Calendar (optional Google sync)
- `DELETE /api/google/publish-workout` - Delete workout from Google Calendar
- Future: `/api/stripe/*` - Payment processing (Phase 2)

**Authentication:**
- Supabase Auth session tokens
- API routes validate user session before processing

---

## Build & Deployment

### Build Process

```bash
# Development build
npm run dev

# Production build
npm run build
```

**Output:** `dist/` or `build/` folder

### Deployment

**Platform:** [e.g., Vercel, Netlify, Railway, Local only]

**Process:**
1. [Step 1]
2. [Step 2]

**Environment:** [Production URL or local only]

---

## File Structure

```
project-root/
├── src/
│   ├── components/         # React components
│   ├── pages/              # Page components
│   ├── services/           # API services
│   ├── utils/              # Helper functions
│   └── App.js              # Main app
├── public/                 # Static assets
├── .claude/                # Claude configuration
├── memory-bank/            # Project context
├── tests/                  # Test files
├── .env                    # Environment variables
├── .gitignore              # Git ignore rules
├── package.json            # Dependencies
└── README.md               # Project documentation
```

---

## Testing Setup

**Framework:** [e.g., Jest, Vitest, or "Not set up yet"]

**Coverage:** [Your coverage goals or "Not tracking yet"]

**Test Types:**
- Unit tests: [Where they are]
- Integration tests: [Where they are]
- E2E tests: [If applicable]

---

## Common Commands

### Start Development

```bash
npm run dev
# Opens at http://localhost:3000
```

### Check for Errors

```bash
npm run lint
```

### Database Operations

```bash
# If using database migrations
npm run migrate
npm run seed
```

---

## Gotchas & Known Issues

### Environment-Specific

- [Issue 1 and how to handle it]
- [Issue 2 and workaround]

### Dependencies

- [Known issue with dependency X]
- [Workaround for library Y]

---

## Learning Resources

### Official Documentation

- [Framework docs link]
- [Library docs link]

### Tutorials Followed

- [Tutorial 1 link] - [What you learned]
- [Tutorial 2 link] - [What you learned]

### Helpful Articles

- [Article 1] - [Why it helped]

---

*Keep this updated as your tech stack evolves!*
