import { supabase } from '@/lib/supabase';
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

interface PublishConfig {
  selectedSectionIds: string[];
  eventTime: string;
  eventDurationMinutes: number;
}

interface WorkoutSection {
  id: string;
  type: string;
  duration: number;
  content: string;
  workout_type_id?: string;
}

interface Workout {
  id: string;
  title: string;
  date: string;
  sections: WorkoutSection[];
  calendar_event_id?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { workoutId, publishConfig } = (await request.json()) as {
      workoutId: string;
      publishConfig: PublishConfig;
    };

    if (!workoutId || !publishConfig) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the workout from database
    const { data: workout, error: fetchError } = await supabase
      .from('wods')
      .select('id, title, date, sections, calendar_event_id')
      .eq('id', workoutId)
      .single();

    if (fetchError || !workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    // Get selected sections
    const selectedSections = (workout.sections as WorkoutSection[]).filter(section =>
      publishConfig.selectedSectionIds.includes(section.id)
    );

    if (selectedSections.length === 0) {
      return NextResponse.json({ error: 'No sections selected' }, { status: 400 });
    }

    // Format event description
    const description = selectedSections
      .map(section => {
        return `${section.type} (${section.duration} min)\n\n${section.content}\n\n---\n`;
      })
      .join('\n');

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
    const endDateTime = new Date(
      startDateTime.getTime() + publishConfig.eventDurationMinutes * 60000
    );

    // Check for required environment variables
    if (
      !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
      !process.env.GOOGLE_PRIVATE_KEY ||
      !process.env.GOOGLE_CALENDAR_ID
    ) {
      return NextResponse.json(
        {
          error:
            'Google Calendar is not configured. Please add GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_CALENDAR_ID to environment variables.',
        },
        { status: 500 }
      );
    }

    // Initialize Google Calendar API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    const calendar = google.calendar({ version: 'v3', auth });

    // Create or update calendar event
    const event = {
      summary: `${workout.title} - ${new Date(workout.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`,
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

    let calendarEventId: string;

    if (workout.calendar_event_id) {
      // Update existing event
      const response = await calendar.events.update({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        eventId: workout.calendar_event_id,
        requestBody: event,
      });
      calendarEventId = response.data.id!;
    } else {
      // Create new event
      const response = await calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        requestBody: event,
      });
      calendarEventId = response.data.id!;
    }

    // Update workout in database
    const { error: updateError } = await supabase
      .from('wods')
      .update({
        published: true,
        published_at: new Date().toISOString(),
        published_section_ids: publishConfig.selectedSectionIds,
        calendar_event_id: calendarEventId,
        event_time: publishConfig.eventTime,
        event_duration_minutes: publishConfig.eventDurationMinutes,
      })
      .eq('id', workoutId);

    if (updateError) {
      console.error('Error updating workout:', updateError);
      return NextResponse.json(
        { error: 'Failed to update workout in database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Workout published successfully',
      calendarEventId,
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

    // Fetch the workout
    const { data: workout, error: fetchError } = await supabase
      .from('wods')
      .select('calendar_event_id')
      .eq('id', workoutId)
      .single();

    if (fetchError || !workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    // Delete from Google Calendar if event exists
    if (
      workout.calendar_event_id &&
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
          eventId: workout.calendar_event_id,
        });
      } catch (error) {
        console.error('Error deleting calendar event:', error);
        // Continue even if calendar delete fails
      }
    }

    // Update workout in database
    const { error: updateError } = await supabase
      .from('wods')
      .update({
        published: false,
        published_at: null,
        published_section_ids: [],
        calendar_event_id: null,
      })
      .eq('id', workoutId);

    if (updateError) {
      console.error('Error updating workout:', updateError);
      return NextResponse.json(
        { error: 'Failed to unpublish workout in database' },
        { status: 500 }
      );
    }

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
