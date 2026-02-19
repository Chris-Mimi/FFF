# Session 140 — At-Risk Member Alerts

**Date:** 2026-02-19
**Model:** Claude Opus 4.6
**Focus:** At-risk member alerts tab on Members page

---

## Accomplishments

### At-Risk Member Alerts (Feature #5)
- New "At-Risk" tab on Members page with orange styling and count badge
- Identifies active members with 0 confirmed bookings in selected timeframe
- Filters to regular membership types only (member, ten_card, wellpass, hansefit — excludes drop_in, trial)
- Shows "Last attended: X days ago" or "Never attended" per member
- New Supabase RPC function `get_members_last_attendance` for last attendance date
- Timeframe-aware: updates when coach switches between 7/30/365/all days
- Count badge on tab visible from other tabs (like pending count)
- Orange "At-Risk" badge on member cards in at-risk tab

---

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `database/add-last-attendance-function.sql` | CREATED | RPC function for last attendance date |
| `types/member.ts` | MODIFIED | Added 'at-risk' to MemberStatus, last_attendance_date to Member |
| `hooks/coach/useMemberData.ts` | MODIFIED | At-risk query, last attendance RPC, atRiskCount badge |
| `app/coach/members/page.tsx` | MODIFIED | At-Risk tab button with count badge, empty state |
| `components/coach/members/MemberCard.tsx` | MODIFIED | At-Risk badge, last attended display, formatLastAttended helper |
| `project-history/2026-02-18-session-138-push-fix-tv-display.md` | MODIFIED | Added step-by-step FCM fix instructions |

## Key Decisions
- At-risk = 0 attendance (not configurable threshold) — keeps it simple, coach uses timeframe dropdown to adjust sensitivity
- Client-side filtering after fetching all active members — simpler than server-side for current member count
- Separate `fetchAtRiskCount` runs on every tab/timeframe change so badge is always visible

## Database
- New RPC: `get_members_last_attendance(UUID[])` — must be run in Supabase SQL Editor

## Next Steps
- Remaining features: % calculator from athlete 1RM, badges/streaks
