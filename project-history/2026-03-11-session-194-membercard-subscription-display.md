# Session 194 — MemberCard Subscription Display + Consistency

**Date:** 2026-03-11
**AI:** Claude Opus 4.6 (Claude Code)

---

## Accomplishments

### 1. Stripe Refund Documentation
- Added "Stripe: Refund Payment & Cancel Subscription" section to `Chris Notes/Forge app documentation/Reset-Athlete-Account.md`
- 3-step procedure: Refund in Stripe > Cancel subscription in Stripe > Reset Supabase data
- Key note: Always do Stripe first before clearing Supabase references

### 2. MemberCard Subscription Plan Differentiation
- **Problem:** MemberCard showed "Active" for both trial and paid users — no way to distinguish monthly vs yearly subscribers
- **Solution:** Fetch `plan_type` from `subscriptions` table and display differentiated status
- **Files changed:**
  - `types/member.ts` — Added `subscription_plan_type` to Member interface, updated `getTrialStatus()` to show "Active (Monthly)"/"Active (Yearly)"
  - `hooks/coach/useMemberData.ts` — New query to `subscriptions` table (where status=active), merges `plan_type` into member data
- **Display results:** Trial → "X days left", Paid monthly → "Active (Monthly)", Paid yearly → "Active (Yearly)", Manual → "Active", None → "No access"

### 3. Consistent MemberCard Layout
- **Problem:** Cards with/without phone number had different grid layouts
- **Solution:** Phone field always renders, shows "—" in dimmed gray when empty
- **File:** `components/coach/members/MemberCard.tsx`

---

## Files Changed
- `Chris Notes/Forge app documentation/Reset-Athlete-Account.md`
- `types/member.ts`
- `hooks/coach/useMemberData.ts`
- `components/coach/members/MemberCard.tsx`
