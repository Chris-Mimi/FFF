# Deployment Cost Estimate

**Created:** 2026-02-06
**Context:** CrossFit gym app, ~50-100 members, 1-2 coaches, ~500-1000 page views/day

---

## Service Pricing Breakdown

### Vercel (Next.js Hosting)

| Tier | Cost | Key Limits |
|:-----|:-----|:-----------|
| **Free (Hobby)** | €0/month | 100 GB bandwidth, 150K function calls, solo only |
| **Pro** | €20/user/month | 1 TB bandwidth, 1M function calls, team features |

**Verdict:** Free tier is sufficient for our traffic. Pro only needed for team collaboration.

### Supabase (Database + Auth)

| Tier | Cost | Key Limits |
|:-----|:-----|:-----------|
| **Free** | €0/month | 500 MB storage, 50K MAU, **auto-pauses after 7 days inactivity** |
| **Pro** | €25/month | 8 GB storage, 100K MAU, no auto-pause, spend caps |

**Verdict:** Pro required for production — free tier auto-pauses the database.

### Stripe (Payment Processing)

| Fee Type | Rate |
|:---------|:-----|
| European cards | 1.4% + €0.25 per transaction |
| International cards | +1% additional |
| SEPA Direct Debit | 0.8% + €0.30 (cheaper alternative) |

**Example fees (50 members @ €50/month):**
- Revenue: €2,500/month
- Stripe fees: ~€47.50/month (~1.9%)

### Google Calendar API
- **Cost:** FREE (no billing regardless of usage)

### Domain (.de)
- **Cost:** €15-20/year (~€1.50/month)

---

## Monthly Cost Scenarios

### Minimal (NOT production-ready)

| Service | Cost | Notes |
|:--------|:-----|:------|
| Vercel Free | €0 | Sufficient for traffic |
| Supabase Free | €0 | **Auto-pauses after 7 days!** |
| Stripe fees | ~€47.50 | 50 members x €50 |
| Google Calendar | €0 | Free |
| Domain (.de) | ~€1.50 | |
| **TOTAL** | **~€49/month** | **Not suitable for production** |

### Production (Recommended)

| Service | Cost | Notes |
|:--------|:-----|:------|
| Vercel Free | €0 | Upgrade to Pro only if needed |
| Supabase Pro | €25 | No auto-pause |
| Stripe fees | ~€47.50 | 50 members x €50 |
| Google Calendar | €0 | Free |
| Domain (.de) | ~€1.50 | |
| **TOTAL** | **~€74/month** | **Production-ready** |

### Production + Team Features

| Service | Cost | Notes |
|:--------|:-----|:------|
| Vercel Pro | €20 | Team collaboration |
| Supabase Pro | €25 | No auto-pause |
| Stripe fees | ~€47.50 | 50 members x €50 |
| Google Calendar | €0 | Free |
| Domain (.de) | ~€1.50 | |
| **TOTAL** | **~€94/month** | **Full team features** |

---

## Key Takeaways

1. **Fixed hosting cost: €25-45/month** (Supabase Pro + optional Vercel Pro)
2. **Stripe fees scale with revenue** — biggest variable cost
3. **Supabase Free auto-pauses** — not viable for production
4. **Vercel Free handles our traffic easily** (500-1000 views/day)
5. **Google Calendar API is free** — no concerns
6. **SEPA Direct Debit** could reduce Stripe fees (0.8% vs 1.4%)

---

## Scaling Notes

- At 100 members @ €50/month: Stripe fees ~€95/month, total ~€122/month
- Supabase Pro 8 GB storage is more than enough for years
- Vercel Free 100 GB bandwidth handles thousands of daily users
