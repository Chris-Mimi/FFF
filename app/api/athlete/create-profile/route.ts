import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role to bypass RLS (needed during signup before email confirmation)
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
    const body = await request.json();
    const { userId, fullName, email } = body;

    // Validate required fields
    if (!userId || !fullName || !email) {
      return NextResponse.json(
        { error: 'userId, fullName, and email are required' },
        { status: 400 }
      );
    }

    // Check if profile already exists
    const { data: existing } = await supabaseAdmin
      .from('athlete_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: true, message: 'Profile already exists', profileId: existing.id },
        { status: 200 }
      );
    }

    // Create athlete profile (bypasses RLS)
    const { data: profile, error: insertError } = await supabaseAdmin
      .from('athlete_profiles')
      .insert({
        user_id: userId,
        full_name: fullName,
        email: email,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Athlete profile creation error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create athlete profile', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Athlete profile created successfully',
        profileId: profile.id
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Create athlete profile error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
