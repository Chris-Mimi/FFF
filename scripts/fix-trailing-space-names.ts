/**
 * One-shot: trim trailing whitespace on two members.name rows
 * ('Anneke Spegele ' + 'Sandra Lederle ') so the S357 lift import
 * can match exactly.
 *
 * Pass --apply to commit. Default is dry-run.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');

const TARGETS = ['Anneke Spegele ', 'Sandra Lederle '];

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  for (const oldName of TARGETS) {
    const trimmed = oldName.trim();
    const { data: rows, error } = await supabase
      .from('members')
      .select('id, name')
      .eq('name', oldName);
    if (error) { console.error(error); process.exit(1); }
    if (!rows?.length) {
      console.log(`  (no row found for '${oldName}' — skipping)`);
      continue;
    }
    if (rows.length > 1) {
      console.error(`  ⚠️ multiple rows for '${oldName}' — aborting`);
      process.exit(1);
    }
    const id = rows[0].id;
    console.log(`  '${oldName}' (id=${id}) → '${trimmed}'`);
    if (APPLY) {
      const { error: updErr } = await supabase
        .from('members')
        .update({ name: trimmed })
        .eq('id', id);
      if (updErr) { console.error(updErr); process.exit(1); }
      console.log('    ✅ updated');
    }
  }
  if (!APPLY) console.log('\nDry-run only. Re-run with --apply to commit.');
}
main();
