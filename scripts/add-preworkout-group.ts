/**
 * One-shot: link every 'Pre-Workout' category exercise to the "Pre-Workout"
 * movement pattern group. INSERT-only, deduped (skips already-linked).
 * Service-role (RLS-protected tables).
 *
 *   npx tsx scripts/add-preworkout-group.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data: patterns } = await supabase
    .from('movement_patterns')
    .select('id, user_id, name')
    .eq('name', 'Pre-Workout');
  if (!patterns || patterns.length !== 1) {
    console.error(`Expected exactly 1 "Pre-Workout" pattern, found ${patterns?.length ?? 0}. Aborting.`);
    return;
  }
  const pattern = patterns[0];

  const { data: exs } = await supabase
    .from('exercises')
    .select('id, name, display_name')
    .eq('category', 'Pre-Workout');
  if (!exs) { console.error('No exercises fetched. Aborting.'); return; }

  const { data: existing } = await supabase
    .from('movement_pattern_exercises')
    .select('exercise_id')
    .eq('pattern_id', pattern.id);
  const have = new Set((existing || []).map(r => r.exercise_id));

  const missing = exs
    .filter(e => !have.has(e.id))
    .sort((a, b) => (a.display_name || a.name).localeCompare(b.display_name || b.name));

  if (missing.length === 0) { console.log('Nothing to add — all already linked.'); return; }

  const base = have.size;
  const toInsert = missing.map((e, i) => ({
    pattern_id: pattern.id,
    exercise_id: e.id,
    sort_order: base + i,
  }));

  const { error } = await supabase.from('movement_pattern_exercises').insert(toInsert);
  if (error) { console.error('Insert failed:', error); return; }

  console.log(`Linked ${toInsert.length} exercises to "Pre-Workout". Total now: ${base + toInsert.length}.`);
}
main();
