/**
 * Compare every Wellpass login count in the Excel with what the app stored (S435).
 * Read-only. A name missing from a week's tab counts as 0 for that week.
 *
 *   npx tsx scripts/compare-wellpass-excel.ts "<path to Wellpass Checkins 2026.xlsx.xlsm>"
 *
 * Chris's file: SynologyDrive/CrossFit Hammerschmiede (CFH)/CFH Contracts and business/
 *               Wellpass Check-ins/Wellpass Checkins 2026.xlsx.xlsm
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseWellpassWorkbook } from '../lib/coach/wellpassExcelParser';

dotenv.config({ path: '.env.local' });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const FILE = process.argv[2];
if (!FILE) {
  console.error('Usage: npx tsx scripts/compare-wellpass-excel.ts "<xlsx path>"');
  process.exit(1);
}

async function main() {
  const parsed = parseWellpassWorkbook(readFileSync(FILE));
  console.log(`Excel weeks: ${parsed.weeks.map(w => `W${w.week_number}`).join(' ')}`);
  const badDates = parsed.weeks.filter(w => new Date(`${w.week_start}T12:00:00Z`).getUTCDay() !== 1);
  console.log(`Weeks not starting Monday: ${badDates.length ? badDates.map(w => `W${w.week_number}`).join(', ') : 'none'}`);

  const { data: ids, error } = await db.from('wellpass_identities').select('id, wellpass_name, tracked');
  if (error) throw error;
  const rows: { wellpass_identity_id: string; year: number; week_number: number; checkin_count: number }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error: e } = await db
      .from('wellpass_weekly_checkins')
      .select('wellpass_identity_id, year, week_number, checkin_count')
      .order('id')
      .range(from, from + 999);
    if (e) throw e;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const stored = new Map(rows.map(r => [`${r.wellpass_identity_id}|${r.year}|${r.week_number}`, r.checkin_count]));
  const isoYear = (d: string) => {
    const t = new Date(`${d}T12:00:00Z`);
    t.setUTCDate(t.getUTCDate() + 3 - ((t.getUTCDay() + 6) % 7));
    return t.getUTCFullYear();
  };

  let diffs = 0;
  for (const wk of parsed.weeks) {
    const year = isoYear(wk.week_start);
    const inExcel = new Map(wk.rows.map(r => [r.wellpass_name, r.checkin_count]));
    for (const id of ids ?? []) {
      const excel = inExcel.get(id.wellpass_name) ?? 0;
      const app = stored.get(`${id.id}|${year}|${wk.week_number}`);
      if (app === undefined ? excel > 0 : app !== excel) {
        diffs++;
        console.log(`W${wk.week_number} ${id.wellpass_name}${id.tracked ? '' : ' (untracked)'}: Excel ${excel}, app ${app ?? 'none'}`);
      }
    }
  }
  console.log(`\nTotal differences: ${diffs}`);
}

main().catch(e => { console.error(e); process.exit(1); });
