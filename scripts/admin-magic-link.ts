/**
 * Generate a one-time magic-link login for an athlete account.
 * Does NOT touch the user's password — paste the URL in a browser,
 * you're signed in as them, log out, done. They never know.
 *
 * Usage:
 *   npx tsx scripts/admin-magic-link.ts <email>
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const [, , emailArg] = process.argv;
if (!emailArg) {
  console.error('Usage: npx tsx scripts/admin-magic-link.ts <email>');
  process.exit(1);
}
const email = emailArg.trim().toLowerCase();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Hardcode prod — NEXT_PUBLIC_APP_URL in .env.local points at localhost.
const appUrl = 'https://app.the-forge-functional-fitness.de';

async function main() {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${appUrl}/auth/callback` },
  });

  if (error || !data) {
    console.error('Failed to generate magic link:', error?.message);
    process.exit(1);
  }

  // Skip Supabase's verify endpoint (its redirect_to is bound to the token signature
  // and falls back to Site URL — which our root page auto-signs-out). Use the hashed_token
  // directly with our /auth/impersonate page, which calls verifyOtp client-side.
  const hashedToken = data.properties?.hashed_token;
  if (!hashedToken) {
    console.error('No hashed_token returned. Check Supabase admin.generateLink response shape.');
    process.exit(1);
  }

  const link = `${appUrl}/auth/impersonate?token=${hashedToken}`;
  console.log(`\n✅ Impersonation link for ${email}:\n`);
  console.log(link);
  console.log(`\nPaste in a browser (Incognito recommended). It signs you in as ${email}.`);
  console.log('Log out when done — their password is untouched.\n');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
