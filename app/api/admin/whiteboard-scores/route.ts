import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireCoach(request);
    if (isAuthError(authResult)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all unlinked whiteboard entries
    const { data: rows, error } = await supabaseAdmin
      .from('wod_section_results')
      .select('whiteboard_name')
      .is('user_id', null)
      .not('whiteboard_name', 'is', null);

    if (error) {
      console.error('Error fetching whiteboard scores:', error);
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }

    // Aggregate by whiteboard_name
    const counts: Record<string, number> = {};
    for (const row of rows || []) {
      const name = row.whiteboard_name as string;
      counts[name] = (counts[name] || 0) + 1;
    }

    const entries = Object.entries(counts)
      .map(([whiteboardName, scoreCount]) => ({ whiteboardName, scoreCount }))
      .sort((a, b) => a.whiteboardName.localeCompare(b.whiteboardName));

    return NextResponse.json(entries);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
