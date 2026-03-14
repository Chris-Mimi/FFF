import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/auth-fetch';

interface ScoringFields {
  time?: boolean;
  max_time?: boolean;
  reps?: boolean;
  rounds_reps?: boolean;
  load?: boolean;
  calories?: boolean;
  metres?: boolean;
  checkbox?: boolean;
  scaling?: boolean;
  time_amrap?: boolean;
}

export interface WodSection {
  id: string;
  type: string;
  duration: number;
  content: string;
  scoring_fields?: ScoringFields;
}

export interface ScoreEntryAthlete {
  memberId: string;
  userId: string | null;
  name: string;
}

export interface AthleteScoreValues {
  scaling_level: string;
  time_result: string;
  reps_result: string;
  weight_result: string;
  rounds_result: string;
  calories_result: string;
  metres_result: string;
  task_completed: boolean;
}

interface ExistingResult {
  member_id: string;
  user_id: string;
  section_id: string;
  scaling_level: string | null;
  time_result: string | null;
  reps_result: number | null;
  weight_result: number | null;
  rounds_result: number | null;
  calories_result: number | null;
  metres_result: number | null;
  task_completed: boolean | null;
}

interface SessionData {
  id: string;
  date: string;
  time: string;
  workout_id: string;
  capacity: number;
}

interface WodData {
  id: string;
  session_type: string;
  workout_name: string;
  sections: WodSection[];
  publish_sections: string[] | null;
}

export const emptyScoreValues: AthleteScoreValues = {
  scaling_level: '',
  time_result: '',
  reps_result: '',
  weight_result: '',
  rounds_result: '',
  calories_result: '',
  metres_result: '',
  task_completed: false,
};

export function useScoreEntry(sessionId: string) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [wod, setWod] = useState<WodData | null>(null);
  const [athletes, setAthletes] = useState<ScoreEntryAthlete[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingResults, setExistingResults] = useState<ExistingResult[]>([]);

  // Scores keyed by `${memberId}_${sectionId}`
  const [scores, setScores] = useState<Record<string, AthleteScoreValues>>({});

  // Show sections that are scorable AND published to athletes
  const publishedIds = wod?.publish_sections;
  const scorableSections = (wod?.sections || []).filter((s) => {
    const isScorable = s.scoring_fields && Object.values(s.scoring_fields).some((v) => v === true);
    if (!isScorable) return false;
    // If publish_sections exists and is non-empty, filter by it
    if (publishedIds && publishedIds.length > 0) {
      return publishedIds.includes(s.id);
    }
    // Backwards compat: if no publish_sections, show all scorable
    return true;
  });

  const selectedSection = scorableSections.find((s) => s.id === selectedSectionId) || null;

  const getScoreKey = (memberId: string, sectionId: string) => `${memberId}_${sectionId}`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/score-entry/${sessionId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load');
      }

      const data = await res.json();
      setSession(data.session);
      setWod(data.wod);
      setAthletes(data.athletes);
      setExistingResults(data.existingResults);

      // Find first scorable section
      const sections: WodSection[] = data.wod.sections || [];
      const scorable = sections.filter(
        (s: WodSection) => s.scoring_fields && Object.values(s.scoring_fields).some((v) => v === true)
      );
      if (scorable.length > 0 && !selectedSectionId) {
        setSelectedSectionId(scorable[0].id);
      }

      // Pre-fill scores from existing results
      const prefilled: Record<string, AthleteScoreValues> = {};
      for (const result of data.existingResults as ExistingResult[]) {
        // Find matching athlete by member_id or user_id
        const athlete = (data.athletes as ScoreEntryAthlete[]).find(
          (a) => a.memberId === result.member_id || (a.userId && a.userId === result.user_id)
        );
        if (!athlete) continue;

        const key = getScoreKey(athlete.memberId, result.section_id);
        prefilled[key] = {
          scaling_level: result.scaling_level || '',
          time_result: result.time_result || '',
          reps_result: result.reps_result != null ? String(result.reps_result) : '',
          weight_result: result.weight_result != null ? String(result.weight_result) : '',
          rounds_result: result.rounds_result != null ? String(result.rounds_result) : '',
          calories_result: result.calories_result != null ? String(result.calories_result) : '',
          metres_result: result.metres_result != null ? String(result.metres_result) : '',
          task_completed: result.task_completed || false,
        };
      }
      setScores(prefilled);
    } catch (error) {
      console.error('Error loading score entry data:', error);
      toast.error('Failed to load session data');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const updateScore = useCallback(
    (memberId: string, sectionId: string, updates: Partial<AthleteScoreValues>) => {
      const key = getScoreKey(memberId, sectionId);
      setScores((prev) => ({
        ...prev,
        [key]: { ...(prev[key] || emptyScoreValues), ...updates },
      }));
    },
    []
  );

  const saveScores = useCallback(async () => {
    if (!wod || !session) return;

    setSaving(true);
    try {
      // Build scores array for ALL scorable sections (not just the selected one)
      const scoreEntries = scorableSections
        .flatMap((section) =>
          athletes
            .map((athlete) => {
              const key = getScoreKey(athlete.memberId, section.id);
              const values = scores[key];
              if (!values) return null;

              // Skip if all fields empty
              if (
                !values.scaling_level &&
                !values.time_result &&
                !values.reps_result &&
                !values.weight_result &&
                !values.rounds_result &&
                !values.calories_result &&
                !values.metres_result &&
                !values.task_completed
              ) {
                return null;
              }

              return {
                memberId: athlete.memberId,
                sectionId: section.id,
                scaling_level: values.scaling_level || undefined,
                time_result: values.time_result || undefined,
                reps_result: values.reps_result ? parseInt(values.reps_result) : null,
                weight_result: values.weight_result ? parseFloat(values.weight_result) : null,
                rounds_result: values.rounds_result ? parseInt(values.rounds_result) : null,
                calories_result: values.calories_result ? parseInt(values.calories_result) : null,
                metres_result: values.metres_result ? parseFloat(values.metres_result) : null,
                task_completed: values.task_completed || null,
              };
            })
            .filter(Boolean)
        );

      if (scoreEntries.length === 0) {
        toast.error('No scores to save');
        return;
      }

      const res = await authFetch('/api/score-entry/save', {
        method: 'POST',
        body: JSON.stringify({
          wodId: wod.id,
          workoutDate: session.date,
          scores: scoreEntries,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      const data = await res.json();
      toast.success(`${data.saved} score${data.saved !== 1 ? 's' : ''} saved`);
    } catch (error) {
      console.error('Error saving scores:', error);
      toast.error('Failed to save scores');
    } finally {
      setSaving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wod, session, athletes, scores]);

  return {
    session,
    wod,
    athletes,
    loading,
    saving,
    scores,
    scorableSections,
    selectedSectionId,
    selectedSection,
    existingResults,
    setSelectedSectionId,
    updateScore,
    saveScores,
    fetchData,
  };
}
