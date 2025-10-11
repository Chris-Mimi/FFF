# Technical Context

Version: 1.0
Timestamp: [Update when tech changes]

---

## Core Technologies

### Frontend

- **Framework:** Next.js with React 18 and TypeScript
- **Version:** Next.js 14+ (latest stable)
- **Why chosen:** PWA capabilities, server-side rendering, built-in API routes, excellent for member-facing web app that works on all devices

### Backend (if applicable)

- **Runtime/Language:** Node.js with TypeScript
- **Framework:** Next.js API routes (serverless functions)
- **Version:** Node.js v24.10.0

### Database

- **Type:** PostgreSQL (via Supabase)
- **Version:** PostgreSQL 15+
- **ORM/Query Library:** Supabase client SDK with built-in authentication and real-time subscriptions

---

## Key Dependencies

### Production Dependencies
- **next**: ^14.0.0 - React framework
- **react**: ^18.0.0 - UI library
- **typescript**: ^5.0.0 - Type safety
- **@supabase/supabase-js**: ^2.0.0 - Database and auth
- **tailwindcss**: ^3.0.0 - Styling
- **@tanstack/react-query**: ^5.0.0 - Data fetching and caching

```json
{
  "dependency-name": "version",
  "another-dep": "version"
}
```

**Why we use them:**
- **[Dependency 1]:** [What it does and why you need it]
- **[Dependency 2]:** [What it does and why you need it]

### Development Dependencies

```json
{
  "dev-dependency": "version"
}
```

**Purpose:**
- **[Dev Dep 1]:** [What it helps with]

---

## Configuration System

### Environment Variables

```bash
# Required
DATABASE_URL=          # [What it's for]
API_KEY=               # [What it's for]

# Optional
DEBUG=                 # [What it's for]
PORT=                  # [Default: 3000]
```

### Config Files

- **`package.json`:** Project dependencies and scripts
- **`.env`:** Environment-specific variables (NOT in Git)
- **`[other-config].json`:** [What it configures]

---

## Development Setup

### Prerequisites

```bash
# Required software
- Node.js 18+ (or your version)
- npm or yarn
- [Any other requirements]
```

### Initial Setup

```bash
# 1. Clone repository
git clone [repo-url]

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env

# 4. Edit .env with your settings
# (Add your API keys, etc.)

# 5. Run development server
npm run dev
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run lint         # Check code quality
```

---

## Technical Constraints

### Browser Support

[Which browsers you're targeting]
- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- [Your requirements]

### Performance Requirements

[Any performance goals you have]
- Page load: Under 3 seconds
- API response: Under 500ms
- [Your requirements]

### Security Considerations

[Security measures you're implementing]
- Input validation
- SQL injection prevention
- XSS protection
- [Your measures]

---

## Development Environment

### IDE/Editor

**VS Code** with extensions:
- ESLint
- Prettier
- [Other extensions you use]

### Tools

- **Git:** Version control
- **Claude Code:** AI development assistant
- **[Other tools]:** [Purpose]

---

## API Integration

### External APIs

**[API Name]:**
- Purpose: [What you use it for]
- Authentication: [How you authenticate]
- Endpoints used:
  - `GET /endpoint` - [What it does]
  - `POST /endpoint` - [What it does]
- Rate limits: [If applicable]
- Documentation: [Link]

### Internal API (if you built one)

**Base URL:** `http://localhost:3000/api`

**Endpoints:**
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- [Your endpoints]

**Authentication:**
[How your API authentication works]

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
