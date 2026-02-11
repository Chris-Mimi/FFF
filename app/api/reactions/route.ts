import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, isAuthError } from '@/lib/auth-api';

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

const VALID_TARGET_TYPES = ['wod_section_result', 'benchmark_result', 'lift_record'] as const;

/**
 * POST /api/reactions — Toggle a fist bump reaction
 * Body: { targetType, targetId }
 * Returns: { reacted: boolean, count: number }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (isAuthError(user)) return user;

    const body = await request.json();
    const { targetType, targetId } = body;

    if (!targetType || !targetId) {
      return NextResponse.json(
        { error: 'targetType and targetId are required' },
        { status: 400 }
      );
    }

    if (!VALID_TARGET_TYPES.includes(targetType)) {
      return NextResponse.json(
        { error: 'Invalid targetType' },
        { status: 400 }
      );
    }

    // Check if reaction already exists
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('reactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking reaction:', checkError);
      return NextResponse.json({ error: 'Failed to check reaction' }, { status: 500 });
    }

    if (existing) {
      // Remove reaction (un-fist-bump)
      const { error: deleteError } = await supabaseAdmin
        .from('reactions')
        .delete()
        .eq('id', existing.id);

      if (deleteError) {
        console.error('Error deleting reaction:', deleteError);
        return NextResponse.json({ error: 'Failed to remove reaction' }, { status: 500 });
      }
    } else {
      // Add reaction (fist bump)
      const { error: insertError } = await supabaseAdmin
        .from('reactions')
        .insert({
          user_id: user.id,
          target_type: targetType,
          target_id: targetId,
          reaction_type: 'fist_bump'
        });

      if (insertError) {
        console.error('Error inserting reaction:', insertError);
        return NextResponse.json({ error: 'Failed to add reaction' }, { status: 500 });
      }
    }

    // Get updated count
    const { count, error: countError } = await supabaseAdmin
      .from('reactions')
      .select('*', { count: 'exact', head: true })
      .eq('target_type', targetType)
      .eq('target_id', targetId);

    if (countError) {
      console.error('Error counting reactions:', countError);
    }

    return NextResponse.json({
      reacted: !existing,
      count: count || 0
    });

  } catch (error) {
    console.error('Reaction toggle error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * GET /api/reactions?targetType=X&targetIds=id1,id2,id3
 * Returns: { [targetId]: { count, userReacted, reactors } }
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (isAuthError(user)) return user;

    const { searchParams } = new URL(request.url);
    const targetType = searchParams.get('targetType');
    const targetIdsParam = searchParams.get('targetIds');

    if (!targetType || !targetIdsParam) {
      return NextResponse.json(
        { error: 'targetType and targetIds are required' },
        { status: 400 }
      );
    }

    const targetIds = targetIdsParam.split(',').filter(Boolean);
    if (targetIds.length === 0) {
      return NextResponse.json({});
    }

    // Fetch all reactions for these targets
    const { data: reactions, error } = await supabaseAdmin
      .from('reactions')
      .select('target_id, user_id')
      .eq('target_type', targetType)
      .in('target_id', targetIds);

    if (error) {
      console.error('Error fetching reactions:', error);
      return NextResponse.json({ error: 'Failed to fetch reactions' }, { status: 500 });
    }

    // Get unique reactor user IDs for name lookup
    const reactorUserIds = [...new Set((reactions || []).map(r => r.user_id))];

    const memberNames: Record<string, string> = {};
    if (reactorUserIds.length > 0) {
      const { data: members } = await supabaseAdmin
        .from('members')
        .select('id, display_name, name')
        .in('id', reactorUserIds);

      if (members) {
        for (const m of members) {
          memberNames[m.id] = m.display_name || m.name || 'Unknown';
        }
      }
    }

    // Build response map
    const result: Record<string, { count: number; userReacted: boolean; reactors: string[] }> = {};

    for (const targetId of targetIds) {
      const targetReactions = (reactions || []).filter(r => r.target_id === targetId);
      result[targetId] = {
        count: targetReactions.length,
        userReacted: targetReactions.some(r => r.user_id === user.id),
        reactors: targetReactions.map(r => memberNames[r.user_id] || 'Unknown')
      };
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Reaction fetch error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
