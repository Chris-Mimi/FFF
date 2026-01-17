import { supabase } from '@/lib/supabase';
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role client for bypassing RLS
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

interface PublishConfig {
  selectedSectionIds: string[];
  eventTime: string;
  eventDurationMinutes: number;
}

interface VariableSet {
  set_number: number;
  reps: number;
  percentage_1rm?: number;
}

interface ConfiguredLift {
  id: string;
  name: string;
  rep_type: 'constant' | 'variable';
  sets?: number;
  reps?: number;
  percentage_1rm?: number;
  variable_sets?: VariableSet[];
}

interface ConfiguredBenchmark {
  id: string;
  name: string;
  type: string;
  description?: string;
  scaling_option?: string;
}

interface ConfiguredForgeBenchmark {
  id: string;
  name: string;
  type: string;
  description?: string;
  scaling_option?: string;
}

interface WorkoutSection {
  id: string;
  type: string;
  duration: number;
  content: string;
  workout_type_id?: string;
  lifts?: ConfiguredLift[];
  benchmarks?: ConfiguredBenchmark[];
  forge_benchmarks?: ConfiguredForgeBenchmark[];
}

interface Workout {
  id: string;
  title: string;
  session_type: string;
  date: string;
  sections: WorkoutSection[];
  google_event_id?: string;
  workout_name?: string;
  track_id?: string;
  tracks?: { name: string } | { name: string }[] | null;
}

export async function POST(request: NextRequest) {
  try {
    console.log('[API] Received publish request');

    const body = await request.json();
    console.log('[API] Request body:', JSON.stringify(body, null, 2));

    const { workoutId, publishConfig } = body as {
      workoutId: string;
      publishConfig: PublishConfig;
    };

    console.log('[API] Parsed - workoutId:', workoutId, 'publishConfig:', publishConfig);

    if (!workoutId || !publishConfig) {
      console.log('[API] Missing fields - workoutId:', !!workoutId, 'publishConfig:', !!publishConfig);
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the workout from database (use admin client to bypass RLS)
    const { data: workout, error: fetchError } = await supabaseAdmin
      .from('wods')
      .select('id, title, session_type, date, sections, google_event_id, workout_name, track_id, tracks(name)')
      .eq('id', workoutId)
      .single();

    console.log('[API] Database query result - workout:', !!workout, 'error:', fetchError);
    console.log('[API] Workout data - workout_name:', workout?.workout_name, 'session_type:', workout?.session_type, 'track_id:', workout?.track_id);

    if (fetchError || !workout) {
      console.log('[API] Workout not found - fetchError:', fetchError, 'workout:', workout);
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    // Get selected sections
    const selectedSections = (workout.sections as WorkoutSection[]).filter(section =>
      publishConfig.selectedSectionIds.includes(section.id)
    );

    if (selectedSections.length === 0) {
      return NextResponse.json({ error: 'No sections selected' }, { status: 400 });
    }

    // Format helper functions
    const formatLift = (lift: ConfiguredLift): string => {
      if (lift.rep_type === 'constant') {
        const base = `${lift.name} ${lift.sets}x${lift.reps}`;
        return lift.percentage_1rm ? `${base} @ ${lift.percentage_1rm}%` : base;
      } else {
        // Variable reps: show as "5-3-1" format
        const reps = lift.variable_sets?.map(s => s.reps).join('-') || '';
        const percentages = lift.variable_sets?.map(s => s.percentage_1rm) || [];

        let base = `${lift.name} ${reps}`;

        // Only show percentages if ALL sets have them defined (no undefined/null values)
        const allHavePercentages = percentages.length > 0 && percentages.every(p => p !== undefined && p !== null);
        if (allHavePercentages) {
          // Show ALL percentages for each set: "40-40-50-50-50-50-50%"
          base += ` @ ${percentages.join('-')}%`;
        }

        return base;
      }
    };

    const formatBenchmark = (benchmark: ConfiguredBenchmark): string => {
      const scaling = benchmark.scaling_option ? ` (${benchmark.scaling_option})` : '';
      return `${benchmark.name}${scaling}`;
    };

    const formatForgeBenchmark = (forge: ConfiguredForgeBenchmark): string => {
      const scaling = forge.scaling_option ? ` (${forge.scaling_option})` : '';
      return `${forge.name}${scaling}`;
    };

    // Format event description with HTML
    const formatSectionToHTML = (section: WorkoutSection, startMin: number, endMin: number): string => {
      // Section header with bold styling and running time (hide if duration is 0)
      const timeInfo = section.duration > 0 ? ` ${section.duration} mins (${startMin}-${endMin})` : '';
      const header = `<b>${section.type}</b>${timeInfo}`;

      const parts: string[] = [];

      // Format lifts
      if (section.lifts && section.lifts.length > 0) {
        const liftsHTML = section.lifts.map(lift => `• ${formatLift(lift)}`).join('<br>');
        parts.push(liftsHTML);
      }

      // Format benchmarks (with descriptions)
      if (section.benchmarks && section.benchmarks.length > 0) {
        section.benchmarks.forEach(benchmark => {
          parts.push(`<b>${formatBenchmark(benchmark)}</b>`);
          if (benchmark.description) {
            // Convert newlines to <br> in description
            const desc = benchmark.description.replace(/\n/g, '<br>');
            parts.push(desc);
          }
        });
      }

      // Format forge benchmarks (with descriptions)
      if (section.forge_benchmarks && section.forge_benchmarks.length > 0) {
        section.forge_benchmarks.forEach(forge => {
          parts.push(`<b>${formatForgeBenchmark(forge)}</b>`);
          if (forge.description) {
            // Convert newlines to <br> in description
            const desc = forge.description.replace(/\n/g, '<br>');
            parts.push(desc);
          }
        });
      }

      // Convert content to HTML
      if (section.content && section.content.trim()) {
        let content = section.content;

        // Convert line breaks to HTML breaks
        content = content.replace(/\n/g, '<br>');

        // Bold lines that look like headers (all caps or starting with numbers like "3 rounds:")
        content = content.replace(/^([A-Z\s]+:)/gm, '<b>$1</b>');
        content = content.replace(/^(\d+\s*(rounds?|reps?|min|minutes?|sets?):)/gim, '<b>$1</b>');

        // Make movement lists more readable with bullet points
        content = content.replace(/^(\d+\s*x?\s*.+)$/gm, '• $1');

        // Auto-linkify URLs
        content = content.replace(
          /(https?:\/\/[^\s<]+)/g,
          '<a href="$1">$1</a>'
        );
        content = content.replace(
          /(www\.[^\s<]+)/g,
          '<a href="http://$1">$1</a>'
        );

        parts.push(content);
      }

      const bodyContent = parts.join('<br><br>');
      return bodyContent ? `${header}<br><br>${bodyContent}` : header;
    };

    // Calculate running time for each section
    let cumulativeTime = 0;
    const formattedSections = selectedSections.map(section => {
      const duration = section.duration || 0;
      const startMin = cumulativeTime + 1;
      const endMin = cumulativeTime + duration;
      cumulativeTime = endMin;
      return formatSectionToHTML(section, startMin, endMin);
    });

    const description = formattedSections.join('<br><br>');

    // Parse event date and time
    const [year, month, day] = workout.date.split('-');
    const [hours, minutes] = publishConfig.eventTime.split(':');
    const startDateTime = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes)
    );

    // Round duration to nearest hour (e.g., 63 min → 60 min, 67 min → 60 min, 90 min → 120 min)
    const roundedDurationMinutes = Math.round(publishConfig.eventDurationMinutes / 60) * 60;

    const endDateTime = new Date(
      startDateTime.getTime() + roundedDurationMinutes * 60000
    );

    // Check if Google Calendar is configured
    const googleCalendarConfigured =
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY &&
      process.env.GOOGLE_CALENDAR_ID;

    let calendarEventId: string | null = null;

    // Only sync to Google Calendar if configured
    if (googleCalendarConfigured) {
      try {
        // Initialize Google Calendar API
        const auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
            private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
          },
          scopes: ['https://www.googleapis.com/auth/calendar'],
        });

        const calendar = google.calendar({ version: 'v3', auth });

        // Create or update calendar event
        // Title priority: workout_name > track name > session_type (deprecated title field)
        let trackName: string | undefined;
        if (workout.tracks) {
          if (Array.isArray(workout.tracks)) {
            trackName = workout.tracks[0]?.name;
          } else {
            trackName = (workout.tracks as { name: string }).name;
          }
        }
        const workoutTitle = workout.workout_name || trackName || workout.title;
        console.log('[API] Title logic - workout_name:', workout.workout_name, 'trackName:', trackName, 'title:', workout.title);
        console.log('[API] Final workoutTitle:', workoutTitle, 'Event summary will be:', `${workoutTitle} - ${workout.title}`);
        const event = {
          summary: `${workoutTitle} - ${workout.title}`,
          description: description,
          location: 'The Forge Functional Fitness, Bergwerkstrasse 10, Pforzen, Bavaria',
          start: {
            dateTime: startDateTime.toISOString(),
            timeZone: 'Europe/Berlin',
          },
          end: {
            dateTime: endDateTime.toISOString(),
            timeZone: 'Europe/Berlin',
          },
        };

        if (workout.google_event_id) {
          // Try to update existing event, create new if it doesn't exist
          try {
            const response = await calendar.events.update({
              calendarId: process.env.GOOGLE_CALENDAR_ID,
              eventId: workout.google_event_id,
              requestBody: event,
            });
            calendarEventId = response.data.id!;
          } catch (updateError: unknown) {
            // Event was deleted from calendar, create new one
            console.log('Event not found in calendar, creating new event');
            const response = await calendar.events.insert({
              calendarId: process.env.GOOGLE_CALENDAR_ID,
              requestBody: event,
            });
            calendarEventId = response.data.id!;
          }
        } else {
          // Create new event
          const response = await calendar.events.insert({
            calendarId: process.env.GOOGLE_CALENDAR_ID,
            requestBody: event,
          });
          calendarEventId = response.data.id!;
        }
      } catch (error) {
        console.error('Error syncing to Google Calendar:', error);
        // Continue with publishing even if Google Calendar sync fails
      }
    }

    // Update workout in database (use admin client to bypass RLS)
    const { error: updateError } = await supabaseAdmin
      .from('wods')
      .update({
        is_published: true,
        workout_publish_status: 'published',
        publish_time: publishConfig.eventTime,
        publish_duration: publishConfig.eventDurationMinutes,
        publish_sections: publishConfig.selectedSectionIds,
        google_event_id: calendarEventId,
      })
      .eq('id', workoutId);

    if (updateError) {
      console.error('Error updating workout:', updateError);
      return NextResponse.json(
        { error: 'Failed to update workout in database' },
        { status: 500 }
      );
    }

    // Auto-create weekly_session for booking if it doesn't exist (use admin client to bypass RLS)
    const { data: existingSession } = await supabaseAdmin
      .from('weekly_sessions')
      .select('id')
      .eq('workout_id', workoutId)
      .single();

    if (!existingSession) {
      const { error: sessionError } = await supabaseAdmin
        .from('weekly_sessions')
        .insert({
          date: workout.date,
          time: publishConfig.eventTime,
          capacity: 12, // Default capacity
          status: 'published',
          workout_id: workoutId,
        });

      if (sessionError) {
        console.error('Error creating weekly session:', sessionError);
        // Don't fail the whole publish if session creation fails
      }
    } else {
      // Update existing session to published
      await supabaseAdmin
        .from('weekly_sessions')
        .update({
          time: publishConfig.eventTime,
          status: 'published',
        })
        .eq('id', existingSession.id);
    }

    return NextResponse.json({
      success: true,
      message: googleCalendarConfigured
        ? 'Workout published successfully'
        : 'Workout published successfully (Google Calendar not configured)',
      calendarEventId,
      googleCalendarSynced: googleCalendarConfigured && !!calendarEventId,
    });
  } catch (error) {
    console.error('Error publishing workout:', error);
    return NextResponse.json(
      { error: 'Failed to publish workout', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// Unpublish endpoint
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workoutId = searchParams.get('workoutId');

    if (!workoutId) {
      return NextResponse.json({ error: 'Missing workoutId' }, { status: 400 });
    }

    // Fetch the workout (use admin client to bypass RLS)
    const { data: workout, error: fetchError } = await supabaseAdmin
      .from('wods')
      .select('google_event_id')
      .eq('id', workoutId)
      .single();

    if (fetchError || !workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    // Delete from Google Calendar if event exists
    if (
      workout.google_event_id &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY &&
      process.env.GOOGLE_CALENDAR_ID
    ) {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });

      const calendar = google.calendar({ version: 'v3', auth });

      try {
        await calendar.events.delete({
          calendarId: process.env.GOOGLE_CALENDAR_ID,
          eventId: workout.google_event_id,
        });
      } catch (error) {
        console.error('Error deleting calendar event:', error);
        // Continue even if calendar delete fails
      }
    }

    // Update workout in database (use admin client to bypass RLS)
    const { error: updateError } = await supabaseAdmin
      .from('wods')
      .update({
        is_published: false,
        workout_publish_status: 'draft',
        publish_time: null,
        publish_duration: null,
        publish_sections: null,
        google_event_id: null,
      })
      .eq('id', workoutId);

    if (updateError) {
      console.error('Error updating workout:', updateError);
      return NextResponse.json(
        { error: 'Failed to unpublish workout in database' },
        { status: 500 }
      );
    }

    // Cancel associated weekly_session (use admin client to bypass RLS)
    await supabaseAdmin
      .from('weekly_sessions')
      .update({ status: 'cancelled' })
      .eq('workout_id', workoutId);

    return NextResponse.json({
      success: true,
      message: 'Workout unpublished successfully',
    });
  } catch (error) {
    console.error('Error unpublishing workout:', error);
    return NextResponse.json(
      { error: 'Failed to unpublish workout', details: (error as Error).message },
      { status: 500 }
    );
  }
}
