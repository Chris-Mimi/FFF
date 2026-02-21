import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, isAuthError } from '@/lib/auth-api';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (isAuthError(user)) return user;

    const { data, error } = await supabaseAdmin
      .from('achievement_definitions')
      .select('*')
      .order('category')
      .order('branch')
      .order('tier');

    if (error) {
      console.error('Fetch definitions error:', error);
      return NextResponse.json({ error: 'Failed to fetch definitions' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Definitions API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
