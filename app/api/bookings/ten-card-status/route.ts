import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth-api';
import { getHouseholdTenCards } from '@/lib/tenCardStatus';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * GET /api/bookings/ten-card-status
 * 10-card balances for the logged-in household (self + family members), so a
 * parent sees the kids' card and a sharer sees the card they book on.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const cards = await getHouseholdTenCards(supabaseAdmin, authResult.id);
    return NextResponse.json({ cards }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('ten-card-status error:', err);
    return NextResponse.json({ error: 'Failed to load 10-card status' }, { status: 500 });
  }
}
