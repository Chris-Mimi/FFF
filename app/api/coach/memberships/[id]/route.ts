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
const VALID_STATUSES: GymMembershipStatus[] = ['active', 'expired', 'cancelled'];

// PATCH /api/coach/memberships/[id]
// Body: { contractType?, startDate?, notes?, status? }
// If contractType OR startDate changes, end_date is recomputed.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const coach = await requireCoach(request);
  if (isAuthError(coach)) return coach;

  const { id } = await params;
  const body = (await request.json()) as {
    contractType?: string;
    startDate?: string;
    notes?: string | null;
    status?: string;
  };

  const update: Record<string, unknown> = {};
  let needsRecompute = false;
  let nextContractType: GymContractType | null = null;
  let nextStartDate: string | null = null;

  if (body.contractType !== undefined) {
    if (!VALID_CONTRACT_TYPES.includes(body.contractType as GymContractType)) {
      return NextResponse.json({ error: 'invalid contractType' }, { status: 400 });
    }
    update.contract_type = body.contractType;
    nextContractType = body.contractType as GymContractType;
    needsRecompute = true;
  }
  if (body.startDate !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.startDate)) {
      return NextResponse.json({ error: 'startDate must be YYYY-MM-DD' }, { status: 400 });
    }
    update.start_date = body.startDate;
    nextStartDate = body.startDate;
    needsRecompute = true;
  }
  if (body.notes !== undefined) update.notes = body.notes;
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status as GymMembershipStatus)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 });
    }
    update.status = body.status;
  }

  if (needsRecompute) {
    // Need current row to fill in whichever field wasn't sent.
    const { data: current, error: readErr } = await supabaseAdmin
      .from('gym_memberships')
      .select('contract_type, start_date')
      .eq('id', id)
      .single();
    if (readErr || !current) {
      return NextResponse.json({ error: 'membership not found' }, { status: 404 });
    }
    const ct = nextContractType ?? (current.contract_type as GymContractType);
    const sd = nextStartDate ?? (current.start_date as string);
    update.end_date = computeContractEndDate(sd, ct);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no changes provided' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('gym_memberships')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ membership: data });
}

// DELETE /api/coach/memberships/[id]
// Hard-deletes a row. Use cancellation (PATCH status=cancelled) for soft delete.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const coach = await requireCoach(request);
  if (isAuthError(coach)) return coach;

  const { id } = await params;
  const { error } = await supabaseAdmin
    .from('gym_memberships')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
