'use client';

import { supabase } from '@/lib/supabase';
import { Fragment, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Trophy, ChevronDown } from 'lucide-react';
import FistBumpButton from './FistBumpButton';
import ShareButton from './ShareButton';
import { useReactions } from '@/hooks/athlete/useReactions';
import {
  detectScoringType,
  rankSectionResults,
  rankBenchmarkResults,
  rankLiftResults,
  bestResultPerUser,
  bestLiftPerUser,
  formatResult,
  formatBenchmarkResult,
  getWhiteboardGender,
  type LeaderboardEntry,
  type RawSectionResult,
  type RawLiftResult,
} from '@/utils/leaderboard-utils';

interface ScoringFields {
  time?: boolean;
  max_time?: boolean;
  reps?: boolean;
  load?: boolean;
  load2?: boolean;
  load3?: boolean;
  rounds_reps?: boolean;
  calories?: boolean;
  metres?: boolean;
  checkbox?: boolean;
  scaling?: boolean;
  scaling_2?: boolean;
  scaling_3?: boolean;
  time_amrap?: boolean;
}

interface WodSection {
  id: string;
  type: string;
  duration: number;
  content?: string;
  workout_type_id?: string;
  scoring_fields?: ScoringFields;
  lifts?: Array<{
    name: string;
    rm_test?: string;
    rep_type?: 'constant' | 'variable';
    sets?: number;
    reps?: number;
    variable_sets?: Array<{ set_number: number; reps: number }>;
  }>;
  benchmarks?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  forge_benchmarks?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

type LeaderboardItemType = 'lift' | 'benchmark' | 'forge_benchmark' | 'content';

interface LeaderboardItem {
  type: LeaderboardItemType;
  label: string;
  sectionIndex: number;
  // Lift fields
  liftName?: string;
  rmTest?: string;
  repScheme?: string;
  // Benchmark fields
  benchmarkName?: string;
  benchmarkId?: string;
  benchmarkType?: string;
  // Content fields
  scoringType?: string;
  contentSectionId?: string;
}

/** Extract the first exercise name from free-form section content for chip labels. */
function extractExerciseSummary(content?: string): string | null {
  if (!content?.trim()) return null;

  const skipPattern = /^(\d+\s+rounds?|amrap|emom|for time|e\d+m|every\s+\d+|\(?sc\d+\s*:|rx\s*:)/i;
  const bulletPrefix = /^[*\-•]\s+/;
  const repPrefix = /^\d+[\s/x×-]+/;
  const weightSuffix = /\s*\([\d/]+\s*kg\)|\s*\([\d/]+\s*lbs?\)/gi;

  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (!line || skipPattern.test(line)) continue;
    const cleaned = line.replace(bulletPrefix, '').replace(repPrefix, '').replace(weightSuffix, '').trim();
    if (cleaned.length >= 3 && !/^\d+$/.test(cleaned)) {
      return cleaned.length > 50 ? cleaned.slice(0, 47) + '...' : cleaned;
    }
  }

  return null;
}

function extractLeaderboardItems(wod: WodData): LeaderboardItem[] {
  const items: LeaderboardItem[] = [];

  wod.sections.forEach((section, sectionIndex) => {
    // Skip sections with Task checkbox — these are for personal tracking, not leaderboard
    if (section.scoring_fields?.checkbox) return;

    // Lifts
    if (section.lifts?.length) {
      for (const lift of section.lifts) {
        // Only show RM test lifts on leaderboard (1RM/3RM/5RM/10RM)
        // Skip non-RM rep schemes (Constant/Variable) — no results to record
        if (lift.rm_test) {
          items.push({
            type: 'lift',
            label: `${lift.name} ${lift.rm_test}`,
            sectionIndex,
            liftName: lift.name,
            rmTest: lift.rm_test,
          });
        }
      }
    }

    // Benchmarks
    if (section.benchmarks?.length) {
      for (const bm of section.benchmarks) {
        items.push({
          type: 'benchmark',
          label: `${bm.name} (${bm.type})`,
          sectionIndex,
          benchmarkName: bm.name,
          benchmarkId: bm.id,
          benchmarkType: bm.type,
        });
      }
    }

    // Forge benchmarks
    if (section.forge_benchmarks?.length) {
      for (const fb of section.forge_benchmarks) {
        items.push({
          type: 'forge_benchmark',
          label: `${fb.name} (${fb.type})`,
          sectionIndex,
          benchmarkName: fb.name,
          benchmarkId: fb.id,
          benchmarkType: fb.type,
        });
      }
    }

    // Content scoring (skip if section has RM-test lifts or benchmarks — those have their own leaderboard entries)
    const hasRmTestLift = section.lifts?.some(l => l.rm_test);
    const sf = section.scoring_fields;
    if (sf && Object.values(sf).some(Boolean) && !hasRmTestLift && !section.benchmarks?.length && !section.forge_benchmarks?.length) {
      const scoringType = detectScoringType(sf);
      const scoringLabel = scoringType === 'time' ? 'For Time'
        : scoringType === 'max_time' ? 'Max Time'
        : scoringType === 'time_with_cap' ? 'For Time (Cap)'
        : scoringType === 'time_amrap' ? 'Time + AMRAP'
        : scoringType === 'rounds_reps' ? 'AMRAP'
        : scoringType === 'reps' ? 'Max Reps'
        : scoringType === 'weight' ? 'Max Load'
        : scoringType === 'calories' ? 'Max Cals'
        : scoringType === 'metres' ? 'Max Distance'
        : scoringType === 'checkbox' ? 'Completion'
        : 'Result';

      // Use lift name + rep scheme if section has non-RM lifts, otherwise extract from content
      const nonRmLift = section.lifts?.find(l => !l.rm_test);
      let labelPrefix: string;
      if (nonRmLift) {
        const repScheme = nonRmLift.rep_type === 'constant'
          ? `${nonRmLift.sets || 1}x${nonRmLift.reps || 1}`
          : nonRmLift.variable_sets?.map(s => s.reps).join('-') || '';
        labelPrefix = repScheme ? `${nonRmLift.name} ${repScheme}` : nonRmLift.name;
      } else {
        const exerciseSummary = extractExerciseSummary(section.content);
        labelPrefix = exerciseSummary || section.type;
      }

      items.push({
        type: 'content',
        label: `${labelPrefix} - ${scoringLabel}${section.duration ? ` (${section.duration}m)` : ''}`,
        sectionIndex,
        scoringType,
        contentSectionId: `${section.id}-content-0`,
      });
    }
  });

  return items;
}

interface WodData {
  id: string;
  date: string;
  title: string;
  workout_name?: string;
  session_type?: string;
  sections: WodSection[];
}

interface BenchmarkOption {
  id: string;
  name: string;
  type: string;
  source: 'standard' | 'forge';
}

interface LeaderboardViewProps {
  userId: string;
  initialDate?: Date;
  onDateChange?: (date: Date) => void;
}

type SubView = 'wod' | 'benchmarks';
type ScalingFilter = 'all' | 'rx' | 'scaled';

export default function LeaderboardView({ userId, initialDate, onDateChange }: LeaderboardViewProps) {
  const [subView, setSubView] = useState<SubView>('wod');

  return (
    <div className='space-y-4'>
      {/* Sub-view toggle */}
      <div className='flex bg-gray-100 rounded-lg p-1'>
        <button
          onClick={() => setSubView('wod')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
            subView === 'wod' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          WOD Sections
        </button>
        <button
          onClick={() => setSubView('benchmarks')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
            subView === 'benchmarks' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Benchmarks
        </button>
      </div>

      {subView === 'wod' ? (
        <WodLeaderboard userId={userId} initialDate={initialDate} onDateChange={onDateChange} />
      ) : (
        <BenchmarkLeaderboard userId={userId} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// WOD Section Leaderboard
// ─────────────────────────────────────────────

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekDateStrings(monday: Date): { mondayStr: string; sundayStr: string; allDates: string[] } {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(toLocalDateStr(d));
  }
  return { mondayStr: dates[0], sundayStr: dates[6], allDates: dates };
}

function formatWodSummary(sections: WodSection[], workoutTypesMap: Map<string, string>): string {
  if (!sections || sections.length === 0) return '';
  // Prefer sections with type starting with "WOD" that have workout_type_id set
  // (avoids picking "Final prep/Info" which may also have workout_type_id but wrong duration)
  const wodSection = sections.find(s => s.workout_type_id && s.type?.startsWith('WOD'))
    || sections.find(s => s.workout_type_id);
  if (!wodSection || !wodSection.workout_type_id) return '';
  const typeName = workoutTypesMap.get(wodSection.workout_type_id);
  if (!typeName) return '';
  const dur = wodSection.duration || 0;
  return dur ? ` | ${typeName} (${dur}')` : ` | ${typeName}`;
}

function WodDropdown({ wods, selectedWodId, workoutTypesMap, onSelect }: {
  wods: WodData[];
  selectedWodId: string | null;
  workoutTypesMap: Map<string, string>;
  onSelect: (wodId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const selectedWod = wods.find(w => w.id === selectedWodId) || wods[0];
  const selectedLabel = selectedWod
    ? `${new Date(selectedWod.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' })} – ${selectedWod.session_type || selectedWod.title}${selectedWod.workout_name ? ` - ${selectedWod.workout_name}` : ''}${formatWodSummary(selectedWod.sections, workoutTypesMap)}`
    : '';

  return (
    <div ref={ref} className='relative'>
      <button
        onClick={() => setOpen(!open)}
        className='w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 text-left flex items-center justify-between'
      >
        <span className='truncate'>{selectedLabel}</span>
        <ChevronDown size={16} className={`ml-2 flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className='absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
          {wods.map(w => {
            const dayLabel = new Date(w.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' });
            const isSelected = w.id === selectedWodId;
            return (
              <button
                key={w.id}
                onClick={() => { onSelect(w.id); setOpen(false); }}
                className={`w-full px-3 py-2 text-left text-xs transition ${
                  isSelected ? 'bg-[#178da6]/10 text-[#178da6] font-medium' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {dayLabel} – {w.session_type || w.title}{w.workout_name ? ` - ${w.workout_name}` : ''}{formatWodSummary(w.sections, workoutTypesMap)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WodLeaderboard({ userId, initialDate, onDateChange }: { userId: string; initialDate?: Date; onDateChange?: (date: Date) => void }) {
  const [weekMonday, setWeekMonday] = useState(() => getMonday(initialDate || new Date()));
  const [wods, setWods] = useState<WodData[]>([]);
  const [siblingWodIds, setSiblingWodIds] = useState<Record<string, string[]>>({}); // representative WOD ID → all sibling IDs
  const [selectedWodId, setSelectedWodId] = useState<string | null>(null);
  const [leaderboardItems, setLeaderboardItems] = useState<LeaderboardItem[]>([]);
  const [selectedItemIdx, setSelectedItemIdx] = useState<number>(0);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [scalingFilter, setScalingFilter] = useState<ScalingFilter>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'M' | 'F'>('all');
  const [groupInfo, setGroupInfo] = useState<{ count: number; dateRange: string } | null>(null);
  const [workoutTypesMap, setWorkoutTypesMap] = useState<Map<string, string>>(new Map());
  const { fetchReactions, toggleReaction, getReaction } = useReactions();

  // Fetch workout_types lookup (ID → name: AMRAP, EMOM, For Time, etc.)
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('workout_types').select('id, name').order('name');
      if (data) {
        setWorkoutTypesMap(new Map(data.map(t => [t.id, t.name])));
      }
    };
    load();
  }, []);

  // Sync from parent when initialDate changes (e.g., switching tabs)
  // Compare timestamps to avoid infinite loops (Date objects are new references each render)
  useEffect(() => {
    if (initialDate) {
      const newMonday = getMonday(initialDate);
      if (newMonday.getTime() !== weekMonday.getTime()) {
        setWeekMonday(newMonday);
      }
    }
  }, [initialDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Notify parent when week changes
  const weekMondayTime = weekMonday.getTime();
  useEffect(() => {
    if (onDateChange) {
      onDateChange(weekMonday);
    }
  }, [weekMondayTime]); // eslint-disable-line react-hooks/exhaustive-deps

  const { mondayStr, sundayStr, allDates } = useMemo(() => getWeekDateStrings(weekMonday), [weekMonday]);
  const selectedItem = leaderboardItems[selectedItemIdx] || null;

  // Fetch published WODs for the selected week (Mon-Sun)
  const loadWods = useCallback(async () => {
    const { data } = await supabase
      .from('wods')
      .select('id, date, title, workout_name, session_type, sections, weekly_sessions!inner(id)')
      .gte('date', mondayStr)
      .lte('date', sundayStr)
      .eq('is_published', true)
      .order('date', { ascending: true });

    // Deduplicate WODs with same session_type + workout_name (e.g., same workout at 17:15 and 18:30)
    // Keep the copy with most leaderboard items (most recently edited) and track all sibling IDs
    const allWods = (data || []) as WodData[];
    const groups = new Map<string, { best: WodData; bestCount: number; allIds: string[] }>();
    for (const w of allWods) {
      const key = `${w.session_type || w.title}|${w.workout_name || ''}`;
      const count = extractLeaderboardItems(w).length;
      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, { best: w, bestCount: count, allIds: [w.id] });
      } else {
        existing.allIds.push(w.id);
        if (count > existing.bestCount) {
          existing.best = w;
          existing.bestCount = count;
        }
      }
    }
    const wodList = [...groups.values()].filter(g => g.bestCount > 0).map(g => g.best);
    const siblings: Record<string, string[]> = {};
    for (const g of groups.values()) {
      siblings[g.best.id] = g.allIds;
    }
    setSiblingWodIds(siblings);
    setWods(wodList);

    if (wodList.length > 0) {
      setSelectedWodId(wodList[0].id);
      const items = extractLeaderboardItems(wodList[0]);
      setLeaderboardItems(items);
      setSelectedItemIdx(0);
    } else {
      setSelectedWodId(null);
      setLeaderboardItems([]);
      setSelectedItemIdx(0);
      setEntries([]);
    }
  }, [mondayStr, sundayStr]);

  useEffect(() => { loadWods(); }, [loadWods]);

  // Helper: fetch member names + genders for a set of user IDs (uses RPC to bypass members RLS)
  const fetchMemberNames = async (userIds: string[]): Promise<{ names: Record<string, string>; genders: Record<string, string | null> }> => {
    const memberNames: Record<string, string> = {};
    const genders: Record<string, string | null> = {};
    if (userIds.length === 0) return { names: memberNames, genders };
    const { data: members } = await supabase
      .rpc('get_member_names', { member_ids: userIds });
    if (members) {
      for (const m of members as { id: string; display_name: string | null; name: string | null; gender: string | null }[]) {
        memberNames[m.id] = m.display_name || m.name || 'Unknown';
        genders[m.id] = m.gender;
      }
    }
    return { names: memberNames, genders };
  };

  // Helper: compute grouping info (±60 days for same workout_name)
  const computeGrouping = useCallback(async (selectedWod: WodData) => {
    if (!selectedWod.workout_name) {
      setGroupInfo(null);
      return { isGrouped: false, dates: allDates, wodIds: [selectedWod.id], groupedWods: null };
    }

    const anchor = new Date(weekMonday);
    const startDate = new Date(anchor);
    startDate.setDate(startDate.getDate() - 60);
    const endDate = new Date(anchor);
    endDate.setDate(endDate.getDate() + 66); // +60 from Sunday

    const { data: grouped } = await supabase
      .from('wods')
      .select('id, date, sections')
      .eq('workout_name', selectedWod.workout_name)
      .eq('is_published', true)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);

    if (grouped && grouped.length > 1) {
      const dates = grouped.map(w => w.date as string).sort();
      const firstDate = new Date(dates[0] + 'T00:00:00');
      const lastDate = new Date(dates[dates.length - 1] + 'T00:00:00');
      const dateRange = firstDate.getTime() === lastDate.getTime()
        ? firstDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        : `${firstDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${lastDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;

      setGroupInfo({ count: grouped.length, dateRange });
      return {
        isGrouped: true,
        dates: grouped.map(w => w.date as string),
        wodIds: grouped.map(w => w.id),
        groupedWods: grouped as Array<{ id: string; date: string; sections: WodSection[] }>,
      };
    }

    setGroupInfo(null);
    return { isGrouped: false, dates: allDates, wodIds: [selectedWod.id], groupedWods: null };
  }, [weekMonday, allDates]);

  // Load results based on selected item type
  const loadResults = useCallback(async () => {
    if (!selectedWodId || !selectedItem) {
      setEntries([]);
      setGroupInfo(null);
      return;
    }

    setLoading(true);
    try {
      const selectedWod = wods.find(w => w.id === selectedWodId);
      if (!selectedWod) { setEntries([]); return; }

      const { isGrouped, dates, wodIds, groupedWods } = await computeGrouping(selectedWod);

      // ── LIFT ──
      if (selectedItem.type === 'lift') {
        let query = supabase
          .from('lift_records')
          .select('id, user_id, lift_name, weight_kg, reps, rep_max_type, rep_scheme, lift_date')
          .eq('lift_name', selectedItem.liftName!)
          .in('lift_date', dates);

        if (selectedItem.rmTest) {
          query = query.eq('rep_max_type', selectedItem.rmTest);
        } else if (selectedItem.repScheme) {
          query = query.eq('rep_scheme', selectedItem.repScheme);
        }

        const { data: liftResults } = await query;

        let filtered = (liftResults || []) as RawLiftResult[];
        if (isGrouped) {
          filtered = bestLiftPerUser(filtered);
        }

        // Also fetch whiteboard athletes from wod_section_results for this section
        const liftSectionIds: string[] = [];
        const liftWodIds: string[] = [];
        if (isGrouped && groupedWods) {
          for (const w of groupedWods) {
            const sections = (w.sections || []) as WodSection[];
            const sec = sections[selectedItem.sectionIndex];
            if (sec) { liftSectionIds.push(`${sec.id}-content-0`); liftWodIds.push(w.id); }
          }
        } else {
          const sections = (selectedWod.sections || []) as WodSection[];
          const sec = sections[selectedItem.sectionIndex];
          if (sec) { liftSectionIds.push(`${sec.id}-content-0`); liftWodIds.push(...(siblingWodIds[selectedWodId] || [selectedWodId])); }
        }

        let whiteboardLiftEntries: LeaderboardEntry[] = [];
        if (liftSectionIds.length > 0) {
          const { data: wbResults } = await supabase
            .from('wod_section_results')
            .select('id, whiteboard_name, weight_result, workout_date')
            .in('wod_id', liftWodIds)
            .in('section_id', liftSectionIds)
            .not('whiteboard_name', 'is', null)
            .gt('weight_result', 0);

          if (wbResults && wbResults.length > 0) {
            // Deduplicate: best weight per whiteboard name
            const bestPerWb = new Map<string, typeof wbResults[0]>();
            for (const r of wbResults) {
              const existing = bestPerWb.get(r.whiteboard_name!);
              if (!existing || (r.weight_result ?? 0) > (existing.weight_result ?? 0)) {
                bestPerWb.set(r.whiteboard_name!, r);
              }
            }
            whiteboardLiftEntries = [...bestPerWb.values()].map(r => ({
              id: r.id,
              userId: `wb:${r.whiteboard_name}`,
              memberName: r.whiteboard_name!,
              rank: 0,
              weightResult: r.weight_result ?? undefined,
              resultDate: r.workout_date ?? undefined,
              gender: getWhiteboardGender(r.whiteboard_name) ?? undefined,
            }));
          }
        }

        const userIds = [...new Set(filtered.map(r => r.user_id))];
        const { names: memberNames, genders: fetchedGenders } = await fetchMemberNames(userIds);
        const ranked = rankLiftResults(filtered, memberNames, fetchedGenders, whiteboardLiftEntries);
        setEntries(ranked);

        if (ranked.length > 0) {
          fetchReactions(ranked.map(e => ({ targetType: 'lift_record' as const, targetId: e.id })));
        }
        return;
      }

      // ── BENCHMARK / FORGE BENCHMARK ──
      if (selectedItem.type === 'benchmark' || selectedItem.type === 'forge_benchmark') {
        const { data: bmResults } = await supabase
          .from('benchmark_results')
          .select('id, user_id, benchmark_name, time_result, reps_result, weight_result, scaling_level, result_date')
          .eq('benchmark_name', selectedItem.benchmarkName!)
          .in('result_date', dates);

        // Also fetch coach-entered scores from wod_section_results
        const bmSectionIds: string[] = [];
        const bmWodIds: string[] = [];
        if (isGrouped && groupedWods) {
          for (const w of groupedWods) {
            const sections = (w.sections || []) as WodSection[];
            const sec = sections[selectedItem.sectionIndex];
            if (sec) { bmSectionIds.push(`${sec.id}-content-0`); bmWodIds.push(w.id); }
          }
        } else {
          const selectedWod = wods.find(w => w.id === selectedWodId);
          if (selectedWod) {
            const sections = (selectedWod.sections || []) as WodSection[];
            const sec = sections[selectedItem.sectionIndex];
            if (sec) { bmSectionIds.push(`${sec.id}-content-0`); bmWodIds.push(...(siblingWodIds[selectedWodId] || [selectedWodId])); }
          }
        }

        let coachEntries: RawSectionResult[] = [];
        if (bmSectionIds.length > 0) {
          const { data: wsrResults } = await supabase
            .from('wod_section_results')
            .select('id, user_id, member_id, whiteboard_name, time_result, reps_result, weight_result, weight_result_2, weight_result_3, rounds_result, calories_result, metres_result, scaling_level, scaling_level_2, scaling_level_3, track, task_completed, workout_date')
            .in('wod_id', bmWodIds)
            .in('section_id', bmSectionIds);
          if (wsrResults) coachEntries = wsrResults as unknown as (RawSectionResult & { member_id?: string })[];
        }

        // Collect whiteboard name fallbacks and member_id lookups for name resolution
        const whiteboardNameMap: Record<string, string> = {};
        const memberIdNameMap: Record<string, string> = {};
        const unresolvedMemberIds = (coachEntries as (RawSectionResult & { member_id?: string })[])
          .filter(ce => !ce.user_id && !ce.whiteboard_name && ce.member_id)
          .map(ce => ce.member_id!);
        if (unresolvedMemberIds.length > 0) {
          const { data: memberRows } = await supabase
            .rpc('get_member_names', { member_ids: unresolvedMemberIds });
          if (memberRows) {
            for (const m of memberRows as { id: string; display_name: string | null; name: string | null }[]) {
              memberIdNameMap[m.id] = m.display_name || m.name || 'Unknown';
            }
          }
        }

        // Merge: convert coach entries to benchmark format
        // Coach entries (wod_section_results) take priority over athlete self-entries (benchmark_results)
        // because coach entries have track data and are the primary score source
        type BmEntry = { id: string; user_id: string; benchmark_name: string; time_result: string | null; reps_result: number | null; weight_result: number | null; scaling_level: string | null; track?: number | null; result_date?: string };
        const coachUserIds = new Set(
          (coachEntries as (RawSectionResult & { member_id?: string })[])
            .filter(ce => ce.user_id)
            .map(ce => ce.user_id)
        );
        // Start with benchmark_results entries that DON'T have a coach entry
        const mergedBm: BmEntry[] = (bmResults || []).filter(r => !coachUserIds.has(r.user_id));
        for (const ce of coachEntries as (RawSectionResult & { member_id?: string })[]) {
          // Build synthetic user_id key: prefer user_id, then wb:name, then member:id
          let syntheticUserId = ce.user_id;
          if (!syntheticUserId && ce.whiteboard_name) {
            syntheticUserId = `wb:${ce.whiteboard_name}`;
          } else if (!syntheticUserId && ce.member_id) {
            syntheticUserId = `member:${ce.member_id}`;
          } else if (!syntheticUserId) {
            syntheticUserId = `unknown:${ce.id}`;
          }
          // Store whiteboard_name fallback for name resolution
          if (ce.user_id && ce.whiteboard_name) {
            whiteboardNameMap[ce.user_id] = ce.whiteboard_name;
          } else if (!ce.user_id && ce.whiteboard_name) {
            whiteboardNameMap[`wb:${ce.whiteboard_name}`] = ce.whiteboard_name;
          }
          mergedBm.push({
            id: ce.id,
            user_id: syntheticUserId,
            benchmark_name: selectedItem.benchmarkName!,
            time_result: ce.time_result ?? null,
            reps_result: ce.reps_result ?? null,
            weight_result: ce.weight_result ?? null,
            scaling_level: ce.scaling_level ?? null,
            track: ce.track ?? null,
            result_date: ce.workout_date ?? undefined,
          });
        }

        if (mergedBm.length === 0) { setEntries([]); return; }

        let filtered = mergedBm;
        if (scalingFilter === 'rx') {
          filtered = filtered.filter(r => r.scaling_level === 'Rx');
        } else if (scalingFilter === 'scaled') {
          filtered = filtered.filter(r => r.scaling_level && r.scaling_level !== 'Rx');
        }

        const allUserIds = [...new Set(filtered.map(r => r.user_id))];
        // Only pass real UUIDs to the RPC — synthetic IDs (wb:, member:, unknown:) would break the UUID[] parameter
        const realUserIds = allUserIds.filter(id => !id.includes(':'));
        const { names: memberNames, genders: fetchedGenders } = await fetchMemberNames(realUserIds);
        // Inject fallback names: whiteboard_name for registered athletes, member_id lookups
        for (const [userId, wbName] of Object.entries(whiteboardNameMap)) {
          if (!memberNames[userId]) memberNames[userId] = wbName;
        }
        for (const [memberId, name] of Object.entries(memberIdNameMap)) {
          memberNames[`member:${memberId}`] = name;
        }
        const ranked = rankBenchmarkResults(filtered, memberNames, selectedItem.benchmarkType || 'time', fetchedGenders);
        setEntries(ranked);

        if (ranked.length > 0) {
          fetchReactions(ranked.map(e => ({ targetType: 'benchmark_result' as const, targetId: e.id })));
        }
        return;
      }

      // ── CONTENT (wod_section_results) ──
      if (selectedItem.type === 'content') {
        // Build content section IDs across grouped WODs
        let contentSectionIds = [selectedItem.contentSectionId!];
        // Include sibling WOD IDs (same workout at different class times) so scores from any copy are found
        let contentWodIds = siblingWodIds[selectedWodId] || [selectedWodId];

        if (isGrouped && groupedWods) {
          contentSectionIds = groupedWods.map(w => {
            const sections = (w.sections || []) as WodSection[];
            const targetSection = sections[selectedItem.sectionIndex];
            return targetSection ? `${targetSection.id}-content-0` : null;
          }).filter((id): id is string => !!id);
          contentWodIds = wodIds;
        }

        const { data: results } = await supabase
          .from('wod_section_results')
          .select('id, user_id, whiteboard_name, time_result, reps_result, weight_result, weight_result_2, weight_result_3, rounds_result, calories_result, metres_result, scaling_level, scaling_level_2, scaling_level_3, track, task_completed, workout_date')
          .in('wod_id', contentWodIds)
          .in('section_id', contentSectionIds);

        if (!results || results.length === 0) { setEntries([]); return; }

        let filtered = results as unknown as RawSectionResult[];
        if (scalingFilter === 'rx') {
          filtered = filtered.filter(r => r.scaling_level === 'Rx');
        } else if (scalingFilter === 'scaled') {
          filtered = filtered.filter(r => r.scaling_level && r.scaling_level !== 'Rx');
        }

        const scoringType = selectedItem.scoringType || 'time';
        if (isGrouped) {
          filtered = bestResultPerUser(filtered, scoringType);
        }

        const userIds = [...new Set(filtered.map(r => r.user_id))];
        const { names: memberNames, genders: fetchedGenders } = await fetchMemberNames(userIds);
        const ranked = rankSectionResults(filtered, memberNames, scoringType, fetchedGenders);
        setEntries(ranked);

        if (ranked.length > 0) {
          fetchReactions(ranked.map(e => ({ targetType: 'wod_section_result' as const, targetId: e.id })));
        }
      }
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedWodId, selectedItemIdx, scalingFilter, wods, siblingWodIds, computeGrouping, fetchReactions, selectedItem]);

  useEffect(() => { loadResults(); }, [loadResults]);

  // Determine active scoring type and reaction target for display
  const activeScoringType = selectedItem?.type === 'lift'
    ? 'weight'
    : selectedItem?.type === 'benchmark' || selectedItem?.type === 'forge_benchmark'
      ? (selectedItem.benchmarkType?.toLowerCase().includes('time') ? 'time'
        : selectedItem.benchmarkType?.toLowerCase().includes('rep') ? 'reps'
        : 'weight')
      : selectedItem?.scoringType || 'time';

  const reactionTargetType = selectedItem?.type === 'lift'
    ? 'lift_record' as const
    : (selectedItem?.type === 'benchmark' || selectedItem?.type === 'forge_benchmark')
      ? 'benchmark_result' as const
      : 'wod_section_result' as const;

  const showScalingFilter = selectedItem?.type !== 'lift';
  const isBenchmarkItem = selectedItem?.type === 'benchmark' || selectedItem?.type === 'forge_benchmark';

  const prevWeek = () => {
    const d = new Date(weekMonday);
    d.setDate(d.getDate() - 7);
    setWeekMonday(d);
  };
  const nextWeek = () => {
    const d = new Date(weekMonday);
    d.setDate(d.getDate() + 7);
    setWeekMonday(d);
  };
  const goToThisWeek = () => setWeekMonday(getMonday(new Date()));

  const formatWeekRange = () => {
    const sunday = new Date(weekMonday);
    sunday.setDate(weekMonday.getDate() + 6);
    const monStr = weekMonday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const sunStr = sunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${monStr} - ${sunStr}`;
  };

  return (
    <div className='space-y-3'>
      {/* Week navigation */}
      <div className='flex items-center justify-between bg-white rounded-lg shadow-sm p-3'>
        <button onClick={prevWeek} className='p-3 hover:bg-gray-100 rounded-full transition text-gray-900' aria-label='Previous week'>
          <ChevronLeft size={20} />
        </button>
        <div className='flex items-center gap-2'>
          <span className='text-sm font-semibold text-gray-900'>
            {formatWeekRange()}
          </span>
          <button onClick={goToThisWeek} className='px-2 py-1 bg-[#178da6] hover:bg-[#14758c] text-white text-xs rounded-lg font-medium transition'>
            This Week
          </button>
        </div>
        <button onClick={nextWeek} className='p-3 hover:bg-gray-100 rounded-full transition text-gray-900' aria-label='Next week'>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Group indicator for same-named workouts */}
      {groupInfo && (
        <div className='text-xs text-center text-gray-500 bg-gray-50 rounded-lg py-1.5 -mt-1'>
          Best result from {groupInfo.count} sessions ({groupInfo.dateRange})
        </div>
      )}

      {/* Workout selector (custom dropdown if multiple, static label if single) */}
      {wods.length > 1 ? (
        <WodDropdown
          wods={wods}
          selectedWodId={selectedWodId}
          workoutTypesMap={workoutTypesMap}
          onSelect={(wodId) => {
            setSelectedWodId(wodId);
            const wod = wods.find(w => w.id === wodId);
            if (wod) {
              const items = extractLeaderboardItems(wod);
              setLeaderboardItems(items);
              setSelectedItemIdx(0);
            }
          }}
        />
      ) : wods.length === 1 && (
        <div className='w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-900'>
          {wods[0].session_type || wods[0].title}{wods[0].workout_name ? ` - ${wods[0].workout_name}` : ''}{formatWodSummary(wods[0].sections, workoutTypesMap)}
        </div>
      )}

      {wods.length === 0 ? (
        <div className='bg-white rounded-lg shadow-sm p-8 text-center'>
          <p className='text-gray-500'>No published workouts on this date.</p>
        </div>
      ) : leaderboardItems.length === 0 ? (
        <div className='bg-white rounded-lg shadow-sm p-6 text-center'>
          <p className='text-gray-500 text-sm'>No scoreable items in this workout.</p>
        </div>
      ) : (
        <>
          {/* Item picker pills */}
          {leaderboardItems.length > 1 && (() => {
            // Check if items span multiple sections — if so, show "WOD pt.X" labels
            const uniqueSections = new Set(leaderboardItems.map(i => i.sectionIndex));
            const isMultiPart = uniqueSections.size > 1;
            // Map sectionIndex to part number (1-based, ordered by first appearance)
            const sectionOrder: number[] = [];
            leaderboardItems.forEach(i => {
              if (!sectionOrder.includes(i.sectionIndex)) sectionOrder.push(i.sectionIndex);
            });

            // Group items by part number
            const groups: { partNum: number; items: { item: typeof leaderboardItems[0]; globalIdx: number }[] }[] = [];
            leaderboardItems.forEach((item, idx) => {
              const partNum = sectionOrder.indexOf(item.sectionIndex) + 1;
              let group = groups.find(g => g.partNum === partNum);
              if (!group) {
                group = { partNum, items: [] };
                groups.push(group);
              }
              group.items.push({ item, globalIdx: idx });
            });

            return (
              <div className='flex gap-2 flex-wrap items-center'>
                {groups.map((group, gi) => (
                  <Fragment key={group.partNum}>
                    {isMultiPart && gi > 0 && (
                      <span className='w-px h-5 bg-gray-300 mx-0.5' />
                    )}
                    {isMultiPart && (
                      <span className='text-[11px] font-semibold text-white'>Pt.{group.partNum}</span>
                    )}
                    {group.items.map(({ item, globalIdx }) => (
                      <button
                        key={`${item.type}-${globalIdx}`}
                        onClick={() => setSelectedItemIdx(globalIdx)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                          selectedItemIdx === globalIdx
                            ? 'bg-[#178da6] text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </Fragment>
                ))}
              </div>
            );
          })()}

          {/* Scaling filter (hidden for lifts) */}
          {showScalingFilter && (
            <div className='flex gap-1'>
              {(['all', 'rx', 'scaled'] as ScalingFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setScalingFilter(f)}
                  className={`px-3 py-1 rounded text-xs font-medium transition ${
                    scalingFilter === f
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'rx' ? 'Rx' : 'Scaled'}
                </button>
              ))}
            </div>
          )}

          {/* Gender filter */}
          <div className='flex gap-1'>
            {(['all', 'M', 'F'] as const).map(f => (
              <button
                key={f}
                onClick={() => setGenderFilter(f)}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  genderFilter === f
                    ? f === 'M' ? 'bg-blue-200 text-blue-800' : f === 'F' ? 'bg-pink-200 text-pink-800' : 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>

          {/* Results table */}
          {(() => {
            // Apply gender filter client-side with re-ranking
            const displayEntries = genderFilter === 'all'
              ? entries
              : entries
                  .filter(e => e.gender === genderFilter)
                  .map((e, i) => ({ ...e, rank: i + 1 }));

            return loading ? (
            <div className='flex justify-center py-8'>
              <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-[#178da6]' />
            </div>
          ) : displayEntries.length === 0 ? (
            <div className='bg-white rounded-lg shadow-sm p-6 text-center'>
              <p className='text-gray-500 text-sm'>No results logged yet.</p>
            </div>
          ) : (
            <div className='bg-white rounded-lg shadow-sm overflow-visible'>
              <table className='w-full'>
                <thead>
                  <tr className='bg-gray-50 text-xs text-gray-500 uppercase rounded-t-lg'>
                    <th className='px-3 py-2 text-left w-10 rounded-tl-lg'>#</th>
                    <th className='px-3 py-2 text-left'>Athlete</th>
                    <th className='px-3 py-2 text-right'>Result</th>
                    {showScalingFilter && <th className='px-1 py-2 text-center w-12'>Scale</th>}
                    <th className='px-1 py-2 text-right w-14'></th>
                  </tr>
                </thead>
                <tbody>
                  {displayEntries.map(entry => {
                    const isMe = entry.userId === userId;
                    const reaction = getReaction(entry.id);
                    return (
                      <tr
                        key={entry.id}
                        className={`border-t border-gray-100 ${isMe ? 'bg-amber-50' : ''}`}
                      >
                        <td className='px-3 py-2.5'>
                          <span className={`text-sm font-bold ${entry.rank <= 3 ? 'text-amber-600' : 'text-gray-400'}`}>
                            {entry.rank}
                          </span>
                        </td>
                        <td className='px-3 py-2.5'>
                          <span className={`text-sm ${isMe ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                            {isMe ? 'You' : entry.memberName}
                          </span>
                        </td>
                        <td className='px-3 py-2.5 text-right'>
                          <span className='text-sm font-medium text-gray-900'>
                            {isBenchmarkItem ? formatBenchmarkResult(entry) : formatResult(entry, activeScoringType)}
                          </span>
                        </td>
                        {showScalingFilter && (
                          <td className='px-1 py-2.5 text-center'>
                            <div className='flex items-center justify-center gap-1'>
                              {entry.scalingLevel && (
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                  entry.scalingLevel === 'Rx' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {entry.scalingLevel}
                                </span>
                              )}
                              {entry.scalingLevel2 && (
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                  entry.scalingLevel2 === 'Rx' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {entry.scalingLevel2}
                                </span>
                              )}
                              {entry.track && (
                                <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${
                                  entry.track === 1 ? 'bg-[#178da6]/10 text-[#178da6]'
                                  : entry.track === 2 ? 'bg-amber-100 text-amber-700'
                                  : 'bg-gray-100 text-gray-500'
                                }`}>
                                  T{entry.track}
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                        <td className='px-1 py-2.5 text-right'>
                          <div className='flex items-center justify-end gap-0.5'>
                            {isMe && (
                              <ShareButton
                                data={{
                                  type: selectedItem?.type === 'lift' ? 'lift'
                                    : (selectedItem?.type === 'benchmark' || selectedItem?.type === 'forge_benchmark') ? 'benchmark'
                                    : 'wod_section',
                                  athleteName: entry.memberName,
                                  date: entry.resultDate || mondayStr,
                                  resultLabel: selectedItem?.label || '',
                                  resultValue: isBenchmarkItem ? formatBenchmarkResult(entry) : formatResult(entry, activeScoringType),
                                  resultSubLabel: activeScoringType === 'time' ? 'For Time'
                                    : activeScoringType === 'max_time' ? 'Max Time'
                                    : activeScoringType === 'rounds_reps' ? 'AMRAP'
                                    : activeScoringType === 'weight' ? 'Max Load'
                                    : undefined,
                                  isPR: entry.rank === 1,
                                  scalingLevel: entry.scalingLevel,
                                }}
                              />
                            )}
                            <FistBumpButton
                              targetType={reactionTargetType}
                              targetId={entry.id}
                              count={reaction.count}
                              userReacted={reaction.userReacted}
                              reactors={reaction.reactors}
                              onToggle={toggleReaction}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
          })()}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// All-Time Benchmark Leaderboard
// ─────────────────────────────────────────────

function BenchmarkLeaderboard({ userId }: { userId: string }) {
  const [benchmarks, setBenchmarks] = useState<BenchmarkOption[]>([]);
  const [selectedBenchmark, setSelectedBenchmark] = useState<BenchmarkOption | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [scalingFilter, setScalingFilter] = useState<ScalingFilter>('all');
  const { fetchReactions, toggleReaction, getReaction } = useReactions();

  // Load benchmark list
  useEffect(() => {
    const loadBenchmarks = async () => {
      const [{ data: standard }, { data: forge }] = await Promise.all([
        supabase.from('benchmark_workouts').select('id, name, type').order('display_order'),
        supabase.from('forge_benchmarks').select('id, name, type').order('display_order'),
      ]);

      const options: BenchmarkOption[] = [
        ...(standard || []).map(b => ({ ...b, source: 'standard' as const })),
        ...(forge || []).map(b => ({ ...b, source: 'forge' as const })),
      ];
      setBenchmarks(options);
      if (options.length > 0) setSelectedBenchmark(options[0]);
    };
    loadBenchmarks();
  }, []);

  // Load results when benchmark changes
  const loadResults = useCallback(async () => {
    if (!selectedBenchmark) return;

    setLoading(true);
    try {
      const { data: results } = await supabase
        .from('benchmark_results')
        .select('id, user_id, time_result, reps_result, weight_result, scaling_level, result_date')
        .eq('benchmark_name', selectedBenchmark.name);

      if (!results || results.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      // Filter by scaling
      let filtered = results;
      if (scalingFilter === 'rx') {
        filtered = results.filter(r => r.scaling_level === 'Rx');
      } else if (scalingFilter === 'scaled') {
        filtered = results.filter(r => r.scaling_level && r.scaling_level !== 'Rx');
      }

      // Get member names (uses RPC to bypass members RLS)
      const userIds = [...new Set(filtered.map(r => r.user_id))];
      const memberNames: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: members } = await supabase
          .rpc('get_member_names', { member_ids: userIds });
        if (members) {
          for (const m of members as { id: string; display_name: string | null; name: string | null }[]) {
            memberNames[m.id] = m.display_name || m.name || 'Unknown';
          }
        }
      }

      const ranked = rankBenchmarkResults(filtered, memberNames, selectedBenchmark.type);
      setEntries(ranked);

      if (ranked.length > 0) {
        fetchReactions(ranked.map(e => ({ targetType: 'benchmark_result', targetId: e.id })));
      }
    } catch (err) {
      console.error('Error loading benchmark leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBenchmark, scalingFilter, fetchReactions]);

  useEffect(() => { loadResults(); }, [loadResults]);

  return (
    <div className='space-y-3'>
      {/* Benchmark picker */}
      <select
        value={selectedBenchmark?.name || ''}
        onChange={e => {
          const bm = benchmarks.find(b => b.name === e.target.value);
          if (bm) setSelectedBenchmark(bm);
        }}
        className='w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900'
      >
        {benchmarks.length > 0 && (
          <>
            <optgroup label='Standard Benchmarks'>
              {benchmarks.filter(b => b.source === 'standard').map(b => (
                <option key={b.id} value={b.name}>{b.name} ({b.type})</option>
              ))}
            </optgroup>
            <optgroup label='Forge Benchmarks'>
              {benchmarks.filter(b => b.source === 'forge').map(b => (
                <option key={b.id} value={b.name}>{b.name} ({b.type})</option>
              ))}
            </optgroup>
          </>
        )}
      </select>

      {/* Scaling filter */}
      <div className='flex gap-1'>
        {(['all', 'rx', 'scaled'] as ScalingFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setScalingFilter(f)}
            className={`px-3 py-1 rounded text-xs font-medium transition ${
              scalingFilter === f
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'All' : f === 'rx' ? 'Rx' : 'Scaled'}
          </button>
        ))}
      </div>

      {/* Results table */}
      {loading ? (
        <div className='flex justify-center py-8'>
          <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-[#178da6]' />
        </div>
      ) : entries.length === 0 ? (
        <div className='bg-white rounded-lg shadow-sm p-6 text-center'>
          <Trophy size={32} className='mx-auto text-gray-400 mb-2' />
          <p className='text-gray-500 text-sm'>No results logged for this benchmark yet.</p>
        </div>
      ) : (
        <div className='bg-white rounded-lg shadow-sm overflow-visible'>
          <table className='w-full'>
            <thead>
              <tr className='bg-gray-50 text-xs text-gray-500 uppercase rounded-t-lg'>
                <th className='px-3 py-2 text-left w-10 rounded-tl-lg'>#</th>
                <th className='px-3 py-2 text-left'>Athlete</th>
                <th className='px-3 py-2 text-right'>Best Result</th>
                <th className='px-1 py-2 text-center w-12'>Scale</th>
                <th className='px-1 py-2 text-right text-[10px] w-16'>Date</th>
                <th className='px-1 py-2 text-right w-14 rounded-tr-lg'></th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => {
                const isMe = entry.userId === userId;
                const reaction = getReaction(entry.id);
                return (
                  <tr
                    key={entry.id}
                    className={`border-t border-gray-100 ${isMe ? 'bg-amber-50' : ''}`}
                  >
                    <td className='px-3 py-2.5'>
                      <span className={`text-sm font-bold ${entry.rank <= 3 ? 'text-amber-600' : 'text-gray-400'}`}>
                        {entry.rank}
                      </span>
                    </td>
                    <td className='px-3 py-2.5'>
                      <span className={`text-sm ${isMe ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                        {isMe ? 'You' : entry.memberName}
                      </span>
                    </td>
                    <td className='px-3 py-2.5 text-right'>
                      <span className='text-sm font-medium text-gray-900'>
                        {formatBenchmarkResult(entry)}
                      </span>
                    </td>
                    <td className='px-1 py-2.5 text-center'>
                      {entry.scalingLevel && (
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          entry.scalingLevel === 'Rx' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {entry.scalingLevel}
                        </span>
                      )}
                    </td>
                    <td className='px-1 py-2.5 text-right'>
                      {entry.resultDate && (
                        <span className='text-[10px] text-gray-500'>
                          {new Date(entry.resultDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </td>
                    <td className='px-1 py-2.5 text-right'>
                      <div className='flex items-center justify-end gap-0.5'>
                        {isMe && selectedBenchmark && (
                          <ShareButton
                            data={{
                              type: 'benchmark',
                              athleteName: entry.memberName,
                              date: entry.resultDate || '',
                              resultLabel: selectedBenchmark.name,
                              resultValue: formatBenchmarkResult(entry),
                              resultSubLabel: selectedBenchmark.type,
                              isPR: entry.rank === 1,
                              scalingLevel: entry.scalingLevel,
                            }}
                          />
                        )}
                        <FistBumpButton
                          targetType='benchmark_result'
                          targetId={entry.id}
                          count={reaction.count}
                          userReacted={reaction.userReacted}
                          reactors={reaction.reactors}
                          onToggle={toggleReaction}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
