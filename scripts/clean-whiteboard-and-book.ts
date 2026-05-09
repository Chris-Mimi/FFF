/**
 * Clean Whiteboard Intro names + backfill missing bookings.
 *
 * For each WOD's "Whiteboard Intro" section (date <= today only):
 *   1. Extract names from the section content.
 *   2. Match each name to a registered member using:
 *        a. members.whiteboard_name (case-insensitive)
 *        b. ALIAS_OVERRIDES
 *        c. Exact full name (case-insensitive)
 *        d. Unique first name (case-insensitive) — must be exactly one match
 *        e. FirstName + LastInitial pattern (e.g. "FranziskaK", "LisaV") —
 *           split on trailing single uppercase letter, find member whose
 *           first name matches AND last name starts with the initial.
 *           Must be unique.
 *   3. For each MATCHED name on a WOD with exactly one linked weekly_session:
 *        - Always mark the name for removal from the Whiteboard Intro text.
 *        - If member has NO booking on that session → propose INSERT
 *          (status='confirmed').
 *        - If member has ANY booking (confirmed / waitlist / cancelled /
 *          late_cancel / no_show / coach_cancelled) → leave booking alone.
 *          The existing booking is the source of truth; whiteboard name
 *          comes off either way.
 *   4. For each UNMATCHED name → leave in whiteboard, report unmatched count.
 *
 * After all WODs processed:
 *   - Insert proposed bookings (chunked).
 *   - For each WOD with names to remove: rewrite Whiteboard Intro JSONB
 *     content (split-filter-rejoin with ", " separator).
 *
 * 10-card counter (members.ten_card_sessions_used) is NOT incremented —
 * matches the convention from scripts/backfill-whiteboard-bookings.ts.
 * Recalc affected 10-card holders via the TenCardModal after running.
 *
 * Defensive: only processes wod.date <= today. Per Chris (S345),
 * no future WODs contain whiteboard names from 2026-04-13 onwards
 * (Trial Athlete feature replaced that workflow).
 *
 * Defaults to dry-run. Pass --apply to commit changes.
 *
 * Usage:
 *   npx tsx scripts/clean-whiteboard-and-book.ts
 *   npx tsx scripts/clean-whiteboard-and-book.ts --apply
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');

/**
 * Manual alias overrides for whiteboard names that don't map to a member's
 * `whiteboard_name`, full name, first name, or FirstName+LastInitial.
 *
 * Keep in sync with scripts/backfill-whiteboard-bookings.ts ALIAS_OVERRIDES.
 *
 * Format: alias (lowercase) → target whiteboard_name OR first name (lowercase)
 * of an existing member.
 */
const ALIAS_OVERRIDES: Record<string, string> = {
  'kathih': 'kathi',  // Katharina Herbst — also written as KathiH
  'sole': 'soledad',  // Soledad — whiteboard_name='Soledad', written as Sole
  // Kids-class disambiguation — first name has multiple candidate members,
  // Chris confirmed which person each whiteboard name refers to:
  'anton': 'Anton Koffler',     // not Anton Jacht
  'max': 'Max Labudda',         // not Max Weber
  'lenny': 'Lenny Kleinert',    // resolves to family_member row (see prefer-family_member rule below)
  'luisa': 'Luisa Albrecht',    // not Luisa Schmidt
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface Section {
  id: string;
  type: string;
  content?: string;
  [k: string]: unknown;
}

interface WOD {
  id: string;
  date: string;
  session_type: string;
  sections: Section[];
}

interface Member {
  id: string;
  name: string | null;
  display_name: string | null;
  email: string;
  whiteboard_name: string | null;
  status: string;
  account_type: string | null;
}

interface WeeklySession {
  id: string;
  date: string;
  time: string;
  workout_id: string | null;
}

interface Booking {
  session_id: string;
  member_id: string;
  status: string;
}

const EXCLUDE_PATTERNS = [
  /^whiteboard/i, /^intro/i, /^warm.?up/i, /^coach/i, /^notes?:?$/i,
  /^-+$/, /^\d+$/, /^https?:/i, /^workout/i, /^session/i, /^today/i,
  /^welcome/i,
];

function extractNames(content: string): string[] {
  const stripped = content.replace(/<[^>]*>/g, '');
  return stripped
    .split(/[,\n]+|(?:\s*\/\s*)/)
    .map(n => n.trim())
    .filter(n => n.length > 0)
    .filter(n => !EXCLUDE_PATTERNS.some(p => p.test(n)));
}

/**
 * Rebuild the Whiteboard Intro content with the matched names removed.
 * Strategy: split using the same separator regex as extractNames, drop tokens
 * whose lowercase form is in `removeSet`, rejoin with ", ".
 *
 * Loses original line-break / slash separators in exchange for clean output.
 * Names that match EXCLUDE_PATTERNS (e.g. "Coach: Chris") are preserved
 * because they aren't in `removeSet`.
 */
function cleanWhiteboardContent(content: string, removeSet: Set<string>): string {
  const stripped = content.replace(/<[^>]*>/g, '');
  const tokens = stripped
    .split(/[,\n]+|(?:\s*\/\s*)/)
    .map(t => t.trim())
    .filter(t => t.length > 0);
  const kept = tokens.filter(t => !removeSet.has(t.toLowerCase()));
  return kept.join(', ');
}

/**
 * Match priority:
 *   1. whiteboard_name (case-insensitive)
 *   2. ALIAS_OVERRIDES
 *   3. Exact full name (case-insensitive)
 *   4. Unique first name
 *   5. FirstName + LastInitial pattern, must be unique
 */
type MatchResult =
  | { kind: 'match'; member: Member }
  | { kind: 'ambiguous'; candidates: Member[] }
  | { kind: 'none' };

function buildMatcher(members: Member[]): (raw: string) => MatchResult {
  const byWhiteboard = new Map<string, Member>();
  const byFullName = new Map<string, Member[]>();   // full-name collisions tracked
  const byFirstName = new Map<string, Member[]>();  // first-name collisions tracked

  for (const m of members) {
    if (m.whiteboard_name) {
      byWhiteboard.set(m.whiteboard_name.toLowerCase(), m);
    }
    const full = (m.display_name || m.name || '').trim();
    if (full) {
      const key = full.toLowerCase();
      if (!byFullName.has(key)) byFullName.set(key, []);
      byFullName.get(key)!.push(m);
    }
    const first = full.split(/\s+/)[0]?.toLowerCase();
    if (first) {
      if (!byFirstName.has(first)) byFirstName.set(first, []);
      byFirstName.get(first)!.push(m);
    }
  }

  // For duplicates (same full name on >1 member rows), prefer the
  // family_member row over primary — matches the kids-booking convention.
  const pickPreferred = (cands: Member[]): Member => {
    if (cands.length === 1) return cands[0];
    const fam = cands.find(c => c.account_type === 'family_member');
    return fam ?? cands[0];
  };

  // ALIAS_OVERRIDES resolved against whiteboard_name → full name → unique first name.
  const byAlias = new Map<string, Member>();
  for (const [alias, target] of Object.entries(ALIAS_OVERRIDES)) {
    const targetLower = target.toLowerCase();
    const fullCands = byFullName.get(targetLower);
    const firstCands = byFirstName.get(targetLower);
    const candidate = byWhiteboard.get(targetLower)
      ?? (fullCands ? pickPreferred(fullCands) : null)
      ?? (firstCands?.length === 1 ? firstCands[0] : null);
    if (candidate) {
      byAlias.set(alias.toLowerCase(), candidate);
    } else {
      console.warn(`  ⚠️  ALIAS_OVERRIDES: target "${target}" not found for alias "${alias}"`);
    }
  }

  return (raw: string): MatchResult => {
    const lower = raw.toLowerCase();

    if (byWhiteboard.has(lower)) return { kind: 'match', member: byWhiteboard.get(lower)! };
    if (byAlias.has(lower)) return { kind: 'match', member: byAlias.get(lower)! };
    const fullHits = byFullName.get(lower);
    if (fullHits && fullHits.length >= 1) return { kind: 'match', member: pickPreferred(fullHits) };

    const firstHits = byFirstName.get(lower);
    if (firstHits && firstHits.length === 1) return { kind: 'match', member: firstHits[0] };
    if (firstHits && firstHits.length > 1) return { kind: 'ambiguous', candidates: firstHits };

    // FirstName+LastInitial: trailing single uppercase letter on a lowercase
    // (or accented-lowercase) prefix — e.g. "FranziskaK", "LisaV", "KathiH".
    // Require ≥2 prefix chars to avoid false positives like "AB".
    const m = raw.match(/^([A-Za-zÀ-ÿ]{2,}?)([A-Z])$/);
    if (m) {
      const firstPart = m[1].toLowerCase();
      const initial = m[2].toLowerCase();
      const candidates = byFirstName.get(firstPart) ?? [];
      const filtered = candidates.filter(c => {
        const full = (c.display_name || c.name || '').trim();
        const lastTokens = full.split(/\s+/).slice(1);
        return lastTokens.some(t => t.toLowerCase().startsWith(initial));
      });
      if (filtered.length === 1) return { kind: 'match', member: filtered[0] };
      if (filtered.length > 1) return { kind: 'ambiguous', candidates: filtered };
    }

    return { kind: 'none' };
  };
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY (will write to DB)' : 'DRY-RUN (no changes)'}`);
  console.log('='.repeat(70));

  // Fetch members (active + pending — pending captures recently-registered)
  const { data: members, error: memberErr } = await supabase
    .from('members')
    .select('id, name, display_name, email, whiteboard_name, status, account_type')
    .in('status', ['active', 'pending']);
  if (memberErr) { console.error('member fetch:', memberErr.message); process.exit(1); }
  console.log(`Members (active + pending): ${members?.length ?? 0}`);

  const matcher = buildMatcher(members as Member[]);

  // Fetch WODs (date <= today)
  const today = new Date().toISOString().slice(0, 10);
  const { data: wods, error: wodErr } = await supabase
    .from('wods').select('id, date, session_type, sections')
    .lte('date', today)
    .order('date', { ascending: true });
  if (wodErr) { console.error('wod fetch:', wodErr.message); process.exit(1); }
  console.log(`WODs (date ≤ ${today}): ${wods?.length ?? 0}`);

  // Fetch all weekly_sessions
  const { data: sessions, error: sessErr } = await supabase
    .from('weekly_sessions').select('id, date, time, workout_id');
  if (sessErr) { console.error('session fetch:', sessErr.message); process.exit(1); }

  const sessionsByWodId = new Map<string, WeeklySession[]>();
  for (const s of (sessions ?? []) as WeeklySession[]) {
    if (!s.workout_id) continue;
    if (!sessionsByWodId.has(s.workout_id)) sessionsByWodId.set(s.workout_id, []);
    sessionsByWodId.get(s.workout_id)!.push(s);
  }

  // Fetch existing bookings (paginate to bypass 1000 cap). Track status.
  const bookingByKey = new Map<string, string>(); // session_id::member_id → status
  let bookingsTotal = 0;
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('bookings').select('session_id, member_id, status')
      .range(from, from + PAGE - 1);
    if (error) { console.error('booking fetch:', error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    for (const b of data as Booking[]) {
      bookingByKey.set(`${b.session_id}::${b.member_id}`, b.status);
    }
    bookingsTotal += data.length;
    if (data.length < PAGE) break;
  }
  console.log(`Existing bookings: ${bookingsTotal}`);

  // ============ PROCESS WODS ============
  interface PerWodPlan {
    wodId: string;
    date: string;
    sessionType: string;
    originalContent: string;
    cleanedContent: string;
    namesToRemove: string[];      // names matched (any booking outcome)
    bookingsToInsert: { session_id: string; member_id: string; memberName: string; whiteboardName: string }[];
    namesAlreadyBooked: { name: string; memberName: string; status: string }[]; // matched, removed, booking already exists
    multiSessionNames: string[];  // matched but WOD has 2+ linked sessions — ambiguous, leave name
    noSessionNames: string[];     // matched but WOD has no linked session — can't book, leave name
    ambiguousNames: { name: string; candidates: string[] }[]; // first-name collision, leave name
    unmatchedNames: string[];     // unmatched, stay in whiteboard
  }

  const plans: PerWodPlan[] = [];
  const proposedBookingKeys = new Set<string>(); // dedup within this run
  const unmatchedAcross = new Map<string, number>();
  const ambiguousAcross = new Map<string, { candidates: string[]; occurrences: { date: string; sessionType: string }[] }>();

  for (const wod of (wods ?? []) as WOD[]) {
    if (!Array.isArray(wod.sections)) continue;
    const introIdx = wod.sections.findIndex(s => s.type === 'Whiteboard Intro');
    if (introIdx === -1) continue;
    const intro = wod.sections[introIdx];
    if (!intro.content?.trim()) continue;

    const names = extractNames(intro.content);
    const wodSessions = sessionsByWodId.get(wod.id) ?? [];

    const plan: PerWodPlan = {
      wodId: wod.id,
      date: wod.date,
      sessionType: wod.session_type,
      originalContent: intro.content,
      cleanedContent: intro.content,
      namesToRemove: [],
      bookingsToInsert: [],
      namesAlreadyBooked: [],
      multiSessionNames: [],
      noSessionNames: [],
      ambiguousNames: [],
      unmatchedNames: [],
    };

    for (const name of names) {
      const result = matcher(name);
      if (result.kind === 'none') {
        plan.unmatchedNames.push(name);
        unmatchedAcross.set(name, (unmatchedAcross.get(name) ?? 0) + 1);
        continue;
      }
      if (result.kind === 'ambiguous') {
        const candidateNames = result.candidates.map(c => (c.display_name || c.name || '?').trim());
        plan.ambiguousNames.push({ name, candidates: candidateNames });
        if (!ambiguousAcross.has(name)) {
          ambiguousAcross.set(name, { candidates: candidateNames, occurrences: [] });
        }
        ambiguousAcross.get(name)!.occurrences.push({ date: wod.date, sessionType: wod.session_type });
        continue;
      }
      const member = result.member;

      if (wodSessions.length === 0) {
        plan.noSessionNames.push(name);
        continue;
      }
      if (wodSessions.length > 1) {
        plan.multiSessionNames.push(name);
        continue;
      }

      const sess = wodSessions[0];
      const key = `${sess.id}::${member.id}`;
      const existingStatus = bookingByKey.get(key);

      // Always remove the matched name (member is registered, criterion met).
      plan.namesToRemove.push(name);

      if (existingStatus) {
        plan.namesAlreadyBooked.push({
          name,
          memberName: member.display_name || member.name || '(unknown)',
          status: existingStatus,
        });
      } else if (!proposedBookingKeys.has(key)) {
        proposedBookingKeys.add(key);
        plan.bookingsToInsert.push({
          session_id: sess.id,
          member_id: member.id,
          memberName: member.display_name || member.name || '(unknown)',
          whiteboardName: name,
        });
      }
      // else: same key already proposed in an earlier WOD (shouldn't happen
      // since key includes session_id, but defensive).
    }

    if (plan.namesToRemove.length > 0) {
      const removeSet = new Set(plan.namesToRemove.map(n => n.toLowerCase()));
      plan.cleanedContent = cleanWhiteboardContent(intro.content, removeSet);
    }

    plans.push(plan);
  }

  // ============ REPORT ============
  console.log('\n=== SUMMARY ===\n');

  const wodsWithIntro = plans.length;
  const wodsWithChanges = plans.filter(p => p.namesToRemove.length > 0).length;
  const totalBookingsToInsert = plans.reduce((s, p) => s + p.bookingsToInsert.length, 0);
  const totalNamesToRemove = plans.reduce((s, p) => s + p.namesToRemove.length, 0);
  const totalAlreadyBooked = plans.reduce((s, p) => s + p.namesAlreadyBooked.length, 0);
  const totalMultiSession = plans.reduce((s, p) => s + p.multiSessionNames.length, 0);
  const totalNoSession = plans.reduce((s, p) => s + p.noSessionNames.length, 0);

  console.log(`WODs with Whiteboard Intro content: ${wodsWithIntro}`);
  console.log(`WODs with at least one matched name: ${wodsWithChanges}`);
  console.log(`Names to be removed from whiteboards (matched members): ${totalNamesToRemove}`);
  console.log(`  ↳ already booked (any status), name removed only:    ${totalAlreadyBooked}`);
  console.log(`  ↳ booking will be INSERTED (status=confirmed):       ${totalBookingsToInsert}`);
  console.log(`Names skipped — WOD has 2+ linked sessions (ambiguous): ${totalMultiSession}`);
  console.log(`Names skipped — WOD has 0 linked sessions:              ${totalNoSession}`);
  console.log(`Unique ambiguous names (multiple candidate members):    ${ambiguousAcross.size}`);
  console.log(`Unique unmatched names (leave on whiteboard):           ${unmatchedAcross.size}`);

  // Breakdown by status of already-booked
  if (totalAlreadyBooked > 0) {
    const statusCounts = new Map<string, number>();
    for (const p of plans) {
      for (const a of p.namesAlreadyBooked) {
        statusCounts.set(a.status, (statusCounts.get(a.status) ?? 0) + 1);
      }
    }
    console.log('\n  Already-booked breakdown by status:');
    for (const [status, count] of [...statusCounts.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`    ${status.padEnd(20)} ${count}`);
    }
  }

  // Sample bookings to insert
  if (totalBookingsToInsert > 0) {
    console.log('\n--- Sample bookings to INSERT (first 25) ---');
    let shown = 0;
    for (const p of plans) {
      for (const b of p.bookingsToInsert) {
        if (shown >= 25) break;
        console.log(`  ${p.date}  ${p.sessionType.padEnd(15)}  "${b.whiteboardName}" → ${b.memberName}  (sess ${b.session_id.slice(0, 8)})`);
        shown++;
      }
      if (shown >= 25) break;
    }
  }

  // Sample whiteboard rewrites
  if (wodsWithChanges > 0) {
    console.log('\n--- Sample whiteboard rewrites (first 10 WODs with changes) ---');
    const samples = plans.filter(p => p.namesToRemove.length > 0).slice(0, 10);
    for (const p of samples) {
      console.log(`\n  ${p.date}  ${p.sessionType}  (wod ${p.wodId.slice(0, 8)})`);
      console.log(`    BEFORE: ${p.originalContent.replace(/\n/g, ' ⏎ ').slice(0, 120)}`);
      console.log(`    AFTER:  ${p.cleanedContent.replace(/\n/g, ' ⏎ ').slice(0, 120) || '(empty)'}`);
      console.log(`    Removed: ${p.namesToRemove.join(', ')}`);
    }
  }

  // Multi-session ambiguities
  if (totalMultiSession > 0) {
    console.log('\n--- Multi-session ambiguities (matched name, but WOD has 2+ sessions) ---');
    for (const p of plans) {
      if (p.multiSessionNames.length > 0) {
        console.log(`  ${p.date}  ${p.sessionType}: ${p.multiSessionNames.join(', ')}`);
      }
    }
  }

  // Ambiguous names
  if (ambiguousAcross.size > 0) {
    console.log('\n--- Ambiguous names (multiple candidate members — name LEFT on whiteboard) ---');
    for (const [name, info] of [...ambiguousAcross.entries()].sort((a, b) => b[1].occurrences.length - a[1].occurrences.length)) {
      console.log(`\n  "${name}" (${info.occurrences.length}x) → candidates: ${info.candidates.join(' | ')}`);
      const samples = info.occurrences.slice(0, 6);
      for (const o of samples) {
        console.log(`    ${o.date}  ${o.sessionType}`);
      }
      if (info.occurrences.length > 6) {
        console.log(`    ... and ${info.occurrences.length - 6} more`);
      }
    }
  }

  // Unmatched names
  if (unmatchedAcross.size > 0) {
    console.log('\n--- Unmatched names (top 30 by occurrence — left on whiteboard) ---');
    const sorted = [...unmatchedAcross.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
    for (const [name, count] of sorted) {
      console.log(`  ${name.padEnd(25)} ${count}x`);
    }
    if (unmatchedAcross.size > 30) {
      console.log(`  ... and ${unmatchedAcross.size - 30} more`);
    }
  }

  // ============ APPLY ============
  if (!APPLY) {
    console.log('\n' + '='.repeat(70));
    console.log('DRY-RUN complete. Re-run with --apply to commit.');
    return;
  }

  // 1. Insert bookings
  if (totalBookingsToInsert > 0) {
    console.log(`\nInserting ${totalBookingsToInsert} bookings...`);
    const rows = plans.flatMap(p => p.bookingsToInsert.map(b => ({
      session_id: b.session_id,
      member_id: b.member_id,
      status: 'confirmed' as const,
    })));
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await supabase.from('bookings').insert(chunk);
      if (error) { console.error(`booking insert chunk ${i}:`, error.message); process.exit(1); }
      console.log(`  Inserted ${Math.min(i + 500, rows.length)}/${rows.length}`);
    }
  }

  // 2. Update whiteboard sections
  const wodsToUpdate = plans.filter(p => p.namesToRemove.length > 0);
  if (wodsToUpdate.length > 0) {
    console.log(`\nUpdating ${wodsToUpdate.length} WOD whiteboard sections...`);
    let done = 0;
    for (const p of wodsToUpdate) {
      // Re-fetch sections to avoid clobbering concurrent edits.
      const { data: fresh, error: readErr } = await supabase
        .from('wods').select('sections').eq('id', p.wodId).single();
      if (readErr || !fresh) {
        console.error(`  WOD ${p.wodId.slice(0, 8)} read failed:`, readErr?.message);
        continue;
      }
      const sections = (fresh.sections as Section[]) ?? [];
      const idx = sections.findIndex(s => s.type === 'Whiteboard Intro');
      if (idx === -1) {
        console.warn(`  WOD ${p.wodId.slice(0, 8)} has no Whiteboard Intro section now — skipping.`);
        continue;
      }
      // Re-derive cleaned content from CURRENT section text (in case it moved).
      const removeSet = new Set(p.namesToRemove.map(n => n.toLowerCase()));
      const newContent = cleanWhiteboardContent(sections[idx].content ?? '', removeSet);
      const newSections = sections.map((s, i) => i === idx ? { ...s, content: newContent } : s);
      const { error: updErr } = await supabase
        .from('wods').update({ sections: newSections }).eq('id', p.wodId);
      if (updErr) {
        console.error(`  WOD ${p.wodId.slice(0, 8)} update failed:`, updErr.message);
        continue;
      }
      done++;
      if (done % 25 === 0) console.log(`  Updated ${done}/${wodsToUpdate.length}`);
    }
    console.log(`  Updated ${done}/${wodsToUpdate.length} WOD sections.`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('DONE — changes applied.');
  console.log('Reminder: 10-card holders need their counter recalculated via the TenCardModal.');
}

main().catch(err => { console.error(err); process.exit(1); });
