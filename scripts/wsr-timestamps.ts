import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const WODS = [
  { label: '2026-05-06 17:15', wod_id: 'c8ab57fe-4be2-42ac-982e-e0b8b0c78999' },
  { label: '2026-05-05 18:30', wod_id: '00fe6b2a-77eb-4623-98d6-468dc2769cd2' },
];

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  for (const w of WODS) {
    console.log(`\n=== ${w.label}  wod_id=${w.wod_id} ===`);
    const { data } = await s
      .from('wod_section_results')
      .select('id, member_id, section_id, created_at, updated_at, workout_date')
      .eq('wod_id', w.wod_id)
      .order('created_at', { ascending: true });
    // Group by created date
    const byCreatedDate: Record<string, number> = {};
    const byUpdatedDate: Record<string, number> = {};
    data?.forEach(r => {
      const cDate = (r.created_at as string).slice(0, 10);
      const uDate = (r.updated_at as string).slice(0, 10);
      byCreatedDate[cDate] = (byCreatedDate[cDate] ?? 0) + 1;
      byUpdatedDate[uDate] = (byUpdatedDate[uDate] ?? 0) + 1;
    });
    console.log('  created_at distribution:');
    Object.entries(byCreatedDate).forEach(([d, n]) => console.log(`    ${d}: ${n} rows`));
    console.log('  updated_at distribution:');
    Object.entries(byUpdatedDate).forEach(([d, n]) => console.log(`    ${d}: ${n} rows`));
  }
}
main();
