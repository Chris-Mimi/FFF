/**
 * Find specific text fragments in WOD section content and print the WOD date + id
 * so they can be opened/fixed.
 *
 * Usage:  npx tsx scripts/probe-find-strings.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TARGETS = [
  'russian rkbs',
  'ettlebell rockit',
  'jump rope double under du',
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function main() {
  const { data: wods, error } = await supabase
    .from('wods')
    .select('id, date, workout_name, sections')
    .order('date', { ascending: false });
  if (error) { console.error(error); process.exit(1); }

  for (const target of TARGETS) {
    console.log(`\n━━━ "${target}" ━━━`);
    const targetNorm = norm(target);
    let hits = 0;
    for (const w of wods ?? []) {
      const sections = Array.isArray(w.sections) ? w.sections : [];
      for (let i = 0; i < sections.length; i++) {
        const txt = String(sections[i]?.content ?? '');
        if (!norm(txt).includes(targetNorm)) continue;
        // Find the actual line containing it (raw, not normalized)
        const lines = txt.split('\n');
        const matchedLine = lines.find(l => norm(l).includes(targetNorm)) ?? txt.slice(0, 120);
        console.log(`  ${w.date}  ${w.workout_name ?? ''}  [section ${i}]  id=${w.id}`);
        console.log(`    "${matchedLine.trim()}"`);
        hits++;
        break; // one line per WOD is enough
      }
    }
    if (hits === 0) console.log('  (no matches)');
    else console.log(`  ${hits} WOD(s)`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
