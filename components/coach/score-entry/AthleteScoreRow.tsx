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
    scaling_2?: boolean;
    track?: boolean;
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

  const trackValue = currentValues.track || '';

  return (
    <div className="flex items-center gap-3 py-2 px-3 border-b border-gray-100 hover:bg-gray-50/50">
      <div className={`${scoringFields.track ? 'w-36 min-w-[9rem]' : 'w-24 min-w-[6rem]'} flex items-center gap-1.5`}>
        <span className="text-sm font-medium text-gray-800 truncate">{athleteName}</span>
        {scoringFields.track && (
          <div className="flex gap-0.5 flex-shrink-0">
            {['1', '2', '3'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onChange(athleteId, sectionId, { track: trackValue === t ? '' : t })}
                className={`w-5 h-5 text-[10px] font-bold rounded transition-colors ${
                  trackValue === t
                    ? t === '1' ? 'bg-[#178da6] text-white'
                    : t === '2' ? 'bg-amber-500 text-white'
                    : 'bg-gray-500 text-white'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
                title={`Track ${t}`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
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
            scaling_level_2: currentValues.scaling_level_2 as 'Rx' | 'Sc1' | 'Sc2' | 'Sc3' | '',
          }}
          onChange={(updates) => onChange(athleteId, sectionId, updates as Partial<AthleteScoreValues>)}
          showLabel={false}
        />
      </div>
    </div>
  );
}
