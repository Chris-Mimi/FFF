/**
 * Whiteboard protocol — "2026 Week 26.2" (24.06.26 WOD: TGU, Run, PP, Pull-up, L-Sit).
 * Metcon "5 rounds for time (15 min TC)". Writes wod_section_results ONLY (no RM lift,
 * so no lift_records — mirrors the coach results modal for this section).
 *
 * Score section id (both sessions): section-1782296711713  -> stored as "<id>-content-0".
 * Field map from board:  Run ok/600mAB -> track (1/2) | Pull-ups -> scaling_level_2 |
 *                        PP kg -> weight_result | L-Sit -> scaling_level | Time -> time_result
 *                        (finisher) or rounds_result(+reps_result) (capped).
 *
 * Usage:  npx tsx scripts/enter-week26-2-tgu-metcon.ts            (dry run, both sessions)
 *         WRITE=17:15 npx tsx scripts/enter-week26-2-tgu-metcon.ts (write 17:15 only)
 *         WRITE=18:30 npx tsx scripts/enter-week26-2-tgu-metcon.ts (write 18:30 only)
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const WORKOUT_DATE = '2026-06-24';
const SECTION_ID = 'section-1782296711713-content-0';

type Row = {
  name: string;
  track: number;
  pull: string;   // scaling_level_2
  pp: number;     // weight_result
  lsit: string;   // scaling_level
  time?: string;       // finisher
  rounds?: number;     // capped
  reps?: number | null;
};

const SESSIONS: Record<string, { sessionId: string; wodId: string; rows: Row[] }> = {
  '17:15': {
    sessionId: 'f255bcbd-1d54-4385-ba8d-3cffc76a54e6',
    wodId: '1c42b443-4db7-4499-ab92-13dcbbad3f17',
    rows: [
      { name: 'Lena Jähn',         track: 1, pull: 'Sc2', pp: 25,   lsit: 'Sc1', time: '14:03' },
      { name: 'Sabrina Lucas',     track: 2, pull: 'Sc3', pp: 17.5, lsit: 'Sc1', rounds: 4, reps: 25 },
      { name: 'Valerie Mesenburg', track: 1, pull: 'Sc3', pp: 20,   lsit: 'Sc1', time: '13:10' },
      { name: 'Miriam Jacht',      track: 1, pull: 'Sc2', pp: 25,   lsit: 'Sc1', rounds: 4, reps: null },
      { name: 'Steven Zaft',       track: 1, pull: 'Rx',  pp: 35,   lsit: 'Rx',  rounds: 3, reps: 40 },
      { name: 'Lukas Simnacher',   track: 1, pull: 'Rx',  pp: 35,   lsit: 'Sc1', time: '14:22' },
      { name: 'Wayne Lucas',       track: 2, pull: 'Rx',  pp: 35,   lsit: 'Sc1', time: '13:55' },
      { name: 'Paul Bielenski',    track: 1, pull: 'Sc2', pp: 35,   lsit: 'Sc1', rounds: 4, reps: null },
    ],
  },
  '18:30': {
    sessionId: 'b024e479-06cc-466a-b98c-74745863ce15',
    wodId: '685bd0fe-01b4-45e5-9ca9-47667f5b9287',
    rows: [
      { name: 'Anja Götte',          track: 1, pull: 'Rx',  pp: 25, lsit: 'Rx',  rounds: 3, reps: 40 },
      { name: 'Nikolina Vlasalija',  track: 1, pull: 'Sc3', pp: 15, lsit: 'Sc3', rounds: 4, reps: null },
      { name: 'Christian Müller',    track: 1, pull: 'Rx',  pp: 35, lsit: 'Rx',  time: '14:34' },
      { name: 'Christian Tanner',    track: 1, pull: 'Sc3', pp: 30, lsit: 'Sc1', time: '14:51' },
      { name: 'Tobias Götte',        track: 1, pull: 'Rx',  pp: 35, lsit: 'Sc1', rounds: 4, reps: 20 },
      { name: 'Teemu Lian Geisler',  track: 1, pull: 'Sc1', pp: 20, lsit: 'Sc1', time: '13:06' },
      { name: 'Chris Hiles',         track: 1, pull: 'Rx',  pp: 35, lsit: 'Rx',  time: '14:11' },
    ],
  },
};

async function run() {
  const writeTarget = process.env.WRITE; // '17:15' | '18:30' | undefined

  // Resolve member_id by name (from confirmed bookings) + user_id via email->auth (mirrors save route)
  const { data: { users: authUsers } } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const emailToUserId = new Map<string, string>();
  for (const u of authUsers || []) if (u.email) emailToUserId.set(u.email, u.id);

  for (const [label, sess] of Object.entries(SESSIONS)) {
    const { data: bookings } = await sb.from('bookings')
      .select('member_id, status, members(id, name, email)')
      .eq('session_id', sess.sessionId).eq('status', 'confirmed');
    const byName = new Map<string, { id: string; email: string }>();
    for (const b of bookings || []) {
      const m: any = (b as any).members;
      if (m) byName.set(m.name, { id: m.id, email: m.email });
    }

    console.log(`\n========== ${label} (wod ${sess.wodId}) ==========`);
    const records: any[] = [];
    for (const r of sess.rows) {
      const m = byName.get(r.name);
      if (!m) { console.log(`  ⚠️ NO confirmed booking for "${r.name}" — SKIPPED`); continue; }
      const userId = emailToUserId.get(m.email) || null;
      const rec = {
        wod_id: sess.wodId,
        workout_date: WORKOUT_DATE,
        member_id: m.id,
        user_id: userId,
        whiteboard_name: null as string | null,
        section_id: SECTION_ID,
        scaling_level: r.lsit,
        scaling_level_2: r.pull,
        scaling_level_3: null,
        track: r.track,
        time_result: r.time || null,
        reps_result: r.rounds != null ? (r.reps ?? null) : null,
        weight_result: r.pp,
        weight_result_2: null,
        weight_result_3: null,
        rounds_result: r.rounds ?? null,
        calories_result: null,
        metres_result: null,
        task_completed: null,
        dnf: false,
        updated_at: new Date().toISOString(),
      };
      records.push(rec);
      const score = r.time ? r.time : `${r.rounds}+${r.reps ?? 0}`;
      console.log(`  ${r.name.padEnd(22)} T${r.track} | PU ${r.pull.padEnd(3)} | PP ${String(r.pp).padEnd(4)} | LS ${r.lsit.padEnd(3)} | ${score}${userId ? '' : '  (no user_id!)'}`);
    }

    if (writeTarget === label) {
      let saved = 0;
      for (const rec of records) {
        // dedup: existing row for (wod, section, date, member)
        const { data: existing } = await sb.from('wod_section_results')
          .select('id').eq('wod_id', rec.wod_id).eq('section_id', rec.section_id)
          .eq('workout_date', rec.workout_date).eq('member_id', rec.member_id).maybeSingle();
        if (existing) {
          const { error } = await sb.from('wod_section_results').update(rec).eq('id', existing.id);
          if (error) console.log(`    ❌ update ${rec.member_id}: ${error.message}`); else saved++;
        } else {
          const { error } = await sb.from('wod_section_results').insert(rec);
          if (error) console.log(`    ❌ insert ${rec.member_id}: ${error.message}`); else saved++;
        }
      }
      console.log(`  ✅ WROTE ${saved}/${records.length} rows for ${label}`);
    } else {
      console.log(`  (dry run — set WRITE=${label} to persist)`);
    }
  }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
