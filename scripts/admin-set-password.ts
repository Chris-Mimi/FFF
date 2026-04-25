/**
 * Manually set a user's password via Supabase Admin API.
 * Use when normal password recovery email isn't reaching the user.
 *
 * Usage:
 *   npx tsx scripts/admin-set-password.ts <email> <new-password>
 *
 * Example:
 *   npx tsx scripts/admin-set-password.ts anja.goette@gmx.net '1234?ABCD!'
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const [, , emailArg, passwordArg] = process.argv;

if (!emailArg || !passwordArg) {
  console.error('Usage: npx tsx scripts/admin-set-password.ts <email> <new-password>');
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const newPassword = passwordArg;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log(`Looking up auth user for ${email}...`);

  const { data: member, error: memberErr } = await supabase
    .from('members')
    .select('id, name, email, status')
    .eq('email', email)
    .single();

  if (memberErr || !member) {
    console.error(`No member row found for ${email}.`);
    if (memberErr) console.error(memberErr.message);
    process.exit(1);
  }

  console.log(`Found member: ${member.name} (${member.email}) — status: ${member.status}`);
  console.log(`Auth user_id: ${member.id}`);
  console.log(`Setting password to: ${newPassword}`);

  const { data, error } = await supabase.auth.admin.updateUserById(member.id, {
    password: newPassword,
  });

  if (error) {
    console.error('Failed to set password:', error.message);
    process.exit(1);
  }

  console.log('\n✅ Password updated successfully.');
  console.log(`   user_id: ${data.user?.id}`);
  console.log(`   email:   ${data.user?.email}`);
  console.log(`\nGive ${member.name} this password via WhatsApp/SMS:`);
  console.log(`   ${newPassword}`);
  console.log(`\nTell them to log in and change it via Profile → Security.`);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
