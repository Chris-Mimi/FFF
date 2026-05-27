import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const { memberId } = (await request.json()) as { memberId?: string };
    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('members')
      .update({ lapsed_banner_dismissed_at: new Date().toISOString() })
      .eq('id', memberId);

    if (error) {
      console.error('dismiss-lapsed-banner update failed:', error);
      return NextResponse.json({ error: 'Failed to dismiss' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('dismiss-lapsed-banner error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
