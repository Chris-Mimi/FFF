/**
 * Week 43.3 (S424) — apply the new dash rule to rows already written:
 * a "—" score cell → modified = true + modified_note "Did not score".
 * Scoped to exactly the 8 dashed station rows; each must match 1 row.
 *
 *   npx tsx scripts/week43-3-dash-flags.ts            # dry run
 *   npx tsx scripts/week43-3-dash-flags.ts --commit
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const COMMIT = process.argv.includes('--commit');

const WOD_21_1830 = '6ed2bcbf-99b7-4e02-aa54-07343948b1a3';
const WOD_23_1830 = 'e63d14b4-1064-4489-9a42-d5c2d9067b11';
const S1 = 'section-1792585351650-content-0';
const S2 = 'section-1792585400677-content-0';
const S3 = 'section-1792585434417-content-0';

const TARGETS = [
  { wod: WOD_21_1830, section: S1, name: 'Anfisa Bornemann' },
  { wod: WOD_21_1830, section: S2, name: 'Anfisa Bornemann' },
  { wod: WOD_21_1830, section: S3, name: 'Anfisa Bornemann' },
  { wod: WOD_21_1830, section: S1, name: 'Soledad' },
  { wod: WOD_21_1830, section: S2, name: 'Soledad' },
  { wod: WOD_23_1830, section: S1, name: 'Petra Dempfle' },
  { wod: WOD_23_1830, section: S2, name: 'Petra Dempfle' },
  { wod: WOD_23_1830, section: S3, name: 'Petra Dempfle' },
];

async function main() {
  for (const t of TARGETS) {
    const { data: m, error: mErr } = await db.from('members').select('id').eq('name', t.name);
    if (mErr) throw new Error(mErr.message);
    if (m?.length !== 1) throw new Error(`${t.name}: ${m?.length ?? 0} members`);
    const { data: rows, error } = await db
      .from('wod_section_results')
      .select('id, modified, modified_note')
      .eq('wod_id', t.wod).eq('section_id', t.section).eq('member_id', m[0].id);
    if (error) throw new Error(error.message);
    if (rows?.length !== 1) throw new Error(`${t.name} ${t.section}: ${rows?.length ?? 0} rows`);
    const r = rows[0];
    if (r.modified) { console.log(`skip ${t.name} ${t.section} (already flagged: ${r.modified_note})`); continue; }
    console.log(`${COMMIT ? 'flag' : 'would flag'} ${t.name.padEnd(18)} ${t.section}`);
    if (COMMIT) {
      const { error: uErr } = await db.from('wod_section_results')
        .update({ modified: true, modified_note: 'Did not score' }).eq('id', r.id);
      if (uErr) throw new Error(uErr.message);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
