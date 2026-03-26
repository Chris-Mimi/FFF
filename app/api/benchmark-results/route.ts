import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, isAuthError } from '@/lib/auth-api';
import { notifyPrAchieved } from '@/lib/notifications';

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

function parseTimeToSeconds(time: string): number {
  const parts = time.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(time);
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (isAuthError(user)) return user;

    const body = await request.json();
    // Use authenticated user's ID — ignore userId from body to prevent IDOR
    const userId = user.id;
    const {
      id,
      benchmarkId,
      forgeBenchmarkId,
      benchmarkName,
      benchmarkType,
      timeResult,
      repsResult,
      weightResult,
      scalingLevel,
      scalingLevel2,
      scalingLevel3,
      notes,
      resultDate
    } = body;

    // Validate required fields
    if (!benchmarkName || !benchmarkType) {
      return NextResponse.json(
        { error: 'benchmarkName and benchmarkType are required' },
        { status: 400 }
      );
    }

    // At least one result field must be provided (check for non-empty strings)
    const hasTimeResult = timeResult && timeResult.trim() !== '';
    const hasRepsResult = repsResult && repsResult.toString().trim() !== '';
    const hasWeightResult = weightResult && weightResult.toString().trim() !== '';

    if (!hasTimeResult && !hasRepsResult && !hasWeightResult) {
      return NextResponse.json(
        { error: 'At least one result field (time, reps, or weight) must be provided' },
        { status: 400 }
      );
    }

    // Validate that either benchmarkId OR forgeBenchmarkId is provided
    if ((!benchmarkId && !forgeBenchmarkId) || (benchmarkId && forgeBenchmarkId)) {
      return NextResponse.json(
        { error: 'Either benchmarkId or forgeBenchmarkId must be provided, not both' },
        { status: 400 }
      );
    }

    // Check if updating an existing record
    let existingResult: { id: string } | null = null;
    if (id) {
      // Explicit ID provided — look up by ID
      const { data, error: checkError } = await supabaseAdmin
        .from('benchmark_results')
        .select('id')
        .eq('id', id)
        .maybeSingle();
      if (checkError) {
        console.error('Error checking existing result:', checkError);
        return NextResponse.json({ error: 'Failed to check existing result' }, { status: 500 });
      }
      existingResult = data;
    } else {
      // No explicit ID — upsert by user + benchmark + date
      const query = supabaseAdmin
        .from('benchmark_results')
        .select('id')
        .eq('user_id', userId)
        .eq('result_date', resultDate || new Date().toISOString().split('T')[0]);

      if (forgeBenchmarkId) {
        query.eq('forge_benchmark_id', forgeBenchmarkId);
      } else {
        query.eq('benchmark_id', benchmarkId);
      }

      const { data, error: checkError } = await query.order('created_at', { ascending: false });
      if (checkError) {
        console.error('Error checking existing result:', checkError);
        return NextResponse.json({ error: 'Failed to check existing result' }, { status: 500 });
      }
      if (data && data.length > 0) {
        existingResult = data[0];
        // Clean up duplicates if any exist
        if (data.length > 1) {
          const duplicateIds = data.slice(1).map(r => r.id);
          await supabaseAdmin
            .from('benchmark_results')
            .delete()
            .in('id', duplicateIds);
        }
      }
    }

    // Parse numeric fields safely
    const parsedReps = repsResult && repsResult.toString().trim() !== ''
      ? parseInt(repsResult.toString())
      : null;
    const parsedWeight = weightResult && weightResult.toString().trim() !== ''
      ? parseFloat(weightResult.toString())
      : null;

    // Validate realistic ranges
    if (parsedReps !== null && (parsedReps < 0 || parsedReps > 10000)) {
      return NextResponse.json({ error: 'Reps must be between 0 and 10,000' }, { status: 400 });
    }
    if (parsedWeight !== null && (parsedWeight < 0 || parsedWeight > 500)) {
      return NextResponse.json({ error: 'Weight must be between 0 and 500 kg' }, { status: 400 });
    }
    if (hasTimeResult) {
      const timeParts = timeResult.trim().split(':');
      if (timeParts.length > 2 || timeParts.some((p: string) => isNaN(Number(p)))) {
        return NextResponse.json({ error: 'Invalid time format. Use MM:SS or seconds' }, { status: 400 });
      }
    }

    // Determine result_value for display (backwards compatibility)
    let resultValue = '';
    if (hasTimeResult) {
      resultValue = timeResult.trim();
    } else if (hasRepsResult) {
      resultValue = repsResult.toString().trim();
    } else if (hasWeightResult) {
      resultValue = weightResult.toString().trim();
    }

    if (existingResult) {
      // Update existing result
      const { error } = await supabaseAdmin
        .from('benchmark_results')
        .update({
          time_result: hasTimeResult ? timeResult.trim() : null,
          reps_result: parsedReps,
          weight_result: parsedWeight,
          result_value: resultValue, // Also populate result_value for backwards compatibility
          scaling_level: scalingLevel || null,
          scaling_level_2: scalingLevel2 || null,
          scaling_level_3: scalingLevel3 || null,
          notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingResult.id);

      if (error) {
        console.error('Error updating result:', error);
        return NextResponse.json(
          { error: 'Failed to update result' },
          { status: 500 }
        );
      }

      // PR detection on update too (user may be logging today's result)
      let isPR = false;
      const { data: previousResults } = await supabaseAdmin
        .from('benchmark_results')
        .select('time_result, reps_result, weight_result')
        .eq('user_id', userId)
        .eq('benchmark_name', benchmarkName)
        .neq('id', existingResult.id)
        .order('result_date', { ascending: false });

      if (previousResults && previousResults.length > 0) {
        if (hasTimeResult) {
          const newSeconds = parseTimeToSeconds(timeResult.trim());
          const prevTimes = previousResults.filter(r => r.time_result).map(r => parseTimeToSeconds(r.time_result));
          if (prevTimes.length > 0 && newSeconds < Math.min(...prevTimes)) isPR = true;
        } else if (hasRepsResult) {
          const prevReps = previousResults.filter(r => r.reps_result != null).map(r => r.reps_result);
          if (prevReps.length > 0 && parsedReps! > Math.max(...prevReps)) isPR = true;
        } else if (hasWeightResult) {
          const prevWeights = previousResults.filter(r => r.weight_result != null).map(r => r.weight_result);
          if (prevWeights.length > 0 && parsedWeight! > Math.max(...prevWeights)) isPR = true;
        }
      } else {
        isPR = true;
      }

      if (isPR) {
        notifyPrAchieved(userId, benchmarkName, resultValue);
      }

      return NextResponse.json(
        {
          success: true,
          isPR,
          message: isPR ? 'New PR!' : 'Result updated successfully'
        },
        { status: 200 }
      );
    } else {
      // Insert new result
      const { error } = await supabaseAdmin
        .from('benchmark_results')
        .insert({
          user_id: userId,
          benchmark_id: benchmarkId || null,
          forge_benchmark_id: forgeBenchmarkId || null,
          benchmark_name: benchmarkName,
          benchmark_type: benchmarkType,
          time_result: hasTimeResult ? timeResult.trim() : null,
          reps_result: parsedReps,
          weight_result: parsedWeight,
          result_value: resultValue, // Also populate result_value for backwards compatibility
          scaling_level: scalingLevel || null,
          scaling_level_2: scalingLevel2 || null,
          scaling_level_3: scalingLevel3 || null,
          notes: notes || null,
          result_date: resultDate || new Date().toISOString().split('T')[0]
        });

      if (error) {
        console.error('Error inserting result:', error);
        return NextResponse.json(
          { error: 'Failed to save result' },
          { status: 500 }
        );
      }

      // PR detection — compare against previous best for same benchmark
      let isPR = false;
      const { data: previousResults } = await supabaseAdmin
        .from('benchmark_results')
        .select('time_result, reps_result, weight_result')
        .eq('user_id', userId)
        .eq('benchmark_name', benchmarkName)
        .neq('result_date', resultDate || new Date().toISOString().split('T')[0])
        .order('result_date', { ascending: false });

      if (previousResults && previousResults.length > 0) {
        if (hasTimeResult) {
          // Time-based: lower is better
          const newSeconds = parseTimeToSeconds(timeResult.trim());
          const bestPrevSeconds = Math.min(
            ...previousResults
              .filter(r => r.time_result)
              .map(r => parseTimeToSeconds(r.time_result))
          );
          if (newSeconds < bestPrevSeconds) isPR = true;
        } else if (hasRepsResult) {
          // Reps-based: higher is better
          const bestPrevReps = Math.max(
            ...previousResults.filter(r => r.reps_result != null).map(r => r.reps_result)
          );
          if (parsedReps! > bestPrevReps) isPR = true;
        } else if (hasWeightResult) {
          // Weight-based: higher is better
          const bestPrevWeight = Math.max(
            ...previousResults.filter(r => r.weight_result != null).map(r => r.weight_result)
          );
          if (parsedWeight! > bestPrevWeight) isPR = true;
        }
      } else {
        // First ever result for this benchmark = PR
        isPR = true;
      }

      if (isPR) {
        notifyPrAchieved(userId, benchmarkName, resultValue);
      }

      return NextResponse.json(
        {
          success: true,
          isPR,
          message: isPR ? 'New PR!' : 'Result saved successfully'
        },
        { status: 200 }
      );
    }

  } catch (error) {
    console.error('Benchmark result save error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
