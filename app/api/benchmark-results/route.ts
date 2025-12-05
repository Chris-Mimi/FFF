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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      benchmarkId,
      forgeBenchmarkId,
      benchmarkName,
      benchmarkType,
      timeResult,
      repsResult,
      weightResult,
      scalingLevel,
      notes,
      resultDate
    } = body;

    // Validate required fields
    if (!userId || !benchmarkName || !benchmarkType) {
      return NextResponse.json(
        { error: 'userId, benchmarkName, and benchmarkType are required' },
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

    // Check if a result already exists for this user + benchmark + date
    const { data: existingResult, error: checkError } = await supabaseAdmin
      .from('benchmark_results')
      .select('id')
      .eq('user_id', userId)
      .eq('benchmark_name', benchmarkName)
      .eq('result_date', resultDate || new Date().toISOString().split('T')[0])
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing result:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing result' },
        { status: 500 }
      );
    }

    // Parse numeric fields safely
    const parsedReps = repsResult && repsResult.toString().trim() !== ''
      ? parseInt(repsResult.toString())
      : null;
    const parsedWeight = weightResult && weightResult.toString().trim() !== ''
      ? parseFloat(weightResult.toString())
      : null;

    if (existingResult) {
      // Update existing result
      const { error } = await supabaseAdmin
        .from('benchmark_results')
        .update({
          time_result: hasTimeResult ? timeResult.trim() : null,
          reps_result: parsedReps,
          weight_result: parsedWeight,
          scaling_level: scalingLevel || null,
          notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingResult.id);

      if (error) {
        console.error('Error updating result:', error);
        return NextResponse.json(
          { error: `Failed to update result: ${error.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Result updated successfully'
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
          scaling_level: scalingLevel || null,
          notes: notes || null,
          result_date: resultDate || new Date().toISOString().split('T')[0]
        });

      if (error) {
        console.error('Error inserting result:', error);
        return NextResponse.json(
          { error: `Failed to insert result: ${error.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Result saved successfully'
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
