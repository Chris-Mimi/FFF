'use client';

import { useRef, useCallback } from 'react';
import AthleteScoreRow from './AthleteScoreRow';
import {
  ScoreEntryAthlete,
  WodSection,
  AthleteScoreValues,
  emptyScoreValues,
} from '@/hooks/coach/useScoreEntry';

interface ScoreEntryGridProps {
  athletes: ScoreEntryAthlete[];
  section: WodSection;
  scores: Record<string, AthleteScoreValues>;
  onUpdateScore: (athleteId: string, sectionId: string, updates: Partial<AthleteScoreValues>) => void;
}

export default function ScoreEntryGrid({
  athletes,
  section,
  scores,
  onUpdateScore,
}: ScoreEntryGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  // Enter key → jump to same field on next athlete row
  const handleGridKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;

    const target = e.target as HTMLElement;
    // Skip select elements (Enter opens/closes dropdown natively)
    if (target.tagName === 'SELECT') return;

    const fieldType = target.dataset.fieldType;
    const athleteIndex = target.dataset.athleteIndex;
    if (!fieldType || athleteIndex === undefined) return;

    e.preventDefault();

    const currentIdx = parseInt(athleteIndex, 10);
    const nextIdx = currentIdx + 1;

    // Try next athlete, same field — wrap to first if on last
    const nextInput = (
      gridRef.current?.querySelector(
        `[data-field-type="${fieldType}"][data-athlete-index="${nextIdx}"]`
      ) ||
      gridRef.current?.querySelector(
        `[data-field-type="${fieldType}"][data-athlete-index="0"]`
      )
    ) as HTMLElement | null;

    nextInput?.focus();
  }, []);

  if (!section.scoring_fields) return null;

  return (
    <div ref={gridRef} onKeyDown={handleGridKeyDown} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 py-2 px-3 bg-gray-50 border-b border-gray-200">
        <div className="w-36 min-w-[9rem] text-xs font-semibold text-gray-500 uppercase">
          Athlete
        </div>
        <div className="flex-1 text-xs font-semibold text-gray-500 uppercase">
          Score
        </div>
      </div>

      {/* Athlete Rows */}
      {athletes.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">
          No athletes booked or listed in Whiteboard Intro
        </div>
      ) : (
        athletes.map((athlete, idx) => {
          const prevAthlete = idx > 0 ? athletes[idx - 1] : null;
          const prevValues = prevAthlete
            ? scores[`${prevAthlete.id}_${section.id}`] || null
            : null;
          return (
            <AthleteScoreRow
              key={athlete.id}
              athleteIndex={idx}
              athleteName={athlete.name}
              athleteId={athlete.id}
              sectionId={section.id}
              scoringFields={section.scoring_fields!}
              values={scores[`${athlete.id}_${section.id}`] || emptyScoreValues}
              onChange={onUpdateScore}
              previousValues={prevValues}
            />
          );
        })
      )}
    </div>
  );
}
