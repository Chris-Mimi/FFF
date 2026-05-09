/**
 * After clean-whiteboard-and-book.ts --apply: list which members got new
 * confirmed bookings AND are 10-card payers, so they can be Recalced via
 * the TenCardModal.
 *
 * Looks at bookings created in the last 5 minutes. Read-only.
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
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: recent, error } = await supabase
    .from('bookings')
    .select('member_id, created_at')
    .gte('created_at', fiveMinAgo)
    .eq('status', 'confirmed');
  if (error) { console.error(error.message); process.exit(1); }

  const memberIds = new Set((recent ?? []).map(r => r.member_id));
  const countByMember = new Map<string, number>();
  for (const r of recent ?? []) {
    countByMember.set(r.member_id, (countByMember.get(r.member_id) ?? 0) + 1);
  }

  if (memberIds.size === 0) {
    console.log('No bookings created in the last 5 minutes.');
    return;
  }

  const { data: members, error: memberErr } = await supabase
    .from('members')
    .select('id, name, display_name, primary_payment_method, membership_types, ten_card_holder_id, primary_member_id')
    .in('id', [...memberIds]);
  if (memberErr) { console.error(memberErr.message); process.exit(1); }

  console.log(`Members with new bookings: ${members?.length ?? 0}`);
  console.log(`Total bookings inserted: ${recent?.length ?? 0}\n`);

  const tenCardMembers: { name: string; holderName: string; count: number }[] = [];
  const otherMembers: { name: string; method: string; count: number }[] = [];

  // Pre-fetch ten_card_holder names
  const holderIds = new Set<string>();
  for (const m of members ?? []) {
    if (m.ten_card_holder_id) holderIds.add(m.ten_card_holder_id);
  }
  const { data: holders } = await supabase
    .from('members').select('id, name, display_name')
    .in('id', [...holderIds].length > 0 ? [...holderIds] : ['00000000-0000-0000-0000-000000000000']);
  const holderName = new Map<string, string>();
  for (const h of holders ?? []) holderName.set(h.id, h.display_name || h.name || '?');

  for (const m of members ?? []) {
    const name = (m.display_name || m.name || '?').trim();
    const count = countByMember.get(m.id) ?? 0;
    const method = m.primary_payment_method || (m.membership_types?.[0] ?? '?');
    if (method === 'ten_card') {
      const holder = m.ten_card_holder_id ? (holderName.get(m.ten_card_holder_id) ?? '?') : 'self';
      tenCardMembers.push({ name, holderName: holder, count });
    } else {
      otherMembers.push({ name, method, count });
    }
  }

  if (tenCardMembers.length > 0) {
    console.log('=== 10-CARD HOLDERS — RECALC NEEDED VIA TenCardModal ===\n');
    tenCardMembers.sort((a, b) => b.count - a.count);
    for (const m of tenCardMembers) {
      const holderTag = m.holderName === 'self' ? '' : `   (card on: ${m.holderName})`;
      console.log(`  ${m.name.padEnd(25)} +${m.count} bookings${holderTag}`);
    }
  } else {
    console.log('=== No 10-card holders affected — nothing to Recalc ===');
  }

  if (otherMembers.length > 0) {
    console.log('\n=== Other members (no Recalc needed) ===\n');
    const byMethod = new Map<string, typeof otherMembers>();
    for (const m of otherMembers) {
      if (!byMethod.has(m.method)) byMethod.set(m.method, []);
      byMethod.get(m.method)!.push(m);
    }
    for (const [method, list] of byMethod) {
      console.log(`  [${method}] ${list.length} members, ${list.reduce((s, m) => s + m.count, 0)} bookings`);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
