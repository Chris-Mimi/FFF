/**
 * Backup-gap recovery (S397) — Front Squat Testing (Week 8.2, 2026-02-18) +
 * Bench Press Testing (Week 9.1, 2026-02-23), transcribed from whiteboard photos.
 * Restores WSR (coach modal + leaderboard) + lift_records, INSERT-only, deduped.
 *
 *   npx tsx scripts/restore-wk8-9-backup-gap.ts        # dry-run
 *   npx tsx scripts/restore-wk8-9-backup-gap.ts --write # execute
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const WRITE = process.argv.includes('--write');

// section ids per WOD (confirmed from struct dump + surviving -content-0 rows)
const FS = {  // Front Squat Testing 3 & 1RM
  s3: 'section-1771425677698-content-0',
  s1: 'section-1771425697923-content-0',
  metcon: 'section-1771426279556-content-0',
  lift: 'Front Squat',
  // metcon Rx/Sc barbell load W/M
  presc: { Rx: { F: 25, M: 35 }, Sc1: { F: 20, M: 30 }, Sc2: { F: 15, M: 25 } } as Record<string, {F:number;M:number}>,
};
const BP = {  // Bench Press Testing 3rm & 1rm, KB Pull-through, Pistols
  s3: 'section-1771855854404-content-0',
  s1: 'section-1771855889808-content-0',
  metcon: 'section-1771856682950-content-0',
  lift: 'Bench Press',
};

type Row = {
  name: string; date: string; g: 'F'|'M';
  three: number|null; one: number|null;   // RM lift weights
  rr: string|null;                          // metcon rounds+reps e.g. '6+6' | '8' | null
  load: number|null; scaling: string|null;  // metcon weight_result + scaling_level
  note?: string;
};

// ── Front Squat Testing — 2026-02-18 (photo "2026 Week 8.2") ──
// metcon load: number = kg used; 'Rx'→gender presc; scaling derived from tier cleared.
const FS_ROWS: Row[] = [
  // 17:15
  { name:'Claudia Herrmann', date:'2026-02-18', g:'F', three:55,  one:55,  rr:'8',    load:25,   scaling:'Rx' },
  { name:'Sabrina Lucas',    date:'2026-02-18', g:'F', three:45,  one:45,  rr:null,   load:null, scaling:null, note:'metcon R+R blank on board' },
  { name:'Leah Mesche',      date:'2026-02-18', g:'F', three:30,  one:30,  rr:'6+6',  load:10,   scaling:'Sc3', note:'10kg below Sc2(15)' },
  { name:'Lena Jähn',        date:'2026-02-18', g:'F', three:45,  one:45,  rr:'8',    load:17.5, scaling:'Sc2', note:'17.5kg→Sc2' },
  { name:'Steven Zaft',      date:'2026-02-18', g:'M', three:90,  one:100, rr:'5+2',  load:15,   scaling:'Sc3', note:'15kg below Sc2(25)' },
  { name:'Wayne Lucas',      date:'2026-02-18', g:'M', three:null,one:null,rr:'8',    load:35,   scaling:'Rx', note:'no FS lifts on board (dashes)' },
  { name:'Paul Bielenski',   date:'2026-02-18', g:'M', three:100, one:110, rr:'6+14', load:35,   scaling:'Rx' },
  { name:'Miriam Jacht',     date:'2026-02-18', g:'F', three:37.5,one:40,  rr:'6',    load:17.5, scaling:'Sc2', note:'17.5kg→Sc2' },
  // 18:30
  { name:'Anja Götte',       date:'2026-02-18', g:'F', three:45,  one:45,  rr:'9',    load:20,   scaling:'Sc1' },
  { name:'Soledad',          date:'2026-02-18', g:'F', three:30,  one:32.5,rr:null,   load:null, scaling:null, note:'metcon R+R blank on board' },
  { name:'Tobias Götte',     date:'2026-02-18', g:'M', three:100, one:111, rr:'9+10', load:35,   scaling:'Rx' },
  { name:'Patrik Gruber',    date:'2026-02-18', g:'M', three:90,  one:90,  rr:'6+10', load:35,   scaling:'Rx' },
];

// ── Bench Press Testing — 2026-02-23 (photo "2026 Week 9.1") ──
// metcon: load = KB Pull-through weight (number on board; 'Rx'→left null, unknown Rx kg);
// scaling = Pistol (PS) tier. 'Sc1-2' stored as 'Sc2' (flagged).
const BP_ROWS: Row[] = [
  // 17:15
  { name:'Leah Mesche',       date:'2026-02-23', g:'F', three:25,  one:27.5, rr:'3+18', load:null, scaling:'Sc1', note:'KB=Rx (load unknown)' },
  { name:'Sabrina Lucas',     date:'2026-02-23', g:'F', three:37.5,one:45,   rr:'4+20', load:5,    scaling:'Sc2', note:'PS "Sc1-2"→Sc2' },
  { name:'Michael Junkes',    date:'2026-02-23', g:'M', three:50,  one:60,   rr:'4+20', load:16,   scaling:'Sc3' },
  { name:'Dimitar Peresyov',  date:'2026-02-23', g:'M', three:80,  one:100,  rr:'4+22', load:null, scaling:'Sc2', note:'KB=Rx (load unknown)' },
  { name:'Paul Bielenski',    date:'2026-02-23', g:'M', three:80,  one:80,   rr:'5+15', load:null, scaling:'Rx', note:'KB=Rx (load unknown)' },
  { name:'Zoran Vrbanic',     date:'2026-02-23', g:'M', three:75,  one:80,   rr:'5+15', load:null, scaling:'Rx', note:'KB=Rx (load unknown)' },
  { name:'Lukas Simnacher',   date:'2026-02-23', g:'M', three:80,  one:100,  rr:'3+23', load:null, scaling:'Sc2', note:'KB=Rx (load unknown)' },
  // 18:30
  { name:'Kathrin Mühlen',    date:'2026-02-23', g:'F', three:45,  one:50,   rr:'5+19', load:null, scaling:'Rx', note:'KB=Rx (load unknown)' },
  { name:'Dinny Braatz',      date:'2026-02-23', g:'F', three:30,  one:37.5, rr:'6+5',  load:null, scaling:'Rx', note:'KB=Rx (load unknown)' },
  { name:'Markus Fischer',    date:'2026-02-23', g:'M', three:80,  one:100,  rr:'3',    load:null, scaling:'Sc2', note:'PS "Sc1-2"→Sc2; KB=Rx' },
  { name:'Denis Koffler',     date:'2026-02-23', g:'M', three:65,  one:85,   rr:'3+20', load:null, scaling:'Sc3', note:'KB=Rx (load unknown)' },
  { name:'Daniel Braatz',     date:'2026-02-23', g:'M', three:50,  one:60,   rr:'4+26', load:20,   scaling:'Sc2' },
  { name:'Justine Baumstark', date:'2026-02-23', g:'F', three:35,  one:40,   rr:'3+10', load:8,    scaling:'Sc4' },
];

const parseRR = (rr: string): { rnd: number; rep: number } => {
  const [a, b] = rr.split('+');
  return { rnd: parseInt(a, 10), rep: b ? parseInt(b, 10) : 0 };
};
const epley = (w: number, reps: number) => Math.round(w * (1 + reps / 30) * 100) / 100;

async function run(cfg: typeof FS | typeof BP, rows: Row[], label: string) {
  console.log(`\n════ ${label} ════`);
  // resolve members
  const names = [...new Set(rows.map(r => r.name))];
  const { data: mem } = await s.from('members').select('id, name, gender').in('name', names);
  const byName = new Map((mem ?? []).map(m => [m.name, m]));

  const wsrIns: Record<string, unknown>[] = [];
  const lrIns: Record<string, unknown>[] = [];

  for (const r of rows) {
    const m = byName.get(r.name);
    if (!m) { console.log(`  ⚠️  NO MEMBER: ${r.name}`); continue; }
    const uid = m.id;
    const flag = r.note ? `  ⚠️ ${r.note}` : '';
    console.log(`  ${r.name.padEnd(20)} 3RM=${r.three ?? '-'} 1RM=${r.one ?? '-'} metcon=${r.rr ?? '-'} load=${r.load ?? '-'} ${r.scaling ?? ''}${flag}`);

    if (r.three != null) {
      wsrIns.push({ user_id: uid, member_id: uid, wod_id: null, section_id: cfg.s3, workout_date: r.date, weight_result: r.three });
      lrIns.push({ user_id: uid, lift_name: cfg.lift, weight_kg: r.three, reps: 3, calculated_1rm: epley(r.three, 3), rep_max_type: '3RM', lift_date: r.date });
    }
    if (r.one != null) {
      wsrIns.push({ user_id: uid, member_id: uid, wod_id: null, section_id: cfg.s1, workout_date: r.date, weight_result: r.one });
      lrIns.push({ user_id: uid, lift_name: cfg.lift, weight_kg: r.one, reps: 1, calculated_1rm: null, rep_max_type: '1RM', lift_date: r.date });
    }
    if (r.rr != null) {
      const { rnd, rep } = parseRR(r.rr);
      wsrIns.push({ user_id: uid, member_id: uid, wod_id: null, section_id: cfg.metcon, workout_date: r.date, rounds_result: rnd, reps_result: rep, weight_result: r.load, scaling_level: r.scaling });
    }
  }
  // fill wod_id from the athlete's confirmed session on that date (section→wod is per-session copy)
  // Resolve wod_id per (date) via weekly_sessions the member is booked on.
  return { cfg, wsrIns, lrIns };
}

async function fillWodIds(pending: { cfg: typeof FS | typeof BP; wsrIns: Record<string, unknown>[]; lrIns: Record<string, unknown>[] }[]) {
  // Resolve wod_id ONCE per (user, date, RM-lift section) and cache — every row for
  // that athlete/date belongs to the same session copy.
  const cache = new Map<string, string | null>();
  const resolve = async (uid: string, date: string, rmSection: string): Promise<string | null> => {
    const key = `${uid}|${date}`;
    if (cache.has(key)) return cache.get(key)!;
    const { data: bk } = await s.from('bookings')
      .select('status, is_og, is_trial, weekly_sessions!inner(date, workout_id)')
      .eq('member_id', uid);
    let wodId: string | null = null;
    for (const b of (bk ?? []) as unknown as { status:string; is_og:boolean; is_trial:boolean; weekly_sessions:{date:string; workout_id:string} }[]) {
      if (b.status !== 'confirmed' || b.is_og || b.is_trial) continue;
      if (b.weekly_sessions?.date !== date) continue;
      const { data: wod } = await s.from('wods').select('sections').eq('id', b.weekly_sessions.workout_id).single();
      if (JSON.stringify(wod?.sections ?? '').includes(rmSection)) { wodId = b.weekly_sessions.workout_id; break; }
    }
    cache.set(key, wodId);
    return wodId;
  };
  for (const p of pending) {
    const rmSection = (p.cfg.s3 as string).replace('-content-0', '');
    for (const w of p.wsrIns) {
      w.wod_id = await resolve(w.user_id as string, w.workout_date as string, rmSection);
      if (!w.wod_id) console.log(`  ⚠️  no wod_id for ${(w.user_id as string).slice(0,8)} ${w.workout_date}`);
    }
  }
}

async function main() {
  const fs = await run(FS, FS_ROWS, 'FRONT SQUAT — 2026-02-18 (Week 8.2)');
  const bp = await run(BP, BP_ROWS, 'BENCH PRESS — 2026-02-23 (Week 9.1)');
  await fillWodIds([fs, bp]);

  const allWsr = [...fs.wsrIns, ...bp.wsrIns].filter(w => w.wod_id);
  const allLr = [...fs.lrIns, ...bp.lrIns];
  console.log(`\nPlanned inserts: ${allWsr.length} WSR, ${allLr.length} lift_records.`);

  if (!WRITE) { console.log('\n(dry-run — pass --write to execute)'); return; }

  // dedup WSR: skip if a row already exists for user+section+date
  const wsrFinal: Record<string, unknown>[] = [];
  for (const w of allWsr) {
    const { data: ex } = await s.from('wod_section_results').select('id')
      .eq('user_id', w.user_id as string).eq('section_id', w.section_id as string).eq('workout_date', w.workout_date as string).limit(1);
    if (ex?.length) { console.log(`  skip existing WSR ${(w.user_id as string).slice(0,8)} ${w.section_id}`); continue; }
    wsrFinal.push(w);
  }
  // dedup lift_records: skip if user+lift+rep_max_type+date exists
  const lrFinal: Record<string, unknown>[] = [];
  for (const l of allLr) {
    const { data: ex } = await s.from('lift_records').select('id')
      .eq('user_id', l.user_id as string).eq('lift_name', l.lift_name as string)
      .eq('rep_max_type', l.rep_max_type as string).eq('lift_date', l.lift_date as string).limit(1);
    if (ex?.length) { console.log(`  skip existing lift_record ${(l.user_id as string).slice(0,8)} ${l.lift_name} ${l.rep_max_type}`); continue; }
    lrFinal.push(l);
  }

  if (wsrFinal.length) {
    const { error } = await s.from('wod_section_results').insert(wsrFinal);
    console.log(error ? `WSR insert ERROR: ${error.message}` : `✅ inserted ${wsrFinal.length} WSR`);
  }
  if (lrFinal.length) {
    const { error } = await s.from('lift_records').insert(lrFinal);
    console.log(error ? `lift_records insert ERROR: ${error.message}` : `✅ inserted ${lrFinal.length} lift_records`);
  }
}
main().catch(e => { console.error(e); process.exit(2); });
