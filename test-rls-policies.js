// Test RLS policies - Direct database access without authentication
// Run with: node test-rls-policies.js

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://xvrefulklquuizbpkppb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2cmVmdWxrbHF1dWl6YnBrcHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMzQ3MjMsImV4cCI6MjA3NTkxMDcyM30.W7mOQD5gA3rFTqxdYKHWQekYLxjYQYPufTKj3FufzFo'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testPolicies() {
  console.log('\n🔒 Testing RLS Policies (No Authentication)\n')
  console.log('=' .repeat(60))

  // Test 1: Try to read athlete profiles
  console.log('\n1. Testing athlete_profiles (should FAIL):')
  const { data: profiles, error: profilesError } = await supabase
    .from('athlete_profiles')
    .select('*')
    .limit(1)

  if (profilesError) {
    console.log('   ✅ BLOCKED:', profilesError.message)
  } else {
    console.log('   ❌ EXPOSED: Got', profiles?.length || 0, 'rows')
  }

  // Test 2: Try to read benchmark workouts
  console.log('\n2. Testing benchmark_workouts (should FAIL):')
  const { data: benchmarks, error: benchmarksError } = await supabase
    .from('benchmark_workouts')
    .select('*')
    .limit(1)

  if (benchmarksError) {
    console.log('   ✅ BLOCKED:', benchmarksError.message)
  } else {
    console.log('   ❌ EXPOSED: Got', benchmarks?.length || 0, 'rows')
  }

  // Test 3: Try to read forge benchmarks
  console.log('\n3. Testing forge_benchmarks (should FAIL):')
  const { data: forge, error: forgeError } = await supabase
    .from('forge_benchmarks')
    .select('*')
    .limit(1)

  if (forgeError) {
    console.log('   ✅ BLOCKED:', forgeError.message)
  } else {
    console.log('   ❌ EXPOSED: Got', forge?.length || 0, 'rows')
  }

  // Test 4: Try to read barbell lifts
  console.log('\n4. Testing barbell_lifts (should FAIL):')
  const { data: lifts, error: liftsError } = await supabase
    .from('barbell_lifts')
    .select('*')
    .limit(1)

  if (liftsError) {
    console.log('   ✅ BLOCKED:', liftsError.message)
  } else {
    console.log('   ❌ EXPOSED: Got', lifts?.length || 0, 'rows')
  }

  // Test 5: Try to read weekly sessions
  console.log('\n5. Testing weekly_sessions (should FAIL):')
  const { data: sessions, error: sessionsError } = await supabase
    .from('weekly_sessions')
    .select('*')
    .limit(1)

  if (sessionsError) {
    console.log('   ✅ BLOCKED:', sessionsError.message)
  } else {
    console.log('   ❌ EXPOSED: Got', sessions?.length || 0, 'rows')
  }

  // Test 6: Try to INSERT a member (should WORK for registration)
  console.log('\n6. Testing member registration (should WORK):')
  const { data: member, error: memberError } = await supabase
    .from('members')
    .insert({
      email: 'test-rls-policy@example.com',
      name: 'RLS Test User',
      status: 'pending',
      account_type: 'primary'
    })
    .select()

  if (memberError) {
    console.log('   ❌ BLOCKED:', memberError.message)
  } else {
    console.log('   ✅ ALLOWED: Registration works')
    // Clean up test data
    if (member?.[0]?.id) {
      await supabase.from('members').delete().eq('id', member[0].id)
      console.log('   🗑️  Test data cleaned up')
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('\n✅ = RLS working correctly')
  console.log('❌ = Security issue - data is exposed!\n')
}

testPolicies().catch(console.error)
