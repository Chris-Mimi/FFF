# Stripe → Bank Reconciliation Guide

**Goal:** get an itemised Stripe bill that matches what actually landed in the bank.

**Key fact:** each deposit in your bank statement = **one Stripe payout**. So the
cleanest way to reconcile is payout-by-payout — open the payout, export its
contents, and its net total matches the bank deposit to the cent.

---

## Option A — Itemised per payout (the true bank match) ✅ recommended

Use this to tie each bank deposit to its exact contents.

1. Stripe Dashboard → **Balance** (or **Transactions → Payouts**) in the left menu.
2. Find the payout whose amount matches the deposit on your bank statement.
3. Click it. Stripe shows **every charge, refund, and fee** that makes up that
   payout.
4. Top-right **Export** → CSV. Each row shows **gross, Stripe fee, net**. The
   sum of the net column = the bank deposit.

Repeat for each bank line in the month. Done.

---

## Option B — Itemised per month (one file for the whole month)

If you'd rather have a single monthly file instead of one per deposit.

1. Stripe Dashboard → **Reports** → **Reconciliation** (aka *Payout reconciliation*).
2. Set the date range to the month (e.g. 01–31 July).
3. **Download** → CSV/PDF listing every payout in that month with each
   transaction and fee itemised.

⚠️ **Why this won't exactly match a calendar month at the bank:** a Stripe payout
takes ~2 business days to reach the bank. So charges near the end of a month pay
out in early next month. The *report* groups by payout date; your *bank* sees the
deposit ~2 days later. For a to-the-cent bank match, use **Option A**.

---

## Quick monthly routine

1. Open your bank statement for the month.
2. For each Stripe deposit line → Balance → open that payout → **Export** CSV.
3. Save the CSVs together (e.g. a `Stripe reconciliation/2026-07/` folder).
4. Each CSV's net total should equal its matching bank deposit.

---

## Notes

- **Gross vs net:** athletes are charged the gross amount; Stripe deducts its fee;
  the **net** is what's paid out. The bank only ever sees the net.
- **Refunds** appear as negative rows inside the payout that absorbed them.
- **Wellpass** is billed externally (not through Stripe), so it never appears in
  these payouts — see the Wellpass Excel import for that side.
- No Stripe Dashboard access is needed from the app; this is all done directly in
  the Stripe Dashboard.
