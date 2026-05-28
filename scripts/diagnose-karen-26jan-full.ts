/**
 * Wider net for missing Karen scores: athlete leaderboard pools across
 * - benchmark_results table (athlete self-entries)
 * - wod_section_results across ALL wods that contain a Karen benchmark in any section
 *
 * If scores show on the leaderboard but didn't appear in our last script's WSR query,
 * they live elsewhere. Find them.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const KAREN_NAME = 'Karen';

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. benchmark_results for Karen
  const { data: br } = await s
    .from('benchmark_results')
    .select('id, user_id, benchmark_name, time_result, reps_result, weight_result, scaling_level, result_date, created_at, updated_at')
    .eq('benchmark_name', KAREN_NAME)
    .order('result_date', { ascending: false });

  console.log(`\n── benchmark_results for "${KAREN_NAME}" (${br?.length || 0}) ──`);
  // Resolve user names
  const userIds = [...new Set((br || []).map(r => r.user_id))];
  const { data: members } = await s.rpc('get_member_names', { member_ids: userIds });
  const nameOf = new Map<string, string>();
  for (const m of (members || []) as Array<{ id: string; name?: string; display_name?: string }>) {
    nameOf.set(m.id, m.display_name || m.name || m.id);
  }
  for (const r of (br || [])) {
    console.log(`  ${nameOf.get(r.user_id) || r.user_id}  date=${r.result_date}  time=${r.time_result}  weight=${r.weight_result}  scaling=${r.scaling_level}  created=${r.created_at}`);
  }

  // 2. All wods whose JSONB sections reference Karen
  const { data: allWods } = await s
    .from('wods')
    .select('id, date, session_type, title, sections, updated_at')
    .eq('is_published', true);

  const karenWods: Array<{ id: string; date: string; title?: string | null; session_type: string; sections: unknown; updated_at?: string }> = [];
  for (const w of (allWods || [])) {
    const secs = ((w.sections as Array<{ benchmarks?: Array<{ name?: string }>; forge_benchmarks?: Array<{ name?: string }> }> | null) || []);
    const hasKaren = secs.some(sec =>
      (sec.benchmarks || []).some(b => b.name === KAREN_NAME) ||
      (sec.forge_benchmarks || []).some(b => b.name === KAREN_NAME)
    );
    if (hasKaren) karenWods.push(w as never);
  }
  console.log(`\n── wods referencing "${KAREN_NAME}" in sections (${karenWods.length}) ──`);
  for (const w of karenWods) {
    console.log(`  wod_id=${w.id}  date=${w.date}  title=${w.title || w.session_type}  updated=${w.updated_at}`);
  }

  // 3. WSRs across ALL Karen wods
  const karenWodIds = karenWods.map(w => w.id);
  if (karenWodIds.length > 0) {
    const { data: rows } = await s
      .from('wod_section_results')
      .select('id, user_id, member_id, whiteboard_name, wod_id, section_id, time_result, reps_result, rounds_result, weight_result, scaling_level, workout_date, created_at, updated_at')
      .in('wod_id', karenWodIds);
    console.log(`\n── wod_section_results across all Karen wods (${rows?.length || 0}) ──`);
    const memberIds = [...new Set((rows || []).map(r => r.member_id).filter(Boolean))] as string[];
    const userIdsAdd = [...new Set((rows || []).map(r => r.user_id).filter(Boolean))] as string[];
    const lookup = [...memberIds, ...userIdsAdd];
    const { data: m2 } = await s.rpc('get_member_names', { member_ids: lookup });
    for (const m of (m2 || []) as Array<{ id: string; name?: string; display_name?: string }>) {
      if (!nameOf.has(m.id)) nameOf.set(m.id, m.display_name || m.name || m.id);
    }
    for (const r of (rows || [])) {
      const who = r.whiteboard_name || nameOf.get(r.member_id || '') || nameOf.get(r.user_id || '') || r.member_id || r.user_id;
      const w = karenWods.find(w => w.id === r.wod_id);
      console.log(`  ${who}  wod=${w?.date} (${r.wod_id.slice(0, 8)})  section=${r.section_id}  time=${r.time_result}  weight=${r.weight_result}  scaling=${r.scaling_level}  date=${r.workout_date}  created=${r.created_at}`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
