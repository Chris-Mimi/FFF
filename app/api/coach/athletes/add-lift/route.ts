import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';

// RLS on lift_records is INSERT WITH CHECK (auth.uid() = user_id), so a coach
// can't insert rows on an athlete's behalf using the browser supabase client.
// Service-role bypasses RLS — gated by requireCoach so only coaches reach this
// code path.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

type Payload = {
  athleteId?: string;
  lift_name?: string;
  weight_kg?: number;
  reps?: number;
  calculated_1rm?: number;
  rep_max_type?: string;
  notes?: string | null;
  lift_date?: string;
};

export async function POST(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const body = (await request.json()) as Payload;
    const { athleteId, ...row } = body;

    if (!athleteId || !row.lift_name || row.weight_kg == null) {
      return NextResponse.json(
        { error: 'athleteId, lift_name, and weight_kg are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('lift_records')
      .insert({ user_id: athleteId, ...row })
      .select('id')
      .single();

    if (error) {
      console.error('add-lift insert failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error('add-lift error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
