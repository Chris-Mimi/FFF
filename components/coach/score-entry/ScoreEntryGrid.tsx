'use client';

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
  onUpdateScore: (memberId: string, sectionId: string, updates: Partial<AthleteScoreValues>) => void;
}

export default function ScoreEntryGrid({
  athletes,
  section,
  scores,
  onUpdateScore,
}: ScoreEntryGridProps) {
  if (!section.scoring_fields) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
          No athletes booked for this session
        </div>
      ) : (
        athletes.map((athlete) => (
          <AthleteScoreRow
            key={athlete.memberId}
            athleteName={athlete.name}
            memberId={athlete.memberId}
            sectionId={section.id}
            scoringFields={section.scoring_fields!}
            values={scores[`${athlete.memberId}_${section.id}`] || emptyScoreValues}
            onChange={onUpdateScore}
          />
        ))
      )}
    </div>
  );
}
