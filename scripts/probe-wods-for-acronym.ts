/**
 * For each acronym, list the WODs that contain its canonical name in section
 * content, including workout_name + workout_week + session_type. Helps debug
 * dedup behavior in the SearchPanel "Show Unique" mode.
 *
 * Usage:  npx tsx scripts/probe-wods-for-acronym.ts CLPU DPU
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: npx tsx scripts/probe-wods-for-acronym.ts <ACR1> [ACR2] ...');
    process.exit(1);
  }

  const { data: exData } = await supabase
    .from('exercises')
    .select('display_name, acronym')
    .not('acronym', 'is', null);

  const acronymToName = new Map<string, string>();
  exData?.forEach(e => {
    if (e.acronym && e.display_name) acronymToName.set(e.acronym.toUpperCase(), e.display_name);
  });

  const { data: wods } = await supabase
    .from('wods')
    .select('id, date, session_type, workout_name, workout_week, sections')
    .order('date', { ascending: false });

  for (const acr of args) {
    const canonical = acronymToName.get(acr.toUpperCase());
    if (!canonical) {
      console.log(`\n━━━ ${acr} — no canonical found`);
      continue;
    }
    console.log(`\n━━━ ${acr} → "${canonical}" ━━━`);
    const needle = canonical.toLowerCase();
    const hits: Array<{ date: string; session_type: string; workout_name: string | null; workout_week: string | null; id: string }> = [];
    for (const w of wods ?? []) {
      const sections = Array.isArray(w.sections) ? w.sections : [];
      const concat = sections.map((s: { content?: string }) => String(s?.content ?? '')).join(' ').toLowerCase();
      if (concat.includes(needle) || concat.includes(acr.toLowerCase())) {
        hits.push({ date: w.date, session_type: w.session_type, workout_name: w.workout_name, workout_week: w.workout_week, id: w.id });
      }
    }
    console.log(`  ${hits.length} hits`);
    hits.forEach(h => {
      console.log(`    ${h.date}  st="${h.session_type}"  wn="${h.workout_name ?? '∅'}"  ww="${h.workout_week ?? '∅'}"  id=${h.id.slice(0, 8)}`);
    });

    // Compute the dedup keys the SearchPanel would build (bi-weekly bucket)
    console.log(`  --- bi-weekly dedup keys ---`);
    const keys = new Map<string, number>();
    for (const h of hits) {
      let key: string;
      if (h.workout_name && h.workout_week) {
        const m = h.workout_week.match(/^(\d{4})-W(\d{2})$/);
        if (m) {
          const week = parseInt(m[2], 10);
          const biWeek = week % 2 === 0 ? week : week - 1;
          key = `${h.workout_name}_${m[1]}-W${String(biWeek).padStart(2, '0')}`;
        } else {
          key = `${h.workout_name}_${h.workout_week}`;
        }
      } else {
        key = `${h.id || h.date}`;
      }
      keys.set(key, (keys.get(key) ?? 0) + 1);
    }
    keys.forEach((count, k) => console.log(`    ${count}× "${k}"`));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
