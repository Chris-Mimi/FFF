/**
 * Insert historical benchmark scores Chris dictates in chat (S437).
 *
 * Usage: npx tsx scripts/insert-benchmark-results.ts <batch.json>
 *
 * batch.json:
 *   { "benchmark": "Cindy",
 *     "entries": [ { "member": "<exact members.name>",
 *                    "scores": [["YYYY-MM-DD", "11+10", "Sc3", "Sc2", "Sc1"], ...] } ] }
 *
 * - Scalings are in the benchmark's movement order (Cindy: Pull-up, Push-up, Air Squat);
 *   missing = Rx. Result "10" = full rounds → stored "10+0".
 * - AMRAP only for now (result_value "R+r", reps_result = rounds — same as coach score entry).
 *   Other benchmark types throw until their format is checked.
 * - Resolves every member first and aborts before writing if any name isn't an exact single match.
 * - Insert-only; skips a member's existing result on the same date.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

type Score = [string, string, string?, string?, string?];
type Batch = { benchmark: string; entries: { member: string; scores: Score[] }[] };

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: npx tsx scripts/insert-benchmark-results.ts <batch.json>');
  const batch = JSON.parse(fs.readFileSync(file, 'utf8')) as Batch;

  const bw = await sb.from('benchmark_workouts').select('id,name,type').eq('name', batch.benchmark);
  if (bw.error) throw bw.error;
  if (bw.data.length !== 1) throw new Error(`Benchmark "${batch.benchmark}" matched ${bw.data.length} rows`);
  const bench = bw.data[0];
  if (bench.type !== 'AMRAP') throw new Error(`${bench.name} is ${bench.type} — only AMRAP is supported so far`);

  const ids = new Map<string, string>();
  for (const { member } of batch.entries) {
    const m = await sb.from('members').select('id').eq('name', member);
    if (m.error) throw m.error;
    if (m.data.length !== 1) throw new Error(`"${member}" matched ${m.data.length} members`);
    ids.set(member, m.data[0].id);
  }

  for (const { member, scores } of batch.entries) {
    const userId = ids.get(member)!;
    for (const [date, result, s1 = 'Rx', s2 = 'Rx', s3 = 'Rx'] of scores) {
      const match = /^(\d+)(?:\+(\d+))?$/.exec(result.trim());
      if (!match) throw new Error(`${member} ${date}: can't read result "${result}"`);
      const rounds = Number(match[1]);
      const reps = Number(match[2] ?? 0);

      const ex = await sb.from('benchmark_results').select('id,result_value')
        .eq('user_id', userId).eq('benchmark_id', bench.id).eq('result_date', date);
      if (ex.error) throw ex.error;
      if (ex.data.length) {
        console.log(`${member} ${date}: already has ${ex.data[0].result_value} — skipped`);
        continue;
      }

      const ins = await sb.from('benchmark_results').insert({
        user_id: userId, benchmark_id: bench.id, benchmark_name: bench.name, benchmark_type: bench.type,
        result_value: `${rounds}+${reps}`, reps_result: rounds,
        scaling_level: s1, scaling_level_2: s2, scaling_level_3: s3, result_date: date,
      }).select('id').single();
      if (ins.error) throw ins.error;
      console.log(`${member} ${date}: ${rounds}+${reps} ${s1}/${s2}/${s3} inserted`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
