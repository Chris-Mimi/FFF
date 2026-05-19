/**
 * S357: convert the women's master lift JSON (at /tmp/girls-master.json)
 * into 18 per-athlete files in data/athletes/, in the schema expected
 * by scripts/import-athlete-lift-records.ts.
 *
 * Source schema (one big object keyed by short name):
 *   { Mimi: { girl, lifts: [{ lift, records: [{ weight, date, current }] }] }, ... }
 *
 * Target schema (per file):
 *   { athlete, full_name, gender: 'F', results: { "<liftKey>": [{weight_kg, date}] } }
 *
 * Drops the `current` flag — the existing import dedupes on
 * (user + lift + date + rep_max_type), so duplicates within the source
 * are collapsed naturally.
 */
import * as fs from 'fs';
import * as path from 'path';

const MAPPING: Record<string, string> = {
  Mimi: 'Mimi Hiles',
  Anneke: 'Anneke Spegele',
  Claudia: 'Claudia Herrmann',
  Sole: 'Soledad',
  Sandra: 'Sandra Lederle',
  Anja: 'Anja Götte',
  Carole: 'Carole Schultz',
  Irene: 'Koffler Irene',
  SabrinaN: 'Sabrina Lucas',
  Annerose: 'Annerose Streit',
  Miriam: 'Miriam Jacht',
  Madi: 'Madeleine Gehring',
  SusiG: 'Susi Glocker',
  Dinny: 'Dinny Braatz',
  Petra: 'Petra Dempfle',
  Katharina: 'Katharina Herbst',
  AnneS: 'Anne Schaber',
  Kathrin: 'Kathrin Mühlen',
};

function toKebab(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

type SrcRecord = { weight: number; date: string; current?: boolean };
type SrcLift = { lift: string; records: SrcRecord[] };
type SrcAthlete = { girl: string; lifts: SrcLift[] };

const master: Record<string, SrcAthlete> = JSON.parse(
  fs.readFileSync('/tmp/girls-master.json', 'utf-8')
);

const outDir = path.resolve('data/athletes');
let written = 0;

for (const [shortKey, athlete] of Object.entries(master)) {
  const fullName = MAPPING[shortKey];
  if (!fullName) {
    console.warn(`⚠️  No MAPPING entry for "${shortKey}" — skipping`);
    continue;
  }
  const results: Record<string, { weight_kg: number; date: string }[]> = {};
  for (const liftEntry of athlete.lifts) {
    results[liftEntry.lift] = liftEntry.records.map(r => ({
      weight_kg: r.weight,
      date: r.date,
    }));
  }
  const output = {
    athlete: shortKey,
    full_name: fullName,
    gender: 'F' as const,
    results,
  };
  const fileName = `${toKebab(fullName)}.json`;
  const filePath = path.join(outDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(output, null, 2) + '\n');
  console.log(`  ✅ ${fileName}  (${Object.keys(results).length} lifts)`);
  written++;
}
console.log(`\nWrote ${written} athlete files to ${outDir}/`);
