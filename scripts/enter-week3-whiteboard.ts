/**
 * Week 3 (2026-01-12 + 2026-01-14) whiteboard score entry.
 *
 * Board: `2026 Week 3.1` in `whiteboard_photos` — its left-hand block is headed 12.1.26
 * and covers three sessions, not two: the 17:15 and 18:30 classes that evening, plus the
 * four athletes at the bottom who did the same WOD on 14.01 at 09:30 (Chris confirmed).
 *
 * WOD: 10 min AMRAP — 6x Barbell HPC (60/40, 45/30, 30/20) / 12x Toes to Bar / 6x Box Jump.
 * Board columns map 1:1 onto the section's fields: Barbell HPC → load, T2B → scaling,
 * R+R → rounds_reps. The Tabata drills section has no column on the board, so it is
 * deliberately not scored.
 *
 * Chris verified the transcription before this ran (S410).
 *
 * Run: npx tsx scripts/enter-week3-whiteboard.ts          (dry run)
 *      npx tsx scripts/enter-week3-whiteboard.ts --write
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const WRITE = process.argv.includes('--write');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const SECTION = 'section-1768229555752';

type Row = { who: string; load: number; sc: string; rounds?: number; reps?: number };
type Block = { key: string; sessionId: string; wodId: string; date: string; rows: Row[] };

const BLOCKS: Block[] = [
  { key: '12.01 17:15', date: '2026-01-12',
    sessionId: '1479a1df-ac10-4bbb-84c6-f5269bf838d7', wodId: 'f2e77a39-dcfc-4f22-9ad6-a155171ad290', rows: [
    { who: 'Sandra',    load: 25, sc: 'Rx',  rounds: 5, reps: 6  },
    { who: 'Claudia',   load: 30, sc: 'Rx',  rounds: 4, reps: 16 },
    { who: 'Lena',      load: 25, sc: 'Sc1', rounds: 4, reps: 16 },
    { who: 'Miriam',    load: 25, sc: 'Sc1', rounds: 5, reps: 0  },
    { who: 'Kathrin',   load: 30, sc: 'Sc1', rounds: 4, reps: 6  },
    { who: 'Kathi',     load: 30, sc: 'Sc1', rounds: 4, reps: 22 },
    { who: 'Zoran',     load: 30, sc: 'Rx',  rounds: 5, reps: 18 },
    { who: 'Steven',    load: 30, sc: 'Rx',  rounds: 3, reps: 0  },
    { who: 'MichaelJ',  load: 30, sc: 'Sc1', rounds: 5, reps: 0  },
    { who: 'LukasS',    load: 45, sc: 'Rx',  rounds: 4, reps: 22 },
    { who: 'Senol',     load: 30, sc: 'Sc1' },                      // board shows no score
  ]},
  { key: '12.01 18:30', date: '2026-01-12',
    sessionId: '097c48e9-6076-4dd1-b9cc-f364142962ab', wodId: '274657c0-0dec-497b-9917-7bd2604d722d', rows: [
    { who: 'Anneke',    load: 35, sc: 'Sc1', rounds: 4, reps: 12 },
    { who: 'PaulB',     load: 60, sc: 'Rx',  rounds: 3, reps: 18 }, // "Rx" → men's 60kg
    { who: 'TobiasG',   load: 50, sc: 'Rx',  rounds: 4, reps: 0  },
    { who: 'ThomasS',   load: 40, sc: 'Rx',  rounds: 4, reps: 19 },
  ]},
  { key: '14.01 09:30', date: '2026-01-14',
    sessionId: '0f2daa13-3078-43e5-aef1-3cd98ef5033c', wodId: 'fb2bda3a-7286-4f87-86ad-26a0ba41d09b', rows: [
    { who: 'MichaelS',  load: 50,   sc: 'Rx',  rounds: 5, reps: 2  },
    { who: 'Irene',     load: 20,   sc: 'Sc1', rounds: 4, reps: 3  },
    { who: 'Minja',     load: 12.5, sc: 'Sc1', rounds: 4, reps: 0  }, // board reads "x4"
    { who: 'Mimi',      load: 40,   sc: 'Rx',  rounds: 4, reps: 12 }, // "Rx" → women's 40kg
  ]},
];

(async () => {
  console.log(WRITE ? '=== WRITING ===\n' : '=== DRY RUN (pass --write to commit) ===\n');

  const sessionIds = BLOCKS.map(b => b.sessionId);
  const { data: bookings, error: be } = await sb.from('bookings')
    .select('session_id, member_id, status').in('session_id', sessionIds);
  if (be) throw new Error(`bookings: ${be.message}`);
  const { data: members, error: me } = await sb.from('members')
    .select('id, name, whiteboard_name, email').in('id', [...new Set((bookings ?? []).map(b => b.member_id))]);
  if (me) throw new Error(`members: ${me.message}`);
  const mById = new Map((members ?? []).map(m => [m.id, m]));

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
      records.push({
        wod_id: b.wodId,
        workout_date: b.date,
        member_id: m.id,
        user_id: (m.email && userIdByEmail.get(m.email)) || null,
        whiteboard_name: null,
        section_id: `${SECTION}-content-0`,
        scaling_level: r.sc,
        scaling_level_2: null,
        scaling_level_3: null,
        track: null,
        time_result: null,
        reps_result: r.reps ?? null,
        weight_result: r.load,
        weight_result_2: null,
        weight_result_3: null,
        rounds_result: r.rounds ?? null,
        calories_result: null,
        metres_result: null,
        task_completed: null,
        dnf: false,
        modified: false,
        modified_note: null,
        updated_at: new Date().toISOString(),
      });
      console.log(`   ${m.name.padEnd(22)} ${String(r.load).padEnd(5)}kg  ${r.sc.padEnd(4)}  ${r.rounds != null ? `${r.rounds} + ${r.reps}` : '(no score)'}`);
    }
  }
  console.log(`\nTotal rows: ${records.length}`);
  const noUser = records.filter(r => !r.user_id);
  if (noUser.length) console.log(`⚠️  ${noUser.length} rows without a user_id`);

  if (!WRITE) { console.log('\nDry run only — nothing written.'); return; }

  const { data: existing } = await sb.from('wod_section_results')
    .select('wod_id, section_id, member_id, workout_date').in('wod_id', BLOCKS.map(b => b.wodId));
  const seen = new Set((existing ?? []).map(e => `${e.wod_id}|${e.section_id}|${e.member_id}|${e.workout_date}`));
  const fresh = records.filter(r => !seen.has(`${r.wod_id}|${r.section_id}|${r.member_id}|${r.workout_date}`));
  console.log(`\n${records.length - fresh.length} already present, inserting ${fresh.length}`);

  const { error } = await sb.from('wod_section_results').insert(fresh);
  if (error) throw new Error(`insert: ${error.message}`);
  console.log('✅ inserted');

  for (const b of BLOCKS) {
    const { data: w } = await sb.from('wods').select('publish_sections').eq('id', b.wodId).single();
    const cur: string[] = (w?.publish_sections as string[]) ?? [];
    if (!cur.includes(SECTION)) {
      const { error: pe } = await sb.from('wods').update({ publish_sections: [...cur, SECTION] }).eq('id', b.wodId);
      if (pe) throw new Error(`publish_sections ${b.wodId}: ${pe.message}`);
      console.log(`   published ${SECTION} on ${b.wodId}`);
    }
  }
  console.log('✅ publish_sections verified');
})();
