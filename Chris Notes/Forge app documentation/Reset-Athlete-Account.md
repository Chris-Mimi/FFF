# How to Reset an Athlete Account (Full Delete & Re-register)

Use this when you want to completely remove an athlete so they can register fresh.

---

## Steps (follow this exact order!)

### 0. Note down the member's ID first!
- Go to Table Editor > `members`
- Find the member by name or email
- **Copy their `id` (UUID)** — you'll need this to find related rows in other tables

### 1. Delete from `athlete_profiles` table
- Go to Table Editor > `athlete_profiles`
- Find the row where `user_id` matches the member ID you copied
- Delete the row
- **Skip this step if no row exists**

### 2. Delete from `subscriptions` table
- Go to Table Editor > `subscriptions`
- Find any rows where `member_id` or `stripe_customer_id` matches the member
- Delete them
- **Skip this step if no rows exist**

### 3. Delete from `members` table
- Go back to Table Editor > `members`
- Delete the member's row

### 4. Delete from Authentication
- Go to Supabase Dashboard > Authentication > Users
- Find the user by email
- Click the 3 dots > Delete user

---

## Important Notes

- **Order matters!** Delete in the order above (athlete_profiles > subscriptions > members > auth). Foreign key constraints may block deletion if you skip ahead.
- After completing all 4 steps, the person can register fresh at `https://app.the-forge-functional-fitness.de`
- This is a **full reset** — all their data (logs, results, lifts, achievements, reactions) will also be deleted if they had any.
- If the athlete had a Stripe subscription, you should also cancel it in the Stripe Dashboard to stop future billing.

---

## Alternative: Reset Subscription Only (Keep Member Record)

If you just want to reset their subscription status without deleting the account:

1. Go to `members` table > find the member
2. Clear these fields: `athlete_subscription_status`, `athlete_subscription_end`, `athlete_trial_start`, `stripe_customer_id`
3. Delete their row from `athlete_profiles` (if exists)
4. Delete their row from `subscriptions` (if exists)

They can then go through the Stripe checkout again without re-registering.
