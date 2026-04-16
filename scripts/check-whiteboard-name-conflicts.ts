/**
 * Check for whiteboard name conflicts before auto-linking.
 * Compares distinct whiteboard_name values in wod_section_results
 * against registered member first names to find:
 *   1. Duplicate/similar whiteboard names (e.g. "Chris" vs "chris")
 *   2. Multiple members whose first name matches the same whiteboard name
 *   3. Whiteboard names that don't match any registered member
 *
 * Read-only — no database changes.
 *
 * Usage: npx tsx scripts/check-whiteboard-name-conflicts.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // 1. Get all distinct whiteboard names from wod_section_results
  const { data: wbRows, error: wbError } = await supabase
    .from('wod_section_results')
    .select('whiteboard_name')
    .not('whiteboard_name', 'is', null)
    .is('member_id', null);

  if (wbError) {
    console.error('Error fetching whiteboard results:', wbError.message);
    process.exit(1);
  }

  const wbNameCounts: Record<string, number> = {};
  for (const row of wbRows || []) {
    const name = row.whiteboard_name as string;
    wbNameCounts[name] = (wbNameCounts[name] || 0) + 1;
  }

  const uniqueWbNames = Object.keys(wbNameCounts).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  // 2. Get all registered members
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('id, name, display_name, status, account_type')
    .in('status', ['active', 'pending']);

  if (membersError) {
    console.error('Error fetching members:', membersError.message);
    process.exit(1);
  }

  console.log('=== WHITEBOARD NAME CONFLICT CHECK ===\n');
  console.log(`Unlinked whiteboard names in results: ${uniqueWbNames.length}`);
  console.log(`Registered members (active+pending): ${(members || []).length}\n`);

  // 3. Check for case-insensitive duplicates among whiteboard names
  const lowerMap: Record<string, string[]> = {};
  for (const name of uniqueWbNames) {
    const lower = name.toLowerCase();
    if (!lowerMap[lower]) lowerMap[lower] = [];
    lowerMap[lower].push(name);
  }

  const duplicateWbNames = Object.entries(lowerMap).filter(([, names]) => names.length > 1);
  if (duplicateWbNames.length > 0) {
    console.log('⚠️  DUPLICATE WHITEBOARD NAMES (case/spelling variants):');
    for (const [, names] of duplicateWbNames) {
      console.log(`  ${names.join(' / ')} (${names.map(n => `${wbNameCounts[n]} scores`).join(', ')})`);
    }
    console.log();
  } else {
    console.log('✓ No duplicate whiteboard names found.\n');
  }

  // 4. Match whiteboard names to members by first name
  const membersByFirstName: Record<string, { id: string; name: string; display_name: string | null; status: string }[]> = {};
  for (const m of members || []) {
    const firstName = (m.display_name || m.name || '').split(' ')[0].toLowerCase();
    if (!firstName) continue;
    if (!membersByFirstName[firstName]) membersByFirstName[firstName] = [];
    membersByFirstName[firstName].push(m);
  }

  const matched: { wbName: string; scores: number; members: { name: string; status: string }[] }[] = [];
  const multiMatch: typeof matched = [];
  const noMatch: { wbName: string; scores: number }[] = [];

  for (const wbName of uniqueWbNames) {
    const lower = wbName.toLowerCase();
    const matchingMembers = membersByFirstName[lower] || [];

    if (matchingMembers.length === 1) {
      matched.push({
        wbName,
        scores: wbNameCounts[wbName],
        members: matchingMembers.map(m => ({ name: m.name, status: m.status })),
      });
    } else if (matchingMembers.length > 1) {
      multiMatch.push({
        wbName,
        scores: wbNameCounts[wbName],
        members: matchingMembers.map(m => ({ name: m.name, status: m.status })),
      });
    } else {
      noMatch.push({ wbName, scores: wbNameCounts[wbName] });
    }
  }

  // 5. Report
  if (multiMatch.length > 0) {
    console.log('⚠️  MULTIPLE MEMBERS MATCH SAME WHITEBOARD NAME:');
    for (const m of multiMatch) {
      console.log(`  "${m.wbName}" (${m.scores} scores) → ${m.members.map(x => `${x.name} [${x.status}]`).join(', ')}`);
    }
    console.log();
  }

  if (noMatch.length > 0) {
    console.log('❌ WHITEBOARD NAMES WITH NO MATCHING MEMBER:');
    for (const m of noMatch) {
      console.log(`  "${m.wbName}" (${m.scores} scores)`);
    }
    console.log();
  }

  if (matched.length > 0) {
    console.log(`✓ CLEAN MATCHES (${matched.length} whiteboard names → 1 member each):`);
    for (const m of matched) {
      console.log(`  "${m.wbName}" (${m.scores} scores) → ${m.members[0].name}`);
    }
    console.log();
  }

  // Summary
  const issues = duplicateWbNames.length + multiMatch.length + noMatch.length;
  if (issues === 0) {
    console.log('🎉 All clear — every whiteboard name maps to exactly one registered member.');
  } else {
    console.log(`⚠️  ${issues} issue(s) to review before enabling auto-linking.`);
  }
}

main().catch(console.error);
