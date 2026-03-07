'use client';

import { AlertTriangle, Clock, CheckCircle, HelpCircle } from 'lucide-react';
import type { PatternGapResult } from '@/types/planner';

interface GapAnalysisPanelProps {
  gaps: PatternGapResult[];
  loading: boolean;
}

const STALENESS_CONFIG = {
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    icon: AlertTriangle,
    label: 'Overdue',
  },
  yellow: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    icon: Clock,
    label: 'Due soon',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    icon: CheckCircle,
    label: 'Recent',
  },
  never: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-500',
    icon: HelpCircle,
    label: 'Never programmed',
  },
};

export default function GapAnalysisPanel({ gaps, loading }: GapAnalysisPanelProps) {
  if (loading) {
    return (
      <div className='bg-white rounded-lg shadow-sm border p-4'>
        <div className='animate-pulse space-y-2'>
          {[1, 2, 3].map(i => (
            <div key={i} className='h-10 bg-gray-100 rounded' />
          ))}
        </div>
      </div>
    );
  }

  if (gaps.length === 0) {
    return (
      <div className='bg-white rounded-lg shadow-sm border p-4 text-center text-sm text-gray-500'>
        Create movement patterns above to see gap analysis.
      </div>
    );
  }

  // Sort: red first, then yellow, then never, then green
  const sortOrder = { red: 0, yellow: 1, never: 2, green: 3 };
  const sorted = [...gaps].sort((a, b) => {
    const orderDiff = sortOrder[a.staleness] - sortOrder[b.staleness];
    if (orderDiff !== 0) return orderDiff;
    // Within same staleness, sort by weeks (most overdue first)
    return (b.weeksSinceLastProgrammed ?? 999) - (a.weeksSinceLastProgrammed ?? 999);
  });

  return (
    <div className='bg-white rounded-lg shadow-sm border'>
      <h3 className='text-sm md:text-base font-semibold text-gray-800 p-3 md:p-4 border-b'>
        Gap Analysis
      </h3>
      <div className='divide-y'>
        {sorted.map(gap => {
          const config = STALENESS_CONFIG[gap.staleness];
          const Icon = config.icon;

          return (
            <div
              key={gap.patternId}
              className={`flex items-center gap-3 px-3 py-2 md:px-4 md:py-3 ${config.bg}`}
            >
              <div
                className='w-3 h-3 rounded-full shrink-0'
                style={{ backgroundColor: gap.color }}
              />
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2'>
                  <span className='text-sm font-medium text-gray-800 truncate'>
                    {gap.patternName}
                  </span>
                  <span className='text-xs text-gray-400'>
                    {gap.exerciseCount} exercise{gap.exerciseCount !== 1 ? 's' : ''}
                  </span>
                </div>
                {gap.lastProgrammedDate && (
                  <p className='text-xs text-gray-500'>
                    Last: {new Date(gap.lastProgrammedDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                )}
              </div>
              <div className={`flex items-center gap-1 shrink-0 ${config.text}`}>
                <Icon size={14} />
                <span className='text-xs font-medium'>
                  {gap.weeksSinceLastProgrammed !== null
                    ? `${gap.weeksSinceLastProgrammed}w`
                    : config.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
