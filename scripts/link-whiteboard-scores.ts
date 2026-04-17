/**
 * One-time backfill: link existing unlinked whiteboard scores to registered members.
 *
 * Context: after launch, some wod_section_results rows still have
 * whiteboard_name set and member_id null. If a member's whiteboard_name
 * matches exactly, those scores belong to that registered athlete.
 *
 * Logic:
 *   1. Build map { members.whiteboard_name → member } for all members where
 *      whiteboard_name is not null.
 *   2. Fetch all wod_section_results where whiteboard_name is not null AND
 *      member_id is null.
 *   3. For each row:
 *        - exactly one member matches → link (set member_id, user_id, clear
 *          whiteboard_name, set updated_at) — mirrors approve/route.ts:86-94
 *        - multiple members share that whiteboard_name → SKIP (ambiguous)
 *        - no member matches → SKIP (genuine unregistered name)
 *   4. Print full summary before any writes.
 *
 * Dry-run by default. Pass --apply to actually write.
 *
 * Usage:
 *   npx tsx scripts/link-whiteboard-scores.ts           # dry-run
 *   npx tsx scripts/link-whiteboard-scores.ts --apply   # write
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

type Member = { id: string; name: string | null; whiteboard_name: string };

async function main() {
  console.log('=== LINK WHITEBOARD SCORES → REGISTERED MEMBERS ===');
  console.log(APPLY ? '🔴 APPLY MODE — writes will be performed\n' : '🟢 DRY-RUN — no writes (pass --apply to write)\n');

  // 1. Members with a whiteboard_name set
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('id, name, whiteboard_name')
    .not('whiteboard_name', 'is', null);

  if (membersError) {
    console.error('Error fetching members:', membersError.message);
    process.exit(1);
  }

  // Group by whiteboard_name to detect ambiguity (multiple members share one name)
  const membersByWbName: Record<string, Member[]> = {};
  for (const m of (members || []) as Member[]) {
    const key = m.whiteboard_name;
    if (!membersByWbName[key]) membersByWbName[key] = [];
    membersByWbName[key].push(m);
  }

  console.log(`Registered members with whiteboard_name: ${(members || []).length}`);
  console.log(`Distinct whiteboard_name values on members: ${Object.keys(membersByWbName).length}\n`);

  // 2. Unlinked score rows
  const { data: rows, error: rowsError } = await supabase
    .from('wod_section_results')
    .select('id, whiteboard_name')
    .not('whiteboard_name', 'is', null)
    .is('member_id', null);

  if (rowsError) {
    console.error('Error fetching unlinked results:', rowsError.message);
    process.exit(1);
  }

  console.log(`Unlinked wod_section_results rows: ${(rows || []).length}\n`);

  // 3. Bucket score rows by status
  const scoresByWbName: Record<string, number> = {};
  for (const r of rows || []) {
    const name = r.whiteboard_name as string;
    scoresByWbName[name] = (scoresByWbName[name] || 0) + 1;
  }

  const toLink: { wbName: string; member: Member; count: number }[] = [];
  const conflicts: { wbName: string; members: Member[]; count: number }[] = [];
  const noMatch: { wbName: string; count: number }[] = [];

  for (const [wbName, count] of Object.entries(scoresByWbName)) {
    const matches = membersByWbName[wbName] || [];
    if (matches.length === 1) {
      toLink.push({ wbName, member: matches[0], count });
    } else if (matches.length > 1) {
      conflicts.push({ wbName, members: matches, count });
    } else {
      noMatch.push({ wbName, count });
    }
  }

  // 4. Report
  if (conflicts.length > 0) {
    console.log('⚠️  CONFLICTS — multiple members share the same whiteboard_name (will SKIP):');
    for (const c of conflicts) {
      console.log(`  "${c.wbName}" (${c.count} scores) → ${c.members.map(m => `${m.name} [${m.id.slice(0, 8)}]`).join(', ')}`);
    }
    console.log();
  }

  if (noMatch.length > 0) {
    console.log(`⏭️  NO MATCH — whiteboard names without a registered member (will SKIP): ${noMatch.length}`);
    for (const n of noMatch) {
      console.log(`  "${n.wbName}" (${n.count} scores)`);
    }
    console.log();
  }

  if (toLink.length === 0) {
    console.log('No rows to link. Done.');
    return;
  }

  console.log(`✓ WILL LINK (${toLink.length} whiteboard names → member):`);
  for (const t of toLink) {
    console.log(`  "${t.wbName}" → ${t.member.name} (${t.count} scores)`);
  }
  console.log();

  const totalToLink = toLink.reduce((sum, t) => sum + t.count, 0);
  console.log(`Total rows that will be updated: ${totalToLink}\n`);

  if (!APPLY) {
    console.log('Dry-run complete. Re-run with --apply to perform the writes.');
    return;
  }

  // 5. Apply
  console.log('Applying updates...\n');
  const now = new Date().toISOString();
  const results: { wbName: string; memberName: string | null; linked: number; error?: string }[] = [];

  for (const t of toLink) {
    const { data, error } = await supabase
      .from('wod_section_results')
      .update({
        member_id: t.member.id,
        user_id: t.member.id,
        whiteboard_name: null,
        updated_at: now,
      })
      .eq('whiteboard_name', t.wbName)
      .is('member_id', null)
      .select('id');

    if (error) {
      results.push({ wbName: t.wbName, memberName: t.member.name, linked: 0, error: error.message });
    } else {
      results.push({ wbName: t.wbName, memberName: t.member.name, linked: data?.length || 0 });
    }
  }

  console.log('=== RESULTS ===');
  let totalLinked = 0;
  let totalErrors = 0;
  for (const r of results) {
    if (r.error) {
      console.log(`  ❌ "${r.wbName}" → ${r.memberName}: ERROR — ${r.error}`);
      totalErrors++;
    } else {
      console.log(`  ✓ "${r.wbName}" → ${r.memberName}: ${r.linked} linked`);
      totalLinked += r.linked;
    }
  }

  console.log(`\nLinked: ${totalLinked}`);
  console.log(`Skipped (conflicts): ${conflicts.reduce((s, c) => s + c.count, 0)}`);
  console.log(`Skipped (no match): ${noMatch.reduce((s, n) => s + n.count, 0)}`);
  if (totalErrors > 0) console.log(`Errors: ${totalErrors}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
