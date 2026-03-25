import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireCoach(request);
    if (isAuthError(authResult)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { whiteboardName, memberId } = await request.json();
    if (!whiteboardName || !memberId) {
      return NextResponse.json({ error: 'Missing whiteboardName or memberId' }, { status: 400 });
    }

    // Look up member email → auth user_id (same pattern as score-entry/save)
    const { data: member } = await supabaseAdmin
      .from('members')
      .select('id, email')
      .eq('id', memberId)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    let userId: string | null = null;
    if (member.email) {
      const { data: { users: allAuthUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const authUser = (allAuthUsers || []).find(u => u.email === member.email);
      if (authUser) userId = authUser.id;
    }

    // Fetch all whiteboard rows to link
    const { data: wbRows, error: fetchError } = await supabaseAdmin
      .from('wod_section_results')
      .select('id, wod_id, section_id, workout_date')
      .eq('whiteboard_name', whiteboardName)
      .is('user_id', null);

    if (fetchError || !wbRows) {
      console.error('Error fetching whiteboard rows:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch whiteboard scores' }, { status: 500 });
    }

    let linked = 0;
    let duplicatesRemoved = 0;

    for (const row of wbRows) {
      // Check if a registered entry already exists for same wod+section+date
      let query = supabaseAdmin
        .from('wod_section_results')
        .select('id')
        .eq('wod_id', row.wod_id)
        .eq('section_id', row.section_id)
        .eq('workout_date', row.workout_date)
        .neq('id', row.id);

      // Match by user_id or member_id
      if (userId) {
        query = query.or(`user_id.eq.${userId},member_id.eq.${memberId}`);
      } else {
        query = query.eq('member_id', memberId);
      }

      const { data: duplicates } = await query;

      if (duplicates && duplicates.length > 0) {
        // Duplicate exists — delete the whiteboard row
        await supabaseAdmin
          .from('wod_section_results')
          .delete()
          .eq('id', row.id);
        duplicatesRemoved++;
      } else {
        // No duplicate — update the whiteboard row
        const updateData: Record<string, string | null> = {
          member_id: memberId,
          whiteboard_name: null,
        };
        if (userId) updateData.user_id = userId;

        await supabaseAdmin
          .from('wod_section_results')
          .update(updateData)
          .eq('id', row.id);
        linked++;
      }
    }

    return NextResponse.json({ linked, duplicatesRemoved });
  } catch {
    return NextResponse.json({ error: 'Failed to link scores' }, { status: 500 });
  }
}
