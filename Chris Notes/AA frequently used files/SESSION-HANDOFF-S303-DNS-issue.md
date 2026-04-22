# Session Handoff — S303 + DNS Troubleshooting

**Created:** 2026-04-22
**Purpose:** If Mac/Claude restarts, point next Claude at this file so no context is lost.

---

## A. S303 state (exercise acronym cleanup) — INCOMPLETE

**Background:** S302 (already committed `aeaa534` + `4720019`) surfaced the bug that "Barbell Bench Press (BP)" doesn't match "Bench Press" extracted from a WOD, so Movement Tracking misses it. Same class of bug for every exercise with a parenthetical acronym suffix.

**Decision:** Strip acronym from `exercises.display_name` for 24 confirmed lifts + `(DUs)` + `(SUs)` = 26 rows. Preserve acronym-search by appending lowercased acronym to `tags[]` (since `search_vector` is rebuilt from `name + category + subcategory + tags`). Two `(SU)` Squat-University rows get a `squat-university` tag added but keep their display name.

**SQL is saved and ready to run:**
→ `database/20260422_session303_strip_acronym_suffixes.sql`

**Run order:**
1. Chris pastes that SQL into Supabase SQL Editor
2. Step 3 (verify) should return **0 rows**
3. Chris reports back "clean"
4. Claude then edits `utils/movement-extraction.ts:28-90` to remove the now-redundant `genericToCanonical` entries (`(pp)`, `(pj)`, `(hpc)`, `(c&j)`, `(fs)`, `(ohs)`, `(sp)`, `(dus)`, `(bp)`, etc.)
5. Commit as session-303

**Git state:** main clean except `Chris Notes/AA frequently used files/Notes for next session.md` (unrelated note about Mimi iPhone copy/paste).

**Previous transcript with full categorization:** `~/.claude/projects/-Users-chrishiles-SynologyDrive-CrossFit-Hammerschmiede--CFH--AI-Development-forge-functional-fitness/30f86921-c7dd-490b-bec5-4806ecdf8cc9.jsonl`

---

## B. DNS / IPv6-only issue (today, 2026-04-22)

**Root cause:** ISP (Deutsche Telekom, `2003:d1:…` IPv6 range) gave an IPv6-only lease today — no IPv4 address. Router's NAT64/DNS64 translator is broken/disabled, so IPv4-only sites (GitHub, Vercel, Supabase, Resend) are unreachable. Google works because it's full IPv6.

**Diagnostics run so far:**

```
scutil --nwi
```
→ `No IPv4 states found`. Only IPv6: `2003:d1:9711:b34e:14fc:10d:6b7a:3678`.

```
dig github.com +short              → 140.82.121.4 (works intermittently)
dig @1.1.1.1 github.com +short     → times out (no IPv4 connectivity)
curl https://github.com            → Could not resolve host
scutil --dns | grep nameserver     → only fe80::1%en0 (router IPv6 link-local)
ipconfig getoption en0 router      → (empty — no IPv4 gateway)
```

Chrome fails even in **incognito** → not a profile/cache issue.

**Key pattern:** Google search works, pages linked from search work, but typing `github.com` / `vercel.com` / `supabase.com` directly fails. That's the classic IPv6-only + missing NAT64 signature.

---

## C. Fix plan — in order

1. **Full router power-cycle** (Chris will do this now):
   - Unplug power for **30 full seconds** (his first attempt was only a few seconds — not enough)
   - Plug back in, wait 2-3 min for lights to settle
   - Test: `curl https://github.com -I` (should return HTTP response)
   - Re-check: `scutil --nwi` should now show an IPv4 address

2. **If still broken → iPhone hotspot** (immediate unblock):
   - iPhone → Settings → Personal Hotspot → toggle on
   - Mac WiFi menu → connect to iPhone
   - GitHub/Supabase/etc. will work immediately
   - He can keep working on Forge this way

3. **If stays broken on home WiFi → ISP line fault**:
   - Contact Deutsche Telekom: *"IPv4 ist nicht verfügbar, nur IPv6 funktioniert. Bitte Line prüfen."*
   - DS-Lite outages are a known German-ISP pain; they can reset from their end

---

## D. What Claude should do when this session resumes

1. Read this file
2. Confirm working tree status with `git status`
3. Ask Chris which fix worked (router power-cycle, hotspot, or ISP)
4. If DNS is back → ask if he wants to run the S303 SQL now
5. After SQL confirmed clean → do the `utils/movement-extraction.ts` code edit + commit as S303

**Do not** re-generate the SQL — it's already at `database/20260422_session303_strip_acronym_suffixes.sql`.
