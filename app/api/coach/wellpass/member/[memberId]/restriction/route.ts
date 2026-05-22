import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const { memberId } = await params;
    const body = (await request.json()) as { restricted?: boolean };
    if (typeof body.restricted !== 'boolean') {
      return NextResponse.json({ error: 'restricted (boolean) required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('members')
      .update({ wellpass_booking_restricted: body.restricted })
      .eq('id', memberId);

    if (error) {
      console.error('[wellpass-restriction] update error:', error);
      return NextResponse.json({ error: 'Failed to update restriction' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[wellpass-restriction] unexpected error:', e);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
