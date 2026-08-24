// One-off: link Lani Neumann (child) to her mum Katja's Wellpass identity so her
// bookings/attendance show under the household in the coach Wellpass tab.
// INSERT-only, idempotent. Requested by Chris, S407.
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
(async () => {
  const identityId = 'b844a7ff-c2e3-4392-a54c-a79c40efd0d5'; // Katja Neumann (wellpass_identities)
  const laniId = 'be640517-180a-4683-bb9e-8a152ce963d6';     // Lani Neumann (members, child)

  const { data: existing, error: exErr } = await s.from('wellpass_identity_members')
    .select('member_id').eq('wellpass_identity_id', identityId).eq('member_id', laniId);
  if (exErr) { console.error('check error:', exErr.message); return; }
  if ((existing ?? []).length) { console.log('Already linked — nothing to do.'); return; }

  const { error: insErr } = await s.from('wellpass_identity_members')
    .insert({ wellpass_identity_id: identityId, member_id: laniId });
  if (insErr) { console.error('insert error:', insErr.message); return; }

  const { data: links } = await s.from('wellpass_identity_members')
    .select('member_id').eq('wellpass_identity_id', identityId);
  const ids = (links ?? []).map(l => l.member_id);
  const { data: mem } = await s.from('members').select('id, name').in('id', ids);
  console.log('Linked OK. Members now on "Katja Neumann":');
  (mem ?? []).forEach(m => console.log(`  ${m.name}`));
})();
