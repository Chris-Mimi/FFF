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

/**
 * Calculate estimated 1RM using Epley formula
 * Formula: weight × (1 + reps / 30)
 */
function calculateOneRepMax(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps > 10) return weight; // Formula less accurate beyond 10 reps
  return Math.round(weight * (1 + reps / 30) * 10) / 10; // Round to 1 decimal
}

export async function POST(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const body = await request.json();
    const {
      userId,
      movementId,
      movementName,
      movementCategory,
      timeResult,
      repsResult,
      weightResult,
      distanceResult,
      durationSeconds,
      roundsResult,
      scalingLevel,
      repScheme,
      notes,
      resultDate
    } = body;

    // Validate required fields
    if (!userId || !movementId || !movementName) {
      return NextResponse.json(
        { error: 'userId, movementId, and movementName are required' },
        { status: 400 }
      );
    }

    // Check if at least one result field is provided (non-empty)
    const hasTimeResult = timeResult && timeResult.trim() !== '';
    const hasRepsResult = repsResult && repsResult.toString().trim() !== '';
    const hasWeightResult = weightResult && weightResult.toString().trim() !== '';
    const hasDistanceResult = distanceResult && distanceResult.toString().trim() !== '';
    const hasDurationResult = durationSeconds && durationSeconds.toString().trim() !== '';
    const hasRoundsResult = roundsResult && roundsResult.toString().trim() !== '';

    if (!hasTimeResult && !hasRepsResult && !hasWeightResult &&
        !hasDistanceResult && !hasDurationResult && !hasRoundsResult) {
      return NextResponse.json(
        { error: 'At least one result field must be provided' },
        { status: 400 }
      );
    }

    // Parse numeric fields safely
    const parsedReps = hasRepsResult
      ? parseInt(repsResult.toString())
      : null;
    const parsedWeight = hasWeightResult
      ? parseFloat(weightResult.toString())
      : null;
    const parsedDistance = hasDistanceResult
      ? parseFloat(distanceResult.toString())
      : null;
    const parsedDuration = hasDurationResult
      ? parseInt(durationSeconds.toString())
      : null;
    const parsedRounds = hasRoundsResult
      ? parseInt(roundsResult.toString())
      : null;

    // Calculate 1RM for lifts
    const calculated1RM = parsedWeight && parsedReps && parsedReps <= 10
      ? calculateOneRepMax(parsedWeight, parsedReps)
      : null;

    const dateToUse = resultDate || new Date().toISOString().split('T')[0];
    const repSchemeValue = repScheme || null;

    // Check if a result already exists for this user + movement + date + rep_scheme
    // CRITICAL: rep_scheme must be in comparison for lift uniqueness (same lift, different schemes)
    const { data: existingResult, error: checkError } = await supabaseAdmin
      .from('movement_results')
      .select('id')
      .eq('user_id', userId)
      .eq('movement_id', movementId)
      .eq('result_date', dateToUse)
      .eq('rep_scheme', repSchemeValue) // NULL-safe comparison
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing result:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing result' },
        { status: 500 }
      );
    }

    if (existingResult) {
      // Update existing result
      const { error } = await supabaseAdmin
        .from('movement_results')
        .update({
          time_result: hasTimeResult ? timeResult.trim() : null,
          reps_result: parsedReps,
          weight_result: parsedWeight,
          distance_result: parsedDistance,
          duration_seconds: parsedDuration,
          rounds_result: parsedRounds,
          scaling_level: scalingLevel || null,
          rep_scheme: repSchemeValue,
          calculated_1rm: calculated1RM,
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
        .from('movement_results')
        .insert({
          user_id: userId,
          movement_id: movementId,
          time_result: hasTimeResult ? timeResult.trim() : null,
          reps_result: parsedReps,
          weight_result: parsedWeight,
          distance_result: parsedDistance,
          duration_seconds: parsedDuration,
          rounds_result: parsedRounds,
          scaling_level: scalingLevel || null,
          rep_scheme: repSchemeValue,
          calculated_1rm: calculated1RM,
          notes: notes || null,
          result_date: dateToUse
        });

      if (error) {
        console.error('Error inserting result:', error);
        return NextResponse.json(
          { error: 'Failed to save result' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Result saved successfully'
        },
        { status: 201 }
      );
    }

  } catch (error) {
    console.error('Movement result save error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
