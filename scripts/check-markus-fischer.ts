import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: members } = await s
    .from('members')
    .select('*')
    .ilike('name', '%markus%fischer%');

  if (!members?.length) {
    console.log('No member matching "Markus Fischer"');
    return;
  }

  for (const m of members) {
    console.log(`\n=== ${m.name} (id=${m.id}) ===`);
    console.log(`  status: ${m.status}`);
    console.log(`  membership_types: ${JSON.stringify(m.membership_types)}`);
    console.log(`  ten_card_sessions_used: ${m.ten_card_sessions_used}`);
    console.log(`  ten_card_total_sessions: ${m.ten_card_total_sessions}`);
    console.log(`  ten_card_purchase_date: ${m.ten_card_purchase_date}`);
    console.log(`  ten_card_expiry_date: ${m.ten_card_expiry_date ?? '-'}`);

    const { data: bookings } = await s
      .from('bookings')
      .select(`
        id, member_id, status, is_trial, is_og,
        ten_card_consumed, created_at,
        session_id,
        weekly_sessions:session_id (id, date, time, workout_type, workout_id)
      `)
      .eq('member_id', m.id)
      .gte('created_at', '2026-05-01')
      .order('created_at', { ascending: true });

    console.log(`\n  Bookings since 2026-05-01: ${bookings?.length ?? 0}`);
    bookings?.forEach((b: any) => {
      const sess = b.weekly_sessions;
      const sessInfo = sess ? `${sess.date} ${sess.time?.slice(0, 5)} ${sess.workout_type}` : 'NO SESSION';
      console.log(
        `    ${b.created_at.slice(0, 10)} created | ${sessInfo} | ` +
        `status=${b.status} | ten_card_consumed=${b.ten_card_consumed} | ` +
        `is_trial=${b.is_trial} | is_og=${b.is_og} | id=${b.id}`
      );
    });

    const { count: consumedCount } = await s
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', m.id)
      .eq('ten_card_consumed', true);

    console.log(`\n  Total bookings with ten_card_consumed=true (lifetime): ${consumedCount}`);

    if (m.ten_card_purchase_date) {
      const { count: consumedSincePurchase } = await s
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('member_id', m.id)
        .eq('ten_card_consumed', true)
        .gte('created_at', m.ten_card_purchase_date);
      console.log(`  ten_card_consumed=true since current purchase date (${m.ten_card_purchase_date}): ${consumedSincePurchase}`);
    }
  }
}

main();
