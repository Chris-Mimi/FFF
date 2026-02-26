import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * DELETE /api/sessions/cleanup-results
 * Deletes athlete results linked to replaced WODs (coach-only, service role).
 * Called during copy-workout when overwriting an existing session slot.
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireCoach(request);
    if (isAuthError(user)) return user;

    const { wodIds } = await request.json();

    if (!wodIds || !Array.isArray(wodIds) || wodIds.length === 0) {
      return NextResponse.json({ error: 'wodIds array required' }, { status: 400 });
    }

    const { error: sectionError } = await supabaseAdmin
      .from('wod_section_results')
      .delete()
      .in('wod_id', wodIds);

    const { error: logsError } = await supabaseAdmin
      .from('workout_logs')
      .delete()
      .in('wod_id', wodIds);

    if (sectionError || logsError) {
      console.error('Cleanup errors:', { sectionError, logsError });
      return NextResponse.json({ error: 'Failed to clean up results' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: 'Failed to clean up results' }, { status: 500 });
  }
}
