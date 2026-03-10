import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, isAuthError } from '@/lib/auth-api';
import { notifyPrAchieved } from '@/lib/notifications';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (isAuthError(user)) return user;

    const body = await request.json();
    // Use authenticated user's ID — ignore userId from body to prevent IDOR
    const userId = user.id;
    const {
      liftName,
      weightKg,
      reps,
      repMaxType,
      repScheme,
      calculated1rm,
      notes,
      liftDate
    } = body;

    if (!liftName || !weightKg || !reps || !liftDate) {
      return NextResponse.json(
        { error: 'liftName, weightKg, reps, and liftDate are required' },
        { status: 400 }
      );
    }

    const weight = parseFloat(weightKg);
    const parsedReps = parseInt(reps);

    // Validate realistic ranges
    if (isNaN(weight) || weight < 0 || weight > 500) {
      return NextResponse.json({ error: 'Weight must be between 0 and 500 kg' }, { status: 400 });
    }
    if (isNaN(parsedReps) || parsedReps < 0 || parsedReps > 1000) {
      return NextResponse.json({ error: 'Reps must be between 0 and 1,000' }, { status: 400 });
    }

    // Insert new lift record
    const { data: newRecord, error } = await supabaseAdmin
      .from('lift_records')
      .insert({
        user_id: userId,
        lift_name: liftName,
        weight_kg: weight,
        reps: reps,
        rep_max_type: repMaxType || null,
        rep_scheme: repScheme || null,
        calculated_1rm: calculated1rm || null,
        notes: notes || null,
        lift_date: liftDate,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error inserting lift record:', error);
      return NextResponse.json(
        { error: 'Failed to save lift record' },
        { status: 500 }
      );
    }

    // PR detection — only for rep_max_type records (1RM, 3RM, 5RM, 10RM)
    let isPR = false;
    if (repMaxType && newRecord) {
      const { data: previousBest } = await supabaseAdmin
        .from('lift_records')
        .select('weight_kg')
        .eq('user_id', userId)
        .eq('lift_name', liftName)
        .eq('rep_max_type', repMaxType)
        .neq('id', newRecord.id)
        .order('weight_kg', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!previousBest || weight > previousBest.weight_kg) {
        isPR = true;
        notifyPrAchieved(userId, liftName, `${weight}kg (${repMaxType})`);
      }
    }

    return NextResponse.json(
      {
        success: true,
        id: newRecord.id,
        isPR,
        message: isPR ? 'New PR!' : 'Lift record saved'
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Lift record save error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
