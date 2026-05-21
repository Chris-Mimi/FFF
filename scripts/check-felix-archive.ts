import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const FELIX_ID = 'd24975d4-7f06-481a-84e9-f59dfe2c7f09';
  const MUM_ID = '1b81e36e-64f0-4fd9-bd9c-e5a10d947d15';

  for (const [label, id] of [['FELIX', FELIX_ID], ['MUM', MUM_ID]] as const) {
    const { data, error } = await supabase
      .from('ten_card_archive')
      .select('*')
      .eq('member_id', id)
      .order('created_at', { ascending: false });
    console.log(`=== ten_card_archive for ${label} (${id.slice(0,8)}) ===`);
    if (error) { console.log(`error: ${error.message}`); continue; }
    console.log(`rows: ${data?.length ?? 0}`);
    for (const r of data ?? []) console.log(JSON.stringify(r, null, 2));
    console.log('');
  }

  // Felix's current member columns relevant to cards
  const { data: felix } = await supabase
    .from('members')
    .select('id, name, ten_card_total, ten_card_sessions_used, ten_card_purchase_date, ten_card_expiry_date, ten_card_notes, ten_card_holder_id, primary_payment_method, membership_types, account_type, primary_member_id')
    .eq('id', FELIX_ID).single();
  console.log('=== Felix current card columns ===');
  console.log(JSON.stringify(felix, null, 2));
  console.log('');

  const { data: mum } = await supabase
    .from('members')
    .select('id, name, ten_card_total, ten_card_sessions_used, ten_card_purchase_date, ten_card_expiry_date, ten_card_notes, ten_card_holder_id, primary_payment_method, membership_types, account_type')
    .eq('id', MUM_ID).single();
  console.log('=== Mum current card columns ===');
  console.log(JSON.stringify(mum, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
