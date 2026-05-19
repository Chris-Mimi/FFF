import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const DATES = ['2026-05-06', '2026-05-05'];

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  for (const d of DATES) {
    console.log(`\n=== ${d} ===`);
    const { data: sessions } = await s
      .from('weekly_sessions')
      .select('id, date, time, workout_id, status, workout_type, capacity')
      .eq('date', d)
      .order('time');
    for (const ws of sessions ?? []) {
      const { data: wod } = ws.workout_id
        ? await s.from('wods').select('workout_name, session_type, class_times').eq('id', ws.workout_id).maybeSingle()
        : { data: null };
      const { count: confirmedCount } = await s
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', ws.id)
        .eq('status', 'confirmed');
      console.log(`  ${ws.time}  type=${ws.workout_type}  cap=${ws.capacity}  status=${ws.status}  confirmed_bookings=${confirmedCount}`);
      console.log(`    session_id=${ws.id}`);
      console.log(`    workout_id=${ws.workout_id} → ${wod?.session_type ?? '-'}/${wod?.workout_name ?? '-'} (class_times=${JSON.stringify(wod?.class_times ?? null)})`);
    }
  }
}
main();
