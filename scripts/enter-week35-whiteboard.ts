/**
 * Week 35 (2026-08-24 → 2026-08-28) whiteboard score entry.
 *
 * Boards: `2026 Week 35.1` + `2026 Week 35.2` in `whiteboard_photos`.
 * Follows memory-bank/whiteboard-score-entry-protocol.md — replicates exactly what the
 * coach results modal writes, including the `-content-0` section_id suffix.
 *
 * Chris verified the transcription before this ran (S410). Field mappings he decided:
 *  - 28.08: reps = S2OH + DUs summed; max_time (time_result) = bar hang + HS hold summed.
 *  - 26.08 18:30: the three station scores are summed into the rounds field.
 *  - 24.08: everyone Rx on the Russian Twist; Michael W's "15kg" is the barbell load.
 *  - 26.08 17:15: everyone Rx on the Handstand Hold; the written Rx/Sc is the DU scaling.
 *
 * Run: npx tsx scripts/enter-week35-whiteboard.ts        (dry run)
 *      npx tsx scripts/enter-week35-whiteboard.ts --write
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const WRITE = process.argv.includes('--write');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const secs = (t: string) => { const [m, s] = t.split(':').map(Number); return m * 60 + s; };
const mmss = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
const sumTime = (...t: string[]) => mmss(t.reduce((a, x) => a + secs(x), 0));

type Row = {
  who: string;                 // whiteboard_name or members.name as it appears on the booking
  rounds?: number; reps?: number; time?: string;
  load?: number; load2?: number;
  sc?: string; sc2?: string; sc3?: string;
  modified?: string;
};
type Block = { key: string; when: string; sessionId: string; wodId: string; sectionId: string; date: string; rows: Row[] };

const BLOCKS: Block[] = [
  // ── Mon 24.08 — Snatch Drill 20min AMRAP ────────────────────────────────────
  { key: 'A  24.08 10:00', when: '10:00', date: '2026-08-24',
    sessionId: 'b1a371e3-2b5f-4f85-ad03-def27f889cc8', wodId: 'bfcfcc39-9145-4178-a060-e1b77a9a7518',
    sectionId: 'section-1783255039024-4', rows: [
    { who: 'PaulB',    rounds: 4, reps: 200, sc: 'Rx' },
    { who: 'MichaelS', rounds: 5, reps: 270, sc: 'Rx' },
    { who: 'AnneS',    rounds: 4, reps: 400, sc: 'Rx' },
    { who: 'Miriam',   rounds: 4, reps: 420, sc: 'Rx', modified: 'Barbell Row + DL' },
    { who: 'JuliaW',   rounds: 4, reps: 400, sc: 'Rx' },
    { who: 'Daniela',  rounds: 4, reps: 400, sc: 'Rx' },
    { who: 'Mimi',     rounds: 5, reps: 40,  sc: 'Rx' },
  ]},
  { key: 'B  24.08 18:30', when: '18:30', date: '2026-08-24',
    sessionId: '394802a1-0e1a-4cf6-a33d-fa08c28f219e', wodId: '50db3d37-e4d6-45d4-89db-ea9ac76d0ac3',
    sectionId: 'section-1783255039024-4', rows: [
    { who: 'Anneke',     rounds: 5, reps: 70,  sc: 'Rx' },
    { who: 'Kathrin',    rounds: 6, reps: 100, sc: 'Rx' },
    { who: 'ChristianT', rounds: 4, reps: 420, sc: 'Rx' },
    { who: 'MichaelW',   rounds: 6, reps: 100, sc: 'Rx', load: 15 },
    { who: 'Senol',      rounds: 4, reps: 410, sc: 'Rx' },
    { who: 'ThomasS',    rounds: 5, reps: 400, sc: 'Rx' },
    { who: 'TobiasG',    rounds: 4, reps: 400, sc: 'Rx' },
    { who: 'Steven',     rounds: 3, reps: 410, sc: 'Rx' },
    { who: 'Chris',      rounds: 5, reps: 110, sc: 'Rx' },
  ]},

  // ── Wed 26.08 09:30 — Weekend WOD 26.10 ─────────────────────────────────────
  { key: 'C  26.08 09:30', when: '09:30', date: '2026-08-26',
    sessionId: 'e4666ecb-10be-48c0-90a5-9c31e43fc0bb', wodId: '05ad23f4-e928-4e1d-baad-df0d8e2512b7',
    sectionId: 'section-1776059140690-4', rows: [
    { who: 'MichaelS', rounds: 5, reps: 38, sc: 'Rx', load: 80, sc3: 'Rx'  },
    { who: 'Daniela',  rounds: 4, reps: 20, sc: 'Rx', load: 60, sc3: 'Sc1' },
    { who: 'Miriam',   rounds: 4, reps: 23, sc: 'Rx', load: 60, sc3: 'Sc1' },
    { who: 'Mimi',     rounds: 5, reps: 10, sc: 'Rx', load: 60, sc3: 'Sc1' },
  ]},

  // ── Wed 26.08 17:15 — Hold + MetCon, 3 × 7min AMRAP (three sections) ────────
  { key: 'D1 26.08 17:15  Rings+WB Box+Row', when: '17:15', date: '2026-08-26',
    sessionId: 'e1c7d6df-c3e5-4b55-bfb4-8d1559b86aae', wodId: '2cfde81e-3aea-4234-9c92-eac2f108ff9f',
    sectionId: 'section-1783856937312-4', rows: [
    { who: 'Sabrina', rounds: 2, reps: 20, sc: 'Sc1', load: 3 },
    { who: 'Steven',  rounds: 2, reps: 50, sc: 'Rx',  load: 9 },
    { who: 'Wayne',   rounds: 3, reps: 30, sc: 'Rx',  load: 9 },
    { who: 'Chris',   rounds: 2, reps: 50, sc: 'Rx',  load: 9 },
  ]},
  { key: 'D2 26.08 17:15  HS+DUs+Airbike', when: '17:15', date: '2026-08-26',
    sessionId: 'e1c7d6df-c3e5-4b55-bfb4-8d1559b86aae', wodId: '2cfde81e-3aea-4234-9c92-eac2f108ff9f',
    sectionId: 'section-1784124148715', rows: [
    { who: 'Sabrina', rounds: 3, reps: 9, sc: 'Rx', sc2: 'Sc1' },
    { who: 'Steven',  rounds: 2, reps: 0, sc: 'Rx', sc2: 'Sc1' },
    { who: 'Wayne',   rounds: 5, reps: 0, sc: 'Rx', sc2: 'Rx'  },
    { who: 'Chris',   rounds: 3, reps: 0, sc: 'Rx', sc2: 'Rx'  },
  ]},
  { key: 'D3 26.08 17:15  Plate+DBT+Ski', when: '17:15', date: '2026-08-26',
    sessionId: 'e1c7d6df-c3e5-4b55-bfb4-8d1559b86aae', wodId: '2cfde81e-3aea-4234-9c92-eac2f108ff9f',
    sectionId: 'section-1784124188874', rows: [
    { who: 'Sabrina', rounds: 2, reps: 3  },                      // loads left blank — see report
    { who: 'Steven',  rounds: 1, reps: 0  },                      // loads left blank — see report
    { who: 'Wayne',   rounds: 1, reps: 34, load: 10, load2: 15 },
    { who: 'Chris',   rounds: 1, reps: 38, load: 10, load2: 15 },
  ]},

  // ── Wed 26.08 18:30 — 3-station rounds (three stations summed) ──────────────
  { key: 'E  26.08 18:30', when: '18:30', date: '2026-08-26',
    sessionId: 'def17b97-d308-4df9-bd54-4c6e04ae49e6', wodId: '9f5bd2c9-448f-40a6-99c2-5c9f329d1a96',
    sectionId: 'section-1780825797640-4', rows: [
    { who: 'AnjaG',          rounds: 10 + 13 + 6, sc: 'Sc1' },
    { who: 'Carla Courtois', rounds: 9 + 10 + 5,  sc: 'Sc1', load: 12 },
    { who: 'ChristianT',     rounds: 8 + 10 + 8,  sc: 'Rx'  },
    { who: 'Senol',          rounds: 7 + 17 + 7,  sc: 'Sc1', load: 16 },
    { who: 'ThomasS',        rounds: 11 + 12 + 9, sc: 'Rx'  },
    { who: 'TobiasG',        rounds: 10 + 11 + 8, sc: 'Rx'  },
  ]},

  // ── Fri 28.08 — S2OH 32min AMRAP (reps + times summed per Chris) ────────────
  { key: 'F  28.08 09:00', when: '09:00', date: '2026-08-28',
    sessionId: '0abdee89-161f-4b25-b3e7-955ae8606849', wodId: 'bd9a99c6-c264-4f60-aa9f-dc878b32b282',
    sectionId: 'section-1787859374110', rows: [
    { who: 'ChristianM', load: 43,   reps: 44 + 128, time: sumTime('3:56', '2:00'), sc: 'Sc1', sc2: 'Rx'  },
    { who: 'LukasS',     load: 43,   reps: 38 + 66,  time: sumTime('3:15', '2:15'), sc: 'Rx',  sc2: 'Rx'  },
    { who: 'Miriam',     load: 30,   reps: 26 + 60,  time: sumTime('3:30', '1:45'), sc: 'Sc1', sc2: 'Sc1' },
    { who: 'JuliaW',     load: 15,   reps: 55 + 190, time: sumTime('2:23', '1:57'), sc: 'Sc1', sc2: 'Sc1' },
    { who: 'Valerie',    load: 25,   reps: 41 + 246, time: sumTime('3:55', '3:04'), sc: 'Sc1', sc2: 'Sc1' },
    { who: 'Mimi',       load: 30,   reps: 43 + 104, time: sumTime('4:20', '3:50'), sc: 'Rx',  sc2: 'Rx'  },
  ]},
  { key: 'G  28.08 17:15', when: '17:15', date: '2026-08-28',
    sessionId: 'ad45617f-372d-49c8-992a-18ddd48a7c23', wodId: 'd4e3c77e-681d-418b-8ce4-70da5867f807',
    sectionId: 'section-1787859374110', rows: [
    { who: 'AnjaG',      load: 25,   reps: 40 + 55,  time: sumTime('4:30', '4:40'), sc: 'Rx', sc2: 'Rx'  },
    // Martina — Chris is entering this row manually (4:70 hang, 15-or-13 load, Lunge x40 for DUs)
    // Justine / Daniela Struben — ditto + smiley on the board, took part, no score recorded
    { who: 'Daniela',    load: 30,   reps: 43 + 72,  time: sumTime('2:07', '1:14'), sc: 'Rx', sc2: 'Rx'  },
    { who: 'Anna Kr',    load: 22.5, reps: 24,       time: sumTime('2:13', '1:42'),            sc2: 'Sc1' },
    { who: 'PaulB',      load: 43,   reps: 53 + 38,  time: sumTime('1:55', '2:55'), sc: 'Rx', sc2: 'Rx'  },
    { who: 'Steven',     load: 35,   reps: 18 + 15,  time: sumTime('4:10', '0:34'), sc: 'Rx', sc2: 'Rx'  },
    { who: 'TobiasG',    load: 43,   reps: 52 + 13,  time: sumTime('3:32', '2:30'), sc: 'Rx', sc2: 'Rx'  },
    { who: 'ChristianT', load: 30,   reps: 44 + 8,   time: sumTime('2:30', '2:40'), sc: 'Rx', sc2: 'Sc1' },
    { who: 'Wayne',      load: 43,   reps: 43 + 248, time: sumTime('3:40', '3:00'), sc: 'Rx', sc2: 'Rx'  },
    { who: 'Chris',      load: 43,   reps: 37 + 31,  time: sumTime('2:40', '2:53'), sc: 'Rx', sc2: 'Rx'  },
  ]},
];

(async () => {
  console.log(WRITE ? '=== WRITING ===\n' : '=== DRY RUN (pass --write to commit) ===\n');

  // Resolve every athlete through the session's own bookings — guarantees they are booked
  // and that the whiteboard alias maps to exactly one member (protocol step 4).
  const sessionIds = [...new Set(BLOCKS.map(b => b.sessionId))];
  const { data: bookings, error: be } = await sb.from('bookings')
    .select('session_id, member_id, status').in('session_id', sessionIds);
  if (be) throw new Error(`bookings: ${be.message}`);
  const { data: members, error: me } = await sb.from('members')
    .select('id, name, whiteboard_name, email').in('id', [...new Set((bookings ?? []).map(b => b.member_id))]);
  if (me) throw new Error(`members: ${me.message}`);
  const mById = new Map((members ?? []).map(m => [m.id, m]));

  // user_id resolution mirrors the save route: members.email → auth user id
  const { data: authList } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const userIdByEmail = new Map((authList?.users ?? []).filter(u => u.email).map(u => [u.email!, u.id]));

  const resolve = (sessionId: string, who: string) => {
    const hits = (bookings ?? [])
      .filter(b => b.session_id === sessionId && b.status === 'confirmed')
      .map(b => mById.get(b.member_id))
      .filter(m => m && ((m.whiteboard_name ?? m.name) === who || m.name === who));
    if (hits.length !== 1) throw new Error(`"${who}" resolved to ${hits.length} confirmed bookings in ${sessionId}`);
    return hits[0]!;
  };

  const records: Record<string, unknown>[] = [];
  for (const b of BLOCKS) {
    console.log(`── ${b.key}  (${b.rows.length} rows)`);
    for (const r of b.rows) {
      const m = resolve(b.sessionId, r.who);
      const rec = {
        wod_id: b.wodId,
        workout_date: b.date,
        member_id: m.id,
        user_id: (m.email && userIdByEmail.get(m.email)) || null,
        whiteboard_name: null,
        section_id: `${b.sectionId}-content-0`,   // ⚠️ the suffix the leaderboard matches on
        scaling_level: r.sc ?? null,
        scaling_level_2: r.sc2 ?? null,
        scaling_level_3: r.sc3 ?? null,
        track: null,
        time_result: r.time ?? null,
        reps_result: r.reps ?? null,
        weight_result: r.load ?? null,
        weight_result_2: r.load2 ?? null,
        weight_result_3: null,
        rounds_result: r.rounds ?? null,
        calories_result: null,
        metres_result: null,
        task_completed: null,
        dnf: false,
        modified: !!r.modified,
        modified_note: r.modified ?? null,
        updated_at: new Date().toISOString(),
      };
      records.push(rec);
      console.log(`   ${m.name.padEnd(22)} rounds=${String(rec.rounds_result ?? '-').padEnd(4)} reps=${String(rec.reps_result ?? '-').padEnd(5)} time=${String(rec.time_result ?? '-').padEnd(6)} load=${String(rec.weight_result ?? '-').padEnd(5)} load2=${String(rec.weight_result_2 ?? '-').padEnd(4)} sc=${rec.scaling_level ?? '-'}/${rec.scaling_level_2 ?? '-'}/${rec.scaling_level_3 ?? '-'}${rec.modified ? `  MOD: ${rec.modified_note}` : ''}`);
    }
  }
  console.log(`\nTotal rows: ${records.length}`);
  const noUser = records.filter(r => !r.user_id);
  if (noUser.length) console.log(`⚠️  ${noUser.length} rows without a user_id (leaderboard needs it)`);

  if (!WRITE) { console.log('\nDry run only — nothing written.'); return; }

  // INSERT-only, deduped by the natural key (protocol: never bulk-overwrite live data)
  const { data: existing } = await sb.from('wod_section_results')
    .select('wod_id, section_id, member_id, workout_date').in('wod_id', [...new Set(BLOCKS.map(b => b.wodId))]);
  const seen = new Set((existing ?? []).map(e => `${e.wod_id}|${e.section_id}|${e.member_id}|${e.workout_date}`));
  const fresh = records.filter(r => !seen.has(`${r.wod_id}|${r.section_id}|${r.member_id}|${r.workout_date}`));
  console.log(`\n${records.length - fresh.length} already present, inserting ${fresh.length}`);

  for (let i = 0; i < fresh.length; i += 50) {
    const { error } = await sb.from('wod_section_results').insert(fresh.slice(i, i + 50));
    if (error) throw new Error(`insert: ${error.message}`);
  }
  console.log('✅ inserted');

  // Protocol step 7: a scored section invisible unless its BASE id is in publish_sections
  for (const wodId of [...new Set(BLOCKS.map(b => b.wodId))]) {
    const { data: w } = await sb.from('wods').select('publish_sections').eq('id', wodId).single();
    const need = BLOCKS.filter(b => b.wodId === wodId).map(b => b.sectionId);
    const cur: string[] = (w?.publish_sections as string[]) ?? [];
    const merged = [...new Set([...cur, ...need])];
    if (merged.length !== cur.length) {
      const { error } = await sb.from('wods').update({ publish_sections: merged }).eq('id', wodId);
      if (error) throw new Error(`publish_sections ${wodId}: ${error.message}`);
      console.log(`   published ${merged.length - cur.length} extra section(s) on ${wodId}`);
    }
  }
  console.log('✅ publish_sections verified');
})();
