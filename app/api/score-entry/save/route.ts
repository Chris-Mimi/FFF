import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';
import { notifyScoreRecorded } from '@/lib/notifications';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface ScoreEntry {
  memberId?: string;
  whiteboardName?: string;
  sectionId: string;
  scaling_level?: string;
  scaling_level_2?: string;
  track?: number | null;
  time_result?: string;
  reps_result?: number | null;
  weight_result?: number | null;
  weight_result_2?: number | null;
  rounds_result?: number | null;
  calories_result?: number | null;
  metres_result?: number | null;
  task_completed?: boolean | null;
}

function validateScore(score: ScoreEntry): string | null {
  if (score.reps_result != null && (score.reps_result < 0 || score.reps_result > 10000)) {
    return 'Reps must be between 0 and 10,000';
  }
  if (score.weight_result != null && (score.weight_result < 0 || score.weight_result > 500)) {
    return 'Weight must be between 0 and 500 kg';
  }
  if (score.weight_result_2 != null && (score.weight_result_2 < 0 || score.weight_result_2 > 500)) {
    return 'Weight 2 must be between 0 and 500 kg';
  }
  if (score.rounds_result != null && (score.rounds_result < 0 || score.rounds_result > 1000)) {
    return 'Rounds must be between 0 and 1,000';
  }
  if (score.calories_result != null && (score.calories_result < 0 || score.calories_result > 10000)) {
    return 'Calories must be between 0 and 10,000';
  }
  if (score.metres_result != null && (score.metres_result < 0 || score.metres_result > 100000)) {
    return 'Metres must be between 0 and 100,000';
  }
  return null;
}

function isScoreEmpty(score: ScoreEntry): boolean {
  return (
    !score.time_result &&
    score.reps_result == null &&
    score.weight_result == null &&
    score.weight_result_2 == null &&
    score.rounds_result == null &&
    score.calories_result == null &&
    score.metres_result == null &&
    score.task_completed == null &&
    !score.scaling_level &&
    !score.scaling_level_2
  );
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach(request);
    if (isAuthError(user)) return user;

    const body = await request.json();
    const { wodId, workoutDate, scores } = body as {
      wodId: string;
      workoutDate: string;
      scores: ScoreEntry[];
    };

    if (!wodId || !workoutDate || !Array.isArray(scores)) {
      return NextResponse.json(
        { error: 'wodId, workoutDate, and scores array are required' },
        { status: 400 }
      );
    }

    // Split scores into member-based and whiteboard-based
    const memberScores = scores.filter(s => s.memberId);
    const whiteboardScores = scores.filter(s => s.whiteboardName && !s.memberId);

    // Look up user_ids for member-based scores via email match
    const memberIds = [...new Set(memberScores.map(s => s.memberId!))];
    const memberIdToEmail: Record<string, string> = {};
    const emailToUserId: Record<string, string> = {};

    if (memberIds.length > 0) {
      const { data: members } = await supabaseAdmin
        .from('members')
        .select('id, email')
        .in('id', memberIds);

      const memberEmails = (members || []).map(m => m.email);
      for (const m of members || []) {
        memberIdToEmail[m.id] = m.email;
      }

      if (memberEmails.length > 0) {
        const { data: { users: allAuthUsers } } = await supabaseAdmin.auth.admin.listUsers({
          perPage: 1000,
        });
        for (const authUser of allAuthUsers || []) {
          if (authUser.email && memberEmails.includes(authUser.email)) {
            emailToUserId[authUser.email] = authUser.id;
          }
        }
      }
    }

    // Build upsert records
    const records = [];

    // Member-based scores
    for (const score of memberScores) {
      if (isScoreEmpty(score)) continue;

      const validationError = validateScore(score);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }

      const memberEmail = memberIdToEmail[score.memberId!];
      const userId = memberEmail ? emailToUserId[memberEmail] || null : null;

      records.push({
        wod_id: wodId,
        workout_date: workoutDate,
        member_id: score.memberId!,
        user_id: userId,
        whiteboard_name: null,
        section_id: `${score.sectionId}-content-0`,
        scaling_level: score.scaling_level || null,
        scaling_level_2: score.scaling_level_2 || null,
        track: score.track ?? null,
        time_result: score.time_result || null,
        reps_result: score.reps_result ?? null,
        weight_result: score.weight_result ?? null,
        weight_result_2: score.weight_result_2 ?? null,
        rounds_result: score.rounds_result ?? null,
        calories_result: score.calories_result ?? null,
        metres_result: score.metres_result ?? null,
        task_completed: score.task_completed ?? null,
        updated_at: new Date().toISOString(),
      });
    }

    // Whiteboard-based scores
    for (const score of whiteboardScores) {
      if (isScoreEmpty(score)) continue;

      const validationError = validateScore(score);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }

      records.push({
        wod_id: wodId,
        workout_date: workoutDate,
        member_id: null,
        user_id: null,
        whiteboard_name: score.whiteboardName!,
        section_id: `${score.sectionId}-content-0`,
        scaling_level: score.scaling_level || null,
        scaling_level_2: score.scaling_level_2 || null,
        track: score.track ?? null,
        time_result: score.time_result || null,
        reps_result: score.reps_result ?? null,
        weight_result: score.weight_result ?? null,
        weight_result_2: score.weight_result_2 ?? null,
        rounds_result: score.rounds_result ?? null,
        calories_result: score.calories_result ?? null,
        metres_result: score.metres_result ?? null,
        task_completed: score.task_completed ?? null,
        updated_at: new Date().toISOString(),
      });
    }

    if (records.length === 0) {
      return NextResponse.json({ saved: 0 });
    }

    // Upsert all records
    // The unique constraint is on (user_id, wod_id, section_id, workout_date)
    // For members without user_id, we need member_id-based conflict handling
    // We'll upsert one by one to handle both cases
    let savedCount = 0;
    const errors: string[] = [];

    for (const record of records) {
      // Check for existing record by member_id, user_id, or whiteboard_name
      let existingId: string | null = null;

      if (record.member_id) {
        const { data: existing } = await supabaseAdmin
          .from('wod_section_results')
          .select('id')
          .eq('wod_id', record.wod_id)
          .eq('section_id', record.section_id)
          .eq('workout_date', record.workout_date)
          .eq('member_id', record.member_id)
          .limit(1)
          .maybeSingle();
        if (existing) existingId = existing.id;
      }

      if (!existingId && record.user_id) {
        const { data: existing } = await supabaseAdmin
          .from('wod_section_results')
          .select('id')
          .eq('wod_id', record.wod_id)
          .eq('section_id', record.section_id)
          .eq('workout_date', record.workout_date)
          .eq('user_id', record.user_id)
          .limit(1)
          .maybeSingle();
        if (existing) existingId = existing.id;
      }

      if (!existingId && record.whiteboard_name) {
        const { data: existing } = await supabaseAdmin
          .from('wod_section_results')
          .select('id')
          .eq('wod_id', record.wod_id)
          .eq('section_id', record.section_id)
          .eq('workout_date', record.workout_date)
          .eq('whiteboard_name', record.whiteboard_name)
          .limit(1)
          .maybeSingle();
        if (existing) existingId = existing.id;
      }

      let error;
      if (existingId) {
        // Update existing
        ({ error } = await supabaseAdmin
          .from('wod_section_results')
          .update(record)
          .eq('id', existingId));
      } else {
        // Insert new
        ({ error } = await supabaseAdmin
          .from('wod_section_results')
          .insert(record));
      }

      if (error) {
        console.error('Score save error:', error);
        errors.push(`Failed to save score for member ${record.member_id}: ${error.message}`);
      } else {
        savedCount++;
      }
    }

    if (errors.length > 0 && savedCount === 0) {
      return NextResponse.json({ error: 'Failed to save scores' }, { status: 500 });
    }

    // Fire-and-forget: notify athletes whose scores were saved
    if (savedCount > 0) {
      // Fetch workout name + current publish_sections
      const { data: wod } = await supabaseAdmin
        .from('wods')
        .select('workout_name, session_type, publish_sections')
        .eq('id', wodId)
        .maybeSingle();
      const workoutName = wod?.workout_name || wod?.session_type || '';

      // Auto-add scored sections to publish_sections so athletes can see them
      const scoredSectionIds = [...new Set(records.map(r => r.section_id.replace(/-content-0$/, '')))];
      const currentPublished: string[] = wod?.publish_sections || [];
      const newPublished = [...new Set([...currentPublished, ...scoredSectionIds])];
      if (newPublished.length !== currentPublished.length) {
        await supabaseAdmin
          .from('wods')
          .update({ publish_sections: newPublished })
          .eq('id', wodId);
      }

      // Collect unique user_ids that had scores saved
      const notifiedUserIds = new Set<string>();
      for (const record of records) {
        if (record.user_id && !notifiedUserIds.has(record.user_id)) {
          notifiedUserIds.add(record.user_id);
          notifyScoreRecorded(record.user_id, workoutName);
        }
      }
    }

    return NextResponse.json({ saved: savedCount, errors: errors.length > 0 ? errors : undefined });
  } catch (err) {
    console.error('Score entry save error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
