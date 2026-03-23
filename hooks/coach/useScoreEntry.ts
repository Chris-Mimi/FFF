import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/auth-fetch';
import type { ConfiguredLift } from '@/types/movements';

interface ScoringFields {
  time?: boolean;
  max_time?: boolean;
  reps?: boolean;
  rounds_reps?: boolean;
  load?: boolean;
  load2?: boolean;
  load3?: boolean;
  calories?: boolean;
  metres?: boolean;
  checkbox?: boolean;
  scaling?: boolean;
  scaling_2?: boolean;
  scaling_3?: boolean;
  time_amrap?: boolean;
}

export interface WodSection {
  id: string;
  type: string;
  duration: number;
  content: string;
  scoring_fields?: ScoringFields;
  lifts?: ConfiguredLift[];
}

/** Returns the first rm_test lift in a section, or null */
function getRmTestLift(section: WodSection): { name: string; rmTest: string } | null {
  if (!section.lifts) return null;
  const rmLift = section.lifts.find(l => l.rm_test);
  if (!rmLift) return null;
  return { name: rmLift.name, rmTest: rmLift.rm_test! };
}

export interface ScoreEntryAthlete {
  id: string; // memberId for booked athletes, `wb:${name}` for whiteboard-only
  memberId: string | null;
  userId: string | null;
  name: string;
  whiteboardName: string | null;
}

export interface AthleteScoreValues {
  scaling_level: string;
  scaling_level_2: string;
  scaling_level_3: string;
  track: string;
  time_result: string;
  reps_result: string;
  weight_result: string;
  weight_result_2: string;
  weight_result_3: string;
  rounds_result: string;
  calories_result: string;
  metres_result: string;
  task_completed: boolean;
}

interface ExistingResult {
  member_id: string | null;
  user_id: string | null;
  whiteboard_name: string | null;
  section_id: string;
  scaling_level: string | null;
  scaling_level_2: string | null;
  scaling_level_3: string | null;
  track: number | null;
  time_result: string | null;
  reps_result: number | null;
  weight_result: number | null;
  weight_result_2: number | null;
  weight_result_3: number | null;
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
  scaling_level_2: '',
  scaling_level_3: '',
  track: '',
  time_result: '',
  reps_result: '',
  weight_result: '',
  weight_result_2: '',
  weight_result_3: '',
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
  // Also include sections with rm_test lifts (auto-synthesize load scoring)
  const publishedIds = wod?.publish_sections;
  const scorableSections = (wod?.sections || [])
    .map((s) => {
      // Auto-enable load scoring for RM test sections
      const rmLift = getRmTestLift(s);
      if (rmLift && !s.scoring_fields?.load) {
        return { ...s, scoring_fields: { ...s.scoring_fields, load: true } };
      }
      return s;
    })
    .filter((s) => {
      const hasScoring = s.scoring_fields && Object.values(s.scoring_fields).some((v) => v === true);
      const hasRmTest = getRmTestLift(s) !== null;
      if (!hasScoring && !hasRmTest) return false;
      // RM test sections always show (auto-published on save)
      if (hasRmTest) return true;
      // Other sections check publish_sections
      if (publishedIds && publishedIds.length > 0) {
        return publishedIds.includes(s.id);
      }
      return true;
    });

  const selectedSection = scorableSections.find((s) => s.id === selectedSectionId) || null;

  const getScoreKey = (athleteId: string, sectionId: string) => `${athleteId}_${sectionId}`;

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

      // Find first scorable section (including rm_test sections)
      const sections: WodSection[] = data.wod.sections || [];
      const scorable = sections.filter((s: WodSection) => {
        const hasScoring = s.scoring_fields && Object.values(s.scoring_fields).some((v) => v === true);
        const hasRmTest = s.lifts?.some((l: ConfiguredLift) => l.rm_test);
        return hasScoring || hasRmTest;
      });
      if (scorable.length > 0 && !selectedSectionId) {
        setSelectedSectionId(scorable[0].id);
      }

      // Pre-fill scores from existing results
      const prefilled: Record<string, AthleteScoreValues> = {};
      for (const result of data.existingResults as ExistingResult[]) {
        // Find matching athlete by member_id, user_id, or whiteboard_name
        const athlete = (data.athletes as ScoreEntryAthlete[]).find(
          (a) =>
            (a.memberId && a.memberId === result.member_id) ||
            (a.userId && a.userId === result.user_id) ||
            (a.whiteboardName && a.whiteboardName === result.whiteboard_name)
        );
        if (!athlete) continue;

        // Strip -content-0 suffix to match WOD section IDs used as keys
        const rawSectionId = result.section_id.replace(/-content-\d+$/, '');
        const key = getScoreKey(athlete.id, rawSectionId);
        prefilled[key] = {
          scaling_level: result.scaling_level || '',
          scaling_level_2: result.scaling_level_2 || '',
          scaling_level_3: result.scaling_level_3 || '',
          track: result.track != null ? String(result.track) : '',
          time_result: result.time_result || '',
          reps_result: result.reps_result != null ? String(result.reps_result) : '',
          weight_result: result.weight_result != null ? String(result.weight_result) : '',
          weight_result_2: result.weight_result_2 != null ? String(result.weight_result_2) : '',
          weight_result_3: result.weight_result_3 != null ? String(result.weight_result_3) : '',
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
    (athleteId: string, sectionId: string, updates: Partial<AthleteScoreValues>) => {
      const key = getScoreKey(athleteId, sectionId);
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
              const key = getScoreKey(athlete.id, section.id);
              const values = scores[key];
              if (!values) return null;

              // Skip if all fields empty
              if (
                !values.scaling_level &&
                !values.scaling_level_2 &&
                !values.scaling_level_3 &&
                !values.track &&
                !values.time_result &&
                !values.reps_result &&
                !values.weight_result &&
                !values.weight_result_2 &&
                !values.weight_result_3 &&
                !values.rounds_result &&
                !values.calories_result &&
                !values.metres_result &&
                !values.task_completed
              ) {
                return null;
              }

              return {
                memberId: athlete.memberId || undefined,
                whiteboardName: athlete.whiteboardName || undefined,
                sectionId: section.id,
                scaling_level: values.scaling_level || undefined,
                scaling_level_2: values.scaling_level_2 || undefined,
                scaling_level_3: values.scaling_level_3 || undefined,
                track: values.track ? parseInt(values.track) : null,
                time_result: values.time_result || undefined,
                reps_result: values.reps_result ? parseInt(values.reps_result) : null,
                weight_result: values.weight_result ? parseFloat(values.weight_result) : null,
                weight_result_2: values.weight_result_2 ? parseFloat(values.weight_result_2) : null,
                weight_result_3: values.weight_result_3 ? parseFloat(values.weight_result_3) : null,
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

      // Build rm_test lift map for auto-creating lift_records
      const rmTestLifts: Record<string, { liftName: string; rmTest: string }> = {};
      for (const section of scorableSections) {
        const rmLift = getRmTestLift(section);
        if (rmLift) {
          rmTestLifts[section.id] = { liftName: rmLift.name, rmTest: rmLift.rmTest };
        }
      }

      const res = await authFetch('/api/score-entry/save', {
        method: 'POST',
        body: JSON.stringify({
          wodId: wod.id,
          workoutDate: session.date,
          scores: scoreEntries,
          rmTestLifts: Object.keys(rmTestLifts).length > 0 ? rmTestLifts : undefined,
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
