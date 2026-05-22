/**
 * Audit + fix whitespace typos in members.name.
 *
 * Detects:
 *   - leading whitespace
 *   - trailing whitespace
 *   - any run of >1 internal whitespace characters
 *
 * Default = dry-run (lists offenders). Pass --apply to commit the trim.
 * Normalized result = original.trim().replace(/\s+/g, ' ').
 *
 * Usage:
 *   npx tsx scripts/audit-name-whitespace.ts
 *   npx tsx scripts/audit-name-whitespace.ts --apply
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await supabase
    .from('members')
    .select('id, name')
    .order('name');
  if (error) { console.error(error); process.exit(1); }
  if (!data) { console.log('No members.'); return; }

  type Issue = { id: string; before: string; after: string; kind: string[] };
  const issues: Issue[] = [];

  for (const m of data) {
    if (!m.name) continue;
    const norm = m.name.trim().replace(/\s+/g, ' ');
    if (norm === m.name) continue;
    const kinds: string[] = [];
    if (m.name !== m.name.trim()) {
      if (m.name.startsWith(' ') || m.name.startsWith('\t')) kinds.push('leading');
      if (m.name.endsWith(' ') || m.name.endsWith('\t')) kinds.push('trailing');
    }
    if (/\s{2,}/.test(m.name.trim())) kinds.push('double-space');
    issues.push({ id: m.id, before: m.name, after: norm, kind: kinds });
  }

  if (issues.length === 0) {
    console.log('✓ No whitespace typos found. All members.name rows are clean.');
    return;
  }

  console.log(`Found ${issues.length} member name(s) with whitespace typos:\n`);
  console.log('Kind                          BEFORE → AFTER');
  console.log('───────────────────────────   ──────────────────────────────────────────');
  for (const i of issues) {
    const kindStr = i.kind.join(', ').padEnd(28);
    console.log(`${kindStr}  '${i.before}' → '${i.after}'`);
  }

  if (!APPLY) {
    console.log(`\nDry-run. Pass --apply to fix these ${issues.length} rows.`);
    return;
  }

  console.log(`\nApplying...`);
  let ok = 0;
  for (const i of issues) {
    const { error: updErr } = await supabase
      .from('members')
      .update({ name: i.after })
      .eq('id', i.id);
    if (updErr) {
      console.error(`  ✗ ${i.before}: ${updErr.message}`);
    } else {
      ok++;
    }
  }
  console.log(`✓ Fixed ${ok}/${issues.length} rows.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
