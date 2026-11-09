/**
 * RM-testing name audit — every workout with an RM section must have "Testing"
 * in its name (Chris, S432: "BP Testing 5RM, OHP, PP, PJ, Pull-up").
 *
 * Flags a workout when its name has no "Testing" and either
 *   - a section holds a lift with `rm_test` set (Lifts modal RM test), or
 *   - section text mentions an RM ("5RM", "3 RM", "1rm") — listed separately,
 *     because text can mention an RM without it being a test (e.g. "@ 70% of 1RM").
 *
 *   npx tsx scripts/audit-rm-testing-names.ts [--since YYYY-MM-DD]
 *
 * Skips private sessions and Mimi's Turnen / Diapers & Dumbbells.
 */
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const args = process.argv.slice(2);
const sinceIdx = args.indexOf('--since');
const since = sinceIdx >= 0 ? args[sinceIdx + 1] : '1900-01-01';

const SKIP_TYPES = /turnen|diapers/i;
const RM_TEXT = /\d\s?rm\b/i;
const PERCENT_OF_RM = /%\s*(of\s*)?(\w+\s)?\d?\s?rm\b/i;

type Lift = { name?: string; rm_test?: string };
type Section = { type?: string; content?: string; lifts?: Lift[] };
type Wod = { id: string; workout_name: string | null; session_type: string | null; sections: Section[] | null };
type Hit = { name: string; type: string; why: string; dates: Set<string> };

async function main() {
  const lifts = new Map<string, Hit>();
  const text = new Map<string, Hit>();

  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('weekly_sessions')
      .select('date, is_private, wods!inner(id, workout_name, session_type, sections)')
      .gte('date', since)
      .order('date')
      .range(from, from + 999);
    if (error) throw new Error(`weekly_sessions: ${error.message}`);
    (data as unknown as Array<{ date: string; is_private: boolean | null; wods: Wod | Wod[] }>).forEach(s => {
      if (s.is_private) return;
      const wod = Array.isArray(s.wods) ? s.wods[0] : s.wods;
      if (!wod || SKIP_TYPES.test(wod.session_type ?? '')) return;
      const name = (wod.workout_name ?? '').trim();
      if (/testing/i.test(name)) return;
      const sections = wod.sections ?? [];

      const rmLifts = sections.flatMap(sec =>
        (sec.lifts ?? []).filter(l => l.rm_test).map(l => `${l.name} ${l.rm_test} (${sec.type})`));
      const add = (map: Map<string, Hit>, why: string) => {
        const key = `${name}::${wod.session_type}::${why}`;
        const hit = map.get(key) ?? { name: name || '(no name)', type: wod.session_type ?? '', why, dates: new Set<string>() };
        hit.dates.add(s.date);
        map.set(key, hit);
      };
      if (rmLifts.length) { add(lifts, rmLifts.join(', ')); return; }

      const rmLines = sections.flatMap(sec =>
        (sec.content ?? '').split('\n')
          .filter(line => RM_TEXT.test(line) && !PERCENT_OF_RM.test(line))
          .map(line => `${sec.type}: ${line.trim()}`));
      if (rmLines.length) add(text, rmLines.join(' | '));
    });
    if (data.length < 1000) break;
  }

  const print = (title: string, map: Map<string, Hit>) => {
    console.log(`\n=== ${title}: ${map.size} ===`);
    [...map.values()].sort((a, b) => a.name.localeCompare(b.name)).forEach(h => {
      const dates = [...h.dates].sort().join(', ');
      console.log(`- ${h.name}  [${h.type}]  (${dates})\n    ${h.why}`);
    });
  };
  print('RM-test lift, no "Testing" in name', lifts);
  print('RM in section text only (review — may not be a test)', text);
}

main().catch(e => { console.error(e); process.exit(1); });
