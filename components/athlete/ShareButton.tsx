'use client';

import { Share2 } from 'lucide-react';
import { useShare, type ShareData } from '@/hooks/athlete/useShare';

interface ShareButtonProps {
  data: ShareData;
  size?: 'sm' | 'md';
}

export default function ShareButton({ data, size = 'sm' }: ShareButtonProps) {
  const { share, sharing } = useShare();

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-1 gap-1'
    : 'text-sm px-3 py-1.5 gap-1.5';

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        share(data);
      }}
      disabled={sharing}
      className={`inline-flex items-center rounded-full border transition-all ${sizeClasses} bg-gray-50 border-gray-200 text-gray-500 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-600 disabled:opacity-50 disabled:cursor-wait`}
      title="Share result"
      aria-label="Share result"
    >
      {sharing ? (
        <div className="animate-spin h-3 w-3 border border-gray-400 border-t-transparent rounded-full" />
      ) : (
        <Share2 size={size === 'sm' ? 12 : 14} />
      )}
    </button>
  );
}
