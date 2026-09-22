# Session 411 — 2026-09-22 (Opus 5)

**"100%+" lift option · 10-card chip in Session Management · week 33.2 scores ·
whiteboard tooling · a search bug that hid every punctuation query.**
8 commits, all pushed, tsc + lint + build clean.

---

## 1. "100%+" on lift percentages (`bdf9922`, `cdaf05f`)

Chris wanted `100%+` on the whiteboard — a percentage that reads as a floor, not
a target. His actual question was whether it would disturb how percentages are
calculated for athletes.

**The answer that mattered:** there is exactly **one** calculation anywhere. The
athlete Logbook multiplies the % by their best 1RM to suggest a weight in
brackets ([AthletePageLogbookTab.tsx:569-571](../components/athlete/AthletePageLogbookTab.tsx#L569-L571)).
Everywhere else — whiteboard, TV, publish, calendar — the percentage is pure
text. Nothing else consumes it, so adding a "+" variant was display-only.

**Shipped:** a `+` toggle beside the % box, and per set in the variable-reps
table (Wendler-style waves: `5-3-1 @ 75%-85%-95%+`). Stored as a separate
`percentage_plus` boolean so the number itself can't be corrupted. No migration
— it lives in the section's existing JSON alongside `scaling_option`.

**Notation choice:** on variable sets where one set has a `+`, each value gets
its own sign (`75%-85%-95%+`) so the plus can't be misread as applying to the
whole wave. Constant mode uses Chris's own notation, `100%+`.

**Consolidated five near-identical copies** of the lift formatter into
`formatPercent`/`formatPercentList` in [utils/logbook/formatters.ts](../utils/logbook/formatters.ts).
They had already drifted — the publish preview handled undefined sets
differently — and the new flag would otherwise have needed the same edit six
times. `/tv/[id]` and SearchPanel already used the shared one, so they came
along free.

**Reverted my own scope creep (`cdaf05f`).** I raised the spinner `max` 120→200
unasked. Chris challenged it; it was unjustified. `max` only limits the arrows
here (no validating form), so 120 was a loose typo guard and widening it bought
nothing. Put back.

## 2. 10-card usage always visible in Session Management (`b9dd4d8`)

Parents ask at the desk how many sessions their kid has used; answering meant
leaving the modal for the Members page. Booking rows now carry a `used/total`
chip for every 10-card athlete, not just the low-card warnings.

- Family-shared cards get a link icon + tooltip — the Neumann siblings correctly
  show **one** shared `8/10`, not two separate counts.
- Existing `2 left` / `1 left` / `Card full` / `Over by N` warnings unchanged;
  the chip goes white-on-tint when one fires so it stays readable on red.

**The non-obvious part.** The old code only surfaced card state when the session
fell inside the card's known date window. **22 of 68 active own-card holders have
no `ten_card_purchase_date`** (the paper-card carry-overs) — a comparison against
a missing date can never be true, so those 22 showed *nothing*. Where no date
exists, the window now falls back to "today onwards": the live counter is correct
for sessions that haven't happened yet. Past sessions stay unlabelled either way
— today's counter beside a months-old booking would imply a count that wasn't in
force then, and the counter keeps no history.

Verified live: all 12 ten_card bookings on upcoming sessions now show a chip,
including Nora Gregorio-Mölzer (no purchase date).

## 3. Week 33.2 — 16.08 10:00 TGU metcon, 10 rows (`5454914`)

Board `2026 Week 33.2`, lower block. **10/10 names resolved 1:1 against the
session's confirmed bookings**, no strays either way — which is what makes the
pairing provable despite the usual upward drift of the score columns.

MetCon, no `lifts[]` → **WSR only, no lift_records**. Parity stayed clean at
908/908.

Board carried 6 scored columns against 5 enabled fields, so the script switched
on `scaling_3` (Toes to Rings) and `track` (the `Trk2` marks). Chris explicitly
endorsed that initiative — see §4.

**Misread:** Gloria's TGU read as 6kg, actually **8**. Chris: "clearly 2 loops
even though the bottom one is not joined." I had anchored on Anna's closed
figure-8 as the reference. **The reliable test is stroke count — two loops
however joined — not whether the bottom closes.**

## 4. Protocol change: write first, report after (`fab5d80`)

Chris, twice: *"Every time there is ambiguity I can easily correct it manually,
so don't ask, simply inform me what you're unsure of."* And after I stopped
mid-task to fix one cell: *"I can correct that in 20 seconds manually… your job
is to save me time."*

`memory-bank/whiteboard-score-entry-protocol.md` step 3 rewritten. Never block on
a digit. **Safe enabling changes — switching a scoring field ON so a board column
has somewhere to land — are mine to make without asking.** He called that out
unprompted as the kind of initiative he wants. Destructive/irreversible still
needs asking; the S240 rule is untouched.

Auto-memory: `feedback_inform_dont_ask_on_data_ambiguity.md`, with an explicit
boundary against `feedback_ask_when_unsure` (ask about the *task*, never about a
*digit*).

## 5. Whiteboard tooling — preflight + generic writer (`b0fa261`)

Per-board work was ~2/3 setup: five ad-hoc queries, then a bespoke ~190-line
script each time.

- **`scripts/whiteboard-preflight.ts <date> [time] [--photos]`** — one read-only
  command: session + WOD ids, every section with id/fields/body, scored-row
  counts, publish state, confirmed bookings **with gender** (needed for W/M
  tiers), and who is *not* confirmed. Accepts `2026-08-16` or `16.08.26`.
- **`scripts/enter-whiteboard-scores.ts <board.json> [--commit]`** — board files
  use the real WSR column names, so there is no mapping layer to get wrong.
  Encodes every landmine once: booking-only name resolution (1:1 or it throws),
  the `-content-0` suffix, `publish_sections` unioned never replaced, missing
  fields switched on, paired `lift_records` for RM sections, and a
  skip-if-already-scored guard.

**That guard is the point for Chris:** he can enter sessions in the app while a
board is mid-flight and the script skips those athletes rather than duplicating
them. Tested three ways — preflight resolves 15.08 Endurance 6/6; the writer's
dry run against the already-entered 16.08 skips all 10; an unbooked name aborts
and prints the booking list.

## 6. Track conventions (`ad7b336`)

Chris: an unmarked athlete on a board that marks **any** `Trk2` is **Track 1** —
he only writes the exception.

**Filling those blanks in is not cosmetic.** `leaderboard-utils.ts:380-382`
compares track *before* scaling and treats a missing track as `4`, so a
half-filled column ranks the unmarked athletes below everyone marked for no
reason they earned. Either the whole session has tracks or none does.

Also recorded: `scoring_fields.track` gates the modal's 1/2/3 buttons but **not**
the save route — `maskRecord` masks `weight_result` 1-3 and `scaling_level` 1-3
and never `track`. So a script-written track value lands in the DB and skews the
leaderboard while staying invisible to the coach. **A refresh does not reveal it;
the field must be enabled.** Same silent-half-failure shape as `-content-0` and
`publish_sections`.

## 7. 🐛 Search: any query starting with punctuation matched nothing (`849a7dd`)

`Endurance` found "Endurance #26.1"; **`#26.` found nothing.**

Both search boxes prefixed the query with `\b`. But `\b` only matches where a
word char meets a non-word char, so `\b#` needs a **word character immediately
before the `#`** — and in real text the `#` follows a space or starts the string.
The boundary never exists, so the query can never match.

Wider than `#`: it also killed `(6/9kg)`, `-Ups`, and **any German term starting
with an umlaut** — JS `\w` is ASCII-only, so `Ü` is non-word too. That one was
silently broken for a bilingual app.

Fix: apply the boundary only on a side where it can mean something, via a shared
[utils/search-pattern.ts](../utils/search-pattern.ts). The Movement Library popup
had its own copy of the identical buggy matcher — two copies is how it stayed
broken in two places. 11 cases tested both directions: `Ring` still refuses to
match mid-word, trailing-space exact mode still rejects prefixes.

---

## Carry-overs

- **Five athlete-facing changes ship on the next Vercel deploy:** `100%+`, the
  10-card chip, the search fix, the S410 history search, the whole-metres input.
- **15.08 Endurance block is transcribed-ready but not entered** — same photo,
  6 confirmed bookings, section fields already on, 0 scores. First real customer
  for the new tools.
- **Deleting a session still notifies nobody** (S410) — Chris's call, unbuilt.
- **`notification_log` held only 4 of 12 bookings** for that deleted session.
- Open decision: unpublish still clears `publish_sections`.
- The S402–S408 verification backlog is **still parked**.
