import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';

// Use service role for admin operations
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

interface SessionTemplate {
  id: string;
  day_of_week: number;
  time: string;
  workout_type: string;
  default_capacity: number;
}

export async function POST(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const body = await request.json();
    const { start_date } = body; // Optional: YYYY-MM-DD format

    // Calculate the start date (next Monday if not provided)
    let startDate: Date;
    if (start_date) {
      startDate = new Date(start_date);
    } else {
      // Default: next Monday from today
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek); // Days until next Monday
      startDate = new Date(today);
      startDate.setDate(today.getDate() + daysUntilMonday);
      startDate.setHours(0, 0, 0, 0);
    }

    // Fetch all active session templates
    const { data: templates, error: templatesError } = await supabaseAdmin
      .from('session_templates')
      .select('id, day_of_week, time, workout_type, default_capacity')
      .eq('active', true)
      .order('day_of_week', { ascending: true });

    if (templatesError) {
      console.error('Error fetching templates:', templatesError);
      return NextResponse.json(
        { error: 'Failed to fetch session templates' },
        { status: 500 }
      );
    }

    if (!templates || templates.length === 0) {
      return NextResponse.json(
        { error: 'No active session templates found. Please create templates first.' },
        { status: 400 }
      );
    }

    const createdSessions: Array<{
      date: string;
      time: string;
      workout_type: string;
      session_id: string;
    }> = [];

    // Generate sessions for each template
    for (const template of templates as SessionTemplate[]) {
      // Calculate the date for this session
      // day_of_week: 1 = Monday, 2 = Tuesday, ..., 7 = Sunday
      const sessionDate = new Date(startDate);
      const daysToAdd = template.day_of_week === 7 ? 6 : template.day_of_week - 1; // Adjust for Sunday
      sessionDate.setDate(startDate.getDate() + daysToAdd);

      // Format date without timezone conversion
      const year = sessionDate.getFullYear();
      const month = String(sessionDate.getMonth() + 1).padStart(2, '0');
      const day = String(sessionDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      // Check if session already exists for this date and time
      const { data: existingSession } = await supabaseAdmin
        .from('weekly_sessions')
        .select('id')
        .eq('date', formattedDate)
        .eq('time', template.time)
        .maybeSingle();

      if (existingSession) {
        continue;
      }

      // Calculate ISO workout week
      const wkDate = new Date(Date.UTC(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate()));
      const dow = wkDate.getUTCDay() || 7;
      wkDate.setUTCDate(wkDate.getUTCDate() + 4 - dow);
      const isoYear = wkDate.getUTCFullYear();
      const jan4 = new Date(Date.UTC(isoYear, 0, 4));
      const jan4Dow = jan4.getUTCDay() || 7;
      const firstThursday = new Date(Date.UTC(isoYear, 0, 4 + (4 - jan4Dow)));
      const weekNo = Math.floor((wkDate.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
      const workoutWeek = `${isoYear}-W${String(weekNo).padStart(2, '0')}`;

      // Format time for display (e.g. "17:00" → "17:00")
      const displayTime = template.time.slice(0, 5);

      // Default workout name: date + time (e.g. "2026-03-17 17:00")
      const workoutName = `${formattedDate} ${displayTime}`;

      // Default sections: Whiteboard Intro → Warm-up → Skill → WOD
      const timestamp = Date.now();
      const defaultSections = [
        { id: `section-${timestamp}-1`, type: 'Whiteboard Intro', duration: 0, content: '' },
        { id: `section-${timestamp}-2`, type: 'Warm-up', duration: 12, content: '' },
        { id: `section-${timestamp}-3`, type: 'Skill', duration: 15, content: '' },
        { id: `section-${timestamp}-4`, type: 'WOD', duration: 15, content: '' },
      ];

      // Create WOD record with default sections
      const sessionType = template.workout_type || 'WOD';
      const { data: newWOD, error: wodError } = await supabaseAdmin
        .from('wods')
        .insert({
          title: sessionType,
          date: formattedDate,
          session_type: sessionType,
          workout_name: workoutName,
          workout_week: workoutWeek,
          class_times: [template.time],
          sections: defaultSections,
          workout_publish_status: 'draft',
        })
        .select('id')
        .single();

      if (wodError) {
        console.error('Error creating WOD:', wodError);
        continue;
      }

      // Create weekly session linked to the WOD
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('weekly_sessions')
        .insert({
          date: formattedDate,
          time: template.time,
          workout_id: newWOD.id,
          workout_type: template.workout_type,
          capacity: template.default_capacity,
          status: 'published'
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Error creating session:', sessionError);
        continue;
      }

      createdSessions.push({
        date: formattedDate,
        time: template.time,
        workout_type: template.workout_type,
        session_id: session.id,
      });
    }

    // Format week start date without timezone conversion
    const weekStartYear = startDate.getFullYear();
    const weekStartMonth = String(startDate.getMonth() + 1).padStart(2, '0');
    const weekStartDay = String(startDate.getDate()).padStart(2, '0');
    const weekStartFormatted = `${weekStartYear}-${weekStartMonth}-${weekStartDay}`;

    return NextResponse.json(
      {
        success: true,
        message: `Generated ${createdSessions.length} sessions for week starting ${weekStartFormatted}`,
        week_start: weekStartFormatted,
        sessions: createdSessions
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Generate weekly sessions error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
