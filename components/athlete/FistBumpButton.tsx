'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface FistBumpButtonProps {
  targetType: 'wod_section_result' | 'benchmark_result' | 'lift_record';
  targetId: string;
  count: number;
  userReacted: boolean;
  reactors?: string[];
  onToggle: (targetType: 'wod_section_result' | 'benchmark_result' | 'lift_record', targetId: string) => void;
  size?: 'sm' | 'md';
}

export default function FistBumpButton({
  targetType,
  targetId,
  count,
  userReacted,
  reactors = [],
  onToggle,
  size = 'sm'
}: FistBumpButtonProps) {
  const [showReactors, setShowReactors] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-1 gap-1'
    : 'text-sm px-3 py-1.5 gap-1.5';

  // Long-press: remove fist bump (deliberate action)
  const handlePointerDown = useCallback(() => {
    didLongPress.current = false;
    if (userReacted) {
      longPressTimer.current = setTimeout(() => {
        didLongPress.current = true;
        onToggle(targetType, targetId);
      }, 400);
    }
  }, [userReacted, onToggle, targetType, targetId]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // If long-press just fired, don't also toggle/show
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    if (userReacted) {
      // Already reacted — tap shows who gave fist bumps
      if (reactors.length > 0) setShowReactors(prev => !prev);
    } else {
      // Not yet reacted — tap gives fist bump
      onToggle(targetType, targetId);
    }
  }, [onToggle, targetType, targetId, userReacted, reactors.length]);

  // Dismiss popover on outside tap
  useEffect(() => {
    if (!showReactors) return;
    const handleOutside = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowReactors(false);
      }
    };
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, [showReactors]);

  // Adjust popover position to stay on screen
  useEffect(() => {
    if (!showReactors || !popoverRef.current) return;
    const el = popoverRef.current;
    const rect = el.getBoundingClientRect();
    // If overflowing right edge, shift left
    if (rect.right > window.innerWidth - 8) {
      const shift = rect.right - window.innerWidth + 8;
      el.style.transform = `translateX(-${shift}px)`;
    } else {
      el.style.transform = '';
    }
  }, [showReactors]);

  return (
    <div ref={containerRef} className='relative inline-flex items-center'>
      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
        className={`inline-flex items-center rounded-full border transition-all ${sizeClasses} ${
          userReacted
            ? 'bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200'
            : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:border-gray-300'
        }`}
        title={userReacted ? 'Tap to see who, hold to remove' : 'Fist bump!'}
      >
        <span className={`flex-shrink-0 ${userReacted ? 'scale-110' : ''}`}>
          {'\u{1F44A}'}
        </span>
        {count > 0 && (
          <span className='font-medium flex-shrink-0'>
            {count}
          </span>
        )}
      </button>

      {/* Reactor names popover */}
      {showReactors && reactors.length > 0 && (
        <div
          ref={popoverRef}
          className='absolute bottom-full right-0 mb-1 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-50 max-w-[80vw] whitespace-normal'
          onMouseLeave={() => setShowReactors(false)}
        >
          {reactors.slice(0, 10).join(', ')}
          {reactors.length > 10 && ` +${reactors.length - 10} more`}
          <div className='absolute top-full right-4 w-2 h-2 bg-gray-900 rotate-45 -translate-y-1' />
        </div>
      )}
    </div>
  );
}
