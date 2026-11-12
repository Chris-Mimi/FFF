/**
 * Rename family members (name + display_name) from a list of
 * [child name, parent name, new name]. Refuses unless each pair matches exactly
 * one family member. S432: first-name-only children get the family surname.
 *
 *   npx tsx scripts/rename-family-members.ts            # dry run
 *   npx tsx scripts/rename-family-members.ts --commit
 */
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const commit = process.argv.includes('--commit');

const LIST: [string, string, string][] = [
  ['Mila', 'Daniela Simm', 'Mila Simm'],
  ['Marlo', 'Daniela Simm', 'Marlo Simm'],
  ['Lukas', 'Jessica Schmid', 'Lukas Schmid'],
  ['Ida', 'Jessica Schmid', 'Ida Schmid'],
  ['Jakob', 'Jessica Schmid', 'Jakob Schmid'],
  ['Katharina', 'Christina Panje', 'Katharina Panje'],
  ['Jana', 'Justine Baumstark', 'Jana Baumstark'],
  ['Hans', 'Franziska Lill', 'Hans Lill'],
  ['Ella', 'Anna Vogel', 'Ella Vogel'],
  ['Mats', 'Hannah Lisiecki', 'Mats Lisiecki'],
  ['Hannes', 'Hannah Lisiecki', 'Hannes Lisiecki'],
  ['Johnny', 'Thomas Herbst', 'Johnny Herbst'],
  ['Lea', 'Oliver Grgevcic', 'Lea Grgevcic'],
  ['Lina', 'Oliver Grgevcic', 'Lina Grgevcic'],
  ['Ludwig', 'Bianca Bosky', 'Ludwig Bosky'],
  ['Amalia', 'Bianca Bosky', 'Amalia Bosky'],
  ['Aliona', 'Pascal Evghenia', 'Aliona Pascal'],
  ['Samuel', 'Gloria Stoffer', 'Samuel Stoffer'],
  ['Samuel', 'Torben Stoffer', 'Samuel Stoffer'],
];

async function main() {
  const { data: parents, error: pErr } = await db.from('members').select('id, name').in('name', [...new Set(LIST.map(l => l[1]))]);
  if (pErr) throw new Error(`parents: ${pErr.message}`);
  const plan: { id: string; from: string; to: string }[] = [];
  for (const [child, parent, to] of LIST) {
    const pIds = parents.filter(p => p.name === parent).map(p => p.id);
    if (pIds.length !== 1) throw new Error(`parent "${parent}": ${pIds.length} matches`);
    const { data, error } = await db.from('members').select('id, name')
      .eq('account_type', 'family_member').eq('primary_member_id', pIds[0]).eq('name', child);
    if (error) throw new Error(`${child}: ${error.message}`);
    if (data.length !== 1) throw new Error(`"${child}" under "${parent}": ${data.length} matches`);
    plan.push({ id: data[0].id, from: child, to });
  }
  plan.forEach(p => console.log(`${p.from} → ${p.to}`));
  if (!commit) { console.log(`\nDRY RUN — ${plan.length} renames.`); return; }
  for (const p of plan) {
    const { error } = await db.from('members').update({ name: p.to, display_name: p.to, updated_at: new Date().toISOString() }).eq('id', p.id);
    if (error) throw new Error(`${p.to}: ${error.message}`);
  }
  console.log(`\n✅ Renamed ${plan.length}.`);
}

main().catch(e => { console.error(e); process.exit(1); });
