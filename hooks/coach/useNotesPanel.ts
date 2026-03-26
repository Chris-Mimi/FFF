'use client';

import { WODFormData } from '@/components/coach/WorkoutModal';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

interface UseNotesPanelProps {
  fetchWODs: () => Promise<void>;
  fetchTracksAndCounts: () => Promise<void>;
}

export const useNotesPanel = ({ fetchWODs, fetchTracksAndCounts }: UseNotesPanelProps) => {
  const [notesPanel, setNotesPanel] = useState<{ isOpen: boolean; wod: WODFormData | null }>({
    isOpen: false,
    wod: null,
  });
  const [notesDraft, setNotesDraft] = useState('');
  const [modalSize, setModalSize] = useState({ width: 768, height: 600 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const closeNotesPanel = () => {
    setNotesPanel({ isOpen: false, wod: null });
    setNotesDraft('');
    setModalSize({ width: 768, height: 600 });
  };

  const handleResizeStart = (e: React.MouseEvent, _corner: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: modalSize.width,
      height: modalSize.height,
    });
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;

      const newWidth = Math.max(400, Math.min(1200, resizeStart.width + deltaX * 2));
      const newHeight = Math.max(400, Math.min(window.innerHeight * 0.9, resizeStart.height + deltaY * 2));

      setModalSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStart]);

  const handleSaveNotes = async () => {
    if (!notesPanel.wod?.id) return;

    try {
      const { error } = await supabase
        .from('wods')
        .update({
          coach_notes: notesDraft || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', notesPanel.wod.id);

      if (error) throw error;

      await fetchWODs();
      await fetchTracksAndCounts();
      closeNotesPanel();
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Error saving notes. Please try again.');
    }
  };

  return {
    notesPanel,
    setNotesPanel,
    notesDraft,
    setNotesDraft,
    modalSize,
    setModalSize,
    isResizing,
    setIsResizing,
    resizeStart,
    setResizeStart,
    closeNotesPanel,
    handleResizeStart,
    handleSaveNotes,
  };
};
