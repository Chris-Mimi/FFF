import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function check() {
  const userId = '84280ec0-7cc6-40e2-818b-d8843c30ce29';

  // The 3 wod_ids that have results for "Strict Movements"
  const wodIds = [
    '7bf1765d-179b-4ec2-9d37-13c90598d3f2',
    '9c333124-accd-4b08-9dd5-891d38aca350',
    '9d4a6926-8108-4fe4-8c0b-4aa037488625',
  ];

  console.log('=== WOD details + sessions + bookings ===\n');

  for (const wodId of wodIds) {
    const { data: wod } = await supabase
      .from('wods')
      .select('id, date, workout_name, session_type')
      .eq('id', wodId)
      .single();

    const { data: session } = await supabase
      .from('weekly_sessions')
      .select('id, time, capacity')
      .eq('workout_id', wodId)
      .maybeSingle();

    let booking = null;
    if (session) {
      const { data: b } = await supabase
        .from('bookings')
        .select('id, status, member_id')
        .eq('session_id', session.id)
        .eq('member_id', userId)
        .maybeSingle();
      booking = b;
    }

    // Check when the wod_section_result was created
    const { data: result } = await supabase
      .from('wod_section_results')
      .select('id, created_at, updated_at, scaling_level, time_result')
      .eq('wod_id', wodId)
      .eq('user_id', userId)
      .eq('section_id', 'section-1765486851260-content-0')
      .maybeSingle();

    console.log(`WOD: ${wodId.slice(0, 8)}...`);
    console.log(`  Name: ${wod?.workout_name} | Date: ${wod?.date}`);
    console.log(`  Session: ${session ? `${session.time} (id: ${session.id.slice(0, 8)}...)` : 'NO SESSION'}`);
    console.log(`  Booking: ${booking ? `${booking.status}` : 'NO BOOKING'}`);
    console.log(`  Result: ${result ? `scaling=${result.scaling_level} time=${result.time_result} created=${result.created_at} updated=${result.updated_at}` : 'NO RESULT'}`);
    console.log('');
  }
}

check();
