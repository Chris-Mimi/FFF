import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
      .select('*')
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
      workout_id: string;
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
        .single();

      if (existingSession) {
        console.log(`Session already exists for ${formattedDate} at ${template.time}, skipping`);
        continue;
      }

      // Create placeholder workout
      const { data: workout, error: workoutError } = await supabaseAdmin
        .from('wods')
        .insert({
          date: formattedDate,
          title: `${template.workout_type} - Auto-generated`,
          sections: [], // Empty placeholder
          coach_notes: `Auto-generated from template. Please add workout content.`,
          class_times: [] // Empty placeholder for class times
        })
        .select()
        .single();

      if (workoutError) {
        console.error('Error creating workout:', workoutError);
        continue;
      }

      // Create weekly session linked to the workout
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('weekly_sessions')
        .insert({
          date: formattedDate,
          time: template.time,
          workout_id: workout.id,
          capacity: template.default_capacity,
          status: 'draft' // Coach must review and publish
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Error creating session:', sessionError);
        // Rollback: Delete the workout if session creation fails
        await supabaseAdmin.from('wods').delete().eq('id', workout.id);
        continue;
      }

      createdSessions.push({
        date: formattedDate,
        time: template.time,
        workout_type: template.workout_type,
        session_id: session.id,
        workout_id: workout.id
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
