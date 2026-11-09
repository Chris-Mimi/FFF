/**
 * Update Google Calendar event TITLES after a rename (scripts/rename-workouts.ts),
 * without re-publishing. Only the event `summary` is patched — description,
 * time, publish_sections and notifications are untouched.
 *
 *   npx tsx scripts/sync-calendar-titles.ts renames/a.json [renames/b.json …]            # dry run
 *   npx tsx scripts/sync-calendar-titles.ts renames/a.json [renames/b.json …] --commit
 *
 * Takes every workout whose current name is a `to` in the rename files and has a
 * calendar event; title = "<workout_name || track name || title> - <title>",
 * same as app/api/google/publish-workout/route.ts.
 */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const args = process.argv.slice(2);
const commit = args.includes('--commit');
const files = args.filter(a => a !== '--commit');

type Wod = { id: string; date: string; title: string | null; workout_name: string | null; google_event_id: string | null; tracks: { name: string } | { name: string }[] | null };

async function main() {
  if (!files.length) throw new Error('Pass at least one renames/<file>.json');
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !calendarId) {
    throw new Error('Google Calendar env vars missing in .env.local');
  }
  const names = new Set<string>();
  files.forEach(f => (JSON.parse(fs.readFileSync(f, 'utf8')) as { to: string }[]).forEach(r => names.add(r.to.trim())));

  const wods: Wod[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('wods')
      .select('id, date, title, workout_name, google_event_id, tracks(name)')
      .not('google_event_id', 'is', null)
      .range(from, from + 999);
    if (error) throw new Error(`wods: ${error.message}`);
    wods.push(...(data as unknown as Wod[]).filter(w => names.has((w.workout_name ?? '').trim())));
    if (data.length < 1000) break;
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  const calendar = google.calendar({ version: 'v3', auth });

  let changed = 0, same = 0, missing = 0;
  for (const w of wods.sort((a, b) => a.date.localeCompare(b.date))) {
    const track = Array.isArray(w.tracks) ? w.tracks[0]?.name : w.tracks?.name;
    const summary = `${w.workout_name || track || w.title} - ${w.title}`;
    let current: string | null | undefined;
    try {
      current = (await calendar.events.get({ calendarId, eventId: w.google_event_id! })).data.summary;
    } catch {
      console.log(`  ? ${w.date}  event not found (deleted in Google?) — skipped`);
      missing++;
      continue;
    }
    if (current === summary) { same++; continue; }
    console.log(`${w.date}  "${current}"\n        → "${summary}"`);
    if (commit) await calendar.events.patch({ calendarId, eventId: w.google_event_id!, requestBody: { summary } });
    changed++;
  }
  console.log(`\n${commit ? '✅ Updated' : 'DRY RUN — would update'} ${changed} event titles · ${same} already right · ${missing} not found.`);
}

main().catch(e => { console.error(e); process.exit(1); });
