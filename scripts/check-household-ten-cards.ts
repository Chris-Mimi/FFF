/**
 * Read-only: print what the athlete-side 10-card panel (Book a Class) would show
 * for a member's login — same function the /api/bookings/ten-card-status route uses.
 *
 * Usage:
 *   npx tsx scripts/check-household-ten-cards.ts "<name fragment>" [...more]
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  const { getHouseholdTenCards } = await import('../lib/tenCardStatus');
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const fragments = process.argv.slice(2);
  if (fragments.length === 0) {
    console.error('Usage: npx tsx scripts/check-household-ten-cards.ts "<name fragment>" [...]');
    process.exit(1);
  }

  for (const frag of fragments) {
    const { data, error } = await db
      .from('members')
      .select('id, name, display_name, account_type')
      .ilike('name', `%${frag}%`)
      .neq('account_type', 'family_member');
    if (error) throw error;
    if (!data?.length) { console.log(`\n"${frag}": no login account found`); continue; }
    for (const m of data) {
      const cards = await getHouseholdTenCards(db, m.id);
      console.log(`\n${m.display_name || m.name} (${m.id.slice(0, 8)}): ${cards.length} card(s)`);
      for (const c of cards) console.log('  ', JSON.stringify(c));
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
