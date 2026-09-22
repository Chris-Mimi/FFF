/**
 * Week 33.2 — Sun 16.08.2026 10:00 — TGU / T2R / Push-up / V-Up / AKBS metcon.
 *
 * Transcribed from whiteboard photo "2026 Week 33.2" (whiteboard_photos).
 * Follows memory-bank/whiteboard-score-entry-protocol.md.
 *
 * MetCon, not an RM day: the section carries no `lifts[]`, so this writes
 * `wod_section_results` ONLY — there are no paired `lift_records` to create.
 *
 * Board has 6 scored columns but the section shipped with 5 fields on, so this
 * also enables `scaling_3` (for T2R) and `track` (for the "Trk2" marks).
 * Both are off/unset -> true, which is the safe direction: the edit-cleanup in
 * useWODOperations only wipes results on a true -> false flip (see claude-rules
 * "Lift-result data invariants").
 *
 * Run: npx tsx scripts/enter-week33-2-tgu-metcon-scores.ts [--commit]
 * Without --commit it is a dry run and writes nothing.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const COMMIT = process.argv.includes('--commit');

const SESSION_ID = '6d969c81-7e3e-4426-9f4e-d4eadfa15a03';
const WOD_ID = '44b50c03-9b3d-4045-a3c1-eefe78525fb2';
const SECTION_ID = 'section-1773398698408-4';
const WORKOUT_DATE = '2026-08-16';

interface BoardRow {
  board: string;          // name as written on the whiteboard
  tgu: number;            // Load 1  -> weight_result
  t2r: string;            // Scaling 3 -> scaling_level_3
  pushup: string;         // Scaling 1 -> scaling_level
  vup: string;            // Scaling 2 -> scaling_level_2
  kbs: number;            // Load 2  -> weight_result_2
  rounds: number | null;  // R+R
  reps: number | null;
  track: number | null;   // "Trk2" written beside a load
}

// Column order on the board: TGU | T2R | Push-up | V-Up | RKBS | R+R
const BOARD: BoardRow[] = [
  { board: 'Annakr',     tgu: 8,  t2r: 'Sc1', pushup: 'Sc1', vup: 'Sc2', kbs: 8,  rounds: 3,    reps: 32,   track: null },
  { board: 'Gloria',     tgu: 8,  t2r: 'Sc2', pushup: 'Sc2', vup: 'Sc2', kbs: 8,  rounds: 3,    reps: 0,    track: 2    },
  { board: 'Daniela(T)', tgu: 4,  t2r: 'Sc2', pushup: 'Sc3', vup: 'Sc3', kbs: 8,  rounds: null, reps: null, track: 2    },
  { board: 'Justine',    tgu: 8,  t2r: 'Sc1', pushup: 'Sc2', vup: 'Sc2', kbs: 12, rounds: 3,    reps: 0,    track: 2    },
  { board: 'Regina',     tgu: 8,  t2r: 'Sc1', pushup: 'Sc2', vup: 'Sc2', kbs: 12, rounds: 3,    reps: 0,    track: null },
  { board: 'Dave',       tgu: 12, t2r: 'Sc1', pushup: 'Rx',  vup: 'Sc2', kbs: 20, rounds: 2,    reps: 30,   track: 2    },
  { board: 'ChristianT', tgu: 20, t2r: 'Sc1', pushup: 'Rx',  vup: 'Sc1', kbs: 20, rounds: 2,    reps: 20,   track: null },
  { board: 'Teemu',      tgu: 10, t2r: 'Rx',  pushup: 'Rx',  vup: 'Sc1', kbs: 12, rounds: 4,    reps: 20,   track: null },
  { board: 'ThomasG',    tgu: 12, t2r: 'Sc1', pushup: 'Sc1', vup: 'Sc2', kbs: 20, rounds: 2,    reps: 30,   track: null },
  { board: 'Senol',      tgu: 8,  t2r: 'Sc1', pushup: 'Sc2', vup: 'Sc2', kbs: 12, rounds: 3,    reps: 0,    track: null },
];

// Board alias -> the substring that identifies the confirmed booking. Every one
// of these resolves against THIS session's confirmed bookings (protocol step 4);
// the script throws unless each matches exactly one.
const ALIAS: Record<string, string> = {
  'Annakr': 'Anna Kr',
  'Gloria': 'Gloria Stoffer',
  'Daniela(T)': 'Daniela Struben',
  'Justine': 'Justine Baumstark',
  'Regina': 'Regina Peresyova',
  'Dave': 'David Montgomery',
  'ChristianT': 'Christian Tanner',
  'Teemu': 'Teemu Lian Geisler',
  'ThomasG': 'Thomas Graf',
  'Senol': 'Senol Özdilek',
};

async function main() {
  console.log(`\n=== Week 33.2 · ${WORKOUT_DATE} 10:00 · ${COMMIT ? 'COMMIT' : 'DRY RUN'} ===\n`);

  // --- 1. Resolve every board name through this session's confirmed bookings ---
  const { data: bookings, error: bErr } = await db
    .from('bookings')
    .select('member_id, status, members!bookings_member_id_fkey(id, name, display_name, email)')
    .eq('session_id', SESSION_ID)
    .eq('status', 'confirmed');
  if (bErr) throw new Error(`bookings: ${bErr.message}`);

  const confirmed = (bookings || []).map(b => {
    const m = (b as unknown as { members: { id: string; name: string | null; display_name: string | null; email: string } }).members;
    return { id: m.id, name: m.display_name || m.name || '', email: m.email };
  });
  console.log(`Confirmed bookings: ${confirmed.length}`);

  const resolved = BOARD.map(row => {
    const needle = ALIAS[row.board];
    const hits = confirmed.filter(c => c.name.toLowerCase().includes(needle.toLowerCase()));
    if (hits.length !== 1) {
      throw new Error(`"${row.board}" -> "${needle}" matched ${hits.length} confirmed bookings (need exactly 1)`);
    }
    return { row, member: hits[0] };
  });
  console.log(`Resolved 1:1 against bookings: ${resolved.length}/${BOARD.length}\n`);

  // --- 2. Enable the two missing scoring fields (off/unset -> true; safe direction) ---
  const { data: wod, error: wErr } = await db
    .from('wods')
    .select('sections, publish_sections')
    .eq('id', WOD_ID)
    .single();
  if (wErr) throw new Error(`wod: ${wErr.message}`);

  const sections = (wod.sections as Record<string, unknown>[]) || [];
  const idx = sections.findIndex(s => s.id === SECTION_ID);
  if (idx === -1) throw new Error(`section ${SECTION_ID} not found on wod`);

  const sf = (sections[idx].scoring_fields as Record<string, boolean>) || {};
  console.log('scoring_fields before:', JSON.stringify(sf));
  for (const f of ['scaling_3', 'track'] as const) {
    if (sf[f] === true) continue;
    console.log(`  enabling ${f} (was ${JSON.stringify(sf[f])})`);
  }
  const newSf = { ...sf, scaling_3: true, track: true };
  console.log('scoring_fields after: ', JSON.stringify(newSf), '\n');

  // --- 3. Build the WSR rows, mirroring app/api/score-entry/save/route.ts ---
  const now = new Date().toISOString();
  const records = resolved.map(({ row, member }) => ({
    wod_id: WOD_ID,
    workout_date: WORKOUT_DATE,
    member_id: member.id,
    user_id: member.id,              // this gym: members.id == auth user id
    whiteboard_name: null,
    section_id: `${SECTION_ID}-content-0`,   // -content-0 suffix or the leaderboard can't see it (S399)
    scaling_level: row.pushup,       // Scaling 1 = Push-up
    scaling_level_2: row.vup,        // Scaling 2 = V-Up
    scaling_level_3: row.t2r,        // Scaling 3 = Toes to Rings
    track: row.track,
    time_result: null,
    reps_result: row.reps,
    weight_result: row.tgu,          // Load 1 = TGU
    weight_result_2: row.kbs,        // Load 2 = KB Swing
    weight_result_3: null,
    rounds_result: row.rounds,
    calories_result: null,
    metres_result: null,
    task_completed: null,
    dnf: false,
    modified: false,
    modified_note: null,
    updated_at: now,
  }));

  for (const { row, member } of resolved) {
    const rr = row.rounds === null ? '—' : `${row.rounds}+${row.reps}`;
    console.log(
      `  ${member.name.padEnd(24)} TGU ${String(row.tgu).padStart(2)}kg  ` +
      `T2R ${row.t2r.padEnd(3)}  PU ${row.pushup.padEnd(3)}  VU ${row.vup.padEnd(3)}  ` +
      `KBS ${String(row.kbs).padStart(2)}kg  R+R ${rr.padEnd(5)}` +
      (row.track ? `  Trk${row.track}` : '')
    );
  }

  // --- 4. Refuse to double-write ---
  const { data: existing, error: eErr } = await db
    .from('wod_section_results')
    .select('id, member_id')
    .eq('wod_id', WOD_ID)
    .eq('section_id', `${SECTION_ID}-content-0`);
  if (eErr) throw new Error(`existing: ${eErr.message}`);
  if (existing && existing.length > 0) {
    console.log(`\n⚠️  ${existing.length} rows already exist for this section — aborting to avoid duplicates.`);
    return;
  }
  console.log('\nNo existing rows for this section — safe to insert.');

  if (!COMMIT) {
    console.log('\nDRY RUN — nothing written. Re-run with --commit.\n');
    return;
  }

  // --- 5. Write: scoring fields, then rows, then the publish gate ---
  sections[idx] = { ...sections[idx], scoring_fields: newSf };
  const { error: sfErr } = await db.from('wods').update({ sections }).eq('id', WOD_ID);
  if (sfErr) throw new Error(`scoring_fields update: ${sfErr.message}`);
  console.log('✅ scoring_fields updated (scaling_3 + track on)');

  const { error: insErr } = await db.from('wod_section_results').insert(records);
  if (insErr) throw new Error(`insert: ${insErr.message}`);
  console.log(`✅ inserted ${records.length} wod_section_results rows`);

  // publish_sections gates visibility in BOTH the coach modal and the athlete
  // leaderboard; a direct DB write bypasses the route that normally appends it
  // (S398). Union, never replace — the publish dialog is the other writer (S410).
  const current: string[] = (wod.publish_sections as string[]) || [];
  const next = [...new Set([...current, SECTION_ID])];
  if (next.length !== current.length) {
    const { error: pErr } = await db.from('wods').update({ publish_sections: next }).eq('id', WOD_ID);
    if (pErr) throw new Error(`publish_sections: ${pErr.message}`);
    console.log(`✅ publish_sections: ${JSON.stringify(current)} -> ${JSON.stringify(next)}`);
  } else {
    console.log(`✅ publish_sections already contains ${SECTION_ID}`);
  }

  console.log('\nDone.\n');
}

main().catch(e => { console.error('\n❌', e.message, '\n'); process.exit(1); });
