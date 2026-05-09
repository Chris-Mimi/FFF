/**
 * Probe: find section.type strings stored in wods.sections JSONB that are
 * NOT present in the section_types table. These are the strings that cause
 * the Workout Edit modal's section dropdown to silently fall back to the
 * first option (usually "Whiteboard Intro").
 *
 * Read-only — no writes.
 *
 * Usage:  npx tsx scripts/probe-legacy-section-types.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface WodRow {
  id: string;
  date: string;
  workout_name: string | null;
  session_type: string | null;
  sections: { type?: string }[] | null;
}

async function main() {
  const [{ data: typesData, error: typesErr }, { data: wodsData, error: wodsErr }] = await Promise.all([
    supabase.from('section_types').select('name, display_order').order('display_order'),
    supabase.from('wods').select('id, date, workout_name, session_type, sections'),
  ]);

  if (typesErr) throw typesErr;
  if (wodsErr) throw wodsErr;

  const knownTypes = new Set((typesData || []).map(t => t.name as string));

  console.log(`\nKnown section_types (${knownTypes.size}):`);
  for (const t of typesData || []) {
    console.log(`  ${(t.display_order as number).toString().padStart(2)}. ${t.name}`);
  }

  // Map: legacyType → array of {date, name, wodId}
  const legacy = new Map<string, { date: string; label: string; wodId: string }[]>();
  let totalWods = 0;
  let wodsWithLegacy = 0;

  for (const wod of (wodsData || []) as WodRow[]) {
    totalWods++;
    const sections = wod.sections ?? [];
    let wodHasLegacy = false;
    for (const sec of sections) {
      const t = (sec.type ?? '').trim();
      if (!t) continue;
      if (!knownTypes.has(t)) {
        wodHasLegacy = true;
        const label = `${wod.session_type ?? '?'}${wod.workout_name ? ` — ${wod.workout_name}` : ''}`;
        if (!legacy.has(t)) legacy.set(t, []);
        legacy.get(t)!.push({ date: wod.date, label, wodId: wod.id });
      }
    }
    if (wodHasLegacy) wodsWithLegacy++;
  }

  console.log(`\nScanned ${totalWods} wods. ${wodsWithLegacy} contain at least one legacy section type.`);

  if (legacy.size === 0) {
    console.log('\n✅ No legacy section types found. The dropdown-fallback bug should not surface anywhere.');
    return;
  }

  const sorted = [...legacy.entries()].sort((a, b) => b[1].length - a[1].length);

  console.log(`\n=== Legacy section types (${sorted.length}) — usage rolled up ===\n`);
  for (const [type, hits] of sorted) {
    const dates = hits.map(h => h.date).sort();
    const oldest = dates[0];
    const newest = dates[dates.length - 1];
    console.log(`"${type}"  →  ${hits.length} sections across ${new Set(hits.map(h => h.wodId)).size} WODs   (${oldest} … ${newest})`);
    // Show up to 5 examples
    const examples = hits.slice(0, 5);
    for (const ex of examples) {
      console.log(`    ${ex.date}  ${ex.label}  [wod=${ex.wodId}]`);
    }
    if (hits.length > 5) console.log(`    … +${hits.length - 5} more`);
    console.log('');
  }

  // Closest-match suggestions for migration
  console.log('=== Closest current-type suggestions ===\n');
  const knownArr = [...knownTypes];
  for (const [type] of sorted) {
    const lower = type.toLowerCase();
    const candidates = knownArr
      .map(k => ({ k, score: similarity(lower, k.toLowerCase()) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .filter(c => c.score > 0.3);
    if (candidates.length === 0) {
      console.log(`"${type}"  →  no close match in section_types`);
    } else {
      console.log(`"${type}"  →  ${candidates.map(c => `"${c.k}" (${(c.score * 100).toFixed(0)}%)`).join(', ')}`);
    }
  }
  console.log('');
}

// Simple Dice coefficient on character bigrams — good enough for "close match" hints.
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const grams = (s: string) => {
    const out = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      out.set(g, (out.get(g) ?? 0) + 1);
    }
    return out;
  };
  const ag = grams(a);
  const bg = grams(b);
  let inter = 0;
  for (const [g, n] of ag) {
    const m = bg.get(g);
    if (m) inter += Math.min(n, m);
  }
  return (2 * inter) / (a.length - 1 + b.length - 1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
