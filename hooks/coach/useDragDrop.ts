'use client';

import { WODFormData } from '@/components/coach/WODModal';
import { useState } from 'react';

export const useDragDrop = () => {
  const [draggedWOD, setDraggedWOD] = useState<{ wod: WODFormData; sourceDate: string } | null>(null);
  const [copiedWOD, setCopiedWOD] = useState<WODFormData | null>(null);

  const handleDragStart = (e: React.DragEvent, wod: WODFormData, sourceDate: string) => {
    setDraggedWOD({ wod, sourceDate });
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', 'wod');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__draggedWOD = wod;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date, onCopy: (wod: WODFormData, targetDate: Date) => void) => {
    e.preventDefault();
    if (!draggedWOD) return;

    onCopy(draggedWOD.wod, targetDate);
    setDraggedWOD(null);
  };

  const handleCopyToClipboard = (wod: WODFormData | null) => {
    setCopiedWOD(wod);
  };

  const handlePasteFromClipboard = (targetDate: Date, onCopy: (wod: WODFormData, targetDate: Date) => void) => {
    if (!copiedWOD) return;
    onCopy(copiedWOD, targetDate);
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
