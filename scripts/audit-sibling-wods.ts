import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1].trim();
if (!url || !key) throw new Error('missing env');
const sb = createClient(url, key);

type WodRow = {
  id: string;
  date: string;
  session_type: string | null;
  workout_name: string | null;
  class_times: string[] | null;
  workout_publish_status: string | null;
  sections: unknown;
};

(async () => {
  const { data: wods } = await sb
    .from('wods')
    .select('id, date, session_type, workout_name, class_times, workout_publish_status, sections')
    .order('date', { ascending: false })
    .limit(2000);

  if (!wods) return;
  const all = wods as WodRow[];

  const groups = new Map<string, WodRow[]>();
  for (const w of all) {
    const key = `${w.date}|${(w.workout_name || w.session_type || '').trim()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(w);
  }

  const siblingClusters = [...groups.entries()]
    .filter(([, ws]) => ws.length >= 3)
    .sort((a, b) => b[1][0].date.localeCompare(a[1][0].date));

  console.log(`Found ${siblingClusters.length} clusters with 3+ sibling WODs (top 30):\n`);

  let totalStaleCandidates = 0;
  let totalClusters = 0;
  for (const [key, ws] of siblingClusters.slice(0, 30)) {
    totalClusters++;
    console.log(`=== ${key} — ${ws.length} siblings ===`);
    for (const w of ws) {
      const sectionCount = Array.isArray(w.sections) ? (w.sections as unknown[]).length : 0;

      const { count: sessionCount } = await sb
        .from('weekly_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('workout_id', w.id);

      const { count: bookingCount } = await sb
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .in('session_id',
          (await sb.from('weekly_sessions').select('id').eq('workout_id', w.id)).data?.map(r => r.id) || ['00000000-0000-0000-0000-000000000000']
        );

      const { count: scoreCount } = await sb
        .from('wod_section_results')
        .select('id', { count: 'exact', head: true })
        .eq('wod_id', w.id);

      const { count: liftCount } = await sb
        .from('lift_records')
        .select('id', { count: 'exact', head: true })
        .eq('wod_id', w.id);

      const isStale =
        (sessionCount || 0) === 0 &&
        (bookingCount || 0) === 0 &&
        (scoreCount || 0) === 0 &&
        (liftCount || 0) === 0;

      if (isStale) totalStaleCandidates++;

      const flag = isStale ? '🗑️  STALE' : '✓';
      console.log(
        `  ${flag} ${w.id.slice(0, 8)} | ${w.workout_publish_status || 'null'} | ${sectionCount} sections | ` +
        `times: ${(w.class_times || []).join(',') || '∅'} | ` +
        `sessions: ${sessionCount || 0} | bookings: ${bookingCount || 0} | scores: ${scoreCount || 0} | lifts: ${liftCount || 0}`
      );
    }
    console.log();
  }

  console.log(`Total: ${totalClusters} clusters audited, ${totalStaleCandidates} stale candidates found.`);
})();
