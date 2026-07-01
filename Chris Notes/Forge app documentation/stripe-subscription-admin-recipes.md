# Stripe Subscription Admin — Recipes

Quick how-tos for managing athlete-app subscriptions directly in the **Stripe Dashboard**.
These are Dashboard-only changes — no code. The app's `subscriptions` table and
`athlete_subscription_end` sync automatically from the Stripe webhook after the change fires.

**Always check you're in LIVE mode** (top-right toggle, not "Test") before touching a real member.

Background: every athlete-app subscription runs a **30-day Stripe free trial** with the card
collected up front, then auto-bills. The **trial-end date is the lever** for "when do they first pay" —
Stripe won't let you edit a subscription's original start/created date once it exists.

---

## Recipe: Late subscriber → pull billing forward

**When:** an athlete subscribed later than they should have (e.g. a week late) and you want to
charge them as if they'd started on time — i.e. bring the first payment forward.

**Do:** move the **trial-end date earlier** by however many days they were late.

1. **Customers** → search the athlete → open them.
2. Under **Subscriptions**, click their active subscription.
3. **⋯ → Update subscription**.
4. **Free trial / trial end** field → set it to the current trial-end date **minus** the late days.
   - Example: trial currently ends **31 Jul** and they're 7 days late → set **24 Jul**.
   - If Stripe shows "next invoice on 30 Jul" instead, subtract from that (→ 23 Jul).
5. **Save / Update subscription**.

**Result:** the trial ends sooner, Stripe raises the first invoice on the new date and charges the
card on file. No proration, nothing else to touch.

**Sanity-check before saving:**
- Confirm a **payment method is attached** (subscription shows `•••• ####`). Our checkout always
  collects the card, so it should be — but if it's blank, the charge will fail at trial end.
- **Don't set the date to today or the past** unless you want Stripe to attempt the charge
  **immediately**.

---

## Related

- Fees per charge: `stripe-fees-athlete-app.md`
- Tier pricing: `2-tier-payment-plan.md`
