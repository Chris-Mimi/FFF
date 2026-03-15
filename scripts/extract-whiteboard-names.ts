/**
 * Extract all unique athlete names from Whiteboard Intro sections across all wods.
 * Read-only — no database changes.
 *
 * Usage: npx tsx scripts/extract-whiteboard-names.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Section {
  id: string;
  type: string;
  content?: string;
}

interface WOD {
  id: string;
  date: string;
  session_type: string;
  sections: Section[];
}

function extractNames(content: string): string[] {
  // Split on commas, newlines, or " / " separators
  const rawNames = content
    .split(/[,\n]+|(?:\s*\/\s*)/)
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  // Filter out common non-name content (section headers, instructions, etc.)
  const excludePatterns = [
    /^whiteboard/i,
    /^intro/i,
    /^warm.?up/i,
    /^coach/i,
    /^notes?:?$/i,
    /^-+$/,
    /^\d+$/,
    /^https?:/i,
    /^workout/i,
    /^session/i,
    /^today/i,
    /^welcome/i,
  ];

  return rawNames.filter(
    (name) => !excludePatterns.some((pat) => pat.test(name))
  );
}

async function main() {
  console.log('Fetching all wods with sections...\n');

  const { data: wods, error } = await supabase
    .from('wods')
    .select('id, date, session_type, sections')
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching wods:', error.message);
    process.exit(1);
  }

  if (!wods || wods.length === 0) {
    console.log('No wods found.');
    return;
  }

  const nameOccurrences: Record<string, string[]> = {}; // name -> [dates]
  let wodsWithIntro = 0;
  let wodsWithoutIntro = 0;

  for (const wod of wods as WOD[]) {
    if (!wod.sections || !Array.isArray(wod.sections)) continue;

    const introSection = wod.sections.find(
      (s) => s.type === 'Whiteboard Intro'
    );

    if (!introSection || !introSection.content?.trim()) {
      wodsWithoutIntro++;
      continue;
    }

    wodsWithIntro++;
    const names = extractNames(introSection.content);

    for (const name of names) {
      if (!nameOccurrences[name]) {
        nameOccurrences[name] = [];
      }
      nameOccurrences[name].push(wod.date);
    }
  }

  // Sort names alphabetically
  const sortedNames = Object.keys(nameOccurrences).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  // Output results
  console.log('=== WHITEBOARD INTRO NAME EXTRACTION ===\n');
  console.log(`Total wods scanned: ${wods.length}`);
  console.log(`Wods with Whiteboard Intro content: ${wodsWithIntro}`);
  console.log(`Wods without Whiteboard Intro content: ${wodsWithoutIntro}`);
  console.log(`Unique names found: ${sortedNames.length}\n`);

  console.log('--- ALL UNIQUE NAMES (sorted, with occurrence count) ---\n');

  for (const name of sortedNames) {
    const dates = nameOccurrences[name];
    const first = dates[0];
    const last = dates[dates.length - 1];
    console.log(
      `  ${name.padEnd(20)} ${String(dates.length).padStart(3)}x  (${first} → ${last})`
    );
  }

  // Also output as simple list for easy copy-paste
  console.log('\n--- SIMPLE NAME LIST (for mapping) ---\n');
  for (const name of sortedNames) {
    console.log(name);
  }
}

main().catch(console.error);
