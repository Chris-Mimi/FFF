/**
 * Remove "Anfisa" from each WOD's Whiteboard Intro section content.
 *
 * Anfisa is now booked (16 sessions backfilled — see backfill-whiteboard-bookings.ts).
 * Her name should no longer live in the free-text Whiteboard Intro since the
 * Athletes-tab filter joins via bookings.
 *
 * Strategy:
 *   1. Fetch all wods.
 *   2. For each wod whose Whiteboard Intro section.content contains "Anfisa"
 *      (case-insensitive, word boundary), remove the token + collapse stranded
 *      delimiters (comma / slash / newline).
 *   3. Print before/after; --apply to write.
 *
 * Dry-run by default. Pass --apply to commit.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');
const TARGET = 'Anfisa';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface Section { id: string; type: string; content?: string }
interface WOD { id: string; date: string; sections: Section[] | null }

function removeName(content: string, name: string): string {
  // 1. Remove the bare token (case-insensitive, word boundary)
  let out = content.replace(new RegExp(`\\b${name}\\b`, 'gi'), '');
  // 2. Collapse stranded separators that the removal left behind
  out = out.replace(/,\s*,/g, ',');             // ", ," → ","
  out = out.replace(/\/\s*\//g, '/');           // "/ /" → "/"
  out = out.replace(/^[\s,/]+/gm, '');          // leading "," "/" or whitespace on each line
  out = out.replace(/[\s,/]+$/gm, '');          // trailing same
  out = out.replace(/\n{3,}/g, '\n\n');         // collapse 3+ blank lines
  return out.trim();
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`Target name: "${TARGET}"`);
  console.log('='.repeat(60));

  const { data: wods, error } = await supabase
    .from('wods')
    .select('id, date, sections')
    .order('date', { ascending: true });
  if (error) { console.error(error.message); process.exit(1); }

  const changes: { id: string; date: string; before: string; after: string; sections: Section[] }[] = [];
  const namePattern = new RegExp(`\\b${TARGET}\\b`, 'i');

  for (const w of (wods || []) as WOD[]) {
    if (!Array.isArray(w.sections)) continue;
    const intro = w.sections.find(s => s.type === 'Whiteboard Intro');
    if (!intro?.content) continue;
    if (!namePattern.test(intro.content)) continue;
    const next = removeName(intro.content, TARGET);
    if (next === intro.content) continue;
    changes.push({ id: w.id, date: w.date, before: intro.content, after: next, sections: w.sections });
  }

  console.log(`\nWODs with "${TARGET}" in Whiteboard Intro: ${changes.length}\n`);

  for (const c of changes) {
    console.log(`--- ${c.date}  wod=${c.id.slice(0, 8)} ---`);
    console.log(`BEFORE: ${JSON.stringify(c.before).slice(0, 240)}`);
    console.log(`AFTER:  ${JSON.stringify(c.after).slice(0, 240)}`);
    console.log();
  }

  if (!APPLY) {
    console.log('DRY-RUN complete. Re-run with --apply to write.');
    return;
  }

  console.log(`Applying ${changes.length} updates...`);
  let done = 0;
  for (const c of changes) {
    const newSections = c.sections.map(s =>
      s.type === 'Whiteboard Intro' ? { ...s, content: c.after } : s
    );
    const { error: upErr } = await supabase
      .from('wods')
      .update({ sections: newSections })
      .eq('id', c.id);
    if (upErr) { console.error(`  ${c.date} ${c.id.slice(0,8)}: ${upErr.message}`); continue; }
    done++;
  }
  console.log(`Done — updated ${done}/${changes.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
