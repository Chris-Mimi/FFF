import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';

// RLS on benchmark_results is INSERT WITH CHECK (auth.uid() = user_id), so a
// coach can't insert rows on an athlete's behalf using the browser supabase
// client. Service-role bypasses RLS — gated by requireCoach so only coaches
// reach this code path.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

type Payload = {
  athleteId?: string;
  benchmark_id?: string | null;
  forge_benchmark_id?: string | null;
  benchmark_name?: string;
  benchmark_type?: string;
  result_value?: string;
  time_result?: string | null;
  reps_result?: number | null;
  weight_result?: string | null;
  scaling_level?: string;
  notes?: string | null;
  result_date?: string;
};

export async function POST(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const body = (await request.json()) as Payload;
    const { athleteId, ...row } = body;

    if (!athleteId || !row.benchmark_name || !row.result_value) {
      return NextResponse.json(
        { error: 'athleteId, benchmark_name, and result_value are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('benchmark_results')
      .insert({ user_id: athleteId, ...row })
      .select('id')
      .single();

    if (error) {
      console.error('add-benchmark insert failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error('add-benchmark error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
