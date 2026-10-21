/**
 * Week 43.1 (S423) — read-only: every existing Front Squat lift_record per
 * athlete on the board, to flag new 5RM values that are out of range.
 *
 *   npx tsx scripts/week43-1-fs-history.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NAMES = [
  'Amelie Kirch', 'Claudia Herrmann', 'Gloria Stoffer', 'Jolanda Greif', 'Dimitar Peresyov',
  'Michael Junkes', 'Wayne Lucas', 'Anfisa Bornemann', 'Anneke Spegele', 'Julia Weihe',
  'Nikolina Vlasalija', 'Carmine Carrozzo', 'Christian Tanner', 'Markus Fischer',
  'Paul Bielenski', 'Thomas Spegele', 'Franziska Herndorf', 'Martina Fenster',
  'Christian Müller', 'Steven Zaft', 'Chris Hiles', 'Angela Schulz', 'Anna Kr',
  'Annerose Streit', 'Carla Courtois', 'Dinny Braatz', 'Nicole Rauh', 'Susi Glocker',
  'Toni Seitz', 'Bodo Lehmann', 'Michael Maier', 'Stefan G', 'Aline von Rüden',
  'Irene Koffler', 'Mimi Hiles', 'Sabrina Lucas', 'Michael Städele', 'Senol Özdilek',
];

async function main() {
  const { data: members, error } = await db.from('members').select('id, name, display_name').in('name', NAMES);
  if (error) throw new Error(error.message);
  const found = new Set((members ?? []).map(m => m.name));
  const missing = NAMES.filter(n => !found.has(n));
  if (missing.length) console.log(`(not matched by exact name: ${missing.join(', ')})`);

  const { data: recs, error: rErr } = await db
    .from('lift_records')
    .select('user_id, weight_kg, reps, rep_max_type, lift_date')
    .eq('lift_name', 'Front Squat')
    .in('user_id', (members ?? []).map(m => m.id))
    .order('lift_date');
  if (rErr) throw new Error(rErr.message);

  for (const m of members ?? []) {
    const mine = (recs ?? []).filter(r => r.user_id === m.id);
    const txt = mine.map(r => `${r.lift_date} ${r.rep_max_type ?? r.reps + 'r'} ${r.weight_kg}`).join(' | ');
    console.log(`${m.name.padEnd(22)} ${txt || '—'}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
