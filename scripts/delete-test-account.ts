import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function deleteTestAccount(email: string) {
  console.log(`\nDeleting account: ${email}`)

  try {
    // 1. Get user ID from auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.error('Error listing users:', authError)
      return
    }

    const user = authUser.users.find(u => u.email === email)

    if (!user) {
      console.log(`❌ User not found: ${email}`)
      return
    }

    console.log(`Found user ID: ${user.id}`)

    // 2. Delete from members table (cascades to related records)
    const { error: memberError } = await supabase
      .from('members')
      .delete()
      .eq('id', user.id)

    if (memberError) {
      console.error('Error deleting from members:', memberError)
    } else {
      console.log('✅ Deleted from members table')
    }

    // 3. Delete from auth.users
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)

    if (deleteError) {
      console.error('Error deleting from auth:', deleteError)
    } else {
      console.log('✅ Deleted from auth.users')
    }

    console.log('\n✅ Account deleted successfully!\n')

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Get email from command line argument
const email = process.argv[2]

if (!email) {
  console.error('Usage: npx tsx scripts/delete-test-account.ts <email>')
  process.exit(1)
}

deleteTestAccount(email)
