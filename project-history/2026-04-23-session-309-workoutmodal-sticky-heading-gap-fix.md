# Session 309 — WorkoutModal Sticky-Heading Gap Fix

**Date:** 2026-04-23
**Model:** Opus 4.7

---

## Bug Report

Chris (with screenshot): "Edit/Create Workout modal: The 'Workout Sections' heading with Library and Section buttons and Movement Demos bar needs to be a little higher when I am scrolling within the modal. As I'm scrolling I can see the background of the modal above the 'Workout Sections' heading."

## Diagnosis

The sticky "Workout Sections" header sits inside `<form className='flex-1 overflow-y-auto p-6 space-y-6'>` and was positioned with `sticky top-0 z-20 bg-white pb-3 -mx-6 px-6`.

First fix attempt: added `-mt-6 pt-6` thinking the bg-white needed to extend through the form's padding-top. **Did not work** — Chris reported no change after testing on local. That's because the negative margin only affects static layout, not stuck position.

**Real root cause:** the CSS sticky positioning containing block is the parent's **content box**, not its padding box. Form has `padding-top: 24px`, so `top: 0` sticks the element 24px BELOW the form's outer top edge — the visible 24px gap above the heading is the form's padding-top region, which the `-mx-6 px-6` trick only covers horizontally.

## Fix

Changed `sticky top-0 ... pb-3 -mx-6 px-6` → `sticky -top-6 ... pt-3 pb-3 -mx-6 px-6` for both Edit and Create form variants.

- `-top-6` (= `top: -1.5rem`): the element can scroll 24px further before sticking, putting its stuck top edge at the form's outer top edge — flush with the modal header.
- `pt-3`: adds 12px breathing room above the heading row when stuck (mirrors the existing `pb-3`). Without this the heading would butt directly against the modal header bar.
- Static layout unchanged: `top` only kicks in once the element is in stuck mode.

Both forms (lines 166 + 513) were updated via `replace_all`. No mobile-specific concern — form's `p-6` has no responsive overrides.

## Lesson

> Sticky `top: 0` does NOT mean "flush with the top of the visible scroll viewport." It means flush with the **content box** of the nearest scroll ancestor. If the ancestor has `padding-top: N`, sticky sticks N pixels below the visible top. To stick at the visible top edge of a padded scroll container, use `top: -N` (matching the padding-top value).

Worth remembering for any future sticky-on-padded-scroll-container UI work.

## Process Note

First-attempt fix landed without local verification on my side — Chris had to test and report back. Second attempt was correct but cost an extra round-trip. For sticky-positioning tweaks the cheap mental check is: "where is the sticky element's containing block, and what's the offset from there to the visible viewport edge?" Skipping that step was the avoidable miss.
