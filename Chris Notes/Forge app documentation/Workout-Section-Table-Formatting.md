# Formatting tables in a workout section

*How to use the **"Keep table layout (monospace)"** checkbox in the Create/Edit Workout modal.*

---

## The one thing to understand first

**The checkbox only changes the font.** Your spaces and line breaks are kept exactly as you
typed them on every display surface whether it's ticked or not.

What ticking it buys is **equal character widths** — and that is the only reason a
space-padded column can line up.

### The trap it exists to catch

The text box you type into is **always** monospace. So a table you build there looks
perfectly aligned *while you're writing it*, even with the checkbox unticked — and then
collapses into a mess on the calendar and the gym screen.

That's why a small **"Preview (calendar / screen)"** panel appears under the box whenever your
text looks tabular (or the box is ticked). **That preview is the truth. The editor is not.**

---

## What you can do

### Space-padded columns
The workhorse. Pad with spaces until things line up in the preview.

```
Week  Sets  Reps  %1RM
  1     5     5    70
  2     5     5    75
  3     5     3    80
```

### Scaling / tier grids
Probably the most useful one for programming.

```
        Rx    Sc1   Sc2
Men    43kg  34kg  24kg
Women  30kg  24kg  16kg
```

### Pipe tables with a rule
Use `-` for the divider line.

```
Round | Cal | KB   | Box
------|-----|------|----
  1   | 20  | 24kg | 30
  2   | 15  | 24kg | 25
```

### Right-aligned numbers
Pad on the **left** so the digits line up:

```
Run     400m
Row    1000m
Bike   2000m
```

### Framed tables
Use `|`, `-` and `+` — all on your keyboard.

```
+-------+-----+------+
| Round | Cal | KB   |
+-------+-----+------+
|   1   | 20  | 24kg |
|   2   | 15  | 24kg |
+-------+-----+------+
```

### Bars and intensity scales
Use `#` and `.` inside brackets.

```
Set 1  [########..]  80%
Set 2  [#########.]  90%
```

> **Stick to ordinary keyboard characters.** It's tempting to reach for the prettier
> box-drawing (`┌ ─ ┬ ┐ │`) or block (`█ ▓ ▒ ░`) characters. **They don't work here.**
> The app's fixed-width font (Geist Mono) is loaded with the Latin character set only,
> which doesn't include them — so the browser quietly swaps in a different font just for
> those characters, at a different width, and your columns drift apart. That's the exact
> problem you were trying to avoid. Anything you can type directly on the keyboard is
> safe; anything you had to hunt for in a symbol picker probably isn't.

---

## Two rules to stay inside

### 1. Never use Tab characters — use spaces

The app doesn't set a tab width, so browsers fall back to an 8-column tab stop. Any cell
of 8 or more characters jumps to the next stop and the whole column breaks.

You can't type a Tab in the field anyway (it jumps to the next control), so tabs only ever
arrive by **pasting from Excel or Google Sheets**. If you paste from a spreadsheet,
convert the tabs to spaces first, or just retype the spacing.

### 2. Keep lines under about 30 characters

This is the real constraint — not the font. Every surface wraps long lines, and a wrapped
row loses its alignment completely.

Narrowest to widest:

| Where | Room |
|:---|:---|
| **Calendar day cell** | Tightest. This is the one to design for. |
| **Athlete phone** | Narrow, small text. |
| **Gym screen (TV)** | Looks roomy, but the font is huge — so fewer characters fit than you'd expect, and fewer again when a section is zoomed. |

Every example on this page is 22–28 characters and survives everywhere.

---

## Where the setting applies

**Honoured:** calendar, gym screen (TV), publish modal, athlete Workouts tab, athlete
Logbook, leaderboard, workout search (expanded and hover previews), and the score-entry
screen.

**Not honoured:** the two- to three-line teaser in the Workouts **search results list** —
it's clamped to a couple of lines anyway, so a table won't show properly there regardless.
Open or hover the result to see it laid out correctly.

---

## Quick checklist

- [ ] Built the table with **spaces**, not tabs
- [ ] Only ordinary keyboard characters (no box-drawing or block symbols)
- [ ] Lines under ~30 characters
- [ ] Ticked **Keep table layout (monospace)**
- [ ] Checked the **Preview (calendar / screen)** panel — not the editor box
