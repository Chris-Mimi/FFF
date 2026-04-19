import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';
import { getSessionTypeLockRules, setSessionTypeLockRule } from '@/lib/bookingRules';

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
  // Session type list comes from the workout_titles reference table
  // (confusingly named — holds values like "WOD", "Foundations",
  // "Kids & Teens", "Eltern-Kind-Turnen"). Active-only.
  const [titlesRes, rules] = await Promise.all([
    supabase.from('workout_titles').select('name').eq('active', true).order('display_order', { ascending: true }),
    getSessionTypeLockRules(),
  ]);

  if (titlesRes.error) {
    console.error('Failed to load workout_titles:', titlesRes.error);
    return NextResponse.json({ error: 'Failed to load session types' }, { status: 500 });
  }

  const ruleMap = new Map(rules.map((r) => [r.session_type, r.auto_lock_lead_minutes]));
  const types = (titlesRes.data || []).map((t) => ({
    session_type: t.name as string,
    auto_lock_lead_minutes: ruleMap.has(t.name) ? ruleMap.get(t.name)! : null,
  }));

  return NextResponse.json({ types });
}

// Body: { updates: [{ session_type: string, auto_lock_lead_minutes: number | null }] }
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
    if (typeof u?.session_type !== 'string' || !u.session_type.trim()) {
      return NextResponse.json({ error: 'session_type required' }, { status: 400 });
    }
    const v = u.auto_lock_lead_minutes;
    if (v !== null && (typeof v !== 'number' || !Number.isInteger(v) || v < 0)) {
      return NextResponse.json(
        { error: `auto_lock_lead_minutes for "${u.session_type}" must be null or a non-negative integer` },
        { status: 400 }
      );
    }
  }

  try {
    for (const u of updates) {
      await setSessionTypeLockRule(u.session_type, u.auto_lock_lead_minutes);
    }
  } catch (err) {
    console.error('Failed to update per-session-type booking rules:', err);
    return NextResponse.json({ error: 'Failed to update per-session-type rules' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
