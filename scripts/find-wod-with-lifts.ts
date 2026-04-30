import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1].trim();
if (!url || !key) throw new Error('missing env');
const sb = createClient(url, key);

(async () => {
  const { data: lifts } = await sb
    .from('lift_records')
    .select('wod_id, lift_name, rep_max_type, rep_scheme, user_id, lift_date')
    .not('wod_id', 'is', null)
    .order('lift_date', { ascending: false })
    .limit(200);

  if (!lifts || lifts.length === 0) {
    console.log('No lift_records with wod_id found.');
    return;
  }

  const byWod = new Map<string, typeof lifts>();
  for (const l of lifts) {
    if (!byWod.has(l.wod_id)) byWod.set(l.wod_id, []);
    byWod.get(l.wod_id)!.push(l);
  }

  console.log(`Found ${byWod.size} unique WODs with lift_records (top 10 most recent):\n`);
  let i = 0;
  for (const [wodId, rows] of byWod) {
    if (i++ >= 10) break;
    const { data: wod } = await sb
      .from('wods')
      .select('id, date, session_type, workout_name, sections')
      .eq('id', wodId)
      .maybeSingle();
    if (!wod) continue;
    const sections = (wod.sections as Array<{ id: string; content?: string; lifts?: Array<{ name?: string; rm_test?: string }> }>) || [];
    const liftSections = sections.filter(s => s.lifts && s.lifts.length > 0);
    const liftNames = [...new Set(rows.map(r => r.lift_name))];
    const recordCount = rows.length;
    const userCount = new Set(rows.map(r => r.user_id)).size;
    console.log(`WOD ${wodId.slice(0, 8)}... | ${wod.date} | ${wod.session_type} ${wod.workout_name || ''}`);
    console.log(`  ${recordCount} lift_records from ${userCount} users — lifts: ${liftNames.join(', ')}`);
    console.log(`  Sections with lifts: ${liftSections.length} / ${sections.length} total`);
    for (const s of liftSections) {
      const liftDescr = (s.lifts || []).map(l => `${l.name}${l.rm_test ? ` (${l.rm_test})` : ''}`).join('; ');
      console.log(`    - ${s.id.slice(0, 24)}... → ${liftDescr}`);
    }
    console.log();
  }
})();
