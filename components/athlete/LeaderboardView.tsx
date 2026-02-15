'use client';

import { supabase } from '@/lib/supabase';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import FistBumpButton from './FistBumpButton';
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
  type LeaderboardEntry,
  type RawSectionResult,
  type RawLiftResult,
} from '@/utils/leaderboard-utils';

interface ScoringFields {
  time?: boolean;
  max_time?: boolean;
  reps?: boolean;
  load?: boolean;
  rounds_reps?: boolean;
  calories?: boolean;
  metres?: boolean;
  checkbox?: boolean;
  scaling?: boolean;
}

interface WodSection {
  id: string;
  type: string;
  duration: number;
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

function extractLeaderboardItems(wod: WodData): LeaderboardItem[] {
  const items: LeaderboardItem[] = [];

  wod.sections.forEach((section, sectionIndex) => {
    // Skip sections with Task checkbox — these are for personal tracking, not leaderboard
    if (section.scoring_fields?.checkbox) return;

    // Lifts
    if (section.lifts?.length) {
      for (const lift of section.lifts) {
        if (lift.rm_test) {
          items.push({
            type: 'lift',
            label: `${lift.name} ${lift.rm_test}`,
            sectionIndex,
            liftName: lift.name,
            rmTest: lift.rm_test,
          });
        } else {
          const repScheme = lift.rep_type === 'constant'
            ? `${lift.sets || 1}x${lift.reps || 1}`
            : lift.variable_sets?.map(s => s.reps).join('-') || '1';
          items.push({
            type: 'lift',
            label: `${lift.name} (${repScheme})`,
            sectionIndex,
            liftName: lift.name,
            repScheme,
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

    // Content scoring (skip if section already has lifts/benchmarks)
    const sf = section.scoring_fields;
    if (sf && Object.values(sf).some(Boolean) && !section.lifts?.length && !section.benchmarks?.length && !section.forge_benchmarks?.length) {
      const scoringType = detectScoringType(sf);
      const scoringLabel = scoringType === 'time' ? 'For Time'
        : scoringType === 'max_time' ? 'Max Time'
        : scoringType === 'time_with_cap' ? 'For Time (Cap)'
        : scoringType === 'rounds_reps' ? 'AMRAP'
        : scoringType === 'reps' ? 'Max Reps'
        : scoringType === 'weight' ? 'Max Load'
        : scoringType === 'calories' ? 'Max Cals'
        : scoringType === 'metres' ? 'Max Distance'
        : scoringType === 'checkbox' ? 'Completion'
        : 'Result';

      items.push({
        type: 'content',
        label: `${section.type} - ${scoringLabel}${section.duration ? ` (${section.duration}m)` : ''}`,
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

function WodLeaderboard({ userId, initialDate, onDateChange }: { userId: string; initialDate?: Date; onDateChange?: (date: Date) => void }) {
  const [weekMonday, setWeekMonday] = useState(() => getMonday(initialDate || new Date()));
  const [wods, setWods] = useState<WodData[]>([]);
  const [selectedWodId, setSelectedWodId] = useState<string | null>(null);
  const [leaderboardItems, setLeaderboardItems] = useState<LeaderboardItem[]>([]);
  const [selectedItemIdx, setSelectedItemIdx] = useState<number>(0);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [scalingFilter, setScalingFilter] = useState<ScalingFilter>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'M' | 'F'>('all');
  const [memberGenders, setMemberGenders] = useState<Record<string, string | null>>({});
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
      .select('id, date, title, workout_name, session_type, sections')
      .gte('date', mondayStr)
      .lte('date', sundayStr)
      .eq('is_published', true)
      .order('date', { ascending: true });

    // Deduplicate WODs with same session_type + workout_name (e.g., same workout at 17:15 and 18:30)
    // Then filter out stale WODs that have no scoreable items (orphaned after rename/republish)
    const allWods = (data || []) as WodData[];
    const seen = new Set<string>();
    const wodList = allWods.filter(w => {
      const key = `${w.session_type || w.title}|${w.workout_name || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).filter(w => extractLeaderboardItems(w).length > 0);
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
  const fetchMemberNames = async (userIds: string[]): Promise<Record<string, string>> => {
    const memberNames: Record<string, string> = {};
    const genders: Record<string, string | null> = {};
    if (userIds.length === 0) return memberNames;
    const { data: members } = await supabase
      .rpc('get_member_names', { member_ids: userIds });
    if (members) {
      for (const m of members as { id: string; display_name: string | null; name: string | null; gender: string | null }[]) {
        memberNames[m.id] = m.display_name || m.name || 'Unknown';
        genders[m.id] = m.gender;
      }
    }
    setMemberGenders(prev => ({ ...prev, ...genders }));
    return memberNames;
  };

  // Helper: compute grouping info (±30 days for same workout_name)
  const computeGrouping = useCallback(async (selectedWod: WodData) => {
    if (!selectedWod.workout_name) {
      setGroupInfo(null);
      return { isGrouped: false, dates: allDates, wodIds: [selectedWod.id], groupedWods: null };
    }

    const anchor = new Date(weekMonday);
    const startDate = new Date(anchor);
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date(anchor);
    endDate.setDate(endDate.getDate() + 36); // +30 from Sunday

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
        if (!liftResults || liftResults.length === 0) { setEntries([]); return; }

        let filtered = liftResults as RawLiftResult[];
        if (isGrouped) {
          filtered = bestLiftPerUser(filtered);
        }

        const userIds = [...new Set(filtered.map(r => r.user_id))];
        const memberNames = await fetchMemberNames(userIds);
        const ranked = rankLiftResults(filtered, memberNames);
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

        if (!bmResults || bmResults.length === 0) { setEntries([]); return; }

        let filtered = bmResults;
        if (scalingFilter === 'rx') {
          filtered = filtered.filter(r => r.scaling_level === 'Rx');
        } else if (scalingFilter === 'scaled') {
          filtered = filtered.filter(r => r.scaling_level && r.scaling_level !== 'Rx');
        }

        const userIds = [...new Set(filtered.map(r => r.user_id))];
        const memberNames = await fetchMemberNames(userIds);
        const ranked = rankBenchmarkResults(filtered, memberNames, selectedItem.benchmarkType || 'time');
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
        let contentWodIds = [selectedWodId];

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
          .select('id, user_id, time_result, reps_result, weight_result, rounds_result, calories_result, metres_result, scaling_level, task_completed')
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
        const memberNames = await fetchMemberNames(userIds);
        const ranked = rankSectionResults(filtered, memberNames, scoringType);
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
  }, [selectedWodId, selectedItemIdx, scalingFilter, wods, computeGrouping, fetchReactions, selectedItem]);

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

      {/* Workout selector (dropdown if multiple, static label if single) */}
      {wods.length > 1 ? (
        <select
          value={selectedWodId || ''}
          onChange={e => {
            setSelectedWodId(e.target.value);
            const wod = wods.find(w => w.id === e.target.value);
            if (wod) {
              const items = extractLeaderboardItems(wod);
              setLeaderboardItems(items);
              setSelectedItemIdx(0);
            }
          }}
          className='w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900'
        >
          {wods.map(w => {
            const dayLabel = new Date(w.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' });
            return (
              <option key={w.id} value={w.id}>
                {dayLabel} – {w.session_type || w.title}{w.workout_name ? ` - ${w.workout_name}` : ''}{formatWodSummary(w.sections, workoutTypesMap)}
              </option>
            );
          })}
        </select>
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
          {leaderboardItems.length > 1 && (
            <div className='flex gap-2 flex-wrap'>
              {leaderboardItems.map((item, idx) => (
                <button
                  key={`${item.type}-${idx}`}
                  onClick={() => setSelectedItemIdx(idx)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    selectedItemIdx === idx
                      ? 'bg-[#178da6] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

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
                  .filter(e => memberGenders[e.userId] === genderFilter)
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
            <div className='bg-white rounded-lg shadow-sm overflow-hidden'>
              <table className='w-full'>
                <thead>
                  <tr className='bg-gray-50 text-xs text-gray-500 uppercase'>
                    <th className='px-3 py-2 text-left w-10'>#</th>
                    <th className='px-3 py-2 text-left'>Athlete</th>
                    <th className='px-3 py-2 text-right'>Result</th>
                    {showScalingFilter && <th className='px-3 py-2 text-center w-14'>Scale</th>}
                    <th className='px-3 py-2 text-right w-16'></th>
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
                          <td className='px-3 py-2.5 text-center'>
                            {entry.scalingLevel && (
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                entry.scalingLevel === 'Rx' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                              }`}>
                                {entry.scalingLevel}
                              </span>
                            )}
                          </td>
                        )}
                        <td className='px-3 py-2.5 text-right'>
                          <FistBumpButton
                            targetType={reactionTargetType}
                            targetId={entry.id}
                            count={reaction.count}
                            userReacted={reaction.userReacted}
                            reactors={reaction.reactors}
                            onToggle={toggleReaction}
                          />
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
          <Trophy size={32} className='mx-auto text-gray-300 mb-2' />
          <p className='text-gray-500 text-sm'>No results logged for this benchmark yet.</p>
        </div>
      ) : (
        <div className='bg-white rounded-lg shadow-sm overflow-hidden'>
          <table className='w-full'>
            <thead>
              <tr className='bg-gray-50 text-xs text-gray-500 uppercase'>
                <th className='px-3 py-2 text-left w-10'>#</th>
                <th className='px-3 py-2 text-left'>Athlete</th>
                <th className='px-3 py-2 text-right'>Best Result</th>
                <th className='px-3 py-2 text-center w-14'>Scale</th>
                <th className='px-3 py-2 text-right text-[10px] w-20'>Date</th>
                <th className='px-3 py-2 text-right w-16'></th>
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
                    <td className='px-3 py-2.5 text-center'>
                      {entry.scalingLevel && (
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          entry.scalingLevel === 'Rx' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {entry.scalingLevel}
                        </span>
                      )}
                    </td>
                    <td className='px-3 py-2.5 text-right'>
                      {entry.resultDate && (
                        <span className='text-[10px] text-gray-400'>
                          {new Date(entry.resultDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </td>
                    <td className='px-3 py-2.5 text-right'>
                      <FistBumpButton
                        targetType='benchmark_result'
                        targetId={entry.id}
                        count={reaction.count}
                        userReacted={reaction.userReacted}
                        reactors={reaction.reactors}
                        onToggle={toggleReaction}
                      />
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
