// One-off: link Ferdi to Anna Mavrommatis-Karaaslan's Wellpass identity (S436).
// Default = dry run (lists matches). Pass --apply to insert. INSERT-only, idempotent.
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const apply = process.argv.includes('--apply');
(async () => {
  const { data: ids, error: idErr } = await s.from('wellpass_identities')
    .select('*').ilike('wellpass_name', '%Mavrommatis%');
  if (idErr) { console.error('identity error:', idErr.message); return; }
  console.log('Identities:', JSON.stringify(ids, null, 1));

  const { data: mems, error: mErr } = await s.from('members')
    .select('id, name, display_name, email, status, account_type, primary_member_id')
    .or('name.ilike.%Ferdi%,display_name.ilike.%Ferdi%');
  if (mErr) { console.error('member error:', mErr.message); return; }
  console.log('Members:', JSON.stringify(mems, null, 1));

  for (const i of ids ?? []) {
    const { data: links } = await s.from('wellpass_identity_members')
      .select('member_id').eq('wellpass_identity_id', i.id);
    const mids = (links ?? []).map(l => l.member_id);
    const { data: linked } = mids.length ? await s.from('members').select('id, name, display_name').in('id', mids) : { data: [] };
    console.log(`Linked to "${i.wellpass_name}":`, (linked ?? []).map(m => m.display_name || m.name));
  }

  if (!apply) return;
  if ((ids ?? []).length !== 1 || (mems ?? []).length !== 1) { console.error('Need exactly 1 identity and 1 member — aborting.'); return; }
  const identityId = ids![0].id, memberId = mems![0].id;
  const { data: existing } = await s.from('wellpass_identity_members')
    .select('member_id').eq('wellpass_identity_id', identityId).eq('member_id', memberId);
  if ((existing ?? []).length) { console.log('Already linked — nothing to do.'); return; }
  const { error: insErr } = await s.from('wellpass_identity_members')
    .insert({ wellpass_identity_id: identityId, member_id: memberId });
  if (insErr) { console.error('insert error:', insErr.message); return; }
  console.log('Linked OK.');
})();
