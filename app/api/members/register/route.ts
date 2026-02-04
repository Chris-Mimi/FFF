import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for bypassing RLS during registration
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
    const { email, password, name, phone } = body;

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Validate name length
    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Check if email already exists in members table
    const { data: existingMember } = await supabaseAdmin
      .from('members')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Create auth user with Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true, // Auto-confirm email for now
      user_metadata: {
        name: name.trim(),
        role: 'member'
      }
    });

    if (authError) {
      console.error('Auth user creation error:', authError);

      // Handle specific auth errors
      if (authError.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    // Explicitly confirm email (createUser email_confirm can be unreliable)
    await supabaseAdmin.auth.admin.updateUserById(authData.user.id, {
      email_confirm: true
    });

    // Create member record in members table
    const { data: memberData, error: memberError } = await supabaseAdmin
      .from('members')
      .insert({
        id: authData.user.id,
        email: email.toLowerCase(),
        name: name.trim(),
        phone: phone?.trim() || null,
        status: 'pending', // Requires coach approval
        account_type: 'primary',
        athlete_subscription_status: 'expired' // No trial until approved
      })
      .select()
      .single();

    if (memberError) {
      console.error('Member record creation error:', memberError);

      // Rollback: Delete the auth user if member record creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      return NextResponse.json(
        { error: 'Failed to complete registration. Please try again.' },
        { status: 500 }
      );
    }

    // TODO: Create in-app notification for coaches about new pending member
    // This will be implemented in Phase 3 (Notifications)

    return NextResponse.json(
      {
        success: true,
        message: 'Registration successful. Awaiting coach approval.',
        member: {
          id: memberData.id,
          email: memberData.email,
          name: memberData.name,
          status: memberData.status
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during registration' },
      { status: 500 }
    );
  }
}
