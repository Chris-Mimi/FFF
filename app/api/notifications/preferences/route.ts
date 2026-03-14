import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, isAuthError } from '@/lib/auth-api';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const VALID_PREF_KEYS = [
  'wod_published',
  'booking_confirmed',
  'booking_waitlisted',
  'booking_promoted',
  'pr_achieved',
  'achievement_awarded',
  'session_cancelled',
  'score_recorded',
] as const;

export async function GET(request: NextRequest) {
  const result = await requireAuth(request);
  if (isAuthError(result)) return result;
  const user = result;

  try {
    const { data: preferences } = await supabaseAdmin
      .from('notification_preferences')
      .select('wod_published, booking_confirmed, booking_waitlisted, booking_promoted, pr_achieved, achievement_awarded, session_cancelled, score_recorded')
      .eq('user_id', user.id)
      .maybeSingle();

    return NextResponse.json({
      preferences: preferences || {
        wod_published: true,
        booking_confirmed: true,
        booking_waitlisted: true,
        booking_promoted: true,
        pr_achieved: true,
        achievement_awarded: true,
        session_cancelled: true,
        score_recorded: true,
      },
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const result = await requireAuth(request);
  if (isAuthError(result)) return result;
  const user = result;

  try {
    const body = await request.json();

    // Only allow valid preference keys with boolean values
    const prefUpdates: Record<string, boolean> = {};
    for (const key of VALID_PREF_KEYS) {
      if (typeof body[key] === 'boolean') {
        prefUpdates[key] = body[key];
      }
    }

    if (Object.keys(prefUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid preferences provided' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('notification_preferences')
      .update({ ...prefUpdates, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);

    if (error) {
      console.error('Update preferences error:', error);
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Preferences update error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
