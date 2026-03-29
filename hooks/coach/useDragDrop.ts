'use client';

import { WODFormData } from '@/components/coach/WorkoutModal';
import { useState } from 'react';
import { formatDate } from '@/utils/date-utils';

export const useDragDrop = () => {
  const [draggedWOD, setDraggedWOD] = useState<{ wod: WODFormData; sourceDate: string } | null>(null);
  const [copiedWOD, setCopiedWOD] = useState<{ wod: WODFormData; sourceDate: string } | null>(null);

  const handleDragStart = (e: React.DragEvent, wod: WODFormData, sourceDate: string) => {
    setDraggedWOD({ wod, sourceDate });
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', 'wod');
    window.__draggedWOD = wod;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date, onCopy: (wod: WODFormData, targetDate: Date) => void) => {
    e.preventDefault();
    if (!draggedWOD) return;

    // Prevent dropping a workout onto the same date
    const targetDateKey = formatDate(targetDate);
    const isSameDate = draggedWOD.sourceDate === targetDateKey;
    if (isSameDate) {
      setDraggedWOD(null);
      return; // Ignore drop on same date
    }

    onCopy(draggedWOD.wod, targetDate);
    setDraggedWOD(null);
  };

  const handleCopyToClipboard = (wod: WODFormData | null, sourceDate: string) => {
    setCopiedWOD(wod ? { wod, sourceDate } : null);
  };

  const handlePasteFromClipboard = (targetDate: Date, onCopy: (wod: WODFormData, targetDate: Date) => void) => {
    if (!copiedWOD) return;

    // Prevent pasting a workout onto the same date
    const targetDateKey = formatDate(targetDate);
    const isSameDate = copiedWOD.sourceDate === targetDateKey;
    if (isSameDate) {
      setCopiedWOD(null);
      return; // Ignore paste on same date
    }

    onCopy(copiedWOD.wod, targetDate);
    setCopiedWOD(null);
  };

  return {
    draggedWOD,
    setDraggedWOD,
    copiedWOD,
    setCopiedWOD,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleCopyToClipboard,
    handlePasteFromClipboard,
  };
};
