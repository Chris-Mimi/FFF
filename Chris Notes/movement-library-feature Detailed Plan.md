Movement Library Feature - Complete Implementation Plan

  Branch: movement-library-feature
  Scope: Lifts, Benchmarks, Forge Benchmarks with structured data storage
  Timeline: ~21-28 hours of development

  ---
  Phase 1: Database Schema & Types (Foundation)

  1.1 TypeScript Interfaces

  New file: /types/movements.ts

  // Lift Configuration
  export interface ConfiguredLift {
    id: string;  // barbell_lifts.id
    name: string;  // "Back Squat"
    rep_type: 'constant' | 'variable';

    // Constant reps: 5x5 @ 75%
    sets?: number;
    reps?: number;
    percentage_1rm?: number;

    // Variable reps: Table with per-set config
    variable_sets?: {
      set_number: number;
      reps: number;
      percentage_1rm?: number;
    }[];

    scaling_option?: string;
    visibility: 'everyone' | 'coaches' | 'programmers';
    coach_notes?: string;
    athlete_notes?: string;
  }

  // Benchmark Configuration
  export interface ConfiguredBenchmark {
    id: string;  // benchmark_workouts.id
    name: string;  // "Fran"
    type: string;  // "For Time", "AMRAP", etc.
    scaling_option?: string;
    visibility: 'everyone' | 'coaches' | 'programmers';
    coach_notes?: string;
    athlete_notes?: string;
  }

  // Forge Benchmark Configuration
  export interface ConfiguredForgeBenchmark {
    id: string;  // forge_benchmarks.id
    name: string;
    type: string;
    scaling_option?: string;
    visibility: 'everyone' | 'coaches' | 'programmers';
    coach_notes?: string;
    athlete_notes?: string;
  }

  // Updated WODSection interface
  export interface WODSection {
    id: string;
    type: string;
    duration: number;
    content: string;  // Free-form text (exercises stay here)

    // NEW: Structured movement arrays
    lifts?: ConfiguredLift[];
    benchmarks?: ConfiguredBenchmark[];
    forge_benchmarks?: ConfiguredForgeBenchmark[];
  }

  1.2 Database Changes

  No SQL migration needed! JSONB already supports adding new fields. Existing workouts continue working,
  new fields only appear when used.

  ---
  Phase 2: Movement Library UI (Selection Layer)

  2.1 Rename & Refactor ExerciseLibraryPopup

  File: /components/coach/MovementLibraryPopup.tsx (rename from ExerciseLibraryPopup)

  New Structure:
  interface MovementLibraryPopupProps {
    isOpen: boolean;
    onClose: () => void;
    activeSection: WODSection | null;
    onSelectExercise: (exercise: string) => void;  // Existing
    onSelectLift: (lift: BarbellLift) => void;     // NEW
    onSelectBenchmark: (benchmark: Benchmark) => void;  // NEW
    onSelectForgeBenchmark: (forge: ForgeBenchmark) => void;  // NEW
  }

  // Tab state
  const [activeTab, setActiveTab] = useState<'exercises' | 'lifts' | 'benchmarks' | 'forge'>('exercises');

  UI Layout:
  ┌─────────────────────────────────────────┐
  │ Movement Library                      × │
  ├─────────────────────────────────────────┤
  │ [Exercises] [Lifts] [Benchmarks] [Forge]│
  ├─────────────────────────────────────────┤
  │                                         │
  │  [Search box]                           │
  │                                         │
  │  ┌─────────────────────┐                │
  │  │ Category: Squats    │                │
  │  ├─────────────────────┤                │
  │  │ Back Squat        → │                │
  │  │ Front Squat       → │                │
  │  │ Box Squat         → │                │
  │  └─────────────────────┘                │
  │                                         │
  └─────────────────────────────────────────┘

  Behavior:
  - Click "Exercises" → Show exercises grid (current behavior, insert as text)
  - Click "Lifts" → Show lifts by category, click opens ConfigureLiftModal
  - Click "Benchmarks" → Show benchmarks, click opens ConfigureBenchmarkModal
  - Click "Forge" → Show forge benchmarks, click opens ConfigureForgeBenchmarkModal

  ---
  Phase 3: Configuration Modals

  3.1 ConfigureLiftModal Component

  File: /components/coach/ConfigureLiftModal.tsx

  UI Structure (matches your images):

  ┌─────────────────────────────────────────┐
  │ ←  Configure Sets/Reps              × │
  ├─────────────────────────────────────────┤
  │                                         │
  │  Add to [WOD Section ▼]   [Add Button] │
  │                                         │
  │  ≡ Back Squat 5x5                      │
  │                                         │
  │  [Constant Reps] [Variable Reps]        │
  │                                         │
  │  CONSTANT TAB:                          │
  │    SETS         ×        REPS           │
  │  ┌─────┐              ┌─────┐           │
  │  │  5  │              │  5  │           │
  │  └─────┘              └─────┘           │
  │  [─]  [+]            [─]  [+]          │
  │                                         │
  │  Percentage of 1RM: [75] %             │
  │                                         │
  │  VARIABLE TAB:                          │
  │  ┌────┬──────┬────────────┐             │
  │  │Set │ Reps │ Percentage │             │
  │  ├────┼──────┼────────────┤             │
  │  │ #1 │  5   │    70      │             │
  │  │ #2 │  3   │    85      │             │
  │  │ #3 │  1   │    95      │             │
  │  └────┴──────┴────────────┘             │
  │  [+ Add Set] [- Remove Set]             │
  │                                         │
  │  Scaling Options:                       │
  │  [None ▼]                               │
  │                                         │
  │  Visible to: ⦿ Everyone                 │
  │              ○ Coaches                  │
  │              ○ Programmers Only         │
  │                                         │
  │  ▸ Coach notes...                       │
  │  ▸ Athlete notes...                     │
  │                                         │
  └─────────────────────────────────────────┘

  Props:
  interface ConfigureLiftModalProps {
    isOpen: boolean;
    lift: BarbellLift;
    activeSection: WODSection | null;
    availableSections: WODSection[];
    onClose: () => void;
    onAddToSection: (sectionId: string, configuredLift: ConfiguredLift) => void;
  }

  State:
  const [selectedSectionId, setSelectedSectionId] = useState<string>(activeSection?.id || '');
  const [repType, setRepType] = useState<'constant' | 'variable'>('constant');

  // Constant reps state
  const [sets, setSets] = useState(5);
  const [reps, setReps] = useState(5);
  const [percentage, setPercentage] = useState<number | undefined>(undefined);

  // Variable reps state
  const [variableSets, setVariableSets] = useState<{
    set_number: number;
    reps: number;
    percentage_1rm?: number;
  }[]>([
    { set_number: 1, reps: 5, percentage_1rm: 70 }
  ]);

  const [scalingOption, setScalingOption] = useState('None');
  const [visibility, setVisibility] = useState<'everyone' | 'coaches' | 'programmers'>('everyone');
  const [coachNotes, setCoachNotes] = useState('');
  const [athleteNotes, setAthleteNotes] = useState('');

  Add Button Logic:
  const handleAdd = () => {
    const configuredLift: ConfiguredLift = {
      id: lift.id,
      name: lift.name,
      rep_type: repType,
      ...(repType === 'constant'
        ? { sets, reps, percentage_1rm: percentage }
        : { variable_sets: variableSets }
      ),
      scaling_option: scalingOption !== 'None' ? scalingOption : undefined,
      visibility,
      coach_notes: coachNotes || undefined,
      athlete_notes: athleteNotes || undefined,
    };

    onAddToSection(selectedSectionId, configuredLift);
    onClose();
  };

  3.2 ConfigureBenchmarkModal Component

  File: /components/coach/ConfigureBenchmarkModal.tsx

  Similar to ConfigureLiftModal but simpler:
  - No sets/reps (benchmarks are predefined)
  - Only: Scaling, Visibility, Notes
  - "Add to [Section]" button

  3.3 ConfigureForgeBenchmarkModal Component

  File: /components/coach/ConfigureForgeBenchmarkModal.tsx

  Same as ConfigureBenchmarkModal (could potentially reuse same component with different data source)

  ---
  Phase 4: Section Display & Rendering

  4.1 Display Structured Movements in Sections

  File: /components/coach/WODSectionComponent.tsx

  Updated UI:
  ┌────────────────────────────────────────┐
  │ WOD                          [15 min ▼]│
  ├────────────────────────────────────────┤
  │ Content (free-form text):              │
  │ ┌────────────────────────────────────┐ │
  │ │ 21-15-9 For Time:                  │ │
  │ │                                    │ │
  │ │                                    │ │
  │ └────────────────────────────────────┘ │
  │                                        │
  │ Programmed Movements:                  │
  │ ┌──────────────────────────────────┐   │
  │ │ ≡ Back Squat 5x5 @ 75%       [×] │   │
  │ │ ≡ Fran (Rx)                  [×] │   │
  │ │ ≡ Strict Press 5-3-1-1-1     [×] │   │
  │ └──────────────────────────────────┘   │
  └────────────────────────────────────────┘

  Rendering Logic:
  // Display configured lifts
  {section.lifts && section.lifts.length > 0 && (
    <div className="mt-2">
      <div className="text-xs text-gray-600 mb-1">Lifts:</div>
      {section.lifts.map((lift, idx) => (
        <div key={idx} className="flex items-center gap-2 bg-blue-100 rounded px-2 py-1 mb-1">
          <span className="text-gray-400">≡</span>
          <span className="flex-1">{formatLift(lift)}</span>
          <button onClick={() => removeLift(section.id, idx)}>×</button>
        </div>
      ))}
    </div>
  )}

  // Format lift display
  const formatLift = (lift: ConfiguredLift): string => {
    if (lift.rep_type === 'constant') {
      const base = `${lift.name} ${lift.sets}x${lift.reps}`;
      return lift.percentage_1rm ? `${base} @ ${lift.percentage_1rm}%` : base;
    } else {
      const reps = lift.variable_sets?.map(s => s.reps).join('-') || '';
      return `${lift.name} ${reps}`;
    }
  };

  ---
  Phase 5: Hook Updates (State Management)

  5.1 Update useWorkoutModal Hook

  File: /hooks/coach/useWorkoutModal.ts

  New state:
  const [liftModalOpen, setLiftModalOpen] = useState(false);
  const [benchmarkModalOpen, setBenchmarkModalOpen] = useState(false);
  const [forgeModalOpen, setForgeModalOpen] = useState(false);
  const [selectedLift, setSelectedLift] = useState<BarbellLift | null>(null);
  const [selectedBenchmark, setSelectedBenchmark] = useState<Benchmark | null>(null);
  const [selectedForgeBenchmark, setSelectedForgeBenchmark] = useState<ForgeBenchmark | null>(null);

  New handlers:
  const handleSelectLift = (lift: BarbellLift) => {
    setSelectedLift(lift);
    setLiftModalOpen(true);
  };

  const handleAddLiftToSection = (sectionId: string, configuredLift: ConfiguredLift) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              lifts: [...(section.lifts || []), configuredLift]
            }
          : section
      )
    }));
  };

  const handleRemoveLift = (sectionId: string, liftIndex: number) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              lifts: section.lifts?.filter((_, idx) => idx !== liftIndex)
            }
          : section
      )
    }));
  };

  // Similar handlers for benchmarks and forge benchmarks

  ---
  Phase 6: Analytics Foundation

  6.1 Database Query Utilities

  File: /utils/movement-analytics.ts

  // Query how often a lift is programmed
  export async function getLiftProgrammingFrequency(liftName: string, startDate: Date, endDate: Date) {
    const { data } = await supabase
      .from('wods')
      .select('date, sections')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    let count = 0;
    let totalSets = 0;
    let totalReps = 0;

    data?.forEach(wod => {
      wod.sections.forEach((section: WODSection) => {
        section.lifts?.forEach(lift => {
          if (lift.name === liftName) {
            count++;
            if (lift.rep_type === 'constant') {
              totalSets += lift.sets || 0;
              totalReps += (lift.sets || 0) * (lift.reps || 0);
            } else {
              totalSets += lift.variable_sets?.length || 0;
              totalReps += lift.variable_sets?.reduce((sum, s) => sum + s.reps, 0) || 0;
            }
          }
        });
      });
    });

    return { count, avgSets: totalSets / count, avgReps: totalReps / count };
  }

  // Similar for benchmarks

  ---
  📋 Implementation Todo List

⏺ ✅ Complete Implementation Plan Ready

  I've created an 18-step implementation plan for the Movement Library feature. Here's the summary:

  ---
  Architecture Overview

  Data Flow:
  Click "Library" → Select Tab (Lifts/Benchmarks/Forge)
       ↓
  Click Item (e.g., "Back Squat")
       ↓
  Configure Sets/Reps/Percentage/Scaling/Notes
       ↓
  Click "Add to [Section Name]" button
       ↓
  Stores in section.lifts[] as structured JSONB
       ↓
  Displays as removable badge: "≡ Back Squat 5x5 @ 75% [×]"
       ↓
  Saves to database → Enables analytics

  ---
  New Components (7 files)

  1. /types/movements.ts - TypeScript interfaces
  2. /components/coach/MovementLibraryPopup.tsx - Tabbed library (renamed from ExerciseLibraryPopup)
  3. /components/coach/ConfigureLiftModal.tsx - Constant/Variable reps configuration
  4. /components/coach/ConfigureBenchmarkModal.tsx - Benchmark config (simpler)
  5. /components/coach/ConfigureForgeBenchmarkModal.tsx - Forge config
  6. /utils/movement-analytics.ts - Analytics queries
  7. Updated: /hooks/coach/useWorkoutModal.ts - State management
  8. Updated: /components/coach/WODSectionComponent.tsx - Display badges

  ---
  Key Features

  ✅ Tabbed Library: Exercises | Lifts | Benchmarks | Forge
  ✅ Constant Reps: 5x5 @ 75% (single percentage input)
  ✅ Variable Reps: Per-set table (#1: 5@70%, #2: 3@85%, #3: 1@95%)
  ✅ Mobile-Friendly: "Add to [Section]" button (no drag complications)
  ✅ Structured Data: Stored in JSONB, enables analytics
  ✅ Badge Display: Shows as "≡ Back Squat 5x5 @ 75% [×]" with remove button
  ✅ No Breaking Changes: Existing exercises/workouts unchanged

  ---
  Estimated Effort

  | Phase            | Hours  |
  |------------------|--------|
  | Types & Setup    | 2 hrs  |
  | Tabbed Library   | 3 hrs  |
  | 3 Config Modals  | 8 hrs  |
  | State Management | 3 hrs  |
  | Display/Remove   | 2 hrs  |
  | Analytics Utils  | 2 hrs  |
  | Testing          | 4 hrs  |
  | Total            | 24 hrs |

  ---
  Next Steps - Your Choice:

  Option 1: Start Implementation (Recommended)
  - I'll begin with todo #1 (create branch)
  - Work through systematically
  - Best tool: Claude Code (me) due to complexity

  Option 2: Review Plan First
  - Ask questions about any part
  - Request changes/additions
  - Refine before starting

  Option 3: Staged Approach
  - Build Lifts only first (prove concept)
  - Test thoroughly
  - Add Benchmarks/Forge after validation

  ---
  Let me know your preference. I'm ready to proceed with Option 1 if you like.
