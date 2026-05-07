import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * GET /api/coach/resolve-auth-user?memberId=<uuid>
 * Returns { userId: string | null } — the auth.users.id matched by the member's email.
 * Used by booking-cancel cleanup to find athlete-self-entered scores
 * (which save with user_id = auth.users.id, not members.id).
 */
export async function GET(request: NextRequest) {
  const auth = await requireCoach(request);
  if (isAuthError(auth)) return auth;

  const memberId = request.nextUrl.searchParams.get('memberId');
  if (!memberId) {
    return NextResponse.json({ error: 'memberId required' }, { status: 400 });
  }

  const { data: member } = await supabaseAdmin
    .from('members')
    .select('email')
    .eq('id', memberId)
    .maybeSingle();

  if (!member?.email) return NextResponse.json({ userId: null });

  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const match = (users || []).find((u) => u.email === member.email);
  return NextResponse.json({ userId: match?.id ?? null });
}
