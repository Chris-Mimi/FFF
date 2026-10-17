/**
 * S421 — one-off import of the Aids note "Endurance scores for reference" into
 * the Toolkit → Pacing tables (pacing_tasks + pacing_scores).
 *
 *   npx tsx scripts/import-pacing-from-note.ts            # dry run, prints what it would write
 *   npx tsx scripts/import-pacing-from-note.ts --commit   # writes (refuses if pacing_tasks is not empty)
 *
 * Rules agreed with Chris:
 * - A date on a line applies to that line and every line below it in the same
 *   section until the next date. A date in the section header is the default.
 * - Two times on a line = 1st round + last round.
 * - Names map to members (explicit table below). Ex-athletes with no member
 *   record are kept as `legacy_name` until Chris deletes them.
 * The note itself is left untouched.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true } as never);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const COMMIT = process.argv.includes('--commit');

const NAME_TO_MEMBER: Record<string, string> = {
  Claudia: 'Claudia Herrmann', Chris: 'Chris Hiles', 'JürgenB': 'Jürgen Bizjak', TobiasG: 'Tobias Götte',
  ThomasS: 'Thomas Spegele', Lena: 'Lena Jähn', Anneke: 'Anneke Spegele', Valerie: 'Valerie Mesenburg',
  Wayne: 'Wayne Lucas', LukasS: 'Lukas Simnacher', Nikolina: 'Nikolina Vlasalija', Niko: 'Nikolina Vlasalija',
  MichiS: 'Michael Städele', Dani: 'Daniela Simm', Irene: 'Irene Koffler', Dimi: 'Dimitar Peresyov',
  Paul: 'Paul Bielenski', Markus: 'Markus Fischer', Franzi: 'Franziska Herndorf', Kathrin: 'Kathrin Mühlen',
  Julia: 'Julia Weihe', Justine: 'Justine Baumstark', Amelie: 'Amelie Kirch', Sonja: 'Sonja Hujo',
  Steven: 'Steven Zaft', Stefan: 'Stefan G', ChristianM: 'Christian Müller', Toni: 'Toni Seitz',
  Jan: 'Jan Huelbig', Magdalena: 'Magdalena Gebska', Nicole: 'Nicole Rauh', Mimi: 'Mimi Hiles',
  Teemu: 'Teemu Lian Geisler',
};
const LEGACY = new Set(['Alexander', 'Andy', 'Anni', 'MichaelB', 'Lukas']);

interface TaskDef {
  key: string; // substring of the note's section header
  movement: string; // Exercise Library name
  amount?: string; amountF?: string; amountM?: string;
  category: string; note?: string; date?: string;
}
const TASKS: TaskDef[] = [
  { key: '30 x Up-Down', movement: 'Up-Down', amount: '30 reps', category: 'Bodyweight' },
  { key: '40 x Up-Down', movement: 'Up-Down', amount: '40 reps', category: 'Bodyweight' },
  { key: 'Accumulated Parallettes L-Sit Hold', movement: 'Parallettes L-Sit Hold', amount: 'accumulated', category: 'Holds', note: 'Time taken to accumulate the hold — lower is better' },
  { key: 'C2 SkiErg 500m', movement: 'C2 SkiErg', amount: '500 m', category: 'Ergs' },
  { key: 'C2 SkiErg ♀800m', movement: 'C2 SkiErg', amountF: '800 m', amountM: '1000 m', category: 'Ergs' },
  { key: 'C2 Rower ♀800m', movement: 'C2 Rower', amountF: '800 m', amountM: '1000 m', category: 'Ergs' },
  { key: 'Airbike', movement: 'Airbike', amountF: '1600 m', amountM: '2000 m', category: 'Ergs' },
  { key: '400 metres run', movement: 'Run 400m', category: 'Runs' },
  { key: '1600 metres run', movement: 'Run 1600m', category: 'Runs', note: '2nd run of the WOD', date: '2023-03-18' },
  { key: '100 metres Bear Crawl', movement: 'Bear Crawl Forwards', amount: '100 m', category: 'Bodyweight', note: '5 × (10 m forwards + 10 m backwards)' },
  { key: 'Burpee Broad Jump 40', movement: 'Burpee Broad Jump', amount: '40 m', category: 'Bodyweight' },
  { key: 'Sandbag Walking Lunge 40', movement: 'Sandbag Walking Lunge', amount: '40 m', category: 'Lunges & carries' },
  { key: 'Walking Lunges 60', movement: 'Lunge Walking', amount: '60 m', category: 'Lunges & carries', date: '2023-03-25' },
];

const toIso = (d: string) => {
  const m = d.match(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})/)!;
  return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
};
const secs = (t: string) => { const [m, s] = t.split(':').map(Number); return m * 60 + s; };

async function main() {
  const note = await supabase.from('programming_notes').select('content').ilike('title', '%endurance scores%').single();
  if (note.error) throw note.error;

  const members: { id: string; name: string; display_name: string | null }[] = [];
  for (let f = 0; ; f += 1000) {
    const r = await supabase.from('members').select('id, name, display_name').range(f, f + 999);
    if (r.error) throw r.error;
    members.push(...r.data);
    if (r.data.length < 1000) break;
  }
  const memberId = (full: string) => {
    const hits = members.filter(m => m.name === full || m.display_name === full);
    if (hits.length !== 1) throw new Error(`Member "${full}" matched ${hits.length} rows`);
    return hits[0].id;
  };

  const exercises: { id: string; name: string; display_name: string | null }[] = [];
  for (let f = 0; ; f += 1000) {
    const r = await supabase.from('exercises').select('id, name, display_name').range(f, f + 999);
    if (r.error) throw r.error;
    exercises.push(...r.data);
    if (r.data.length < 1000) break;
  }
  const exerciseId = (name: string) => {
    const hits = exercises.filter(e => (e.display_name || e.name) === name);
    if (hits.length !== 1) throw new Error(`Exercise "${name}" matched ${hits.length} rows`);
    return hits[0].id;
  };

  // Parse sections
  type Score = { name: string; seconds: number; position: string | null; scaling: string | null; date: string | null; note: string | null };
  const parsed = new Map<TaskDef, Score[]>();
  const problems: string[] = [];
  let current: TaskDef | null = null;
  let carry: string | null = null;
  for (const raw of note.data.content.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('**')) {
      current = TASKS.find(t => line.includes(t.key)) ?? null;
      if (!current && parsed.size) problems.push(`Unmapped section: ${line}`);
      carry = current?.date ?? null;
      if (current) parsed.set(current, []);
      continue;
    }
    if (!current) continue;
    const m = line.match(/^([A-Za-zÀ-ÿ]+)\s*\(?(\d{1,2}[./]\d{1,2}[./]\d{2,4})?\)?\s*:\s*(Rx|Sc)?\s*-?\s*(.*)$/);
    if (!m) { problems.push(`Unreadable line in "${current.key}": ${line}`); continue; }
    const [, name, date, scaling, rest] = m;
    if (date) carry = toIso(date);
    const times: string[] = rest.match(/\d{1,2}:\d{2}/g) ?? [];
    const twoRounds = times.length === 2 || /\?/.test(rest);
    times.forEach((t, i) => parsed.get(current!)!.push({
      name, seconds: secs(t), scaling: scaling ?? null, date: carry,
      position: twoRounds ? (i === 0 ? 'first' : 'last') : null,
      note: null,
    }));
    if (/\?/.test(rest)) problems.push(`Skipped missing last-round time: ${line}`);
  }

  // Report
  let total = 0;
  for (const def of TASKS) {
    const rows = parsed.get(def);
    if (!rows) { problems.push(`Section not found in note: ${def.key}`); continue; }
    total += rows.length;
    const amt = def.amountF ? `♀ ${def.amountF} · ♂ ${def.amountM}` : def.amount ?? '';
    console.log(`\n${def.movement} ${amt}  (${rows.length} scores)`);
    for (const r of rows) {
      const who = NAME_TO_MEMBER[r.name] ?? (LEGACY.has(r.name) ? `${r.name} [ex-athlete]` : `?? ${r.name}`);
      if (!NAME_TO_MEMBER[r.name] && !LEGACY.has(r.name)) problems.push(`Unknown name: ${r.name}`);
      console.log(`  ${who.padEnd(24)} ${String(Math.floor(r.seconds / 60)) + ':' + String(r.seconds % 60).padStart(2, '0')}  ${r.position ?? '-'}  ${r.scaling ?? '-'}  ${r.date ?? '-'}`);
    }
  }
  console.log(`\nTOTAL: ${parsed.size} tasks, ${total} scores`);
  if (problems.length) console.log('\nNOTES:\n  ' + problems.join('\n  '));
  if (problems.some(p => p.startsWith('Unknown') || p.startsWith('Unreadable') || p.startsWith('Unmapped') || p.startsWith('Section not found'))) {
    console.log('\nBlocking problems above — nothing written.');
    return;
  }
  if (!COMMIT) { console.log('\nDry run. Re-run with --commit to write.'); return; }

  const existing = await supabase.from('pacing_tasks').select('id', { count: 'exact', head: true });
  if (existing.error) throw existing.error;
  if ((existing.count ?? 0) > 0) { console.log('pacing_tasks is not empty — refusing to import twice.'); return; }

  for (const def of TASKS) {
    const rows = parsed.get(def)!;
    const ins = await supabase.from('pacing_tasks').insert({
      exercise_id: exerciseId(def.movement), movement: def.movement,
      amount: def.amountF ? null : def.amount ?? null,
      amount_female: def.amountF ?? null, amount_male: def.amountM ?? null,
      category: def.category, note: def.note ?? null,
    }).select('id').single();
    if (ins.error) throw ins.error;
    const scoreRows = rows.map(r => ({
      task_id: ins.data.id,
      member_id: NAME_TO_MEMBER[r.name] ? memberId(NAME_TO_MEMBER[r.name]) : null,
      legacy_name: NAME_TO_MEMBER[r.name] ? null : r.name,
      time_seconds: r.seconds, position: r.position, scaling: r.scaling, score_date: r.date, note: r.note,
    }));
    const s = await supabase.from('pacing_scores').insert(scoreRows);
    if (s.error) throw s.error;
    console.log(`Wrote ${def.movement} (${scoreRows.length})`);
  }
  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
