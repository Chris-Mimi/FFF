/**
 * One-shot probe: for each candidate first name, dump every member row that
 * could plausibly match, regardless of status. Output: name, display_name,
 * status, account_type, class_types, whiteboard_name.
 *
 * Read-only.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CANDIDATES = ['Anton', 'Max', 'Lenny', 'Luisa', 'Susanne', 'Sole', 'Soledad'];

async function main() {
  const { data: all, error } = await supabase
    .from('members')
    .select('id, name, display_name, status, account_type, class_types, whiteboard_name, primary_member_id, date_of_birth');
  if (error) { console.error(error.message); process.exit(1); }

  for (const cand of CANDIDATES) {
    const lc = cand.toLowerCase();
    const hits = (all ?? []).filter(m => {
      const n = (m.name || '').toLowerCase();
      const d = (m.display_name || '').toLowerCase();
      const w = (m.whiteboard_name || '').toLowerCase();
      return n.startsWith(lc) || d.startsWith(lc) || w === lc
        || n.includes(' ' + lc) || d.includes(' ' + lc);
    });
    console.log(`\n=== ${cand} (${hits.length} hits) ===`);
    for (const h of hits) {
      console.log(`  ${(h.display_name || h.name || '(unnamed)').padEnd(28)} status=${(h.status || '').padEnd(8)} acct=${(h.account_type || '').padEnd(13)} class_types=${JSON.stringify(h.class_types ?? null).padEnd(18)} wb=${h.whiteboard_name || '-'}`);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
