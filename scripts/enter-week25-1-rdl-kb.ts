/**
 * Whiteboard protocol — "2026 Week 25.1", the 16.06.26 column (RDL Testing 5RM + KB MetCon).
 * Covers TWO sessions written under that date heading:
 *   - 16.06 18:30 (Foundations/WOD)
 *   - 17.06 09:30 (the morning crew listed below it)
 * Per athlete: Strength RDL -> WSR(weight) + lift_records(Romanian Deadlift 5RM);
 *              MetCon KB    -> WSR(weight=load, rounds+reps).
 * Bonnie = drop-in (whiteboard-only, no lift_record). Martina Fenster is OG on 16.06,
 * so her board row is scored under 17.06 09:30 (where she's a normal booking).
 *
 * Usage:  npx tsx scripts/enter-week25-1-rdl-kb.ts            (dry run)
 *         WRITE=09:30 npx tsx scripts/enter-week25-1-rdl-kb.ts
 *         WRITE=16:06 npx tsx scripts/enter-week25-1-rdl-kb.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const RDL_SECTION = 'section-1770813443168-content-0';
const KB_SECTION = 'section-1770813876887-content-0';
const RDL_LIFT_NAME = 'Romanian Deadlift';
const RM_TYPE = '5RM';
const RM_REPS = 5;
const epley = (w: number, reps: number) => reps === 1 ? w : Math.round(w * 36 / (37 - reps) * 10) / 10;

// KB BOR scaling tiers from prescription "16/24kg, 12/20kg, 8/16kg" (W/M).
// Tier = the highest tier whose threshold the load clears; load ranks within tier.
function kbTier(gender: string | null | undefined, load: number): string {
  const g = (gender || '').toUpperCase().startsWith('M') ? 'M' : 'W';
  const [rx, sc1, sc2] = g === 'M' ? [24, 20, 16] : [16, 12, 8];
  if (load >= rx) return 'Rx';
  if (load >= sc1) return 'Sc1';
  if (load >= sc2) return 'Sc2';
  return 'Sc3';
}

type Row = { name: string; rdl: number; kb: number; rounds: number; reps: number | null; whiteboard?: boolean; gender?: string };

const SESSIONS: Record<string, { sessionId: string; wodId: string; date: string; rows: Row[] }> = {
  '09:30': {
    sessionId: '72c517b2-ee49-4be4-8640-3c4264c52f24',
    wodId: 'b2bbe435-963b-419a-875a-c243710fb552',
    date: '2026-06-17',
    rows: [
      { name: 'Michael Städele', rdl: 110, kb: 24, rounds: 7, reps: 4 },
      { name: 'Senol Özdilek',   rdl: 120, kb: 24, rounds: 6, reps: 24 },
      { name: 'Paul Bielenski',  rdl: 150, kb: 24, rounds: 6, reps: 6 },
      { name: 'Irene Koffler',   rdl: 55,  kb: 12, rounds: 6, reps: 4 },
      { name: 'Martina Fenster', rdl: 50,  kb: 12, rounds: 5, reps: 12 },
      { name: 'Mimi Hiles',      rdl: 90,  kb: 16, rounds: 8, reps: 16 },
    ],
  },
  '16:06': {
    sessionId: '5702104a-578d-4cba-8d28-b432dfc36d25',
    wodId: 'fa9151bb-9ccc-4321-afa5-146211d654ce',
    date: '2026-06-16',
    rows: [
      { name: 'Leah Mesche',          rdl: 52.5, kb: 10, rounds: 8, reps: null },
      { name: "Bonnie (Leah's friend)", rdl: 35, kb: 8,  rounds: 8, reps: null, whiteboard: true, gender: 'F' },
      { name: 'Annerose Streit',      rdl: 47.5, kb: 8,  rounds: 9, reps: null },
      { name: 'Marion Weber',         rdl: 47.5, kb: 6,  rounds: 9, reps: 18 },
      { name: 'Anfisa Bornemann',     rdl: 35,   kb: 6,  rounds: 9, reps: null },
      { name: 'Anna Krautwald',       rdl: 50,   kb: 8,  rounds: 9, reps: null },
      { name: 'Veronika Ebner',       rdl: 55,   kb: 8,  rounds: 9, reps: null },
      { name: 'Stefan G',             rdl: 75,   kb: 16, rounds: 8, reps: 18 },
      { name: 'Thomas Graf',          rdl: 95,   kb: 16, rounds: 5, reps: 18 },
      { name: 'Michael Weber',        rdl: 80,   kb: 16, rounds: 10, reps: null },
    ],
  },
};

const baseWsr = (wodId: string, date: string, sectionId: string, memberId: string | null, userId: string | null, wbName: string | null) => ({
  wod_id: wodId, workout_date: date, member_id: memberId, user_id: userId,
  whiteboard_name: wbName, section_id: sectionId,
  scaling_level: null, scaling_level_2: null, scaling_level_3: null, track: null,
  time_result: null, reps_result: null, weight_result: null, weight_result_2: null,
  weight_result_3: null, rounds_result: null, calories_result: null, metres_result: null,
  task_completed: null, dnf: false, updated_at: new Date().toISOString(),
});

async function upsertWsr(rec: any) {
  let q = sb.from('wod_section_results').select('id')
    .eq('wod_id', rec.wod_id).eq('section_id', rec.section_id).eq('workout_date', rec.workout_date);
  q = rec.member_id ? q.eq('member_id', rec.member_id) : q.eq('whiteboard_name', rec.whiteboard_name);
  const { data: existing } = await q.maybeSingle();
  if (existing) return sb.from('wod_section_results').update(rec).eq('id', existing.id);
  return sb.from('wod_section_results').insert(rec);
}

async function upsertLift(userId: string, weight: number, wodId: string, date: string) {
  const { data: existing } = await sb.from('lift_records').select('id')
    .eq('user_id', userId).eq('lift_name', RDL_LIFT_NAME).eq('rep_max_type', RM_TYPE).eq('lift_date', date).maybeSingle();
  const payload = { weight_kg: weight, reps: RM_REPS, calculated_1rm: epley(weight, RM_REPS), wod_id: wodId };
  if (existing) return sb.from('lift_records').update(payload).eq('id', existing.id);
  return sb.from('lift_records').insert({ user_id: userId, lift_name: RDL_LIFT_NAME, rep_max_type: RM_TYPE, lift_date: date, ...payload });
}

async function run() {
  const writeTarget = process.env.WRITE;
  const { data: { users: authUsers } } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const emailToUserId = new Map<string, string>();
  for (const u of authUsers || []) if (u.email) emailToUserId.set(u.email, u.id);

  for (const [label, sess] of Object.entries(SESSIONS)) {
    const { data: bookings } = await sb.from('bookings')
      .select('is_og, members(id, name, email, gender)').eq('session_id', sess.sessionId).eq('status', 'confirmed');
    const byName = new Map<string, { id: string; email: string; og: boolean; gender: string }>();
    for (const b of bookings || []) { const m: any = (b as any).members; if (m) byName.set(m.name, { id: m.id, email: m.email, og: (b as any).is_og, gender: m.gender }); }

    console.log(`\n========== ${label} (${sess.date}, wod ${sess.wodId}) ==========`);
    let wrote = 0;
    for (const r of sess.rows) {
      let memberId: string | null = null, userId: string | null = null, wbName: string | null = null;
      let gender = r.gender;
      if (r.whiteboard) {
        wbName = r.name;
        const tier = kbTier(gender, r.kb);
        console.log(`  ${r.name.padEnd(24)} RDL ${String(r.rdl).padEnd(5)} | KB ${tier} ${String(r.kb).padEnd(3)} | ${r.rounds}+${r.reps ?? 0}  (whiteboard, no PR)`);
      } else {
        const m = byName.get(r.name);
        if (!m) { console.log(`  ⚠️ NO confirmed booking for "${r.name}" — SKIPPED`); continue; }
        if (m.og) { console.log(`  ⚠️ "${r.name}" is OG — SKIPPED`); continue; }
        memberId = m.id; userId = emailToUserId.get(m.email) || null; gender = m.gender;
        const tier = kbTier(gender, r.kb);
        console.log(`  ${r.name.padEnd(24)} RDL ${String(r.rdl).padEnd(5)}(1RM≈${epley(r.rdl, RM_REPS)}) | KB ${tier} ${String(r.kb).padEnd(3)} | ${r.rounds}+${r.reps ?? 0}${userId ? '' : '  ⚠️ no user_id'}`);
      }

      if (writeTarget === label) {
        const rdlWsr = { ...baseWsr(sess.wodId, sess.date, RDL_SECTION, memberId, userId, wbName), weight_result: r.rdl };
        const kbWsr = { ...baseWsr(sess.wodId, sess.date, KB_SECTION, memberId, userId, wbName), weight_result: r.kb, rounds_result: r.rounds, reps_result: r.reps, scaling_level: kbTier(gender, r.kb) };
        const e1 = await upsertWsr(rdlWsr); if (e1.error) console.log(`    ❌ RDL WSR: ${e1.error.message}`);
        const e2 = await upsertWsr(kbWsr); if (e2.error) console.log(`    ❌ KB WSR: ${e2.error.message}`);
        if (userId) { const e3 = await upsertLift(userId, r.rdl, sess.wodId, sess.date); if (e3.error) console.log(`    ❌ lift_record: ${e3.error.message}`); }
        if (!e1.error && !e2.error) wrote++;
      }
    }
    if (writeTarget === label) console.log(`  ✅ WROTE ${wrote}/${sess.rows.length}`);
    else console.log(`  (dry run — set WRITE=${label} to persist)`);
  }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
