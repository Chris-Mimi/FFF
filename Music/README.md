# Music

Separate workspace for music / notation workflows — **unrelated to the Forge web app** in the rest of this repo. Keep any music tasks (score comparisons, arrangement notes, exports, helper scripts) in here so they don't mix with the app code.

## Score comparison workflow (Dorico → MusicXML)

Comparing two versions of a score and highlighting the differences:

1. Export **both** versions from Dorico as MusicXML (`File → Export → MusicXML`; `.musicxml` or `.mxl`).
2. Compare via MusicXML, **not** PDF pixel-diff — scores often differ by an inserted/removed bar (one-bar offset) and in intra-bar spacing, which breaks naive comparison.
3. Method: parse per part, flatten each voice into continuous events **merging tied notes** (pitch + duration + lyric + slur + articulation), then diff the streams (offset-robust). Filter cosmetic noise (slur marker placement, trailing spaces, instrument labels).
4. Watch out: the **lead melody moves between voices** — compare every part, not just the obvious one.
5. Render/highlight with `poppler` (`pdftoppm`) + `imagemagick` (`magick ... -draw "rectangle ..."`), both installed via Homebrew.

First run: "Stand by Me" (choral TTBB), July 2026.

## PDF → MusicXML (OMR, Audiveris)

For when you've **lost the source file** and only have a PDF/scan. If it came from Dorico, export MusicXML from Dorico instead — OMR is never as accurate.

**Installed:** Audiveris **v5.4** at `~/tools/audiveris/app/build/install/app/bin/Audiveris` (built from source; needs Java 21 — v5.9+ require Java 25). OCR via Tesseract (`/opt/homebrew/share/tessdata`, has eng+deu). No rebuild needed to reuse.

**Run (batch, export MusicXML):**
```bash
export JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home
export TESSDATA_PREFIX=/opt/homebrew/share/tessdata
~/tools/audiveris/app/build/install/app/bin/Audiveris \
  -batch -transcribe -export -output OUTDIR -- INPUT.pdf
# add `-sheets 1` to limit pages. Output: OUTDIR/INPUT.mxl (+ .omr book file)
```
`.mxl` is zipped MusicXML — `unzip` it to get the `.musicxml`.

**Accuracy (measured on a clean digital PDF):** gets part/measure count and **most pitches** right; regularly **drops rests** (bars don't total), misses rhythmic fine-detail (dots/odd notes), and does **not** reliably capture **lyrics**, dynamics, slurs, or part names. Treat output as a head-start that **must be cleaned up in Dorico**. Scans are rougher. Lyrics OCR may need tuning (OCR language / TEXTS step) per job.
