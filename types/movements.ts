/**
 * Movement Library Types
 * Defines structured data for Lifts, Benchmarks, and Forge Benchmarks
 */

// ============================================
// Lift Configuration Types
// ============================================

export interface VariableSet {
  set_number: number;
  reps: number;
  percentage_1rm?: number;
}

export interface ConfiguredLift {
  id: string;  // References barbell_lifts.id
  name: string;  // e.g., "Back Squat"
  rep_type: 'constant' | 'variable';

  // Constant reps: e.g., 5x5 @ 75%
  sets?: number;
  reps?: number;
  percentage_1rm?: number;

  // Variable reps: Per-set configuration with individual reps and percentages
  variable_sets?: VariableSet[];

  scaling_option?: string;
  visibility: 'everyone' | 'coaches' | 'programmers';
  coach_notes?: string;
  athlete_notes?: string;
}

// ============================================
// Benchmark Configuration Types
// ============================================

export interface ConfiguredBenchmark {
  id: string;  // References benchmark_workouts.id
  name: string;  // e.g., "Fran"
  type: string;  // e.g., "For Time", "AMRAP"
  scaling_option?: string;
  visibility: 'everyone' | 'coaches' | 'programmers';
  coach_notes?: string;
  athlete_notes?: string;
}

// ============================================
// Forge Benchmark Configuration Types
// ============================================

export interface ConfiguredForgeBenchmark {
  id: string;  // References forge_benchmarks.id
  name: string;
  type: string;
  scaling_option?: string;
  visibility: 'everyone' | 'coaches' | 'programmers';
  coach_notes?: string;
  athlete_notes?: string;
}

// ============================================
// Database Source Types (from tables)
// ============================================

export interface BarbellLift {
  id: string;
  name: string;
  category: string;  // e.g., "Squats", "Presses"
  display_order: number;
}

export interface Benchmark {
  id: string;
  name: string;
  type: string;
  description?: string;
  display_order: number;
}

export interface ForgeBenchmark {
  id: string;
  name: string;
  type: string;
  description?: string;
  display_order: number;
}

// ============================================
// Updated WOD Section Type
// ============================================

export interface WODSection {
  id: string;
  type: string;
  duration: number;
  content: string;  // Free-form text (exercises continue as plain text)
  workout_type_id?: string;

  // NEW: Structured movement arrays
  lifts?: ConfiguredLift[];
  benchmarks?: ConfiguredBenchmark[];
  forge_benchmarks?: ConfiguredForgeBenchmark[];
}
