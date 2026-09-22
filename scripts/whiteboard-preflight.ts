/**
 * Whiteboard preflight — everything needed to transcribe a board, in one command.
 *
 * Replaces the 5-ish ad-hoc queries that used to start every whiteboard session
 * (and the schema fumbling: `wods` has no `name` column — it's `workout_name`).
 *
 *   npx tsx scripts/whiteboard-preflight.ts 2026-08-16
 *   npx tsx scripts/whiteboard-preflight.ts 16.08.26 10:00
 *   npx tsx scripts/whiteboard-preflight.ts 2026-08-16 --photos
 *
 * Prints, per session that day: ids, the WOD, every section with its id +
 * scoring_fields + body text, the confirmed booking list, and whether scores
 * already exist. With --photos it also downloads that ISO week's whiteboard
 * photos to the scratchpad and prints the paths, ready to look at.
 *
 * Read-only. See memory-bank/whiteboard-score-entry-protocol.md.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WANT_PHOTOS = process.argv.includes('--photos');
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));

/** Accepts 2026-08-16, 16.08.26, 16.08.2026 or 16.08 (assumes current year). */
function parseDate(input: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const m = input.match(/^(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?$/);
  if (!m) throw new Error(`Unrecognised date "${input}" — use 2026-08-16 or 16.08.26`);
  const [, d, mo, y] = m;
  const year = !y ? new Date().getFullYear() : y.length === 2 ? 2000 + Number(y) : Number(y);
  return `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** ISO week number, to build the `YYYY Week WW.N` photo label. */
function isoWeek(dateStr: string): { year: number; week: number } {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (target.getUTCDay() + 6) % 7;          // Mon=0
  target.setUTCDate(target.getUTCDate() - dayNum + 3);  // nearest Thursday
  const firstThu = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((target.getTime() - firstThu.getTime()) / (7 * 864e5));
  return { year: target.getUTCFullYear(), week };
}

const SCRATCH = process.env.CLAUDE_SCRATCHPAD || '/tmp';

async function main() {
  if (args.length === 0) {
    console.log('Usage: npx tsx scripts/whiteboard-preflight.ts <date> [time] [--photos]');
    process.exit(1);
  }
  const date = parseDate(args[0]);
  const timeFilter = args[1] || null;

  const { year, week } = isoWeek(date);
  console.log(`\n=== Preflight · ${date}${timeFilter ? ` ${timeFilter}` : ''} · ISO ${year}-W${String(week).padStart(2, '0')} ===`);

  // --- Photos for that week ---
  const label = `${year} Week ${week}.%`;
  const { data: photos, error: phErr } = await db
    .from('whiteboard_photos')
    .select('photo_label, photo_url')
    .ilike('photo_label', label)
    .order('photo_label');
  if (phErr) throw new Error(`whiteboard_photos: ${phErr.message}`);

  console.log(`\n--- Whiteboard photos matching "${year} Week ${week}.*" ---`);
  if (!photos?.length) {
    console.log('  (none — Chris may not have uploaded this week yet)');
  }
  for (const p of photos || []) {
    if (!WANT_PHOTOS) {
      console.log(`  ${p.photo_label}  ${p.photo_url}`);
      continue;
    }
    const file = path.join(SCRATCH, `${p.photo_label.replace(/[^\w.]+/g, '-')}.jpg`);
    const res = await fetch(p.photo_url);
    if (!res.ok) { console.log(`  ${p.photo_label}  ⚠️ download failed (${res.status})`); continue; }
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    console.log(`  ${p.photo_label}  -> ${file}`);
  }

  // --- Sessions that day ---
  const { data: sessions, error: sErr } = await db
    .from('weekly_sessions')
    .select('id, date, time, status, capacity, workout_id, is_private')
    .eq('date', date)
    .order('time');
  if (sErr) throw new Error(`weekly_sessions: ${sErr.message}`);

  const wanted = (sessions || []).filter(s => !timeFilter || String(s.time).startsWith(timeFilter));
  console.log(`\n--- Sessions on ${date}: ${sessions?.length ?? 0}${timeFilter ? ` (${wanted.length} matching ${timeFilter})` : ''} ---`);

  for (const s of wanted) {
    console.log(`\n══ ${String(s.time).slice(0, 5)} · session ${s.id} · ${s.status}${s.is_private ? ' · PRIVATE' : ''} · cap ${s.capacity}`);

    const { data: wod, error: wErr } = await db
      .from('wods')
      .select('id, workout_name, title, session_type, workout_week, sections, publish_sections')
      .eq('id', s.workout_id)
      .maybeSingle();
    if (wErr) { console.log(`   wods: ${wErr.message}`); continue; }
    if (!wod) { console.log('   (no WOD attached)'); continue; }

    console.log(`   WOD ${wod.id}`);
    console.log(`   name: ${wod.workout_name || wod.title || wod.session_type || '(untitled)'}   week: ${wod.workout_week ?? '-'}`);
    console.log(`   publish_sections: ${JSON.stringify(wod.publish_sections ?? null)}`);

    const { data: wsr, error: rErr } = await db
      .from('wod_section_results')
      .select('section_id, member_id, whiteboard_name')
      .eq('wod_id', wod.id);
    if (rErr) { console.log(`   wod_section_results: ${rErr.message}`); }
    const bySection = new Map<string, number>();
    for (const r of wsr || []) bySection.set(r.section_id, (bySection.get(r.section_id) || 0) + 1);

    console.log(`\n   Sections (${((wod.sections as unknown[]) || []).length}) — scored rows in brackets:`);
    for (const sec of (wod.sections as Record<string, unknown>[]) || []) {
      const id = sec.id as string;
      const n = bySection.get(`${id}-content-0`) || 0;
      const published = ((wod.publish_sections as string[]) || []).includes(id);
      const sf = sec.scoring_fields as Record<string, boolean> | undefined;
      const on = sf ? Object.entries(sf).filter(([, v]) => v).map(([k]) => k).join(',') : '—';
      console.log(`     [${id}]  rows:${n}  ${published ? 'published' : 'NOT published'}`);
      console.log(`        fields on: ${on}`);
      const lifts = (sec.lifts as { name: string; rm_test?: string }[] | undefined) || [];
      if (lifts.length) {
        console.log(`        lifts: ${lifts.map(l => l.name + (l.rm_test ? ` (${l.rm_test})` : '')).join(', ')}` +
          (lifts.some(l => l.rm_test) ? '   ← RM day: needs lift_records too' : ''));
      }
      const body = String(sec.content ?? '').replace(/\n/g, ' / ').trim();
      if (body) console.log(`        body: ${body.slice(0, 260)}${body.length > 260 ? '…' : ''}`);
    }

    // --- Bookings: the name-resolution source of truth ---
    const { data: bookings, error: bErr } = await db
      .from('bookings')
      .select('status, is_og, is_trial, members!bookings_member_id_fkey(id, name, display_name, gender)')
      .eq('session_id', s.id);
    if (bErr) { console.log(`   bookings: ${bErr.message}`); continue; }

    type B = { status: string; is_og: boolean | null; is_trial: boolean | null; members: { id: string; name: string | null; display_name: string | null; gender: string | null } };
    const rows = (bookings || []) as unknown as B[];
    const confirmed = rows.filter(b => b.status === 'confirmed');

    console.log(`\n   Confirmed bookings (${confirmed.length}) — resolve every board name against THIS list:`);
    confirmed.forEach((b, i) => {
      const nm = b.members?.display_name || b.members?.name || '(unnamed)';
      const flags = [b.is_og ? 'OG' : null, b.is_trial ? 'trial' : null].filter(Boolean).join(',');
      const g = b.members?.gender || '⚠️ no gender';
      console.log(`     ${String(i + 1).padStart(2)}. ${nm.padEnd(26)} ${g.padEnd(12)} ${flags}`);
    });
    const noGender = confirmed.filter(b => !b.members?.gender);
    if (noGender.length) {
      console.log(`     ⚠️ ${noGender.length} with no gender — needed for W/M scaling tiers (claude-rules S389).`);
    }

    const others = rows.filter(b => b.status !== 'confirmed');
    if (others.length) {
      console.log(`   Not confirmed (${others.length}) — should NOT appear on the board:`);
      console.log(`     ${others.map(b => `${b.members?.display_name || b.members?.name}:${b.status}`).join(' | ')}`);
    }

    const sessDetail = await db.from('weekly_sessions').select('trial_names, drop_in_names').eq('id', s.id).maybeSingle();
    const tn = (sessDetail.data?.trial_names as string[] | null) || [];
    const dn = (sessDetail.data?.drop_in_names as string[] | null) || [];
    if (tn.length || dn.length) {
      console.log(`   Trials: ${tn.join(', ') || '-'}   Drop-ins: ${dn.join(', ') || '-'}`);
    }
  }

  console.log('');
}

main().catch(e => { console.error('\n❌', e.message, '\n'); process.exit(1); });
