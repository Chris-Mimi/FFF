import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';

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
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const body = await request.json();
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    const { data: member, error: fetchError } = await supabaseAdmin
      .from('members')
      .select('id, email, name, status')
      .eq('id', memberId)
      .single();

    if (fetchError || !member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Reject is only for pending registrations — active/blocked members must use Block.
    if (member.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending members can be rejected. Use Block for active members.' },
        { status: 400 }
      );
    }

    const { error: deleteMemberError } = await supabaseAdmin
      .from('members')
      .delete()
      .eq('id', memberId);

    if (deleteMemberError) {
      console.error('Member delete error:', deleteMemberError);
      return NextResponse.json(
        { error: 'Failed to delete member record' },
        { status: 500 }
      );
    }

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(memberId);

    if (deleteAuthError) {
      console.error('Auth user delete error:', deleteAuthError);
      return NextResponse.json(
        { error: 'Member record deleted but auth account remains. Contact support.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `${member.name || member.email} rejected and removed`,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Reject member error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
