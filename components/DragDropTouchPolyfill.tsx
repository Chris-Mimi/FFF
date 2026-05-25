'use client';

import { useEffect } from 'react';

export function DragDropTouchPolyfill() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('ontouchstart' in window) && navigator.maxTouchPoints === 0) return;

    // @ts-expect-error - drag-drop-touch ships no type declarations
    import('drag-drop-touch').then((mod) => {
      // Press-and-hold mode: finger must stay on the draggable for PRESSHOLDAWAIT ms
      // before a drag is initiated. Without this, any finger drift on a draggable
      // element starts a drag and breaks scrolling on the coach calendar.
      const DDT = (mod as unknown as { DragDropTouch: Record<string, unknown> }).DragDropTouch;
      DDT._ISPRESSHOLDMODE = true;
      DDT._PRESSHOLDAWAIT = 750;
    });
  }, []);

  return null;
}
