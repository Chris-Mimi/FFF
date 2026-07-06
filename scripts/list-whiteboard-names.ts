import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // All unlinked whiteboard score rows (member_id null), paginated
  const PAGE = 1000;
  const rows: { whiteboard_name: string; workout_date: string }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await s.from('wod_section_results')
      .select('whiteboard_name, workout_date')
      .not('whiteboard_name', 'is', null)
      .is('member_id', null)
      .range(from, from + PAGE - 1);
    if (error) { console.error(error); process.exit(1); }
    if (!data || data.length === 0) break;
    rows.push(...(data as any));
    if (data.length < PAGE) break;
  }

  // Which whiteboard names are already assigned to a member?
  const { data: memberRows } = await s.from('members')
    .select('name, whiteboard_name').not('whiteboard_name', 'is', null);
  const assigned = new Set((memberRows || []).map(m => (m.whiteboard_name as string).toLowerCase()));

  // Aggregate per name
  const agg = new Map<string, { count: number; last: string; assignedTo?: string }>();
  for (const r of rows) {
    const cur = agg.get(r.whiteboard_name) || { count: 0, last: '' };
    cur.count++;
    if (r.workout_date > cur.last) cur.last = r.workout_date;
    agg.set(r.whiteboard_name, cur);
  }
  const memberByWb = new Map((memberRows||[]).map(m => [(m.whiteboard_name as string).toLowerCase(), m.name as string]));

  const entries = [...agg.entries()].map(([name, v]) => ({
    name, ...v, linkedMember: assigned.has(name.toLowerCase()) ? memberByWb.get(name.toLowerCase()) : undefined,
  }));

  const unlinked = entries.filter(e => !e.linkedMember).sort((a,b)=>a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  const linkedButUnmigrated = entries.filter(e => e.linkedMember).sort((a,b)=>a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  console.log(`\n===== UNLINKED whiteboard names (no matching member) — ${unlinked.length} =====`);
  for (const e of unlinked) console.log(`  ${e.name}  —  ${e.count} score row(s), last ${e.last}`);

  console.log(`\n===== whiteboard names that MATCH a member but still have member_id=null rows — ${linkedButUnmigrated.length} =====`);
  for (const e of linkedButUnmigrated) console.log(`  ${e.name}  →  ${e.linkedMember}  (${e.count} row(s), last ${e.last})`);
}
main().catch(console.error);
