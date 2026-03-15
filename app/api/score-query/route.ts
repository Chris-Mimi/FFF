import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, isAuthError } from '@/lib/auth-api';
import { notifyScoreQuery } from '@/lib/notifications';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const result = await requireAuth(req);
    if (isAuthError(result)) return result;
    const user = result;

    const { workoutName, message } = await req.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get athlete name from members table
    const { data: member } = await supabaseAdmin
      .from('members')
      .select('name')
      .eq('id', user.id)
      .maybeSingle();

    const athleteName = member?.name || user.email || 'An athlete';

    const pushResult = await notifyScoreQuery(athleteName, workoutName || '', message.trim());

    return NextResponse.json({ success: true, pushResult });
  } catch (error) {
    console.error('Score query error:', error);
    return NextResponse.json({ error: 'Failed to send query', detail: String(error) }, { status: 500 });
  }
}
