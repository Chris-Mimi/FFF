import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';
import { getWorkoutTypeLockRules, setWorkoutTypeLockRule } from '@/lib/bookingRules';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireCoach(request);
  if (isAuthError(auth)) return auth;

  const supabase = adminClient();
  const [typesRes, rules] = await Promise.all([
    supabase.from('workout_types').select('name').order('name'),
    getWorkoutTypeLockRules(),
  ]);

  if (typesRes.error) {
    console.error('Failed to load workout_types:', typesRes.error);
    return NextResponse.json({ error: 'Failed to load workout types' }, { status: 500 });
  }

  const ruleMap = new Map(rules.map((r) => [r.workout_type, r.auto_lock_lead_minutes]));
  const types = (typesRes.data || []).map((t) => ({
    workout_type: t.name as string,
    auto_lock_lead_minutes: ruleMap.has(t.name) ? ruleMap.get(t.name)! : null,
  }));

  return NextResponse.json({ types });
}

// Body: { updates: [{ workout_type: string, auto_lock_lead_minutes: number | null }] }
// null = remove the override (fall back to global).
export async function PUT(request: NextRequest) {
  const auth = await requireCoach(request);
  if (isAuthError(auth)) return auth;

  const body = await request.json();
  const updates = body?.updates;
  if (!Array.isArray(updates)) {
    return NextResponse.json({ error: 'updates must be an array' }, { status: 400 });
  }

  for (const u of updates) {
    if (typeof u?.workout_type !== 'string' || !u.workout_type.trim()) {
      return NextResponse.json({ error: 'workout_type required' }, { status: 400 });
    }
    const v = u.auto_lock_lead_minutes;
    if (v !== null && (typeof v !== 'number' || !Number.isInteger(v) || v < 0)) {
      return NextResponse.json(
        { error: `auto_lock_lead_minutes for "${u.workout_type}" must be null or a non-negative integer` },
        { status: 400 }
      );
    }
  }

  try {
    for (const u of updates) {
      await setWorkoutTypeLockRule(u.workout_type, u.auto_lock_lead_minutes);
    }
  } catch (err) {
    console.error('Failed to update per-type booking rules:', err);
    return NextResponse.json({ error: 'Failed to update per-type rules' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
