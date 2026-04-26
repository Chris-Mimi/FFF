# Deployment Cost — Post-Launch Reality

**Originally estimated:** 2026-02-06
**Revised post-launch:** 2026-04-24 (Session 313)
**Context:** CrossFit gym app, ~50-100 members, 1-2 coaches, live in production.

> **Revision note:** original estimate assumed "50 members × €50/mo = €2,500 revenue" → Stripe fees of ~€47.50/mo. That revenue model was wrong — class bookings are free for members, and only Forge/Wellpass app subscriptions run through Stripe. Corrected below.

---

## Business Model (as launched — Session 270)

| Tier | Price | Notes |
|:-----|:------|:------|
| Gym membership (class booking) | Free through the app | Members pay their gym subscription outside the app |
| 10-Card | €150 / 10 sessions | Handled **outside** the app |
| Forge Athlete App | €8/mo or €80/yr | Logbook, records, leaderboards, achievements |
| Wellpass tier | €10/mo or €100/yr | Same features for Wellpass members |

**Implication:** Stripe revenue is driven by Forge/Wellpass subscribers only — not by total member count.

---

## Service Pricing Breakdown

### Vercel (Next.js Hosting)

| Tier | Cost | Key Limits |
|:-----|:-----|:-----------|
| **Free (Hobby)** | €0/month | 100 GB bandwidth, 150K function calls, solo only |
| **Pro** | €20/user/month | 1 TB bandwidth, 1M function calls, team features |

**Verdict:** Free tier is sufficient at our scale. Pro only useful for team collaboration.

### Supabase (Database + Auth)

| Tier | Cost | Key Limits |
|:-----|:-----|:-----------|
| **Free** | €0/month | 500 MB storage, 50K MAU, **auto-pauses after 7 days inactivity** |
| **Pro** | €25/month | 8 GB storage, 100K MAU, no auto-pause, daily backups |

**Verdict:** Pro is required in production — Free tier auto-pauses, which would break the app on quiet days.

### Resend (Transactional Email) — not in original estimate

| Tier | Cost | Key Limits |
|:-----|:-----|:-----------|
| **Free** | €0/month | 100 emails/day, 3,000/month, 1 custom domain |
| **Pro** | ~€18/month ($20) | 50,000 emails/month |

**Usage today:** password resets + booking notifications. Comfortably under the free tier at ~50-100 members.

**When Pro becomes needed:** bulk "session cancelled" notifications, member reminders, or marketing blasts that push over 100/day.

### Stripe (Payment Processing)

| Fee Type | Rate |
|:---------|:-----|
| European cards | 1.4% + €0.25 per transaction |
| International cards | +1% additional |
| SEPA Direct Debit | 0.8% + €0.30 (cheaper alternative) |

**Actual fees at launch (illustrative):**
- 20 Forge subscribers × €8/mo = €160 revenue → fees ~€7/mo
- Scales linearly with paying subscribers, not member count.

### Google Calendar API
- **Cost:** FREE (no billing regardless of usage).

### Web Push (notifications)
- **Cost:** FREE. Uses browser-native push protocol (VAPID keys), no SaaS layer.

### Domain (.de)
- **Cost:** €15-20/year (~€1.50/month).

---

## Monthly Cost Scenarios

### Post-launch reality (small scale)

Assumes 10-20 Forge/Wellpass subscribers, ~100 total members.

| Service | Cost | Notes |
|:--------|:-----|:------|
| Vercel Free | €0 | Well under traffic limits |
| Supabase Pro | €25 | Required (no auto-pause) |
| Resend Free | €0 | Under 100 emails/day |
| Stripe fees | €3–8 | Scales with paying subscribers |
| Google Calendar | €0 | |
| Web Push | €0 | |
| Domain (.de) | €1.50 | |
| **TOTAL** | **~€30–35/month** | **Production-ready, current reality** |

### Mid-scale (growth scenario)

Assumes 50 paying subscribers, occasional bulk email.

| Service | Cost | Notes |
|:--------|:-----|:------|
| Vercel Free | €0 | Still sufficient |
| Supabase Pro | €25 | |
| Resend Pro | ~€18 | If bulk notifications push over free tier |
| Stripe fees | ~€15 | 50 × €8 = €400 rev |
| Google Calendar | €0 | |
| Domain (.de) | €1.50 | |
| **TOTAL** | **~€60/month** | |

### Team features (optional)

Adds Vercel Pro for team collaboration — only if two people need dashboard access.

| Service | Cost | Notes |
|:--------|:-----|:------|
| Vercel Pro | €20 | Team collaboration |
| Supabase Pro | €25 | |
| Resend | €0–18 | Depending on volume |
| Stripe fees | €3–15 | |
| Domain (.de) | €1.50 | |
| **TOTAL** | **~€50–80/month** | |

---

## Unit Economics (key insight)

**Break-even on infrastructure ≈ 4–5 paying Forge subscribers.**

- Fixed infra cost: €26.50/mo (Supabase Pro + domain)
- Revenue per Forge sub @ €8/mo, minus Stripe fees (~€0.36): ~€7.64/mo net
- 4 subs × €7.64 ≈ €30.56/mo → covers Supabase + domain
- Every subscriber beyond that is margin.

The app is cheap to run. Revenue concentration risk is low because per-user cost is low and per-user revenue is direct.

---

## Uncovered Risks (no monthly cost today, but worth flagging)

1. **Offsite disaster recovery.** Local JSON backups via `scripts/backup-database.ts` live on Synology. `backups/` is gitignored. If the Mac + Synology both fail, the only copy of the DB is Supabase itself. Supabase Pro includes daily managed backups, so this is mitigated — but worth knowing the local backups are not an offsite layer.
2. **No error tracking.** No Sentry / LogRocket. Silent production errors are only surfaced by user reports. If adoption grows, budget ~€25/mo for Sentry Team or similar.
3. **No uptime monitoring.** A Vercel outage or Supabase hiccup is only noticed by users. UptimeRobot free tier (50 monitors, 5-min checks) would cover this at €0/mo if you want visibility.

---

## Key Takeaways (revised)

1. **Real monthly cost at launch: ~€30–35** — roughly half the original €74 estimate.
2. **Fixed cost floor: €26.50/mo** (Supabase Pro + domain). Everything else scales.
3. **Break-even ≈ 4–5 paying Forge subscribers.** Unit economics are healthy.
4. **Supabase Free auto-pauses** — Pro is non-negotiable.
5. **Resend free tier is sufficient today** but is the next line item likely to hit paid (~€18/mo) if notification volume grows.
6. **Google Calendar, Web Push, Vercel Free** remain €0 with plenty of headroom.
7. **Original estimate overstated Stripe fees by ~10× because the revenue model was wrong.**

---

## Scaling Notes

- At 100 Forge subscribers @ €8/mo: revenue €800/mo, Stripe fees ~€30/mo, total infra ~€80/mo. Gross margin ~88%.
- Supabase Pro 8 GB storage is more than enough for years at this scale.
- Vercel Free 100 GB bandwidth handles thousands of daily users.
- First cost threshold likely to break: Resend free tier (3k emails/month) if booking-related notifications become frequent.
