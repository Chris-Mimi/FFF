import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // 1. Find Felix + his family
  const { data: felix } = await supabase
    .from('members')
    .select('*')
    .ilike('name', '%Felix Buffler%');
  if (!felix?.length) { console.log('Felix Buffler not found'); return; }

  for (const f of felix) {
    console.log('=== MEMBER ===');
    console.log(`id: ${f.id}`);
    console.log(`name: ${f.name}`);
    console.log(`whiteboard_name: ${f.whiteboard_name ?? '-'}`);
    console.log(`account_type: ${f.account_type}`);
    console.log(`primary_member_id: ${f.primary_member_id ?? '-'}`);
    console.log(`relationship: ${f.relationship ?? '-'}`);
    console.log(`status: ${f.status}`);
    console.log(`membership_types: ${JSON.stringify(f.membership_types)}`);
    console.log(`primary_payment_method: ${f.primary_payment_method ?? '-'}`);
    console.log(`ten_card_sessions_used: ${f.ten_card_sessions_used ?? '-'}`);
    console.log(`ten_card_purchase_date: ${f.ten_card_purchase_date ?? '-'}`);
    console.log(`ten_card_notes: ${f.ten_card_notes ?? '-'}`);
    console.log('');

    // Parent (if family_member)
    if (f.primary_member_id) {
      const { data: parent } = await supabase
        .from('members')
        .select('id, name, account_type, ten_card_sessions_used, ten_card_purchase_date, ten_card_notes, primary_payment_method, membership_types')
        .eq('id', f.primary_member_id)
        .single();
      console.log('--- PARENT (primary member) ---');
      console.log(`id: ${parent?.id}`);
      console.log(`name: ${parent?.name}`);
      console.log(`account_type: ${parent?.account_type}`);
      console.log(`ten_card_sessions_used: ${parent?.ten_card_sessions_used ?? '-'}`);
      console.log(`ten_card_purchase_date: ${parent?.ten_card_purchase_date ?? '-'}`);
      console.log(`ten_card_notes: ${parent?.ten_card_notes ?? '-'}`);
      console.log(`primary_payment_method: ${parent?.primary_payment_method ?? '-'}`);
      console.log(`membership_types: ${JSON.stringify(parent?.membership_types)}`);
      console.log('');
    }

    // Felix's bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, session_id, status, is_trial, is_og, linked_trial_name, ten_card_consumed, created_at, updated_at')
      .eq('member_id', f.id)
      .order('created_at');
    console.log(`--- Felix's bookings (${bookings?.length ?? 0}) ---`);
    for (const b of bookings ?? []) {
      const { data: sess } = await supabase
        .from('weekly_sessions')
        .select('date, time, workout_type, trial_names')
        .eq('id', b.session_id)
        .single();
      console.log(`  booking ${b.id.slice(0, 8)} session ${sess?.date} ${sess?.time} ${sess?.workout_type}`);
      console.log(`    status=${b.status} is_trial=${b.is_trial} is_og=${b.is_og} ten_card_consumed=${b.ten_card_consumed}`);
      console.log(`    linked_trial_name=${b.linked_trial_name ?? '-'}  trial_names_on_session=${JSON.stringify(sess?.trial_names)}`);
      console.log(`    created=${b.created_at}  updated=${b.updated_at}`);
    }
    console.log('');

    // Ten card history (closed cards)
    const { data: cards } = await supabase
      .from('ten_card_history')
      .select('*')
      .eq('member_id', f.id)
      .order('closed_at', { ascending: false });
    console.log(`--- ten_card_history rows for Felix (${cards?.length ?? 0}) ---`);
    for (const c of cards ?? []) {
      console.log(`  ${JSON.stringify(c)}`);
    }

    // Also check parent's ten_card_history if parent exists
    if (f.primary_member_id) {
      const { data: pcards } = await supabase
        .from('ten_card_history')
        .select('*')
        .eq('member_id', f.primary_member_id)
        .order('closed_at', { ascending: false });
      console.log(`\n--- ten_card_history rows for PARENT (${pcards?.length ?? 0}) ---`);
      for (const c of pcards ?? []) {
        console.log(`  ${JSON.stringify(c)}`);
      }
    }
    console.log('\n' + '='.repeat(60) + '\n');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
