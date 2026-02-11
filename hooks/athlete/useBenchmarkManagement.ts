'use client';

import { authFetch } from '@/lib/auth-fetch';
import { Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';

interface BenchmarkResult {
  benchmark_name: string;
  benchmark_type: string;
  time_result?: string;
  reps_result?: string;
  weight_result?: string;
  scaling_level?: 'Rx' | 'Sc1' | 'Sc2' | 'Sc3';
  benchmark_id?: string;
  forge_benchmark_id?: string;
}

export interface BenchmarkManagementHandlers {
  saveBenchmarkResult: (
    benchmarkName: string,
    benchmarkType: string,
    timeResult: string,
    repsResult: string,
    weightResult: string,
    resultDate: string,
    scalingLevel?: 'Rx' | 'Sc1' | 'Sc2' | 'Sc3',
    benchmarkId?: string,
    forgeBenchmarkId?: string
  ) => Promise<void>;
  saveAllBenchmarkResults: (dateStr: string) => Promise<void>;
}

export function useBenchmarkManagement(
  userId: string,
  benchmarkResults: Record<string, BenchmarkResult>,
  setBenchmarkResults: Dispatch<SetStateAction<Record<string, BenchmarkResult>>>
): BenchmarkManagementHandlers {
  // Save benchmark result to database via API
  const saveBenchmarkResult = async (
    benchmarkName: string,
    benchmarkType: string,
    timeResult: string,
    repsResult: string,
    weightResult: string,
    resultDate: string,
    scalingLevel?: 'Rx' | 'Sc1' | 'Sc2' | 'Sc3',
    benchmarkId?: string,
    forgeBenchmarkId?: string
  ) => {
    // Don't save if all result fields are empty
    if (!timeResult && !repsResult && !weightResult) {
      return;
    }

    try {
      const response = await authFetch('/api/benchmark-results', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          benchmarkId,
          forgeBenchmarkId,
          benchmarkName,
          benchmarkType,
          timeResult,
          repsResult,
          weightResult,
          scalingLevel,
          notes: null, // Add notes field
          resultDate
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save benchmark result');
      }

    } catch (error) {
      console.error('Error saving benchmark result:', error);
      toast.error(`Failed to save benchmark result: ${error instanceof Error ? error.message : String(error)}`);
      throw error; // Re-throw so unified save can count it as error
    }
  };

  // Save all benchmark results for a workout
  const saveAllBenchmarkResults = async (dateStr: string) => {
    const resultsToSave = Object.entries(benchmarkResults).filter(
      ([_, result]) => result.time_result || result.reps_result || result.weight_result
    );

    if (resultsToSave.length === 0) {
      toast.warning('No benchmark results entered to save');
      return;
    }

    let errorCount = 0;
    const errors: Array<{ benchmark_name: string; error: string }> = [];
    for (const [key, result] of resultsToSave) {
      try {
        await saveBenchmarkResult(
          result.benchmark_name,
          result.benchmark_type,
          result.time_result || '',
          result.reps_result || '',
          result.weight_result || '',
          dateStr,
          result.scaling_level,
          result.benchmark_id,
          result.forge_benchmark_id
        );
      } catch (error) {
        console.error(`✗ Failed to save ${result.benchmark_name}:`, error);
        errors.push({ benchmark_name: result.benchmark_name, error: error instanceof Error ? error.message : 'Unknown error' });
        errorCount++;
      }
    }

    if (errorCount === 0) {
      toast.success('Benchmark results saved successfully!');
      setBenchmarkResults({});
    } else {
      console.error('Errors during save:', errors);
      toast.warning(`Saved ${resultsToSave.length - errorCount} of ${resultsToSave.length} benchmark results. ${errorCount} failed. Check console for details.`);
    }
  };

  return {
    saveBenchmarkResult,
    saveAllBenchmarkResults,
  };
}
