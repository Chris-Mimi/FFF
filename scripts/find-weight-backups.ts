/**
 * Scan every backup to locate the last-good copy of the weights for the 14
 * damaged RM-test sections (Back Squat Testing + Front Squat Testing 5RM).
 * For each backup date, report how many weighted wod_section_results rows and
 * how many lift_records exist for the target wods/lifts.
 */
import * as fs from 'fs';
import * as path from 'path';

const DIR = path.join(__dirname, '..', 'backups');

// Damaged sections: wod_id -> section content-ids
const TARGET_WODS: Record<string, { date: string; label: string }> = {
  'efd2abea-941c-4441-9184-a30a14036f9d': { date: '2026-03-23', label: 'BackSquat' },
  'e5ad0c30-df00-489a-9178-cc73b0bdba0d': { date: '2026-03-23', label: 'BackSquat' },
  'e954edad-e1d6-4304-a2b4-36e7ef991c96': { date: '2026-03-24', label: 'BackSquat' },
  'a1f2d37c-31bd-4605-a3e8-7f77f40f366e': { date: '2026-03-24', label: 'BackSquat' },
  '5c3fe17b-b7b8-4dbe-901e-cd9f0c073449': { date: '2026-04-01', label: 'BackSquat' },
  '43a3c11d': { date: '2026-04-20', label: 'FrontSquat' }, // prefix-matched below
  '0c2ff079': { date: '2026-04-20', label: 'FrontSquat' },
  '7d98ed20': { date: '2026-04-21', label: 'FrontSquat' },
  'e988eb5d': { date: '2026-04-21', label: 'FrontSquat' },
};
const SECTION_IDS = ['section-1774269586230', 'section-1774191503053-4']; // BackSquat 3RM/1RM
const FS_SECTION_HINT = /front squat/i;

const matchWod = (id: string) =>
  Object.keys(TARGET_WODS).find((k) => id === k || id.startsWith(k));

function scanWSR(date: string) {
  const f = path.join(DIR, `${date}_wod_section_results.json`);
  if (!fs.existsSync(f)) return null;
  const rows = JSON.parse(fs.readFileSync(f, 'utf8')) as any[];
  let bsWeighted = 0;
  let fsWeighted = 0;
  for (const r of rows) {
    const wk = r.wod_id ? matchWod(r.wod_id) : null;
    if (!wk) continue;
    if ((r.weight_result ?? 0) <= 0) continue;
    const label = TARGET_WODS[wk].label;
    // Back Squat: restrict to the two known lift sections
    if (label === 'BackSquat') {
      if (SECTION_IDS.some((s) => (r.section_id || '').startsWith(s))) bsWeighted++;
    } else {
      fsWeighted++; // Front Squat WOD only has the one lift section we care about
    }
  }
  return { bsWeighted, fsWeighted };
}

function scanLR(date: string) {
  const f = path.join(DIR, `${date}_lift_records.json`);
  if (!fs.existsSync(f)) return null;
  const rows = JSON.parse(fs.readFileSync(f, 'utf8')) as any[];
  let bs = 0;
  let fs2 = 0;
  for (const r of rows) {
    if (r.lift_name === 'Back Squat' && ['2026-03-23', '2026-03-24', '2026-04-01'].includes(r.lift_date)) bs++;
    if (r.lift_name === 'Front Squat' && r.rep_max_type === '5RM' && ['2026-04-20', '2026-04-21'].includes(r.lift_date)) fs2++;
  }
  return { bs, fs2 };
}

const dates = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith('_wod_section_results.json'))
  .map((f) => f.replace('_wod_section_results.json', ''))
  .sort();

console.log('date        | WSR BackSquat | WSR FrontSquat | LR BackSquat | LR FrontSquat5RM');
console.log('------------|---------------|----------------|--------------|------------------');
for (const d of dates) {
  const w = scanWSR(d);
  const l = scanLR(d);
  if (!w && !l) continue;
  console.log(
    `${d}  |   ${String(w?.bsWeighted ?? '-').padStart(9)}   |   ${String(w?.fsWeighted ?? '-').padStart(10)}   |  ${String(l?.bs ?? '-').padStart(9)}   |   ${String(l?.fs2 ?? '-').padStart(12)}`
  );
}
