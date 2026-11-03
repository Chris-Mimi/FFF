import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, isAuthError } from '@/lib/auth-api';
import { getClearedMemberIds, getFoundationsOpenTypes } from '@/lib/bookingRules';

// S430: which of the caller's profiles (self + family) are cleared for all classes, and
// which session types are open to Foundations athletes. Drives the lock on /member/book;
// the real check is in /api/bookings/create.
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const { data: family, error } = await db.from('members').select('id').eq('primary_member_id', auth.id);
    if (error) throw error;
    const ids = [auth.id, ...(family || []).map((f) => f.id as string)];
    const [cleared, openTypes] = await Promise.all([getClearedMemberIds(ids), getFoundationsOpenTypes()]);
    return NextResponse.json({ clearedIds: [...cleared], openTypes });
  } catch (err) {
    console.error('foundations-access:', err);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}
