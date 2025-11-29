  🚀 JANUARY LAUNCH PLAN (5 Weeks)

  Week 1: Security & Infrastructure (Dec 2-8)

  CRITICAL - Must Complete Before Beta

  Priority Tasks:
  1. RLS Policies (2 hours)
    - Execute remove-public-rls-policies.sql migration
    - Test with test account (verify data isolation)
    - Verify coach can't see other coach's data
  2. Path Fixes (30 min)
    - Update workflow-protocols.md lines 46-48 with Mimi's paths
    - Test Claude Code can read Memory Bank files
    - Document dual-user Git workflow in Memory Bank
  3. Environment Audit (1 hour)
    - Verify .env.local has all required keys
    - Document which env vars are optional (Google Calendar)
    - Create .env.example template for production
  4. Production Build (1 hour)
    - Run npm run build - verify zero errors
    - Fix any blocking issues
    - Run /code-cleanup for ESLint warnings

  Deliverable: Secure, buildable codebase ready for testing

  ---
  Week 2: Testing & Refinement (Dec 9-15)

  Priority Tasks:
  1. Browser Compatibility (3 hours)
    - Test Chrome, Firefox, Safari (desktop)
    - Test iOS Safari, Chrome Android (mobile)
    - Fix any layout/functionality breaks
    - Focus on booking flow + athlete pages
  2. End-to-End Flows (4 hours)
    - Member Registration: Signup → Coach approval → Trial activation
    - Booking Flow: Browse sessions → Book → Receive confirmation
    - Waitlist Flow: Full session → Waitlist → Auto-promotion
    - Workout Logging: Attend session → Log results → View in Records
    - 10-Card Flow: Purchase → Track usage → Auto-decrement
  3. Edge Cases (2 hours)
    - Cancel/rebook same session
    - Late cancel vs no-show marking
    - Capacity increase with waitlist
    - Multiple family members booking same session
  4. Data Cleanup (1 hour)
    - Delete test workouts from database
    - Remove test member accounts
    - Verify production database is clean

  Deliverable: Fully tested app with documented test results

  ---
  Week 3: Beta Launch (Dec 16-22)

  Soft Launch with 5-10 Real Members

  Priority Tasks:
  1. Deployment (3 hours)
    - Choose hosting (Vercel recommended for Next.js)
    - Deploy production build
    - Configure custom domain (if desired)
    - Test production environment
  2. Beta User Onboarding (2 hours)
    - Select 5-10 trusted members
    - Send invitation emails with instructions
    - Schedule onboarding call (optional)
    - Set expectations: "beta testing, bugs expected"
  3. Monitoring Setup (2 hours)
    - Create bug reporting channel (email/form/Discord)
    - Daily check-ins with beta users
    - Track issues in spreadsheet or GitHub Issues
    - Monitor Supabase dashboard for errors
  4. Support Availability (ongoing)
    - Be available for questions daily
    - Fix critical bugs within 24 hours
    - Document all reported issues

  Deliverable: Live app with real users providing feedback

  ---
  Week 4: Holiday Buffer & Bug Fixes (Dec 23-29)

  Christmas Week - Reduced Intensity

  Priority Tasks:
  1. Critical Bug Fixes (as needed)
    - Fix any blocking issues from beta
    - Prioritize booking/payment flows
    - Defer cosmetic issues to Week 5
  2. Holiday Schedule (1 hour)
    - Communicate reduced support availability
    - Set expectations with beta users
    - Pause new member invitations
  3. Documentation (2 hours)
    - Create user guide (how to book, log workouts)
    - FAQ document (common questions)
    - Admin guide for Chris (coach features)

  Deliverable: Stable beta with known issues documented

  ---
  Week 5: Final Polish & Go-Live (Dec 30-Jan 5)

  New Year Launch

  Priority Tasks:
  1. Final Testing (2 hours)
    - Re-test all critical flows
    - Verify bug fixes from Week 4
    - Check performance under load (10+ concurrent bookings)
  2. Member Communication (1 hour)
    - Email all members: "Launching Jan X"
    - Explain new features vs old system
    - Provide support contact info
  3. Public Launch (3 hours)
    - Open registration to all members
    - Announce on gym social media
    - Monitor first 24 hours closely
  4. Post-Launch Support (ongoing)
    - Daily monitoring for first week
    - Quick response to issues
    - Celebrate wins with team!

  Deliverable: Public launch with all members onboarded

  ---
  🎯 SUCCESS METRICS

  Week 1-2 (Pre-Beta):
  - ✅ All security migrations complete
  - ✅ Production build passes
  - ✅ 25/25 test cases passed (currently 22/25)

  Week 3-4 (Beta):
  - ✅ 5-10 beta users actively using app
  - ✅ <3 critical bugs reported
  - ✅ Booking flow works 100% of time

  Week 5 (Launch):
  - ✅ All members can register
  - ✅ All members can book sessions
  - ✅ Zero data loss incidents
  - ✅ Response time <500ms for all queries

  ---
  ⚠️ RISK MITIGATION

  Risk #1: Christmas Week Delays
  - Mitigation: Complete all critical work by Dec 22
  - Backup Plan: Delay launch to Jan 12 if needed

  Risk #2: Critical Bug During Beta
  - Mitigation: Keep beta group small (5-10 users)
  - Backup Plan: Rollback feature, continue with reduced functionality

  Risk #3: Dual-User Git Conflicts
  - Mitigation: Always git pull before work, never work simultaneously
  - Backup Plan: Create branches for large features

  Risk #4: Hosting Costs Unknown
  - Mitigation: Research Vercel/Railway pricing now
  - Backup Plan: Start with free tier, upgrade if needed

  ---
  💰 ESTIMATED COSTS (First Month)

  Hosting (Vercel):
  - Free tier: $0/month (likely sufficient for <100 members)
  - Pro tier: $20/month (if you exceed free limits)

  Supabase:
  - Free tier: $0/month (up to 500MB database)
  - Pro tier: $25/month (recommended for production)

  Stripe (if 10-card payments active):
  - 2.9% + €0.30 per transaction
  - Estimate: €5-20/month depending on sales

  Total Estimated: €0-65/month (start free, upgrade as needed)

  ---
  📝 RECOMMENDED NEXT ACTIONS (This Week)

  Immediate (Today/Tomorrow):
  1. Fix workflow-protocols.md paths (prevents my errors)
  2. Execute RLS policies migration (SECURITY CRITICAL)
  3. Run npm run build - verify current state

  This Week (Dec 2-8):
  1. Complete Week 1 checklist above
  2. Decide on hosting platform (Vercel vs Railway vs other)
  3. Create test plan document (what to test in Week 2)

  Decision Needed:
  - Stripe Integration: Is 10-card payment system going live in January? Or manual payment for now?
  - Google Calendar: Required for launch or optional?

  ---
  🤔 QUESTIONS FOR YOU

  1. Beta Users: Do you have 5-10 trusted members ready to test? Or should we recruit them Week 2?
  2. Payment System: Launch with Stripe 10-card payments, or manual payment tracking for now?
  3. Feature Scope: Any features from Session 24 "Optional" list you want before launch?
  4. Chris's Involvement: Is Chris available for testing/deployment Week 1-2? Or is this your project?
  5. Hosting Budget: Comfortable starting with free tiers and upgrading if needed?

  Back to January Launch - Your answers needed:

  1. Beta Users: Do you have 5-10 trusted members ready to test Week 2? Or recruit them?
  2. Payment System: Launch with Stripe 10-card payments active, or manual tracking for now?
  3. Feature Scope: Any "optional" features from Session 24 needed before launch?
  4. Chris's Availability: Is he handling deployment/technical setup, or is this your project?
  5. Hosting Budget: Comfortable starting free tier (Vercel/Supabase) and upgrading if needed?

> 1. yes 2. Explain this please. 3. Yes, there are still a few tweaks. 4. We'll do it together. 5. Yes 

⏺ Question 2: Payment System Explained

  What is the 10-card system?
  From your codebase, members can purchase a "10-card" (10 session pack):
  - Member buys 10 sessions upfront
  - Each booking decrements counter
  - Tracks "sessions used" vs "sessions remaining"
  - No-show and late cancel also decrement (sessions consumed)

  Two Launch Options:

  Option A: Stripe Integration Active (Full Automation)

  How it works:
  - Member clicks "Buy 10-Card" on athlete page
  - Redirects to Stripe checkout (credit card payment)
  - Payment processes automatically
  - 10-card counter activates in database
  - Member can immediately book sessions

  Pros:
  - ✅ Fully automated (no manual work)
  - ✅ Professional payment experience
  - ✅ Stripe handles receipts/invoices

  Cons:
  - ❌ Stripe setup required (1-2 days)
  - ❌ Testing needed before launch
  - ❌ 2.9% + €0.30 per transaction fee

  Setup tasks:
  - Create Stripe account
  - Add payment UI to athlete page
  - Test checkout flow
  - Configure webhook for payment confirmations

  ---
  Option B: Manual Tracking (Launch Faster)

  How it works:
  - Members pay you directly (bank transfer, cash, in-person)
  - You manually activate 10-card in database (via Supabase dashboard)
  - Member can then book sessions
  - Counter still tracks usage automatically

  Pros:
  - ✅ Launch immediately (no Stripe setup)
  - ✅ No transaction fees
  - ✅ Simpler for small beta group

  Cons:
  - ❌ Manual work for each purchase
  - ❌ Less professional experience
  - ❌ No automatic receipts

  How you'd do it:
  1. Member sends payment (bank transfer)
  2. You log into Supabase dashboard
  3. Update members table: ten_card_sessions_total = 10
  4. Member can now book

  ---
  My Recommendation for January Launch:

  Phase 1 (Beta - Week 3): Manual Tracking
  - Beta users (5-10 members) can test booking system
  - You manually activate their 10-cards
  - Focus testing on booking/attendance, not payments

  Phase 2 (Public Launch - Week 5): Stripe Active
  - Set up Stripe during Week 3-4
  - Test with beta users before public launch
  - All new members use automated payment

  This splits the risk: Test booking system first, add payments once proven stable.

  ---
  Question 3: Feature Tweaks

  What tweaks do you need before launch?

  From Session 24 optional list:
  - Movement type badges in Analysis search?
  - Time range filtering for lifts/benchmarks?
  - Variable rep display formatting?
  - Something else?

  Or non-Analysis features:
  - Member onboarding flow improvements?
  - Email notifications for bookings?
  - Coach approval workflow tweaks?

  Tell me your top 3 priority tweaks and I'll estimate time/complexity.