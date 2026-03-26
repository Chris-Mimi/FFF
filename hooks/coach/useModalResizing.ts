'use client';

import { useState, useEffect } from 'react';

export interface UseModalResizingResult {
  // State
  notesModalSize: { width: number; height: number };
  notesModalPos: { bottom: number; left: number };
  isResizingNotes: boolean;
  isDraggingNotes: boolean;
  resizeStartNotes: { x: number; y: number; width: number; height: number; bottom: number; left: number };
  dragStartNotes: { x: number; y: number; bottom: number; left: number };
  notesZIndex: number;
  libraryZIndex: number;

  // Publish modal drag + focus
  publishModalPos: { x: number; y: number } | null;
  isDraggingPublish: boolean;
  workoutPanelZIndex: number;
  publishModalZIndex: number;

  // Functions
  handleNotesDragStart: (e: React.MouseEvent) => void;
  handleNotesResizeStart: (e: React.MouseEvent, corner: string) => void;
  bringNotesToFront: () => void;
  bringLibraryToFront: () => void;
  handlePublishDragStart: (e: React.MouseEvent) => void;
  bringWorkoutToFront: () => void;
  bringPublishToFront: () => void;
  resetPublishModalPos: () => void;
  openPublishModal: () => void;
}

export function useModalResizing(): UseModalResizingResult {
  const [notesModalSize, setNotesModalSize] = useState({ width: 600, height: 700 });
  const [notesModalPos, setNotesModalPos] = useState({ bottom: 300, left: 800 });
  // Z-order: higher number = in front. Toggle between two values on click.
  const [topPanel, setTopPanel] = useState<'notes' | 'library'>('library');
  const notesZIndex = topPanel === 'notes' ? 100 : 70;
  const libraryZIndex = topPanel === 'library' ? 100 : 70;

  const bringNotesToFront = () => setTopPanel('notes');
  const bringLibraryToFront = () => setTopPanel('library');
  const [isResizingNotes, setIsResizingNotes] = useState(false);
  const [isDraggingNotes, setIsDraggingNotes] = useState(false);
  const [resizeStartNotes, setResizeStartNotes] = useState({ x: 0, y: 0, width: 0, height: 0, bottom: 0, left: 0 });
  const [dragStartNotes, setDragStartNotes] = useState({ x: 0, y: 0, bottom: 0, left: 0 });
  const [resizeCorner, setResizeCorner] = useState<string>('');

  // Publish modal drag + workout/publish focus
  const [publishModalPos, setPublishModalPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingPublish, setIsDraggingPublish] = useState(false);
  const [dragStartPublish, setDragStartPublish] = useState({ x: 0, y: 0, posX: 0, posY: 0 });
  const [focusedPanel, setFocusedPanel] = useState<'workout' | 'publish'>('publish');
  const workoutPanelZIndex = focusedPanel === 'workout' ? 52 : 50;
  const publishModalZIndex = focusedPanel === 'publish' ? 52 : 50;
  const bringWorkoutToFront = () => setFocusedPanel('workout');
  const bringPublishToFront = () => setFocusedPanel('publish');
  const resetPublishModalPos = () => setPublishModalPos(null);

  // Open publish modal to the right of the workout panel
  const openPublishModal = () => {
    // On desktop (lg: 1024px+), position right of 800px panel; otherwise center
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setPublishModalPos({ x: 816, y: 80 });
    } else {
      setPublishModalPos(null);
    }
    setFocusedPanel('publish');
  };

  // Handle Notes modal drag (move)
  const handleNotesDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingNotes(true);
    setDragStartNotes({
      x: e.clientX,
      y: e.clientY,
      bottom: notesModalPos.bottom,
      left: notesModalPos.left,
    });
  };

  // Handle Publish modal drag (move)
  const handlePublishDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    bringPublishToFront();
    // If no position set yet, calculate current center position from the element
    const modalEl = (e.target as HTMLElement).closest('[data-publish-modal]');
    const rect = modalEl?.getBoundingClientRect();
    const currentX = publishModalPos?.x ?? (rect ? rect.left : (window.innerWidth - 672) / 2);
    const currentY = publishModalPos?.y ?? (rect ? rect.top : (window.innerHeight - 500) / 2);
    setIsDraggingPublish(true);
    setDragStartPublish({ x: e.clientX, y: e.clientY, posX: currentX, posY: currentY });
  };

  // Handle Notes modal resize
  const handleNotesResizeStart = (e: React.MouseEvent, corner: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingNotes(true);
    setResizeCorner(corner);
    setResizeStartNotes({
      x: e.clientX,
      y: e.clientY,
      width: notesModalSize.width,
      height: notesModalSize.height,
      bottom: notesModalPos.bottom,
      left: notesModalPos.left,
    });
  };

  useEffect(() => {
    if (isDraggingNotes) {
      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - dragStartNotes.x;
        const deltaY = e.clientY - dragStartNotes.y;

        // Calculate max bottom value (allows modal to reach viewport top, same as Exercise library)
        // bottom = distance from viewport bottom, so larger bottom = higher on screen
        const maxBottom = window.innerHeight - notesModalSize.height;

        setNotesModalPos({
          bottom: Math.max(0, Math.min(maxBottom, dragStartNotes.bottom - deltaY)),
          left: Math.max(0, dragStartNotes.left + deltaX),
        });
      };

      const handleMouseUp = () => {
        setIsDraggingNotes(false);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }

    if (isResizingNotes) {
      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - resizeStartNotes.x;
        const deltaY = e.clientY - resizeStartNotes.y;

        let newWidth = resizeStartNotes.width;
        let newHeight = resizeStartNotes.height;
        let newBottom = resizeStartNotes.bottom;
        let newLeft = resizeStartNotes.left;

        // Handle resize based on corner - ALL expand in drag direction
        switch (resizeCorner) {
          case 'se': // Bottom-right: drag down/right = grow
            newWidth = resizeStartNotes.width + deltaX;
            newHeight = resizeStartNotes.height + deltaY; // Drag down = taller
            newBottom = resizeStartNotes.bottom - deltaY; // Move bottom down
            break;
          case 'sw': // Bottom-left: drag down/left = grow
            newWidth = resizeStartNotes.width - deltaX;
            newHeight = resizeStartNotes.height + deltaY; // Drag down = taller
            newLeft = resizeStartNotes.left + deltaX;
            newBottom = resizeStartNotes.bottom - deltaY; // Move bottom down
            break;
          case 'ne': // Top-right: drag up/right = grow
            newWidth = resizeStartNotes.width + deltaX;
            newHeight = resizeStartNotes.height - deltaY; // Drag up (-Y) = taller
            newBottom = resizeStartNotes.bottom - deltaY; // Accommodate growth
            break;
          case 'nw': // Top-left: drag up/left = grow
            newWidth = resizeStartNotes.width - deltaX;
            newHeight = resizeStartNotes.height - deltaY; // Drag up (-Y) = taller
            newLeft = resizeStartNotes.left + deltaX;
            newBottom = resizeStartNotes.bottom - deltaY; // Accommodate growth
            break;
        }

        // Apply constraints
        newWidth = Math.max(400, Math.min(1000, newWidth));
        newHeight = Math.max(300, Math.min(window.innerHeight * 0.9, newHeight));
        newBottom = Math.max(0, newBottom);
        newLeft = Math.max(0, newLeft);

        setNotesModalSize({ width: newWidth, height: newHeight });

        // Update position (all corners affect position now)
        const updates: { left?: number; bottom?: number } = {};

        if (resizeCorner === 'sw' || resizeCorner === 'nw') {
          updates.left = newLeft;
        }
        // All corners affect bottom position
        updates.bottom = newBottom;

        setNotesModalPos(prev => ({ ...prev, ...updates }));
      };

      const handleMouseUp = () => {
        setIsResizingNotes(false);
        setResizeCorner('');
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingNotes, isResizingNotes, dragStartNotes, resizeStartNotes, resizeCorner, notesModalSize]);

  // Publish modal drag effect
  useEffect(() => {
    if (!isDraggingPublish) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartPublish.x;
      const deltaY = e.clientY - dragStartPublish.y;
      setPublishModalPos({
        x: Math.max(0, dragStartPublish.posX + deltaX),
        y: Math.max(0, dragStartPublish.posY + deltaY),
      });
    };

    const handleMouseUp = () => setIsDraggingPublish(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPublish, dragStartPublish]);

  return {
    notesModalSize,
    notesModalPos,
    isResizingNotes,
    isDraggingNotes,
    resizeStartNotes,
    dragStartNotes,
    notesZIndex,
    libraryZIndex,
    publishModalPos,
    isDraggingPublish,
    workoutPanelZIndex,
    publishModalZIndex,
    handleNotesDragStart,
    handleNotesResizeStart,
    bringNotesToFront,
    bringLibraryToFront,
    handlePublishDragStart,
    bringWorkoutToFront,
    bringPublishToFront,
    resetPublishModalPos,
    openPublishModal,
  };
}
