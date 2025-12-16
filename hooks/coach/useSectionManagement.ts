'use client';

import { useState, useEffect } from 'react';
import type { WODSection } from './useWorkoutModal';

interface SectionType {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
}

export interface UseSectionManagementProps {
  sections: WODSection[];
  sectionTypes: SectionType[];
  onSectionsChange: (sections: WODSection[]) => void;
  workoutId?: string;
}

export interface UseSectionManagementResult {
  // State
  expandedSections: Set<string>;
  lastExpandedSectionId: string | null;
  draggedIndex: number | null;
  activeSection: number | null;

  // Setters
  setActiveSection: React.Dispatch<React.SetStateAction<number | null>>;

  // Functions
  toggleSectionExpanded: (sectionId: string, sectionIndex?: number) => void;
  addSection: () => void;
  updateSection: (sectionId: string, updates: Partial<WODSection>) => void;
  deleteSection: (sectionId: string) => void;
  handleDragStart: (e: React.DragEvent, index: number) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, dropIndex: number) => void;
  insertSectionAtCorrectPosition: (sections: WODSection[], newSection: WODSection) => WODSection[];
  setExpandedSections: React.Dispatch<React.SetStateAction<Set<string>>>;
  setLastExpandedSectionId: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useSectionManagement({
  sections,
  sectionTypes,
  onSectionsChange,
  workoutId,
}: UseSectionManagementProps): UseSectionManagementResult {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [lastExpandedSectionId, setLastExpandedSectionId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<number | null>(null);
  const [loadedWorkoutId, setLoadedWorkoutId] = useState<string | null>(null);

  // Load expanded sections from localStorage when workoutId changes
  useEffect(() => {
    if (typeof window !== 'undefined' && workoutId && workoutId !== loadedWorkoutId && sections.length > 0) {
      const stored = localStorage.getItem(`workout_expanded_sections_${workoutId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Validate that the stored section IDs still exist
          const validSectionIds = parsed.filter((id: string) =>
            sections.some(s => s.id === id)
          );
          if (validSectionIds.length > 0) {
            setExpandedSections(new Set(validSectionIds));
            // Set last expanded to the first valid stored section
            setLastExpandedSectionId(validSectionIds[0]);
          } else {
            // Stored IDs are stale, use first section
            setExpandedSections(new Set([sections[0].id]));
            setLastExpandedSectionId(sections[0].id);
          }
        } catch {
          // Invalid JSON, set default
          setExpandedSections(new Set([sections[0].id]));
          setLastExpandedSectionId(sections[0].id);
        }
      } else {
        // No stored state - set default to first section
        setExpandedSections(new Set([sections[0].id]));
        setLastExpandedSectionId(sections[0].id);
      }
      setLoadedWorkoutId(workoutId);
    }
  }, [workoutId, loadedWorkoutId, sections]);

  // Save expanded sections to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined' && workoutId && expandedSections.size > 0) {
      localStorage.setItem(
        `workout_expanded_sections_${workoutId}`,
        JSON.stringify(Array.from(expandedSections))
      );
    }
  }, [expandedSections, workoutId]);

  const toggleSectionExpanded = (sectionId: string, sectionIndex?: number) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
        // Don't clear lastExpandedSectionId when collapsing - keep it as reference for adding new sections
        // If collapsing and this was the active section, clear activeSection
        if (sectionIndex !== undefined && activeSection === sectionIndex) {
          setActiveSection(null);
        }
      } else {
        newSet.add(sectionId);
        // Track this as the last expanded section
        setLastExpandedSectionId(sectionId);
        // Set this as the active section for library insertions
        if (sectionIndex !== undefined) {
          setActiveSection(sectionIndex);
        }
      }
      return newSet;
    });
  };

  const addSection = () => {
    // Determine the section type for the new section
    let newSectionType = 'Warm-up'; // Default fallback

    if (lastExpandedSectionId && sectionTypes.length > 0) {
      const expandedSection = sections.find(s => s.id === lastExpandedSectionId);
      if (expandedSection) {
        // Find the current section type in the ordered list
        const currentTypeIndex = sectionTypes.findIndex(t => t.name === expandedSection.type);
        if (currentTypeIndex !== -1 && currentTypeIndex < sectionTypes.length - 1) {
          // Use the next section type in display_order
          newSectionType = sectionTypes[currentTypeIndex + 1].name;
        } else if (currentTypeIndex === sectionTypes.length - 1) {
          // If we're at the last type, cycle back to first
          newSectionType = sectionTypes[0].name;
        }
      }
    }

    const newSection: WODSection = {
      id: `section-${Date.now()}`,
      type: newSectionType,
      duration: 5,
      content: '',
    };

    // Find the index of the last expanded section
    const expandedIndex = lastExpandedSectionId
      ? sections.findIndex(s => s.id === lastExpandedSectionId)
      : -1;

    // If there's an expanded section, insert after it; otherwise add at the end
    let newSections: WODSection[];
    if (expandedIndex !== -1) {
      newSections = [...sections];
      newSections.splice(expandedIndex + 1, 0, newSection);
    } else {
      newSections = [...sections, newSection];
    }

    onSectionsChange(newSections);

    // Collapse all existing sections and expand only the new one
    setExpandedSections(new Set([newSection.id]));
    setLastExpandedSectionId(newSection.id);
  };

  const updateSection = (sectionId: string, updates: Partial<WODSection>) => {
    const updatedSections = sections.map(section =>
      section.id === sectionId ? { ...section, ...updates } : section
    );
    onSectionsChange(updatedSections);
  };

  const deleteSection = (sectionId: string) => {
    const updatedSections = sections.filter(section => section.id !== sectionId);
    onSectionsChange(updatedSections);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newSections = [...sections];
    const [draggedSection] = newSections.splice(draggedIndex, 1);
    newSections.splice(dropIndex, 0, draggedSection);

    onSectionsChange(newSections);
    setDraggedIndex(null);
  };

  const insertSectionAtCorrectPosition = (sections: WODSection[], newSection: WODSection): WODSection[] => {
    // Get display_order for the new section
    const newSectionType = sectionTypes.find(t => t.name === newSection.type);
    if (!newSectionType) {
      // Fallback: append to end
      return [...sections, newSection];
    }

    // Find insertion index
    let insertIndex = sections.length; // Default to end
    for (let i = 0; i < sections.length; i++) {
      const existingSectionType = sectionTypes.find(t => t.name === sections[i].type);
      if (existingSectionType && existingSectionType.display_order > newSectionType.display_order) {
        insertIndex = i;
        break;
      }
    }

    // Insert at calculated position
    const newSections = [...sections];
    newSections.splice(insertIndex, 0, newSection);
    return newSections;
  };

  return {
    expandedSections,
    lastExpandedSectionId,
    draggedIndex,
    activeSection,
    setActiveSection,
    toggleSectionExpanded,
    addSection,
    updateSection,
    deleteSection,
    handleDragStart,
    handleDragOver,
    handleDrop,
    insertSectionAtCorrectPosition,
    setExpandedSections,
    setLastExpandedSectionId,
  };
}
