import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
    private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/calendar'],
});
const calendar = google.calendar({ version: 'v3', auth });

async function main() {
  // Get all known event IDs from DB
  const { data: wods } = await sb
    .from('wods')
    .select('google_event_id')
    .not('google_event_id', 'is', null);

  const knownIds = new Set((wods || []).map(w => w.google_event_id));
  console.log('Known event IDs in DB:', knownIds.size);

  // Get ALL events from Google Calendar
  const allEvents: { id: string; start: string; summary: string }[] = [];
  let pageToken: string | undefined;
  do {
    const res = await calendar.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID!,
      timeMin: '2025-12-01T00:00:00Z',
      timeMax: '2026-03-01T00:00:00Z',
      singleEvents: true,
      maxResults: 250,
      pageToken,
    });
    for (const item of res.data.items || []) {
      allEvents.push({
        id: item.id || '',
        start: item.start?.dateTime || item.start?.date || '',
        summary: item.summary || '',
      });
    }
    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken);

  console.log('Total Google Calendar events:', allEvents.length);

  const ghosts = allEvents.filter(e => e.id && !knownIds.has(e.id));
  console.log('Ghost events (no DB match):', ghosts.length);

  if (ghosts.length === 0) {
    console.log('No ghosts found. Calendar is clean.');
    return;
  }

  for (const e of ghosts) {
    console.log(e.start, '|', e.summary, '|', e.id);
  }

  // Delete ghost events
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    console.log('\n--dry-run mode. No events deleted.');
    return;
  }

  console.log(`\nDeleting ${ghosts.length} ghost events...`);
  let deleted = 0;
  for (const ghost of ghosts) {
    try {
      await calendar.events.delete({
        calendarId: process.env.GOOGLE_CALENDAR_ID!,
        eventId: ghost.id,
      });
      deleted++;
    } catch {
      console.log('Failed to delete:', ghost.id);
    }
  }
  console.log(`Deleted ${deleted}/${ghosts.length} ghost events.`);
}

main();
