/**
 * Compare the Wellpass Excel check-ins against what's stored in the app DB.
 * Parses the workbook with the SAME parser the import uses, then diffs every
 * (identity × week) check-in count.
 *
 * Usage: npx tsx scripts/compare-wellpass-excel-vs-db.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { parseWellpassWorkbook } from '../lib/coach/wellpassExcelParser';

dotenv.config({ path: '.env.local' });

const EXCEL_PATH =
  '/Users/chrishiles/SynologyDrive/CrossFit Hammerschmiede (CFH)/CFH Contracts and business/Wellpass Check-ins/Wellpass Checkins 2026.xlsx.xlsm';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Same ISO-week-year helper the import uses.
const isoWeekYear = (dateStr: string): number => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1, d));
  target.setUTCDate(target.getUTCDate() + 3 - ((target.getUTCDay() + 6) % 7));
  return target.getUTCFullYear();
};

const normalize = (n: string) => n.trim().replace(/\s+/g, ' ').toLowerCase();

async function main() {
  const buffer = fs.readFileSync(EXCEL_PATH);
  const parsed = parseWellpassWorkbook(buffer);
  console.log(`Excel parsed: ${parsed.weeks.length} week sheets, skipped: ${parsed.skipped_sheets.join(', ') || 'none'}`);

  // Identities: name -> id
  const { data: identities } = await supabase
    .from('wellpass_identities')
    .select('id, wellpass_name, tracked');
  const idByName = new Map<string, { id: string; tracked: boolean }>();
  for (const i of identities ?? []) idByName.set(normalize(i.wellpass_name), { id: i.id, tracked: i.tracked });

  // All DB check-ins (paginated), keyed identity|year|week
  const dbByKey = new Map<string, number>();
  {
    const PAGE = 1000;
    let from = 0;
    for (;;) {
      const { data: page } = await supabase
        .from('wellpass_weekly_checkins')
        .select('wellpass_identity_id, year, week_number, checkin_count')
        .range(from, from + PAGE - 1);
      if (!page || page.length === 0) break;
      for (const r of page) dbByKey.set(`${r.wellpass_identity_id}|${r.year}|${r.week_number}`, r.checkin_count);
      if (page.length < PAGE) break;
      from += PAGE;
    }
  }

  const mismatches: { name: string; week: number; year: number; excel: number; db: number | 'MISSING' }[] = [];
  const unmatchedNames = new Set<string>();
  let compared = 0;

  for (const wk of parsed.weeks) {
    const year = isoWeekYear(wk.week_start);
    for (const row of wk.rows) {
      const ident = idByName.get(normalize(row.wellpass_name));
      if (!ident) {
        unmatchedNames.add(row.wellpass_name);
        continue;
      }
      const key = `${ident.id}|${year}|${wk.week_number}`;
      const dbVal = dbByKey.get(key);
      compared++;
      if (dbVal === undefined) {
        mismatches.push({ name: row.wellpass_name, week: wk.week_number, year, excel: row.checkin_count, db: 'MISSING' });
      } else if (dbVal !== row.checkin_count) {
        mismatches.push({ name: row.wellpass_name, week: wk.week_number, year, excel: row.checkin_count, db: dbVal });
      }
    }
  }

  console.log(`\nCompared ${compared} (person × week) cells across ${parsed.weeks.length} weeks.`);
  console.log(`Mismatches: ${mismatches.length}`);
  if (mismatches.length > 0) {
    mismatches.sort((a, b) => a.week - b.week || a.name.localeCompare(b.name));
    console.table(mismatches);
  }
  if (unmatchedNames.size > 0) {
    console.log(`\nExcel names with NO matching identity in DB (${unmatchedNames.size}) — these rows couldn't be compared:`);
    console.log([...unmatchedNames].sort().join('\n'));
  }
  if (mismatches.length === 0 && unmatchedNames.size === 0) {
    console.log('\n✅ Every Excel cell matches the database exactly.');
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
