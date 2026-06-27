/**
 * Whiteboard protocol — "2026 Week 25.2" (17.06.26: RDL Testing 5RM + KB MetCon).
 * Covers the 17:15 + 18:30 sessions. Per athlete, mirrors the coach modal:
 *   - Strength section-1770813443168  -> WSR(weight_result=RDL) + lift_records(Romanian Deadlift 5RM)
 *   - MetCon  section-1770813876887  -> WSR(weight_result=KB load, rounds_result+reps_result)
 * Carole Schultz (OG) excluded by design.
 *
 * Usage:  npx tsx scripts/enter-week25-2-rdl-kb.ts            (dry run)
 *         WRITE=17:15 npx tsx scripts/enter-week25-2-rdl-kb.ts (write 17:15)
 *         WRITE=18:30 npx tsx scripts/enter-week25-2-rdl-kb.ts (write 18:30)
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const WORKOUT_DATE = '2026-06-17';
const RDL_SECTION = 'section-1770813443168-content-0';
const KB_SECTION = 'section-1770813876887-content-0';
const RDL_LIFT_NAME = 'Romanian Deadlift';
const RM_TYPE = '5RM';
const RM_REPS = 5;

const epley = (w: number, reps: number) => reps === 1 ? w : Math.round(w * 36 / (37 - reps) * 10) / 10;

type Row = { name: string; rdl: number; kb: number; rounds: number; reps: number | null };

const SESSIONS: Record<string, { sessionId: string; wodId: string; rows: Row[] }> = {
  '17:15': {
    sessionId: '9043dca1-1675-418a-ad42-0505e89edabc',
    wodId: '8d8504b5-1ac9-4f0c-9580-3ec966c09673',
    rows: [
      { name: 'Lena Jähn',         rdl: 72.5, kb: 16, rounds: 8, reps: null },
      { name: 'Valerie Mesenburg', rdl: 55,   kb: 12, rounds: 8, reps: 6 },
      { name: 'Miriam Jacht',      rdl: 70,   kb: 16, rounds: 7, reps: null },
      { name: 'Sabrina Lucas',     rdl: 55,   kb: 10, rounds: 6, reps: 3 },
      { name: 'Claudia Herrmann',  rdl: 72.5, kb: 16, rounds: 8, reps: null },
      { name: 'Wayne Lucas',       rdl: 110,  kb: 24, rounds: 7, reps: null },
      { name: 'Daniel Steller',    rdl: 80,   kb: 20, rounds: 7, reps: 6 },
      { name: 'Zoran Vrbanic',     rdl: 110,  kb: 24, rounds: 7, reps: 24 },
      { name: 'Lukas Simnacher',   rdl: 140,  kb: 24, rounds: 8, reps: 20 },
    ],
  },
  '18:30': {
    sessionId: '58f637a2-f2fc-4ae7-9e65-97abe9351fbc',
    wodId: 'e702402d-923c-462b-a865-5d4ff74203a3',
    rows: [
      { name: 'Anneke Spegele',     rdl: 80,  kb: 16, rounds: 8, reps: null },
      { name: 'Anja Götte',         rdl: 65,  kb: 16, rounds: 8, reps: null },
      { name: 'Soledad',            rdl: 45,  kb: 12, rounds: 8, reps: 16 },
      { name: 'Thomas Spegele',     rdl: 110, kb: 24, rounds: 8, reps: 12 },
      { name: 'Christian Müller',   rdl: 100, kb: 24, rounds: 8, reps: 12 },
      { name: 'Markus Fischer',     rdl: 125, kb: 24, rounds: 8, reps: null },
      { name: 'Tobias Götte',       rdl: 90,  kb: 24, rounds: 5, reps: 18 },
      { name: 'Teemu Lian Geisler', rdl: 60,  kb: 12, rounds: 9, reps: 6 },
      { name: 'Chris Hiles',        rdl: 110, kb: 24, rounds: 8, reps: 24 },
    ],
  },
};

const baseWsr = (wodId: string, memberId: string, userId: string | null, sectionId: string) => ({
  wod_id: wodId, workout_date: WORKOUT_DATE, member_id: memberId, user_id: userId,
  whiteboard_name: null as string | null, section_id: sectionId,
  scaling_level: null, scaling_level_2: null, scaling_level_3: null, track: null,
  time_result: null, reps_result: null, weight_result: null, weight_result_2: null,
  weight_result_3: null, rounds_result: null, calories_result: null, metres_result: null,
  task_completed: null, dnf: false, updated_at: new Date().toISOString(),
});

async function upsertWsr(rec: any) {
  const { data: existing } = await sb.from('wod_section_results').select('id')
    .eq('wod_id', rec.wod_id).eq('section_id', rec.section_id)
    .eq('workout_date', rec.workout_date).eq('member_id', rec.member_id).maybeSingle();
  if (existing) return sb.from('wod_section_results').update(rec).eq('id', existing.id);
  return sb.from('wod_section_results').insert(rec);
}

async function upsertLift(userId: string, weight: number, wodId: string) {
  const { data: existing } = await sb.from('lift_records').select('id')
    .eq('user_id', userId).eq('lift_name', RDL_LIFT_NAME).eq('rep_max_type', RM_TYPE)
    .eq('lift_date', WORKOUT_DATE).maybeSingle();
  const payload = { weight_kg: weight, reps: RM_REPS, calculated_1rm: epley(weight, RM_REPS), wod_id: wodId };
  if (existing) return sb.from('lift_records').update(payload).eq('id', existing.id);
  return sb.from('lift_records').insert({ user_id: userId, lift_name: RDL_LIFT_NAME, rep_max_type: RM_TYPE, lift_date: WORKOUT_DATE, ...payload });
}

async function run() {
  const writeTarget = process.env.WRITE;
  const { data: { users: authUsers } } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const emailToUserId = new Map<string, string>();
  for (const u of authUsers || []) if (u.email) emailToUserId.set(u.email, u.id);

  for (const [label, sess] of Object.entries(SESSIONS)) {
    const { data: bookings } = await sb.from('bookings')
      .select('is_og, members(id, name, email)').eq('session_id', sess.sessionId).eq('status', 'confirmed');
    const byName = new Map<string, { id: string; email: string; og: boolean }>();
    for (const b of bookings || []) {
      const m: any = (b as any).members;
      if (m) byName.set(m.name, { id: m.id, email: m.email, og: (b as any).is_og });
    }

    console.log(`\n========== ${label} (wod ${sess.wodId}) ==========`);
    let wrote = 0;
    for (const r of sess.rows) {
      const m = byName.get(r.name);
      if (!m) { console.log(`  ⚠️ NO confirmed booking for "${r.name}" — SKIPPED`); continue; }
      if (m.og) { console.log(`  ⚠️ "${r.name}" is OG — SKIPPED`); continue; }
      const userId = emailToUserId.get(m.email) || null;
      console.log(`  ${r.name.padEnd(22)} RDL ${String(r.rdl).padEnd(5)}(1RM≈${epley(r.rdl, RM_REPS)}) | KB ${String(r.kb).padEnd(3)} | ${r.rounds}+${r.reps ?? 0}${userId ? '' : '  ⚠️ no user_id (no lift_record)'}`);

      if (writeTarget === label) {
        const strengthWsr = { ...baseWsr(sess.wodId, m.id, userId, RDL_SECTION), weight_result: r.rdl };
        const kbWsr = { ...baseWsr(sess.wodId, m.id, userId, KB_SECTION), weight_result: r.kb, rounds_result: r.rounds, reps_result: r.reps };
        const e1 = await upsertWsr(strengthWsr); if (e1.error) console.log(`    ❌ RDL WSR: ${e1.error.message}`);
        const e2 = await upsertWsr(kbWsr); if (e2.error) console.log(`    ❌ KB WSR: ${e2.error.message}`);
        if (userId) { const e3 = await upsertLift(userId, r.rdl, sess.wodId); if (e3.error) console.log(`    ❌ lift_record: ${e3.error.message}`); }
        if (!e1.error && !e2.error) wrote++;
      }
    }
    if (writeTarget === label) console.log(`  ✅ WROTE ${wrote}/${sess.rows.length} athletes (RDL+KB WSR + lift_records)`);
    else console.log(`  (dry run — set WRITE=${label} to persist)`);
  }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
