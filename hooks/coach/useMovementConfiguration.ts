'use client';

import { useState } from 'react';
import type {
  BarbellLift,
  Benchmark,
  ForgeBenchmark,
  ConfiguredLift,
  ConfiguredBenchmark,
  ConfiguredForgeBenchmark
} from '@/types/movements';
import type { WODSection } from './useWorkoutModal';

export interface UseMovementConfigurationProps {
  sections: WODSection[];
  onSectionsChange: (sections: WODSection[]) => void;
}

export interface UseMovementConfigurationResult {
  // Lift state
  liftModalOpen: boolean;
  selectedLift: BarbellLift | null;
  editingLift: { sectionId: string; liftIndex: number; lift: ConfiguredLift } | null;
  setLiftModalOpen: (open: boolean) => void;
  handleSelectLift: (lift: BarbellLift) => void;
  handleEditLift: (sectionId: string, liftIndex: number) => void;
  handleAddLiftToSection: (sectionId: string, configuredLift: ConfiguredLift) => void;
  handleRemoveLift: (sectionId: string, liftIndex: number) => void;

  // Benchmark state
  benchmarkModalOpen: boolean;
  selectedBenchmark: Benchmark | null;
  setBenchmarkModalOpen: (open: boolean) => void;
  handleSelectBenchmark: (benchmark: Benchmark) => void;
  handleAddBenchmarkToSection: (sectionId: string, configuredBenchmark: ConfiguredBenchmark) => void;
  handleRemoveBenchmark: (sectionId: string, benchmarkIndex: number) => void;

  // Forge Benchmark state
  forgeModalOpen: boolean;
  selectedForgeBenchmark: ForgeBenchmark | null;
  setForgeModalOpen: (open: boolean) => void;
  handleSelectForgeBenchmark: (forge: ForgeBenchmark) => void;
  handleAddForgeBenchmarkToSection: (sectionId: string, configuredForgeBenchmark: ConfiguredForgeBenchmark) => void;
  handleRemoveForgeBenchmark: (sectionId: string, forgeIndex: number) => void;
}

export function useMovementConfiguration({
  sections,
  onSectionsChange,
}: UseMovementConfigurationProps): UseMovementConfigurationResult {
  // Lift state
  const [liftModalOpen, setLiftModalOpen] = useState(false);
  const [selectedLift, setSelectedLift] = useState<BarbellLift | null>(null);
  const [editingLift, setEditingLift] = useState<{ sectionId: string; liftIndex: number; lift: ConfiguredLift } | null>(null);

  // Benchmark state
  const [benchmarkModalOpen, setBenchmarkModalOpen] = useState(false);
  const [selectedBenchmark, setSelectedBenchmark] = useState<Benchmark | null>(null);

  // Forge Benchmark state
  const [forgeModalOpen, setForgeModalOpen] = useState(false);
  const [selectedForgeBenchmark, setSelectedForgeBenchmark] = useState<ForgeBenchmark | null>(null);

  // Lift handlers
  const handleSelectLift = (lift: BarbellLift) => {
    setSelectedLift(lift);
    setEditingLift(null); // Clear editing state when adding new lift
    setLiftModalOpen(true);
  };

  const handleEditLift = (sectionId: string, liftIndex: number) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section || !section.lifts || !section.lifts[liftIndex]) return;

    const liftToEdit = section.lifts[liftIndex];
    // Convert ConfiguredLift back to BarbellLift for modal
    const barbellLift: BarbellLift = {
      id: liftToEdit.id,
      name: liftToEdit.name,
      category: '', // We don't need category for editing
      display_order: 0,
    };

    setSelectedLift(barbellLift);
    setEditingLift({ sectionId, liftIndex, lift: liftToEdit });
    setLiftModalOpen(true);
  };

  const handleAddLiftToSection = (sectionId: string, configuredLift: ConfiguredLift) => {
    if (editingLift) {
      // Update mode: replace existing lift
      const updatedSections = sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              lifts: section.lifts?.map((lift, idx) =>
                idx === editingLift.liftIndex ? configuredLift : lift
              ),
            }
          : section
      );
      onSectionsChange(updatedSections);
      setEditingLift(null); // Clear editing state
    } else {
      // Add mode: append new lift
      const updatedSections = sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              lifts: [...(section.lifts || []), configuredLift],
            }
          : section
      );
      onSectionsChange(updatedSections);
    }
  };

  const handleRemoveLift = (sectionId: string, liftIndex: number) => {
    const updatedSections = sections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            lifts: section.lifts?.filter((_, idx) => idx !== liftIndex),
          }
        : section
    );
    onSectionsChange(updatedSections);
  };

  // Benchmark handlers
  const handleSelectBenchmark = (benchmark: Benchmark) => {
    setSelectedBenchmark(benchmark);
    setBenchmarkModalOpen(true);
  };

  const handleAddBenchmarkToSection = (sectionId: string, configuredBenchmark: ConfiguredBenchmark) => {
    const updatedSections = sections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            benchmarks: [...(section.benchmarks || []), configuredBenchmark],
          }
        : section
    );
    onSectionsChange(updatedSections);
  };

  const handleRemoveBenchmark = (sectionId: string, benchmarkIndex: number) => {
    const updatedSections = sections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            benchmarks: section.benchmarks?.filter((_, idx) => idx !== benchmarkIndex),
          }
        : section
    );
    onSectionsChange(updatedSections);
  };

  // Forge Benchmark handlers
  const handleSelectForgeBenchmark = (forge: ForgeBenchmark) => {
    setSelectedForgeBenchmark(forge);
    setForgeModalOpen(true);
  };

  const handleAddForgeBenchmarkToSection = (sectionId: string, configuredForgeBenchmark: ConfiguredForgeBenchmark) => {
    const updatedSections = sections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            forge_benchmarks: [...(section.forge_benchmarks || []), configuredForgeBenchmark],
          }
        : section
    );
    onSectionsChange(updatedSections);
  };

  const handleRemoveForgeBenchmark = (sectionId: string, forgeIndex: number) => {
    const updatedSections = sections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            forge_benchmarks: section.forge_benchmarks?.filter((_, idx) => idx !== forgeIndex),
          }
        : section
    );
    onSectionsChange(updatedSections);
  };

  return {
    // Lift
    liftModalOpen,
    selectedLift,
    editingLift,
    setLiftModalOpen,
    handleSelectLift,
    handleEditLift,
    handleAddLiftToSection,
    handleRemoveLift,

    // Benchmark
    benchmarkModalOpen,
    selectedBenchmark,
    setBenchmarkModalOpen,
    handleSelectBenchmark,
    handleAddBenchmarkToSection,
    handleRemoveBenchmark,

    // Forge Benchmark
    forgeModalOpen,
    selectedForgeBenchmark,
    setForgeModalOpen,
    handleSelectForgeBenchmark,
    handleAddForgeBenchmarkToSection,
    handleRemoveForgeBenchmark,
  };
}
