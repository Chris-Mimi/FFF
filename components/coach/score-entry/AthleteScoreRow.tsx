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
  previousValues?: AthleteScoreValues | null;
}

export default function AthleteScoreRow({
  athleteName,
  athleteId,
  sectionId,
  scoringFields,
  values,
  onChange,
  previousValues,
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
      {previousValues && (
        <button
          type="button"
          onClick={() => {
            const updates: Partial<AthleteScoreValues> = {};
            if (scoringFields.scaling && previousValues.scaling_level) updates.scaling_level = previousValues.scaling_level;
            if (scoringFields.scaling_2 && previousValues.scaling_level_2) updates.scaling_level_2 = previousValues.scaling_level_2;
            if (scoringFields.track && previousValues.track) updates.track = previousValues.track;
            if ((scoringFields.time || scoringFields.max_time || scoringFields.time_amrap) && previousValues.time_result) updates.time_result = previousValues.time_result;
            if ((scoringFields.reps || scoringFields.rounds_reps) && previousValues.reps_result) updates.reps_result = previousValues.reps_result;
            if (scoringFields.rounds_reps && previousValues.rounds_result) updates.rounds_result = previousValues.rounds_result;
            if (scoringFields.load && previousValues.weight_result) updates.weight_result = previousValues.weight_result;
            if (scoringFields.load2 && previousValues.weight_result_2) updates.weight_result_2 = previousValues.weight_result_2;
            if (scoringFields.calories && previousValues.calories_result) updates.calories_result = previousValues.calories_result;
            if (scoringFields.metres && previousValues.metres_result) updates.metres_result = previousValues.metres_result;
            if (scoringFields.checkbox) updates.task_completed = previousValues.task_completed;
            onChange(athleteId, sectionId, updates);
          }}
          className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-[#178da6] hover:bg-gray-100 rounded transition-colors flex-shrink-0"
          title="Copy from above"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M8 2a.75.75 0 0 1 .75.75v8.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.22 3.22V2.75A.75.75 0 0 1 8 2Z" clipRule="evenodd" />
          </svg>
        </button>
      )}
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
