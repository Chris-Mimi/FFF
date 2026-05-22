/**
 * One-shot: list every WOD whose Whiteboard Intro mentions Martina, with the
 * linked weekly_session date(s) so Chris can manually create bookings + flag OG.
 *
 * Matches (case-insensitive): "martina" anywhere in any Whiteboard Intro section.
 * Read-only, no --apply.
 *
 * Usage: npx tsx scripts/list-martina-whiteboard-sessions.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface Section {
  type?: string;
  content?: string;
}
interface Wod {
  id: string;
  date: string;
  sections: Section[] | null;
  workout_name: string | null;
}
interface Session {
  id: string;
  date: string;
  time: string;
  workout_type: string | null;
  workout_id: string;
}

async function main() {
  let allWods: Wod[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('wods')
      .select('id, date, sections, workout_name')
      .order('date', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error('fetch wods error:', error);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    allWods = allWods.concat(data as Wod[]);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  console.log(`Loaded ${allWods.length} WODs.`);

  const hits: { date: string; wodId: string; raw: string; sessionIds?: string[]; sessionTimes?: string[] }[] = [];

  // Mirror the RPC's match: regex word-boundary on the FULL sections JSONB
  // (any section, any field), not just Whiteboard Intro content.
  for (const wod of allWods) {
    if (!Array.isArray(wod.sections)) continue;
    const fullText = JSON.stringify(wod.sections);
    if (/\bmartina\b/i.test(fullText)) {
      // Find which section(s) contain her name and what type they are
      const matchingSections: string[] = [];
      for (const sec of wod.sections) {
        if (!sec || typeof sec !== 'object') continue;
        const secText = JSON.stringify(sec);
        if (/\bmartina\b/i.test(secText)) {
          const type = sec.type || '?';
          const content = (sec.content || '').toString().replace(/\s+/g, ' ').trim();
          matchingSections.push(`[${type}] ${content.slice(0, 60)}${content.length > 60 ? '…' : ''}`);
        }
      }
      hits.push({
        date: wod.date,
        wodId: wod.id,
        raw: matchingSections.join(' || '),
      });
    }
  }

  if (hits.length === 0) {
    console.log('No matches found.');
    return;
  }

  const wodIds = hits.map((h) => h.wodId);
  const { data: sessions } = await supabase
    .from('weekly_sessions')
    .select('id, date, time, workout_type, workout_id')
    .in('workout_id', wodIds);

  const sessionsByWod = new Map<string, Session[]>();
  for (const s of (sessions ?? []) as Session[]) {
    const arr = sessionsByWod.get(s.workout_id) ?? [];
    arr.push(s);
    sessionsByWod.set(s.workout_id, arr);
  }

  console.log(`\nFound ${hits.length} WODs with "Martina" in Whiteboard Intro:\n`);
  console.log('Date         Time(s)             Class                  Whiteboard snippet');
  console.log('───────────  ──────────────────  ─────────────────────  ────────────────────────────────────────────────');
  hits.sort((a, b) => a.date.localeCompare(b.date));
  for (const h of hits) {
    const sess = sessionsByWod.get(h.wodId) ?? [];
    const times = sess.map((s) => s.time?.slice(0, 5) || '?').join(' / ');
    const cls = sess[0]?.workout_type || '(no session)';
    const snippet = h.raw.slice(0, 80) + (h.raw.length > 80 ? '…' : '');
    console.log(`${h.date}   ${times.padEnd(18)}  ${cls.padEnd(21)}  ${snippet}`);
  }

  // Also check wod_section_results for orphan score rows attributed to a
  // whiteboard "Martina*" name (member_id IS NULL).
  console.log('\n--- Score rows attributed to a Martina-* whiteboard name (orphan, member_id IS NULL) ---');
  const { data: orphanScores } = await supabase
    .from('wod_section_results')
    .select('id, whiteboard_name, workout_date, wod_id')
    .ilike('whiteboard_name', '%martina%')
    .is('member_id', null)
    .order('workout_date', { ascending: true });

  if (!orphanScores || orphanScores.length === 0) {
    console.log('  (none)');
  } else {
    const scoreWodIds = Array.from(new Set(orphanScores.map((r) => r.wod_id)));
    const { data: scoreSessions } = await supabase
      .from('weekly_sessions')
      .select('id, date, time, workout_type, workout_id')
      .in('workout_id', scoreWodIds);
    const scoreSessByWod = new Map<string, Session[]>();
    for (const s of (scoreSessions ?? []) as Session[]) {
      const arr = scoreSessByWod.get(s.workout_id) ?? [];
      arr.push(s);
      scoreSessByWod.set(s.workout_id, arr);
    }
    console.log('Date         Time(s)             Class                  Whiteboard name');
    console.log('───────────  ──────────────────  ─────────────────────  ──────────────────────');
    for (const r of orphanScores) {
      const sess = scoreSessByWod.get(r.wod_id) ?? [];
      const times = sess.map((s) => s.time?.slice(0, 5) || '?').join(' / ');
      const cls = sess[0]?.workout_type || '(no session)';
      console.log(`${r.workout_date}   ${times.padEnd(18)}  ${cls.padEnd(21)}  ${r.whiteboard_name}`);
    }
    console.log(`\nTotal orphan score rows: ${orphanScores.length}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
