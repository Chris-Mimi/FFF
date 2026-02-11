'use client';

import { supabase } from '@/lib/supabase';
import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import FistBumpButton from './FistBumpButton';
import { useReactions } from '@/hooks/athlete/useReactions';
import {
  detectScoringType,
  rankSectionResults,
  rankBenchmarkResults,
  bestResultPerUser,
  formatResult,
  formatBenchmarkResult,
  type LeaderboardEntry,
  type RawSectionResult,
} from '@/utils/leaderboard-utils';

interface ScoringFields {
  time?: boolean;
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
  scoring_fields?: ScoringFields;
}

interface WodData {
  id: string;
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
}

type SubView = 'wod' | 'benchmarks';
type ScalingFilter = 'all' | 'rx' | 'scaled';

export default function LeaderboardView({ userId }: LeaderboardViewProps) {
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
        <WodLeaderboard userId={userId} />
      ) : (
        <BenchmarkLeaderboard userId={userId} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// WOD Section Leaderboard
// ─────────────────────────────────────────────

function WodLeaderboard({ userId }: { userId: string }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [wods, setWods] = useState<WodData[]>([]);
  const [selectedWodId, setSelectedWodId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [scalingFilter, setScalingFilter] = useState<ScalingFilter>('all');
  const [groupInfo, setGroupInfo] = useState<{ count: number; dateRange: string } | null>(null);
  const { fetchReactions, toggleReaction, getReaction } = useReactions();

  const dateStr = selectedDate.toISOString().split('T')[0];

  // Fetch published WODs for selected date
  const loadWods = useCallback(async () => {
    const { data } = await supabase
      .from('wods')
      .select('id, title, workout_name, session_type, sections')
      .eq('date', dateStr)
      .eq('is_published', true);

    const wodList = (data || []) as WodData[];
    setWods(wodList);

    if (wodList.length > 0) {
      setSelectedWodId(wodList[0].id);
      // Auto-select first scored section
      const scored = wodList[0].sections.filter(s => s.scoring_fields && Object.values(s.scoring_fields).some(Boolean));
      if (scored.length > 0) {
        setSelectedSectionId(scored[0].id);
      } else {
        setSelectedSectionId(wodList[0].sections[0]?.id || null);
      }
    } else {
      setSelectedWodId(null);
      setSelectedSectionId(null);
      setEntries([]);
    }
  }, [dateStr]);

  useEffect(() => { loadWods(); }, [loadWods]);

  // Fetch results when WOD/section/filter changes
  // Groups same-named workouts within ±30 days for combined leaderboard
  const loadResults = useCallback(async () => {
    if (!selectedWodId || !selectedSectionId) {
      setEntries([]);
      setGroupInfo(null);
      return;
    }

    setLoading(true);
    try {
      const selectedWod = wods.find(w => w.id === selectedWodId);

      // Determine WOD IDs and section IDs to query
      let wodIdsToQuery = [selectedWodId];
      let sectionIdsToQuery = [selectedSectionId];
      let isGrouped = false;

      // If workout has a name, find all instances within ±30 days
      if (selectedWod?.workout_name) {
        const anchor = new Date(selectedDate);
        const startDate = new Date(anchor);
        startDate.setDate(startDate.getDate() - 30);
        const endDate = new Date(anchor);
        endDate.setDate(endDate.getDate() + 30);

        const { data: grouped } = await supabase
          .from('wods')
          .select('id, date, sections')
          .eq('workout_name', selectedWod.workout_name)
          .eq('is_published', true)
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0]);

        if (grouped && grouped.length > 1) {
          wodIdsToQuery = grouped.map(w => w.id);
          isGrouped = true;

          // Map section by position index in the primary WOD
          const primaryIndex = selectedWod.sections.findIndex(s => s.id === selectedSectionId);
          if (primaryIndex >= 0) {
            sectionIdsToQuery = grouped.map(w => {
              const sections = (w.sections || []) as WodSection[];
              return sections[primaryIndex]?.id;
            }).filter((id): id is string => !!id);
          }

          // Compute group info for display
          const dates = grouped.map(w => w.date as string).sort();
          const firstDate = new Date(dates[0] + 'T00:00:00');
          const lastDate = new Date(dates[dates.length - 1] + 'T00:00:00');
          const dateRange = firstDate.getTime() === lastDate.getTime()
            ? firstDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
            : `${firstDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${lastDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;

          setGroupInfo({ count: grouped.length, dateRange });
        } else {
          setGroupInfo(null);
        }
      } else {
        setGroupInfo(null);
      }

      // Fetch results across all grouped WODs/sections
      const { data: results } = await supabase
        .from('wod_section_results')
        .select('id, user_id, time_result, reps_result, weight_result, rounds_result, calories_result, metres_result, scaling_level, task_completed')
        .in('wod_id', wodIdsToQuery)
        .in('section_id', sectionIdsToQuery);

      if (!results || results.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      // Filter by scaling
      let filtered = results as unknown as RawSectionResult[];
      if (scalingFilter === 'rx') {
        filtered = filtered.filter(r => r.scaling_level === 'Rx');
      } else if (scalingFilter === 'scaled') {
        filtered = filtered.filter(r => r.scaling_level && r.scaling_level !== 'Rx');
      }

      // Get scoring type from section
      const section = selectedWod?.sections.find(s => s.id === selectedSectionId);
      const scoringType = detectScoringType(section?.scoring_fields);

      // Best per user dedup when grouped across multiple days
      if (isGrouped) {
        filtered = bestResultPerUser(filtered, scoringType);
      }

      // Get member names
      const userIds = [...new Set(filtered.map(r => r.user_id))];
      const memberNames: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: members } = await supabase
          .from('members')
          .select('id, display_name, name')
          .in('id', userIds);
        if (members) {
          for (const m of members) {
            memberNames[m.id] = m.display_name || m.name || 'Unknown';
          }
        }
      }

      const ranked = rankSectionResults(filtered, memberNames, scoringType);
      setEntries(ranked);

      // Fetch reactions
      if (ranked.length > 0) {
        fetchReactions(ranked.map(e => ({ targetType: 'wod_section_result', targetId: e.id })));
      }
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedWodId, selectedSectionId, scalingFilter, wods, selectedDate, fetchReactions]);

  useEffect(() => { loadResults(); }, [loadResults]);

  const selectedWod = wods.find(w => w.id === selectedWodId);
  const scoredSections = selectedWod?.sections.filter(s =>
    s.scoring_fields && Object.values(s.scoring_fields).some(Boolean)
  ) || [];
  const selectedSection = selectedWod?.sections.find(s => s.id === selectedSectionId);
  const scoringType = detectScoringType(selectedSection?.scoring_fields);

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };
  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };
  const goToToday = () => setSelectedDate(new Date());

  return (
    <div className='space-y-3'>
      {/* Date navigation */}
      <div className='flex items-center justify-between bg-white rounded-lg shadow-sm p-3'>
        <button onClick={prevDay} className='p-2 hover:bg-gray-100 rounded-full transition text-gray-900' aria-label='Previous day'>
          <ChevronLeft size={20} />
        </button>
        <div className='flex items-center gap-2'>
          <span className='text-sm font-semibold text-gray-900'>
            {selectedDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <button onClick={goToToday} className='px-2 py-1 bg-[#208479] hover:bg-[#1a6b62] text-white text-xs rounded-lg font-medium transition'>
            Today
          </button>
        </div>
        <button onClick={nextDay} className='p-2 hover:bg-gray-100 rounded-full transition text-gray-900' aria-label='Next day'>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Group indicator for same-named workouts */}
      {groupInfo && (
        <div className='text-xs text-center text-gray-500 bg-gray-50 rounded-lg py-1.5 -mt-1'>
          Best result from {groupInfo.count} sessions ({groupInfo.dateRange})
        </div>
      )}

      {/* Workout selector (if multiple) */}
      {wods.length > 1 && (
        <select
          value={selectedWodId || ''}
          onChange={e => {
            setSelectedWodId(e.target.value);
            const wod = wods.find(w => w.id === e.target.value);
            const scored = wod?.sections.filter(s => s.scoring_fields && Object.values(s.scoring_fields).some(Boolean));
            setSelectedSectionId(scored?.[0]?.id || wod?.sections[0]?.id || null);
          }}
          className='w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900'
        >
          {wods.map(w => (
            <option key={w.id} value={w.id}>
              {w.session_type || w.title}{w.workout_name ? ` - ${w.workout_name}` : ''}
            </option>
          ))}
        </select>
      )}

      {wods.length === 0 ? (
        <div className='bg-white rounded-lg shadow-sm p-8 text-center'>
          <p className='text-gray-500'>No published workouts on this date.</p>
        </div>
      ) : (
        <>
          {/* Section tabs */}
          {scoredSections.length > 1 && (
            <div className='flex gap-2 flex-wrap'>
              {scoredSections.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSectionId(s.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    selectedSectionId === s.id
                      ? 'bg-[#208479] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s.type}{s.duration ? ` (${s.duration}m)` : ''}
                </button>
              ))}
            </div>
          )}

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
              <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-[#208479]' />
            </div>
          ) : entries.length === 0 ? (
            <div className='bg-white rounded-lg shadow-sm p-6 text-center'>
              <p className='text-gray-500 text-sm'>No results logged for this section yet.</p>
            </div>
          ) : (
            <div className='bg-white rounded-lg shadow-sm overflow-hidden'>
              <table className='w-full'>
                <thead>
                  <tr className='bg-gray-50 text-xs text-gray-500 uppercase'>
                    <th className='px-3 py-2 text-left w-10'>#</th>
                    <th className='px-3 py-2 text-left'>Athlete</th>
                    <th className='px-3 py-2 text-right'>Result</th>
                    <th className='px-3 py-2 text-center w-14'>Scale</th>
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
                            {formatResult(entry, scoringType)}
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
                          <FistBumpButton
                            targetType='wod_section_result'
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

      // Get member names
      const userIds = [...new Set(filtered.map(r => r.user_id))];
      const memberNames: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: members } = await supabase
          .from('members')
          .select('id, display_name, name')
          .in('id', userIds);
        if (members) {
          for (const m of members) {
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
          <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-[#208479]' />
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
