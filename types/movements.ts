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

  // RM Test: When set, logbook saves as rep_max_type instead of rep_scheme
  rm_test?: '1RM' | '3RM' | '5RM' | '10RM';

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
  description?: string;  // Full workout description with rep schemes
  exercises?: string[];  // Array of exercise names from library
  has_scaling?: boolean;  // Whether this benchmark offers scaling options
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
  description?: string;  // Full workout description with rep schemes
  exercises?: string[];  // Array of exercise names from library
  has_scaling?: boolean;  // Whether this benchmark offers scaling options
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
  equipment?: string;  // e.g., "Barbell", "Dumbbell"
}

export interface Benchmark {
  id: string;
  name: string;
  type: string;
  description?: string;
  display_order: number;
  has_scaling?: boolean;  // Whether this benchmark offers scaling options (Rx/Sc1/Sc2/Sc3)
}

export interface ForgeBenchmark {
  id: string;
  name: string;
  type: string;
  description?: string;
  display_order: number;
  has_scaling?: boolean;  // Whether this benchmark offers scaling options (Rx/Sc1/Sc2/Sc3)
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

  // Intent / stimulus notes (coach → optional athlete visibility)
  intent_notes?: string;
  show_intent_to_athletes?: boolean;

  // Configurable scoring fields (determines which inputs athletes see)
  scoring_fields?: {
    time?: boolean;           // Show time input (mm:ss) — lower is better
    max_time?: boolean;       // Show time input (mm:ss) — higher is better (e.g. max hold)
    reps?: boolean;           // Show reps input (total)
    rounds_reps?: boolean;    // Show rounds + reps inputs (AMRAP)
    load?: boolean;           // Show weight/load input (kg)
    load2?: boolean;          // Show second weight/load input (kg)
    load3?: boolean;          // Show third weight/load input (kg)
    calories?: boolean;       // Show calories input
    metres?: boolean;         // Show distance input (metres)
    checkbox?: boolean;       // Show task completion checkbox
    scaling?: boolean;        // Show scaling dropdown
    scaling_2?: boolean;      // Show second scaling dropdown
    scaling_3?: boolean;      // Show third scaling dropdown
    track?: boolean;          // Show track selector (1/2/3) in score entry
    time_amrap?: boolean;     // Time + AMRAP mode: show both time (optional) and reps/rounds simultaneously
  };
}
