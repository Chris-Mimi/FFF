'use client';

import ScoringFieldInputs from '@/components/athlete/logbook/ScoringFieldInputs';
import { AthleteScoreValues, emptyScoreValues } from '@/hooks/coach/useScoreEntry';

interface AthleteScoreRowProps {
  athleteName: string;
  athleteId: string;
  sectionId: string;
  scoringFields: {
    time?: boolean;
    max_time?: boolean;
    reps?: boolean;
    rounds_reps?: boolean;
    load?: boolean;
    load2?: boolean;
    calories?: boolean;
    metres?: boolean;
    checkbox?: boolean;
    scaling?: boolean;
    time_amrap?: boolean;
  };
  values: AthleteScoreValues;
  onChange: (athleteId: string, sectionId: string, updates: Partial<AthleteScoreValues>) => void;
}

export default function AthleteScoreRow({
  athleteName,
  athleteId,
  sectionId,
  scoringFields,
  values,
  onChange,
}: AthleteScoreRowProps) {
  const currentValues = values || emptyScoreValues;

  return (
    <div className="flex items-center gap-3 py-2 px-3 border-b border-gray-100 hover:bg-gray-50/50">
      <div className="w-36 min-w-[9rem] text-sm font-medium text-gray-800 truncate">
        {athleteName}
      </div>
      <div className="flex-1">
        <ScoringFieldInputs
          scoringFields={scoringFields}
          values={{
            time_result: currentValues.time_result,
            rounds_result: currentValues.rounds_result,
            reps_result: currentValues.reps_result,
            weight_result: currentValues.weight_result,
            weight_result_2: currentValues.weight_result_2,
            calories_result: currentValues.calories_result,
            metres_result: currentValues.metres_result,
            task_completed: currentValues.task_completed,
            scaling_level: currentValues.scaling_level as 'Rx' | 'Sc1' | 'Sc2' | 'Sc3' | '',
          }}
          onChange={(updates) => onChange(athleteId, sectionId, updates as Partial<AthleteScoreValues>)}
          showLabel={false}
        />
      </div>
    </div>
  );
}
