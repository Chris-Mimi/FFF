import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';
import { notifyAchievementAwarded } from '@/lib/notifications';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach(request);
    if (isAuthError(user)) return user;

    const body = await request.json();
    const { userId, achievementId, achievedDate, notes } = body;

    if (!userId || !achievementId) {
      return NextResponse.json(
        { error: 'userId and achievementId are required' },
        { status: 400 }
      );
    }

    // Look up coach's member ID from their auth email
    const { data: coachMember } = await supabaseAdmin
      .from('members')
      .select('id')
      .eq('email', user.email)
      .maybeSingle();

    const awardedBy = coachMember?.id || null;

    // Fetch the achievement definition to validate and get branch/tier info
    const { data: achievement, error: achError } = await supabaseAdmin
      .from('achievement_definitions')
      .select('*')
      .eq('id', achievementId)
      .single();

    if (achError || !achievement) {
      return NextResponse.json(
        { error: 'Achievement not found' },
        { status: 404 }
      );
    }

    // Sequential tier enforcement: check all lower tiers in this branch are unlocked
    if (achievement.tier > 1) {
      const { data: lowerTiers } = await supabaseAdmin
        .from('achievement_definitions')
        .select('id')
        .eq('branch', achievement.branch)
        .lt('tier', achievement.tier);

      if (lowerTiers && lowerTiers.length > 0) {
        const lowerTierIds = lowerTiers.map((t: { id: string }) => t.id);

        const { data: unlockedLower } = await supabaseAdmin
          .from('athlete_achievements')
          .select('achievement_id')
          .eq('user_id', userId)
          .in('achievement_id', lowerTierIds);

        const unlockedCount = unlockedLower?.length || 0;
        if (unlockedCount < lowerTierIds.length) {
          return NextResponse.json(
            { error: 'Previous tiers must be unlocked first' },
            { status: 400 }
          );
        }
      }
    }

    // Insert the achievement
    const { data: newRecord, error: insertError } = await supabaseAdmin
      .from('athlete_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievementId,
        achieved_date: achievedDate || new Date().toISOString().split('T')[0],
        awarded_by: awardedBy,
        notes: notes || null,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Athlete already has this achievement' },
          { status: 409 }
        );
      }
      console.error('Award achievement error:', insertError);
      return NextResponse.json(
        { error: 'Failed to award achievement' },
        { status: 500 }
      );
    }

    // Fire-and-forget push notification
    notifyAchievementAwarded(userId, achievement.name);

    return NextResponse.json(newRecord, { status: 201 });
  } catch (err) {
    console.error('Award achievement error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
