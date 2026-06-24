/**
 * Restore the coach-side score-entry results (wod_section_results / WSR) for the
 * 9-11 Feb 2026 "Week 7" OHP & Push Press RM testing block, from whiteboard photo
 * "2026 Week 7.1". Companion to restore-week7-ohp-pp-liftrecords.ts (which fed the
 * athlete PR view). This one feeds the COACH results modal + session leaderboard.
 *
 * Maps each athlete to their confirmed session, reads that session's wod, and
 * matches each board value to the section whose lift name + rm_test matches.
 * Mirrors the score-entry save route exactly: section_id = `${section.id}-content-0`,
 * weight in weight_result, member_id + user_id (resolved via email->auth).
 *
 * INSERT/UPDATE, deduped (wod_id|section_id|workout_date|member_id), scoped.
 * Dry-run by default; --apply to write. --session=<label> to limit to one session.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');
const ONLY = (process.argv.find(a => a.startsWith('--session=')) || '').split('=')[1] || null;
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const OHP = 'Strict Overhead Shoulder Press';
const PP = 'Push Press';

// session label -> { id, date }
const SESSIONS: Record<string, { id: string; date: string }> = {
  '09 17:15': { id: 'd3ef28fa-c6ff-4d41-a678-ddb88e525bda', date: '2026-02-09' },
  '09 18:30': { id: '863ac726-b6b4-4a7b-818c-d816c588bd57', date: '2026-02-09' },
  '10 17:15': { id: '8f3f2d3e-c599-4451-8c92-6a5e30985a8f', date: '2026-02-10' },
  '10 18:30': { id: '6f44214a-f5e1-4043-91c2-49b2a25516bd', date: '2026-02-10' },
  '11 09:30': { id: '57a0d62f-4d62-4b53-8fea-20dfd04de41c', date: '2026-02-11' },
};

// [member name, session label, OHP3, OHP1, PP3|null, PP1|null]
type Row = [string, string, number, number, number | null, number | null];
const DATA: Row[] = [
  ['Lena Jähn',          '09 17:15', 25,   25,   30,   32.5],
  ['Claudia Herrmann',   '09 17:15', 27.5, 30,   37.5, 45],
  ['Katharina Herbst',   '09 17:15', 30,   35,   37.5, 45],
  ['Lukas Simnacher',    '09 17:15', 55,   60,   60,   65],
  ['Senol Özdilek',      '09 17:15', 50,   50,   50,   50],
  ['Dimitar Peresyov',   '09 17:15', 50,   50,   65,   70],
  ['Daniel Braatz',      '09 17:15', 37.5, 40,   50,   50],
  ['Michael Junkes',     '09 17:15', 37.5, 40,   40,   45],
  ['Anneke Spegele',     '09 18:30', 30,   32.5, 40,   45],
  ['Chris Hiles',        '09 18:30', 60,   65,   70,   72.5],
  ['Christian Tanner',   '09 18:30', 40,   45,   45,   50],
  ['Denis Koffler',      '09 18:30', 45,   50,   50,   60],
  ['Miriam Jacht',       '09 18:30', 27.5, 32.5, 32.5, 35],
  ['Patrik Gruber',      '09 18:30', 55,   60,   65,   65],
  ['Paul Bielenski',     '09 18:30', 70,   70,   70,   75],
  ['Thomas Spegele',     '09 18:30', 60,   65,   60,   65],
  ['Leah Mesche',        '10 17:15', 20,   20,   20,   22.5],
  ['Franziska Kary',     '10 17:15', 22.5, 25,   null, null],
  ['Steven Zaft',        '10 17:15', 50,   55,   null, null],
  ['Teemu Lian Geisler', '10 17:15', 30,   35,   null, null],
  ['Thomas Herbst',      '10 17:15', 45,   50,   null, null],
  ['Thomas Graf',        '10 17:15', 30,   35,   null, null],
  ['Carmine Carrozzo',   '10 17:15', 67.5, 67.5, null, null],
  ['Kathrin Mühlen',     '10 18:30', 32.5, 35,   35,   37.5],
  ['Valerie Mesenburg',  '10 18:30', 25,   25,   30,   30],
  ['Nikolina Vlasalija', '10 18:30', 17.5, 17.5, 17.5, 17.5],
  ['Daniel Steller',     '10 18:30', 35,   35,   40,   45],
  ['Stefan G',           '10 18:30', 35,   37.5, 40,   40],
  ['Jürgen Bizjak',      '10 18:30', 35,   35,   40,   40],
  ['Markus Fischer',     '10 18:30', 55,   62.5, 60,   60],
  ['Michael Städele',    '11 09:30', 50,   55,   60,   70],
  ['Irene Koffler',      '11 09:30', 22.5, 25,   32.5, 37.5],
  ['Lisa Vrbanic',       '11 09:30', 20,   20,   22.5, 25],
  ['Regina Peresyova',   '11 09:30', 25,   27.5, 27.5, 32.5],
  ['Mimi Hiles',         '11 09:30', 35,   37.5, 42.5, 50],
];

async function main() {
  // members + emails
  const names = [...new Set(DATA.map(d => d[0]))];
  const { data: members } = await sb.from('members').select('id,name,email').in('name', names);
  const byName = new Map((members || []).map((m: any) => [m.name, m]));
  const missing = names.filter(n => !byName.has(n));
  if (missing.length) { console.error('❌ UNMATCHED members:', missing); return; }

  // email -> auth user_id
  const emailToUid: Record<string, string> = {};
  let page = 1;
  for (;;) {
    const { data } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    for (const u of data.users) if (u.email) emailToUid[u.email] = u.id;
    if (data.users.length < 1000) break; page++;
  }

  // per-session: wod_id + lift->section map + confirmed member set
  const sessMeta: Record<string, { wodId: string; liftSec: Map<string, string>; booked: Set<string> }> = {};
  for (const [label, s] of Object.entries(SESSIONS)) {
    const { data: ws } = await sb.from('weekly_sessions').select('workout_id').eq('id', s.id).single();
    const wodId = ws!.workout_id;
    const { data: w } = await sb.from('wods').select('sections').eq('id', wodId).single();
    const liftSec = new Map<string, string>();
    for (const sec of (w!.sections as any[])) {
      const lift = sec.lifts?.[0];
      if (sec.scoring_fields?.load === true && lift?.name && lift?.rm_test) {
        liftSec.set(`${lift.name}|${lift.rm_test}`, sec.id);
      }
    }
    const { data: bk } = await sb.from('bookings').select('member_id').eq('session_id', s.id).eq('status', 'confirmed');
    sessMeta[label] = { wodId, liftSec, booked: new Set((bk || []).map((b: any) => b.member_id)) };
  }

  type Rec = { wod_id: string; workout_date: string; member_id: string; user_id: string | null; whiteboard_name: null; section_id: string; weight_result: number; dnf: boolean; updated_at: string };
  const recs: Rec[] = [];
  const warnings: string[] = [];
  for (const [name, label, o3, o1, p3, p1] of DATA) {
    if (ONLY && label !== ONLY) continue;
    const m: any = byName.get(name);
    const meta = sessMeta[label];
    const date = SESSIONS[label].date;
    const uid = m.email ? emailToUid[m.email] || null : null;
    if (!meta.booked.has(m.id)) warnings.push(`⚠️ ${name} not confirmed-booked in ${label} — WSR may not show in modal`);
    const add = (lift: string, rm: string, w: number | null) => {
      if (w == null) return;
      const secId = meta.liftSec.get(`${lift}|${rm}`);
      if (!secId) { warnings.push(`❌ ${label}: no section for ${lift} ${rm}`); return; }
      recs.push({ wod_id: meta.wodId, workout_date: date, member_id: m.id, user_id: uid, whiteboard_name: null, section_id: `${secId}-content-0`, weight_result: w, dnf: false, updated_at: new Date().toISOString() });
    };
    add(OHP, '3RM', o3); add(OHP, '1RM', o1); add(PP, '3RM', p3); add(PP, '1RM', p1);
  }

  // dedupe vs existing
  let toWrite = 0, updates = 0;
  for (const r of recs) {
    const { data: ex } = await sb.from('wod_section_results').select('id').eq('wod_id', r.wod_id).eq('section_id', r.section_id).eq('workout_date', r.workout_date).eq('member_id', r.member_id).limit(1).maybeSingle();
    (r as any)._existingId = ex?.id || null;
    if (ex?.id) updates++; else toWrite++;
  }

  console.log(`Sessions: ${ONLY || 'ALL'} | candidate WSR rows: ${recs.length} | new inserts: ${toWrite} | updates: ${updates}`);
  if (warnings.length) { console.log('\n' + [...new Set(warnings)].join('\n')); }

  if (!APPLY) { console.log('\nDRY RUN — pass --apply to write.'); return; }
  let done = 0;
  for (const r of recs) {
    const { _existingId, ...row } = r as any;
    const res = _existingId
      ? await sb.from('wod_section_results').update(row).eq('id', _existingId)
      : await sb.from('wod_section_results').insert(row);
    if (res.error) { console.error('❌', r.member_id, res.error.message); return; }
    done++;
  }
  console.log(`✅ Wrote ${done} WSR rows.`);
}
main();
