import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1].trim();
if (!url || !key) throw new Error('missing env');
const sb = createClient(url, key);

const APPLY = process.argv.includes('--apply');

(async () => {
  console.log(APPLY ? 'APPLY MODE — deletions will commit\n' : 'Dry-run (no deletes). Re-run with --apply.\n');

  const { data: wods } = await sb
    .from('wods')
    .select('id, date, session_type, workout_name')
    .order('date', { ascending: false });

  if (!wods) { console.log('no wods'); return; }

  const orphans: { id: string; date: string; label: string }[] = [];
  for (const w of wods) {
    const [{ count: sessionCount }, { count: scoreCount }, { count: liftCount }] = await Promise.all([
      sb.from('weekly_sessions').select('id', { count: 'exact', head: true }).eq('workout_id', w.id),
      sb.from('wod_section_results').select('id', { count: 'exact', head: true }).eq('wod_id', w.id),
      sb.from('lift_records').select('id', { count: 'exact', head: true }).eq('wod_id', w.id),
    ]);

    if ((sessionCount || 0) === 0 && (scoreCount || 0) === 0 && (liftCount || 0) === 0) {
      orphans.push({
        id: w.id,
        date: w.date,
        label: `${w.session_type || ''} ${w.workout_name || ''}`.trim(),
      });
    }
  }

  console.log(`Found ${orphans.length} orphan WODs (no sessions, no scores, no lifts):\n`);
  for (const o of orphans) {
    console.log(`  ${o.id.slice(0, 8)} | ${o.date} | ${o.label}`);
  }

  if (!APPLY) {
    console.log('\nDry-run complete. Re-run with --apply to delete.');
    return;
  }

  if (orphans.length === 0) { console.log('\nNothing to delete.'); return; }

  const { error } = await sb.from('wods').delete().in('id', orphans.map(o => o.id));
  if (error) { console.error('Delete error:', error); process.exit(1); }
  console.log(`\nDeleted ${orphans.length} orphan WODs.`);
})();
