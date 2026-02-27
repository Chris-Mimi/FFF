import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Get all WODs with google_event_id
  const { data: wods } = await sb
    .from('wods')
    .select('id, date, google_event_id')
    .not('google_event_id', 'is', null);

  // Get all active weekly_sessions with their workout_id
  const { data: sessions } = await sb
    .from('weekly_sessions')
    .select('workout_id')
    .not('workout_id', 'is', null);

  const activeWodIds = new Set(sessions?.map(s => s.workout_id) || []);

  const orphans = (wods || []).filter(w => !activeWodIds.has(w.id));
  const active = (wods || []).filter(w => activeWodIds.has(w.id));

  console.log('Total with google_event_id:', wods?.length);
  console.log('Linked to weekly_sessions (KEEP):', active.length);
  console.log('Orphans (to clean up):', orphans.length);

  // Hardcoded orphan event IDs from previous run (DB already cleaned)
  const hardcodedOrphanEventIds = [
    'j3ttou68ekp95n7kke04ha7pbk', 'b1pau9fbpdr1m6gsf658plumeo', '1ebetb76ivo7a94nub6knglv40',
    '79redkjqq383m87mrpmihl158s', 'dpqdm4k5hv5h7683nifp96efo4', 'orui1eu582es2piom6clap0u6k',
    'tdam54dhh345lamm75hsvf2970', 'm899pl42qgqjnkgnjem2q7m44o', 'ukk70efnhgflg303014pajl68k',
    'rq9e689fn5c1r6cruvbp1t0gfs', '0nkf9ilteip82iqiuuuosv40i4', '52nfi87t3ond2dq6bg47hbjs1c',
    'a21hv3hbsmv8h1ktqnsq4s0b74', '9lpg62rvuucdl0taqf56evfsk4', 'spuamfinvmibdh044n7qd5veuo',
    'si2j93rh4r64dogu49oq1j19kc', 'ih86h6qcu322kk4tesr042t6cg', '0odj53nrobk3dpftilmrrh3n54',
    '26vegghej65hiaoiep4erqrpek', 'k2gbsq6gndut2rn5thblgnl1ag', 'r0r3b18oqmq6asos7gouf2j2b0',
    'a0q3rrut8qf675tmtujf3tl170', '8rimlrajmcegtq2favpba3i4eo', '8sq7alq6ljeg1sc5462mkqag70',
    'k162cuof4q1jk240pk2vlei9so', 'g2l4ltl0jshh271difv07e2jp8', 'h2avb9ru006624sdnvoaf37nng',
    'bnhn5btp10qldipfb5pbms8b58', 'nfgh0anm7iiqmpp84dsed6d274', 'l7sa0rspuac1ocpsbop9ncb2kk',
    'k4qi8fibj5gb9t9hbjmudlkj34', '05agr5grgf2334a5g7vip7837s', '198db0mgllbqu3isqg4cfho0jk',
    'ru8d398m1nr5gdofmg4bgdrra4',
  ];

  if (orphans.length === 0 && hardcodedOrphanEventIds.length === 0) {
    console.log('Nothing to clean up.');
    return;
  }

  // Null out google_event_id on orphaned WOD records
  const orphanIds = orphans.map(w => w.id);
  const { error } = await sb
    .from('wods')
    .update({ google_event_id: null })
    .in('id', orphanIds);

  if (error) {
    console.error('Error updating orphans:', error);
  } else {
    console.log(`Nulled google_event_id on ${orphanIds.length} orphaned WODs.`);
  }

  // Delete orphaned events from Google Calendar
  const eventIds = [
    ...orphans.map(w => w.google_event_id).filter(Boolean),
    ...hardcodedOrphanEventIds,
  ];
  console.log(`\nDeleting ${eventIds.length} events from Google Calendar...`);

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  const calendar = google.calendar({ version: 'v3', auth });

  let deleted = 0;
  let alreadyGone = 0;
  for (const eventId of eventIds) {
    try {
      await calendar.events.delete({
        calendarId: process.env.GOOGLE_CALENDAR_ID!,
        eventId,
      });
      deleted++;
    } catch {
      alreadyGone++;
    }
  }
  console.log(`Deleted ${deleted} events, ${alreadyGone} already gone.`);
}

main();
