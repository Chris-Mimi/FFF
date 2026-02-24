# Remaining LOW Items (Post-Audit)

**Updated:** 2026-02-24 (after Sessions 154-155)
**Status:** All CRITICAL, HIGH, and MEDIUM audit items are DONE.

---

## 1. Large Files (8 files >500 lines)

Splitting these into smaller files (extracting components, hooks, utilities) would improve maintainability but risks breaking things — every extraction point is a potential bug. The app works correctly now, so this is a "nice to have" refactor, not a fix. Typical approach: pick one file at a time, extract on a branch, test thoroughly, merge.

**Recommendation:** Do one at a time when convenient. Not blocking deployment.

---

## 2. TypeScript `any` Suppressions (22 instances)

These are places where TypeScript's `any` type is used (e.g., Supabase query results where the SDK returns loosely typed data). Each one already has an `// eslint-disable-next-line` comment so ESLint doesn't warn about it. Fixing them means writing proper type definitions for each case — purely a code quality improvement with zero runtime impact. The app behaves identically either way.

**Recommendation:** Fix gradually when touching those files. Not blocking deployment.

---

## 3. No Rate Limiting on Registration Endpoints

Right now, someone could write a script to hit the signup endpoints thousands of times per second. Rate limiting would block that (e.g., "max 5 requests per minute per IP").

**Options:**
- **Vercel built-in** — if deploying to Vercel, their Edge Middleware can rate limit
- **Upstash Redis** — popular serverless rate limiter (~$0/month for low traffic)
- **Simple in-memory** — works for single-server but resets on deploy

**Context:** ~60 gym members (closed community). Supabase Auth itself has built-in rate limits on its signup endpoint, which gives baseline protection already. Someone would need to specifically target the signup endpoint, which is unlikely for a private gym app.

**Recommendation:** Add as a pre-public-launch item rather than blocking deployment for 60 known members. Becomes more important if registration is ever opened publicly.
