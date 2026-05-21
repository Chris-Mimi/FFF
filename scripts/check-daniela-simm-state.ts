import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // 1. Member lookup
  const { data: members } = await supabase
    .from('members')
    .select('id, name, email, whiteboard_name, status, membership_types, created_at')
    .ilike('name', '%Daniela Simm%');

  if (!members?.length) { console.log('Daniela Simm not found in members'); return; }
  const daniela = members[0];
  console.log('=== MEMBER ===');
  console.log(`id: ${daniela.id}`);
  console.log(`name: ${daniela.name}`);
  console.log(`whiteboard_name: ${daniela.whiteboard_name ?? '(none)'}`);
  console.log(`status: ${daniela.status}`);
  console.log(`membership_types: ${JSON.stringify(daniela.membership_types)}`);
  console.log(`created_at: ${daniela.created_at}`);

  // 2. All bookings for Daniela
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, session_id, status, is_trial, is_og, linked_trial_name, ten_card_consumed, created_at')
    .eq('member_id', daniela.id);

  console.log(`\n=== BOOKINGS (${bookings?.length ?? 0}) ===`);
  for (const b of bookings ?? []) {
    const { data: sess } = await supabase
      .from('weekly_sessions')
      .select('date, time, workout_id, trial_names')
      .eq('id', b.session_id)
      .single();
    console.log(`booking ${b.id.slice(0, 8)}`);
    console.log(`  session date/time: ${sess?.date} ${sess?.time}`);
    console.log(`  status: ${b.status}`);
    console.log(`  is_trial: ${b.is_trial}`);
    console.log(`  is_og: ${b.is_og}`);
    console.log(`  linked_trial_name: ${b.linked_trial_name ?? '(none)'}`);
    console.log(`  ten_card_consumed: ${b.ten_card_consumed}`);
    console.log(`  trial_names on session: ${JSON.stringify(sess?.trial_names)}`);
    console.log('');
  }

  // 3. The 29/03 weekly_session — does it have Daniela in trial_names?
  console.log('=== 29/03/2026 sessions ===');
  const { data: marchSessions } = await supabase
    .from('weekly_sessions')
    .select('id, date, time, workout_id, trial_names')
    .eq('date', '2026-03-29');
  for (const s of marchSessions ?? []) {
    console.log(`  ${s.date} ${s.time} (session ${s.id.slice(0, 8)}) trial_names=${JSON.stringify(s.trial_names)}`);
  }

  // 4. The orphan WSR for "DanielaS (PT)" on 29/03
  console.log('\n=== Orphan WSR on 29/03 ===');
  const { data: orphans } = await supabase
    .from('wod_section_results')
    .select('id, whiteboard_name, wod_id, section_id, workout_date, time_result, weight_result')
    .eq('whiteboard_name', 'DanielaS (PT)');
  for (const o of orphans ?? []) {
    console.log(`  WSR ${o.id.slice(0, 8)} workout_date=${o.workout_date} time=${o.time_result} weight=${o.weight_result}`);
  }

  // 5. WSRs already linked to Daniela
  console.log('\n=== WSRs linked to Daniela ===');
  const { data: linkedWsrs } = await supabase
    .from('wod_section_results')
    .select('id, workout_date, whiteboard_name, wod_id, section_id, time_result, weight_result, reps_result')
    .eq('member_id', daniela.id)
    .order('workout_date');
  for (const w of linkedWsrs ?? []) {
    console.log(`  WSR ${w.id.slice(0, 8)} ${w.workout_date} time=${w.time_result ?? '-'} weight=${w.weight_result ?? '-'} reps=${w.reps_result ?? '-'} (whiteboard_name=${w.whiteboard_name ?? '-'})`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
