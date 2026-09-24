/**
 * Generic whiteboard score writer — replaces the bespoke per-board script.
 *
 *   npx tsx scripts/enter-whiteboard-scores.ts boards/2026-W33.json           # dry run
 *   npx tsx scripts/enter-whiteboard-scores.ts boards/2026-W33.json --commit
 *
 * Encodes every landmine from the protocol once, so they can't be forgotten:
 *   - names resolve ONLY through the session's confirmed bookings, 1:1 or it throws
 *   - `section_id` carries the `-content-0` suffix, or the leaderboard can't see it (S399)
 *   - scored sections get unioned into `publish_sections`, never replaced (S398/S410)
 *   - missing scoring_fields are switched ON automatically (safe direction only)
 *   - RM sections get their paired `lift_records` written in the same pass (S386)
 *   - refuses to overwrite rows that already exist
 *
 * See memory-bank/whiteboard-score-entry-protocol.md.
 *
 * ── Board file shape ────────────────────────────────────────────────────────
 * {
 *   "note": "2026 Week 33.2",
 *   "sessions": [{
 *     "date": "2026-08-16",
 *     "time": "10:00",
 *     "sectionId": "section-1773398698408-4",
 *     "rows": [
 *       { "member": "Anna Kr", "weight_result": 8, "weight_result_2": 8,
 *         "scaling_level": "Sc1", "scaling_level_2": "Sc2", "scaling_level_3": "Sc1",
 *         "rounds_result": 3, "reps_result": 32 },
 *       { "whiteboard": "Some Guest", "time_result": "12:30" }
 *     ]
 *   }]
 * }
 *
 * Row keys are the real `wod_section_results` column names — no mapping layer to
 * get wrong. `member` is matched against the confirmed booking list (substring,
 * must hit exactly one); `whiteboard` is for unregistered names, which get a WSR
 * row and no lift_record (none is possible without a user).
 * `"book": true` on a member row = trained but never booked: the script books
 * them into that session first (confirmed; 10-card trigger counts it). Guess
 * the class, write it, tell Chris after — his standing instruction (S413).
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const COMMIT = process.argv.includes('--commit');
const FILE = process.argv.slice(2).find(a => !a.startsWith('--'));

/** WSR value column -> the scoring_field that must be ON for it to render. */
const FIELD_FOR: Record<string, string> = {
  time_result: 'time',
  weight_result: 'load',
  weight_result_2: 'load2',
  weight_result_3: 'load3',
  scaling_level: 'scaling',
  scaling_level_2: 'scaling_2',
  scaling_level_3: 'scaling_3',
  track: 'track',
  calories_result: 'calories',
  metres_result: 'metres',
  task_completed: 'checkbox',
  rounds_result: 'rounds_reps',
  // reps_result is deliberately absent: it belongs to `rounds_reps` when paired
  // with rounds, and to `reps` on its own. Resolved in inferFields().
};

const VALUE_KEYS = [
  'time_result', 'reps_result', 'weight_result', 'weight_result_2', 'weight_result_3',
  'rounds_result', 'calories_result', 'metres_result', 'task_completed', 'track',
  'scaling_level', 'scaling_level_2', 'scaling_level_3', 'dnf', 'modified', 'modified_note',
] as const;

interface Row {
  member?: string;
  whiteboard?: string;
  [k: string]: unknown;
}
interface SessionSpec {
  date: string;
  time: string;
  sectionId: string;
  rows: Row[];
}
interface BoardFile {
  note?: string;
  sessions: SessionSpec[];
}

const epley = (w: number, reps: number) => (reps > 1 ? Math.round(w * (1 + reps / 30) * 10) / 10 : null);

/** Which scoring_fields does this set of rows actually need switched on? */
function inferFields(rows: Row[]): string[] {
  const needed = new Set<string>();
  for (const r of rows) {
    for (const [k, f] of Object.entries(FIELD_FOR)) {
      if (r[k] !== undefined && r[k] !== null) needed.add(f);
    }
    if (r.reps_result !== undefined && r.reps_result !== null) {
      needed.add(r.rounds_result !== undefined && r.rounds_result !== null ? 'rounds_reps' : 'reps');
    }
  }
  return [...needed];
}

async function doSession(spec: SessionSpec) {
  const timeLabel = spec.time.slice(0, 5);
  console.log(`\n══════ ${spec.date} ${timeLabel} · section ${spec.sectionId} ══════`);

  // --- Session + WOD ---
  const { data: sessions, error: sErr } = await db
    .from('weekly_sessions')
    .select('id, time, workout_id')
    .eq('date', spec.date);
  if (sErr) throw new Error(`weekly_sessions: ${sErr.message}`);
  const matches = (sessions || []).filter(s => String(s.time).startsWith(timeLabel));
  if (matches.length !== 1) {
    throw new Error(`${spec.date} ${timeLabel}: matched ${matches.length} sessions (need exactly 1)`);
  }
  const session = matches[0];

  const { data: wod, error: wErr } = await db
    .from('wods')
    .select('id, sections, publish_sections')
    .eq('id', session.workout_id)
    .single();
  if (wErr) throw new Error(`wods: ${wErr.message}`);

  const sections = (wod.sections as Record<string, unknown>[]) || [];
  const idx = sections.findIndex(s => s.id === spec.sectionId);
  if (idx === -1) throw new Error(`section ${spec.sectionId} not on wod ${wod.id}`);
  const section = sections[idx];

  // --- Resolve names through confirmed bookings only ---
  const { data: bookings, error: bErr } = await db
    .from('bookings')
    .select('status, members!bookings_member_id_fkey(id, name, display_name)')
    .eq('session_id', session.id)
    .eq('status', 'confirmed');
  if (bErr) throw new Error(`bookings: ${bErr.message}`);
  type B = { members: { id: string; name: string | null; display_name: string | null } };
  const confirmed = ((bookings || []) as unknown as B[])
    .map(b => ({ id: b.members.id, name: b.members.display_name || b.members.name || '' }));

  // --- "book": true — athlete trained but never booked. Chris's rule (S413):
  // guess the class, book them, tell him after. Resolves against ACTIVE members
  // (1:1 or throw), then inserts a confirmed booking — the 10-card trigger
  // counts it like any other. An existing cancelled row is flipped instead.
  for (const row of spec.rows.filter(r => r.book && r.member)) {
    const needle = String(row.member).toLowerCase();
    if (confirmed.some(c => c.name.toLowerCase().includes(needle))) continue;
    const { data: mem, error: mErr } = await db
      .from('members')
      .select('id, name, display_name')
      .eq('status', 'active');
    if (mErr) throw new Error(`members: ${mErr.message}`);
    const hits = (mem || []).filter(m => (m.display_name || m.name || '').toLowerCase().includes(needle));
    if (hits.length !== 1) {
      throw new Error(`book: "${row.member}" matched ${hits.length} active members (need exactly 1): ${hits.map(h => h.display_name || h.name).join(', ')}`);
    }
    const m = hits[0];
    const name = m.display_name || m.name || '';
    console.log(`📅 Booking ${name} into ${spec.date} ${timeLabel} (not booked — trained per board)`);
    if (COMMIT) {
      const { data: prior, error: pErr } = await db
        .from('bookings').select('id').eq('session_id', session.id).eq('member_id', m.id).maybeSingle();
      if (pErr) throw new Error(`bookings lookup: ${pErr.message}`);
      const { error } = prior
        ? await db.from('bookings').update({ status: 'confirmed' }).eq('id', prior.id)
        : await db.from('bookings').insert({ session_id: session.id, member_id: m.id, status: 'confirmed' });
      if (error) throw new Error(`book ${name}: ${error.message}`);
    }
    confirmed.push({ id: m.id, name });
  }

  const resolved = spec.rows.map(row => {
    if (row.whiteboard) return { row, member: null as null | { id: string; name: string } };
    if (!row.member) throw new Error(`row needs "member" or "whiteboard": ${JSON.stringify(row)}`);
    const hits = confirmed.filter(c => c.name.toLowerCase().includes(String(row.member).toLowerCase()));
    if (hits.length !== 1) {
      throw new Error(`"${row.member}" matched ${hits.length} confirmed bookings on ${spec.date} ${timeLabel} (need exactly 1). Booked: ${confirmed.map(c => c.name).join(', ')}`);
    }
    return { row, member: hits[0] };
  });
  console.log(`Names resolved 1:1 against ${confirmed.length} confirmed bookings: ${resolved.filter(r => r.member).length} member rows, ${resolved.filter(r => !r.member).length} whiteboard-only`);

  // --- Scoring fields: switch on what the data needs (never off) ---
  const sf = (section.scoring_fields as Record<string, boolean>) || {};
  const needed = inferFields(spec.rows);
  const toEnable = needed.filter(f => sf[f] !== true);
  if (toEnable.length) {
    console.log(`Enabling scoring_fields: ${toEnable.join(', ')}  (safe direction — only true→false wipes results)`);
  } else {
    console.log('Scoring fields: all required fields already on');
  }
  const newSf = { ...sf, ...Object.fromEntries(toEnable.map(f => [f, true])) };

  // --- Existing rows guard ---
  const wsrSectionId = `${spec.sectionId}-content-0`;
  const { data: existing, error: eErr } = await db
    .from('wod_section_results')
    .select('id, member_id, whiteboard_name')
    .eq('wod_id', wod.id)
    .eq('section_id', wsrSectionId);
  if (eErr) throw new Error(`existing WSR: ${eErr.message}`);
  const haveMember = new Set((existing || []).map(r => r.member_id).filter(Boolean));
  const haveBoard = new Set((existing || []).map(r => r.whiteboard_name).filter(Boolean));

  const now = new Date().toISOString();
  const records: Record<string, unknown>[] = [];
  const skipped: string[] = [];

  for (const { row, member } of resolved) {
    const who = member ? member.name : String(row.whiteboard);
    if (member ? haveMember.has(member.id) : haveBoard.has(String(row.whiteboard))) {
      skipped.push(who);
      continue;
    }
    const rec: Record<string, unknown> = {
      wod_id: wod.id,
      workout_date: spec.date,
      member_id: member?.id ?? null,
      user_id: member?.id ?? null,   // this gym: members.id == auth user id
      whiteboard_name: member ? null : String(row.whiteboard),
      section_id: wsrSectionId,
      dnf: false,
      modified: false,
      modified_note: null,
      updated_at: now,
    };
    for (const k of VALUE_KEYS) if (row[k] !== undefined) rec[k] = row[k];
    records.push(rec);

    const bits = VALUE_KEYS.filter(k => row[k] !== undefined && row[k] !== null)
      .map(k => `${k.replace(/_result$/, '').replace(/^scaling_level/, 'sc')}=${row[k]}`);
    console.log(`  ${who.padEnd(24)} ${bits.join('  ')}`);
  }
  if (skipped.length) console.log(`  (skipped, already scored: ${skipped.join(', ')})`);
  if (!records.length) { console.log('Nothing new to write for this session.'); return; }

  // --- RM sections: the paired lift_records write (S386 — never one without the other) ---
  const lifts = (section.lifts as { name: string; rm_test?: string }[] | undefined) || [];
  const rmLift = lifts.find(l => l.rm_test);
  const liftRecords: Record<string, unknown>[] = [];
  if (rmLift) {
    const reps = Number(String(rmLift.rm_test).replace('RM', '')) || 1;
    for (const r of records) {
      if (!r.user_id || r.weight_result == null) continue;
      liftRecords.push({
        user_id: r.user_id,
        lift_name: rmLift.name,
        weight_kg: r.weight_result,
        reps,
        rep_max_type: rmLift.rm_test,
        calculated_1rm: epley(Number(r.weight_result), reps),
        lift_date: spec.date,
        notes: 'Whiteboard entry',
      });
    }
    console.log(`RM section (${rmLift.name} ${rmLift.rm_test}) → ${liftRecords.length} paired lift_records`);
  }

  if (!COMMIT) { console.log('DRY RUN — nothing written.'); return; }

  // --- Write ---
  sections[idx] = { ...section, scoring_fields: newSf };
  const { error: sfErr } = await db.from('wods').update({ sections }).eq('id', wod.id);
  if (sfErr) throw new Error(`scoring_fields: ${sfErr.message}`);

  const { error: insErr } = await db.from('wod_section_results').insert(records);
  if (insErr) throw new Error(`insert WSR: ${insErr.message}`);
  console.log(`✅ ${records.length} wod_section_results rows`);

  if (liftRecords.length) {
    const { data: exLr, error: lrRead } = await db
      .from('lift_records')
      .select('user_id, lift_name, lift_date, rep_max_type')
      .eq('lift_date', spec.date)
      .eq('lift_name', rmLift!.name);
    if (lrRead) throw new Error(`lift_records read: ${lrRead.message}`);
    const key = (r: { user_id: unknown; lift_name: unknown; lift_date: unknown; rep_max_type: unknown }) =>
      `${r.user_id}|${r.lift_name}|${r.lift_date}|${r.rep_max_type}`;
    const have = new Set((exLr || []).map(key));
    const fresh = liftRecords.filter(r => !have.has(key(r as never)));
    if (fresh.length) {
      const { error: lrErr } = await db.from('lift_records').insert(fresh);
      if (lrErr) throw new Error(`insert lift_records: ${lrErr.message}`);
    }
    console.log(`✅ ${fresh.length} lift_records (${liftRecords.length - fresh.length} already present)`);
  }

  // publish_sections gates visibility in the coach modal AND the leaderboard.
  // Union — the publish dialog is the other writer and replacing loses its picks.
  const current: string[] = (wod.publish_sections as string[]) || [];
  const next = [...new Set([...current, spec.sectionId])];
  if (next.length !== current.length) {
    const { error: pErr } = await db.from('wods').update({ publish_sections: next }).eq('id', wod.id);
    if (pErr) throw new Error(`publish_sections: ${pErr.message}`);
    console.log(`✅ publish_sections += ${spec.sectionId}`);
  } else {
    console.log('✅ publish_sections already open for this section');
  }
}

async function main() {
  if (!FILE) {
    console.log('Usage: npx tsx scripts/enter-whiteboard-scores.ts <board.json> [--commit]');
    process.exit(1);
  }
  const board: BoardFile = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  console.log(`\n=== ${board.note || FILE} · ${COMMIT ? 'COMMIT' : 'DRY RUN'} ===`);

  for (const spec of board.sessions) await doSession(spec);

  console.log(COMMIT ? '\nDone. Run scripts/check-wsr-liftrecord-parity.ts next.\n' : '\nDry run complete — re-run with --commit.\n');
}

main().catch(e => { console.error('\n❌', e.message, '\n'); process.exit(1); });
