import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check member status (bypasses RLS with service role)
    const { data: member, error } = await supabaseAdmin
      .from('members')
      .select('id, status')
      .eq('email', email.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found (expected)
      console.error('Member status check error:', error);
      return NextResponse.json(
        { error: 'Failed to check member status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exists: !!member,
      status: member?.status || null
    });

  } catch (error) {
    console.error('Member status check error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
