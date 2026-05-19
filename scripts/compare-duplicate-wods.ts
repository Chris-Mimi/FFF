import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const PAIRS = [
  { label: '2026-05-06 Sumo DL', old: 'be6aafdf-3288-4ee7-992f-d1d09c166295', new: 'c8ab57fe-4be2-42ac-982e-e0b8b0c78999' },
  { label: '2026-05-05 HS drills', old: '1a0395e6-6412-404b-902e-e933dc126b18', new: '00fe6b2a-77eb-4623-98d6-468dc2769cd2' },
];

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  for (const p of PAIRS) {
    console.log(`\n══════════════════════════════════════════════`);
    console.log(p.label);
    console.log(`══════════════════════════════════════════════`);
    for (const label of ['old', 'new'] as const) {
      const id = p[label];
      const { data: wod } = await s.from('wods').select('*').eq('id', id).single();
      if (!wod) { console.log(`  ${label} ${id}: NOT FOUND`); continue; }
      console.log(`\n  ${label} ${id}:`);
      console.log(`    created_at=${wod.created_at}  updated_at=${wod.updated_at}`);
      console.log(`    publish=${wod.workout_publish_status}  workout_name=${wod.workout_name}`);
      console.log(`    workout_week=${wod.workout_week}  class_times=${JSON.stringify(wod.class_times)}`);
      const sections = (wod.sections as Array<{id:string;type:string;scoring_fields?:Record<string,boolean>}>) || [];
      console.log(`    ${sections.length} sections:`);
      sections.forEach(sec => {
        const sf = sec.scoring_fields ? Object.entries(sec.scoring_fields).filter(([,v])=>v).map(([k])=>k).join(',') : '-';
        console.log(`      id=${sec.id}  type=${sec.type}  scoring=[${sf}]`);
      });

      // Sessions linked to this wod
      const { data: linkedSessions } = await s
        .from('weekly_sessions')
        .select('id, date, time, status')
        .eq('workout_id', id);
      console.log(`    linked sessions (${linkedSessions?.length ?? 0}):`);
      linkedSessions?.forEach(ws => console.log(`      session=${ws.id}  ${ws.date} ${ws.time}  status=${ws.status}`));
    }
  }
}
main();
