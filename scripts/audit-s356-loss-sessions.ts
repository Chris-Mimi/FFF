/**
 * Bulk audit of the 8 S356 high-confidence score-loss sessions.
 *
 * For each session: fetch the WOD's sections (so we know what scoring was set up),
 * list confirmed athletes with their booking status, and count existing
 * wod_section_results + lift_records keyed to that wod. Output is structured to
 * let Chris judge per-session "real loss vs intentional non-scoring."
 *
 * Usage:
 *   npx tsx scripts/audit-s356-loss-sessions.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const SESSIONS: Array<{ date: string; time: string; label: string }> = [
  { date: '2026-03-30', time: '17:15:00', label: 'Deadlift Testing 3 & 1RM, AKBS, HS Hold, Pull-Up Hold' },
  { date: '2026-04-02', time: '18:30:00', label: 'Open Gym / Filthy Fifty' },
  { date: '2026-04-12', time: '11:00:00', label: 'TGU, MetCon review' },
  { date: '2026-04-17', time: '09:00:00', label: 'Barbell GM, KB C&PP, KB Row' },
  { date: '2026-04-24', time: '17:15:00', label: 'Weekend WOD #26.11' },
  { date: '2026-04-24', time: '18:30:00', label: 'Weekend WOD #26.11' },
  { date: '2026-05-01', time: '09:00:00', label: 'Labour Day Partner Bash' },
  { date: '2026-05-01', time: '17:15:00', label: 'Labour Day Partner Bash' },
];

type SectionShape = {
  id?: string;
  type?: string;
  content?: string;
  lifts?: Array<{ name?: string; lift_name?: string }>;
  benchmarks?: Array<{ name?: string }>;
  forge_benchmarks?: Array<{ name?: string }>;
  scoring_fields?: Array<{ name?: string; type?: string }>;
};

function summarizeSection(s: SectionShape): string {
  const type = s.type || '(no type)';
  const liftNames = (s.lifts || []).map(l => l.lift_name || l.name).filter(Boolean).join(', ');
  const benchNames = (s.benchmarks || []).map(b => b.name).filter(Boolean).join(', ');
  const forgeNames = (s.forge_benchmarks || []).map(b => b.name).filter(Boolean).join(', ');
  const scoringFields = (s.scoring_fields || []).length;
  const hasScoring = scoringFields > 0;

  const detail: string[] = [];
  if (liftNames) detail.push(`lifts=[${liftNames}]`);
  if (benchNames) detail.push(`benchmark=[${benchNames}]`);
  if (forgeNames) detail.push(`forge=[${forgeNames}]`);
  detail.push(hasScoring ? `scoring_fields=${scoringFields}` : 'NO scoring_fields');

  return `${type}  ${detail.join('  ')}`;
}

async function auditOne(session: { date: string; time: string; label: string }) {
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`${session.date} ${session.time.slice(0, 5)}  —  ${session.label}`);

  const { data: ws, error: wsErr } = await supabase
    .from('weekly_sessions')
    .select('id, date, time, workout_id, capacity, workout_type')
    .eq('date', session.date)
    .eq('time', session.time)
    .maybeSingle();

  if (wsErr || !ws) {
    console.log(`  ⚠ no weekly_session row found  (error: ${wsErr?.message || 'no match'})`);
    return;
  }
  if (!ws.workout_id) {
    console.log(`  ⚠ session has no linked workout_id`);
    return;
  }

  const { data: wod } = await supabase
    .from('wods')
    .select('id, session_type, title, workout_name, sections, workout_publish_status')
    .eq('id', ws.workout_id)
    .maybeSingle();

  if (!wod) {
    console.log(`  ⚠ workout_id ${ws.workout_id} not found`);
    return;
  }

  console.log(`  WOD: "${wod.title || wod.session_type || wod.workout_name || '(untitled)'}"  [publish=${wod.workout_publish_status || '?'}]`);
  console.log(`  wod_id: ${wod.id}`);

  const sections = (wod.sections || []) as SectionShape[];
  if (sections.length === 0) {
    console.log(`  Sections: (none)`);
  } else {
    console.log(`  Sections (${sections.length}):`);
    for (const s of sections) {
      console.log(`    • ${summarizeSection(s)}`);
    }
  }

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, status, is_og, is_trial, member_id, members(name, display_name)')
    .eq('session_id', ws.id)
    .order('status');

  const byStatus = new Map<string, string[]>();
  for (const b of bookings || []) {
    const m = Array.isArray(b.members) ? b.members[0] : b.members;
    const name = (m?.display_name || m?.name || '—') + (b.is_og ? ' (OG)' : '') + (b.is_trial ? ' (trial)' : '');
    if (!byStatus.has(b.status)) byStatus.set(b.status, []);
    byStatus.get(b.status)!.push(name);
  }
  const confirmed = byStatus.get('confirmed') || [];
  const noShow = byStatus.get('no_show') || [];
  const lateCancel = byStatus.get('late_cancel') || [];
  const cancelled = byStatus.get('cancelled') || [];
  console.log(`  Bookings: confirmed=${confirmed.length}  no_show=${noShow.length}  late_cancel=${lateCancel.length}  cancelled=${cancelled.length}`);
  if (confirmed.length > 0) {
    console.log(`    confirmed: ${confirmed.join(', ')}`);
  }
  if (noShow.length > 0) {
    console.log(`    no_show: ${noShow.join(', ')}`);
  }
  if (lateCancel.length > 0) {
    console.log(`    late_cancel: ${lateCancel.join(', ')}`);
  }

  const { count: wsrCount } = await supabase
    .from('wod_section_results')
    .select('*', { count: 'exact', head: true })
    .eq('wod_id', wod.id);
  const { count: liftCount } = await supabase
    .from('lift_records')
    .select('*', { count: 'exact', head: true })
    .eq('wod_id', wod.id);

  console.log(`  Existing scores: wod_section_results=${wsrCount ?? 0}  lift_records=${liftCount ?? 0}`);

  // Heuristic: count how many of this WOD's sections expect scoring (have scoring_fields
  // OR are lift/benchmark sections), to flag "expected scoring" vs "no scoring set up".
  const expectsScoring = sections.filter(s => {
    if ((s.scoring_fields || []).length > 0) return true;
    if ((s.lifts || []).length > 0) return true;
    if ((s.benchmarks || []).length > 0) return true;
    if ((s.forge_benchmarks || []).length > 0) return true;
    return false;
  }).length;

  const expectedScoreRows = expectsScoring * confirmed.length;
  console.log(`  Expected ≈ ${expectsScoring} scoring section(s) × ${confirmed.length} confirmed = up to ${expectedScoreRows} score rows`);
  console.log('');
}

async function main() {
  console.log(`Auditing ${SESSIONS.length} S356 score-loss candidate sessions…\n`);
  for (const s of SESSIONS) {
    await auditOne(s);
  }
}

main().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
