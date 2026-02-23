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
    const user = await requireCoach(request);
    if (isAuthError(user)) return user;

    const { data, error } = await supabaseAdmin
      .from('members')
      .select('id, name, display_name')
      .eq('status', 'active')
      .in('athlete_subscription_status', ['trial', 'active'])
      .order('name');

    if (error) {
      console.error('Fetch athletes error:', error);
      return NextResponse.json({ error: 'Failed to fetch athletes' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Athletes API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
