'use client';

import { WODFormData, WODSection } from '@/components/coach/WODModal';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

interface UseQuickEditProps {
  fetchWODs: () => Promise<void>;
  fetchTracksAndCounts: () => Promise<void>;
}

export const useQuickEdit = ({ fetchWODs, fetchTracksAndCounts }: UseQuickEditProps) => {
  const [quickEditMode, setQuickEditMode] = useState(false);
  const [quickEditWOD, setQuickEditWOD] = useState<WODFormData | null>(null);
  const [draggedSection, setDraggedSection] = useState<{
    type: string;
    duration: string;
    content: string;
  } | null>(null);

  const handleSectionDragStart = (
    e: React.DragEvent,
    section: { type: string; duration: string; content: string }
  ) => {
    setDraggedSection(section);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', 'section');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__draggedSection = section;
  };

  const handleQuickEditDrop = (draggedWOD: { wod: WODFormData; sourceDate: string } | null, e: React.DragEvent) => {
    e.preventDefault();
    const dataType = e.dataTransfer.getData('text/plain');

    if (dataType === 'wod' && draggedWOD && quickEditWOD) {
      setQuickEditWOD({
        ...quickEditWOD,
        title: draggedWOD.wod.title,
        sections: [...draggedWOD.wod.sections],
        track_id: draggedWOD.wod.track_id,
        workout_type_id: draggedWOD.wod.workout_type_id,
      });
    } else if (dataType === 'section' && draggedSection && quickEditWOD) {
      const newSection: WODSection = {
        id: `section-${Date.now()}`,
        type: draggedSection.type,
        duration: parseInt(draggedSection.duration) || 5,
        content: draggedSection.content,
      };
      setQuickEditWOD({
        ...quickEditWOD,
        sections: [...quickEditWOD.sections, newSection],
      });
      setDraggedSection(null);
    }
  };

  const saveQuickEdit = async () => {
    if (!quickEditWOD) return;

    try {
      const { error } = await supabase
        .from('wods')
        .insert([
          {
            title: quickEditWOD.title,
            track_id: quickEditWOD.track_id || null,
            workout_type_id: quickEditWOD.workout_type_id || null,
            class_times: quickEditWOD.classTimes,
            max_capacity: quickEditWOD.maxCapacity,
            date: quickEditWOD.date,
            sections: quickEditWOD.sections,
            coach_notes: quickEditWOD.coach_notes || null,
          },
        ])
        .select();

      if (error) throw error;

      await fetchWODs();
      await fetchTracksAndCounts();
      setQuickEditMode(false);
      setQuickEditWOD(null);
    } catch (error) {
      console.error('Error saving WOD:', error);
      alert('Error saving WOD. Please try again.');
    }
  };

  return {
    quickEditMode,
    setQuickEditMode,
    quickEditWOD,
    setQuickEditWOD,
    draggedSection,
    setDraggedSection,
    handleSectionDragStart,
    handleQuickEditDrop,
    saveQuickEdit,
  };
};
