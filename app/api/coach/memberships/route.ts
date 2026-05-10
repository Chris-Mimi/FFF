import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';
import {
  computeContractEndDate,
  type GymContractType,
  type GymMembershipStatus,
} from '@/types/membership';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const VALID_CONTRACT_TYPES: GymContractType[] = [
  'full_year_upfront', 'monthly_1_year', 'monthly_6_months',
];

// GET /api/coach/memberships?status=active|expired|cancelled|all
//   Returns memberships joined with member name. Default: active.
export async function GET(request: NextRequest) {
  const coach = await requireCoach(request);
  if (isAuthError(coach)) return coach;

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get('status') ?? 'active';

  let query = supabaseAdmin
    .from('gym_memberships')
    .select('id, member_id, contract_type, start_date, end_date, status, notes, created_at, updated_at, members:member_id (id, name, display_name)')
    .order('end_date', { ascending: true });

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter as GymMembershipStatus);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ memberships: data ?? [] });
}

// POST /api/coach/memberships
// Body: { memberId, contractType, startDate, notes? }
export async function POST(request: NextRequest) {
  const coach = await requireCoach(request);
  if (isAuthError(coach)) return coach;

  const body = (await request.json()) as {
    memberId?: string;
    contractType?: string;
    startDate?: string;
    notes?: string | null;
  };

  if (!body.memberId || !body.contractType || !body.startDate) {
    return NextResponse.json({ error: 'memberId, contractType, startDate required' }, { status: 400 });
  }
  if (!VALID_CONTRACT_TYPES.includes(body.contractType as GymContractType)) {
    return NextResponse.json({ error: 'invalid contractType' }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.startDate)) {
    return NextResponse.json({ error: 'startDate must be YYYY-MM-DD' }, { status: 400 });
  }

  const contractType = body.contractType as GymContractType;
  const endDate = computeContractEndDate(body.startDate, contractType);

  const { data, error } = await supabaseAdmin
    .from('gym_memberships')
    .insert({
      member_id: body.memberId,
      contract_type: contractType,
      start_date: body.startDate,
      end_date: endDate,
      status: 'active',
      notes: body.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ membership: data });
}
