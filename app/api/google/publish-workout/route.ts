import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';
import { notifyWodPublished } from '@/lib/notifications';

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
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const body = await request.json();

    const { workoutId, publishConfig } = body as {
      workoutId: string;
      publishConfig: PublishConfig;
    };

    if (!workoutId || !publishConfig) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the workout from database (use admin client to bypass RLS)
    const { data: workout, error: fetchError } = await supabaseAdmin
      .from('wods')
      .select('id, title, session_type, date, sections, google_event_id, workout_name, track_id, tracks(name)')
      .eq('id', workoutId)
      .single();

    if (fetchError || !workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    // All sections go to Google Calendar; selectedSectionIds controls athlete app visibility
    const allSections = workout.sections as WorkoutSection[];

    // Look up workout type names for sections that have a workout_type_id
    const workoutTypeIds = allSections
      .map(s => s.workout_type_id)
      .filter((id): id is string => !!id);

    let workoutTypeMap: Record<string, string> = {};
    if (workoutTypeIds.length > 0) {
      const { data: types } = await supabaseAdmin
        .from('workout_types')
        .select('id, name')
        .in('id', workoutTypeIds);
      if (types) {
        workoutTypeMap = Object.fromEntries(types.map(t => [t.id, t.name]));
      }
    }

    if (allSections.length === 0) {
      return NextResponse.json({ error: 'No sections found' }, { status: 400 });
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
      const typeName = section.workout_type_id ? workoutTypeMap[section.workout_type_id] : undefined;
      const typeLabel = typeName ? ` - ${typeName}` : '';
      const header = `<b>${section.type}${typeLabel}</b>${timeInfo}`;

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
    const formattedSections = allSections.map(section => {
      const duration = section.duration || 0;
      const startMin = cumulativeTime + 1;
      const endMin = cumulativeTime + duration;
      cumulativeTime = endMin;
      return formatSectionToHTML(section, startMin, endMin);
    });

    const description = formattedSections.join('<br><br>');

    // Build start/end as timezone-explicit strings (avoids UTC conversion issues on Vercel)
    const [hours, minutes] = publishConfig.eventTime.split(':');
    const startDateTimeStr = `${workout.date}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;

    // Round duration to nearest hour (e.g., 63 min → 60 min, 67 min → 60 min, 90 min → 120 min)
    const roundedDurationMinutes = Math.round(publishConfig.eventDurationMinutes / 60) * 60;

    // Calculate end time by parsing components and adding duration
    const startH = parseInt(hours);
    const startM = parseInt(minutes);
    const totalEndMinutes = startH * 60 + startM + roundedDurationMinutes;
    const endH = Math.floor(totalEndMinutes / 60) % 24;
    const endM = totalEndMinutes % 60;
    const endDateTimeStr = `${workout.date}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;

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

        // Clean up any existing Google Calendar events at the same date+time.
        // This catches ghost events (where the DB reference was lost but the
        // calendar event still exists) and DB-tracked orphans alike.
        // Only runs when publishing a WOD that doesn't already own an event.
        if (!workout.google_event_id) {
          // Collect known event IDs for WODs linked to active sessions on
          // this date (these are legitimate and must NOT be deleted).
          const { data: activeSameDateWods } = await supabaseAdmin
            .from('wods')
            .select('google_event_id, weekly_sessions(id)')
            .eq('date', workout.date)
            .neq('id', workoutId)
            .not('google_event_id', 'is', null);

          const keepEventIds = new Set(
            (activeSameDateWods || [])
              .filter(w => Array.isArray(w.weekly_sessions) && w.weekly_sessions.length > 0)
              .map(w => w.google_event_id)
          );

          // Clean up DB-tracked orphans (WODs with event ID but no session)
          const dbOrphans = (activeSameDateWods || []).filter(
            w => !w.weekly_sessions || (Array.isArray(w.weekly_sessions) && w.weekly_sessions.length === 0)
          );
          if (dbOrphans.length > 0) {
            for (const orphan of dbOrphans) {
              try {
                await calendar.events.delete({
                  calendarId: process.env.GOOGLE_CALENDAR_ID,
                  eventId: orphan.google_event_id,
                });
              } catch {
                // Already gone — continue
              }
            }
            const orphanWodIds = (activeSameDateWods || [])
              .filter(w => !w.weekly_sessions || (Array.isArray(w.weekly_sessions) && w.weekly_sessions.length === 0))
              .map(w => w.google_event_id);
            if (orphanWodIds.length > 0) {
              await supabaseAdmin
                .from('wods')
                .update({ google_event_id: null })
                .eq('date', workout.date)
                .neq('id', workoutId)
                .in('google_event_id', orphanWodIds);
            }
          }

          // Query Google Calendar directly for events at this exact time slot.
          // This catches ghost events where the DB lost the reference.
          try {
            // Query the full day for ghost events (filtered by keepEventIds below)
            const existingEvents = await calendar.events.list({
              calendarId: process.env.GOOGLE_CALENDAR_ID,
              timeMin: `${workout.date}T00:00:00Z`,
              timeMax: `${workout.date}T23:59:59Z`,
              singleEvents: true,
            });

            for (const existing of existingEvents.data.items || []) {
              if (existing.id && !keepEventIds.has(existing.id)) {
                try {
                  await calendar.events.delete({
                    calendarId: process.env.GOOGLE_CALENDAR_ID,
                    eventId: existing.id,
                  });
                } catch {
                  // Already gone — continue
                }
              }
            }
          } catch {
            // Calendar list query failed — continue with publish
          }
        }

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
        const event = {
          summary: `${workoutTitle} - ${workout.title}`,
          description: description,
          location: 'The Forge Functional Fitness, Bergwerkstrasse 10, Pforzen, Bavaria',
          start: {
            dateTime: startDateTimeStr,
            timeZone: 'Europe/Berlin',
          },
          end: {
            dateTime: endDateTimeStr,
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

    // Fire-and-forget push notification to subscribed members
    notifyWodPublished(
      workout.workout_name || workout.session_type || '',
      workout.date
    );

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
      { error: 'Failed to publish workout' },
      { status: 500 }
    );
  }
}

// Unpublish endpoint
export async function DELETE(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

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
      { error: 'Failed to unpublish workout' },
      { status: 500 }
    );
  }
}
