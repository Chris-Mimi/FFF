# Session 337 — 10-card chip real-world polish (Frieda test: card total + full/near-full messages + mismatch tooltip rewording)

**Date:** 2026-05-06 (Opus 4.7)

**Trigger:** Chris tested the S336 10-card chip work against Frieda Stromer (Crossfit Kids, 5-card, pre-app card holder — the exact "edge case" the ⚠ glyph was designed to surface). Three UI bugs immediately emerged:

1. Chip showed `0/10` when Frieda's card is a 5-card and her counter was set to 5/5.
2. Modal said "Next session will complete this card" at 5/5 — but it's already complete.
3. Tooltip read "counter manually set to 5/10 — actual bookings show 2 past + 0 upcoming" — implied Chris set 5 directly, when he actually set the counter to 3 and the +2 came from real bookings he later manually inserted.

All three are bugs from S336 that no synthetic test caught. Real-world testing immediately surfaced them.

---

## 1. Chip uses `member.ten_card_total ?? 10`

[components/coach/members/MemberCard.tsx](components/coach/members/MemberCard.tsx). Replaces hardcoded `/10` everywhere it appeared in the chip + tooltip + threshold logic. Frieda's 5-card now shows `5/5` (or `4/5`, etc.). Future-proof for any card size. Red background also moved from `counter >= 9` to `counter >= total - 1` so 5-cards turn red at 4/5 instead of never (since they max at 5).

---

## 2. Mismatch chip shows the counter, not the split

The S336 design was: when counter doesn't match real bookings, show the actuals (`past+upcoming`) so the discrepancy is visible. Practically this hid the override — for Frieda set to 5/5 with no actual bookings, chip read `0+0/5 ⚠`. The "0+0" feels like the chip is broken even though the ⚠ flags the override.

Chris's framing: "I want the modal and chip to reflect the reality of the situation. If I (or Mimi) have manually overridden the amount of sessions used, there will be a reason. The chip should reflect what is actually going on."

Reality for an override: the counter IS the truth (since the bookings can't be reconstructed for pre-app sessions). So:

| Case | Counter | Past | Upcoming | Mismatch? | Display |
|:---|:---:|:---:|:---:|:---:|:---|
| David (S336) | 7 | 5 | 2 | No | `5+2/10` |
| Future booked, no past | 2 | 0 | 2 | No | `0+2/10` |
| Standard, all past | 5 | 5 | 0 | No | `5/10` |
| Frieda (override) | 5 | 0 | 0 | Yes | `5/5 ⚠` |
| Rosita (override + bookings) | 10 | 6 | 1 | Yes | `10/10 ⚠` |
| Frieda's intended setup | 3 | 2 | 0 | Yes | `5/10 ⚠` (counter went up to 5 from the 2 manual bookings) |

When matched: chip shows the split when there are upcoming bookings (David's case), else just the count.
When mismatched: chip mirrors the counter — that's the coach's recorded truth; the ⚠ glyph + tooltip explain the divergence.

---

## 3. Modal full vs near-full message split

[components/coach/TenCardModal.tsx](components/coach/TenCardModal.tsx). Old logic: `isNearExpiry = sessionsUsed >= total - 1` triggered the same message at both 4/5 and 5/5. At 5/5 it incorrectly said "Next session will complete this card" — the card is already complete.

Split into two cases:

```ts
const isFull = sessionsUsed >= tenCardTotal;
const isOneAwayFromFull = sessionsUsed === tenCardTotal - 1;
```

- `isFull` → "Card is full — issue a new card before next booking"
- `isOneAwayFromFull` → "Next session will complete this card" (original copy)
- Below threshold → no warning text

---

## 4. Mismatch tooltip rewording

Old tooltip: "10-card: counter manually set to 5/10 — actual bookings show 2 past + 0 upcoming = 2."

This implied Chris had set the counter to 5 directly. He hadn't — he set it to 3 (representing 3 pre-app sessions Frieda used outside the system), and the system added +2 when he booked her 2 actual sessions retroactively. So the 5 = 3 manual + 2 real.

New tooltip explains the split:

```
10-card: 5/10 used. 2 from recorded bookings (2 past + 0 upcoming) +
3 manually added (e.g. pre-app sessions). Click to manage.
```

The arithmetic `(counter - actual) = manually added` is explicit. When `counter < actual` (rare, e.g. coach set counter too low), the tooltip suggests Recalc instead.

---

## Process moments worth remembering

- **Asked clarifying questions before coding.** Chris's message had both "don't write anything to code" and a chip-vs-modal complaint. Resolved by asking — "don't write code" meant "no transient launch-only mitigation code", not "no fixes". Saved building in the wrong direction.
- **Three bugs bundled into one commit.** All surfaced from one Frieda test session. Single commit, single test pass; no value in splitting.
- **Real-world testing > theoretical correctness.** S336 looked clean in TS + production build, but the Frieda 5-card test caught three issues immediately. Synthetic tests would not have caught the hardcoded `/10` because no synthetic test exercises the 5-card path.
- **Override semantics: counter = coach intent, actual = real bookings.** Both have value. The chip now defaults to coach intent (with ⚠ on divergence) which matches Chris's mental model: "if I overrode it, I had a reason — show me what I set, then warn me if reality differs."

---

## Files touched

| File | Change |
|:---|:---|
| `components/coach/members/MemberCard.tsx` | Use `ten_card_total ?? 10`; mismatch chip mirrors counter; tooltip explains split between recorded bookings and manually-added |
| `components/coach/TenCardModal.tsx` | Full vs near-full message distinction |
| `memory-bank/memory-bank-activeContext.md` | Version 199, S337 entry, kickoff updated to reflect new override flow, S332 rotated to history, 2 new landmines |

TS clean. Production build passes.
