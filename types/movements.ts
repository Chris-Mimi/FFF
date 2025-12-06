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
  description?: string;  // Full workout description from database
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
  description?: string;  // Full workout description from database
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
}

// ============================================
// UNIFIED MOVEMENT SYSTEM (New Schema)
// ============================================

/**
 * Result Fields Schema
 * Defines which input fields to show athletes when logging results
 */
export interface ResultFields {
  time?: boolean;              // Show time input (mm:ss)
  reps?: boolean;              // Show reps input
  weight?: boolean;            // Show weight input (kg)
  distance_meters?: boolean;   // Show distance input (meters)
  duration_seconds?: boolean;  // Show duration input (for holds)
  scaling?: boolean;           // Show scaling dropdown (Rx/Sc1/Sc2/Sc3)
  rounds_reps?: boolean;       // Show rounds+reps inputs (for AMRAP)
}

/**
 * Movement (Database Table)
 * Unified table consolidating barbell_lifts, benchmark_workouts, forge_benchmarks
 */
export interface Movement {
  id: string;
  name: string;                // "Max Strict Push-Ups", "Fran", "Back Squat"
  category: 'lift' | 'benchmark' | 'forge_benchmark' | 'max_effort' | 'hold' | 'cardio';
  movement_type: 'for_time' | 'amrap' | 'max_weight' | 'max_reps' | 'max_hold' | 'max_distance';
  result_fields: ResultFields; // Dynamic input schema
  description?: string;        // Full workout description
  has_scaling: boolean;        // Rx/Sc1/Sc2/Sc3 support
  is_barbell_lift: boolean;    // Special handling for lifts (rep schemes)
  display_order?: number;      // Sort order in library
  source_exercise_id?: string; // Link to exercises table (optional)
  created_at?: string;
  updated_at?: string;
}

/**
 * Movement Result (Database Table)
 * Unified results table consolidating lift_records, benchmark_results, wod_section_results
 */
export interface MovementResult {
  id: string;
  movement_id: string;
  user_id: string;

  // Multi-field results (null if not applicable)
  time_result?: string;        // "5:23" (mm:ss)
  reps_result?: number;        // Total reps or max reps
  weight_result?: number;      // Kilograms
  distance_result?: number;    // Meters
  duration_seconds?: number;   // Hold time in seconds
  rounds_result?: number;      // Complete rounds (AMRAP)
  scaling_level?: 'Rx' | 'Sc1' | 'Sc2' | 'Sc3';

  // Lift-specific fields
  rep_scheme?: string;         // '5x5' | '1RM' | '3RM' | '5RM' | '10RM' | '21-15-9'
  calculated_1rm?: number;     // Estimated 1RM (Epley formula)

  notes?: string;
  result_date: string;         // YYYY-MM-DD
  created_at?: string;
  updated_at?: string;
}

/**
 * Configured Movement (Used in WOD Sections)
 * Extends Movement with coach configuration fields
 */
export interface ConfiguredMovement extends Movement {
  // Coach configuration
  visibility: 'everyone' | 'coaches' | 'programmers';
  coach_notes?: string;
  athlete_notes?: string;

  // Lift-specific configuration (if is_barbell_lift=true)
  rep_type?: 'constant' | 'variable';
  sets?: number;
  reps?: number;
  percentage_1rm?: number;
  variable_sets?: VariableSet[];

  // Benchmark-specific (if category=benchmark or forge_benchmark)
  scaling_option?: string;     // Current scaling selection
}
