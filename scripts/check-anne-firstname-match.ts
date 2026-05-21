/**
 * Find which session Anne Schaber's first-name-fallback WSR row belongs to
 * (S358 Phase-2 byproduct).
 *
 * Strategy: look up Anne Schaber's member.id, then find wod_section_results
 * rows where member_id = her id AND whiteboard_name does not equal her full
 * name (i.e. likely just "Anne" or a first-name variant that matched via fallback).
 *
 * Usage: npx tsx scripts/check-anne-firstname-match.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const { data: members } = await supabase
    .from('members')
    .select('id, name, whiteboard_name')
    .ilike('name', '%Anne Schaber%');
  if (!members?.length) { console.log('Anne Schaber not found'); return; }
  const anne = members[0];
  console.log(`Anne: id=${anne.id}, name="${anne.name}", whiteboard_name="${anne.whiteboard_name ?? '(none)'}"\n`);

  const { data: rows } = await supabase
    .from('wod_section_results')
    .select('id, whiteboard_name, wod_id, section_id, workout_date, time_result, reps_result, weight_result, rounds_result')
    .eq('member_id', anne.id);
  if (!rows?.length) { console.log('No WSR rows linked to Anne'); return; }

  console.log(`Total WSR rows linked to Anne: ${rows.length}\n`);
  for (const r of rows) {
    const { data: wod } = await supabase
      .from('wods')
      .select('date, session_type, workout_name, sections')
      .eq('id', r.wod_id)
      .single();
    const section = (wod?.sections as any[])?.find((s: any) => s.id === r.section_id);
    console.log(`  WSR ${r.id.slice(0, 8)}`);
    console.log(`    whiteboard_name: "${r.whiteboard_name}"`);
    console.log(`    wod date: ${wod?.date}  ${wod?.session_type ?? ''}  ${wod?.workout_name ?? ''}`);
    console.log(`    section: ${section?.type ?? '?'} — ${section?.content?.slice(0, 80) ?? ''}`);
    const score = [
      r.time_result && `time=${r.time_result}`,
      r.reps_result && `reps=${r.reps_result}`,
      r.weight_result && `weight=${r.weight_result}`,
      r.rounds_result && `rounds=${r.rounds_result}`,
    ].filter(Boolean).join(' ');
    console.log(`    score: ${score || '(none)'}\n`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
