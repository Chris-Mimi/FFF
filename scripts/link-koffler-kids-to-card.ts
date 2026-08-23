/**
 * Link Anton + Viktoria Koffler to Irene's 10-card. Clear Viktoria's stale own card.
 * Both kids had 0 consumed bookings (verified). Scoped to these 2 rows.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const IRENE = 'c77cad44-076a-49d0-a4dd-4fea78b7d176';
const ANTON = '167a072f-4824-4af1-b9c8-694328887c02';
const VIKTORIA = 'c27d3449-af59-49f3-9a4a-526193cced25';
async function main() {
  const a = await supabase.from('members')
    .update({ ten_card_holder_id: IRENE, primary_payment_method: 'ten_card' })
    .eq('id', ANTON);
  console.log('Anton:', a.error ? a.error : 'ok');

  const v = await supabase.from('members')
    .update({ ten_card_holder_id: IRENE, primary_payment_method: 'ten_card',
              ten_card_purchase_date: null, ten_card_sessions_used: 0 })
    .eq('id', VIKTORIA);
  console.log('Viktoria:', v.error ? v.error : 'ok');
}
main();
