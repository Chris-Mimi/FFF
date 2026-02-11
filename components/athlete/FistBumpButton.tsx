'use client';

import { useState } from 'react';

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

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-1 gap-1'
    : 'text-sm px-3 py-1.5 gap-1.5';

  return (
    <div className='relative inline-flex items-center'>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle(targetType, targetId);
        }}
        className={`inline-flex items-center rounded-full border transition-all ${sizeClasses} ${
          userReacted
            ? 'bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200'
            : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:border-gray-300'
        }`}
        title={userReacted ? 'Remove fist bump' : 'Fist bump!'}
      >
        <span className={userReacted ? 'scale-110' : ''}>
          {'\u{1F44A}'}
        </span>
        {count > 0 && (
          <span
            className='font-medium cursor-pointer'
            onClick={(e) => {
              e.stopPropagation();
              if (reactors.length > 0) setShowReactors(!showReactors);
            }}
          >
            {count}
          </span>
        )}
      </button>

      {/* Reactor names popover */}
      {showReactors && reactors.length > 0 && (
        <div
          className='absolute bottom-full left-0 mb-1 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-10 whitespace-nowrap'
          onMouseLeave={() => setShowReactors(false)}
        >
          {reactors.slice(0, 10).join(', ')}
          {reactors.length > 10 && ` +${reactors.length - 10} more`}
          <div className='absolute top-full left-4 w-2 h-2 bg-gray-900 rotate-45 -translate-y-1' />
        </div>
      )}
    </div>
  );
}
