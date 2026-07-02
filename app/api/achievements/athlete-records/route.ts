import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: NextRequest) {
  try {
    // Coach-only: reads another member's achievement list (used by the coach
    // Award-Achievement modal). Guarding with requireAuth would let any logged-in
    // athlete read another athlete's records by passing a different userId.
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('athlete_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Fetch athlete records error:', error);
      return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Athlete records API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
