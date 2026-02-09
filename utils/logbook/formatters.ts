import type { ConfiguredLift, ConfiguredBenchmark, ConfiguredForgeBenchmark } from '@/types/movements';

/**
 * Format helper functions for structured movements in Athlete Logbook
 */

export function formatLift(lift: ConfiguredLift): string {
  if (lift.rm_test) {
    return `${lift.name} ${lift.rm_test}`;
  }
  if (lift.rep_type === 'constant') {
    const base = `${lift.name} ${lift.sets}x${lift.reps}`;
    return lift.percentage_1rm ? `${base} @ ${lift.percentage_1rm}%` : base;
  } else {
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
}

export function formatBenchmark(benchmark: ConfiguredBenchmark): { name: string; description?: string; exercises?: string[] } {
  const scaling = benchmark.scaling_option ? ` (${benchmark.scaling_option})` : '';
  return {
    name: `${benchmark.name}${scaling}`,
    description: benchmark.description,
    exercises: benchmark.exercises
  };
}

export function formatForgeBenchmark(forge: ConfiguredForgeBenchmark): { name: string; description?: string; exercises?: string[] } {
  const scaling = forge.scaling_option ? ` (${forge.scaling_option})` : '';
  return {
    name: `${forge.name}${scaling}`,
    description: forge.description,
    exercises: forge.exercises
  };
}
