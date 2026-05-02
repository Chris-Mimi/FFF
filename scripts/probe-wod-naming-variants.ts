/**
 * Probe: scan all WOD section content for naming inconsistencies.
 * For each canonical exercise/lift/benchmark name, find rough variants in WOD text
 * (typos, abbreviations, alternate spellings) and report them.
 * Read-only — no writes.
 *
 * Usage:  npx tsx scripts/probe-wod-naming-variants.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const MIN_TOKEN_LEN = 3;

async function main() {
  // 1. Pull canonical names from all 4 movement sources
  const [exRes, liftRes, bmRes, fbRes] = await Promise.all([
    supabase.from('exercises').select('display_name, name'),
    supabase.from('barbell_lifts').select('name'),
    supabase.from('benchmark_workouts').select('name'),
    supabase.from('forge_benchmarks').select('name'),
  ]);

  const canonical = new Map<string, { name: string; source: string }>();
  exRes.data?.forEach(r => {
    const n = r.display_name || r.name;
    if (n) canonical.set(norm(n), { name: n, source: 'exercise' });
  });
  liftRes.data?.forEach(r => {
    if (r.name) canonical.set(norm(r.name), { name: r.name, source: 'lift' });
  });
  bmRes.data?.forEach(r => {
    if (r.name) canonical.set(norm(r.name), { name: r.name, source: 'benchmark' });
  });
  fbRes.data?.forEach(r => {
    if (r.name) canonical.set(norm(r.name), { name: r.name, source: 'forge' });
  });

  console.log(`Canonical sources: ${canonical.size}`);

  // 2. Pull WOD section text
  const { data: wods, error } = await supabase
    .from('wods')
    .select('id, date, sections')
    .order('date', { ascending: false });
  if (error) { console.error(error); process.exit(1); }

  const lineSources = new Map<string, { count: number; wodIds: Set<string> }>();
  for (const w of wods ?? []) {
    const sections = Array.isArray(w.sections) ? w.sections : [];
    for (const s of sections) {
      const txt = String(s?.content ?? '');
      if (!txt.trim()) continue;
      // Split by line and by likely separators (commas, semicolons inside an "x" rep line)
      const lines = txt.split(/\n|;/).map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        // Strip leading rep / weight prefixes (e.g. "3x10", "10 ", "5kg")
        const stripped = line.replace(/^[\d×x@*\-\s.,/kgKG()%]+/i, '').trim();
        if (stripped.length < MIN_TOKEN_LEN) continue;
        const key = norm(stripped);
        if (!key) continue;
        const slot = lineSources.get(key) ?? { count: 0, wodIds: new Set<string>() };
        slot.count += 1;
        slot.wodIds.add(w.id);
        lineSources.set(key, slot);
      }
    }
  }

  // 3. Bucket by best canonical match. A line "matches" a canonical if either
  //    (a) the canonical key is a substring of the line key, or
  //    (b) the line key is a substring of the canonical key (covers "DL" → "barbell deadlift" — too loose, skip)
  //    Use only (a) plus a token-overlap threshold.
  type Bucket = { canonical: string; source: string; variants: { line: string; count: number }[] };
  const buckets = new Map<string, Bucket>();

  for (const [lineKey, { count }] of lineSources) {
    let bestCanonKey: string | null = null;
    let bestCanonName = '';
    let bestSource = '';
    let bestScore = 0;

    for (const [canonKey, info] of canonical) {
      if (!canonKey) continue;
      // Substring match: canonical name appears verbatim in the line (case-insensitive)
      if (lineKey.includes(canonKey)) {
        const score = canonKey.length; // longer canonical match wins
        if (score > bestScore) {
          bestScore = score;
          bestCanonKey = canonKey;
          bestCanonName = info.name;
          bestSource = info.source;
        }
      }
    }

    if (!bestCanonKey) continue;
    // Skip lines that are EXACTLY the canonical (no variant — already correct)
    if (lineKey === bestCanonKey) continue;

    // Now compute a variant signature: the part of the line that ISN'T the canonical
    // — useful to spot " x", "Bb ", "(scaled)" suffixes that are noise vs. real variants.
    const beforeAfter = lineKey.replace(bestCanonKey, '◇').trim();
    const variantSig = beforeAfter; // keep the diff for inspection

    const slot = buckets.get(bestCanonKey) ?? { canonical: bestCanonName, source: bestSource, variants: [] };
    slot.variants.push({ line: lineKey, count });
    buckets.set(bestCanonKey, slot);
    void variantSig;
  }

  // 4. Also: look for SHORT lines that DON'T match any canonical — possible misspellings
  //    or movements not in any library yet. Filter to <= 5 tokens, count >= 2.
  const orphanLines: { line: string; count: number; wodIds: number }[] = [];
  for (const [lineKey, { count, wodIds }] of lineSources) {
    if (count < 2) continue;
    if (lineKey.split(' ').length > 5) continue;
    let matched = false;
    for (const canonKey of canonical.keys()) {
      if (lineKey.includes(canonKey) || (canonKey.length > 6 && canonKey.includes(lineKey))) {
        matched = true; break;
      }
    }
    if (!matched) orphanLines.push({ line: lineKey, count, wodIds: wodIds.size });
  }

  // 5. Output
  console.log('\n=== VARIANTS (canonical name appears in a line that ISN\'T just the canonical) ===');
  console.log('These are lines like "10 Sumo Deadlift" — usually fine — but also "Sumo DL" mixed with full name etc.\n');

  const sortedBuckets = Array.from(buckets.entries())
    .filter(([, b]) => b.variants.length >= 1)
    .sort(([, a], [, b]) => b.variants.length - a.variants.length)
    .slice(0, 30); // top 30

  for (const [, b] of sortedBuckets) {
    console.log(`\n• ${b.canonical}  [${b.source}]`);
    const top = b.variants.sort((a, c) => c.count - a.count).slice(0, 6);
    for (const v of top) {
      console.log(`    ${v.count.toString().padStart(3)}×  "${v.line}"`);
    }
    if (b.variants.length > 6) console.log(`    … +${b.variants.length - 6} more variants`);
  }

  console.log('\n=== ORPHAN LINES (short lines with no canonical match, count >= 2) ===');
  console.log('Possible typos, abbreviations, or movements not yet in the library.\n');
  orphanLines
    .sort((a, b) => b.count - a.count)
    .slice(0, 50)
    .forEach(o => {
      console.log(`  ${o.count.toString().padStart(3)}×  (${o.wodIds} WODs)  "${o.line}"`);
    });

  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
