/**
 * Verify JWT Token Contains Role
 * Run this to check if your JWT includes the coach role
 */

import { supabase } from '../lib/supabase';

async function verifyJWT() {
  console.log('🔍 Checking JWT token for role...\n');

  // Get current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    console.error('❌ No active session found');
    return;
  }

  console.log('✅ Active session found');
  console.log('User ID:', session.user.id);
  console.log('Email:', session.user.email);
  console.log('\n📋 User Metadata:');
  console.log(JSON.stringify(session.user.user_metadata, null, 2));

  // Decode JWT to check what's actually in the token
  const accessToken = session.access_token;
  const payload = JSON.parse(atob(accessToken.split('.')[1]));

  console.log('\n🔐 JWT Payload:');
  console.log('user_metadata in JWT:', payload.user_metadata);
  console.log('Role in JWT:', payload.user_metadata?.role);

  if (payload.user_metadata?.role === 'coach') {
    console.log('\n✅ SUCCESS: JWT contains coach role');
    console.log('RLS policies should work correctly');
  } else {
    console.log('\n❌ PROBLEM: JWT missing coach role');
    console.log('\n💡 Solution:');
    console.log('1. Sign out from the app');
    console.log('2. Sign back in');
    console.log('3. This will generate a new JWT with updated metadata');
  }
}

verifyJWT().catch(console.error);
