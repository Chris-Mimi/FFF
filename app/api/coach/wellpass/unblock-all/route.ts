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

    const { data, error } = await supabaseAdmin
      .from('members')
      .update({ wellpass_booking_restricted: false })
      .eq('wellpass_booking_restricted', true)
      .select('id');

    if (error) {
      console.error('[wellpass-unblock-all] update error:', error);
      return NextResponse.json({ error: 'Failed to unblock' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, unblocked: data?.length ?? 0 });
  } catch (e) {
    console.error('[wellpass-unblock-all] unexpected error:', e);
    return NextResponse.json({ error: 'Unblock failed' }, { status: 500 });
  }
}
