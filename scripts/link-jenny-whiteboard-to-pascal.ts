/**
 * Link the whiteboard name "Jenny" to registered member Pascal Evghenia across
 * every WOD where it appears in the Whiteboard Intro list. Pascal registered
 * after these classes; her whiteboard name was never matched to her profile.
 *
 * For each WOD whose Whiteboard Intro contains the standalone token "Jenny":
 *   1. Book Pascal (status='confirmed') on that WOD's session if she has no
 *      booking there (10-card NOT incremented — convention from
 *      clean-whiteboard-and-book.ts).
 *   2. Remove "Jenny" from the Whiteboard Intro text (split-filter-rejoin,
 *      same logic as clean-whiteboard-and-book.ts) so she shows as a booked
 *      member, not a whiteboard scribble.
 * Also sets members.whiteboard_name='Jenny' on Pascal so the mapping is durable.
 *
 * Dry-run by default; --apply to write.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const PASCAL_ID = 'bc90de41-4172-4a17-badd-edf4417654f6';
const TOKEN = 'jenny';
const RX = /\bjenny\b/i;

function cleanContent(content: string): string {
  const stripped = content.replace(/<[^>]*>/g, '');
  const tokens = stripped.split(/[,\n]+|(?:\s*\/\s*)/).map(t => t.trim()).filter(t => t.length > 0);
  return tokens.filter(t => t.toLowerCase() !== TOKEN).join(', ');
}

async function main() {
  // gather WODs with "Jenny" in a Whiteboard Intro section
  const wods: { id: string; name: string; sections: any[] }[] = [];
  let from = 0;
  for (;;) {
    const { data } = await sb.from('wods').select('id,workout_name,sections').range(from, from + 499);
    if (!data || data.length === 0) break;
    for (const w of data) {
      const intro = (w.sections as any[] || []).find(s => s.type === 'Whiteboard Intro' && typeof s.content === 'string' && RX.test(s.content));
      if (intro) wods.push({ id: w.id, name: w.workout_name, sections: w.sections as any[] });
    }
    if (data.length < 500) break; from += 500;
  }

  let bookingsToInsert = 0, alreadyBooked = 0, contentEdits = 0;
  const sessionUpdates: { wodId: string; before: string; after: string; date: string }[] = [];
  const bookingInserts: { session_id: string; date: string }[] = [];

  for (const w of wods) {
    const { data: sessions } = await sb.from('weekly_sessions').select('id,date,time').eq('workout_id', w.id);
    if (!sessions || sessions.length === 0) { console.log(`⚠️  wod ${w.id.slice(0, 8)} "${w.name}" has NO session — skipping`); continue; }
    if (sessions.length > 1) { console.log(`⚠️  wod ${w.id.slice(0, 8)} has ${sessions.length} sessions — MANUAL review`); continue; }
    const ses = sessions[0];

    // booking
    const { data: existing } = await sb.from('bookings').select('id,status').eq('session_id', ses.id).eq('member_id', PASCAL_ID).maybeSingle();
    if (existing) { alreadyBooked++; } else { bookingsToInsert++; bookingInserts.push({ session_id: ses.id, date: ses.date }); }

    // content
    const intro = w.sections.find(s => s.type === 'Whiteboard Intro' && typeof s.content === 'string' && RX.test(s.content));
    const before = intro.content as string;
    const after = cleanContent(before);
    if (before !== after) { contentEdits++; sessionUpdates.push({ wodId: w.id, before, after, date: ses.date }); }

    console.log(`${ses.date} ${ses.time?.slice(0, 5)} | ${existing ? 'already booked' : 'BOOK'} | "${before}" -> "${after}"`);
  }

  console.log(`\nWODs: ${wods.length} | bookings to insert: ${bookingsToInsert} | already booked: ${alreadyBooked} | content edits: ${contentEdits}`);
  if (!APPLY) { console.log('\nDRY RUN — pass --apply to write.'); return; }

  // 1. durable mapping
  await sb.from('members').update({ whiteboard_name: 'Jenny' }).eq('id', PASCAL_ID);
  // 2. bookings
  for (const b of bookingInserts) {
    const { error } = await sb.from('bookings').insert({ session_id: b.session_id, member_id: PASCAL_ID, status: 'confirmed', is_og: false, is_trial: false, ten_card_consumed: false });
    if (error) { console.error('booking error', b.date, error.message); return; }
  }
  // 3. content rewrites
  for (const u of sessionUpdates) {
    const { data: w } = await sb.from('wods').select('sections').eq('id', u.wodId).single();
    const secs = (w!.sections as any[]).map(s => (s.type === 'Whiteboard Intro' && s.content === u.before) ? { ...s, content: u.after } : s);
    const { error } = await sb.from('wods').update({ sections: secs }).eq('id', u.wodId);
    if (error) { console.error('content error', u.wodId, error.message); return; }
  }
  console.log(`✅ Set whiteboard_name, inserted ${bookingInserts.length} bookings, rewrote ${sessionUpdates.length} intros.`);
}
main();
