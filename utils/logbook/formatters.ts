import type { ConfiguredLift, ConfiguredBenchmark, ConfiguredForgeBenchmark, VariableSet } from '@/types/movements';

/**
 * Format helper functions for structured movements in Athlete Logbook
 */

/**
 * A single percentage: "100%", or "100%+" when the coach marked it open-ended.
 * Shared by every surface that renders a lift so the notation can't drift.
 */
export function formatPercent(pct: number, plus?: boolean): string {
  return `${pct}%${plus ? '+' : ''}`;
}

/**
 * Variable sets: "40-50-60%" as before. When ANY set is marked "+", each value
 * carries its own sign — "75%-85%-95%+" — so the plus can't be misread as
 * applying to the whole wave when it only belongs to one set.
 */
export function formatPercentList(sets: Pick<VariableSet, 'percentage_1rm' | 'percentage_plus'>[]): string {
  if (sets.some(s => s.percentage_plus)) {
    return sets.map(s => formatPercent(s.percentage_1rm as number, s.percentage_plus)).join('-');
  }
  return `${sets.map(s => s.percentage_1rm).join('-')}%`;
}

export function formatLift(lift: ConfiguredLift): string {
  if (lift.rm_test) {
    return `${lift.name} ${lift.rm_test}`;
  }
  if (lift.rep_type === 'constant') {
    const base = `${lift.name} ${lift.sets}x${lift.reps}`;
    return lift.percentage_1rm ? `${base} @ ${formatPercent(lift.percentage_1rm, lift.percentage_plus)}` : base;
  } else {
    const reps = lift.variable_sets?.map(s => s.reps).join('-') || '';
    const sets = lift.variable_sets || [];

    let base = `${lift.name} ${reps}`;

    // Only show percentages if ALL sets have them defined (no undefined/null values)
    const allHavePercentages = sets.length > 0 && sets.every(s => s.percentage_1rm !== undefined && s.percentage_1rm !== null);
    if (allHavePercentages) {
      // Show ALL percentages for each set: "40-40-50-50-50-50-50%"
      base += ` @ ${formatPercentList(sets)}`;
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
