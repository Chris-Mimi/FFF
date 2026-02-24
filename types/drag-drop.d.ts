import type { WODFormData } from '@/components/coach/WorkoutModal';
import type { ConfiguredLift, ConfiguredBenchmark, ConfiguredForgeBenchmark } from '@/types/movements';

/** Subset of WODSection fields transferred via drag-and-drop (no id, duration as string) */
interface DraggedSectionData {
  type: string;
  duration: string;
  content: string;
  lifts?: ConfiguredLift[];
  benchmarks?: ConfiguredBenchmark[];
  forge_benchmarks?: ConfiguredForgeBenchmark[];
}

declare global {
  interface Window {
    __draggedWOD?: WODFormData;
    __draggedSection?: DraggedSectionData;
  }
}

export {};
